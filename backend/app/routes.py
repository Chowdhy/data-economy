import json
from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import and_
from datetime import datetime, timedelta
from policies.policy_engine import get_policy_engine
from .anonymisation import (
    anonymise_study_records,
    get_active_candidate_fields,
    get_active_other_fields,
    K_ANONYMITY_CANDIDATE_FIELDS,
    L_DIVERSITY_CANDIDATE_FIELDS,
)
from .extensions import db
from .models import (
    User,
    Study,
    FieldDescription,
    FieldOption,
    StudyRequiredField,
    StudyParticipant,
    StudyParticipantConsentedField,
    ParticipantAnswer,
    StudyIssue,
    StudyIssueField,
    StudyModification,
    StudyModificationOptionalField,
    StudyModificationRequiredField,
    ActivityLog,
    StudyResearcher,
)

# Blueprint registers all API routes under a common prefix
# Initialises the policy engine
api = Blueprint("api", __name__)
policy_engine = get_policy_engine()

# Helper functions:
# check_policy returns an error response if the action is not allowed under current policies, otherwise returns None:
def check_policy(action, context):
    if not policy_engine.is_allowed(action, context):
        return error(f"action '{action}' is not allowed under current policies", 403)
# Main authorization entry point for all protected endpoints:
# Evaluates the policy engine and return a generic error if denied.
def authorize(action, context):
    decision = policy_engine.evaluate(action, context)
    if not decision.allowed:
        # Log details server-side only!!! never expose policy internals to the client:
        print(f"[AUTH DENIED] action='{action}' failures={decision.failures} "
              f"prohibitions={decision.matched_prohibitions}")
        return error("Access denied.", 403)
    return None
# Standardised JSON error response used across the API:
def error(message, status=400):
    return jsonify({"error": message}), status
# Splits the fields associated with a study into required vs. optional id lists:
def split_study_field_ids(study_id):
    study_fields = StudyRequiredField.query.filter_by(study_id=study_id).all()
    return {
        "required_field_ids": [row.field_id for row in study_fields if row.is_required],
        "optional_field_ids": [row.field_id for row in study_fields if not row.is_required],
        "all_field_ids": [row.field_id for row in study_fields],
    }


# Get the current user based on JWT identity claim:
def get_current_user():
    user_id = get_jwt_identity()
    if user_id is None:
        return None
    return User.query.get(int(user_id))
# Shared context builder for policy evaluation
# This function constructs a context dictionary that includes:
# - information about the current user, 
# - the action being performed, 
# - the resource involved, 
# - any target user (for actions involving another user), 
# - membership status (e.g., whether the user is enrolled in a study),
# - and any extra context needed for specific policy checks 
# This standardized context can then be used across different policy evaluations to determine if an action is allowed.
def build_auth_context(
    current_user,
    action,
    resource=None,
    target_user=None,
    membership=None,
    extra=None
):
    context = {
        "action": action,
        "subject": {
            "userId": current_user.user_id if current_user else None,
            "role": current_user.role_id if current_user else None,
            "isActive": getattr(current_user, "is_active", None),
        },
        "resource": {
            "studyId": getattr(resource, "study_id", None),
            "creatorId": getattr(resource, "creator_id", None),
            "status": getattr(resource, "status", None),
        },
        "env": {
            "isOwner": bool(current_user and resource and getattr(resource, "creator_id", None) == current_user.user_id),
            "isOwnerOrRegulator": bool(
                current_user and (
                    getattr(current_user, "role_id", None) == "regulator" or
                    (resource and getattr(resource, "creator_id", None) == current_user.user_id)
                )
            ),
            "isEnrolled": membership is not None,
            "isSelf": bool(current_user and target_user and current_user.user_id == target_user.user_id),
        }
    }

    if extra:
        context["env"].update(extra)

    return context
# Role check helper (not needed):
def require_role(*allowed_roles):
    user = get_current_user()
    if not user: 
        return None, error ("user not found", 404)
    if user.role_id not in allowed_roles:
        return None, error("user does not have required role", 403)
    return user, None
# Utility function to add a number of months to a datetime (approximate as 30 days per month):
def add_months_as_days(start_dt, months):
    return start_dt + timedelta(days=30 * months)
# Utility function to refresh study status based on current time and its lifecycle timestamps:
# Transtitions: open to ongoing to complete.
def refresh_study_status(study):
    if not study:
        return None

    now = datetime.utcnow()
    changed = False

    if study.status == "open" and study.open_until and now >= study.open_until:
        study.status = "ongoing"
        changed = True

    if study.status == "ongoing" and study.ongoing_until and now >= study.ongoing_until:
        study.status = "complete"
        changed = True

    if changed:
        db.session.commit()

    return study

# Records a user/study action in the activity_logs table.
# Should be called before db.session.commit() so the log entry is part of the same transaction:
def log_action(action, user_id=None, study_id=None, details=None):
    entry = ActivityLog(
        user_id=user_id,
        study_id=study_id,
        action=action,
        details=json.dumps(details) if details else None,
        created_at=datetime.utcnow(),
    )
    db.session.add(entry)

# Return the StudyResearcher row if the user is an explicit collaborator (not the creator):
def get_study_researcher(study_id, researcher_id):
    return StudyResearcher.query.filter_by(
        study_id=study_id,
        researcher_id=researcher_id,
    ).first()

# Returns True if the user can view study data (creator, regulator, or editor collaborator):
def can_access_study_data(study, user):
    if user.role_id == "regulator":
        return True
    if study.creator_id == user.user_id:
        return True
    collab = get_study_researcher(study.study_id, user.user_id)
    return collab is not None and collab.access_level in ("editor",)

# Each of these helpers convert a SQLAlchemy model row into a JSON-friendly dict:
def serialise_study_researcher(sr, study_creator_id):
    return {
        "researcher_id": sr.researcher_id,
        "name": sr.researcher.name if sr.researcher else None,
        "email": sr.researcher.email if sr.researcher else None,
        "access_level": sr.access_level,
        "added_at": sr.added_at.isoformat(),
        "is_creator": sr.researcher_id == study_creator_id,
    }

def serialise_field_option(option):
    return {
        "option_id": option.option_id,
        "value": option.value,
        "display_order": option.display_order,
    }

def serialise_log_entry(log):
    details = None
    if log.details:
        try:
            details = json.loads(log.details)
        except (json.JSONDecodeError, TypeError):
            details = log.details
    user_name = None
    if log.user_id:
        user = User.query.get(log.user_id)
        user_name = user.name if user else None
    return {
        "log_id": log.log_id,
        "user_id": log.user_id,
        "user_name": user_name,
        "study_id": log.study_id,
        "action": log.action,
        "details": details,
        "created_at": log.created_at.isoformat(),
    }

# Health check endpoint:
@api.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


# Compact view of a study used in listings, includes issue and participant aggregates:
def serialise_study_summary(study):
    study_fields = split_study_field_ids(study.study_id)

    issue_count = StudyIssue.query.filter_by(study_id=study.study_id).count()

    participant_count = StudyParticipant.query.filter_by(
        study_id=study.study_id
    ).count()

    latest_issue = (
        StudyIssue.query
        .filter_by(study_id=study.study_id)
        .order_by(StudyIssue.created_at.desc())
        .first()
    )

    latest_issue_status = latest_issue.status if latest_issue else None

    has_open_issue = StudyIssue.query.filter_by(
        study_id=study.study_id,
        status="open"
    ).first() is not None

    has_responded_issue = StudyIssue.query.filter_by(
        study_id=study.study_id,
        status="responded"
    ).first() is not None

    return {
        "study_id": study.study_id,
        "study_name": study.study_name,
        "description": study.description,
        "data_collection_months": study.data_collection_months,
        "research_duration_months": study.research_duration_months,
        "status": study.status,
        "creator_id": study.creator_id,
        "required_field_ids": study_fields["required_field_ids"],
        "optional_field_ids": study_fields["optional_field_ids"],
        "issue_count": issue_count,
        "reviewed_before": issue_count > 0,
        "has_open_issue": has_open_issue,
        "has_responded_issue": has_responded_issue,
        "latest_issue_status": latest_issue_status,
        "participant_count": participant_count,
    }
# Full field representation, including its enum options if any:
def serialise_field(field):
    return {
        "field_id": field.field_id,
        "name": field.field_name,
        "description": field.field_desc,
        "field_name": field.field_name,
        "field_desc": field.field_desc,
        "field_type": field.field_type,
        "options": [
            serialise_field_option(option)
            for option in field.options
        ],
    }
# Expanded study view for the regulator review screen:
def serialise_regulator_study_detail(study):
    study_fields = split_study_field_ids(study.study_id)
    participant_count = StudyParticipant.query.filter_by(
        study_id=study.study_id
    ).count()

    required_fields = []
    optional_fields = []

    for field_id in study_fields["required_field_ids"]:
        field = FieldDescription.query.get(field_id)
        if field:
            required_fields.append(serialise_field(field))

    for field_id in study_fields["optional_field_ids"]:
        field = FieldDescription.query.get(field_id)
        if field:
            optional_fields.append(serialise_field(field))

    return {
        "study_id": study.study_id,
        "study_name": study.study_name,
        "description": study.description,
        "data_collection_months": study.data_collection_months,
        "research_duration_months": study.research_duration_months,
        "status": study.status,
        "creator_id": study.creator_id,
        "participant_count": participant_count,
        "required_field_ids": study_fields["required_field_ids"],
        "optional_field_ids": study_fields["optional_field_ids"],
        "required_fields": required_fields,
        "optional_fields": optional_fields,
    }
# Combines any issue with its flagged fields and (if any) the researcher's modification response:
def serialise_study_issue(issue):
    flagged_fields = []
    flagged_field_ids = []

    for row in issue.flagged_fields:
        flagged_field_ids.append(row.field_id)
        if row.field:
            flagged_fields.append(serialise_field(row.field))

    modification = StudyModification.query.filter_by(
        issue_id=issue.issue_id
    ).first()

    modification_data = None

    if modification:
        required_field_changes = []
        optional_field_changes = []

        for row in modification.modified_required_fields:
            required_field_changes.append({
                "field_id": row.field.field_id,
                "name": row.field.field_name,
                "description": row.field.field_desc,
                "modification_type": row.modification_type,
            })

        for row in modification.modified_optional_fields:
            optional_field_changes.append({
                "field_id": row.field.field_id,
                "name": row.field.field_name,
                "description": row.field.field_desc,
                "modification_type": row.modification_type,
            })

        modification_data = {
            "modification_id": modification.modification_id,
            "comment": modification.comment,
            "required_field_changes": required_field_changes,
            "optional_field_changes": optional_field_changes,
        }

    return {
        "issue_id": issue.issue_id,
        "study_id": issue.study_id,
        "regulator_id": issue.regulator_id,
        "comment": issue.comment,
        "status": issue.status,
        "flagged_field_ids": flagged_field_ids,
        "flagged_fields": flagged_fields,
        "created_at": issue.created_at.isoformat(),
        "modification": modification_data,
    }



@api.route("/users", methods=["POST"])
def create_user():
    """Register a new participant or researcher account.
    Accepts name, email, password and an optional role_id (defaults to
    'participant'). Rejects unknown roles, duplicate emails, and missing
    fields. Stores a hashed password and returns the new user's id, email
    and role.
    """
    data = request.get_json() or {}

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    role_id = data.get("role_id", "participant")

    if not all([name, email, password]):
        return error("name, email, and password are required")

    # Self-registration is restricted to non-privileged roles )admins): 
    if role_id not in {"participant", "researcher"}:
        return error("role must be 'participant' or 'researcher'")
    

    existing = User.query.filter_by(email=email).first()
    if existing:
        return error("email already exists", 409)
    
    # Hash plain text password (never store plaintext): 
    hashed_password = generate_password_hash(password)

  


    user = User(
        name=name,
        email=email,
        password_hash=hashed_password,
        role_id=role_id,
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({
        "message": "user created",
        "user": {
            "user_id": user.user_id,
            "email": user.email,
            "role_id": user.role_id
        }
    }), 201



@api.route("/fields", methods=["POST"])
@jwt_required()
def create_field():
     """Create a new field definition (text or enum).
    Authorised via the policy engine ('createField'). Enum fields require
    at least two unique non-empty options. Field names are globally unique.
    Returns the created field, including its persisted enum options.
    """
     current_user = get_current_user()
     if not current_user:
        return error("user not found", 404)

     data = request.get_json() or {}

     field_name = data.get("field_name")
     field_desc = data.get("field_desc")
     field_type = data.get("field_type", "text")
     options = data.get("options", [])

     if not field_name or not field_name.strip():
        return error("field_name is required")

     if field_type not in {"text", "enum"}:
        return error("field_type must be either 'text' or 'enum'", 400)

     cleaned_options = []
    
     if field_type == "enum":
        if not isinstance(options, list):
            return error("options must be a list for enum fields", 400)

        for option in options:
            if not isinstance(option, str):
                return error("each enum option must be a string", 400)

            stripped = option.strip()
            if stripped:
                cleaned_options.append(stripped)

        # Remove duplicate options while preserving order:
        cleaned_options = list(dict.fromkeys(cleaned_options))

        if len(cleaned_options) < 2:
            return error(
                "enum fields must have at least two unique non-empty options",
                400,
            )

     context = build_auth_context(
        current_user=current_user,
        action="createField",
    )

     authori_error = authorize("createField", context)
     if authori_error:
        return authori_error

     existing = FieldDescription.query.filter_by(
        field_name=field_name.strip()
    ).first()

     if existing:
        return error("field_name already exists", 409)

     field = FieldDescription(
         field_name=field_name.strip(),
        field_desc=field_desc.strip() if isinstance(field_desc, str) else field_desc,
        field_type=field_type,
        created_by=current_user.user_id,
    )

     db.session.add(field)
     # Ensure field.field_id is populating before inserting options:
     db.session.flush()

     for index, option_value in enumerate(cleaned_options):
        db.session.add(
            FieldOption(
                field_id=field.field_id,
                value=option_value,
                display_order=index,
            )
        )

     db.session.commit()

     return jsonify({
        "message": "field created by researcher",
        "field": {
            "field_id": field.field_id,
            "field_name": field.field_name,
            "field_desc": field.field_desc,
            "field_type": field.field_type,
            "options": [
                serialise_field_option(option)
                for option in field.options
            ],
        },
    }), 201


@api.route("/fields", methods=["GET"])
@jwt_required()
def list_all_fields():
    """List every field definition in the catalogue.
    Authorised via the policy engine ('listFields'). Returns fields in
    ascending id order, including their enum options where applicable.
    """
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)
    
    context = build_auth_context(
        current_user=current_user,
        action="listFields",
    )

    authori_error = authorize("listFields", context)
    if authori_error:
        return authori_error

    fields = FieldDescription.query.order_by(FieldDescription.field_id.asc()).all()

    return jsonify({
        "fields": [
            {
                "field_id": f.field_id,
                "field_name": f.field_name,
                "field_desc": f.field_desc,
                "field_type": f.field_type,
                "options": [
                    serialise_field_option(option)
                    for option in f.options
                ],
            }
            for f in fields
        ]
    }), 200

@api.route("/studies", methods=["POST"])
@jwt_required()
def create_study():
    """Create a new study in 'pending' status awaiting regulator approval.
    Validates that durations are positive integers, that at least one
    required field is provided, and that every supplied field id exists.
    Authorisation (including any per-researcher active-study cap) is
    delegated to the policy engine via 'createStudy'. Persists the
    required/optional field associations and logs the creation.
    """
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)
    
    data = request.get_json() or {}

    study_name = data.get("study_name")
    description = data.get("description")
    data_collection_months = data.get("data_collection_months")
    research_duration_months = data.get("research_duration_months")
    required_field_ids = data.get("required_field_ids", [])
    optional_field_ids = data.get("optional_field_ids", [])


    if not study_name or not description:
        return error("study_name and description are required")

    if data_collection_months is None or research_duration_months is None:
        return error("data_collection_months and research_duration_months are required")

    if not isinstance(data_collection_months, int) or data_collection_months <= 0:
        return error("data_collection_months must be a positive integer")

    if not isinstance(research_duration_months, int) or research_duration_months <= 0:
        return error("research_duration_months must be a positive integer")

    if not isinstance(required_field_ids, list) or not required_field_ids:
        return error("required_field_ids must be a non-empty list")

    if not isinstance(optional_field_ids, list):
        return error("optional_field_ids must be a list")
    
    active_count = Study.query.filter(
        Study.creator_id == current_user.user_id,
        Study.status.in_(["pending", "open", "ongoing"])
    ).count()
    # Verification for existence of every supplied field id: 
    all_field_ids = list(dict.fromkeys(required_field_ids + optional_field_ids))

    fields = FieldDescription.query.filter(
        FieldDescription.field_id.in_(all_field_ids)
    ).all()

    if len(fields) != len(all_field_ids):
        return error("one or more field_ids do not exist")
    else:
        valid_field_ids  = (len(fields) == len(all_field_ids))

    context = build_auth_context(
        current_user=current_user,
        action="createStudy",
        extra={
            "activeStudyCount": active_count,
            "hasStudyName": bool(study_name),
            "hasDescription": bool(description),
            "hasRequiredFields": bool(required_field_ids),
            "validFieldIds": valid_field_ids
        }
    )

    authori_error = authorize("createStudy", context)
    if authori_error:
        return authori_error
    study = Study(
        study_name=study_name.strip(),
        description=description.strip(),
        data_collection_months=data_collection_months,
        research_duration_months=research_duration_months,
        creator_id=current_user.user_id,
        status="pending",
        approved_at=None,
        open_until=None,
        ongoing_until=None
    )

    db.session.add(study)
    db.session.flush()

    for field_id in required_field_ids:
        db.session.add(StudyRequiredField(
            study_id=study.study_id,
            field_id=field_id,
            is_required=True
        ))

    for field_id in optional_field_ids:
        db.session.add(StudyRequiredField(
            study_id=study.study_id,
            field_id=field_id,
            is_required=False
        ))

    log_action("study_created", user_id=current_user.user_id, study_id=study.study_id,
               details={"study_name": study.study_name})
    db.session.commit()

    return jsonify({
        "message": "study created and is pending regulator approval",
        "study": {
            "study_id": study.study_id,
            "study_name": study.study_name,
            "description": study.description,
            "data_collection_months": study.data_collection_months,
            "research_duration_months": study.research_duration_months,
            "creator_id": study.creator_id,
            "status": study.status,
            "approved_at": study.approved_at.isoformat() if study.approved_at else None,
            "open_until": study.open_until.isoformat() if study.open_until else None,
            "ongoing_until": study.ongoing_until.isoformat() if study.ongoing_until else None,
            "required_field_ids": required_field_ids,
            "optional_field_ids": optional_field_ids
        }
    }), 201

@api.route("/studies/<int:study_id>/join", methods=["POST"])
@jwt_required()
def join_study(study_id):
    """Enrol the current user as a participant in a study.
    Refreshes the study's status so the policy engine sees its current
    lifecycle state, then delegates the join decision (including
    already-enrolled detection) to 'joinStudy'. Creates a membership row
    with consent_all_fields=False; consent is granted explicitly later
    via /consent/modify.
    """
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)
    
    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)
    
    refresh_study_status(study)
    # Pre-fetch any existing membership so the policy engine can detect double-joins: 
    membership = StudyParticipant.query.filter_by(
        study_id=study_id,
        participant_id=current_user.user_id
    ).first()

    context = build_auth_context(
        current_user=current_user,
        action="joinStudy",
        resource=study,
        membership=membership
    )

    auth_error = authorize("joinStudy", context)
    if auth_error:
        return auth_error

    link = StudyParticipant(
        study_id=study_id,
        participant_id=current_user.user_id,
        consent_all_fields=False,
    )
    db.session.add(link)
    log_action("participant_joined", user_id=current_user.user_id, study_id=study_id)
    db.session.commit()

    return jsonify({
        "message": "participant joined study and consented to all required fields by default",
        "study_id": study_id,
        "participant_id": current_user.user_id,
    }), 201


# Current functionality:
# - Require JWT and role check for participant
# - Get study by ID and validate it exists
# - Refresh study status and enforce that modifications are only allowed during open status
# - Validate that the participant is enrolled in the study
# - Delete membership link to withdraw from study
# - Save and return
@api.route("/studies/<int:study_id>/withdraw", methods=["POST"])
@jwt_required()
def withdraw_from_study(study_id):
    """Withdraw the current user from a study by deleting their membership.
    Authorisation is delegated to 'withdrawStudy'; the policy engine
    handles enrolment and lifecycle-stage checks.
    """
    current_user = get_current_user()

    if not current_user:
        return error("user not found", 404)

    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)

    refresh_study_status(study)
    membership = StudyParticipant.query.filter_by(
        study_id=study_id,
        participant_id=current_user.user_id,
    ).first()

    context = build_auth_context(
        current_user=current_user,
        action="withdrawStudy",
        resource=study,
        membership=membership
    )

    authori_error = authorize("withdrawStudy", context)
    if authori_error:
        return authori_error

    db.session.delete(membership)
    log_action("participant_withdrew", user_id=current_user.user_id, study_id=study_id)
    db.session.commit()

    return jsonify({
        "message": "withdrawn from study",
        "study_id": study_id,
        "participant_id": current_user.user_id,
    }), 200

@api.route("/studies/<int:study_id>/consent/modify", methods=["POST"])
@jwt_required()
def modify_consent(study_id):
    """Replace the current user's consented-field set for a study.
    Validates that every supplied id belongs to the study. If any required
    field is missing from the new set, the participant is automatically
    withdrawn from the study. Otherwise the existing consent rows are
    deleted and replaced wholesale, and consent_all_fields is recomputed.
    """
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)
   
    data = request.get_json() or {}    
    consented_field_ids = data.get("consented_field_ids", [])

    if not isinstance(consented_field_ids, list):
        return error("consented_field_ids must be a list")

    study = Study.query.get(study_id)
    if not study: 
        return error("study not found", 404)
    refresh_study_status(study)

    membership = StudyParticipant.query.filter_by(
        study_id=study_id,
        participant_id=current_user.user_id,
    ).first()

    if not membership:
        return error("participant is not enrolled in this study", 404)

   
    # Get all valid fields associated with this study:
    study_fields = StudyRequiredField.query.filter_by(study_id=study_id).all()
    all_field_ids = {f.field_id for f in study_fields}
    required_ids = {f.field_id for f in study_fields if f.is_required}

    invalid = [fid for fid in consented_field_ids if fid not in all_field_ids]
    if invalid:
        return error(f"invalid field_ids: {invalid}")
    # If required fields are no longer consented, treat as an implicit withdrawal:
    if not required_ids.issubset(set(consented_field_ids)):
        StudyParticipant.query.filter_by(
            study_id=study_id,
            participant_id=current_user.user_id,
        ).delete(synchronize_session=False)
        db.session.delete(membership)
        log_action("participant_withdrew", user_id=current_user.user_id, study_id=study_id,
                   details={"reason": "missing_required_consent"})
        db.session.commit()
        return jsonify({
            "message": "withdrawn from study due to missing required consent",
            "study_id": study_id,
        }), 200
    
    context = build_auth_context(
    current_user=current_user,
    action="modifyConsent",
    resource=study,
    membership=membership,
    extra={
        "requiredFieldsProvided": True  # now guaranteed
    }
)

    authori_error = authorize("modifyConsent", context)
    if authori_error:
        return authori_error

    # Update consent:
    StudyParticipantConsentedField.query.filter_by(
        study_id=study_id,
        participant_id=current_user.user_id,
    ).delete(synchronize_session=False)

    for fid in consented_field_ids:
        db.session.add(StudyParticipantConsentedField(
            study_id=study_id,
            participant_id=current_user.user_id,
            field_id=fid,
        ))

    # True iff the participant has consented to every available field for this study:
    membership.consent_all_fields = (len(consented_field_ids) == len(all_field_ids))
    log_action("consent_modified", user_id=current_user.user_id, study_id=study_id,
               details={"consented_field_count": len(consented_field_ids)})
    db.session.commit()

    return jsonify({
        "message": "consent updated",
        "consented_field_ids": consented_field_ids,
    }), 200


@api.route("/participants/<int:participant_id>/answers", methods=["POST"])
@jwt_required()
def upsert_participant_answers(participant_id):
    """Upsert a participant's answers for one or more fields.
    Authorisation is delegated to 'submitAnswers'. For each item, the
    field is resolved by field_id first and then field_name as a fallback.
    Enum answers must match one of the declared option values (blank is
    allowed). Existing answers are updated in place; missing ones are
    inserted. The response lists each result as 'created' or 'updated'.
    """
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)

    participant = User.query.get(participant_id)
    if not participant:
        return error("participant not found", 404)

    data = request.get_json() or {}
    answers = data.get("answers", [])

    if not isinstance(answers, list) or not answers:
        return error("answers must be a non-empty list")

    context = build_auth_context(
        current_user=current_user,
        action="submitAnswers",
        target_user=participant,
    )

    auth_error = authorize("submitAnswers", context)
    if auth_error:
        return auth_error

    updated = []

    for item in answers:
        field_id = item.get("field_id")
        field_name = item.get("field_name")
        answer_value = item.get("answer", "")

        field = None

        if field_id is not None:
            field = FieldDescription.query.get(field_id)

        if not field and field_name:
            field = FieldDescription.query.filter_by(field_name=field_name).first()

        if not field:
            return error("field does not exist", 400)

        if answer_value is None:
            answer_value = ""

        if not isinstance(answer_value, str):
            answer_value = str(answer_value)

        if field.field_type == "enum":
            allowed_values = {
                option.value
                for option in field.options
            }

            # Allow blank answers, but validate non-blank enum answers:
            if answer_value and answer_value not in allowed_values:
                return error(
                    f"answer for '{field.field_name}' must be one of: {sorted(allowed_values)}",
                    400,
                )

        existing = ParticipantAnswer.query.filter_by(
            participant_id=participant_id,
            field_id=field.field_id,
        ).first()

        if existing:
            existing.answer = answer_value
            updated.append({
                "field_id": field.field_id,
                "field_name": field.field_name,
                "answer": answer_value,
                "action": "updated",
            })
        else:
            db.session.add(ParticipantAnswer(
                participant_id=participant_id,
                field_id=field.field_id,
                answer=answer_value,
            ))
            updated.append({
                "field_id": field.field_id,
                "field_name": field.field_name,
                "answer": answer_value,
                "action": "created",
            })

    log_action(
        "answers_submitted",
        user_id=participant_id,
        details={"field_count": len(updated)},
    )

    db.session.commit()

    return jsonify({
        "message": "answers saved",
        "participant_id": participant_id,
        "results": updated,
    }), 200


@api.route("/participants/<int:participant_id>/answers", methods=["GET"])
@jwt_required()
def get_participant_answers(participant_id):
    """Return every field in the catalogue alongside the participant's answer.
    Authorised via 'viewOwnAnswers'. Fields without a stored answer are
    returned with an empty string so the client always sees the full
    questionnaire.
    """
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)

    participant = User.query.get(participant_id)
    if not participant:
        return error("participant not found", 404)

    context = build_auth_context(
        current_user=current_user,
        action="viewOwnAnswers",
        target_user=participant,
    )

    auth_error = authorize("viewOwnAnswers", context)
    if auth_error:
        return auth_error

    fields = FieldDescription.query.order_by(FieldDescription.field_id.asc()).all()

    results = []

    for field in fields:
        existing = ParticipantAnswer.query.filter_by(
            participant_id=participant_id,
            field_id=field.field_id,
        ).first()

        results.append({
            "field_id": field.field_id,
            "field_name": field.field_name,
            "field_description": field.field_desc,
            "field_type": field.field_type,
            "options": [
                option.value
                for option in field.options
            ],
            "answer": existing.answer if existing else "",
        })

    return jsonify({
        "participant_id": participant_id,
        "answers": results,
    }), 200

@api.route("/participants/<int:participant_id>/studies", methods=["GET"])
@jwt_required()
def list_participant_studies(participant_id):
    """List every study the participant is enrolled in, with consent details.
    Authorised via 'viewParticipantStudies'. For each membership the
    study's status is refreshed and its required/optional field split is
    returned alongside the participant's currently consented field ids.
    """
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)

    participant = User.query.get(participant_id)
    if not participant:
        return error("participant not found", 404)

    context = build_auth_context(
        current_user=current_user,
        action="viewParticipantStudies",
        target_user=participant
    )

    auth_error = authorize("viewParticipantStudies", context)
    if auth_error:
        return auth_error

    memberships = StudyParticipant.query.filter_by(
        participant_id=participant_id
    ).all()

    results = []
    for membership in memberships:
        study = membership.study
        refresh_study_status(study)

        consented_rows = StudyParticipantConsentedField.query.filter_by(
            study_id=study.study_id,
            participant_id=participant_id,
        ).all()

        consented_field_ids = [row.field_id for row in consented_rows]
        study_fields = split_study_field_ids(study.study_id)

        results.append({
            "study_id": study.study_id,
            "study_name": study.study_name,
            "description": study.description,
            "status": study.status,
            "joined_at": membership.joined_at.isoformat(),
            "consent_all_fields": membership.consent_all_fields,
            "consented_field_ids": consented_field_ids,
            "required_field_ids": study_fields["required_field_ids"],
            "optional_field_ids": study_fields["optional_field_ids"]
        })

    return jsonify({
        "participant_id": participant_id,
        "studies": results,
    }), 200

@api.route("/participants/<int:participant_id>/available-studies", methods=["GET"])
@jwt_required()
def list_available_studies(participant_id):
    """List open studies the participant has not yet joined.
    Authorised via 'viewAvailableStudies'. Refreshes each study's status
    and filters out anything that isn't 'open' or that the participant is
    already enrolled in.
    """
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)

    participant = User.query.get(participant_id)
    if not participant:
        return error("participant not found", 404)

    context = build_auth_context(
        current_user=current_user,
        action="viewAvailableStudies",
        target_user=participant
    )

    auth_error = authorize("viewAvailableStudies", context)
    if auth_error:
        return auth_error
    # Exclude studies the participant has already joined: 
    joined_ids = {
        s.study_id for s in StudyParticipant.query.filter_by(
            participant_id=participant_id
        ).all()
    }

    studies = Study.query.all()

    results = []
    for study in studies:
        refresh_study_status(study)

        if study.status != "open":
            continue
        if study.study_id in joined_ids:
            continue

        study_fields = split_study_field_ids(study.study_id)

        results.append({
            "study_id": study.study_id,
            "study_name": study.study_name,
            "description": study.description,
            "status": study.status,
            "data_collection_months": study.data_collection_months,
            "research_duration_months": study.research_duration_months,
            "required_field_ids": study_fields["required_field_ids"],
            "optional_field_ids": study_fields["optional_field_ids"]
        })

    return jsonify({
        "participant_id": participant_id,
        "studies": results
    }), 200



@api.route("/researchers/<int:researcher_id>/studies", methods=["GET"])
@jwt_required()
def list_researcher_studies(researcher_id):
    """List every study a researcher owns or collaborates on.
    Authorised via 'viewResearcherStudies'. Merges studies the researcher
    created with those where they appear in StudyResearcher, annotating
    each summary with is_creator and an access_level of 'owner', 'editor'
    or 'viewer'.
    """
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)

    researcher = User.query.get(researcher_id)
    if not researcher:
        return error("researcher not found", 404)

    context = build_auth_context(
        current_user=current_user,
        action="viewResearcherStudies",
        target_user=researcher,
        extra={
            "isOwnerOrRegulator": (
                current_user.user_id == researcher_id or
                current_user.role_id == "regulator"
            )
        }
    )

    auth_error = authorize("viewResearcherStudies", context)
    if auth_error:
        return auth_error
    # Studies the researcher created themselves: 
    created_studies = Study.query.filter_by(creator_id=researcher_id).all()
    created_ids = {s.study_id for s in created_studies}
    # Studies the researcher collaborates on but did NOT create:
    collab_rows = StudyResearcher.query.filter_by(researcher_id=researcher_id).all()
    collab_study_ids = [r.study_id for r in collab_rows if r.study_id not in created_ids]
    collab_studies = Study.query.filter(Study.study_id.in_(collab_study_ids)).all() if collab_study_ids else []
    # Merge both lists, annotating each with the researcher's role on it: 
    results = []
    for study in created_studies + collab_studies:
        refresh_study_status(study)
        summary = serialise_study_summary(study)
        summary["is_creator"] = study.study_id in created_ids
        collab = next((r for r in collab_rows if r.study_id == study.study_id), None)
        summary["access_level"] = "owner" if study.study_id in created_ids else (collab.access_level if collab else "viewer")
        results.append(summary)

    return jsonify({
        "researcher_id": researcher_id,
        "studies": results
    }), 200


@api.route("/studies/<int:study_id>", methods=["GET"])
@jwt_required(optional=True)
def get_study(study_id):
    """Return a study's public summary.
    Open studies are visible to anyone (including unauthenticated callers).
    Rejected studies are hidden from non-regulators with a 404. All other
    statuses require authentication and policy-engine approval via
    'viewStudy'.
    """
    current_user = get_current_user()

    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)

    refresh_study_status(study)

    # Rejected studies are only visible to the study's researchers and regulators
    # Block non-regulator access to rejected studies:
    if study.status == "rejected":
        if not current_user:
            return error("study not found", 404)
        if current_user.role_id != "regulator":
            is_member = StudyResearcher.query.filter_by(
                study_id=study.study_id,
                researcher_id=current_user.user_id
            ).first() is not None
            is_creator = study.creator_id == current_user.user_id
            if not (is_member or is_creator):
                return error("study not found", 404)

    study_fields = split_study_field_ids(study.study_id)

    participant_count = StudyParticipant.query.filter_by(
        study_id=study.study_id
    ).count()

    payload = {
        "study_id": study.study_id,
        "study_name": study.study_name,
        "description": study.description,
        "data_collection_months": study.data_collection_months,
        "research_duration_months": study.research_duration_months,
        "status": study.status,
        "required_field_ids": study_fields["required_field_ids"],
        "optional_field_ids": study_fields["optional_field_ids"],
        "participant_count": participant_count
    }

    # For rejected studies return early with the rejection reason; skip policy engine
    if study.status == "rejected":
        rejection_log = ActivityLog.query.filter_by(
            study_id=study.study_id,
            action="study_rejected"
        ).order_by(ActivityLog.created_at.desc()).first()
        rejection_reason = None
        if rejection_log and rejection_log.details:
            try:
                details = json.loads(rejection_log.details)
                rejection_reason = details.get("reason")
            except (json.JSONDecodeError, TypeError):
                pass
        payload["rejection_reason"] = rejection_reason
        return jsonify({"study": payload}), 200

    # Public access for open studies: 
    if study.status == "open":
        return jsonify({"study": payload}), 200

    # Any other status requires authentication: 
    if not current_user:
        return error("authentication required", 401)

    context = build_auth_context(
        current_user=current_user,
        action="viewStudy",
        resource=study
    )

    auth_error = authorize("viewStudy", context)
    if auth_error:
        return auth_error

    return jsonify({"study": payload}), 200


@api.route("/researchers/<int:researcher_id>/studies/<int:study_id>/data", methods=["GET"])
@api.route("/studies/<int:study_id>/data", methods=["GET"])
@jwt_required()
def get_study_data(study_id, researcher_id=None):
    """Return anonymised study data using k-anonymity and l-diversity.
    Authorised via 'accessStudyData' (creator, regulator or editor
    collaborator). Pivots the (participant, field, answer) rows where the
    participant has consented, classifies each consented field as a
    quasi-identifier, sensitive attribute or other, applies the
    anonymisation pipeline, and returns the resulting groups plus the
    privacy parameters used.
    """
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)

    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)

    refresh_study_status(study)

    context = build_auth_context(
        current_user=current_user,
        action="accessStudyData",
        resource=study,
        extra={
            "isOwnerOrRegulator": can_access_study_data(study, current_user)
        }
    )

    auth_error = authorize("accessStudyData", context)
    if auth_error:
        return auth_error

    # Fetch every (participant, field, answer) triple where the participant has given their consent: 
    rows = db.session.query(
        StudyParticipant.participant_id,
        FieldDescription.field_id,
        FieldDescription.field_name,
        FieldDescription.field_desc,
        ParticipantAnswer.answer
    ).select_from(StudyParticipantConsentedField).join(
        StudyParticipant,
        and_(
            StudyParticipant.study_id == StudyParticipantConsentedField.study_id,
            StudyParticipant.participant_id == StudyParticipantConsentedField.participant_id,
        )
    ).join(
        FieldDescription,
        FieldDescription.field_id == StudyParticipantConsentedField.field_id
    ).outerjoin(
        ParticipantAnswer,
        (ParticipantAnswer.participant_id == StudyParticipant.participant_id) &
        (ParticipantAnswer.field_id == FieldDescription.field_id)
    ).filter(
        StudyParticipantConsentedField.study_id == study_id
    ).all()

    participant_records = {}
    consented_field_names = set()

    for pid, field_id, field_name, field_desc, answer in rows:
        participant_key = str(pid)

        if participant_key not in participant_records:
            participant_records[participant_key] = {}

        participant_records[participant_key][field_name] = answer
        consented_field_names.add(field_name)

    # Classify each consented field as quasi-identifier, sensitive or other:
    active_quasi_identifier_fields = get_active_candidate_fields(
        consented_field_names,
        K_ANONYMITY_CANDIDATE_FIELDS,
    )

    active_sensitive_fields = get_active_candidate_fields(
        consented_field_names,
        L_DIVERSITY_CANDIDATE_FIELDS,
    )

    active_other_fields = get_active_other_fields(
        consented_field_names,
        active_quasi_identifier_fields,
        active_sensitive_fields,
    )

    # Apply k-anonymity and l-diversity, then aggregate released field values:
    anonymised_data = anonymise_study_records(
        participant_records,
        active_quasi_identifier_fields,
        active_sensitive_fields,
        active_other_fields,
    )

    return jsonify({
        "study": {
            "study_id": study.study_id,
            "study_name": study.study_name,
            "description": study.description,
            "data_collection_months": study.data_collection_months,
            "research_duration_months": study.research_duration_months,
            "status": study.status,
        },
        "privacy": {
            "method": "k-anonymity and l-diversity",
            "k": anonymised_data["k"],
            "l": anonymised_data["l"],
            "candidate_quasi_identifier_fields": anonymised_data["candidate_quasi_identifier_fields"],
            "candidate_sensitive_fields": anonymised_data["candidate_sensitive_fields"],
            "active_quasi_identifier_fields": anonymised_data["active_quasi_identifier_fields"],
            "active_sensitive_fields": anonymised_data["active_sensitive_fields"],
            "active_other_fields": anonymised_data["active_other_fields"],
        },
        "summary": anonymised_data["summary"],
        "groups": anonymised_data["groups"],
    }), 200

@api.route("/login", methods=["POST"])
def login():
    """Authenticate a user and issue a JWT access token.
    Returns the same generic error for unknown email and wrong password to
    avoid user enumeration. Inactive users are blocked. On success, issues
    a JWT whose identity is the user_id (as a string) with role_id and
    email as additional claims.
    """
    data = request.get_json() or {}

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return error("email and password are required")
    user = User.query.filter_by(email=email).first()
    if not user:
        return error("invalid email or password", 401)
    # Check hashed password: 
    if not check_password_hash(user.password_hash, password):
        return error("invalid email or password", 401)
    
    # Block inactive users:
    if not user.is_active:
        return error("account is inactive", 403)
    
    # Create access JWT token with role_id and email as identity:
    access_token = create_access_token(
        identity=str(user.user_id),
        additional_claims={
            "role_id": user.role_id,
            "email": user.email
        }
    )
    return jsonify({
        "message": "login successful",
        "access_token": access_token,
        "user": {
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "role_id": user.role_id,
        }
    }), 200



@api.route("/admin/studies/<int:study_id>/approve", methods=["POST"])
@jwt_required()
def approve_study(study_id):
    """Approve a pending study and start its lifecycle clock.
    Authorised via 'approveStudy'. Moves the study to 'open', stamps
    approved_at, and derives open_until and ongoing_until from the
    study's declared data-collection and research-duration windows.
    """
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)
    
    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)

    refresh_study_status(study)

    context = build_auth_context(
        current_user=current_user,
        action="approveStudy",
        resource=study
    )

    authori_error = authorize("approveStudy", context)
    if authori_error:
        return authori_error

    # Derive the open/ongoing windows from the study's declared durations: 
    approved_at = datetime.utcnow()

    study.status = "open"
    study.approved_at = approved_at
    study.open_until = add_months_as_days(approved_at, study.data_collection_months)
    study.ongoing_until = add_months_as_days(study.open_until, study.research_duration_months)

    log_action("study_approved", user_id=current_user.user_id, study_id=study_id)
    db.session.commit()

    return jsonify({
        "message": "study approved",
        "study_id": study.study_id,
        "new_status": study.status,
        "approved_at": study.approved_at.isoformat(),
        "open_until": study.open_until.isoformat(),
        "ongoing_until": study.ongoing_until.isoformat()
    }), 200


@api.route("/admin/studies/<int:study_id>/reject", methods=["POST"])
@jwt_required()
def reject_study(study_id):
    """Reject a study, recording an optional reason on the audit log.
    Authorised via 'rejectStudy'. Sets the study's status to 'rejected'.
    """
    current_user = get_current_user()
    if not current_user: 
        return error ("user not found", 404)

    data = request.get_json() or {}
    reason = data.get("reason", "no reason provided")

    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)

    refresh_study_status(study)
    context = build_auth_context(
        current_user=current_user,
        action="rejectStudy",
        resource=study,
        extra={
            "hasReason": bool(reason)
        }
    )

    authori_error = authorize("rejectStudy", context)
    if authori_error:
        return authori_error
    study.status = "rejected"

    log_action("study_rejected", user_id=current_user.user_id, study_id=study_id,
               details={"reason": reason})
    db.session.commit()

    return jsonify({
        "message": "study rejected",
        "study_id": study.study_id,
        "reason": reason,
        "new_status": study.status
    }), 200



@api.route("/studies/<int:study_id>/status", methods=["GET"])
@jwt_required()
def get_study_status(study_id):
    """Return a study's current lifecycle status and timestamps.
    Calls refresh_study_status first so the response reflects any
    open to ongoing transitions that have just
    elapsed.
    """
    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)

    refresh_study_status(study)

    return jsonify({
        "study_id": study.study_id,
        "status": study.status,
        "approved_at": study.approved_at.isoformat() if study.approved_at else None,
        "open_until": study.open_until.isoformat() if study.open_until else None,
        "ongoing_until": study.ongoing_until.isoformat() if study.ongoing_until else None
    }), 200


@api.route("/studies/<int:study_id>/modify", methods=["PUT"])
@jwt_required()
def modify_study(study_id):
    """Respond to a regulator-raised issue by modifying the study.
    Requires an open issue_id belonging to this study that has not
    already been addressed by a modification. Optionally rewrites the
    study's required/optional field set and/or description; records
    per-field add/remove diffs on the StudyModification. Sends the study
    back to 'pending' for re-approval and marks the issue 'responded'.
    Editor-level collaborators may modify in addition to the creator;
    authorisation is delegated to 'modifyStudy'.
    """
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)

    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)

    refresh_study_status(study)

    data = request.get_json() or {}

    issue_id = data.get("issue_id")

    if not issue_id:
        return error("issue_id is needed", 400)

    issue = StudyIssue.query.get(issue_id)
    if not issue:
        return error("issue not found", 404)
    
    if issue.study_id != study.study_id:
        return error("issue does not belong to this study", 400)
    
    if issue.status != "open":
        return error("this issue is no longer open", 400)

    # An issue can only be addressed by a single modification, further changes need a new issue: 
    existing_modification = StudyModification.query.filter_by(issue_id=issue_id).first()
    if existing_modification:
        return error(
            "a modification already exists for this issue, a new issue must be raised",
            409
        )

    required_field_ids = data.get("required_field_ids", [])
    optional_field_ids = data.get("optional_field_ids", [])
    description = data.get("description")
    comment = data.get("comment") or ""

    has_field_update = bool(required_field_ids) or bool(optional_field_ids)

    if not has_field_update and not description:
        return error("nothing to update", 400)

    if has_field_update and not required_field_ids:
        return error("at least one required field must be specified", 400)

    if has_field_update:
        all_field_ids = list(dict.fromkeys(required_field_ids + optional_field_ids))
        fields = FieldDescription.query.filter(
            FieldDescription.field_id.in_(all_field_ids)
        ).all()
        if len(fields) != len(all_field_ids):
            return error("one or more field_ids do not exist", 400)

    # Editor-level collaborators can modify in addition to the creator: 
    collab = get_study_researcher(study.study_id, current_user.user_id)
    can_edit = (
        study.creator_id == current_user.user_id or
        (collab is not None and collab.access_level == "editor")
    )
    context = build_auth_context(
        current_user=current_user,
        action="modifyStudy",
        resource=study,
        extra={
            "canEdit": can_edit,
        }
    )

    auth_error = authorize("modifyStudy", context)
    if auth_error:
        return auth_error

    modification = StudyModification(
        issue_id=issue_id,
        comment=comment
    )
    db.session.add(modification)
    db.session.flush()

    if has_field_update:
        # Compute add/remove differences vs. the current field set for logging purposes:
        split_fields = split_study_field_ids(study_id)
        previous_required_ids = set(split_fields.get("required_field_ids", []))
        previous_optional_ids = set(split_fields.get("optional_field_ids", []))
        new_required_ids = set(required_field_ids)
        new_optional_ids = set(optional_field_ids)

        removed_required_fields = previous_required_ids - new_required_ids
        added_required_fields = new_required_ids - previous_required_ids

        for field_id in removed_required_fields:
            db.session.add(StudyModificationRequiredField(
                modification_id=modification.modification_id,
                field_id=field_id,
                modification_type="remove"
            ))

        for field_id in added_required_fields:
            db.session.add(StudyModificationRequiredField(
                modification_id=modification.modification_id,
                field_id=field_id,
                modification_type="add"
            ))

        removed_optional_fields = previous_optional_ids - new_optional_ids
        added_optional_fields = new_optional_ids - previous_optional_ids

        for field_id in removed_optional_fields:
            db.session.add(StudyModificationOptionalField(
                modification_id=modification.modification_id,
                field_id=field_id,
                modification_type="remove"
            ))

        for field_id in added_optional_fields:
            db.session.add(StudyModificationOptionalField(
                modification_id=modification.modification_id,
                field_id=field_id,
                modification_type="add"
            ))

        # Rewrite the study's field set:
        StudyRequiredField.query.filter_by(study_id=study_id).delete()

        for field_id in required_field_ids:
            db.session.add(StudyRequiredField(
                study_id=study_id,
                field_id=field_id,
                is_required=True
            ))

        for field_id in optional_field_ids:
            db.session.add(StudyRequiredField(
                study_id=study_id,
                field_id=field_id,
                is_required=False
            ))

    if description:
        study.description = description
    # Send the study back through approval and mark the issue as addressed:
    study.status = "pending"
    study.approved_at = None
    issue.status = "responded"

    log_action("study_modified", user_id=current_user.user_id, study_id=study_id,
               details={"issue_id": issue_id, "modification_id": modification.modification_id})
    db.session.commit()

    return jsonify({
        "message": "study modified and sent for re-approval",
        "study_id": study_id,
        "status": study.status,
        "issue_status": issue.status,
        "modification_id": modification.modification_id
    }), 200

@api.route("/admin/studies/all", methods=["GET"])
@jwt_required()
def list_all_studies():
    """List every non-rejected study, ordered newest first. Regulator only."""
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)

    if current_user.role_id != "regulator":
        return error("only regulators can view all studies", 403)

    studies = (
        Study.query
        .filter(Study.status.in_(["pending", "open", "ongoing", "complete"]))
        .order_by(Study.study_id.desc())
        .all()
    )

    for study in studies:
        refresh_study_status(study)

    return jsonify({"studies": [serialise_study_summary(s) for s in studies]}), 200


@api.route("/admin/studies/pending", methods=["GET"])
@jwt_required()
def list_pending_studies():
    """List every study currently awaiting regulator approval. Regulator only."""
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)

    if current_user.role_id != "regulator":
        return error("only regulators can view pending studies", 403)

    studies = Study.query.filter_by(status="pending").order_by(Study.study_id.desc()).all()

    results = []
    for study in studies:
        refresh_study_status(study)
        # Check status again after refresh in case it transitioned mid-listing: 
        if study.status == "pending":
            results.append(serialise_study_summary(study))

    return jsonify({"studies": results}), 200

@api.route("/admin/studies/<int:study_id>", methods=["GET"])
@jwt_required()
def get_regulator_study_detail(study_id):
    """Return the full regulator-facing study detail, including hydrated fields. Regulator only."""
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)

    if current_user.role_id != "regulator":
        return error("only regulators can view study review details", 403)

    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)

    refresh_study_status(study)

    return jsonify({
        "study": serialise_regulator_study_detail(study)
    }), 200



@api.route("/admin/studies/<int:study_id>/issues", methods=["POST"])
@jwt_required()
def raise_study_issues(study_id):
    """Raise a new issue against a pending study. Regulator only.
    The issue must convey something: either a non-empty comment, a list of
    flagged fields, or both. Every flagged field id must belong to this
    study. Creates the StudyIssue with status 'open' and an associated
    StudyIssueField row per flagged field.
    """
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)

    if current_user.role_id != "regulator":
        return error("only regulators can raise study issues", 403)

    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)

    refresh_study_status(study)

    # Issues are only meaningful while the study is STILL awaiting for approval: 
    if study.status != "pending":
        return error("issues can only be raised for pending studies", 400)

    data = request.get_json() or {}
    comment = data.get("comment")
    flagged_field_ids = data.get("flagged_field_ids", [])

    if not isinstance(flagged_field_ids, list):
        return error("flagged_field_ids must be a list", 400)
    # Every flagged field must actually belong to this study: 
    study_field_ids = split_study_field_ids(study_id)["all_field_ids"]
    invalid_ids = [field_id for field_id in flagged_field_ids if field_id not in study_field_ids]
    if invalid_ids:
        return error(
            {
                "message": "one or more flagged fields do not belong to this study",
                "invalid_field_ids": invalid_ids,
            },
            400,
        )
    # Treat only-whitespace comments as no comment: 
    cleaned_comment = None
    if isinstance(comment, str):
        stripped = comment.strip()
        if stripped:
            cleaned_comment = stripped

    if not cleaned_comment and not flagged_field_ids:
        return error("at least one flagged field or a comment is required", 400)

    issue = StudyIssue(
        study_id=study.study_id,
        regulator_id=current_user.user_id,
        comment=cleaned_comment,
        status="open",
    )
    db.session.add(issue)
    db.session.flush()

    for field_id in flagged_field_ids:
        db.session.add(
            StudyIssueField(
                issue_id=issue.issue_id,
                field_id=field_id,
            )
        )

    log_action("issue_raised", user_id=current_user.user_id, study_id=study_id,
               details={"flagged_field_count": len(flagged_field_ids)})
    db.session.commit()

    return jsonify({
        "message": "study issues raised",
        "issue": serialise_study_issue(issue),
    }), 201

@api.route("/admin/studies/<int:study_id>/issues", methods=["GET"])
@jwt_required()
def list_study_issues(study_id):
    """List every issue raised against a study, newest first.
    Regulators may always view. Researchers may view only if they are the
    study's creator or a collaborator on it. Every other role is denied.
    """
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)

    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)

    if current_user.role_id == "regulator":
        pass
    elif current_user.role_id == "researcher":
        collab = get_study_researcher(study_id, current_user.user_id)
        if study.creator_id != current_user.user_id and not collab:
            return error("not allowed to view issues for this study", 403)
    else:
        return error("not allowed to view study issues", 403)

    issues = (
        StudyIssue.query
        .filter_by(study_id=study_id)
        .order_by(StudyIssue.created_at.desc())
        .all()
    )

    return jsonify({
        "issues": [serialise_study_issue(issue) for issue in issues]
    }), 200



@api.route("/users/<int:user_id>/logs", methods=["GET"])
@jwt_required()
def get_user_logs(user_id):
    """Return the 100 most recent activity-log entries for a user.
    Users may only view their own logs; regulators may view anyone's.
    """
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)

    if current_user.user_id != user_id and current_user.role_id != "regulator":
        return error("not allowed to view this user's logs", 403)

    logs = (
        ActivityLog.query
        .filter_by(user_id=user_id)
        .order_by(ActivityLog.created_at.desc())
        .limit(100)
        .all()
    )

    return jsonify({"logs": [serialise_log_entry(l) for l in logs]}), 200


@api.route("/admin/studies/<int:study_id>", methods=["DELETE"])
@jwt_required()
def delete_study(study_id):
    """Delete a study. Authorised via 'deleteStudy'.
    Logs the deletion (capturing the study name before the row is removed)
    before committing.
    """
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)

    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)

    context = build_auth_context(
        current_user=current_user,
        action="deleteStudy",
        resource=study
    )

    authori_error = authorize("deleteStudy", context)
    if authori_error:
        return authori_error
    # Capture the name before deletion so we can log it: 
    study_name = study.study_name
    log_action("study_deleted", user_id=current_user.user_id, study_id=study_id,
               details={"study_name": study_name})

    db.session.delete(study)
    db.session.commit()

    return jsonify({"message": "study deleted", "study_id": study_id}), 200


@api.route("/admin/studies/<int:study_id>/logs", methods=["GET"])
@jwt_required()
def get_study_logs(study_id):
    """Return every activity-log entry for a study, newest first. Regulator only."""
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)

    if current_user.role_id != "regulator":
        return error("only regulators can view full study logs", 403)

    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)

    logs = (
        ActivityLog.query
        .filter_by(study_id=study_id)
        .order_by(ActivityLog.created_at.desc())
        .all()
    )

    return jsonify({"logs": [serialise_log_entry(l) for l in logs]}), 200



@api.route("/studies/<int:study_id>/researchers", methods=["GET"])
@jwt_required()
def list_study_researchers(study_id):
    """List the research team for a study (creator first, then collaborators).
    Visible to regulators, the study creator, and existing collaborators.
    The creator is always returned with access_level 'owner'.
    """
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)

    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)

    is_related = (
        current_user.role_id == "regulator"
        or study.creator_id == current_user.user_id
        or get_study_researcher(study_id, current_user.user_id) is not None
    )
    if not is_related:
        return error("not allowed to view this study's research team", 403)

    creator = User.query.get(study.creator_id)
    team = []
    if creator:
        team.append({
            "researcher_id": creator.user_id,
            "name": creator.name,
            "email": creator.email,
            "access_level": "owner",
            "added_at": study.creator.created_at.isoformat() if study.creator else None,
            "is_creator": True,
        })

    for sr in study.researchers:
        team.append(serialise_study_researcher(sr, study.creator_id))

    return jsonify({"study_id": study_id, "researchers": team}), 200


@api.route("/studies/<int:study_id>/researchers", methods=["POST"])
@jwt_required()
def add_study_researcher(study_id):
    """Add a researcher to the study's team. Only the study creator may call.
    The invitee is resolved by email and must already be a researcher
    account. The creator is implicitly on the team and cannot be re-added,
    and duplicate collaborator entries are rejected. access_level must be
    'editor' or 'viewer' (defaults to 'viewer').
    """
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)

    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)

    if study.creator_id != current_user.user_id:
        return error("only the study owner can manage the research team", 403)

    data = request.get_json() or {}
    researcher_email = data.get("researcher_email")
    access_level = data.get("access_level", "viewer")

    if not researcher_email:
        return error("researcher_email is required")

    if access_level not in ("editor", "viewer"):
        return error("access_level must be 'editor' or 'viewer'")

    target = User.query.filter_by(email=researcher_email).first()
    if not target:
        return error("no user found with that email", 404)

    if target.role_id != "researcher":
        return error("only researcher accounts can be added to a study team", 400)

    if target.user_id == study.creator_id:
        return error("the study owner is already part of the team", 409)

    existing = get_study_researcher(study_id, target.user_id)
    if existing:
        return error("this researcher is already on the team", 409)

    sr = StudyResearcher(
        study_id=study_id,
        researcher_id=target.user_id,
        access_level=access_level,
        added_at=datetime.utcnow(),
    )
    db.session.add(sr)
    log_action("researcher_added", user_id=current_user.user_id, study_id=study_id,
               details={"added_researcher_id": target.user_id, "access_level": access_level})
    db.session.commit()

    return jsonify({
        "message": "researcher added to study",
        "researcher": serialise_study_researcher(sr, study.creator_id),
    }), 201


@api.route("/studies/<int:study_id>/researchers/<int:researcher_id>", methods=["PUT"])
@jwt_required()
def update_study_researcher(study_id, researcher_id):
    """Change a collaborator's access_level ('editor' or 'viewer').
    Only the study creator may call this.
    """
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)

    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)

    if study.creator_id != current_user.user_id:
        return error("only the study owner can manage the research team", 403)

    sr = get_study_researcher(study_id, researcher_id)
    if not sr:
        return error("researcher not found in this study's team", 404)

    data = request.get_json() or {}
    access_level = data.get("access_level")

    if access_level not in ("editor", "viewer"):
        return error("access_level must be 'editor' or 'viewer'")

    sr.access_level = access_level
    log_action("researcher_access_updated", user_id=current_user.user_id, study_id=study_id,
               details={"researcher_id": researcher_id, "new_access_level": access_level})
    db.session.commit()

    return jsonify({
        "message": "access level updated",
        "researcher": serialise_study_researcher(sr, study.creator_id),
    }), 200


@api.route("/studies/<int:study_id>/researchers/<int:researcher_id>", methods=["DELETE"])
@jwt_required()
def remove_study_researcher(study_id, researcher_id):
    """Remove a collaborator from the study's team. Only the study creator may call."""
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)

    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)

    if study.creator_id != current_user.user_id:
        return error("only the study owner can manage the research team", 403)

    sr = get_study_researcher(study_id, researcher_id)
    if not sr:
        return error("researcher not found in this study's team", 404)

    db.session.delete(sr)
    log_action("researcher_removed", user_id=current_user.user_id, study_id=study_id,
               details={"removed_researcher_id": researcher_id})
    db.session.commit()

    return jsonify({"message": "researcher removed from study"}), 200
