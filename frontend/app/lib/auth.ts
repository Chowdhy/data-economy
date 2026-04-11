import type { Role, User } from "~/lib/types";

const USER_STORAGE_KEY = "user";
const TOKEN_STORAGE_KEY = "access_token";
const SESSION_STORAGE_KEY = "auth_sessions_v1";

export interface StoredSession {
  user: User;
  accessToken: string;
  lastUsedAt: string;
}

function readStoredSessions(): StoredSession[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as StoredSession[];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (session) =>
        Boolean(session?.user?.user_id) &&
        Boolean(session?.user?.email) &&
        Boolean(session?.accessToken),
    );
  } catch {
    return [];
  }
}

function writeStoredSessions(sessions: StoredSession[]) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(USER_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthSession(user: User, accessToken: string) {
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  window.localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);

  const nextSession: StoredSession = {
    user,
    accessToken,
    lastUsedAt: new Date().toISOString(),
  };

  const sessions = readStoredSessions();
  const remaining = sessions.filter(
    (session) => session.user.user_id !== user.user_id,
  );

  writeStoredSessions([nextSession, ...remaining]);
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(USER_STORAGE_KEY);
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function getSavedSessions() {
  return readStoredSessions();
}

export function switchAccount(userId: number) {
  if (typeof window === "undefined") return false;

  const sessions = readStoredSessions();
  const targetSession = sessions.find((session) => session.user.user_id === userId);

  if (!targetSession) {
    return false;
  }

  setAuthSession(targetSession.user, targetSession.accessToken);
  return true;
}

export function getDefaultRouteForRole(role: Role) {
  if (role === "participant") {
    return "/participant/dashboard";
  }
  if (role === "researcher") {
    return "/researcher/dashboard";
  }
  if (role === "regulator") {
    return "/regulator/dashboard";
  }
  // fallback (optional)
  return "/";
}
