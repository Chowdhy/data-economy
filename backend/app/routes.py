from flask import Blueprint, jsonify, request
from sqlalchemy import and_

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


def error(message, status=400):
    return jsonify({"error": message}), status


@api.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


@api.route("/users", methods=["POST"])
def create_user():
    data = request.get_json() or {}

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    role_id = data.get("role_id")

    if not all([name, email, password, role_id]):
        return error("name, email, password, and role_id are required")

    if role_id not in {"participant", "researcher"}:
        return error("role_id must be 'participant' or 'researcher'")

    existing = User.query.filter_by(email=email).first()
    if existing:
        return error("email already exists", 409)

    user = User(
        name=name,
        email=email,
        password_hash=password,
        role_id=role_id,
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({
        "message": "user created",
        "user": {
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "role_id": user.role_id,
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

@api.route("/fields", methods=["GET"])
def list_fields():
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
def create_study():
    data = request.get_json() or {}

    study_name = data.get("study_name") 
    description = data.get("description")
    duration_months = data.get("duration_months")
    creator_id = data.get("creator_id")
    field_ids = data.get("field_ids", [])

    if not study_name or not description or creator_id is None or duration_months is None:
        return error("study_name, description, duration_months, and creator_id are required")

    creator = User.query.get(creator_id)
    if not creator:
        return error("creator not found", 404)

    if creator.role_id != "researcher":
        return error("creator must be a researcher", 403)

    if not isinstance(duration_months, int) or duration_months <= 0:
        return error("duration_months must be a positive integer")

    if not isinstance(field_ids, list) or not field_ids:
        return error("field_ids must be a non-empty list")

    unique_field_ids = list(dict.fromkeys(field_ids))
    fields = FieldDescription.query.filter(FieldDescription.field_id.in_(unique_field_ids)).all()
    if len(fields) != len(unique_field_ids):
        return error("one or more field_ids do not exist")

    study = Study(
        study_name=study_name.strip(),
        description=description.strip(),
        duration_months=duration_months,
        creator_id=creator_id,
        status="approved",
    )
    db.session.add(study)
    db.session.flush()

    for field_id in unique_field_ids:
        db.session.add(StudyRequiredField(
            study_id=study.study_id,
            field_id=field_id,
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
            "field_ids": unique_field_ids,
        }
    }), 201


@api.route("/studies/<int:study_id>/join", methods=["POST"])
def join_study(study_id):
    data = request.get_json() or {}

    participant_id = data.get("participant_id")

    if participant_id is None:
        return error("participant_id is required")

    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)

    user = User.query.get(participant_id)
    if not user:
        return error("participant not found", 404)

    if user.role_id != "participant":
        return error("user is not a participant", 403)

    existing_link = StudyParticipant.query.filter_by(
        study_id=study_id,
        participant_id=participant_id,
    ).first()

    if existing_link:
        return error("participant is already in this study", 409)

    link = StudyParticipant(
        study_id=study_id,
        participant_id=participant_id,
        consent_all_fields=True,
    )
    db.session.add(link)

    required_fields = StudyRequiredField.query.filter_by(study_id=study_id).all()
    for required in required_fields:
        db.session.add(StudyParticipantConsentedField(
            study_id=study_id,
            participant_id=participant_id,
            field_id=required.field_id,
        ))

    db.session.commit()

    return jsonify({
        "message": "participant joined study and consented to all required fields by default",
        "study_id": study_id,
        "participant_id": participant_id,
        "consented_field_ids": [rf.field_id for rf in required_fields],
    }), 201


@api.route("/studies/<int:study_id>/consent/withdraw", methods=["POST"])
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
    }), 200


@api.route("/studies/<int:study_id>/withdraw", methods=["POST"])
def withdraw_from_study(study_id):
    data = request.get_json() or {}

    participant_id = data.get("participant_id")
    if participant_id is None:
        return error("participant_id is required")

    membership = StudyParticipant.query.filter_by(
        study_id=study_id,
        participant_id=participant_id,
    ).first()

    if not membership:
        return error("participant is not enrolled in this study", 404)

    db.session.delete(membership)
    db.session.commit()

    return jsonify({
        "message": "participant withdrawn from study",
        "study_id": study_id,
        "participant_id": participant_id,
    }), 200


@api.route("/studies/<int:study_id>/consent/regrant", methods=["POST"])
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
            field_id=field.id,
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
                field_id=field.id,
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
            field_id=field.id,
        ).first()

        results.append({
            "field_name": field.field_name,
            "field_description": field.description,
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

        results.append({
            "study_id": study.study_id,
            "study_name": study.study_name,
            "description": study.description,
            "duration_months": study.duration_months,
            "status": study.status,
            "joined_at": membership.joined_at.isoformat(),
            "consent_all_fields": membership.consent_all_fields,
            "consented_field_ids": consented_field_ids,
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
        required_field_rows = StudyRequiredField.query.filter_by(
            study_id=study.study_id
        ).all()
        participant_count = StudyParticipant.query.filter_by(
            study_id=study.study_id
        ).count()

        results.append({
            "study_id": study.study_id,
            "study_name": study.study_name,
            "description": study.description,
            "duration_months": study.duration_months,
            "status": study.status,
            "required_field_ids": [row.field_id for row in required_field_rows],
            "participant_count": participant_count, 
        })

    return jsonify({
        "researcher_id": researcher_id,
        "studies": results,
    }), 200


@api.route("/studies/<int:study_id>/data", methods=["GET"])
def get_study_data(study_id):
    study = Study.query.get(study_id)
    if not study:
        return error("study not found", 404)

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

    if user.password_hash != password:
        return error("invalid email or password", 401)

    return jsonify({
        "message": "login successful",
        "user": {
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "role_id": user.role_id,
        }
    }), 200