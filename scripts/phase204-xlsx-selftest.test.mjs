import assert from "node:assert/strict";
import test from "node:test";

import { generatePhase204Xlsx, PHASE204_XLSX_FIXED_TIMESTAMP } from "./lib/phase204-xlsx.mjs";

function crc32(buffer) {
  let crc = 0xFFFFFFFF;
  for (const octet of buffer) {
    crc ^= octet;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function unzipStored(buffer) {
  const entries = new Map();
  const localOffsets = new Map();
  let offset = 0;
  while (buffer.readUInt32LE(offset) === 0x04034B50) {
    const flags = buffer.readUInt16LE(offset + 6);
    const method = buffer.readUInt16LE(offset + 8);
    const expectedCrc = buffer.readUInt32LE(offset + 14);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const uncompressedSize = buffer.readUInt32LE(offset + 22);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    assert.equal(flags, 0x0800);
    assert.equal(method, 0);
    assert.equal(compressedSize, uncompressedSize);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = buffer.subarray(nameStart, nameStart + nameLength).toString("utf8");
    const data = buffer.subarray(dataStart, dataStart + compressedSize);
    assert.equal(crc32(data), expectedCrc, `${name} CRC32 mismatch`);
    assert.ok(!name.startsWith("/") && !name.includes("..") && !name.includes("\\"), `${name} is unsafe`);
    assert.ok(!entries.has(name), `${name} is duplicated`);
    entries.set(name, data);
    localOffsets.set(name, offset);
    offset = dataStart + compressedSize;
  }
  const centralStart = offset;
  const centralNames = [];
  while (buffer.readUInt32LE(offset) === 0x02014B50) {
    assert.equal(buffer.readUInt16LE(offset + 8), 0x0800);
    assert.equal(buffer.readUInt16LE(offset + 10), 0);
    const expectedCrc = buffer.readUInt32LE(offset + 16);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    assert.ok(entries.has(name), `${name} central entry has no local entry`);
    assert.equal(localOffsets.get(name), localOffset, `${name} local offset mismatch`);
    assert.equal(entries.get(name).length, compressedSize, `${name} compressed size mismatch`);
    assert.equal(entries.get(name).length, uncompressedSize, `${name} uncompressed size mismatch`);
    assert.equal(crc32(entries.get(name)), expectedCrc, `${name} central CRC32 mismatch`);
    centralNames.push(name);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  const eocdOffset = buffer.length - 22;
  assert.equal(offset, eocdOffset, "central directory has trailing or missing bytes");
  assert.equal(buffer.readUInt32LE(eocdOffset), 0x06054B50);
  assert.equal(buffer.readUInt16LE(eocdOffset + 8), entries.size);
  assert.equal(buffer.readUInt16LE(eocdOffset + 10), entries.size);
  assert.equal(buffer.readUInt32LE(eocdOffset + 12), eocdOffset - centralStart);
  assert.equal(buffer.readUInt32LE(eocdOffset + 16), centralStart);
  assert.deepEqual(centralNames, [...entries.keys()]);
  return entries;
}

const definition = {
  sheet: "Lead Tracker",
  title: "RivetRelay Lead Tracker",
  description: "Use verified source records only.",
  instructions: ["Do not store credentials.", "Use one row per lead."],
  starterRow: { Priority: "HIGH", Estimate_Amount: 1250, Follow_Up_Count: 0 },
  columns: [
    { key: "leadId", title: "Lead_ID", type: "text", required: true, width: 20 },
    { title: "Received_Date", type: "date", required: true, width: 14 },
    { title: "Priority", type: "controlled-text", required: true, allowedValues: ["HIGH", "MEDIUM", "LOW"], width: 12 },
    { title: "Estimate_Amount", type: "currency", width: 16 },
    { title: "Follow_Up_Count", type: "whole-number", required: true, width: 14 },
    { title: "Coverage", type: "formula", resultType: "percentage", formula: "=IF([@[Follow_Up_Count]]=0,\"\",1)", width: 14 }
  ]
};

test("Phase 204 XLSX generator is byte-for-byte deterministic and emits a valid stored ZIP", () => {
  const first = generatePhase204Xlsx(definition);
  const second = generatePhase204Xlsx(structuredClone(definition));
  assert.ok(Buffer.isBuffer(first));
  assert.deepEqual(second, first);
  const entries = unzipStored(first);
  assert.deepEqual([...entries.keys()].sort(), [
    "[Content_Types].xml",
    "_rels/.rels",
    "docProps/app.xml",
    "docProps/core.xml",
    "xl/_rels/workbook.xml.rels",
    "xl/styles.xml",
    "xl/tables/table1.xml",
    "xl/workbook.xml",
    "xl/worksheets/_rels/sheet2.xml.rels",
    "xl/worksheets/sheet1.xml",
    "xl/worksheets/sheet2.xml",
    "xl/worksheets/sheet3.xml"
  ]);
});

test("Phase 204 XLSX binds the table, formulas, validation, styles, and protection", () => {
  const entries = unzipStored(generatePhase204Xlsx(definition));
  const workbook = entries.get("xl/workbook.xml").toString("utf8");
  const sheet = entries.get("xl/worksheets/sheet2.xml").toString("utf8");
  const table = entries.get("xl/tables/table1.xml").toString("utf8");
  const styles = entries.get("xl/styles.xml").toString("utf8");
  const core = entries.get("docProps/core.xml").toString("utf8");
  assert.match(workbook, /name="_Lists" sheetId="3" state="veryHidden"/u);
  assert.match(workbook, /<definedName name="_dv_3" hidden="1">&apos;_Lists&apos;!\$A\$1:\$A\$3<\/definedName>/u);
  assert.match(sheet, /<pane ySplit="1" topLeftCell="A2"[^>]+state="frozen"\/>/u);
  assert.match(sheet, /<sheetProtection [^>]+insertRows="0"[^>]+selectUnlockedCells="0"\/>/u);
  assert.match(sheet, /<dataValidation type="list" [^>]+sqref="C2:C1048576"/u);
  assert.match(sheet, /<c r="D2" s="7" t="n"><v>1250<\/v><\/c>/u);
  assert.match(sheet, /<c r="F2" s="15"><f>IF\(Table_Lead_Tracker\[\[#This Row\],\[Follow_Up_Count\]\]=0,&quot;&quot;,1\)<\/f><\/c>/u);
  assert.match(entries.get("xl/worksheets/sheet1.xml").toString("utf8"), /<mergeCells count="2"><mergeCell ref="A1:D1"\/><mergeCell ref="A2:D2"\/><\/mergeCells>/u);
  assert.match(table, /ref="A1:F2"/u);
  assert.match(table, /<autoFilter ref="A1:F2"\/>/u);
  assert.match(table, /<calculatedColumnFormula>IF\(Table_Lead_Tracker\[\[#This Row\],\[Follow_Up_Count\]\]=0,&quot;&quot;,1\)<\/calculatedColumnFormula>/u);
  assert.match(styles, /applyProtection="1"[^>]*><protection locked="0"\/>/u);
  assert.match(styles, /applyProtection="1"[^>]*><protection locked="1"\/>/u);
  assert.match(core, new RegExp(PHASE204_XLSX_FIXED_TIMESTAMP.replaceAll(".", "\\."), "u"));
});

test("Phase 204 XLSX stores values as values and rejects unsafe or ambiguous definitions", () => {
  const injection = generatePhase204Xlsx({
    sheet: "Safe Values",
    title: "Safe Value Workbook",
    starterRow: { Source: "=WEBSERVICE(\"https://example.invalid\")" },
    columns: [{ title: "Source", type: "text", required: true }]
  });
  const sheet = unzipStored(injection).get("xl/worksheets/sheet2.xml").toString("utf8");
  assert.match(sheet, /t="inlineStr"><is><t>=WEBSERVICE/u);
  assert.doesNotMatch(sheet, /<f>/u);
  assert.throws(() => generatePhase204Xlsx({ ...definition, sheet: "../Unsafe" }), /invalid Excel sheet-name/u);
  assert.throws(() => generatePhase204Xlsx({ ...definition, columns: [...definition.columns, definition.columns[0]] }), /duplicates another table header/u);
  assert.throws(() => generatePhase204Xlsx({ ...definition, columns: [{ title: "Bad", type: "formula", formula: "SUM(A1:A2)" }] }), /must begin with =/u);
  assert.throws(() => generatePhase204Xlsx({ ...definition, columns: [{ title: "Bad", type: "text", allowedValues: ["A"], formula: "=1" }] }), /cannot combine formula and allowedValues/u);
  assert.throws(() => generatePhase204Xlsx({ ...definition, columns: [{ title: "Bad", type: "text", allowedValues: [] }] }), /must not be empty when provided/u);
  assert.throws(() => generatePhase204Xlsx({ ...definition, starterRow: {}, columns: [{ title: "Bad", type: "formula", formula: "=LEN([@[Missing]])" }] }), /unknown table column/u);
});
