from app import create_app
from app.extensions import db
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
import argparse
import random

from app.models import (
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


# ---------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------

DEFAULT_PARTICIPANT_COUNT = 60
DEFAULT_STUDY_COUNT = 8
DEFAULT_RANDOM_SEED = 42

# For k-anonymity demo purposes, keep postcode prefixes clustered.
POSTCODE_PREFIXES = [
    "SO",  # Southampton
    "PO",  # Portsmouth
    "BH",  # Bournemouth
    "RG",  # Reading
    "GU",  # Guildford
    "BN",  # Brighton
    "BS",  # Bristol
    "OX",  # Oxford
    "SW",  # London
    "CF",  # Cardiff
]

SEX_GENDER_OPTIONS = [
    "Man",
    "Woman",
    "Transgender man",
    "Transgender woman",
    "Non-binary",
    "Other",
]

YES_NO_UNKNOWN = ["Yes", "No", "I don't know"]
YES_NO_PREFER_NOT = ["Yes", "No", "Prefer not to say"]
FREQUENCY_OPTIONS = ["Never", "Rarely", "Sometimes", "Often", "Daily"]
LIKERT_AGREE = [
    "Strongly disagree",
    "Disagree",
    "Neither agree nor disagree",
    "Agree",
    "Strongly agree",
]
SEVERITY_OPTIONS = ["None", "Mild", "Moderate", "Severe", "Very severe"]
DURATION_OPTIONS = [
    "Less than 1 month",
    "1-6 months",
    "6-12 months",
    "1-5 years",
    "More than 5 years",
]
ACTIVITY_OPTIONS = [
    "Sedentary",
    "Lightly active",
    "Moderately active",
    "Very active",
]
ALCOHOL_OPTIONS = [
    "Never",
    "Monthly or less",
    "2-4 times per month",
    "2-3 times per week",
    "4+ times per week",
]
SLEEP_OPTIONS = [
    "Less than 5 hours",
    "5-6 hours",
    "7-8 hours",
    "More than 8 hours",
]
DIET_OPTIONS = [
    "Poor",
    "Fair",
    "Good",
    "Very good",
    "Excellent",
]
MARITAL_STATUS_OPTIONS = [
    "Single",
    "Married or civil partnership",
    "Separated",
    "Divorced",
    "Widowed",
    "Prefer not to say",
]
EMPLOYMENT_OPTIONS = [
    "Full-time employed",
    "Part-time employed",
    "Self-employed",
    "Student",
    "Unemployed",
    "Retired",
    "Prefer not to say",
]

# ----------------------------------------------------------------------
# Needed for Anonymisation Demo
# ----------------------------------------------------------------------
ANONYMISATION_DEMO_STUDY_NAME = "Regional Cardiometabolic Health Study"

ANONYMISATION_DEMO_STUDY_DESCRIPTION = (
    "A study exploring how demographic and regional factors relate to "
    "cardiometabolic health indicators, including diabetes and hypertension. "
)

ANONYMISATION_DEMO_FIELD_NAMES = {
    "sex_gender",
    "postcode",
    "age",
    "diagnosed_diabetes",
    "diagnosed_hypertension",
}



# ---------------------------------------------------------------------
# Field definitions
# ---------------------------------------------------------------------
# field_type:
# - "text": free text answer
# - "enum": answer selected from options
#
# generator:
# - Used to generate realistic-ish demo answers.
# ---------------------------------------------------------------------

def random_postcode():
    prefix = random.choice(POSTCODE_PREFIXES)
    outward_number = random.randint(1, 99)
    inward_digit = random.randint(1, 9)
    inward_letters = "".join(random.choice("ABCDEFGHJKLNPQRSTUVWXYZ") for _ in range(2))
    return f"{prefix}{outward_number} {inward_digit}{inward_letters}"


def random_int_text(min_value, max_value):
    return str(random.randint(min_value, max_value))


def random_float_text(min_value, max_value, decimals=1):
    return str(round(random.uniform(min_value, max_value), decimals))


def random_words(options):
    return random.choice(options)


def random_medication_list():
    options = [
        "None",
        "Atorvastatin",
        "Metformin",
        "Amlodipine",
        "Salbutamol inhaler",
        "Sertraline",
        "Levothyroxine",
        "Ramipril",
        "Omeprazole",
        "Prefer not to say",
    ]
    return random.choice(options)


def random_condition_text():
    options = [
        "None",
        "Asthma",
        "Type 2 diabetes",
        "Hypertension",
        "Migraine",
        "Eczema",
        "Anxiety",
        "Depression",
        "High cholesterol",
        "Prefer not to say",
    ]
    return random.choice(options)


def random_diet_notes():
    options = [
        "No specific diet",
        "Vegetarian",
        "Vegan",
        "Low salt diet",
        "Low sugar diet",
        "High protein diet",
        "Gluten free",
        "Dairy free",
        "Trying to eat more vegetables",
        "Prefer not to say",
    ]
    return random.choice(options)


def random_symptom_notes():
    options = [
        "No major symptoms",
        "Occasional headaches",
        "Occasional tiredness",
        "Shortness of breath during exercise",
        "Mild joint pain",
        "Back pain after sitting for long periods",
        "Occasional dizziness",
        "Prefer not to say",
    ]
    return random.choice(options)


FIELD_DEFINITIONS = [
    # Hardcoded field 1
    {
        "field_id": 1,
        "field_name": "sex_gender",
        "field_desc": "Participant sex or gender identity.",
        "field_type": "enum",
        "options": SEX_GENDER_OPTIONS,
        "generator": lambda: random.choice(SEX_GENDER_OPTIONS),
    },
    # Hardcoded field 2
    {
        "field_id": 2,
        "field_name": "postcode",
        "field_desc": "Participant postcode. Used for regional and k-anonymity demonstrations.",
        "field_type": "text",
        "options": [],
        "generator": random_postcode,
    },
    {
        "field_name": "age",
        "field_desc": "Participant age in years.",
        "field_type": "text",
        "options": [],
        "generator": lambda: random_int_text(18, 85),
    },
    {
        "field_name": "height_cm",
        "field_desc": "Participant height in centimetres.",
        "field_type": "text",
        "options": [],
        "generator": lambda: random_int_text(145, 205),
    },
    {
        "field_name": "weight_kg",
        "field_desc": "Participant weight in kilograms.",
        "field_type": "text",
        "options": [],
        "generator": lambda: random_float_text(45, 130, 1),
    },
    {
        "field_name": "resting_heart_rate",
        "field_desc": "Resting heart rate in beats per minute.",
        "field_type": "text",
        "options": [],
        "generator": lambda: random_int_text(50, 105),
    },
    {
        "field_name": "systolic_blood_pressure",
        "field_desc": "Systolic blood pressure reading.",
        "field_type": "text",
        "options": [],
        "generator": lambda: random_int_text(95, 165),
    },
    {
        "field_name": "diastolic_blood_pressure",
        "field_desc": "Diastolic blood pressure reading.",
        "field_type": "text",
        "options": [],
        "generator": lambda: random_int_text(55, 105),
    },
    {
        "field_name": "how_often_smoke",
        "field_desc": "How often does the participant smoke?",
        "field_type": "enum",
        "options": ["Never", "Former smoker", "Rarely", "Weekly", "Daily", "Prefer not to say"],
        "generator": lambda: random.choice(["Never", "Never", "Former smoker", "Rarely", "Weekly", "Daily", "Prefer not to say"]),
    },
    {
        "field_name": "vape_use",
        "field_desc": "How often does the participant use e-cigarettes or vaping products?",
        "field_type": "enum",
        "options": FREQUENCY_OPTIONS + ["Prefer not to say"],
        "generator": lambda: random.choice(FREQUENCY_OPTIONS + ["Prefer not to say"]),
    },
    {
        "field_name": "alcohol_frequency",
        "field_desc": "How often does the participant drink alcohol?",
        "field_type": "enum",
        "options": ALCOHOL_OPTIONS + ["Prefer not to say"],
        "generator": lambda: random.choice(ALCOHOL_OPTIONS + ["Prefer not to say"]),
    },
    {
        "field_name": "exercise_frequency",
        "field_desc": "How often does the participant do physical exercise?",
        "field_type": "enum",
        "options": FREQUENCY_OPTIONS,
        "generator": lambda: random.choice(FREQUENCY_OPTIONS),
    },
    {
        "field_name": "physical_activity_level",
        "field_desc": "Overall physical activity level.",
        "field_type": "enum",
        "options": ACTIVITY_OPTIONS,
        "generator": lambda: random.choice(ACTIVITY_OPTIONS),
    },
    {
        "field_name": "average_sleep_duration",
        "field_desc": "Average sleep duration per night.",
        "field_type": "enum",
        "options": SLEEP_OPTIONS,
        "generator": lambda: random.choice(SLEEP_OPTIONS),
    },
    {
        "field_name": "sleep_quality",
        "field_desc": "Self-rated sleep quality.",
        "field_type": "enum",
        "options": ["Very poor", "Poor", "Fair", "Good", "Very good"],
        "generator": lambda: random.choice(["Very poor", "Poor", "Fair", "Good", "Very good"]),
    },
    {
        "field_name": "diet_quality",
        "field_desc": "Self-rated diet quality.",
        "field_type": "enum",
        "options": DIET_OPTIONS,
        "generator": lambda: random.choice(DIET_OPTIONS),
    },
    {
        "field_name": "diet_notes",
        "field_desc": "Brief notes about the participant's usual diet.",
        "field_type": "text",
        "options": [],
        "generator": random_diet_notes,
    },
    {
        "field_name": "existing_medical_conditions",
        "field_desc": "Known long-term medical conditions.",
        "field_type": "text",
        "options": [],
        "generator": random_condition_text,
    },
    {
        "field_name": "current_medications",
        "field_desc": "Current regular medications.",
        "field_type": "text",
        "options": [],
        "generator": random_medication_list,
    },
    {
        "field_name": "allergies",
        "field_desc": "Known allergies.",
        "field_type": "text",
        "options": [],
        "generator": lambda: random.choice(["None", "Penicillin", "Peanuts", "Pollen", "Dust mites", "Shellfish", "Prefer not to say"]),
    },
    {
        "field_name": "family_history_heart_disease",
        "field_desc": "Does anyone in the participant's family have a history of heart disease?",
        "field_type": "enum",
        "options": YES_NO_UNKNOWN,
        "generator": lambda: random.choice(YES_NO_UNKNOWN),
    },
    {
        "field_name": "family_history_diabetes",
        "field_desc": "Does anyone in the participant's family have a history of diabetes?",
        "field_type": "enum",
        "options": YES_NO_UNKNOWN,
        "generator": lambda: random.choice(YES_NO_UNKNOWN),
    },
    {
        "field_name": "family_history_cancer",
        "field_desc": "Does anyone in the participant's family have a history of cancer?",
        "field_type": "enum",
        "options": YES_NO_UNKNOWN,
        "generator": lambda: random.choice(YES_NO_UNKNOWN),
    },
    {
        "field_name": "family_history_stroke",
        "field_desc": "Does anyone in the participant's family have a history of stroke?",
        "field_type": "enum",
        "options": YES_NO_UNKNOWN,
        "generator": lambda: random.choice(YES_NO_UNKNOWN),
    },
    {
        "field_name": "diagnosed_hypertension",
        "field_desc": "Has the participant been diagnosed with high blood pressure?",
        "field_type": "enum",
        "options": YES_NO_UNKNOWN,
        "generator": lambda: random.choice(YES_NO_UNKNOWN),
    },
    {
        "field_name": "diagnosed_diabetes",
        "field_desc": "Has the participant been diagnosed with diabetes?",
        "field_type": "enum",
        "options": YES_NO_UNKNOWN,
        "generator": lambda: random.choice(YES_NO_UNKNOWN),
    },
    {
        "field_name": "diagnosed_asthma",
        "field_desc": "Has the participant been diagnosed with asthma?",
        "field_type": "enum",
        "options": YES_NO_UNKNOWN,
        "generator": lambda: random.choice(YES_NO_UNKNOWN),
    },
    {
        "field_name": "diagnosed_depression",
        "field_desc": "Has the participant been diagnosed with depression?",
        "field_type": "enum",
        "options": YES_NO_PREFER_NOT,
        "generator": lambda: random.choice(YES_NO_PREFER_NOT),
    },
    {
        "field_name": "diagnosed_anxiety",
        "field_desc": "Has the participant been diagnosed with anxiety?",
        "field_type": "enum",
        "options": YES_NO_PREFER_NOT,
        "generator": lambda: random.choice(YES_NO_PREFER_NOT),
    },
    {
        "field_name": "stress_level",
        "field_desc": "Participant's usual stress level.",
        "field_type": "enum",
        "options": ["Very low", "Low", "Moderate", "High", "Very high"],
        "generator": lambda: random.choice(["Very low", "Low", "Moderate", "High", "Very high"]),
    },
    {
        "field_name": "mental_wellbeing_score",
        "field_desc": "Self-rated mental wellbeing score from 1 to 10.",
        "field_type": "text",
        "options": [],
        "generator": lambda: random_int_text(1, 10),
    },
    {
        "field_name": "pain_frequency",
        "field_desc": "How often does the participant experience pain?",
        "field_type": "enum",
        "options": FREQUENCY_OPTIONS,
        "generator": lambda: random.choice(FREQUENCY_OPTIONS),
    },
    {
        "field_name": "pain_severity",
        "field_desc": "Usual pain severity.",
        "field_type": "enum",
        "options": SEVERITY_OPTIONS,
        "generator": lambda: random.choice(SEVERITY_OPTIONS),
    },
    {
        "field_name": "fatigue_frequency",
        "field_desc": "How often does the participant experience fatigue?",
        "field_type": "enum",
        "options": FREQUENCY_OPTIONS,
        "generator": lambda: random.choice(FREQUENCY_OPTIONS),
    },
    {
        "field_name": "shortness_of_breath",
        "field_desc": "How often does the participant experience shortness of breath?",
        "field_type": "enum",
        "options": FREQUENCY_OPTIONS,
        "generator": lambda: random.choice(FREQUENCY_OPTIONS),
    },
    {
        "field_name": "chest_pain",
        "field_desc": "How often does the participant experience chest pain?",
        "field_type": "enum",
        "options": FREQUENCY_OPTIONS,
        "generator": lambda: random.choice(FREQUENCY_OPTIONS),
    },
    {
        "field_name": "headache_frequency",
        "field_desc": "How often does the participant experience headaches?",
        "field_type": "enum",
        "options": FREQUENCY_OPTIONS,
        "generator": lambda: random.choice(FREQUENCY_OPTIONS),
    },
    {
        "field_name": "symptom_notes",
        "field_desc": "Brief description of any recurring symptoms.",
        "field_type": "text",
        "options": [],
        "generator": random_symptom_notes,
    },
    {
        "field_name": "covid_history",
        "field_desc": "Has the participant previously had COVID-19?",
        "field_type": "enum",
        "options": YES_NO_UNKNOWN,
        "generator": lambda: random.choice(YES_NO_UNKNOWN),
    },
    {
        "field_name": "long_covid_symptoms",
        "field_desc": "Does the participant report long COVID symptoms?",
        "field_type": "enum",
        "options": YES_NO_UNKNOWN,
        "generator": lambda: random.choice(YES_NO_UNKNOWN),
    },
    {
        "field_name": "vaccination_status",
        "field_desc": "Participant's general vaccination status.",
        "field_type": "enum",
        "options": ["Up to date", "Partially vaccinated", "Not vaccinated", "Prefer not to say"],
        "generator": lambda: random.choice(["Up to date", "Partially vaccinated", "Not vaccinated", "Prefer not to say"]),
    },
    {
        "field_name": "gp_visits_last_year",
        "field_desc": "Number of GP visits in the last year.",
        "field_type": "text",
        "options": [],
        "generator": lambda: random_int_text(0, 12),
    },
    {
        "field_name": "hospital_admissions_last_year",
        "field_desc": "Number of hospital admissions in the last year.",
        "field_type": "text",
        "options": [],
        "generator": lambda: random_int_text(0, 4),
    },
    {
        "field_name": "mobility_limitations",
        "field_desc": "Does the participant have mobility limitations?",
        "field_type": "enum",
        "options": YES_NO_PREFER_NOT,
        "generator": lambda: random.choice(YES_NO_PREFER_NOT),
    },
    {
        "field_name": "uses_wearable_device",
        "field_desc": "Does the participant use a wearable health or fitness device?",
        "field_type": "enum",
        "options": YES_NO_PREFER_NOT,
        "generator": lambda: random.choice(YES_NO_PREFER_NOT),
    },
    {
        "field_name": "daily_step_count_estimate",
        "field_desc": "Estimated average daily step count.",
        "field_type": "text",
        "options": [],
        "generator": lambda: random_int_text(1000, 18000),
    },
    {
        "field_name": "caffeine_consumption",
        "field_desc": "How often does the participant consume caffeine?",
        "field_type": "enum",
        "options": FREQUENCY_OPTIONS,
        "generator": lambda: random.choice(FREQUENCY_OPTIONS),
    },
    {
        "field_name": "water_intake_litres",
        "field_desc": "Estimated daily water intake in litres.",
        "field_type": "text",
        "options": [],
        "generator": lambda: random_float_text(0.5, 4.0, 1),
    },
    {
        "field_name": "employment_status",
        "field_desc": "Participant employment status.",
        "field_type": "enum",
        "options": EMPLOYMENT_OPTIONS,
        "generator": lambda: random.choice(EMPLOYMENT_OPTIONS),
    },
    {
        "field_name": "marital_status",
        "field_desc": "Participant marital status.",
        "field_type": "enum",
        "options": MARITAL_STATUS_OPTIONS,
        "generator": lambda: random.choice(MARITAL_STATUS_OPTIONS),
    },
    {
        "field_name": "education_level",
        "field_desc": "Highest level of education completed.",
        "field_type": "enum",
        "options": [
            "No formal qualifications",
            "GCSE or equivalent",
            "A-level or equivalent",
            "Undergraduate degree",
            "Postgraduate degree",
            "Prefer not to say",
        ],
        "generator": lambda: random.choice([
            "No formal qualifications",
            "GCSE or equivalent",
            "A-level or equivalent",
            "Undergraduate degree",
            "Postgraduate degree",
            "Prefer not to say",
        ]),
    },
    {
        "field_name": "health_confidence",
        "field_desc": "I feel confident managing my health.",
        "field_type": "enum",
        "options": LIKERT_AGREE,
        "generator": lambda: random.choice(LIKERT_AGREE),
    },
    {
        "field_name": "willing_to_share_wearable_data",
        "field_desc": "Would the participant be willing to share wearable device data?",
        "field_type": "enum",
        "options": YES_NO_PREFER_NOT,
        "generator": lambda: random.choice(YES_NO_PREFER_NOT),
    },
]


STUDY_NAMES = [
    "Cardiovascular Health Study",
    "Smoking Behaviour Study",
    "General Wellness Study",
    "Sleep and Stress Study",
    "Diabetes Risk Study",
    "Respiratory Health Study",
    "Exercise and Mobility Study",
    "Diet and Lifestyle Study",
    "Mental Wellbeing Study",
    "Wearable Health Tracking Study",
    "Postcode Health Inequality Study",
    "Family History and Disease Risk Study",
    "Long COVID Symptom Study",
    "Pain and Fatigue Study",
    "Preventative Health Behaviour Study",
]


# ---------------------------------------------------------------------
# Clear existing data
# ---------------------------------------------------------------------

def clear_data():
    # Delete children first to avoid FK issues.
    db.session.query(StudyModificationOptionalField).delete()
    db.session.query(StudyModificationRequiredField).delete()
    db.session.query(StudyModification).delete()
    db.session.query(StudyIssueField).delete()
    db.session.query(StudyIssue).delete()
    db.session.query(ActivityLog).delete()
    db.session.query(StudyResearcher).delete()
    db.session.query(StudyParticipantConsentedField).delete()
    db.session.query(StudyParticipant).delete()
    db.session.query(StudyRequiredField).delete()
    db.session.query(ParticipantAnswer).delete()
    db.session.query(Study).delete()
    db.session.query(FieldOption).delete()
    db.session.query(FieldDescription).delete()
    db.session.query(User).delete()
    db.session.commit()


# ---------------------------------------------------------------------
# Seed helpers
# ---------------------------------------------------------------------

def add_user(name, email, password, role_id, is_active=True):
    user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password),
        role_id=role_id,
        is_active=is_active,
    )
    db.session.add(user)
    return user


def add_field(field_def):
    field = FieldDescription(
        field_id=field_def.get("field_id"),
        field_name=field_def["field_name"],
        field_desc=field_def["field_desc"],
        field_type=field_def["field_type"],
    )

    db.session.add(field)
    db.session.flush()

    for index, option_value in enumerate(field_def.get("options", [])):
        db.session.add(
            FieldOption(
                field_id=field.field_id,
                value=option_value,
                display_order=index,
            )
        )

    return field


def add_answer(participant_id, field_id, answer):
    existing = ParticipantAnswer.query.filter_by(
        participant_id=participant_id,
        field_id=field_id,
    ).first()

    if existing:
        existing.answer = answer
        return existing

    answer_row = ParticipantAnswer(
        participant_id=participant_id,
        field_id=field_id,
        answer=answer,
    )
    db.session.add(answer_row)
    return answer_row


def choose_study_status(index):
    # Keep a useful mix for demo:
    # - pending for regulator review
    # - open for participant joining/consent
    # - ongoing for researcher data access
    #pattern = ["open", "ongoing", "pending", "open", "ongoing", "pending", "rejected"]
    #return pattern[index % len(pattern)]
    return "ongoing"


def configure_study_dates(study, status):
    now = datetime.utcnow()

    if status in {"open", "ongoing", "complete"}:
        study.approved_at = now - timedelta(days=random.randint(5, 90))
        study.open_until = study.approved_at + timedelta(days=30 * study.data_collection_months)
        study.ongoing_until = study.open_until + timedelta(days=30 * study.research_duration_months)

    if status == "ongoing":
        study.open_until = now - timedelta(days=random.randint(1, 30))
        study.ongoing_until = now + timedelta(days=random.randint(30, 180))

    if status == "complete":
        study.open_until = now - timedelta(days=random.randint(180, 300))
        study.ongoing_until = now - timedelta(days=random.randint(1, 60))

    if status in {"pending", "rejected"}:
        study.approved_at = None
        study.open_until = None
        study.ongoing_until = None


def create_study_fields(study, all_fields):
    is_anonymisation_demo_study = (
        study.study_name == ANONYMISATION_DEMO_STUDY_NAME
    )

    if is_anonymisation_demo_study:
        required_fields = [
            field for field in all_fields
            if field.field_name in ANONYMISATION_DEMO_FIELD_NAMES
        ]

        required_field_ids = {field.field_id for field in required_fields}

        for field in required_fields:
            db.session.add(
                StudyRequiredField(
                    study_id=study.study_id,
                    field_id=field.field_id,
                    is_required=True,
                )
            )

        return required_fields, required_fields

    # Existing random study setup for all other studies
    gender_field = all_fields[0]
    postcode_field = all_fields[1]

    remaining_fields = all_fields[2:]

    total_fields_to_include = random.randint(10, 20)
    selected_extra_fields = random.sample(
        remaining_fields,
        k=min(total_fields_to_include - 2, len(remaining_fields)),
    )

    selected_fields = [gender_field, postcode_field] + selected_extra_fields

    required_extra_count = random.randint(1, min(6, len(selected_extra_fields)))
    required_extra_fields = random.sample(selected_extra_fields, k=required_extra_count)

    required_fields = [gender_field, postcode_field] + required_extra_fields
    required_field_ids = {field.field_id for field in required_fields}

    for field in selected_fields:
        db.session.add(
            StudyRequiredField(
                study_id=study.study_id,
                field_id=field.field_id,
                is_required=field.field_id in required_field_ids,
            )
        )

    return selected_fields, required_fields


def create_participant_study_memberships(study, participants, selected_fields, required_fields):
    # Pending/rejected studies should not have participants in normal app flow.
    if study.status not in {"open", "ongoing", "complete"}:
        return

    required_field_ids = {field.field_id for field in required_fields}
    optional_fields = [
        field for field in selected_fields
        if field.field_id not in required_field_ids
    ]

    # For the anonymisation demo study, include all participants so that
    # k-anonymity groups are large enough to demo
    if study.study_name == ANONYMISATION_DEMO_STUDY_NAME:
        joined_participants = participants
    else:
        # Not everyone joins every other study
        join_count = random.randint(
            max(5, len(participants) // 4),
            max(6, int(len(participants) * 0.75)),
        )
        joined_participants = random.sample(participants, k=min(join_count, len(participants)))

    for participant in joined_participants:
        consented_field_ids = set(required_field_ids)

        for field in optional_fields:
            # 65% chance to consent to optional fields.
            if random.random() < 0.65:
                consented_field_ids.add(field.field_id)

        consent_all_fields = len(consented_field_ids) == len(selected_fields)

        db.session.add(
            StudyParticipant(
                study_id=study.study_id,
                participant_id=participant.user_id,
                consent_all_fields=consent_all_fields,
            )
        )
        db.session.flush()

        for field_id in consented_field_ids:
            db.session.add(
                StudyParticipantConsentedField(
                    study_id=study.study_id,
                    participant_id=participant.user_id,
                    field_id=field_id,
                )
            )


def seed_participant_answers(participants, field_defs_by_id):
    required_anonymisation_fields = {
        "sex_gender",
        "age",
        "postcode",
    }

    for participant in participants:
        for field_id, field_def in field_defs_by_id.items():
            field_name = field_def["field_name"]

            # For anonymisation every participant needs these quasi-identifiers
            # Other fields can remain partly missing for demo
            should_create_answer = (
                field_name in required_anonymisation_fields
                or random.random() < 0.88
            )

            if should_create_answer:
                answer = field_def["generator"]()
                add_answer(participant.user_id, field_id, answer)

def create_demo_issues(regulator, studies):
    pending_studies = [study for study in studies if study.status == "pending"]

    for study in pending_studies[: max(1, len(pending_studies) // 2)]:
        field_rows = StudyRequiredField.query.filter_by(study_id=study.study_id).all()
        if not field_rows:
            continue

        flagged_rows = random.sample(
            field_rows,
            k=min(random.randint(1, 3), len(field_rows)),
        )

        issue = StudyIssue(
            study_id=study.study_id,
            regulator_id=regulator.user_id,
            comment=random.choice([
                "Please clarify why these fields are necessary for the stated research aim.",
                "The wording of these fields may be too broad. Please refine the description or choose more appropriate fields.",
                "These fields may need stronger justification because they are sensitive or identifying.",
            ]),
            status="open",
        )
        db.session.add(issue)
        db.session.flush()

        for row in flagged_rows:
            db.session.add(
                StudyIssueField(
                    issue_id=issue.issue_id,
                    field_id=row.field_id,
                )
            )


def create_activity_log(action, user_id=None, study_id=None, details=None):
    import json

    db.session.add(
        ActivityLog(
            user_id=user_id,
            study_id=study_id,
            action=action,
            details=json.dumps(details) if details else None,
            created_at=datetime.utcnow(),
        )
    )


# ---------------------------------------------------------------------
# Main seed
# ---------------------------------------------------------------------

def seed_data(participant_count, study_count, random_seed):
    random.seed(random_seed)

    # -------------------------------------------------------------
    # Core accounts
    # -------------------------------------------------------------

    regulator = add_user(
        name="Regulator 1",
        email="regulator@gmai.com",
        password="admin123",
        role_id="regulator",
    )

    researcher_1 = add_user(
        name="Dr. Alice Smith",
        email="alice@gmail.com",
        password="test123",
        role_id="researcher",
        is_active=True,
    )

    researcher_2 = add_user(
        name="Dr. Bob Jones",
        email="bob@gmail.com",
        password="test123",
        role_id="researcher",
        is_active=True,
    )

    pending_researcher = add_user(
        name="Dr. Mary Jonas",
        email="mary@gmail.com",
        password="test123",
        role_id="participant",
        is_active=True,
    )

    # Keep familiar participant accounts.
    demo_participants = [
        add_user(
            name="John Doe",
            email="john@gmail.com",
            password="test123",
            role_id="participant",
        ),
        add_user(
            name="Jane Roe",
            email="jane@gmail.com",
            password="test123",
            role_id="participant",
        ),
        add_user(
            name="Sam Lee",
            email="sam@gmail.com",
            password="test123",
            role_id="participant",
        ),
    ]

    generated_participants = []
    for i in range(4, participant_count + 1):
        generated_participants.append(
            add_user(
                name=f"Demo Participant {i}",
                email=f"participant{i}@gmail.com",
                password="test123",
                role_id="participant",
            )
        )

    participants = demo_participants + generated_participants

    db.session.flush()

    # -------------------------------------------------------------
    # Fields
    # -------------------------------------------------------------

    fields = []
    field_defs_by_id = {}

    for field_def in FIELD_DEFINITIONS:
        field = add_field(field_def)
        fields.append(field)

        # Store a copy keyed by actual DB field_id.
        copied_def = dict(field_def)
        copied_def["field_id"] = field.field_id
        field_defs_by_id[field.field_id] = copied_def

    db.session.flush()

    # -------------------------------------------------------------
    # Studies
    # -------------------------------------------------------------

    researchers = [researcher_1, researcher_2]
    studies = []

    for i in range(study_count):
        if i == 0:
            name = ANONYMISATION_DEMO_STUDY_NAME
        else:
            name = STUDY_NAMES[(i - 1) % len(STUDY_NAMES)]
            if i - 1 >= len(STUDY_NAMES):
                name = f"{name} {i + 1}"

        status = choose_study_status(i)

        description = (
            ANONYMISATION_DEMO_STUDY_DESCRIPTION
            if name == ANONYMISATION_DEMO_STUDY_NAME
            else (
                f"Demo study for testing {name.lower()}. "
                "Includes a mixture of required and optional participant fields."
            )
        )

        study = Study(
            study_name=name,
            description=description,
            data_collection_months=random.randint(2, 8),
            research_duration_months=random.randint(4, 18),
            creator_id=random.choice(researchers).user_id,
            status=status,
        )

        configure_study_dates(study, status)

        db.session.add(study)
        db.session.flush()

        selected_fields, required_fields = create_study_fields(study, fields)
        create_participant_study_memberships(
            study=study,
            participants=participants,
            selected_fields=selected_fields,
            required_fields=required_fields,
        )

        studies.append(study)

        create_activity_log(
            "study_created",
            user_id=study.creator_id,
            study_id=study.study_id,
            details={"study_name": study.study_name},
        )

        if status in {"open", "ongoing", "complete"}:
            create_activity_log(
                "study_approved",
                user_id=regulator.user_id,
                study_id=study.study_id,
            )

    db.session.flush()

    # -------------------------------------------------------------
    # Global participant answers
    # -------------------------------------------------------------

    seed_participant_answers(participants, field_defs_by_id)

    # -------------------------------------------------------------
    # Collaborators
    # -------------------------------------------------------------

    for study in studies:
        if study.creator_id == researcher_1.user_id:
            collaborator = researcher_2
        else:
            collaborator = researcher_1

        # Roughly half the studies have a collaborator.
        if random.random() < 0.5:
            db.session.add(
                StudyResearcher(
                    study_id=study.study_id,
                    researcher_id=collaborator.user_id,
                    access_level=random.choice(["editor", "viewer"]),
                    added_at=datetime.utcnow(),
                )
            )

    # -------------------------------------------------------------
    # Some regulator issues on pending studies
    # -------------------------------------------------------------

    create_demo_issues(regulator, studies)

    db.session.commit()

    # -------------------------------------------------------------
    # Console summary
    # -------------------------------------------------------------

    print("Seed data inserted successfully.")
    print("")
    print("Core demo credentials:")
    print("  Regulator:")
    print("    regulator@gmai.com / admin123")
    print("")
    print("  Researchers:")
    print("    alice@gmail.com / test123")
    print("    bob@gmail.com / test123")
    print("")
    print("  Participants:")
    print("    john@gmail.com / test123")
    print("    jane@gmail.com / test123")
    print("    sam@gmail.com / test123")
    print("    participant4@gmail.com / test123")
    print("")
    print("Seed summary:")
    print(f"  Participants: {len(participants)}")
    print(f"  Studies: {len(studies)}")
    print(f"  Fields: {len(fields)}")
    print("")
    print("Hardcoded fields:")
    print("  Field 1: sex_gender")
    print("  Field 2: postcode")
    print("")
    print("Postcode prefixes used:")
    print(f"  {', '.join(POSTCODE_PREFIXES)}")


# ---------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed demo data.")
    parser.add_argument(
        "--participants",
        type=int,
        default=DEFAULT_PARTICIPANT_COUNT,
        help=f"Number of participant accounts to create. Default: {DEFAULT_PARTICIPANT_COUNT}",
    )
    parser.add_argument(
        "--studies",
        type=int,
        default=DEFAULT_STUDY_COUNT,
        help=f"Number of studies to create. Default: {DEFAULT_STUDY_COUNT}",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=DEFAULT_RANDOM_SEED,
        help=f"Random seed for reproducible demo data. Default: {DEFAULT_RANDOM_SEED}",
    )

    args = parser.parse_args()

    if args.participants < 3:
        raise ValueError("participants must be at least 3 because john/jane/sam are fixed demo accounts")

    if args.studies < 1:
        raise ValueError("studies must be at least 1")

    app = create_app()

    with app.app_context():
        db.create_all()
        clear_data()
        seed_data(
            participant_count=args.participants,
            study_count=args.studies,
            random_seed=args.seed,
        )