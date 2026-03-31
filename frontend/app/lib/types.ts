export type Role = "participant" | "researcher";

export type StudyStatus =
  | "open"
  | "ongoing"
  | "complete"
  | "pending"
  | "approved"
  | "rejected"
  | "closed";

export interface User {
  user_id: number;
  name: string;
  email: string;
  role_id: Role;
}

export interface FieldDescription {
  field_id: number;
  field_name: string;
  field_desc?: string | null;
}

export interface ParticipantAnswerField {
  field_name: string;
  field_description?: string | null;
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
  status: StudyStatus;
  required_field_ids: number[];
  optional_field_ids: number[];
}

export interface ResearcherStudy {
  study_id: number;
  study_name: string;
  description?: string;
  duration_months?: number;
  status: StudyStatus;
  required_field_ids: number[];
  optional_field_ids: number[];
  participant_count: number;
}

export interface StudyDetail {
  study_id: number;
  study_name: string;
  description?: string;
  duration_months?: number;
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

export interface StudyDataResponse {
  study: {
    study_id: number;
    study_name: string;
    description?: string;
    duration_months?: number;
    status: StudyStatus | string;
  };
  participants: Record<string, StudyDataField[]>;
}

export interface ApiErrorResponse {
  error: string;
}
