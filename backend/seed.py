from app import create_app
from app.extensions import db
from werkzeug.security import generate_password_hash
from app.models import (
    User,
    Study,
    FieldDescription,
    StudyRequiredField,
    StudyParticipant,
    StudyParticipantConsentedField,
    ParticipantAnswer,
)


def clear_data():
    # Delete children first to avoid FK issues
    db.session.query(StudyParticipantConsentedField).delete()
    db.session.query(StudyParticipant).delete()
    db.session.query(StudyRequiredField).delete()
    db.session.query(ParticipantAnswer).delete()
    db.session.query(Study).delete()
    db.session.query(FieldDescription).delete()
    db.session.query(User).delete()
    db.session.commit()


def seed_data():
    # Updated Users

    # REGULATOR (needed for approvals)
    regulator = User(
        name="Admin Regulator",
        email="admin@system.com",
        password_hash=generate_password_hash("admin123"),
        role_id="regulator",
        requested_role=None,
        is_approved=True,
    )

    # APPROVED researchers
    researcher_1 = User(
        name="Dr Alice Smith",
        email="alice.researcher@example.com",
        password_hash=generate_password_hash("test123"),
        role_id="researcher",
        requested_role=None,
        is_approved=True,
        is_active=False
    )

    researcher_2 = User(
        name="Dr Bob Jones",
        email="bob.researcher@example.com",
        password_hash=generate_password_hash("test123"),
        role_id="researcher",
        requested_role=None,
        is_approved=True,
    )

    # PENDING researcher (VERY useful for testing)
    pending_researcher = User(
        name="Pending Researcher",
        email="pending.researcher@example.com",
        password_hash=generate_password_hash("test123"),
        role_id="participant",  # still participant
        requested_role="researcher",
        is_approved=False,
    )

    # Participants
    participant_1 = User(
        name="John Doe",
        email="john.participant@example.com",
        password_hash=generate_password_hash("test123"),
        role_id="participant",
        requested_role=None,
        is_approved=True,
    )

    participant_2 = User(
        name="Jane Roe",
        email="jane.participant@example.com",
        password_hash=generate_password_hash("test123"),
        role_id="participant",
        requested_role=None,
        is_approved=True,
    )

    participant_3 = User(
        name="Sam Lee",
        email="sam.participant@example.com",
        password_hash=generate_password_hash("test123"),
        role_id="participant",
        requested_role=None,
        is_approved=True,
    )

    db.session.add_all([
        regulator,
        researcher_1,
        researcher_2,
        pending_researcher,
        participant_1,
        participant_2,
        participant_3,
    ])
    db.session.flush()

    # Fields
    age = FieldDescription(
        field_name="age",
        field_desc="Participant age in years",
    )
    smoker = FieldDescription(
        field_name="smoker",
        field_desc="Whether the participant smokes",
    )
    height = FieldDescription(
        field_name="height_cm",
        field_desc="Participant height in centimetres",
    )
    weight = FieldDescription(
        field_name="weight_kg",
        field_desc="Participant weight in kilograms",
    )
    heart_rate = FieldDescription(
        field_name="resting_heart_rate",
        field_desc="Resting heart rate in bpm",
    )

    db.session.add_all([age, smoker, height, weight, heart_rate])
    db.session.flush()

    # Studies
    ''' study_1 = Study(
        study_name="Cardiovascular Health Study",
        description="A study exploring relationships between cardiovascular indicators and general health.",
        duration_months=6,
        creator_id=researcher_1.user_id,
        status="ongoing",
    )
    study_2 = Study(
        study_name="Smoking Behaviour Study",
        description="A study exploring relationships between smoking and lifetyle.",
        duration_months=12,
        creator_id=researcher_1.user_id,
        status="open",
    )
    study_3 = Study(
        study_name="General Wellness Study",
        description="A study exploring relationships between mental and general health.",
        duration_months=8,
        creator_id=researcher_2.user_id,
        status="open",
    ) 

    db.session.add_all([study_1, study_2, study_3])
    db.session.flush()

    # Required fields for studies
    db.session.add_all([
        StudyRequiredField(study_id=study_1.study_id, field_id=age.field_id, is_required = True),
        StudyRequiredField(study_id=study_1.study_id, field_id=height.field_id, is_required =  True),
        StudyRequiredField(study_id=study_1.study_id, field_id=weight.field_id, is_required =  True),
        StudyRequiredField(study_id=study_1.study_id, field_id=heart_rate.field_id, is_required = False),

        StudyRequiredField(study_id=study_2.study_id, field_id=age.field_id, is_required = True),
        StudyRequiredField(study_id=study_2.study_id, field_id=smoker.field_id, is_required = True),

        StudyRequiredField(study_id=study_3.study_id, field_id=age.field_id, is_required = True),
        StudyRequiredField(study_id=study_3.study_id, field_id=height.field_id, is_required = True),
        StudyRequiredField(study_id=study_3.study_id, field_id=weight.field_id, is_required = True),
    ])
    db.session.flush()

    # Study memberships
    sp_1 = StudyParticipant(
        study_id=study_1.study_id,
        participant_id=participant_1.user_id,
        consent_all_fields=True,
    )
    sp_2 = StudyParticipant(
        study_id=study_1.study_id,
        participant_id=participant_2.user_id,
        consent_all_fields=False,
    )
    sp_3 = StudyParticipant(
        study_id=study_2.study_id,
        participant_id=participant_2.user_id,
        consent_all_fields=True,
    )
    sp_4 = StudyParticipant(
        study_id=study_3.study_id,
        participant_id=participant_1.user_id,
        consent_all_fields=True,
    )
    sp_5 = StudyParticipant(
        study_id=study_3.study_id,
        participant_id=participant_3.user_id,
        consent_all_fields=False,
    )

    db.session.add_all([sp_1, sp_2, sp_3, sp_4, sp_5])
    db.session.flush()

    # Consented fields
    # participant_1 in study_1: all consented
    db.session.add_all([
        StudyParticipantConsentedField(
            study_id=study_1.study_id,
            participant_id=participant_1.user_id,
            field_id=age.field_id,
        ),
        StudyParticipantConsentedField(
            study_id=study_1.study_id,
            participant_id=participant_1.user_id,
            field_id=height.field_id,
        ),
        StudyParticipantConsentedField(
            study_id=study_1.study_id,
            participant_id=participant_1.user_id,
            field_id=weight.field_id,
        ),
        StudyParticipantConsentedField(
            study_id=study_1.study_id,
            participant_id=participant_1.user_id,
            field_id=heart_rate.field_id,
        ),
    ])

    # participant_2 in study_1: partial consent
    db.session.add_all([
        StudyParticipantConsentedField(
            study_id=study_1.study_id,
            participant_id=participant_2.user_id,
            field_id=age.field_id,
        ),
        StudyParticipantConsentedField(
            study_id=study_1.study_id,
            participant_id=participant_2.user_id,
            field_id=weight.field_id,
        ),
    ])

    # participant_2 in study_2: all consented
    db.session.add_all([
        StudyParticipantConsentedField(
            study_id=study_2.study_id,
            participant_id=participant_2.user_id,
            field_id=age.field_id,
        ),
        StudyParticipantConsentedField(
            study_id=study_2.study_id,
            participant_id=participant_2.user_id,
            field_id=smoker.field_id,
        ),
    ])

    # participant_1 in study_3: all consented
    db.session.add_all([
        StudyParticipantConsentedField(
            study_id=study_3.study_id,
            participant_id=participant_1.user_id,
            field_id=age.field_id,
        ),
        StudyParticipantConsentedField(
            study_id=study_3.study_id,
            participant_id=participant_1.user_id,
            field_id=height.field_id,
        ),
        StudyParticipantConsentedField(
            study_id=study_3.study_id,
            participant_id=participant_1.user_id,
            field_id=weight.field_id,
        ),
    ])

    # participant_3 in study_3: partial consent
    db.session.add_all([
        StudyParticipantConsentedField(
            study_id=study_3.study_id,
            participant_id=participant_3.user_id,
            field_id=age.field_id,
        ),
        StudyParticipantConsentedField(
            study_id=study_3.study_id,
            participant_id=participant_3.user_id,
            field_id=height.field_id,
        ),
    ])

    # Participant answers
    db.session.add_all([
        ParticipantAnswer(
            participant_id=participant_1.user_id,
            field_id=age.field_id,
            answer="21",
        ),
        ParticipantAnswer(
            participant_id=participant_1.user_id,
            field_id=height.field_id,
            answer="178",
        ),
        ParticipantAnswer(
            participant_id=participant_1.user_id,
            field_id=weight.field_id,
            answer="72",
        ),
        ParticipantAnswer(
            participant_id=participant_1.user_id,
            field_id=heart_rate.field_id,
            answer="64",
        ),
        ParticipantAnswer(
            participant_id=participant_2.user_id,
            field_id=age.field_id,
            answer="24",
        ),
        ParticipantAnswer(
            participant_id=participant_2.user_id,
            field_id=weight.field_id,
            answer="65",
        ),
        ParticipantAnswer(
            participant_id=participant_2.user_id,
            field_id=smoker.field_id,
            answer="No",
        ),
        ParticipantAnswer(
            participant_id=participant_3.user_id,
            field_id=age.field_id,
            answer="29",
        ),
        ParticipantAnswer(
            participant_id=participant_3.user_id,
            field_id=height.field_id,
            answer="183",
        ),
    ])


    print("Seed data inserted successfully.")
    print("Regulator:")
    print(f"  {regulator.user_id}: {regulator.email}")

    print("Researchers:")
    print(f"  {researcher_1.user_id}: {researcher_1.email}")
    print(f"  {researcher_2.user_id}: {researcher_2.email}")

    print("Pending Researchers:")
    print(f"  {pending_researcher.user_id}: {pending_researcher.email}")

    print("Participants:")
    print(f"  {participant_1.user_id}: {participant_1.email}")
    print(f"  {participant_2.user_id}: {participant_2.email}")
    print(f"  {participant_3.user_id}: {participant_3.email}") '''
    db.session.commit()


if __name__ == "__main__":
    app = create_app()

    with app.app_context():
        db.create_all()  # Ensure tables are created
        clear_data()
        seed_data()