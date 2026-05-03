import re
from collections import defaultdict


K_ANONYMITY_THRESHOLD = 5
L_DIVERSITY_THRESHOLD = 2

QUASI_IDENTIFIER_FIELDS = [
    "sex_gender",
    "age",
    "postcode",
]

SENSITIVE_FIELDS = [
    "diagnosed_diabetes",
    "diagnosed_anxiety",
    "diagnosed_hypertension",
    "diagnosed_depression",
    "diagnosed_asthma",
    "vaccination_status",
    "mobility_limitations",
]


def normalise_answer(answer):
    if answer is None:
        return "Unknown"

    answer = str(answer).strip()

    if not answer:
        return "Unknown"

    return answer


def generalise_age(age):
    try:
        age = int(age)
    except (TypeError, ValueError):
        return "Unknown"

    if age < 25:
        return "18-24"
    if age < 35:
        return "25-34"
    if age < 45:
        return "35-44"
    if age < 55:
        return "45-54"
    if age < 65:
        return "55-64"

    return "65+"


def generalise_postcode(postcode):
    postcode = normalise_answer(postcode)

    if postcode == "Unknown":
        return "Unknown"

    match = re.match(r"^[A-Za-z]+", postcode.strip())

    if not match:
        return "Unknown"

    return match.group(0).upper()


def has_required_quasi_identifiers(record):
    return all(
        normalise_answer(record.get(field)) != "Unknown"
        for field in QUASI_IDENTIFIER_FIELDS
    )


def generalise_quasi_identifiers(record):
    return {
        "sex_gender": normalise_answer(record.get("sex_gender")),
        "age_range": generalise_age(record.get("age")),
        "postcode_area": generalise_postcode(record.get("postcode")),
    }


def get_group_key(quasi_identifiers):
    return (
        quasi_identifiers["sex_gender"],
        quasi_identifiers["age_range"],
        quasi_identifiers["postcode_area"],
    )


def passes_k_anonymity(group_records, k):
    return len(group_records) >= k


def passes_l_diversity(group_records, sensitive_fields, l):
    for field in sensitive_fields:
        distinct_values = {
            normalise_answer(record.get(field))
            for record in group_records
        }

        if len(distinct_values) < l:
            return False

    return True

def anonymise_study_records(records):
    """
    Takes participant records in this format:

    {
        participant_id: {
            "sex_gender": "Woman",
            "age": "28",
            "postcode": "SO17 1BJ",
            "diagnosed_diabetes": "No",
            ...
        }
    }

    Returns anonymised grouped data with no raw ages or postcodes
    """

    grouped_records = defaultdict(list)

    total_participants = len(records)
    eligible_participants = 0
    excluded_missing_quasi_identifiers = 0

    # First generalise quasi-identifiers and build groups
    for participant_id, record in records.items():
        if not has_required_quasi_identifiers(record):
            excluded_missing_quasi_identifiers += 1
            continue

        eligible_participants += 1

        quasi_identifiers = generalise_quasi_identifiers(record)
        group_key = get_group_key(quasi_identifiers)

        sensitive_answers = {
            field: normalise_answer(record.get(field))
            for field in SENSITIVE_FIELDS
        }

        grouped_records[group_key].append({
            "quasi_identifiers": quasi_identifiers,
            "sensitive_answers": sensitive_answers,
        })

    released_groups = []
    suppressed_by_k = 0
    suppressed_by_l = 0
    suppressed_participants_by_k = 0
    suppressed_participants_by_l = 0

    # Then apply k-anonymity and l-diversity
    for group_key, group_records in grouped_records.items():
        group_size = len(group_records)

        sensitive_records = [
            item["sensitive_answers"]
            for item in group_records
        ]

        if not passes_k_anonymity(sensitive_records, K_ANONYMITY_THRESHOLD):
            suppressed_by_k += 1
            suppressed_participants_by_k += group_size
            continue

        if not passes_l_diversity(
            sensitive_records,
            SENSITIVE_FIELDS,
            L_DIVERSITY_THRESHOLD
        ):
            suppressed_by_l += 1
            suppressed_participants_by_l += group_size
            continue

        first_record = group_records[0]

        released_groups.append({
            "group_id": f"G{len(released_groups) + 1}",
            "group_size": group_size,
            "quasi_identifiers": first_record["quasi_identifiers"],
            "records": sensitive_records,
        })

    released_participants = sum(
        group["group_size"]
        for group in released_groups
    )

    suppressed_participants = (
        excluded_missing_quasi_identifiers
        + suppressed_participants_by_k
        + suppressed_participants_by_l
    )

    return {
        "k": K_ANONYMITY_THRESHOLD,
        "l": L_DIVERSITY_THRESHOLD,
        "quasi_identifier_fields": QUASI_IDENTIFIER_FIELDS,
        "sensitive_fields": SENSITIVE_FIELDS,
        "summary": {
            "total_participants": total_participants,
            "eligible_participants": eligible_participants,
            "released_participants": released_participants,
            "suppressed_participants": suppressed_participants,
            "excluded_missing_quasi_identifiers": excluded_missing_quasi_identifiers,
            "released_groups": len(released_groups),
            "suppressed_groups": suppressed_by_k + suppressed_by_l,
            "suppressed_by_k": suppressed_by_k,
            "suppressed_by_l": suppressed_by_l,
        },
        "groups": released_groups,
    }