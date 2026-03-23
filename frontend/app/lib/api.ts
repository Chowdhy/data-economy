import type {
  ParticipantStudy,
  ResearcherStudy,
  StudyDataResponse,
} from "./types";

const API_BASE = "http://127.0.0.1:5000";

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

  createUser: (payload: {
    name: string;
    email: string;
    password_hash: string;
    role_id: "participant" | "researcher";
  }) =>
    request("/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  createField: (payload: { field_name: string; field_desc?: string }) =>
    request("/fields", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  createStudy: (payload: {
    study_name: string;
    creator_id: number;
    status?: "pending" | "approved" | "rejected" | "closed";
    field_ids?: number[];
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

  getStudyData: (studyId: number) =>
    request<StudyDataResponse>(`/studies/${studyId}/data`),

  joinStudy: (studyId: number, participant_id: number) =>
    request(`/studies/${studyId}/join`, {
      method: "POST",
      body: JSON.stringify({ participant_id }),
    }),

  withdrawConsentFields: (
    studyId: number,
    participant_id: number,
    field_ids: number[]
  ) =>
    request(`/studies/${studyId}/consent/withdraw`, {
      method: "POST",
      body: JSON.stringify({ participant_id, field_ids }),
    }),

  regrantConsentFields: (
    studyId: number,
    participant_id: number,
    field_ids: number[]
  ) =>
    request(`/studies/${studyId}/consent/regrant`, {
      method: "POST",
      body: JSON.stringify({ participant_id, field_ids }),
    }),

  withdrawFromStudy: (studyId: number, participant_id: number) =>
    request(`/studies/${studyId}/withdraw`, {
      method: "POST",
      body: JSON.stringify({ participant_id }),
    }),

  saveAnswers: (
    participantId: number,
    answers: { field_id: number; answer: string }[]
  ) =>
    request(`/participants/${participantId}/answers`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),
};