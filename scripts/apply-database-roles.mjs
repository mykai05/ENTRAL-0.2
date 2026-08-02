import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const prismaCli = resolve(repoRoot, "node_modules/prisma/build/index.js");
const schemaPath = resolve(repoRoot, "prisma/schema.prisma");
const grantFiles = [
  "prisma/security/046_roles_and_grants.sql",
  "prisma/security/047_phase_195_roles_and_grants.sql",
  "prisma/security/048_phase_202_roles_and_grants.sql"
];

const dollarQuotePattern = /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/;
const forbiddenTransactionControl = /^(?:ABORT|BEGIN|COMMIT|END|ROLLBACK|SAVEPOINT|RELEASE(?:\s+SAVEPOINT)?|START\s+TRANSACTION|PREPARE\s+TRANSACTION|ROLLBACK\s+PREPARED|SET\s+TRANSACTION|SET\s+SESSION\s+CHARACTERISTICS\s+AS\s+TRANSACTION)\b/i;

function topLevelStatements(sql, sourceName) {
  const statements = [];
  let code = "";
  let codeStart = null;
  let blockCommentDepth = 0;
  let dollarQuote = null;
  let state = "normal";

  const appendCode = (value, index) => {
    if (codeStart === null && /\S/.test(value)) {
      codeStart = index;
    }
    code += value;
  };

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const next = sql[index + 1];

    if (state === "line-comment") {
      if (character === "\n") {
        state = "normal";
        code += "\n";
      }
      continue;
    }

    if (state === "block-comment") {
      if (character === "/" && next === "*") {
        blockCommentDepth += 1;
        index += 1;
      } else if (character === "*" && next === "/") {
        blockCommentDepth -= 1;
        index += 1;
        if (blockCommentDepth === 0) {
          state = "normal";
          code += " ";
        }
      }
      continue;
    }

    if (state === "single-quote") {
      code += character;
      if (character === "\\" && next !== undefined) {
        code += next;
        index += 1;
      } else if (character === "'" && next === "'") {
        code += next;
        index += 1;
      } else if (character === "'") {
        state = "normal";
      }
      continue;
    }

    if (state === "double-quote") {
      code += character;
      if (character === '"' && next === '"') {
        code += next;
        index += 1;
      } else if (character === '"') {
        state = "normal";
      }
      continue;
    }

    if (state === "dollar-quote") {
      if (sql.startsWith(dollarQuote, index)) {
        code += dollarQuote;
        index += dollarQuote.length - 1;
        dollarQuote = null;
        state = "normal";
      } else {
        code += character;
      }
      continue;
    }

    if (character === "-" && next === "-") {
      state = "line-comment";
      index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      state = "block-comment";
      blockCommentDepth = 1;
      index += 1;
      continue;
    }
    if (character === "'") {
      appendCode(character, index);
      state = "single-quote";
      continue;
    }
    if (character === '"') {
      appendCode(character, index);
      state = "double-quote";
      continue;
    }
    if (character === "$") {
      const match = sql.slice(index).match(dollarQuotePattern);
      if (match) {
        appendCode(match[0], index);
        dollarQuote = match[0];
        state = "dollar-quote";
        index += match[0].length - 1;
        continue;
      }
    }
    if (character === ";") {
      const normalized = code.trim();
      if (normalized.length > 0) {
        statements.push({
          end: index + 1,
          normalized,
          start: codeStart
        });
      }
      code = "";
      codeStart = null;
      continue;
    }

    appendCode(character, index);
  }

  if (state === "block-comment") {
    throw new Error(`${sourceName} contains an unterminated block comment`);
  }
  if (state === "single-quote") {
    throw new Error(`${sourceName} contains an unterminated single-quoted string`);
  }
  if (state === "double-quote") {
    throw new Error(`${sourceName} contains an unterminated quoted identifier`);
  }
  if (state === "dollar-quote") {
    throw new Error(`${sourceName} contains an unterminated ${dollarQuote} block`);
  }
  if (code.trim().length > 0) {
    throw new Error(`${sourceName} contains an unterminated top-level SQL statement`);
  }

  return statements;
}

export function normalizeTransactionWrappedSql(sql, sourceName = "SQL source") {
  if (typeof sql !== "string" || sql.trim().length === 0) {
    throw new Error(`${sourceName} must contain SQL`);
  }

  const statements = topLevelStatements(sql, sourceName);
  const beginStatements = statements.filter(({ normalized }) => /^BEGIN$/i.test(normalized));
  const commitStatements = statements.filter(({ normalized }) => /^COMMIT$/i.test(normalized));

  if (beginStatements.length !== 1 || commitStatements.length !== 1) {
    throw new Error(`${sourceName} must contain exactly one top-level BEGIN and one top-level COMMIT`);
  }

  const begin = beginStatements[0];
  const commit = commitStatements[0];
  if (statements[0] !== begin || statements.at(-1) !== commit) {
    throw new Error(`${sourceName} transaction wrappers must be the first and last top-level statements`);
  }
  if (statements.length === 2) {
    throw new Error(`${sourceName} must contain role policy SQL between its transaction wrappers`);
  }

  const unexpectedControl = statements
    .slice(1, -1)
    .find(({ normalized }) => forbiddenTransactionControl.test(normalized));
  if (unexpectedControl) {
    throw new Error(`${sourceName} contains unsupported top-level transaction control`);
  }

  return [
    sql.slice(0, begin.start),
    sql.slice(begin.end, commit.start),
    sql.slice(commit.end)
  ].join("");
}

export function buildAtomicRoleSql(sources) {
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error("At least one database role SQL source is required");
  }

  const bodies = sources.map(({ sourceName, sql }) =>
    normalizeTransactionWrappedSql(sql, sourceName).trim()
  );

  return `BEGIN;\n\n${bodies.join("\n\n")}\n\nCOMMIT;\n`;
}

export function applyDatabaseRoles({
  cwd = repoRoot,
  environment = process.env,
  executable = process.execPath,
  files = grantFiles,
  prismaCliPath = prismaCli,
  readFile = readFileSync,
  schema = schemaPath,
  spawn = spawnSync
} = {}) {
  const sources = files.map((relativePath) => ({
    sourceName: relativePath,
    sql: readFile(resolve(cwd, relativePath), "utf8")
  }));
  const input = buildAtomicRoleSql(sources);
  const result = spawn(executable, [
    prismaCliPath,
    "db",
    "execute",
    "--stdin",
    "--schema",
    schema
  ], {
    cwd,
    encoding: "utf8",
    env: environment,
    input,
    stdio: ["pipe", "inherit", "inherit"]
  });

  if (result.error) {
    throw new Error(`Unable to start the pinned Prisma CLI: ${result.error.message}`);
  }
  return result.status ?? 1;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = applyDatabaseRoles();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Database role application failed: ${message}`);
    process.exitCode = 1;
  }
}
