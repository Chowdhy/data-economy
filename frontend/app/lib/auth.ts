import type { User } from "~/lib/types";

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem("user");
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
