import type {
  AvailableStudy,
  FieldDescription,
  ParticipantStudy,
  ResearcherStudy,
  StudyDetail,
  StudyDataResponse,
  User,
  ParticipantAnswersResponse,
  RegulatorStudyDetail,
  RegulatorStudy,
  StudyIssue,
} from "./types";
import { getAccessToken } from "./auth";

const API_BASE = "http://127.0.0.1:5000/api";

interface RequestOptions extends RequestInit {
  includeAuth?: boolean;
}

function getErrorMessage(data: unknown): string {
  if (typeof data === "string") {
    return data;
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;

    if (typeof record.error === "string") {
      return record.error;
    }

    if (typeof record.msg === "string") {
      return record.msg;
    }

    if (record.error && typeof record.error === "object") {
      const nestedError = record.error as Record<string, unknown>;

      if (typeof nestedError.message === "string") {
        return nestedError.message;
      }
    }

    if (typeof record.message === "string") {
      return record.message;
    }
  }

  return "Request failed";
}

async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const accessToken = options?.includeAuth === false ? null : getAccessToken();

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options?.headers || {}),
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(getErrorMessage(data));
  }

  return data;
}

export const api = {
  health: () => request<{ status: string }>("/health"),

  login: (payload: { email: string; password: string }) =>
    request<{
      message: string;
      access_token: string;
      user: User;
    }>("/login", {
      includeAuth: false,
      method: "POST",
      body: JSON.stringify(payload),
    }),

  createUser: (payload: {
    name: string;
    email: string;
    password: string;
    role_id: "participant" | "researcher";
  }) =>
    request<{
      message: string;
      user: User;
    }>("/users", {
      includeAuth: false,
      method: "POST",
      body: JSON.stringify(payload),
    }),

  createField: (payload: { field_name: string; field_desc?: string }) =>
    request("/fields", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getFields: () => request<{ fields: FieldDescription[] }>("/fields"),

  createStudy: (payload: {
    study_name: string;
    description: string;
    data_collection_months: number;
    research_duration_months: number;
    required_field_ids: number[];
    optional_field_ids: number[];
  }) =>
    request("/studies", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getParticipantStudies: (participantId: number) =>
    request<{ participant_id: number; studies: ParticipantStudy[] }>(
      `/participants/${participantId}/studies`,
    ),

  getAvailableStudies: (participantId: number) =>
    request<{ participant_id: number; studies: AvailableStudy[] }>(
      `/participants/${participantId}/available-studies`,
    ),

  getResearcherStudies: (researcherId: number) =>
    request<{ researcher_id: number; studies: ResearcherStudy[] }>(
      `/researchers/${researcherId}/studies`,
    ),

  getStudy: (studyId: number) =>
    request<{ study: StudyDetail }>(`/studies/${studyId}`),

  modifyStudy: (
    studyId: number,
    payload: {
      description: string;
      required_field_ids: number[];
      optional_field_ids: number[];
    },
  ) =>
    request<{
      message: string;
      study_id: number;
      status: string;
    }>(`/studies/${studyId}/modify`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  getStudyData: (studyId: number) =>
    request<StudyDataResponse>(`/studies/${studyId}/data`),

  joinStudy: (studyId: number, participant_id: number) =>
    request(`/studies/${studyId}/join`, {
      method: "POST",
      body: JSON.stringify({ participant_id }),
    }),

  modifyConsent: (
    studyId: number,
    participant_id: number,
    consented_field_ids: number[],
  ) =>
    request<{
      message: string;
      study_id: number;
      participant_id: number;
      consented_field_ids?: number[];
      consent_all_fields?: boolean;
    }>(`/studies/${studyId}/consent/modify`, {
      method: "POST",
      body: JSON.stringify({ participant_id, consented_field_ids }),
    }),

  withdrawFromStudy: (studyId: number, participant_id: number) =>
    request(`/studies/${studyId}/withdraw`, {
      method: "POST",
      body: JSON.stringify({ participant_id }),
    }),

  getParticipantAnswers: (participantId: number) =>
    request<ParticipantAnswersResponse>(`/participants/${participantId}/answers`),

  saveAnswers: (
    participantId: number,
    answers: { field_name: string; answer: string }[],
  ) =>
    request(`/participants/${participantId}/answers`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),

  getPendingStudies: () =>
    request<{ studies: RegulatorStudy[] }>("/admin/studies/pending"),

  approveStudy: (studyId: number) =>
    request<{
      message: string;
      study_id: number;
      new_status: string;
      approved_at: string;
      open_until: string;
      ongoing_until: string;
    }>(`/admin/studies/${studyId}/approve`, {
      method: "POST",
    }),

  rejectStudy: (studyId: number, reason?: string) =>
    request<{
      message: string;
      study_id: number;
      reason: string;
      new_status: string;
    }>(`/admin/studies/${studyId}/reject`, {
      method: "POST",
      body: JSON.stringify(reason ? { reason } : {}),
    }),

  getRegulatorStudyDetail: async (
    studyId: number,
  ): Promise<RegulatorStudyDetail> => {
    const response = await request<{ study: RegulatorStudyDetail }>(
      `/admin/studies/${studyId}`,
    );

    return response.study;
  },

  raiseStudyIssues: (
    studyId: number,
    payload: { comment?: string; flagged_field_ids: number[] },
  ) =>
    request<{
      message: string;
      issue: StudyIssue;
    }>(`/admin/studies/${studyId}/issues`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getStudyIssues: (studyId: number) =>
    request<{
      issues: StudyIssue[];
    }>(`/admin/studies/${studyId}/issues`),
};