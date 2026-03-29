from .extensions import db
from datetime import datetime

class User(db.Model):
    __tablename__ = "users"

    user_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role_id = db.Column(db.String(50), nullable=False)

    created_studies = db.relationship(
        "Study",
        back_populates="creator",
        cascade="all, delete-orphan"
    )

    study_links = db.relationship(
        "StudyParticipant",
        back_populates="participant",
        cascade="all, delete-orphan"
    )

    answers = db.relationship(
        "ParticipantAnswer",
        back_populates="participant",
        cascade="all, delete-orphan"
    )


class Study(db.Model):
    __tablename__ = "studies"

    study_id = db.Column(db.Integer, primary_key=True)
    study_name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    duration_months = db.Column(db.Integer, nullable=False)
    creator_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False
    )
    status = db.Column(db.String(50), nullable=False, default="approved")


    creator = db.relationship("User", back_populates="created_studies")

    required_fields = db.relationship(
        "StudyRequiredField",
        back_populates="study",
        cascade="all, delete-orphan"
    )

    participants = db.relationship(
        "StudyParticipant",
        back_populates="study",
        cascade="all, delete-orphan"
    )

    consented_fields = db.relationship(
        "StudyParticipantConsentedField",
        back_populates="study",
        cascade="all, delete-orphan"
    )


class FieldDescription(db.Model):
    __tablename__ = "field_descriptions"

    field_id = db.Column(db.Integer, primary_key=True)
    field_name = db.Column(db.String(255), unique=True, nullable=False)
    field_desc = db.Column(db.Text)

    study_links = db.relationship(
        "StudyRequiredField",
        back_populates="field",
        cascade="all, delete-orphan"
    )

    consent_links = db.relationship(
        "StudyParticipantConsentedField",
        back_populates="field",
        cascade="all, delete-orphan"
    )

    answers = db.relationship(
        "ParticipantAnswer",
        back_populates="field",
        cascade="all, delete-orphan"
    )


class StudyRequiredField(db.Model):
    __tablename__ = "study_required_fields"

    study_id = db.Column(
        db.Integer,
        db.ForeignKey("studies.study_id", ondelete="CASCADE"),
        primary_key=True
    )
    field_id = db.Column(
        db.Integer,
        db.ForeignKey("field_descriptions.field_id", ondelete="CASCADE"),
        primary_key=True
    )

    study = db.relationship("Study", back_populates="required_fields")
    field = db.relationship("FieldDescription", back_populates="study_links")


class StudyParticipant(db.Model):
    __tablename__ = "study_participants"

    study_id = db.Column(
        db.Integer,
        db.ForeignKey("studies.study_id", ondelete="CASCADE"),
        primary_key=True
    )
    participant_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id", ondelete="CASCADE"),
        primary_key=True
    )
    joined_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    consent_all_fields = db.Column(db.Boolean, default=True, nullable=False)

    study = db.relationship("Study", back_populates="participants")
    participant = db.relationship("User", back_populates="study_links")

    consented_fields = db.relationship(
        "StudyParticipantConsentedField",
        back_populates="study_participant",
        cascade="all, delete-orphan"
    )


class StudyParticipantConsentedField(db.Model):
    __tablename__ = "study_participant_consented_fields"

    study_id = db.Column(
        db.Integer,
        db.ForeignKey("studies.study_id", ondelete="CASCADE"),
        primary_key=True
    )
    participant_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id", ondelete="CASCADE"),
        primary_key=True
    )
    field_id = db.Column(
        db.Integer,
        db.ForeignKey("field_descriptions.field_id", ondelete="CASCADE"),
        primary_key=True
    )

    study = db.relationship("Study", back_populates="consented_fields")
    participant = db.relationship("User")
    field = db.relationship("FieldDescription", back_populates="consent_links")

    __table_args__ = (
        db.ForeignKeyConstraint(
            ["study_id", "participant_id"],
            ["study_participants.study_id", "study_participants.participant_id"],
            ondelete="CASCADE"
        ),
    )

    study_participant = db.relationship("StudyParticipant", back_populates="consented_fields")


class ParticipantAnswer(db.Model):
    __tablename__ = "participant_answers"

    answer_id = db.Column(db.Integer, primary_key=True)
    participant_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False
    )
    field_id = db.Column(
        db.Integer,
        db.ForeignKey("field_descriptions.field_id", ondelete="CASCADE"),
        nullable=False
    )
    answer = db.Column(db.Text)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    participant = db.relationship("User", back_populates="answers")
    field = db.relationship("FieldDescription", back_populates="answers")

    __table_args__ = (
        db.UniqueConstraint("participant_id", "field_id", name="uq_participant_field"),
    )