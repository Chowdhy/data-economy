from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import and_
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
def check_policy(action, context):
    if not policy_engine.is_allowed(action, context):
        return error(f"action '{action}' is not allowed under current policies", 403)

def error(message, status=400):
    return jsonify({"error": message}), status


def split_study_field_ids(study_id):
    study_fields = StudyRequiredField.query.filter_by(study_id=study_id).all()
    return {
        "required_field_ids": [row.field_id for row in study_fields if row.is_required],
        "optional_field_ids": [row.field_id for row in study_fields if not row.is_required],
        "all_field_ids": [row.field_id for row in study_fields],
    }

def get_current_user():
    user_id = get_jwt_identity()
    if user_id is None:
        return None
    return User.query.get(int(user_id))

def require_role(*allowed_roles):
    user = get_current_user()
    if not user: 
        return None, error ("user not found", 404)
    if user.role_id not in allowed_roles:
        return None, error("user does not have required role", 403)
    return user, None

@api.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


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


@api.route("/fields", methods=["POST"])
def create_field():
    data = request.get_json() or {}

    field_name = data.get("field_name")
    field_desc = data.get("field_desc")

    if not field_name:
        return error("field_name is required")

    field = FieldDescription(
        field_name=field_name,
        field_desc=field_desc,
    )
    db.session.add(field)
    db.session.commit()

    return jsonify({
        "message": "field created",
        "field": {
            "field_id": field.field_id,
            "field_name": field.field_name,
            "field_desc": field.field_desc,
        }
    }), 201

# Testing token:
@api.route("/fields", methods=["GET"])
@jwt_required()
def list_fields():
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)
    fields = FieldDescription.query.order_by(FieldDescription.field_name.asc()).all()

    return jsonify({
        "fields": [
            {
                "field_id": field.field_id,
                "field_name": field.field_name,
                "field_desc": field.field_desc,
            }
            for field in fields
        ]
    }), 200

@api.route("/studies", methods=["POST"])
@jwt_required()
def create_study():
    current_user, role_error = require_role("researcher")
    if role_error:
        return role_error
    data = request.get_json() or {}

    study_name = data.get("study_name") 
    description = data.get("description")
    duration_months = data.get("duration_months")
    creator_id = data.get("creator_id")
    required_field_ids = data.get("required_field_ids", [])
    optional_field_ids = data.get("optional_field_ids", [])

    if not study_name or not description or creator_id is None or duration_months is None:
        return error("study_name, description, duration_months, and creator_id are required")

    creator = User.query.get(creator_id)
    if not creator:
        return error("creator not found", 404)

    if creator.role_id != "researcher":
        return error("creator must be a researcher", 403)

    if not isinstance(duration_months, int) or duration_months <= 0:
        return error("duration_months must be a positive integer")

    if not isinstance(required_field_ids, list) or not required_field_ids:
        return error("required_field_ids must be a non-empty list")

    if not isinstance(optional_field_ids, list):
        return error("optional_field_ids must be a list")
    all_field_ids = list(dict.fromkeys(required_field_ids + optional_field_ids))

    fields = FieldDescription.query.filter(
        FieldDescription.field_id.in_(all_field_ids)
    ).all()

    if len(fields) != len(all_field_ids):
        return error("one or more field_ids do not exist")

    study = Study(
        study_name=study_name.strip(),
        description=description.strip(),
        duration_months=duration_months,
        creator_id=creator_id,
        status="open",
    )
    db.session.add(study)
    db.session.flush()

    for field_id in required_field_ids:
        db.session.add(StudyRequiredField(
            study_id=study.study_id,
            field_id=field_id,
            is_required=True
        ))

    # optional
    for field_id in optional_field_ids:
        db.session.add(StudyRequiredField(
            study_id=study.study_id,
            field_id=field_id,
            is_required=False
        ))

    db.session.commit()

    return jsonify({
        "message": "study created",
        "study": {
            "study_id": study.study_id,
            "study_name": study.study_name,
            "description": study.description,
            "duration_months": study.duration_months,
            "creator_id": study.creator_id,
            "status": study.status,
            "required_field_ids": required_field_ids,
            "optional_field_ids": optional_field_ids
        }
    }), 201


@api.route("/studies/<int:study_id>/join", methods=["POST"])
@jwt_required()
def join_study(study_id):
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)
    
    if current_user.role_id != "participant":
        return error("only participants can join studies", 403)
    
    #data = request.get_json() or {}

    # Here anyone can pretend to be anyone: 
    #participant_id = data.get("participant_id")

    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)
    
    context = {"studyStatus": study.status}
    policy_error = check_policy("joinStudy", context)
    if policy_error:
        return policy_error
    
    existing_link = StudyParticipant.query.filter_by(
        study_id=study_id,
        participant_id=current_user.user_id,
    ).first()

    if existing_link:
        return error("participant is already in this study", 409)

    link = StudyParticipant(
        study_id=study_id,
        participant_id=current_user.user_id,
        consent_all_fields=False,
    )
    db.session.add(link)
    required_fields = StudyRequiredField.query.filter_by(
        study_id=study_id,
        is_required=True
    ).all()
    for required in required_fields:
        db.session.add(StudyParticipantConsentedField(
            study_id=study_id,
            participant_id=current_user.user_id,
            field_id=required.field_id,
        ))

    db.session.commit()

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


@api.route("/studies/<int:study_id>/withdraw", methods=["POST"])
@jwt_required()
def withdraw_from_study(study_id):
    current_user = get_current_user()

    if not current_user:
        return error("user not found", 404)

    if current_user.role_id != "participant":
        return error("only participants can withdraw", 403)

    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)

    # 🔒 Optional: enforce only during open phase
    if study.status != "open":
        return error("cannot withdraw after study is closed", 403)

    membership = StudyParticipant.query.filter_by(
        study_id=study_id,
        participant_id=current_user.user_id,
    ).first()

    if not membership:
        return error("not enrolled in this study", 404)

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

@api.route("/studies/<int:study_id>/consent/modify", methods=["POST"])
def modify_consent(study_id):
    current_user = get_current_user()
    if not current_user:
        return error("user not found", 404)
    if current_user.role_id != "participant":
        return error("only participants can modify consent", 403)

    data = request.get_json() or {}    
    consented_field_ids = data.get("consented_field_ids", [])

    if not isinstance(consented_field_ids, list):
        return error("consented_field_ids must be a list")

    membership = StudyParticipant.query.filter_by(
        study_id=study_id,
        participant_id=current_user.user_id,
    ).first()

    if not membership:
        return error("participant is not enrolled in this study", 404)

    study = Study.query.get(study_id)
    if not study: 
        return error("study not found", 404)
   
    # Get all valid fields:
    study_fields = StudyRequiredField.query.filter_by(study_id=study_id).all()
    all_field_ids = {f.field_id for f in study_fields}

    invalid = [fid for fid in consented_field_ids if fid not in all_field_ids]
    if invalid:
        return error(f"invalid field_ids: {invalid}")

    # Required fields check: 
    required_fields = StudyRequiredField.query.filter_by(
        study_id=study_id,
        is_required=True
    ).all()
    required_ids = {f.field_id for f in required_fields}
    # First check, can they modify at all or is the study closed: 
    context = {
        "studyStatus": study.status,
        "requiredFieldsProvided": required_ids.issubset(set(consented_field_ids))
    }

    policy_error = check_policy("modifyConsent", context)
    if policy_error:
        return policy_error
    
    # Only if modifications are allowed: 
    if not required_ids.issubset(set(consented_field_ids)):
        db.session.delete(membership)
        db.session.commit()

        return jsonify({
            "message": "withdrawn from study due to removing required fields",
        }), 200
    
    # Update consent ONLY if valid
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




@api.route("/participants/<int:participant_id>/answers", methods=["POST"])
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


@api.route("/participants/<int:participant_id>/answers", methods=["GET"])
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

@api.route("/participants/<int:participant_id>/studies", methods=["GET"])
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
            "duration_months": study.duration_months,
            "status": study.status,
            "joined_at": membership.joined_at.isoformat(),
            "consent_all_fields": membership.consent_all_fields,
            "consented_field_ids": consented_field_ids,
            "required_field_ids": study_fields["required_field_ids"],
            "optional_field_ids": study_fields["optional_field_ids"],
        })

    return jsonify({
        "participant_id": participant_id,
        "studies": results,
    }), 200


@api.route("/participants/<int:participant_id>/available-studies", methods=["GET"])
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

    studies = Study.query.filter_by(status="open").all()

    results = []
    for study in studies:
        if study.study_id in joined_study_ids:
            continue

        study_fields = split_study_field_ids(study.study_id)

        results.append({
            "study_id": study.study_id,
            "study_name": study.study_name,
            "description": study.description,
            "duration_months": study.duration_months,
            "status": study.status,
            "required_field_ids": study_fields["required_field_ids"],
            "optional_field_ids": study_fields["optional_field_ids"],
        })

    return jsonify({
        "participant_id": participant_id,
        "studies": results,
    }), 200


@api.route("/researchers/<int:researcher_id>/studies", methods=["GET"])
def list_researcher_studies(researcher_id):
    researcher = User.query.get(researcher_id)
    if not researcher:
        return error("researcher not found", 404)

    if researcher.role_id != "researcher":
        return error("user is not a researcher", 403)

    studies = Study.query.filter_by(creator_id=researcher_id).all()

    results = []
    for study in studies:
        study_fields = split_study_field_ids(study.study_id)
        participant_count = StudyParticipant.query.filter_by(
            study_id=study.study_id
        ).count()

        results.append({
            "study_id": study.study_id,
            "study_name": study.study_name,
            "description": study.description,
            "duration_months": study.duration_months,
            "status": study.status,
            "required_field_ids": study_fields["required_field_ids"],
            "optional_field_ids": study_fields["optional_field_ids"],
            "participant_count": participant_count, 
        })

    return jsonify({
        "researcher_id": researcher_id,
        "studies": results,
    }), 200


@api.route("/studies/<int:study_id>", methods=["GET"])
def get_study(study_id):
    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)

    study_fields = split_study_field_ids(study_id)
    participant_count = StudyParticipant.query.filter_by(study_id=study_id).count()

    return jsonify({
        "study": {
            "study_id": study.study_id,
            "study_name": study.study_name,
            "description": study.description,
            "duration_months": study.duration_months,
            "status": study.status,
            "required_field_ids": study_fields["required_field_ids"],
            "optional_field_ids": study_fields["optional_field_ids"],
            "participant_count": participant_count,
        }
    }), 200


@api.route("/studies/<int:study_id>/data", methods=["GET"])
def get_study_data(study_id):
    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)
    
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
            "duration_months": study.duration_months,
            "status": study.status,
        },
        "participants": grouped,
    }), 200

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
@api.route("/admin/users/<int:user_id>/approve", methods=["POST"])
def approve_user(user_id):
    data = request.get_json() or {}
    regulator_id = data.get("regulator_id")

    regulator = User.query.get(regulator_id) # not secure yet, will add more authentication later
    if not regulator or regulator.role_id != "regulator":
        return error("only regulators can approve users", 403)

    user = User.query.get(user_id)
    if not user:
        return error("user not found", 404)

    if not user.requested_role:
        return error("user has no pending role request")

    user.role_id = user.requested_role
    user.requested_role = None
    user.is_approved = True

    db.session.commit()

    return jsonify({
        "message": "user approved",
        "user_id": user.user_id,
        "new_role": user.role_id
    }), 200

# Testing endpoint for status: 
@api.route("/studies/<int:study_id>/status", methods=["PATCH"])
def update_study_status(study_id):
    data = request.get_json() or {}
    new_status = data.get("status")

    if new_status not in {"open", "ongoing", "complete"}:
        return error("invalid status")

    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)

    study.status = new_status
    db.session.commit()

    return jsonify({
        "message": "status updated",
        "study_id": study_id,
        "status": study.status
    }), 200
