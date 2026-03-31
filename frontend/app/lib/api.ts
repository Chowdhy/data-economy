import type {
  FieldDescription,
  ParticipantStudy,
  ResearcherStudy,
  StudyDetail,
  StudyDataResponse,
  User,
  ParticipantAnswersResponse,
} from "./types";

const API_BASE = "http://127.0.0.1:5000/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

export const api = {
  health: () => request<{ status: string }>("/health"),

  login: (payload: { email: string; password: string }) =>
    request<{
      message: string;
      user: User;
    }>("/login", {
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
    duration_months: number;
    creator_id: number;
    required_field_ids: number[];
    optional_field_ids: number[];
  }) =>
    request("/studies", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getParticipantStudies: (participantId: number) =>
    request<{ participant_id: number; studies: ParticipantStudy[] }>(
      `/participants/${participantId}/studies`
    ),

  getResearcherStudies: (researcherId: number) =>
    request<{ researcher_id: number; studies: ResearcherStudy[] }>(
      `/researchers/${researcherId}/studies`
    ),

  getStudy: (studyId: number) =>
    request<{ study: StudyDetail }>(`/studies/${studyId}`),

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
    consented_field_ids: number[]
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
    answers: { field_name: string; answer: string }[]
  ) =>
    request(`/participants/${participantId}/answers`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),

  updateStudyStatus: (studyId: number, status: "open" | "ongoing" | "complete") =>
    request<{ message: string; study_id: number; status: string }>(
      `/studies/${studyId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }
    ),
};
