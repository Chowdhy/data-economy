from .extensions import db
from datetime import datetime

class User(db.Model):
    __tablename__ = "users"

    user_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role_id = db.Column(db.String(50), nullable=False, default="participant")  # participant, researcher, or regulator
    # Adding a requested_role flag for researchers - regulators need to approve them in order for them to be active researchers on the platform: 
    requested_role = db.Column(db.String(50), nullable=True)
    is_approved = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)

    # Logging element (when the user was created):
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
    # Duration for data collection: 
    data_collection_months = db.Column(db.Integer, nullable=False)
    # Duration for research study: 
    research_duration_months = db.Column(db.Integer, nullable=False)

    creator_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False
    )
    status = db.Column(db.String(50), nullable=False, default="pending")
    approved_at = db.Column(db.DateTime, nullable=True)
    open_until = db.Column(db.DateTime, nullable=True)
    ongoing_until = db.Column(db.DateTime, nullable=True)

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
    created_by = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=True)

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
    is_required = db.Column(db.Boolean, nullable=False, default=True)

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
        cascade="all, delete-orphan",
        overlaps="consented_fields"
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

    study = db.relationship("Study", back_populates="consented_fields", overlaps="consented_fields")
    participant = db.relationship("User", overlaps="consented_fields")
    field = db.relationship("FieldDescription", back_populates="consent_links")

    __table_args__ = (
        db.ForeignKeyConstraint(
            ["study_id", "participant_id"],
            ["study_participants.study_id", "study_participants.participant_id"],
            ondelete="CASCADE"
        ),
    )

    study_participant = db.relationship(
        "StudyParticipant",
        back_populates="consented_fields",
        overlaps="consented_fields,participant,study"
    )


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

class StudyIssue(db.Model):
    __tablename__ = "study_issues"

    issue_id = db.Column(db.Integer, primary_key=True)
    study_id = db.Column(
        db.Integer,
        db.ForeignKey("studies.study_id", ondelete="CASCADE"),
        nullable=False,
    )
    regulator_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    comment = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), nullable=False, default="open")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    study = db.relationship(
        "Study",
        backref=db.backref("issues", cascade="all, delete-orphan"),
    )
    regulator = db.relationship("User")

    researcher_response = db.Column(db.Text, nullable=True)
    resolved = db.Column(db.Boolean, default=False)


class StudyIssueField(db.Model):
    __tablename__ = "study_issue_fields"

    issue_id = db.Column(
        db.Integer,
        db.ForeignKey("study_issues.issue_id", ondelete="CASCADE"),
        primary_key=True,
    )
    field_id = db.Column(
        db.Integer,
        db.ForeignKey("field_descriptions.field_id", ondelete="CASCADE"),
        primary_key=True,
    )

    issue = db.relationship(
        "StudyIssue",
        backref=db.backref("flagged_fields", cascade="all, delete-orphan"),
    )
    field = db.relationship("FieldDescription")