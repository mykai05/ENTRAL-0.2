import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import {
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile
} from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import { generatePhase204Xlsx } from "./lib/phase204-xlsx.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceRoot = join(repositoryRoot, "commerce", "products", "rivetrelay", "source");
const deliveryRoot = join(repositoryRoot, "commerce", "products", "rivetrelay", "delivery");
const renderRoot = join(repositoryRoot, "docs", "evidence", "phase204", "internal-commerce", "rendered-html");
const backendRequire = createRequire(new URL("../backend/package.json", import.meta.url));
const { chromium } = backendRequire("playwright-core");

const products = [
  {
    code: "LEAD_RESPONSE_ESTIMATE_FOLLOW_UP_KIT",
    slug: "lead-response-estimate-follow-up",
    title: "Lead Response and Estimate Follow-Up Kit",
    priceCents: 2_900,
    guideFiles: ["START_HERE.md", "IMPLEMENTATION_GUIDE.md", "RESPONSE_AND_FOLLOW_UP_PLAYBOOK.md", "VERSION_LICENSE_SUPPORT.md"],
    tracker: "lead_tracker_template.csv",
    example: "lead_tracker_fictional_example.csv",
    dictionary: "lead_tracker_fields_and_formulas.csv",
    sheet: "Lead Tracker",
    tableName: "Leads",
    allowedValues: {
      Preferred_Channel: ["EMAIL", "PHONE", "MARKETPLACE", "OTHER", "UNKNOWN"],
      Contact_Eligibility: ["ELIGIBLE", "PREFERENCE_LIMITED", "OPTED_OUT", "WRONG_CONTACT", "UNKNOWN"],
      Priority: ["HIGH", "MEDIUM", "LOW"],
      Stage: ["NEW", "CONTACTED", "QUALIFYING", "SITE_VISIT", "ESTIMATE_IN_PROGRESS", "ESTIMATE_DELIVERED", "DECISION_PENDING", "CLOSED"],
      Last_Contact_Channel: ["EMAIL", "PHONE", "MARKETPLACE", "OTHER"],
      Response_Status: ["NOT_STARTED", "ATTEMPTED", "CONNECTED", "WAITING_CUSTOMER", "WAITING_INTERNAL", "COMPLETE"],
      Outcome: ["WON", "LOST", "DECLINED", "DUPLICATE", "INVALID"]
    }
  },
  {
    code: "SCOPE_CHANGE_ORDER_CONTROL_PACK",
    slug: "scope-change-order-control",
    title: "Scope and Change-Order Control Pack",
    priceCents: 4_900,
    guideFiles: ["START_HERE.md", "IMPLEMENTATION_GUIDE.md", "SCOPE_AND_CHANGE_ORDER_PLAYBOOK.md", "VERSION_LICENSE_SUPPORT.md"],
    tracker: "change_order_tracker_template.csv",
    example: "change_order_tracker_fictional_example.csv",
    dictionary: "change_order_fields_and_formulas.csv",
    sheet: "Change Orders",
    tableName: "ChangeOrders",
    allowedValues: {
      Requested_By: ["CUSTOMER", "CONTRACTOR", "DESIGNER", "AUTHORITY", "SITE_CONDITION", "OTHER"],
      Safety_Class: ["ROUTINE", "SAFETY_HOLD", "EMERGENCY_MAKE_SAFE"],
      Change_Status: ["IDENTIFIED", "PRICING", "PENDING_CUSTOMER", "APPROVED", "DECLINED", "ON_HOLD", "SCHEDULED", "COMPLETED", "BILLED", "VOID"],
      Schedule_Impact_State: ["UNKNOWN", "ESTIMATED", "VERIFIED", "NOT_APPLICABLE"],
      Approval_State: ["NOT_REQUESTED", "REQUESTED", "APPROVED", "DECLINED", "EXPIRED", "DISPUTED", "NOT_APPLICABLE"],
      Billing_Status: ["NOT_READY", "READY", "INVOICED", "PARTIALLY_PAID", "PAID", "DISPUTED", "CREDITED"]
    }
  },
  {
    code: "BILLING_COLLECTIONS_ACCELERATOR",
    slug: "billing-collections-accelerator",
    title: "Billing and Collections Accelerator",
    priceCents: 4_900,
    guideFiles: ["START_HERE.md", "IMPLEMENTATION_GUIDE.md", "BILLING_AND_COLLECTIONS_PLAYBOOK.md", "VERSION_LICENSE_SUPPORT.md"],
    tracker: "receivables_tracker_template.csv",
    example: "receivables_tracker_fictional_example.csv",
    dictionary: "receivables_fields_and_formulas.csv",
    sheet: "Receivables",
    tableName: "Receivables",
    allowedValues: {
      Invoice_Status: ["ISSUED", "PARTIALLY_PAID", "PAID", "DISPUTED", "CREDITED", "VOID", "WRITE_OFF_REVIEW"],
      Contact_Eligibility: ["ELIGIBLE", "PREFERENCE_LIMITED", "OPTED_OUT", "WRONG_CONTACT", "LEGAL_HOLD", "UNKNOWN"],
      Dispute_Status: ["NONE", "CUSTOMER_QUESTION", "INTERNAL_REVIEW", "RESPONSE_DUE", "RESOLVED", "ESCALATED"],
      Promise_Status: ["NONE", "OPEN", "KEPT", "MISSED", "REPLACED", "WITHDRAWN"],
      Next_Action_Type: ["VERIFY_RECORD", "SEND_INVOICE_COPY", "COURTESY_REMINDER", "PAST_DUE_FOLLOW_UP", "PROMISE_CHECK", "DISPUTE_RESPONSE", "OWNER_REVIEW", "NONE"]
    }
  },
  {
    code: "WEEKLY_OWNER_COMMAND_DASHBOARD",
    slug: "weekly-owner-command-dashboard",
    title: "Weekly Owner Command Dashboard",
    priceCents: 3_900,
    guideFiles: ["START_HERE.md", "IMPLEMENTATION_GUIDE.md", "WEEKLY_COMMAND_PLAYBOOK.md", "VERSION_LICENSE_SUPPORT.md"],
    tracker: "weekly_dashboard_template.csv",
    example: "weekly_dashboard_fictional_example.csv",
    dictionary: "weekly_dashboard_fields_and_formulas.csv",
    sheet: "Weekly Command",
    tableName: "WeeklyCommand",
    allowedValues: { Overall_Status: ["HEALTHY", "DEGRADED", "BLOCKED"] }
  }
];

const bundle = {
  code: "COMPLETE_CONTRACTOR_CONTROL_BUNDLE",
  slug: "complete-contractor-control-bundle",
  title: "Complete Contractor Control Bundle",
  priceCents: 11_900,
  guideFiles: ["START_HERE.md", "INTEGRATION_GUIDE.md", "VERSION_LICENSE_SUPPORT.md"]
};

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function toRepositoryPath(path) {
  return relative(repositoryRoot, path).split(sep).join("/");
}

function xmlEscape(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inlineMarkdown(value) {
  return xmlEscape(value)
    .replace(/`([^`]+)`/gu, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/gu, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/gu, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gu, '<a href="$2">$1</a>');
}

function markdownToHtml(markdown) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const html = [];
  let paragraph = [];
  let list = null;
  let table = null;
  let code = null;

  const flushParagraph = () => {
    if (paragraph.length > 0) html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list) html.push(`<${list.kind}>${list.items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</${list.kind}>`);
    list = null;
  };
  const flushTable = () => {
    if (!table) return;
    const [heading, ...rows] = table;
    html.push(`<table><thead><tr>${heading.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
    table = null;
  };
  const flushBlocks = () => {
    flushParagraph();
    flushList();
    flushTable();
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (code) {
      if (line.startsWith("```")) {
        html.push(`<pre><code>${xmlEscape(code.lines.join("\n"))}</code></pre>`);
        code = null;
      } else code.lines.push(line);
      continue;
    }
    if (line.startsWith("```")) {
      flushBlocks();
      code = { lines: [] };
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/u);
    if (heading) {
      flushBlocks();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    if (/^\s*---+\s*$/u.test(line)) {
      flushBlocks();
      html.push("<hr>");
      continue;
    }
    const unordered = line.match(/^\s*[-*]\s+(.+)$/u);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/u);
    if (unordered || ordered) {
      flushParagraph();
      flushTable();
      const kind = ordered ? "ol" : "ul";
      if (list && list.kind !== kind) flushList();
      list ??= { kind, items: [] };
      list.items.push((ordered ?? unordered)[1]);
      continue;
    }
    const cells = line.trim().startsWith("|") && line.trim().endsWith("|")
      ? line.trim().slice(1, -1).split("|").map((cell) => cell.trim())
      : null;
    const nextLine = lines[index + 1] ?? "";
    if (cells && /^\s*\|(?:\s*:?-{3,}:?\s*\|)+\s*$/u.test(nextLine)) {
      flushParagraph();
      flushList();
      flushTable();
      table = [cells];
      index += 1;
      continue;
    }
    if (cells && table) {
      table.push(cells);
      continue;
    }
    if (line.startsWith("> ")) {
      flushBlocks();
      html.push(`<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`);
      continue;
    }
    if (line.trim() === "") {
      flushBlocks();
      continue;
    }
    flushList();
    flushTable();
    paragraph.push(line.trim());
  }
  flushBlocks();
  if (code) html.push(`<pre><code>${xmlEscape(code.lines.join("\n"))}</code></pre>`);
  return html.join("\n");
}

function documentHtml(title, sections) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${xmlEscape(title)}</title><style>
@page { size: Letter; margin: 0.48in 0.58in 0.52in; }
:root { color-scheme: light; --ink:#14212b; --muted:#5b6670; --accent:#b5452d; --soft:#f3eee8; --line:#d8d4cf; }
* { box-sizing:border-box; } body { margin:0; color:var(--ink); font:9.8pt/1.38 Arial, Helvetica, sans-serif; }
.cover { min-height:8.45in; display:flex; flex-direction:column; justify-content:center; padding:0.45in; border:2px solid var(--ink); background:linear-gradient(145deg,#fff 0%,var(--soft) 100%); page-break-after:always; }
.eyebrow { color:var(--accent); font-size:10pt; font-weight:700; letter-spacing:.15em; text-transform:uppercase; }
.cover h1 { margin:.18in 0 .12in; font-size:31pt; line-height:1.05; letter-spacing:-.025em; }
.cover p { max-width:5.8in; color:var(--muted); font-size:13pt; }
.brand { margin-top:.45in; font-size:12pt; font-weight:700; } .meta { color:var(--muted); font-size:9pt; }
.section { page-break-before:always; } h1,h2,h3,h4 { color:var(--ink); line-height:1.15; page-break-after:avoid; }
h1 { font-size:22pt; margin:0 0 .18in; border-bottom:2px solid var(--accent); padding-bottom:.08in; }
h2 { font-size:16pt; margin:.2in 0 .08in; } h3 { font-size:12.5pt; margin:.15in 0 .06in; }
p { margin:.04in 0 .09in; orphans:3; widows:3; } ul,ol { margin:.04in 0 .1in .24in; padding:0; } li { margin:.025in 0; break-inside:avoid; }
table { width:100%; border-collapse:collapse; margin:.12in 0 .2in; font-size:8.7pt; page-break-inside:auto; }
thead { display:table-header-group; } tr { page-break-inside:avoid; } th,td { border:1px solid var(--line); padding:.06in; text-align:left; vertical-align:top; }
th { background:var(--soft); } code { font:8.8pt Consolas, monospace; background:var(--soft); padding:.01in .035in; }
pre { white-space:pre-wrap; background:#f7f5f2; border:1px solid var(--line); padding:.12in; page-break-inside:avoid; }
blockquote { margin:.12in 0; padding:.1in .14in; border-left:4px solid var(--accent); background:var(--soft); }
hr { border:0; border-top:1px solid var(--line); margin:.22in 0; } a { color:#7d2f20; }
.source-label { color:var(--accent); font-size:8pt; font-weight:700; letter-spacing:.11em; text-transform:uppercase; margin-bottom:.08in; }
</style></head><body>
<section class="cover"><div class="eyebrow">RivetRelay contractor operations toolkit</div><h1>${xmlEscape(title)}</h1><p>Practical, editable operating materials for specialty contractors. Built for disciplined follow-through; no outcome or legal guarantee is implied.</p><div class="brand">RivetRelay</div><div class="meta">Version 1.0.0 · AI-assisted original work · Licensed for one purchasing business</div></section>
${sections.map((section) => `<section class="section"><div class="source-label">${xmlEscape(section.label)}</div>${markdownToHtml(section.markdown)}</section>`).join("\n")}
</body></html>`;
}

function browserExecutable() {
  const candidates = [
    process.env.E2E_BROWSER_EXECUTABLE,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    `${process.env.ProgramFiles ?? ""}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env["ProgramFiles(x86)"] ?? ""}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.LOCALAPPDATA ?? ""}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.ProgramFiles ?? ""}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env["ProgramFiles(x86)"] ?? ""}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env.LOCALAPPDATA ?? ""}\\Microsoft\\Edge\\Application\\msedge.exe`
  ].filter(Boolean);
  return candidates.find((candidate) => {
    try {
      execFileSync(process.execPath, ["-e", `require('node:fs').accessSync(${JSON.stringify(candidate)})`], { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  });
}

const CRC32_TABLE = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  return crc >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const value of buffer) crc = CRC32_TABLE[(crc ^ value) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(entries) {
  const names = entries.map((entry) => entry.name.replaceAll("\\", "/"));
  if (new Set(names).size !== names.length) throw new Error("ZIP entries must be unique");
  for (const name of names) {
    if (!name || name.startsWith("/") || /^[A-Za-z]:/u.test(name) || name.split("/").some((part) => !part || part === "." || part === "..")) {
      throw new Error(`Unsafe ZIP entry path: ${name}`);
    }
  }
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const dosTime = (12 << 11);
  const dosDate = ((2026 - 1980) << 9) | (8 << 5) | 3;
  for (const entry of [...entries].sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)) {
    const name = Buffer.from(entry.name.replaceAll("\\", "/"), "utf8");
    const source = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    const compressed = deflateRawSync(source, { level: 9 });
    const checksum = crc32(source);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(source.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(source.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + compressed.length;
  }
  const centralBuffer = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  const archive = Buffer.concat([...localParts, centralBuffer, end]);
  verifyZip(archive, entries.length);
  return archive;
}

function verifyZip(archive, expectedEntries) {
  const seen = new Set();
  let offset = 0;
  while (offset + 30 <= archive.length && archive.readUInt32LE(offset) === 0x04034b50) {
    const method = archive.readUInt16LE(offset + 8);
    const expectedCrc = archive.readUInt32LE(offset + 14);
    const compressedSize = archive.readUInt32LE(offset + 18);
    const sourceSize = archive.readUInt32LE(offset + 22);
    const nameLength = archive.readUInt16LE(offset + 26);
    const extraLength = archive.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > archive.length) throw new Error("ZIP entry exceeds the archive boundary");
    const name = archive.subarray(nameStart, nameStart + nameLength).toString("utf8");
    if (seen.has(name)) throw new Error(`Duplicate ZIP entry: ${name}`);
    seen.add(name);
    const compressed = archive.subarray(dataStart, dataEnd);
    const source = method === 8 ? inflateRawSync(compressed) : method === 0 ? compressed : null;
    if (!source || source.length !== sourceSize || crc32(source) !== expectedCrc) throw new Error(`ZIP CRC/readback failed: ${name}`);
    offset = dataEnd;
  }
  if (seen.size !== expectedEntries || archive.readUInt32LE(archive.length - 22) !== 0x06054b50) {
    throw new Error("ZIP entry-count or end-record readback failed");
  }
}

async function sourceEntries(directory, prefix) {
  return Promise.all((await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)
    .map(async (entry) => ({ name: `${prefix}/${entry.name}`, data: await readFile(join(directory, entry.name)) })));
}

async function fileReceipt(path, roles) {
  const data = await readFile(path);
  if (data.length < 1 || data.length > 20_000_000) {
    throw new Error(`${basename(path)} must be nonempty and no larger than Etsy's 20 MB per-file limit`);
  }
  return {
    file_name: basename(path),
    byte_size: data.length,
    content_sha256: sha256(data),
    roles
  };
}

function parseCsv(source, label) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') { cell += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") { row.push(cell); cell = ""; }
    else if (character === "\n") { row.push(cell.replace(/\r$/u, "")); rows.push(row); row = []; cell = ""; }
    else cell += character;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/u, "")); rows.push(row); }
  if (quoted || rows.length < 2 || rows.some((entry) => entry.length !== rows[0].length)) throw new Error(`Malformed CSV: ${label}`);
  return rows;
}

function workbookType(type, formula, allowedValues) {
  if (formula) return "formula";
  if (allowedValues?.length) return "controlled-text";
  const normalized = type.trim().toLocaleLowerCase();
  if (normalized === "date") return "date";
  if (normalized === "date-time") return "date-time";
  if (normalized === "currency") return "currency";
  if (normalized === "whole number") return "whole-number";
  if (normalized === "decimal") return "decimal";
  return "text";
}

function formulaResultType(rule) {
  const normalized = rule.toLocaleLowerCase();
  if (normalized.includes("currency")) return "currency";
  if (normalized.includes("percentage")) return "percentage";
  if (normalized.includes("day") || normalized.includes("whole")) return "whole-number";
  return "text";
}

async function trackerWorkbook(definition) {
  const dictionaryPath = join(sourceRoot, definition.slug, definition.dictionary);
  const rows = parseCsv(await readFile(dictionaryPath, "utf8"), definition.dictionary);
  const [header, ...fields] = rows;
  const index = Object.fromEntries(header.map((name, position) => [name, position]));
  const columns = fields.map((field) => {
    const key = field[index.Field];
    const formula = field[index.Spreadsheet_Formula_or_Instruction] || null;
    const allowedValues = definition.allowedValues[key] ?? [];
    return {
      key,
      title: key,
      type: workbookType(field[index.Type], formula, allowedValues),
      required: field[index.Required_When] === "Always" && !formula,
      ...(allowedValues.length > 0 ? { allowedValues } : {}),
      width: Math.min(42, Math.max(13, key.length + 2)),
      description: `${field[index.Required_When]}. ${field[index.Allowed_Values_or_Rule]} ${field[index.Why_It_Exists]}`,
      ...(formula ? { formula, resultType: formulaResultType(field[index.Allowed_Values_or_Rule]) } : {})
    };
  });
  return generatePhase204Xlsx({
    sheet: definition.sheet,
    tableName: definition.tableName,
    title: definition.title,
    description: "Use verified source values only. Input cells are unlocked; formula cells are locked and fill through the Excel table.",
    instructions: [
      "Delete the blank starter row only after adding the first verified operating row.",
      "Set every explicit control or as-of date from evidence; the workbook never substitutes the device date.",
      "Paste values only. Text beginning with =, +, -, or @ is rejected to prevent spreadsheet formula injection.",
      "Keep calculated columns protected and reconcile source records before relying on a queue or result.",
      "The editable-source archive includes the import CSV, fictional CSV, exact formulas, and governance instructions."
    ],
    columns
  });
}

async function renderGuide(page, definition, commitSha) {
  const sourceDirectory = join(sourceRoot, definition.slug);
  const sections = await Promise.all(definition.guideFiles.map(async (file) => ({
    label: file.replace(/\.md$/u, "").replaceAll("_", " "),
    markdown: await readFile(join(sourceDirectory, file), "utf8")
  })));
  const outputDirectory = join(deliveryRoot, definition.slug);
  await mkdir(outputDirectory, { recursive: true });
  await mkdir(renderRoot, { recursive: true });
  const prefix = `RivetRelay_${definition.code}`;
  const htmlPath = join(renderRoot, `${definition.slug}.html`);
  const pdfPath = join(outputDirectory, `${prefix}_Guide.pdf`);
  await writeFile(htmlPath, documentHtml(definition.title, sections), "utf8");
  await page.goto(new URL(`file:///${htmlPath.replaceAll("\\", "/")}`).href, { waitUntil: "load" });
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: pdfPath, format: "Letter", printBackground: true, preferCSSPageSize: true });
  const pdf = await readFile(pdfPath);
  if (!pdf.subarray(0, 5).equals(Buffer.from("%PDF-")) || pdf.length < 5_000) {
    throw new Error(`PDF verification failed for ${definition.code}`);
  }

  const trackerPath = join(outputDirectory, `${prefix}_Tracker.xlsx`);
  const examplePath = join(outputDirectory, `${prefix}_Fictional_Example.csv`);
  await writeFile(trackerPath, await trackerWorkbook(definition));
  await copyFile(join(sourceDirectory, definition.example), examplePath);
  const zipPath = join(outputDirectory, `${prefix}_Editable_Source.zip`);
  await writeFile(zipPath, createZip(await sourceEntries(sourceDirectory, definition.slug)));
  const manifestPath = join(outputDirectory, `${prefix}_Delivery_Manifest.json`);
  const manifest = {
    contract_version: "1.0.0",
    product_code: definition.code,
    title: definition.title,
    version: "1.0.0",
    currency: "USD",
    price_cents: definition.priceCents,
    public_brand: "RivetRelay",
    brand_clearance: "OWNER_LEGAL_AND_PROVIDER_CLEARANCE_REQUIRED",
    delivery_status: "DRAFT_NOT_FOR_PUBLICATION",
    publication_authorized: false,
    support_ready: false,
    ai_disclosure: "AI tools assisted drafting and formatting; final publisher review and owner authorization remain required before sale.",
    license_scope: "ONE_PURCHASER_OWNED_BUSINESS_INTERNAL_USE_NO_REDISTRIBUTION",
    build_source_reference: `mykai05/ENTRAL-0.2@${commitSha}:scripts/phase204-internal-commerce-build-assets.mjs`,
    product_source_reference: `mykai05/ENTRAL-0.2@${commitSha}:commerce/products/rivetrelay/source/${definition.slug}`,
    files: await Promise.all([
      fileReceipt(pdfPath, ["FINAL_DELIVERY", "INSTRUCTIONS", "IMPLEMENTATION_GUIDANCE", "SUPPORT_INSTRUCTIONS", "LICENSE_TERMS", "VERSION_INFORMATION"]),
      fileReceipt(trackerPath, ["TRACKING_TOOL", "EDITABLE_SOURCE"]),
      fileReceipt(examplePath, ["EXAMPLE"]),
      fileReceipt(zipPath, ["EDITABLE_SOURCE"])
    ])
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { definition, outputDirectory, files: [pdfPath, trackerPath, examplePath, zipPath, manifestPath] };
}

async function main() {
  const governedInputs = [
    toRepositoryPath(sourceRoot),
    ".gitattributes",
    "scripts/phase204-internal-commerce-build-assets.mjs",
    "scripts/lib/phase204-xlsx.mjs"
  ];
  const dirtyInputs = execFileSync(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all", "--", ...governedInputs],
    { cwd: repositoryRoot, encoding: "utf8" }
  ).trim();
  if (dirtyInputs) {
    throw new Error(`Product source inputs must be committed and clean before packaging:\n${dirtyInputs}`);
  }
  const commitSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
  if (!/^[0-9a-f]{40}$/u.test(commitSha)) throw new Error("A committed source SHA is required");
  await access(sourceRoot);
  if (
    deliveryRoot !== join(repositoryRoot, "commerce", "products", "rivetrelay", "delivery")
    || renderRoot !== join(repositoryRoot, "docs", "evidence", "phase204", "internal-commerce", "rendered-html")
  ) throw new Error("Refusing to clean an unexpected output directory");
  await rm(deliveryRoot, { recursive: true, force: true });
  await rm(renderRoot, { recursive: true, force: true });
  const executablePath = browserExecutable();
  if (!executablePath) throw new Error("Chrome or Edge is required to render customer PDFs");
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    const built = [];
    for (const product of products) built.push(await renderGuide(page, product, commitSha));

    const bundleDirectory = join(deliveryRoot, bundle.slug);
    const bundleSourceDirectory = join(sourceRoot, bundle.slug);
    await mkdir(bundleDirectory, { recursive: true });
    await mkdir(renderRoot, { recursive: true });
    const bundleSections = await Promise.all(bundle.guideFiles.map(async (file) => ({
      label: file.replace(/\.md$/u, "").replaceAll("_", " "),
      markdown: await readFile(join(bundleSourceDirectory, file), "utf8")
    })));
    const prefix = `RivetRelay_${bundle.code}`;
    const htmlPath = join(renderRoot, `${bundle.slug}.html`);
    const pdfPath = join(bundleDirectory, `${prefix}_Guide.pdf`);
    await writeFile(htmlPath, documentHtml(bundle.title, bundleSections), "utf8");
    await page.goto(new URL(`file:///${htmlPath.replaceAll("\\", "/")}`).href, { waitUntil: "load" });
    await page.emulateMedia({ media: "print" });
    await page.pdf({ path: pdfPath, format: "Letter", printBackground: true, preferCSSPageSize: true });
    const pdf = await readFile(pdfPath);
    if (!pdf.subarray(0, 5).equals(Buffer.from("%PDF-")) || pdf.length < 5_000) throw new Error("Bundle PDF verification failed");

    const bundleTrackerPath = join(bundleDirectory, `${prefix}_Weekly_Command_Tracker.xlsx`);
    await writeFile(bundleTrackerPath, await trackerWorkbook(products[3]));
    const bundleZipEntries = await sourceEntries(bundleSourceDirectory, bundle.slug);
    for (const product of built) {
      for (const path of product.files) {
        bundleZipEntries.push({ name: `${product.definition.slug}/${basename(path)}`, data: await readFile(path) });
      }
    }
    const zipPath = join(bundleDirectory, `${prefix}_Complete_Delivery.zip`);
    await writeFile(zipPath, createZip(bundleZipEntries));
    const manifestPath = join(bundleDirectory, `${prefix}_Delivery_Manifest.json`);
    const manifest = {
      contract_version: "1.0.0",
      product_code: bundle.code,
      title: bundle.title,
      version: "1.0.0",
      currency: "USD",
      price_cents: bundle.priceCents,
      component_product_codes: products.map((product) => product.code),
      public_brand: "RivetRelay",
      brand_clearance: "OWNER_LEGAL_AND_PROVIDER_CLEARANCE_REQUIRED",
      delivery_status: "DRAFT_NOT_FOR_PUBLICATION",
      publication_authorized: false,
      support_ready: false,
      ai_disclosure: "AI tools assisted drafting and formatting; final publisher review and owner authorization remain required before sale.",
      license_scope: "ONE_PURCHASER_OWNED_BUSINESS_INTERNAL_USE_NO_REDISTRIBUTION",
      build_source_reference: `mykai05/ENTRAL-0.2@${commitSha}:scripts/phase204-internal-commerce-build-assets.mjs`,
      product_source_reference: `mykai05/ENTRAL-0.2@${commitSha}:commerce/products/rivetrelay/source/${bundle.slug}`,
      component_manifest_reference: `mykai05/ENTRAL-0.2@${commitSha}:commerce/products/rivetrelay/source/${bundle.slug}/BUNDLE_MANIFEST.csv`,
      files: await Promise.all([
        fileReceipt(pdfPath, ["FINAL_DELIVERY", "INSTRUCTIONS", "IMPLEMENTATION_GUIDANCE", "SUPPORT_INSTRUCTIONS", "LICENSE_TERMS", "VERSION_INFORMATION"]),
        fileReceipt(bundleTrackerPath, ["TRACKING_TOOL", "EDITABLE_SOURCE"]),
        fileReceipt(zipPath, ["EDITABLE_SOURCE", "EXAMPLE"])
      ])
    };
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify({ status: "DRAFT_NOT_FOR_PUBLICATION", commit_sha: commitSha, products: 5, delivery_root: toRepositoryPath(deliveryRoot), owner_approval_required: true })}\n`);
  } finally {
    await browser.close();
  }
}

await main();
