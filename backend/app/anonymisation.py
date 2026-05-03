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