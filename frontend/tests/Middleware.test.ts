import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "../middleware";

function memberToken() {
  const payload = Buffer.from(JSON.stringify({
    aud: "entral-member",
    exp: Math.floor(Date.now() / 1000) + 3600,
    session: "member"
  })).toString("base64url");
  return `header.${payload}.signature`;
}

describe("member middleware", () => {
  it("maps the internal Graph alias into the protected member Graph", () => {
    const response = middleware(new NextRequest("https://entral.local/graph?entity=marshal-1", {
      headers: {
        cookie: `entral_token=${memberToken()}`
      }
    }));

    expect(response.headers.get("location")).toBe(
      "https://entral.local/member/graph"
    );
  });

  it("maps legacy agent navigation into member Infrastructure", () => {
    const response = middleware(new NextRequest("https://entral.local/agents", {
      headers: {
        cookie: `entral_token=${memberToken()}`
      }
    }));

    expect(response.headers.get("location")).toBe(
      "https://entral.local/member/infrastructure?section=agents"
    );
  });

  it("retires the old onboarding route into member sign-in", () => {
    const response = middleware(new NextRequest("https://entral.local/onboarding"));

    expect(response.headers.get("location")).toBe(
      "https://entral.local/member/sign-in"
    );
  });
});
