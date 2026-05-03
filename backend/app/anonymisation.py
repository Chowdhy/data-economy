import re
from collections import defaultdict


K_ANONYMITY_THRESHOLD = 5
L_DIVERSITY_THRESHOLD = 2

K_ANONYMITY_CANDIDATE_FIELDS = [
    "sex_gender",
    "age",
    "postcode",
]

L_DIVERSITY_CANDIDATE_FIELDS = [
    "diagnosed_diabetes",
    "diagnosed_anxiety",
    "diagnosed_hypertension",
    "diagnosed_depression",
    "diagnosed_asthma",
    "mobility_limitations",
    "vaccination_status",
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
    
    # e.g. "SO17 1AB" becomes "SO".
    return match.group(0).upper()

def generalise_gender(gender):
    gender = normalise_answer(gender)

    if gender == "Man":
        return "Man"

    if gender == "Woman":
        return "Woman"

    if gender == "Unknown":
        return "Unknown"

    return "Other"


def generalise_quasi_identifier(field_name, value):
    if field_name == "age":
        return generalise_age(value)

    if field_name == "postcode":
        return generalise_postcode(value)

    if field_name == "sex_gender":
        return generalise_gender(value)

    return normalise_answer(value)


def get_output_quasi_identifier_name(field_name):
    if field_name == "age":
        return "age_range"

    if field_name == "postcode":
        return "postcode_area"

    return field_name


def get_active_candidate_fields(consented_field_names, candidate_fields):
    return [
        field_name
        for field_name in candidate_fields
        if field_name in consented_field_names
    ]


def has_required_quasi_identifiers(record, active_quasi_identifier_fields):
    for field_name in active_quasi_identifier_fields:
        if normalise_answer(record.get(field_name)) == "Unknown":
            return False

    return True


def generalise_quasi_identifiers(record, active_quasi_identifier_fields):
    generalised = {}

    for field_name in active_quasi_identifier_fields:
        output_name = get_output_quasi_identifier_name(field_name)
        generalised[output_name] = generalise_quasi_identifier(
            field_name,
            record.get(field_name),
        )

    return generalised


def get_group_key(generalised_quasi_identifiers, active_quasi_identifier_fields):
    # If the study did not request any quasi-identifiers, all participants belong to one overall group
    if not active_quasi_identifier_fields:
        return ("all_participants",)

    return tuple(
        generalised_quasi_identifiers[
            get_output_quasi_identifier_name(field_name)
        ]
        for field_name in active_quasi_identifier_fields
    )


def passes_k_anonymity(group_records, k):
    return len(group_records) >= k


def passes_l_diversity(group_sensitive_records, active_sensitive_fields, l):
    # If the study does not request any configured sensitive fields, there is no l-diversity check to apply
    if not active_sensitive_fields:
        return True

    for field_name in active_sensitive_fields:
        known_values = {
            normalise_answer(record.get(field_name))
            for record in group_sensitive_records
            if normalise_answer(record.get(field_name)) != "Unknown"
        }

        # If this sensitive field is being released by the study, but this group has no known values for it, the group should not be released.
        #UNSURE ABOUT THIS BUT LETS SEE
        if not known_values:
            return False

        if len(known_values) < l:
            return False

    return True


def build_sensitive_answers(record, active_sensitive_fields):
    return {
        field_name: normalise_answer(record.get(field_name))
        for field_name in active_sensitive_fields
    }


def anonymise_study_records(
    records,
    active_quasi_identifier_fields,
    active_sensitive_fields,
):

    grouped_records = defaultdict(list)

    total_participants = len(records)
    eligible_participants = 0
    excluded_missing_quasi_identifiers = 0

    for participant_id, record in records.items():
        if not has_required_quasi_identifiers(
            record,
            active_quasi_identifier_fields,
        ):
            excluded_missing_quasi_identifiers += 1
            continue

        eligible_participants += 1

        generalised_quasi_identifiers = generalise_quasi_identifiers(
            record,
            active_quasi_identifier_fields,
        )

        group_key = get_group_key(
            generalised_quasi_identifiers,
            active_quasi_identifier_fields,
        )

        sensitive_answers = build_sensitive_answers(
            record,
            active_sensitive_fields,
        )

        grouped_records[group_key].append({
            "quasi_identifiers": generalised_quasi_identifiers,
            "sensitive_answers": sensitive_answers,
        })

    released_groups = []
    suppressed_by_k = 0
    suppressed_by_l = 0
    suppressed_participants_by_k = 0
    suppressed_participants_by_l = 0

    for group_key, group_items in grouped_records.items():
        group_size = len(group_items)

        sensitive_records = [
            item["sensitive_answers"]
            for item in group_items
        ]

        if not passes_k_anonymity(group_items, K_ANONYMITY_THRESHOLD):
            suppressed_by_k += 1
            suppressed_participants_by_k += group_size
            continue

        if not passes_l_diversity(
            sensitive_records,
            active_sensitive_fields,
            L_DIVERSITY_THRESHOLD,
        ):
            suppressed_by_l += 1
            suppressed_participants_by_l += group_size
            continue

        first_item = group_items[0]

        released_groups.append({
            "group_id": f"G{len(released_groups) + 1}",
            "group_size": group_size,
            "quasi_identifiers": first_item["quasi_identifiers"],
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
        "candidate_quasi_identifier_fields": K_ANONYMITY_CANDIDATE_FIELDS,
        "candidate_sensitive_fields": L_DIVERSITY_CANDIDATE_FIELDS,
        "active_quasi_identifier_fields": active_quasi_identifier_fields,
        "active_sensitive_fields": active_sensitive_fields,
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