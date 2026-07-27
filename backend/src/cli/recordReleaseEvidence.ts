import {
  releaseEvidenceRecorderErrorCode,
  releaseEvidenceRecorderExitCode,
  runReleaseEvidenceRecorderCommand
} from "./releaseEvidenceRecorder.js";

try {
  const summary = await runReleaseEvidenceRecorderCommand({
    argv: process.argv.slice(2),
    env: process.env
  });
  process.stdout.write(`${JSON.stringify(summary)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({
    error: releaseEvidenceRecorderErrorCode(error)
  })}\n`);
  process.exitCode = releaseEvidenceRecorderExitCode(error);
}
