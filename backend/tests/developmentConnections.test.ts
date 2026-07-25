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
  process.env.INTEGRATION_REGISTRY_JSON = JSON.stringify([
    {
      integration_id: "123e4567-e89b-42d3-a456-426614174000",
      provider_code: "github",
      provider_name: "GitHub",
      provider_api_version: "2022-11-28",
      capability_codes: ["DEVELOPMENT_STATUS"],
      official_documentation_url: "https://docs.github.com/en/rest",
      stage: "ACTIVE",
      adapter_version: "1.0.0",
      auth_methods: ["API_KEY"],
      credential_reference_id: "223e4567-e89b-42d3-a456-426614174000",
      owning_business_id: "323e4567-e89b-42d3-a456-426614174000",
      granted_operation_codes: ["repository.status.read"],
      live_tested_at: "2026-07-24T00:00:00Z",
      active_at: "2026-07-24T01:00:00Z",
      evidence_ids: ["423e4567-e89b-42d3-a456-426614174000"],
      disabled_reason: null
    },
    {
      integration_id: "523e4567-e89b-42d3-a456-426614174000",
      provider_code: "vercel",
      provider_name: "Vercel",
      provider_api_version: "v9-projects+v6-deployments",
      capability_codes: ["DEPLOYMENT_STATUS"],
      official_documentation_url: "https://vercel.com/docs/rest-api",
      stage: "ACTIVE",
      adapter_version: "1.0.0",
      auth_methods: ["API_KEY"],
      credential_reference_id: "623e4567-e89b-42d3-a456-426614174000",
      owning_business_id: "723e4567-e89b-42d3-a456-426614174000",
      granted_operation_codes: ["deployment.status.read"],
      live_tested_at: "2026-07-24T00:00:00Z",
      active_at: "2026-07-24T01:00:00Z",
      evidence_ids: ["823e4567-e89b-42d3-a456-426614174000"],
      disabled_reason: null
    }
  ]);
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

  it("rejects GitHub provider contact when its registry record is inactive", async () => {
    process.env.GITHUB_TOKEN = "ghp_readonly";
    process.env.GITHUB_OWNER = "mykai05";
    process.env.GITHUB_REPO = "ENTRAL-0.2";
    const records = JSON.parse(process.env.INTEGRATION_REGISTRY_JSON!) as Array<Record<string, unknown>>;
    process.env.INTEGRATION_REGISTRY_JSON = JSON.stringify(records.map((record) => (
      record.provider_code === "github"
        ? { ...record, active_at: null, stage: "LIVE_TESTED" }
        : record
    )));
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { getGitHubConnectionState, getGitHubReadOnlyStatus } = await import("../src/services/developmentConnections.js");

    expect(getGitHubConnectionState().status).toBe("Disabled");
    expect((await getGitHubReadOnlyStatus()).status).toBe("Error");
    expect(fetchSpy).not.toHaveBeenCalled();
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
