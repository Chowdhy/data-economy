import type { User } from "~/lib/types";

const USER_STORAGE_KEY = "user";
const TOKEN_STORAGE_KEY = "access_token";

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
}
