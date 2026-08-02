import { writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../db.js";
import { reconcileSecureJson, type SecureJsonReconciliationMode } from "../services/secureJsonReconciliation.js";

function modeFromEnvironment(): SecureJsonReconciliationMode {
  if (process.env.ENTRAL_SECURE_JSON_RECONCILE === "apply") return "APPLY";
  return "AUDIT";
}

async function main() {
  const mode = modeFromEnvironment();
  if (mode === "APPLY" && process.env.NODE_ENV !== "production") {
    throw new Error("Secure JSON apply mode is restricted to an explicit production reconciliation run.");
  }

  const repairPlanReference = process.env.ENTRAL_SECURE_JSON_REPAIR_PLAN_REFERENCE?.trim();
  const rollbackReference = process.env.ENTRAL_SECURE_JSON_ROLLBACK_REFERENCE?.trim();
  if (!repairPlanReference || !rollbackReference) {
    throw new Error("Repository-bound reconciliation and rollback evidence references are required.");
  }
  const receipt = await reconcileSecureJson(prisma, mode, {
    priorApplyReceiptHash: process.env.ENTRAL_SECURE_JSON_PRIOR_APPLY_RECEIPT_SHA256?.trim() || null,
    repairPlanReference,
    rollbackReference
  });
  const outputArgument = process.argv.find((value) => value.startsWith("--output="));
  if (outputArgument) {
    const output = path.resolve(outputArgument.slice("--output=".length));
    await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  }
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
  if (receipt.status === "BLOCKED") process.exitCode = 2;
}

try {
  await main();
} catch {
  process.stderr.write(`${JSON.stringify({
    contract_version: "1.0.0",
    schema_version: 1,
    status: "BLOCKED",
    message: "Secure JSON reconciliation failed; inspect restricted operator logs."
  })}\n`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
