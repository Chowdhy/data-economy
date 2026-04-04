from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import and_
from datetime import datetime, timedelta
from policies.policy_engine import get_policy_engine
from .extensions import db
from .models import (
    User,
    Study,
    FieldDescription,
    StudyRequiredField,
    StudyParticipant,
    StudyParticipantConsentedField,
    ParticipantAnswer,
)

api = Blueprint("api", __name__)
policy_engine = get_policy_engine()

# Helper functions:
# check_policy will return an error response if the action is not allowed under current policies, otherwise returns None (will remove):
def check_policy(action, context):
    if not policy_engine.is_allowed(action, context):
        return error(f"action '{action}' is not allowed under current policies", 403)
# Main autorhization entry point for all protected endpoints: 
def authorize(action, context):
    decision = policy_engine.evaluate(action, context)
    if not decision.allowed:
        return error({
            "message": f"action '{action}' is not allowed",
            "failures": decision.failures,
            "matched_permissions": decision.matched_permissions,
            "matched_prohibitions": decision.matched_prohibitions,
            "duties": decision.duties,
        }, 403)
    return None
# Standardized error response function:
def error(message, status=400):
    return jsonify({"error": message}), status
# Utility function to split required vs optional field ids for a study:
def split_study_field_ids(study_id):
    study_fields = StudyRequiredField.query.filter_by(study_id=study_id).all()
    return {
        "required_field_ids": [row.field_id for row in study_fields if row.is_required],
        "optional_field_ids": [row.field_id for row in study_fields if not row.is_required],
        "all_field_ids": [row.field_id for row in study_fields],
    }
# Get current user based on JWT identity:
def get_current_user():
    user_id = get_jwt_identity()
    if user_id is None:
        return None
    return User.query.get(int(user_id))
# Shared context builder for policy evaluation
# This function constructs a context dictionary that includes information about the current user, the action being performed, the resource involved, any target user (for actions involving another user), membership status (e.g., whether the user is enrolled in a study), and any extra context needed for specific policy checks. This standardized context can then be used across different policy evaluations to determine if an action is allowed.
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
            "isApproved": getattr(current_user, "is_approved", None),
            "isActive": getattr(current_user, "is_active", None),
        },
        "resource": {
            "studyId": getattr(resource, "study_id", None),
            "creatorId": getattr(resource, "creator_id", None),
            "status": getattr(resource, "status", None),
            "hasPendingRoleRequest": bool(getattr(target_user, "requested_role", None)) if target_user else None,
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
# Role check helper (will remove):
def require_role(*allowed_roles):
    user = get_current_user()
    if not user: 
        return None, error ("user not found", 404)
    if user.role_id not in allowed_roles:
        return None, error("user does not have required role", 403)
    return user, None
# Utility function to add months to a datetime (approximate as 30 days per month):
def add_months_as_days(start_dt, months):
    return start_dt + timedelta(days=30 * months)
# Utility function to refresh study status based on current time and study timelines:
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

# Health check: 
@api.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200

# Creating a new user: 
# Current functionality: 
# - Get name, email, password, and requested_role
# - Validate required fields
# - Ensure role is either participant or researcher
# - Check email uniqueness
# - Hash password before storing it 
# - Assign: participant = approved, researcher = pending approval
# - Save user 
# - Return user info
# Future functionality: 
@api.route("/users", methods=["POST"])
def create_user():
    data = request.get_json() or {}

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    requested_role = data.get("role_id", "participant")


    if not all([name, email, password]):
        return error("name, email, and password are required")

    if requested_role not in {"participant", "researcher"}:
        return error("can only request role of 'participant' or 'researcher' at signup")
    
    existing = User.query.filter_by(email=email).first()
    if existing:
        return error("email already exists", 409)
    
    # Hash plain text password: 
    hashed_password = generate_password_hash(password)

    if requested_role == "participant":
        role_id = "participant"
        is_approved = True
    else:
        role_id = "participant" # still partipant until approved by regulator
        is_approved = False


    user = User(
        name=name,
        email=email,
        password_hash=hashed_password,
        role_id=role_id,
        requested_role=requested_role if requested_role!= "participant" else None,
        is_approved=is_approved
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({
        "message": "user created",
        "user": {
            "user_id": user.user_id,
            "email": user.email,
            "role_id": user.role_id,
            "requested_role": user.requested_role,
            "is_approved": user.is_approved
        }
    }), 201


# Current functionality: 
# - Require JWT and role check for researcher
# - Get field_name and field_desc from request
# - Validate field_name 
# - Check field name uniqueness
# - Create field with created_by 
# - Save field and return field info
# Future functionality: 
# Should researchers be able to create new fields? Or should they be able somehow pick from a list of predefined fields. 
# Trying to make this more polic-engine based. 
@api.route("/fields", methods=["POST"])
@jwt_required()
def create_field():
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)

    data = request.get_json() or {}

    field_name = data.get("field_name")
    field_desc = data.get("field_desc")

    if not field_name:
        return error("field_name is required")
    
    context = build_auth_context(
        current_user=current_user,
        action="createField"
    )

    authori_error = authorize("createField", context)
    if authori_error:
        return authori_error
    # Prevent duplicates: 
    existing = FieldDescription.query.filter_by(field_name=field_name).first()
    if existing:
        return error("field_name already exists", 409)

    field = FieldDescription(
        field_name=field_name,
        field_desc=field_desc,
        created_by=current_user.user_id
    )
    db.session.add(field)
    db.session.commit()

    return jsonify({
        "message": "field created by researcher",
        "field": {
            "field_id": field.field_id,
            "field_name": field.field_name,
            "field_desc": field.field_desc,
        }
    }), 201

# Current functionality:
# - Require JWT and role check for researcher
# - List all fields with their descriptions
# - Return list  
@api.route("/fields", methods=["GET"])
@jwt_required()
def list_all_fields():
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)
    
    context = build_auth_context(
        current_user=current_user,
        action="listFields"
    )

    authori_error = authorize("listFields", context)
    if authori_error:
        return authori_error

    fields = FieldDescription.query.all()

    return jsonify({
        "fields": [
            {
                "field_id": f.field_id,
                "field_name": f.field_name,
                "field_desc": f.field_desc
            }
            for f in fields
        ]
    }), 200



''' @api.route("/studies/<int:study_id>/fields", methods=["GET"])
@jwt_required()
def get_study_fields(study_id):
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)

    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)

    # Policy context: 
    context = {"studyStatus": study.status} # pending, open, ongoing, complete

    # Regulator can only see fields for pending status they have not approved yet:
    if current_user.role_id == "regulator":
        policy_error = check_policy("viewFieldsRegulator", context)
        if policy_error:
            return policy_error

        fields = db.session.query(FieldDescription).join(
            StudyRequiredField
        ).filter(
            StudyRequiredField.study_id == study_id
        ).all()

    # Researcher can only see fields for their own studies:
    elif current_user.role_id == "researcher":
        if study.creator_id != current_user.user_id:
            return error("not your study", 403)

        fields = db.session.query(FieldDescription).join(
            StudyRequiredField
        ).filter(
            StudyRequiredField.study_id == study_id
        ).all()

    # Participants can only see fields when the study is open:
    else:
        policy_error = check_policy("viewFieldsParticipant", context)
        if policy_error:
            return policy_error

        # Must be enrolled:
        membership = StudyParticipant.query.filter_by(
            study_id=study_id,
            participant_id=current_user.user_id
        ).first()

        if not membership:
            return error("not enrolled in this study", 403)

        fields = db.session.query(FieldDescription).join(
            StudyRequiredField
        ).filter(
            StudyRequiredField.study_id == study_id
        ).all()

    return jsonify({
        "study_id": study_id,
        "fields": [
            {
                "field_id": f.field_id,
                "field_name": f.field_name,
                "field_desc": f.field_desc
            }
            for f in fields
        ]
    }), 200 '''

# Current functionality: 
# - Require JWT and role check for researcher
# - Get study data and field IDs
# - Validate inputs
# - Validate field_ids exist
# - Enforce max active studies per researcher (I will move this to the policy engine later)
# - Create study with pending status
# - Insert required vs optional field links
# - Return study info
# Future functionality: 
# - Should researchers be able to create new fields? Or should they be able somehow pick from a list of predefined fields.
# - More policy engine-based checks 
@api.route("/studies", methods=["POST"])
@jwt_required()
def create_study():
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
        Study.status.in_(["pending", "open", "ongoing"]) # shall I add complete? 
    ).count()

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

# Current functionality: 
# - Require JWT and role check for participant
# - Get study by ID and validate it exists
# - Policy check that the study is open for joining
# - Check already joined
# - Create StudyParticipant link with consent_all_fields=False by default
# - Auto-consent to required fields (maybe this is wrong?)
# - Return success message
# Future functionality:
# - More policy engine-based checks (max active pending studies?)
# - Should participants be auto-consented to required fields upon joining? Or should they have to explicitly consent to each field (with required fields enforced at the policy level)?
@api.route("/studies/<int:study_id>/join", methods=["POST"])
@jwt_required()
def join_study(study_id):
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)
    
    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)
    
    refresh_study_status(study)
    
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
    db.session.commit()
    # Remove auto consent logic:
    ''' required_fields = StudyRequiredField.query.filter_by(
        study_id=study_id,
        is_required=True
    ).all()
    for required in required_fields:
        db.session.add(StudyParticipantConsentedField(
            study_id=study_id,
            participant_id=current_user.user_id,
            field_id=required.field_id,
        )) '''

    return jsonify({
        "message": "participant joined study and consented to all required fields by default",
        "study_id": study_id,
        "participant_id": current_user.user_id,
    }), 201


''' @api.route("/studies/<int:study_id>/consent/withdraw", methods=["POST"])
def withdraw_consent_fields(study_id):
    data = request.get_json() or {}

    participant_id = data.get("participant_id")
    field_ids = data.get("field_ids", [])

    if participant_id is None:
        return error("participant_id is required")
    if not isinstance(field_ids, list) or not field_ids:
        return error("field_ids must be a non-empty list")

    membership = StudyParticipant.query.filter_by(
        study_id=study_id,
        participant_id=participant_id,
    ).first()

    if not membership:
        return error("participant is not enrolled in this study", 404)

    consent_rows = StudyParticipantConsentedField.query.filter(
        StudyParticipantConsentedField.study_id == study_id,
        StudyParticipantConsentedField.participant_id == participant_id,
        StudyParticipantConsentedField.field_id.in_(field_ids),
    ).all()

    found_field_ids = {row.field_id for row in consent_rows}
    missing = [fid for fid in field_ids if fid not in found_field_ids]
    if missing:
        return error(f"these fields are not currently consented and cannot be withdrawn: {missing}")

    for row in consent_rows:
        db.session.delete(row)

    membership.consent_all_fields = False
    db.session.commit()

    remaining_count = StudyParticipantConsentedField.query.filter_by(
        study_id=study_id,
        participant_id=participant_id,
    ).count()

    return jsonify({
        "message": "consent withdrawn for selected fields",
        "study_id": study_id,
        "participant_id": participant_id,
        "withdrawn_field_ids": field_ids,
        "remaining_consented_field_count": remaining_count,
    }), 200 '''


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
    db.session.commit()

    return jsonify({
        "message": "withdrawn from study",
        "study_id": study_id,
        "participant_id": current_user.user_id,
    }), 200

''' @api.route("/studies/<int:study_id>/consent/regrant", methods=["POST"])
def regrant_consent_fields(study_id):
    data = request.get_json() or {}

    participant_id = data.get("participant_id")
    field_ids = data.get("field_ids", [])

    if participant_id is None:
        return error("participant_id is required")
    if not isinstance(field_ids, list) or not field_ids:
        return error("field_ids must be a non-empty list")

    membership = StudyParticipant.query.filter_by(
        study_id=study_id,
        participant_id=participant_id,
    ).first()

    if not membership:
        return error("participant is not enrolled in this study", 404)

    required_field_rows = StudyRequiredField.query.filter_by(study_id=study_id).all()
    required_field_ids = {row.field_id for row in required_field_rows}
    required_count = len(required_field_ids)

    invalid = [fid for fid in field_ids if fid not in required_field_ids]
    if invalid:
        return error(
            f"these fields are not required by this study and cannot be consented here: {invalid}"
        )

    existing_consented = StudyParticipantConsentedField.query.filter(
        StudyParticipantConsentedField.study_id == study_id,
        StudyParticipantConsentedField.participant_id == participant_id,
        StudyParticipantConsentedField.field_id.in_(field_ids),
    ).all()

    existing_ids = {row.field_id for row in existing_consented}
    to_add = [fid for fid in field_ids if fid not in existing_ids]

    for field_id in to_add:
        db.session.add(
            StudyParticipantConsentedField(
                study_id=study_id,
                participant_id=participant_id,
                field_id=field_id,
            )
        )

    db.session.flush()

    current_consented_count = StudyParticipantConsentedField.query.filter_by(
        study_id=study_id,
        participant_id=participant_id,
    ).count()

    membership.consent_all_fields = (current_consented_count == required_count)

    db.session.commit()

    return jsonify({
        "message": "consent regranted for selected fields",
        "study_id": study_id,
        "participant_id": participant_id,
        "added_field_ids": to_add,
        "already_consented_field_ids": list(existing_ids),
        "consent_all_fields": membership.consent_all_fields,
    }), 200 '''


# Current functionality:
# - Get current use
# - Ensure participant role
# - Get study by ID and validate it exists
# - Get consented_field_ids from request
# - Validate consented_field_ids is a list
# - Get study and refresh status
# - Validate the field_ids exist for the study
# - Policy check: studyStatus and whether required fields are included in the consented_field_ids
# - If required fields are missing, delete membership automatically
# - Else: delete old consent, insert new consent, update consent_all_fields if all fields are consented, and return success message
# Future functionality:
# - NO JWT need to implement that 
@api.route("/studies/<int:study_id>/consent/modify", methods=["POST"])
@jwt_required()
def modify_consent(study_id):
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

   
    # Get all valid fields:
    study_fields = StudyRequiredField.query.filter_by(study_id=study_id).all()
    all_field_ids = {f.field_id for f in study_fields}
    required_ids = {f.field_id for f in study_fields if f.is_required}

    invalid = [fid for fid in consented_field_ids if fid not in all_field_ids]
    if invalid:
        return error(f"invalid field_ids: {invalid}")
    
    context = build_auth_context(
        current_user=current_user,
        action="modifyConsent",
        resource=study,
        membership=membership,
        extra={
            "requiredFieldsProvided": required_ids.issubset(set(consented_field_ids))
        }
    )

    authori_error = authorize("modifyConsent", context)
    if authori_error:
        return authori_error

    # Update consent ONLY if valid:
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

    membership.consent_all_fields = (len(consented_field_ids) == len(all_field_ids))
    db.session.commit()

    return jsonify({
        "message": "consent updated",
        "consented_field_ids": consented_field_ids,
    }), 200



# Current functionality (for participants): 
# - Get participant answers (check needs to change to be updated with everything else)
# - Validate list 
# - Check participant exists and is a participant
# - For each answer: validate field_name, check field exists, then upsert answer
# - Return success message with list of created vs updated answers
@api.route("/participants/<int:participant_id>/answers", methods=["POST"])
@jwt_required()
def upsert_participant_answers(participant_id):
    data = request.get_json() or {}
    answers = data.get("answers", [])

    if not isinstance(answers, list) or not answers:
        return error("answers must be a non-empty list")

    participant = User.query.get(participant_id)
    if not participant:
        return error("participant not found", 404)

    if participant.role_id != "participant":
        return error("user is not a participant", 403)

    updated = []

    for item in answers:
        field_name = item.get("field_name")
        answer_value = item.get("answer")

        if not field_name:
            return error("each answer must include field_name")

        field = FieldDescription.query.filter_by(field_name=field_name).first()
        if not field:
            return error(f"field_name '{field_name}' does not exist")

        existing = ParticipantAnswer.query.filter_by(
            participant_id=participant_id,
            field_id=field.field_id,
        ).first()

        if existing:
            existing.answer = answer_value
            updated.append({
                "field_name": field.field_name,
                "action": "updated"
            })
        else:
            new_answer = ParticipantAnswer(
                participant_id=participant_id,
                field_id=field.field_id,
                answer=answer_value,
            )
            db.session.add(new_answer)
            updated.append({
                "field_name": field.field_name,
                "action": "created"
            })

    db.session.commit()

    return jsonify({
        "message": "answers saved",
        "participant_id": participant_id,
        "results": updated,
    }), 200


# Current functionality:
# - Get participant answers (check for role needs to be updated with the updated tokens)
# - Check participant exists and is a participant
# - Fetch all fields and left join to participant answers to return list of field_name, field_desc, and answer (if exists) for each field
# - Return list of answers with field descriptions
@api.route("/participants/<int:participant_id>/answers", methods=["GET"])
@jwt_required()
def get_participant_answers(participant_id):
    participant = User.query.get(participant_id)
    if not participant:
        return error("participant not found", 404)

    if participant.role_id != "participant":
        return error("user is not a participant", 403)

    fields = FieldDescription.query.all()

    results = []

    for field in fields:
        existing = ParticipantAnswer.query.filter_by(
            participant_id=participant_id,
            field_id=field.field_id,
        ).first()

        results.append({
            "field_name": field.field_name,
            "field_description": field.field_desc,
            "answer": existing.answer if existing else ""
        })

    return jsonify({
        "participant_id": participant_id,
        "answers": results,
    }), 200


# Current functionality:
# - Get participant studies
# - Check participant exists and is a participant (check needs to be updated based on the JWT tokens added to the functionality)
# - For each study, refresh study status, get consented field IDs for the participant, split required vs optional field IDs, and return study info along with consent details
# - Return 
# Future functionality: 
# - Should the participants of a study be notified when a study changes statuses? 
@api.route("/participants/<int:participant_id>/studies", methods=["GET"])
@jwt_required()
def list_participant_studies(participant_id):
    participant = User.query.get(participant_id)
    if not participant:
        return error("participant not found", 404)

    if participant.role_id != "participant":
        return error("user is not a participant", 403)

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
            "optional_field_ids": study_fields["optional_field_ids"],
            "data_collection_months": study.data_collection_months,
            "research_duration_months": study.research_duration_months,
            "approved_at": study.approved_at.isoformat() if study.approved_at else None,
            "open_until": study.open_until.isoformat() if study.open_until else None,
            "ongoing_until": study.ongoing_until.isoformat() if study.ongoing_until else None
        })

    return jsonify({
        "participant_id": participant_id,
        "studies": results,
    }), 200


# Current functionality:
# - Validate participant exists and is a participant (check needs to be updated based on the JWT tokens added to the functionality)
# - Fetch all studies, refresh their statuses, and return info for studies that are currently open along with required vs optional field splits
# Future functionality:
# - More policy engine-based checks 
@api.route("/participants/<int:participant_id>/available-studies", methods=["GET"])
@jwt_required()
def list_available_studies(participant_id):
    participant = User.query.get(participant_id)
    if not participant:
        return error("participant not found", 404)

    if participant.role_id != "participant":
        return error("user is not a participant", 403)

    joined_study_ids = {
        row.study_id
        for row in StudyParticipant.query.filter_by(participant_id=participant_id).all()
    }

    studies = Study.query.all()

    results = []
    for study in studies:
        refresh_study_status(study)
        if study.status!= "open":
            continue

        study_fields = split_study_field_ids(study.study_id)

        results.append({
            "study_id": study.study_id,
            "study_name": study.study_name,
            "description": study.description,
            "data_collection_months": study.data_collection_months,
            "research_duration_months": study.research_duration_months,
            "approved_at": study.approved_at.isoformat() if study.approved_at else None,
            "open_until": study.open_until.isoformat() if study.open_until else None,
            "ongoing_until": study.ongoing_until.isoformat() if study.ongoing_until else None,
            "status": study.status,
            "required_field_ids": study_fields["required_field_ids"],
            "optional_field_ids": study_fields["optional_field_ids"],
        })

    return jsonify({
        "participant_id": participant_id,
        "studies": results,
    }), 200


# Current functionality: 
# - Validate researcher exists and is a researcher (check needs to be updated based on the JWT tokens added to the functionality)
# - Fetch all studies created by the researcher, refresh their statuses, and return study info along with required vs optional field splits and participant counts
@api.route("/researchers/<int:researcher_id>/studies", methods=["GET"])
@jwt_required()
def list_researcher_studies(researcher_id):
    researcher = User.query.get(researcher_id)
    if not researcher:
        return error("researcher not found", 404)

    if researcher.role_id != "researcher":
        return error("user is not a researcher", 403)

    studies = Study.query.filter_by(creator_id=researcher_id).all()

    results = []
    for study in studies:
        refresh_study_status(study)
        study_fields = split_study_field_ids(study.study_id)
        participant_count = StudyParticipant.query.filter_by(
            study_id=study.study_id
        ).count()

        results.append({
            "study_id": study.study_id,
            "study_name": study.study_name,
            "description": study.description,
            "data_collection_months": study.data_collection_months,
            "research_duration_months": study.research_duration_months,
            "approved_at": study.approved_at.isoformat() if study.approved_at else None,
            "open_until": study.open_until.isoformat() if study.open_until else None,
            "ongoing_until": study.ongoing_until.isoformat() if study.ongoing_until else None,
            "status": study.status,
            "required_field_ids": study_fields["required_field_ids"],
            "optional_field_ids": study_fields["optional_field_ids"],
            "participant_count": participant_count, 
        })

    return jsonify({
        "researcher_id": researcher_id,
        "studies": results,
    }), 200


# Do we need this? 
@api.route("/studies/<int:study_id>", methods=["GET"])
def get_study(study_id):
    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)
    
    refresh_study_status(study)


    study_fields = split_study_field_ids(study_id)
    participant_count = StudyParticipant.query.filter_by(study_id=study_id).count()

    return jsonify({
        "study": {
            "study_id": study.study_id,
            "study_name": study.study_name,
            "description": study.description,
            "data_collection_months": study.data_collection_months,
            "research_duration_months": study.research_duration_months,
            "approved_at": study.approved_at.isoformat() if study.approved_at else None,
            "open_until": study.open_until.isoformat() if study.open_until else None,
            "ongoing_until": study.ongoing_until.isoformat() if study.ongoing_until else None,
            "status": study.status,
            "required_field_ids": study_fields["required_field_ids"],
            "optional_field_ids": study_fields["optional_field_ids"],
            "participant_count": participant_count,
        }
    }), 200

# Do we need this? (it doesn't really role checking)
# IT NEEDS TO BE ONLY FOR RESEARCHERS WHEN THE STUDY IS ONGOING AND WE NEED ANONYMISATION ASAP (CHECK DATA PRIV LECTURES)
@api.route("/researchers/<int:researcher_id>/studies/<int:study_id>/data", methods=["GET"])
def get_study_data(study_id):
    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)
    refresh_study_status(study)
    context = {"studyStatus": study.status}
    policy_error = check_policy("accessData", context)
    if policy_error:
        return policy_error

    rows = db.session.query(
        StudyParticipantConsentedField.participant_id,
        StudyParticipantConsentedField.field_id,
        FieldDescription.field_name,
        FieldDescription.field_desc,
        ParticipantAnswer.answer,
    ).join(
        FieldDescription,
        FieldDescription.field_id == StudyParticipantConsentedField.field_id,
    ).outerjoin(
        ParticipantAnswer,
        and_(
            ParticipantAnswer.participant_id == StudyParticipantConsentedField.participant_id,
            ParticipantAnswer.field_id == StudyParticipantConsentedField.field_id,
        )
    ).filter(
        StudyParticipantConsentedField.study_id == study_id
    ).all()

    grouped = {}
    for row in rows:
        participant_key = str(row.participant_id)
        grouped.setdefault(participant_key, [])
        grouped[participant_key].append({
            "field_id": row.field_id,
            "field_name": row.field_name,
            "field_desc": row.field_desc,
            "answer": row.answer,
        })

    return jsonify({
        "study": {
            "study_id": study.study_id,
            "study_name": study.study_name,
            "description": study.description,
            "data_collection_months": study.data_collection_months,
            "research_duration_months": study.research_duration_months,
            "approved_at": study.approved_at.isoformat() if study.approved_at else None,
            "open_until": study.open_until.isoformat() if study.open_until else None,
            "ongoing_until": study.ongoing_until.isoformat() if study.ongoing_until else None,
            "status": study.status,
        },
        "participants": grouped,
    }), 200


# Current functionality: 
# - Get email and password from request
# - Validate they exist
# - Find user 
# - Check password hash
# - Block unapproved researcher requests
# - Generate JWT token with role_id and email as identity
@api.route("/login", methods=["POST"])
def login():
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
    # Block unapproved researcher requests: 
    if user.requested_role == "researcher" and not user.is_approved:
        return error("researcher account pending approval by regulator", 403)
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

# NEW Endpoint: add regulator approval
# Current functionality: 
# - Get user_id from URL and regulator_id from request body
# - Validate regulator_id belongs to a regulator user
# - Validate user_id belongs to a user with a pending role request
# - Update user's role_id to requested_role, set requested_role to None, and set is_approved to True
# Future functionality:
# - Make this more policy-engine based. 
# - Currently trying to do that :), current changes: added jwt_required, removed regulator_id, regulator now comes from JWT, authorization now goes through authorize function with an "approveUserRole" action and context that includes the current_user and target_user. 
@api.route("/admin/users/<int:user_id>/approve", methods=["POST"])
@jwt_required()
def approve_user(user_id):
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)
    
    target_user = User.query.get(user_id)
    if not target_user:
        return error("target user not found", 404)
    
    context = build_auth_context(current_user = current_user, action= "approveUserRole", target_user = target_user)
    authori_error = authorize("approveUserRole", context)
    if authori_error:
        return authori_error
   

    target_user.role_id = target_user.requested_role
    target_user.requested_role = None
    target_user.is_approved = True

    db.session.commit()

    return jsonify({
        "message": "user approved",
        "user_id": target_user.user_id,
        "new_role": target_user.role_id
    }), 200

# Approval and rejection endpoints by regulator for pending studies: 
# Current functionality:
# - Get study_id from URL and regulator_id from request body
# - Validate regulator_id belongs to a regulator user
# - Validate study_id belongs to a pending study
# - For approval: update study status to open, set approved_at to now, and calculate
# - open_until and ongoing_until based on approved_at and the study's data_collection_months and research_duration_months
# - For rejection: update study status to rejected
# Future functionality:
# - Make this more policy-engine based.
# - Currently trying to do that, changes: removed the require_role call, removed manual auth-style logic from the route, moved regulator and pending study logic into policy eval, kept the actual DB update as business logic.
@api.route("/admin/studies/<int:study_id>/approve", methods=["POST"])
@jwt_required()
def approve_study(study_id):
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
    approved_at = datetime.utcnow()

    study.status = "open"
    study.approved_at = approved_at
    study.open_until = add_months_as_days(approved_at, study.data_collection_months)
    study.ongoing_until = add_months_as_days(study.open_until, study.research_duration_months)

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

    db.session.commit()

    return jsonify({
        "message": "study rejected",
        "study_id": study.study_id,
        "reason": reason,
        "new_status": study.status
    }), 200


# Current functionality:
# - Get study_id from URL
# - Validate study_id belongs to a study
# - Refresh study status based on current time and the study's approved_at, open_until, and ongoing_until timestamps
# - Return study status along with approved_at, open_until, and ongoing_until timestamps for frontend
@api.route("/studies/<int:study_id>/status", methods=["GET"])
@jwt_required()
def get_study_status(study_id):
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