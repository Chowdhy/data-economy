export type Role = "participant" | "researcher" | "regulator";

export type StudyStatus =
  | "open"
  | "ongoing"
  | "complete"
  | "pending"
  | "approved"
  | "rejected"
  | "closed";

export type FieldType = "text" | "enum";

export interface FieldOption {
  option_id: number;
  value: string;
  display_order: number;
}

export interface User {
  user_id: number;
  name: string;
  email: string;
  role_id: Role;
  requested_role?: Role | null;
  is_approved?: boolean;
  is_active?: boolean;
}

export interface FieldDescription {
  field_id: number;
  field_name: string;
  field_desc?: string | null;
  field_type: FieldType;
  options: FieldOption[];
}

export interface ParticipantAnswerField {
  field_id: number;
  field_name: string;
  field_description?: string | null;
  field_type: FieldType;

  // For participant answers, the backend returns options as string values,
  // e.g. ["Yes", "No", "Prefer not to say"].
  options: string[];

  // Still stored and submitted as a string.
  answer: string;
}

export interface ParticipantAnswersResponse {
  participant_id: number;
  answers: ParticipantAnswerField[];
}

export interface ParticipantStudy {
  study_id: number;
  study_name: string;
  description?: string;
  duration_months?: number;
  status: StudyStatus;
  joined_at: string;
  consent_all_fields: boolean;
  consented_field_ids: number[];
  required_field_ids: number[];
  optional_field_ids: number[];
}

export interface AvailableStudy {
  study_id: number;
  study_name: string;
  description?: string;
  duration_months?: number;
  data_collection_months?: number;
  research_duration_months?: number;
  status: StudyStatus;
  required_field_ids: number[];
  optional_field_ids: number[];
}

export interface ResearcherStudy {
  study_id: number;
  study_name: string;
  description?: string;
  data_collection_months?: number;
  research_duration_months?: number;
  status: StudyStatus;
  required_field_ids: number[];
  optional_field_ids: number[];
  participant_count: number;
  issue_count: number;
  reviewed_before: boolean;
  creator_id?: number;
  has_open_issue?: boolean;
  has_responded_issue?: boolean;
  is_creator?: boolean;
  access_level?: "owner" | "editor" | "viewer";
}

export interface RegulatorStudy {
  study_id: number;
  study_name: string;
  description?: string;
  data_collection_months?: number;
  research_duration_months?: number;
  status: StudyStatus;
  required_field_ids: number[];
  optional_field_ids: number[];
  creator_id?: number;
  participant_count?: number;
  issue_count: number;
  reviewed_before: boolean;
  has_open_issue?: boolean;
  has_responded_issue?: boolean;
  latest_issue_status?: "open" | "responded" | "resolved" | null;
}

export interface StudyField {
  field_id: number;

  // Your newer backend serializer returns both name/description and
  // field_name/field_desc in some places for compatibility.
  name: string;
  description?: string | null;

  field_name?: string;
  field_desc?: string | null;

  field_type?: FieldType;
  options?: FieldOption[];
}

export interface RegulatorStudyDetail extends RegulatorStudy {
  required_fields: StudyField[];
  optional_fields: StudyField[];
}

export interface StudyDetail {
  study_id: number;
  study_name: string;
  description?: string;
  data_collection_months?: number;
  research_duration_months?: number;
  status: StudyStatus;
  required_field_ids: number[];
  optional_field_ids: number[];
  participant_count: number;
}

export interface StudyDataField {
  field_id: number;
  field_name: string;
  field_desc?: string | null;
  answer: string | null;
}

export interface AnonymisedStudySummary {
  total_participants: number;
  eligible_participants: number;
  released_participants: number;
  suppressed_participants: number;
  excluded_missing_quasi_identifiers: number;
  released_groups: number;
  suppressed_groups: number;
  suppressed_by_k: number;
  suppressed_by_l: number;
}

export interface AnonymisedStudyPrivacy {
  method: string;
  k: number;
  l: number;
  candidate_quasi_identifier_fields: string[];
  candidate_sensitive_fields: string[];
  active_quasi_identifier_fields: string[];
  active_sensitive_fields: string[];
  active_other_fields: string[];
}

export interface AnonymisedGroup {
  group_id: string;
  group_size: number;
  quasi_identifiers: {
    age_range?: string;
    postcode_area?: string;
    sex_gender?: string;
    [key: string]: string | undefined;
  };
  field_value_counts: Record<string, Record<string, number>>;
}

export interface StudyDataResponse {
  study: {
    study_id: number;
    study_name: string;
    description?: string;
    data_collection_months?: number;
    research_duration_months?: number;
    status: StudyStatus | string;
  };

  privacy: AnonymisedStudyPrivacy;
  summary: AnonymisedStudySummary;
  groups: AnonymisedGroup[];

  // Temporary - delete after
  participants?: Record<string, StudyDataField[]>;
}

export interface StudyModificationFieldChange {
  field_id: number;
  name: string;
  description?: string | null;
  modification_type: "add" | "remove";
}

export interface StudyModification {
  modification_id: number;
  comment?: string | null;
  required_field_changes: StudyModificationFieldChange[];
  optional_field_changes: StudyModificationFieldChange[];
}

export interface StudyIssue {
  issue_id: number;
  study_id: number;
  regulator_id: number;
  comment?: string | null;
  status: string;
  flagged_field_ids: number[];
  flagged_fields?: StudyField[];
  created_at: string;
  modification?: StudyModification | null;
}

export interface ApiErrorResponse {
  error: string;
}

export interface CreateFieldResponse {
  message: string;
  field: FieldDescription;
}

export interface ActivityLog {
  log_id: number;
  user_id: number | null;
  study_id: number | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export type StudyResearcherAccessLevel = "owner" | "editor" | "viewer";

export interface StudyResearcher {
  researcher_id: number;
  name: string | null;
  email: string | null;
  access_level: StudyResearcherAccessLevel;
  added_at: string | null;
  is_creator: boolean;
}