import { beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  delete process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_OWNER;
  delete process.env.GITHUB_REPO;
  delete process.env.VERCEL_TOKEN;
  delete process.env.VERCEL_ORG_ID;
  delete process.env.VERCEL_PROJECT_ID;
});

describe("development read-only connections", () => {
  it("keeps GitHub in Mock Mode when credentials are missing", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { getGitHubReadOnlyStatus } = await import("../src/services/developmentConnections.js");

    const status = await getGitHubReadOnlyStatus();

    expect(status.status).toBe("Missing Credentials");
    expect(status.missingEnvVars).toEqual(["GITHUB_TOKEN", "GITHUB_OWNER", "GITHUB_REPO"]);
    expect(status.writeActionsEnabled).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps Vercel in Mock Mode when credentials are missing", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { getVercelReadOnlyStatus } = await import("../src/services/developmentConnections.js");

    const status = await getVercelReadOnlyStatus();

    expect(status.status).toBe("Missing Credentials");
    expect(status.missingEnvVars).toEqual(["VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"]);
    expect(status.writeActionsEnabled).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("reads GitHub repository status without write actions", async () => {
    process.env.GITHUB_TOKEN = "ghp_readonly";
    process.env.GITHUB_OWNER = "mykai05";
    process.env.GITHUB_REPO = "ENTRAL-0.2";
    vi.stubGlobal("fetch", vi.fn(async (input: unknown) => {
      const url = String(input);

      if (url.includes("/commits")) {
        return jsonResponse([
          {
            sha: "abcdef1234567890",
            html_url: "https://github.com/mykai05/ENTRAL-0.2/commit/abcdef",
            commit: {
              author: { date: "2026-05-31T12:00:00.000Z", name: "ENTRAL" },
              message: "Add read-only status"
            }
          }
        ]);
      }

      if (url.includes("/pulls")) {
        return jsonResponse([{ number: 7, title: "Preview read-only status", html_url: "https://github.com/pr/7" }]);
      }

      if (url.includes("/actions/runs")) {
        return jsonResponse({ workflow_runs: [{ conclusion: "success", status: "completed" }] });
      }

      return jsonResponse({
        default_branch: "main",
        full_name: "mykai05/ENTRAL-0.2",
        html_url: "https://github.com/mykai05/ENTRAL-0.2",
        name: "ENTRAL-0.2",
        owner: { login: "mykai05" },
        pushed_at: "2026-05-31T12:10:00.000Z"
      });
    }));
    const { getGitHubReadOnlyStatus } = await import("../src/services/developmentConnections.js");

    const status = await getGitHubReadOnlyStatus();

    expect(status.status).toBe("Connected");
    expect(status.repository).toBe("mykai05/ENTRAL-0.2");
    expect(status.latestCommit?.message).toBe("Add read-only status");
    expect(status.workflowStatus).toBe("success");
    expect(status.readOnly).toBe(true);
    expect(status.writeActionsEnabled).toBe(false);
  });

  it("reads Vercel deployment status without write actions", async () => {
    process.env.VERCEL_TOKEN = "vercel_readonly";
    process.env.VERCEL_ORG_ID = "team_123";
    process.env.VERCEL_PROJECT_ID = "prj_123";
    vi.stubGlobal("fetch", vi.fn(async (input: unknown) => {
      const url = String(input);

      if (url.includes("/v6/deployments")) {
        return jsonResponse({
          deployments: [
            {
              created: 1798718400000,
              id: "dpl_ready",
              state: "READY",
              target: "production",
              url: "entral.vercel.app"
            }
          ]
        });
      }

      return jsonResponse({
        id: "prj_123",
        name: "entral-frontend",
        targets: {
          production: {
            alias: ["entral.vercel.app"]
          }
        }
      });
    }));
    const { getVercelReadOnlyStatus } = await import("../src/services/developmentConnections.js");

    const status = await getVercelReadOnlyStatus();

    expect(status.status).toBe("Connected");
    expect(status.projectName).toBe("entral-frontend");
    expect(status.productionDeployment?.status).toBe("READY");
    expect(status.productionUrl).toBe("https://entral.vercel.app");
    expect(status.readOnly).toBe(true);
    expect(status.writeActionsEnabled).toBe(false);
  });

  it("routes development status and refuses write actions", async () => {
    const {
      buildDevelopmentStatusAuditEntry,
      createReadOnlyWriteRefusal,
      getGitHubReadOnlyStatus,
      isDevelopmentStatusRequest,
      isDevelopmentWriteActionRequest
    } = await import("../src/services/developmentConnections.js");
    const status = await getGitHubReadOnlyStatus();
    const audit = buildDevelopmentStatusAuditEntry({ result: status, userRequest: "What was the latest commit?" });

    expect(isDevelopmentStatusRequest("What was the latest commit?")).toBe(true);
    expect(isDevelopmentWriteActionRequest("Push this to GitHub.")).toBe(true);
    expect(createReadOnlyWriteRefusal()).toContain("read-only");
    expect(audit.action).toBe("github.status.read");
    expect(audit.metadata?.writeActionsEnabled).toBe(false);
  });
});
