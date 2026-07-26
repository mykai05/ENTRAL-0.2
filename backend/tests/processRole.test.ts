import { describe, expect, it } from "vitest";
import {
  assertApiEntrypointRole,
  assertWorkerEntrypointRole,
  resolveProcessRole,
  shouldStartEmbeddedWorkers
} from "../src/processRole.js";

describe("process roles", () => {
  it("defaults production to an API-only process", () => {
    const role = resolveProcessRole({ nodeEnv: "production" });

    expect(role).toBe("api");
    expect(shouldStartEmbeddedWorkers(role)).toBe(false);
    expect(() => assertApiEntrypointRole(role)).not.toThrow();
  });

  it("keeps combined mode as a development and test convenience", () => {
    const developmentRole = resolveProcessRole({ nodeEnv: "development" });
    const testRole = resolveProcessRole({ nodeEnv: "test", processRole: "COMBINED" });

    expect(developmentRole).toBe("combined");
    expect(testRole).toBe("combined");
    expect(shouldStartEmbeddedWorkers(developmentRole)).toBe(true);
    expect(() => assertApiEntrypointRole(testRole)).not.toThrow();
  });

  it("rejects combined mode in production", () => {
    expect(() => resolveProcessRole({
      nodeEnv: "production",
      processRole: "combined"
    })).toThrow("PROCESS_ROLE=combined is not allowed in production");
  });

  it("keeps the API role API-only and rejects the worker role at the API entrypoint", () => {
    expect(() => assertApiEntrypointRole("api")).not.toThrow();
    expect(shouldStartEmbeddedWorkers("api")).toBe(false);
    expect(() => assertApiEntrypointRole("worker")).toThrow(
      "PROCESS_ROLE=worker cannot start the HTTP API entrypoint"
    );
  });

  it("requires the worker role at the worker entrypoint boundary", () => {
    expect(resolveProcessRole({
      nodeEnv: "production",
      processRole: "worker"
    })).toBe("worker");
    expect(() => assertWorkerEntrypointRole("worker")).not.toThrow();
    expect(() => assertWorkerEntrypointRole("api")).toThrow(
      "The worker entrypoint requires PROCESS_ROLE=worker"
    );
    expect(() => assertWorkerEntrypointRole("combined")).toThrow(
      "The worker entrypoint requires PROCESS_ROLE=worker"
    );
  });

  it("rejects blank and unknown explicit roles", () => {
    expect(() => resolveProcessRole({
      nodeEnv: "development",
      processRole: ""
    })).toThrow("PROCESS_ROLE must be one of");
    expect(() => resolveProcessRole({
      nodeEnv: "test",
      processRole: "scheduler"
    })).toThrow("PROCESS_ROLE must be one of");
  });
});
