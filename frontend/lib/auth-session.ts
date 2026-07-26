"use client";

export const authenticatedUserSessionKey = "entral-authenticated-user";

export type AuthenticatedUserIdentity = {
  userId: string;
};

export type AuthenticatedUserSession = {
  email: string;
  role: "USER" | "ADMIN";
  userId: string;
};

export function readAuthenticatedUserSession(): AuthenticatedUserSession | null {
  try {
    const value = window.sessionStorage.getItem(authenticatedUserSessionKey);
    const session = value ? JSON.parse(value) as unknown : null;
    if (
      typeof session !== "object"
      || session === null
      || !("email" in session)
      || typeof session.email !== "string"
      || !("role" in session)
      || (session.role !== "USER" && session.role !== "ADMIN")
      || !("userId" in session)
      || typeof session.userId !== "string"
    ) {
      return null;
    }
    return session as AuthenticatedUserSession;
  } catch {
    return null;
  }
}

function publishAuthenticatedUserIdentity(identity: AuthenticatedUserIdentity) {
  try {
    window.sessionStorage.setItem(authenticatedUserSessionKey, JSON.stringify(identity));
  } catch {
    // Session storage is a convenience signal; the backend remains authoritative.
  }

  window.dispatchEvent(new CustomEvent("entral:user-authenticated", { detail: identity }));
}

export function writeAuthenticatedUserIdentity(identity: AuthenticatedUserIdentity) {
  publishAuthenticatedUserIdentity(identity);
}

export function writeAuthenticatedUserSession(session: AuthenticatedUserSession) {
  publishAuthenticatedUserIdentity(session);
}

export function clearAuthenticatedUserSession() {
  try {
    window.sessionStorage.removeItem(authenticatedUserSessionKey);
  } catch {
    // The backend session is still authoritative if storage is unavailable.
  }

  window.dispatchEvent(new Event("entral:user-signed-out"));
}
