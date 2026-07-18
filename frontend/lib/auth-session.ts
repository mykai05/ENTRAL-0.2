"use client";

export const authenticatedUserSessionKey = "entral-authenticated-user";

export type AuthenticatedUserSession = {
  email: string;
  role: "USER" | "ADMIN";
  userId: string;
};

export function readAuthenticatedUserSession(): AuthenticatedUserSession | null {
  try {
    const value = window.sessionStorage.getItem(authenticatedUserSessionKey);
    return value ? JSON.parse(value) as AuthenticatedUserSession : null;
  } catch {
    return null;
  }
}

export function writeAuthenticatedUserSession(session: AuthenticatedUserSession) {
  try {
    window.sessionStorage.setItem(authenticatedUserSessionKey, JSON.stringify(session));
  } catch {
    // Session storage is a convenience signal; the backend remains authoritative.
  }

  window.dispatchEvent(new CustomEvent("entral:user-authenticated", { detail: session }));
}

export function clearAuthenticatedUserSession() {
  try {
    window.sessionStorage.removeItem(authenticatedUserSessionKey);
  } catch {
    // The backend session is still authoritative if storage is unavailable.
  }

  window.dispatchEvent(new Event("entral:user-signed-out"));
}
