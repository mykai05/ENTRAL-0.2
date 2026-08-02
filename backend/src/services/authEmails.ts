import { ContractError } from "@entral/contracts";
import { env } from "../env.js";
import { safeCanonicalMemberReturnPath } from "../schemas.js";
import { getProviderExecutionAuthorization } from "./integrationRegistry.js";

export const resendAdapterVersion = "1.0.0";
export const resendProviderApiVersion = "v1";
export const resendSendOperationCode = "email.send";

type AuthEmailInput = {
  html: string;
  idempotencyKey?: string;
  subject: string;
  text: string;
  to: string;
};

type UserEmailInput = {
  flow?: "internal" | "member";
  name: string;
  to: string;
  token: string;
};

type VerificationEmailInput = UserEmailInput & {
  next?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function authUrl(pathname: string, token: string) {
  const url = new URL(pathname, env.APP_PUBLIC_URL);
  url.searchParams.set("token", token);
  return url.toString();
}

export function buildMembershipInvitationUrl(token: string) {
  return authUrl("/member/invitations/accept", token);
}

function shellHtml(title: string, body: string, buttonLabel: string, url: string) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#101820">
      <h1 style="font-size:22px;margin:0 0 12px">${escapeHtml(title)}</h1>
      <p>${body}</p>
      <p>
        <a href="${escapeHtml(url)}" style="display:inline-block;background:#00d9ff;color:#020202;font-weight:700;padding:12px 16px;border-radius:8px;text-decoration:none">
          ${escapeHtml(buttonLabel)}
        </a>
      </p>
      <p style="color:#52606d;font-size:13px">ENTRAL is an AI command center for organizing, planning, monitoring, and safely preparing business operations. Sensitive actions stay behind permissions, logging, and human approval gates.</p>
    </div>
  `;
}

async function deliverAuthEmail(input: AuthEmailInput) {
  if (input.idempotencyKey !== undefined
    && (input.idempotencyKey.length === 0 || input.idempotencyKey.length > 256)) {
    throw new Error("AUTH_EMAIL_IDEMPOTENCY_KEY_INVALID");
  }
  if (env.AUTH_EMAIL_PROVIDER === "console") {
    return {
      provider: "console" as const,
      queued: false
    };
  }

  const authorization = getProviderExecutionAuthorization("resend", resendSendOperationCode);
  if (
    authorization.requirement.provider_api_version !== resendProviderApiVersion ||
    authorization.requirement.adapter_version !== resendAdapterVersion
  ) {
    throw new ContractError(
      "INTEGRATION_VERSION_MISMATCH",
      "Resend execution requires the exact active provider API and adapter versions"
    );
  }

  const headers: Record<string, string> = {
    authorization: `Bearer ${env.RESEND_API_KEY}`,
    "content-type": "application/json"
  };
  if (input.idempotencyKey) headers["idempotency-key"] = input.idempotencyKey;

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from: env.AUTH_EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text
    }),
    headers,
    method: "POST"
  });

  const payload = await response.json().catch(() => null) as { id?: unknown; message?: unknown } | null;

  if (!response.ok) {
    throw new Error(`Auth email delivery failed with status ${response.status}: ${payload?.message ?? "Unknown provider error"}`);
  }

  return {
    provider: "resend" as const,
    queued: true,
    messageId: typeof payload?.id === "string" ? payload.id : undefined
  };
}

export function buildVerificationUrl(token: string, flow: "internal" | "member" = "internal", next?: string) {
  const url = new URL(authUrl(flow === "member" ? "/member/verify-email" : "/verify-email", token));
  const safeNext = safeCanonicalMemberReturnPath(next);
  const matchesFlow = safeNext
    ? flow === "member"
      ? safeNext.startsWith("/member/")
      : !safeNext.startsWith("/member/")
    : false;
  if (safeNext && matchesFlow) {
    url.searchParams.set("next", safeNext);
  }
  return url.toString();
}

export function buildPasswordResetUrl(token: string, flow: "internal" | "member" = "internal") {
  return authUrl(flow === "member" ? "/member/password-reset" : "/reset-password", token);
}

export function verificationEmailContent(input: VerificationEmailInput) {
  const url = buildVerificationUrl(input.token, input.flow, input.next);
  const name = escapeHtml(input.name);
  const destination = input.flow === "member" ? "member workspace" : "private beta command center";

  return {
    html: shellHtml(
      "Verify your ENTRAL email",
      `Hi ${name}, verify this email address before entering the ${destination}. This link expires in 24 hours.`,
      "Verify email",
      url
    ),
    subject: "Verify your ENTRAL email",
    text: `Hi ${input.name}, verify this email address before entering the ${destination}: ${url}\n\nThis link expires in 24 hours.`
  };
}

export function passwordResetEmailContent(input: UserEmailInput) {
  const url = buildPasswordResetUrl(input.token, input.flow);
  const name = escapeHtml(input.name);

  return {
    html: shellHtml(
      "Reset your ENTRAL password",
      `Hi ${name}, use this secure link to set a new password for your ENTRAL account. This link expires in 1 hour.`,
      "Reset password",
      url
    ),
    subject: "Reset your ENTRAL password",
    text: `Hi ${input.name}, use this secure link to set a new password for your ENTRAL account: ${url}\n\nThis link expires in 1 hour.`
  };
}

export async function sendVerificationEmail(input: VerificationEmailInput) {
  return deliverAuthEmail({
    to: input.to,
    ...verificationEmailContent(input)
  });
}

export async function sendPasswordResetEmail(input: UserEmailInput) {
  return deliverAuthEmail({
    to: input.to,
    ...passwordResetEmailContent(input)
  });
}

export async function sendMembershipInvitationEmail(input: {
  idempotencyKey: string;
  organizationName: string;
  role: string;
  to: string;
  token: string;
}) {
  const url = buildMembershipInvitationUrl(input.token);
  return deliverAuthEmail({
    idempotencyKey: input.idempotencyKey,
    to: input.to,
    subject: `You're invited to ${input.organizationName} in ENTRAL`,
    text: `You were invited to ${input.organizationName} in ENTRAL with the ${input.role} role. Accept the invitation: ${url}\n\nThis invitation is scoped to that organization and expires automatically.`,
    html: shellHtml(
      `Join ${input.organizationName} in ENTRAL`,
      `You were invited with the ${escapeHtml(input.role)} role. The invitation is scoped to this organization and expires automatically.`,
      "Accept invitation",
      url
    )
  });
}

export async function sendMembershipChangeEmail(input: {
  action: string;
  idempotencyKey: string;
  organizationName: string;
  to: string;
}) {
  return deliverAuthEmail({
    idempotencyKey: input.idempotencyKey,
    to: input.to,
    subject: `Your ${input.organizationName} membership changed`,
    text: `Your membership in ${input.organizationName} was changed: ${input.action}. Sign in to ENTRAL to review the current status.`,
    html: shellHtml(
      "Your ENTRAL membership changed",
      `Your membership in ${escapeHtml(input.organizationName)} was changed: ${escapeHtml(input.action)}. Sign in to review the current status.`,
      "Review account",
      new URL("/member/account/security", env.APP_PUBLIC_URL).toString()
    )
  });
}
