export type Role = "participant" | "researcher";

export type StudyStatus = "pending" | "approved" | "rejected" | "closed";

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

export interface ParticipantStudy {
  study_id: number;
  study_name: string;
  status: StudyStatus;
  joined_at: string;
  consent_all_fields: boolean;
  consented_field_ids: number[];
}

export interface ResearcherStudy {
  study_id: number;
  study_name: string;
  status: StudyStatus;
  required_field_ids: number[];
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
    status: StudyStatus | string;
  };
  participants: Record<string, StudyDataField[]>;
}

export interface ApiErrorResponse {
  error: string;
}