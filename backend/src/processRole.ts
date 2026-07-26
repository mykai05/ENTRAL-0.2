export type ProcessRole = "api" | "worker" | "combined";

type NodeEnvironment = "development" | "test" | "production";

type ResolveProcessRoleInput = {
  nodeEnv: NodeEnvironment;
  processRole?: string;
};

const validProcessRoles = new Set<ProcessRole>(["api", "worker", "combined"]);

export function resolveProcessRole(input: ResolveProcessRoleInput): ProcessRole {
  const role = input.processRole === undefined
    ? input.nodeEnv === "production" ? "api" : "combined"
    : input.processRole.trim().toLowerCase();

  if (!validProcessRoles.has(role as ProcessRole)) {
    throw new Error("PROCESS_ROLE must be one of: api, worker, combined.");
  }

  if (input.nodeEnv === "production" && role === "combined") {
    throw new Error("PROCESS_ROLE=combined is not allowed in production. Run separate api and worker processes.");
  }

  return role as ProcessRole;
}

export function assertApiEntrypointRole(role: ProcessRole) {
  if (role === "worker") {
    throw new Error("PROCESS_ROLE=worker cannot start the HTTP API entrypoint.");
  }
}

export function assertWorkerEntrypointRole(role: ProcessRole) {
  if (role !== "worker") {
    throw new Error("The worker entrypoint requires PROCESS_ROLE=worker.");
  }
}

export function shouldStartEmbeddedWorkers(role: ProcessRole) {
  return role === "combined";
}
