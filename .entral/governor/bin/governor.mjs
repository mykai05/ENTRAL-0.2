#!/usr/bin/env node
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  EXECUTION_MODEL,
  GovernorError,
  validateNamedContract
} from "../lib/contracts.mjs";
import {
  activatePhase,
  addConditionalReviewTrigger,
  applyImprovementAmendment,
  blockProgram,
  checkpointSession,
  claimTask,
  compileContext,
  createReviewPacket,
  createTask,
  eventLogSummary,
  getStatus,
  getImprovementBacklog,
  getImprovementEvidence,
  heartbeatTask,
  ingestReviewVerdict,
  initializeGovernor,
  intakeImprovementCandidate,
  loadProgram,
  markReviewCorrectionsComplete,
  nextAction,
  decideImprovement,
  measureImprovement,
  recordIncident,
  recordResult,
  runImprovementCycle,
  resumeGovernor,
  certifyPhase,
  unblockProgram,
  verifyGovernor
} from "../lib/governor.mjs";
import { governorPath, loadState, readJson, sha256 } from "../lib/store.mjs";
import {
  createIsolatedWorktree,
  createReleaseEvidenceBundle,
  evaluateRelease,
  executeBoundedRollback,
  inspectRepositories,
  mergeProtectedMain,
  reconcileRepository,
  selectTargetedTests
} from "../lib/release-controller.mjs";

function parseArguments(argv) {
  const result = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) {
      result._.push(argument);
      continue;
    }
    const separator = argument.indexOf("=");
    if (separator > 2) {
      result[argument.slice(2, separator)] = argument.slice(separator + 1);
      continue;
    }
    const key = argument.slice(2);
    const candidate = argv[index + 1];
    if (candidate !== undefined && !candidate.startsWith("--")) {
      result[key] = candidate;
      index += 1;
    } else {
      result[key] = true;
    }
  }
  return result;
}

function findRepositoryRoot(start) {
  let current = path.resolve(start);
  while (true) {
    if (existsSync(path.join(current, ".git")) && existsSync(path.join(current, "package.json"))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new GovernorError("REPOSITORY_NOT_FOUND", "Run the Governor inside the ENTRAL Git repository or supply --root");
    current = parent;
  }
}

function authorization(args) {
  return {
    actor: args.actor ?? EXECUTION_MODEL,
    sessionId: args["session-id"]
  };
}

function requireArgument(args, name) {
  const value = args[name];
  if (typeof value !== "string" || !value.trim()) throw new GovernorError("MISSING_ARGUMENT", `--${name} is required`);
  return value;
}

function integerArgument(args, name, options = {}) {
  const value = Number(requireArgument(args, name));
  if (!Number.isSafeInteger(value) || (options.minimum !== undefined && value < options.minimum)) throw new GovernorError("INVALID_ARGUMENT", `--${name} must be an integer${options.minimum !== undefined ? ` >= ${options.minimum}` : ""}`);
  return value;
}

async function readDocument(repositoryRoot, file) {
  const absolute = path.isAbsolute(file) ? path.resolve(file) : path.resolve(repositoryRoot, file);
  if (!absolute.startsWith(`${path.resolve(repositoryRoot)}${path.sep}`)) throw new GovernorError("DOCUMENT_OUTSIDE_REPOSITORY", `Input document must be committed inside ${repositoryRoot}`);
  let raw;
  try {
    raw = await readFile(absolute, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") throw new GovernorError("MISSING_DOCUMENT", `Document does not exist: ${file}`);
    throw error;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new GovernorError("INVALID_JSON", `Document is not valid JSON: ${file}: ${error.message}`);
  }
}

function printResult(value, { human = null } = {}) {
  if (human) process.stdout.write(`${human}\n`);
  else process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function help() {
  return `ENTRAL Development Governor\n\n` +
    `Usage: pnpm governor <command> [options]\n\n` +
    `Commands:\n` +
    `  initialize, status, activate-phase, create-task, claim-task, heartbeat,\n` +
    `  record-result, fail-task, block, unblock, checkpoint, resume, certify-phase, next,\n` +
    `  context, verify, events, validate-contract, create-review, ingest-review,\n` +
    `  complete-review-corrections, add-review-trigger, record-incident,\n` +
    `  improvement-intake, improvement-cycle, improvement-backlog, improvement-show,\n` +
    `  improvement-decide, improvement-measure, improvement-apply-amendment,\n` +
    `  release-inspect, release-create-worktree, release-reconcile, release-evaluate,\n` +
    `  release-bundle, release-merge, release-rollback, release-select-tests\n\n` +
    `Every mutation requires --session-id and is restricted to --actor ${EXECUTION_MODEL}.\n`;
}

async function main() {
  const [command = "help", ...rest] = process.argv.slice(2);
  const args = parseArguments(rest);
  const repositoryRoot = findRepositoryRoot(args.root ?? process.cwd());
  const auth = authorization(args);

  switch (command) {
    case "help":
    case "--help":
    case "-h":
      printResult(null, { human: help() });
      return;
    case "initialize": {
      const program = await readDocument(repositoryRoot, args.program ?? ".entral/governor/program/PHASE_DAG.v1.json");
      const release = await readDocument(repositoryRoot, args.release ?? ".entral/governor/releases/phase-195.json");
      printResult(await initializeGovernor(repositoryRoot, auth, {
        program,
        latestVerifiedMainSha: requireArgument(args, "latest-main-sha"),
        latestProductionRelease: release,
        certifiedPhases: [195]
      }));
      return;
    }
    case "status": {
      const tokensRemaining = args["tokens-remaining"] === undefined ? null : Number(args["tokens-remaining"]);
      const result = await getStatus(repositoryRoot, auth, { tokensRemaining });
      printResult(result, { human: args.json ? null : result.human_report });
      return;
    }
    case "activate-phase":
      printResult(await activatePhase(repositoryRoot, auth, integerArgument(args, "phase", { minimum: 1 })));
      return;
    case "create-task":
      printResult(await createTask(repositoryRoot, auth, await readDocument(repositoryRoot, requireArgument(args, "file"))));
      return;
    case "claim-task":
      printResult(await claimTask(repositoryRoot, auth, {
        taskId: requireArgument(args, "task-id"),
        owner: args.owner ?? auth.sessionId,
        leaseSeconds: args["lease-seconds"] === undefined ? 1_800 : integerArgument(args, "lease-seconds", { minimum: 30 })
      }));
      return;
    case "heartbeat":
      printResult(await heartbeatTask(repositoryRoot, auth, {
        leaseId: requireArgument(args, "lease-id"),
        leaseSeconds: args["lease-seconds"] === undefined ? 1_800 : integerArgument(args, "lease-seconds", { minimum: 30 })
      }));
      return;
    case "record-result":
      printResult(await recordResult(repositoryRoot, auth, await readDocument(repositoryRoot, requireArgument(args, "file"))));
      return;
    case "fail-task": {
      const state = await loadState(repositoryRoot);
      if (!state.current_task_packet_id || !state.current_phase) throw new GovernorError("NO_ACTIVE_TASK", "No active task can be failed");
      const reason = requireArgument(args, "reason");
      const result = {
        contract_version: "1.0.0",
        schema_version: 1,
        execution_result_id: `failure-${Date.now()}`,
        task_packet_id: state.current_task_packet_id,
        phase: state.current_phase,
        outcome: "FAILED",
        commit_sha: null,
        changed_files: [],
        tests: [{ command: args.command ?? "unspecified", status: "FAILED", reason }],
        unresolved_failures: [reason],
        deployment_state: { status: "NOT_ATTEMPTED" },
        result_fingerprint: sha256({ reason, command: args.command ?? "unspecified" }),
        completed_at: new Date().toISOString()
      };
      printResult(await recordResult(repositoryRoot, auth, result));
      return;
    }
    case "block":
      printResult(await blockProgram(repositoryRoot, auth, await readDocument(repositoryRoot, requireArgument(args, "file"))));
      return;
    case "unblock":
      printResult(await unblockProgram(repositoryRoot, auth, requireArgument(args, "reason")));
      return;
    case "checkpoint":
      printResult(await checkpointSession(repositoryRoot, auth, await readDocument(repositoryRoot, requireArgument(args, "file"))));
      return;
    case "resume":
      printResult(await resumeGovernor(repositoryRoot, auth));
      return;
    case "certify-phase":
      printResult(await certifyPhase(repositoryRoot, auth, await readDocument(repositoryRoot, requireArgument(args, "manifest"))));
      return;
    case "next":
      printResult(await nextAction(repositoryRoot, auth));
      return;
    case "context":
      printResult(await compileContext(repositoryRoot, auth));
      return;
    case "verify":
      printResult(await verifyGovernor(repositoryRoot, auth));
      return;
    case "events":
      printResult(await eventLogSummary(repositoryRoot, auth));
      return;
    case "validate-contract": {
      const program = await loadProgram(repositoryRoot);
      const type = requireArgument(args, "type");
      const document = await readDocument(repositoryRoot, requireArgument(args, "file"));
      validateNamedContract(type, document, { program });
      printResult({ valid: true, contract_type: type, content_sha256: sha256(document) });
      return;
    }
    case "create-review":
      printResult(await createReviewPacket(repositoryRoot, auth, await readDocument(repositoryRoot, requireArgument(args, "request"))));
      return;
    case "ingest-review":
      printResult(await ingestReviewVerdict(repositoryRoot, auth, await readDocument(repositoryRoot, requireArgument(args, "verdict"))));
      return;
    case "complete-review-corrections":
      printResult(await markReviewCorrectionsComplete(repositoryRoot, auth, requireArgument(args, "commit-sha")));
      return;
    case "add-review-trigger":
      printResult(await addConditionalReviewTrigger(repositoryRoot, auth, requireArgument(args, "trigger"), [requireArgument(args, "evidence")]));
      return;
    case "record-incident":
      printResult(await recordIncident(repositoryRoot, auth, await readDocument(repositoryRoot, requireArgument(args, "file"))));
      return;
    case "improvement-intake":
      printResult(await intakeImprovementCandidate(repositoryRoot, auth, await readDocument(repositoryRoot, requireArgument(args, "file"))));
      return;
    case "improvement-cycle":
      printResult(await runImprovementCycle(repositoryRoot, auth));
      return;
    case "improvement-backlog":
      printResult(await getImprovementBacklog(repositoryRoot, auth));
      return;
    case "improvement-show":
      printResult(await getImprovementEvidence(repositoryRoot, auth, requireArgument(args, "candidate-id")));
      return;
    case "improvement-decide":
      printResult(await decideImprovement(repositoryRoot, auth, requireArgument(args, "candidate-id"), await readDocument(repositoryRoot, requireArgument(args, "file"))));
      return;
    case "improvement-measure":
      printResult(await measureImprovement(repositoryRoot, auth, requireArgument(args, "candidate-id"), await readDocument(repositoryRoot, requireArgument(args, "file"))));
      return;
    case "improvement-apply-amendment":
      printResult(await applyImprovementAmendment(repositoryRoot, auth, await readDocument(repositoryRoot, requireArgument(args, "file"))));
      return;
    case "release-inspect": {
      const plan = await readDocument(repositoryRoot, requireArgument(args, "plan"));
      printResult(inspectRepositories(plan, auth));
      return;
    }
    case "release-create-worktree": {
      const plan = await readDocument(repositoryRoot, requireArgument(args, "plan"));
      printResult(await createIsolatedWorktree(plan, auth, requireArgument(args, "role")));
      return;
    }
    case "release-reconcile": {
      const plan = await readDocument(repositoryRoot, requireArgument(args, "plan"));
      printResult(reconcileRepository(plan, auth, requireArgument(args, "role")));
      return;
    }
    case "release-evaluate": {
      const plan = await readDocument(repositoryRoot, requireArgument(args, "plan"));
      const evidence = await readDocument(repositoryRoot, requireArgument(args, "evidence"));
      printResult(evaluateRelease(plan, evidence));
      return;
    }
    case "release-bundle": {
      const plan = await readDocument(repositoryRoot, requireArgument(args, "plan"));
      const evidence = await readDocument(repositoryRoot, requireArgument(args, "evidence"));
      const output = args.output ?? `release-control/phase-${plan.phase}/EVIDENCE_BUNDLE.json`;
      printResult(await createReleaseEvidenceBundle(repositoryRoot, plan, evidence, auth, { output }));
      return;
    }
    case "release-merge": {
      const plan = await readDocument(repositoryRoot, requireArgument(args, "plan"));
      const evidence = await readDocument(repositoryRoot, requireArgument(args, "evidence"));
      printResult(mergeProtectedMain(plan, evidence, auth, integerArgument(args, "pr", { minimum: 1 })));
      return;
    }
    case "release-rollback": {
      const plan = await readDocument(repositoryRoot, requireArgument(args, "plan"));
      const evidence = await readDocument(repositoryRoot, requireArgument(args, "evidence"));
      const result = await executeBoundedRollback(plan, evidence, auth);
      const incident = result.incident ? await recordIncident(repositoryRoot, auth, result.incident) : null;
      printResult({ ...result, incident_recorded: incident?.result ?? null });
      return;
    }
    case "release-select-tests": {
      const plan = await readDocument(repositoryRoot, requireArgument(args, "plan"));
      printResult({ selected_tests: selectTargetedTests(plan.task.changed_files) });
      return;
    }
    default:
      throw new GovernorError("UNKNOWN_COMMAND", `Unknown Governor command ${command}`);
  }
}

main().catch((error) => {
  const payload = error instanceof GovernorError
    ? { error: error.code, message: error.message, details: error.details }
    : { error: "UNEXPECTED_GOVERNOR_FAILURE", message: error instanceof Error ? error.message : String(error) };
  process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = 1;
});
