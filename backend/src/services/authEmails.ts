import { env } from "../env.js";

type AuthEmailInput = {
  html: string;
  subject: string;
  text: string;
  to: string;
};

type UserEmailInput = {
  name: string;
  to: string;
  token: string;
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
  if (env.AUTH_EMAIL_PROVIDER === "console") {
    return {
      provider: "console" as const,
      queued: false
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from: env.AUTH_EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text
    }),
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json"
    },
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

export function buildVerificationUrl(token: string) {
  return authUrl("/verify-email", token);
}

export function buildPasswordResetUrl(token: string) {
  return authUrl("/reset-password", token);
}

export function verificationEmailContent(input: UserEmailInput) {
  const url = buildVerificationUrl(input.token);
  const name = escapeHtml(input.name);

  return {
    html: shellHtml(
      "Verify your ENTRAL email",
      `Hi ${name}, verify this email address before entering the private beta command center. This link expires in 24 hours.`,
      "Verify email",
      url
    ),
    subject: "Verify your ENTRAL email",
    text: `Hi ${input.name}, verify this email address before entering the private beta command center: ${url}\n\nThis link expires in 24 hours.`
  };
}

export function passwordResetEmailContent(input: UserEmailInput) {
  const url = buildPasswordResetUrl(input.token);
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

export async function sendVerificationEmail(input: UserEmailInput) {
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
