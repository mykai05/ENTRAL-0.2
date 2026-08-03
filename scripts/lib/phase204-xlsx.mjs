import { Buffer } from "node:buffer";

/**
 * Deterministic, dependency-free OOXML workbook generator for Phase 204 trackers.
 *
 * @typedef {Object} TrackerColumn
 * @property {string} [key] Stable key used by `starterRow`; defaults to `title`.
 * @property {string} title Visible, unique Excel table header.
 * @property {"text"|"controlled-text"|"date"|"date-time"|"currency"|"percentage"|"integer"|"whole-number"|"decimal"|"formula"} type
 * @property {boolean} [required=false] Whether a blank input is invalid.
 * @property {readonly string[]} [allowedValues] Closed list for a controlled input.
 * @property {number} [width=18] Excel column width, from 1 through 255.
 * @property {string} [description] Plain-language field guidance for the Instructions sheet.
 * @property {string|number|Date} [starterValue] Optional value for the starter row.
 * @property {string|{expression:string,resultType?:string}} [formula] Explicit calculated-column formula.
 * @property {string} [resultType] Formula result style when `type` is `formula`.
 */

/**
 * @typedef {Object} TrackerDefinition
 * @property {string} sheet Visible tracker sheet name (31 characters or fewer).
 * @property {string} title Workbook/tracker title.
 * @property {string} [tableName] Optional stable Excel table name.
 * @property {readonly TrackerColumn[]} columns
 * @property {string} [description]
 * @property {readonly string[]} [instructions]
 * @property {Record<string,string|number|Date>} [starterRow] Starter values keyed by column key or title.
 */

const FIXED_TIMESTAMP = "2000-01-01T00:00:00Z";
const ZIP_DOS_TIME = 0;
const ZIP_DOS_DATE = (20 << 9) | (1 << 5) | 1; // 2000-01-01 00:00:00.
const MAX_EXCEL_ROWS = 1_048_576;
const MAX_EXCEL_COLUMNS = 16_384;
const XML_ILLEGAL_CHARACTER = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/u;
const INVALID_SHEET_CHARACTER = /[\\/*?:[\]]/u;
const CELL_REFERENCE = /^[A-Z]{1,3}[1-9][0-9]*$/u;

const MIME = {
  workbook: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
  worksheet: "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml",
  styles: "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml",
  table: "application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml",
  core: "application/vnd.openxmlformats-package.core-properties+xml",
  app: "application/vnd.openxmlformats-officedocument.extended-properties+xml"
};

const TYPE_ALIASES = new Map([
  ["text", "text"],
  ["controlled-text", "text"],
  ["controlled_text", "text"],
  ["date", "date"],
  ["date-time", "dateTime"],
  ["datetime", "dateTime"],
  ["date_time", "dateTime"],
  ["currency", "currency"],
  ["percentage", "percentage"],
  ["percent", "percentage"],
  ["integer", "integer"],
  ["whole-number", "integer"],
  ["whole_number", "integer"],
  ["decimal", "decimal"],
  ["number", "decimal"],
  ["formula", "formula"]
]);

const STYLE = Object.freeze({
  default: 0,
  title: 1,
  note: 2,
  header: 3,
  inputText: 4,
  inputDate: 5,
  inputDateTime: 6,
  inputCurrency: 7,
  inputPercentage: 8,
  inputInteger: 9,
  inputDecimal: 10,
  formulaText: 11,
  formulaDate: 12,
  formulaDateTime: 13,
  formulaCurrency: 14,
  formulaPercentage: 15,
  formulaInteger: 16,
  formulaDecimal: 17,
  instructionHeader: 18
});

function invariant(condition, message) {
  if (!condition) throw new TypeError(message);
}

function assertSafeString(value, label, maxLength = 32_767) {
  invariant(typeof value === "string", `${label} must be a string`);
  invariant(value.length > 0, `${label} must not be empty`);
  invariant(value.length <= maxLength, `${label} exceeds ${maxLength} characters`);
  invariant(!XML_ILLEGAL_CHARACTER.test(value), `${label} contains a character XML cannot represent`);
  return value;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function inlineString(value) {
  const text = String(value);
  const preserve = /^\s|\s$/u.test(text) ? ' xml:space="preserve"' : "";
  return `<is><t${preserve}>${escapeXml(text)}</t></is>`;
}

function normalizeSheetName(value, label = "definition.sheet") {
  const name = assertSafeString(value, label, 31);
  invariant(!INVALID_SHEET_CHARACTER.test(name), `${label} contains an invalid Excel sheet-name character`);
  invariant(!name.startsWith("'") && !name.endsWith("'"), `${label} must not begin or end with an apostrophe`);
  invariant(name.toLowerCase() !== "history", `${label} uses Excel's reserved History sheet name`);
  return name;
}

function columnLetters(index) {
  invariant(Number.isInteger(index) && index >= 1 && index <= MAX_EXCEL_COLUMNS, "Excel column index is out of range");
  let number = index;
  let result = "";
  while (number > 0) {
    number -= 1;
    result = String.fromCharCode(65 + (number % 26)) + result;
    number = Math.floor(number / 26);
  }
  return result;
}

function tableName(sheetName) {
  let name = `Table_${sheetName}`.replace(/[^A-Za-z0-9_.]/gu, "_");
  if (!/^[A-Za-z_]/u.test(name)) name = `T_${name}`;
  if (CELL_REFERENCE.test(name.toUpperCase())) name = `T_${name}`;
  return name.slice(0, 255);
}

function normalizeTableName(value, sheetName) {
  if (value === undefined) return tableName(sheetName);
  const name = assertSafeString(value, "definition.tableName", 255);
  invariant(/^[A-Za-z_][A-Za-z0-9_.]*$/u.test(name), "definition.tableName is not a valid Excel table name");
  invariant(!CELL_REFERENCE.test(name.toUpperCase()), "definition.tableName cannot be an Excel cell reference");
  return name;
}

function normalizeType(value, label) {
  const normalized = TYPE_ALIASES.get(String(value ?? "").trim().toLowerCase());
  invariant(normalized, `${label} has unsupported type ${JSON.stringify(value)}`);
  return normalized;
}

function normalizeFormula(value, columnType, resultType, label) {
  if (value === undefined || value === null) {
    invariant(columnType !== "formula", `${label}.formula is required when type is formula`);
    return null;
  }
  let expression;
  let requestedResultType = resultType;
  if (typeof value === "string") expression = value;
  else {
    invariant(value && typeof value === "object" && !Array.isArray(value), `${label}.formula must be a string or object`);
    expression = value.expression;
    requestedResultType = value.resultType ?? requestedResultType;
  }
  assertSafeString(expression, `${label}.formula.expression`, 8_192);
  invariant(expression.startsWith("="), `${label}.formula.expression must begin with =`);
  invariant(!/^=[+\-@]/u.test(expression), `${label}.formula.expression has an invalid formula prefix`);
  const formula = expression.slice(1);
  invariant(formula.trim() === formula && formula.length > 0, `${label}.formula.expression must not have surrounding whitespace`);
  const styleType = columnType === "formula"
    ? normalizeType(requestedResultType ?? "text", `${label}.formula.resultType`)
    : columnType;
  invariant(styleType !== "formula", `${label}.formula.resultType must be a value type`);
  return Object.freeze({ expression: formula, styleType });
}

function normalizeAllowedValues(values, label) {
  if (values === undefined) return [];
  invariant(Array.isArray(values), `${label} must be an array`);
  invariant(values.length > 0, `${label} must not be empty when provided`);
  invariant(values.length <= MAX_EXCEL_ROWS, `${label} exceeds Excel's row limit`);
  const normalized = values.map((value, index) => assertSafeString(value, `${label}[${index}]`, 32_767));
  invariant(new Set(normalized).size === normalized.length, `${label} contains duplicate values`);
  return normalized;
}

function normalizeDefinition(definition) {
  invariant(definition && typeof definition === "object" && !Array.isArray(definition), "definition must be an object");
  const sheet = normalizeSheetName(definition.sheet);
  const normalizedTableName = normalizeTableName(definition.tableName, sheet);
  invariant(!["instructions", "_lists"].includes(sheet.toLowerCase()), "definition.sheet conflicts with a generated support sheet");
  const title = assertSafeString(definition.title, "definition.title", 255);
  invariant(Array.isArray(definition.columns), "definition.columns must be an array");
  invariant(definition.columns.length > 0, "definition.columns must not be empty");
  invariant(definition.columns.length <= MAX_EXCEL_COLUMNS, "definition.columns exceeds Excel's column limit");

  const headers = new Set();
  const keys = new Set();
  const columns = definition.columns.map((input, index) => {
    const label = `definition.columns[${index}]`;
    invariant(input && typeof input === "object" && !Array.isArray(input), `${label} must be an object`);
    const title = assertSafeString(input.title, `${label}.title`, 255);
    const foldedTitle = title.toLocaleLowerCase("en-US");
    invariant(!headers.has(foldedTitle), `${label}.title duplicates another table header`);
    headers.add(foldedTitle);
    const key = input.key === undefined ? title : assertSafeString(input.key, `${label}.key`, 255);
    invariant(!keys.has(key), `${label}.key duplicates another column key`);
    keys.add(key);
    const type = normalizeType(input.type, `${label}.type`);
    const allowedValues = normalizeAllowedValues(input.allowedValues, `${label}.allowedValues`);
    const formula = normalizeFormula(input.formula, type, input.resultType, label);
    invariant(!(formula && allowedValues.length > 0), `${label} cannot combine formula and allowedValues`);
    const width = input.width === undefined ? 18 : Number(input.width);
    invariant(Number.isFinite(width) && width >= 1 && width <= 255, `${label}.width must be between 1 and 255`);
    const required = input.required === undefined ? false : input.required;
    invariant(typeof required === "boolean", `${label}.required must be boolean`);
    const description = input.description === undefined
      ? "Enter the verified source value."
      : assertSafeString(input.description, `${label}.description`);
    return Object.freeze({
      key,
      title,
      type,
      styleType: formula?.styleType ?? type,
      allowedValues,
      formula,
      width,
      required,
      description,
      starterValue: input.starterValue
    });
  });

  const description = definition.description === undefined
    ? "Enter verified source values in unlocked cells. Calculated columns are locked and fill automatically."
    : assertSafeString(definition.description, "definition.description");
  const instructions = definition.instructions === undefined ? [] : definition.instructions;
  invariant(Array.isArray(instructions), "definition.instructions must be an array");
  const normalizedInstructions = instructions.map((value, index) => assertSafeString(value, `definition.instructions[${index}]`));
  const starterRow = definition.starterRow ?? {};
  invariant(starterRow && typeof starterRow === "object" && !Array.isArray(starterRow), "definition.starterRow must be an object");
  const acceptedStarterKeys = new Set(columns.flatMap((column) => [column.key, column.title]));
  for (const key of Object.keys(starterRow)) {
    invariant(acceptedStarterKeys.has(key), `definition.starterRow contains unknown column ${JSON.stringify(key)}`);
  }
  return Object.freeze({ sheet, tableName: normalizedTableName, title, description, instructions: normalizedInstructions, columns, starterRow });
}

function styleFor(type, locked) {
  const suffix = {
    text: "Text",
    date: "Date",
    dateTime: "DateTime",
    currency: "Currency",
    percentage: "Percentage",
    integer: "Integer",
    decimal: "Decimal"
  }[type];
  invariant(suffix, `No cell style exists for ${type}`);
  return STYLE[`${locked ? "formula" : "input"}${suffix}`];
}

function persistedFormula(definition, formula) {
  const headers = new Set(definition.columns.map((column) => column.title));
  const qualify = (column) => {
    invariant(headers.has(column), `Formula references unknown table column ${JSON.stringify(column)}`);
    return `${definition.tableName}[[#This Row],[${column}]]`;
  };
  let expression = formula.expression.replace(/\[@\[([^\]]+)\]\]/gu, (_match, column) => qualify(column));
  expression = expression.replace(/\[@([^\][\r\n]+)\]/gu, (_match, column) => qualify(column));
  invariant(!expression.includes("[@"), "Formula contains an unsupported structured table reference");
  return expression;
}

function excelSerial(value, dateTime, label) {
  let milliseconds;
  if (value instanceof Date) {
    invariant(!Number.isNaN(value.valueOf()), `${label} is an invalid Date`);
    milliseconds = value.valueOf();
  } else {
    invariant(typeof value === "string", `${label} must be an ISO date string or Date`);
    const pattern = dateTime
      ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?Z$/u
      : /^\d{4}-\d{2}-\d{2}$/u;
    invariant(pattern.test(value), `${label} must be ${dateTime ? "an ISO UTC date-time" : "an ISO date"}`);
    milliseconds = Date.parse(dateTime ? value : `${value}T00:00:00Z`);
    invariant(!Number.isNaN(milliseconds), `${label} is not a real calendar value`);
    if (!dateTime) invariant(new Date(milliseconds).toISOString().slice(0, 10) === value, `${label} is not a real calendar date`);
  }
  const serial = milliseconds / 86_400_000 + 25_569;
  invariant(serial >= 1 && serial <= 2_958_465.999999, `${label} is outside Excel's supported date range`);
  return Number(serial.toFixed(10));
}

function numericValue(value, type, label) {
  invariant(typeof value === "number" && Number.isFinite(value), `${label} must be a finite number`);
  if (type === "integer") invariant(Number.isSafeInteger(value), `${label} must be a safe integer`);
  return value;
}

function inputCellXml(reference, styleType, value, style, label) {
  if (value === undefined || value === null || value === "") return `<c r="${reference}" s="${style}"/>`;
  if (styleType === "text") {
    assertSafeString(value, label);
    return `<c r="${reference}" s="${style}" t="inlineStr">${inlineString(value)}</c>`;
  }
  if (styleType === "date" || styleType === "dateTime") {
    return `<c r="${reference}" s="${style}" t="n"><v>${excelSerial(value, styleType === "dateTime", label)}</v></c>`;
  }
  return `<c r="${reference}" s="${style}" t="n"><v>${numericValue(value, styleType, label)}</v></c>`;
}

function trackerWorksheetXml(definition) {
  const lastColumn = columnLetters(definition.columns.length);
  const tableReference = `A1:${lastColumn}2`;
  const headers = definition.columns.map((column, index) => {
    const reference = `${columnLetters(index + 1)}1`;
    return `<c r="${reference}" s="${STYLE.header}" t="inlineStr">${inlineString(column.title)}</c>`;
  }).join("");
  const starter = definition.columns.map((column, index) => {
    const reference = `${columnLetters(index + 1)}2`;
    if (column.formula) {
      return `<c r="${reference}" s="${styleFor(column.styleType, true)}"><f>${escapeXml(persistedFormula(definition, column.formula))}</f></c>`;
    }
    const value = definition.starterRow[column.key] ?? definition.starterRow[column.title] ?? column.starterValue;
    return inputCellXml(reference, column.styleType, value, styleFor(column.styleType, false), `starter value for ${column.title}`);
  }).join("");
  const columns = definition.columns.map((column, index) => (
    `<col min="${index + 1}" max="${index + 1}" width="${column.width}" customWidth="1"/>`
  )).join("");
  const validations = dataValidationsXml(definition);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="${tableReference}"/>
  <sheetViews><sheetView tabSelected="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>${columns}</cols>
  <sheetData><row r="1" ht="24" customHeight="1">${headers}</row><row r="2">${starter}</row></sheetData>
  <sheetProtection sheet="1" objects="1" scenarios="1" formatCells="1" formatColumns="1" formatRows="1" insertColumns="1" insertRows="0" insertHyperlinks="1" deleteColumns="1" deleteRows="1" selectLockedCells="1" sort="0" autoFilter="0" pivotTables="1" selectUnlockedCells="0"/>
  ${validations}
  <pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
  <tableParts count="1"><tablePart r:id="rId1"/></tableParts>
</worksheet>`;
}

function dataValidationsXml(definition) {
  const validations = [];
  definition.columns.forEach((column, index) => {
    if (column.formula) return;
    const letter = columnLetters(index + 1);
    const range = `${letter}2:${letter}${MAX_EXCEL_ROWS}`;
    const common = `allowBlank="${column.required ? 0 : 1}" showInputMessage="1" showErrorMessage="1" errorStyle="stop" sqref="${range}"`;
    if (column.allowedValues.length > 0) {
      validations.push(`<dataValidation type="list" ${common} errorTitle="Invalid value" error="Choose a value from the controlled list." promptTitle="Controlled field" prompt="Choose a listed value; do not invent a new status."><formula1>_dv_${index + 1}</formula1></dataValidation>`);
      return;
    }
    if (column.styleType === "date" || column.styleType === "dateTime") {
      validations.push(`<dataValidation type="date" operator="between" ${common} errorTitle="Invalid date" error="Enter a valid Excel date." promptTitle="Date" prompt="Enter a verified date."><formula1>1</formula1><formula2>2958465</formula2></dataValidation>`);
      return;
    }
    if (column.styleType === "integer") {
      validations.push(`<dataValidation type="whole" operator="between" ${common} errorTitle="Invalid whole number" error="Enter a whole number." promptTitle="Whole number" prompt="Enter a verified whole number."><formula1>-9007199254740991</formula1><formula2>9007199254740991</formula2></dataValidation>`);
      return;
    }
    if (["currency", "percentage", "decimal"].includes(column.styleType)) {
      validations.push(`<dataValidation type="decimal" operator="between" ${common} errorTitle="Invalid number" error="Enter a numeric value." promptTitle="Number" prompt="Enter a verified numeric value."><formula1>-1E+307</formula1><formula2>1E+307</formula2></dataValidation>`);
      return;
    }
    if (column.styleType === "text") {
      const nonempty = column.required ? `LEN(TRIM(${letter}2))&gt;0,` : "";
      const expression = column.required
        ? `AND(${nonempty}NOT(OR(LEFT(${letter}2,1)=&quot;=&quot;,LEFT(${letter}2,1)=&quot;+&quot;,LEFT(${letter}2,1)=&quot;-&quot;,LEFT(${letter}2,1)=&quot;@&quot;)))`
        : `OR(${letter}2=&quot;&quot;,AND(LEN(TRIM(${letter}2))&gt;0,NOT(OR(LEFT(${letter}2,1)=&quot;=&quot;,LEFT(${letter}2,1)=&quot;+&quot;,LEFT(${letter}2,1)=&quot;-&quot;,LEFT(${letter}2,1)=&quot;@&quot;))))`;
      validations.push(`<dataValidation type="custom" ${common} errorTitle="Unsafe text value" error="Enter text that does not begin with =, +, -, or @." promptTitle="Verified text" prompt="Paste values only; formula-leading text is rejected."><formula1>${expression}</formula1></dataValidation>`);
    }
  });
  if (validations.length === 0) return "";
  return `<dataValidations count="${validations.length}">${validations.join("")}</dataValidations>`;
}

function tableXml(definition) {
  const lastColumn = columnLetters(definition.columns.length);
  const tableColumns = definition.columns.map((column, index) => {
    const formula = column.formula
      ? `<calculatedColumnFormula>${escapeXml(persistedFormula(definition, column.formula))}</calculatedColumnFormula>`
      : "";
    return `<tableColumn id="${index + 1}" name="${escapeXml(column.title)}">${formula}</tableColumn>`;
  }).join("");
  const name = definition.tableName;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name="${escapeXml(name)}" displayName="${escapeXml(name)}" ref="A1:${lastColumn}2" headerRowCount="1" totalsRowShown="0">
  <autoFilter ref="A1:${lastColumn}2"/>
  <tableColumns count="${definition.columns.length}">${tableColumns}</tableColumns>
  <tableStyleInfo name="TableStyleMedium2" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/>
</table>`;
}

function instructionsWorksheetXml(definition) {
  const rows = [];
  rows.push(`<row r="1" ht="30" customHeight="1"><c r="A1" s="${STYLE.title}" t="inlineStr">${inlineString(definition.title)}</c></row>`);
  rows.push(`<row r="2"><c r="A2" s="${STYLE.note}" t="inlineStr">${inlineString(definition.description)}</c></row>`);
  let rowNumber = 4;
  if (definition.instructions.length > 0) {
    rows.push(`<row r="${rowNumber}"><c r="A${rowNumber}" s="${STYLE.instructionHeader}" t="inlineStr">${inlineString("Operating instructions")}</c></row>`);
    rowNumber += 1;
    for (const instruction of definition.instructions) {
      rows.push(`<row r="${rowNumber}"><c r="A${rowNumber}" s="${STYLE.note}" t="inlineStr">${inlineString(`• ${instruction}`)}</c></row>`);
      rowNumber += 1;
    }
    rowNumber += 1;
  }
  rows.push(`<row r="${rowNumber}"><c r="A${rowNumber}" s="${STYLE.instructionHeader}" t="inlineStr">${inlineString("Column")}</c><c r="B${rowNumber}" s="${STYLE.instructionHeader}" t="inlineStr">${inlineString("Required")}</c><c r="C${rowNumber}" s="${STYLE.instructionHeader}" t="inlineStr">${inlineString("Type")}</c><c r="D${rowNumber}" s="${STYLE.instructionHeader}" t="inlineStr">${inlineString("Allowed values / guidance")}</c></row>`);
  rowNumber += 1;
  for (const column of definition.columns) {
    const allowed = column.formula
      ? `Calculated and locked: =${column.formula.expression}`
      : column.allowedValues.length > 0
        ? column.allowedValues.join("; ")
        : column.description;
    const cells = [column.title, column.required ? "Yes" : "Conditional or optional", column.styleType, allowed]
      .map((value, index) => `<c r="${columnLetters(index + 1)}${rowNumber}" s="${STYLE.note}" t="inlineStr">${inlineString(value)}</c>`)
      .join("");
    rows.push(`<row r="${rowNumber}">${cells}</row>`);
    rowNumber += 1;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:D${rowNumber - 1}"/>
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols><col min="1" max="1" width="34" customWidth="1"/><col min="2" max="2" width="22" customWidth="1"/><col min="3" max="3" width="16" customWidth="1"/><col min="4" max="4" width="90" customWidth="1"/></cols>
  <sheetData>${rows.join("")}</sheetData>
  <mergeCells count="2"><mergeCell ref="A1:D1"/><mergeCell ref="A2:D2"/></mergeCells>
  <pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
</worksheet>`;
}

function listsWorksheetXml(definition) {
  const controlledColumns = definition.columns
    .map((column, index) => ({ column, index }))
    .filter(({ column }) => column.allowedValues.length > 0);
  if (controlledColumns.length === 0) return null;
  const maximumRows = Math.max(...controlledColumns.map(({ column }) => column.allowedValues.length));
  const rowXml = [];
  for (let row = 1; row <= maximumRows; row += 1) {
    const cells = controlledColumns.map(({ column }, listIndex) => {
      const value = column.allowedValues[row - 1];
      if (value === undefined) return "";
      return `<c r="${columnLetters(listIndex + 1)}${row}" t="inlineStr">${inlineString(value)}</c>`;
    }).join("");
    rowXml.push(`<row r="${row}">${cells}</row>`);
  }
  const lastColumn = columnLetters(controlledColumns.length);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastColumn}${maximumRows}"/>
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <sheetData>${rowXml.join("")}</sheetData>
</worksheet>`;
}

function workbookXml(definition, includesLists) {
  const sheets = [
    '<sheet name="Instructions" sheetId="1" r:id="rId1"/>',
    `<sheet name="${escapeXml(definition.sheet)}" sheetId="2" r:id="rId2"/>`
  ];
  if (includesLists) sheets.push('<sheet name="_Lists" sheetId="3" state="veryHidden" r:id="rId3"/>');
  const controlledColumns = definition.columns
    .map((column, index) => ({ column, index }))
    .filter(({ column }) => column.allowedValues.length > 0);
  const definedNames = controlledColumns.length === 0 ? "" : `<definedNames>${controlledColumns.map(({ column, index }, listIndex) => (
    `<definedName name="_dv_${index + 1}" hidden="1">&apos;_Lists&apos;!$${columnLetters(listIndex + 1)}$1:$${columnLetters(listIndex + 1)}$${column.allowedValues.length}</definedName>`
  )).join("")}</definedNames>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <fileVersion appName="xl" lastEdited="7" lowestEdited="7" rupBuild="30228"/>
  <bookViews><workbookView activeTab="1" firstSheet="0"/></bookViews>
  <sheets>${sheets.join("")}</sheets>
  ${definedNames}
  <calcPr calcId="191029" calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/>
</workbook>`;
}

function workbookRelationshipsXml(includesLists) {
  const relationships = [
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>',
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>'
  ];
  let nextId = 3;
  if (includesLists) {
    relationships.push(`<Relationship Id="rId${nextId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>`);
    nextId += 1;
  }
  relationships.push(`<Relationship Id="rId${nextId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships.join("")}</Relationships>`;
}

function stylesXml() {
  const xf = (numFmtId, unlocked, fillId = 0, fontId = 0, borderId = 1, alignment = "") => (
    `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyProtection="1"${alignment ? ` applyAlignment="1"><alignment ${alignment}/>` : ">"}${unlocked ? '<protection locked="0"/>' : '<protection locked="1"/>'}</xf>`
  );
  const cellXfs = [
    xf(0, false, 0, 0, 0),
    xf(0, false, 2, 2, 0, 'vertical="center"'),
    xf(0, false, 0, 0, 0, 'vertical="top" wrapText="1"'),
    xf(0, false, 3, 1, 1, 'horizontal="center" vertical="center" wrapText="1"'),
    xf(0, true), xf(164, true), xf(165, true), xf(166, true), xf(167, true), xf(168, true), xf(169, true),
    xf(0, false), xf(164, false), xf(165, false), xf(166, false), xf(167, false), xf(168, false), xf(169, false),
    xf(0, false, 4, 1, 1, 'vertical="center" wrapText="1"')
  ];
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="6"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd hh:mm"/><numFmt numFmtId="166" formatCode="&quot;$&quot;#,##0.00;[Red]-&quot;$&quot;#,##0.00"/><numFmt numFmtId="167" formatCode="0.00%"/><numFmt numFmtId="168" formatCode="0"/><numFmt numFmtId="169" formatCode="0.00"/></numFmts>
  <fonts count="3"><font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="18"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font></fonts>
  <fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF17324D"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF24597A"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF3A7596"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD6E0E8"/></left><right style="thin"><color rgb="FFD6E0E8"/></right><top style="thin"><color rgb="FFD6E0E8"/></top><bottom style="thin"><color rgb="FFD6E0E8"/></bottom><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="${cellXfs.length}">${cellXfs.join("")}</cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;
}

function contentTypesXml(includesLists) {
  const worksheetOverrides = [1, 2, ...(includesLists ? [3] : [])]
    .map((number) => `<Override PartName="/xl/worksheets/sheet${number}.xml" ContentType="${MIME.worksheet}"/>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${MIME.workbook}"/>${worksheetOverrides}<Override PartName="/xl/styles.xml" ContentType="${MIME.styles}"/><Override PartName="/xl/tables/table1.xml" ContentType="${MIME.table}"/><Override PartName="/docProps/core.xml" ContentType="${MIME.core}"/><Override PartName="/docProps/app.xml" ContentType="${MIME.app}"/></Types>`;
}

function appPropertiesXml(definition, includesLists) {
  const names = ["Instructions", definition.sheet, ...(includesLists ? ["_Lists"] : [])];
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>ENTRAL Phase 204 deterministic XLSX</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>${names.length}</vt:i4></vt:variant></vt:vector></HeadingPairs><TitlesOfParts><vt:vector size="${names.length}" baseType="lpstr">${names.map((name) => `<vt:lpstr>${escapeXml(name)}</vt:lpstr>`).join("")}</vt:vector></TitlesOfParts><Company>Sovereign Protocol</Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>1.0</AppVersion></Properties>`;
}

function corePropertiesXml(definition) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(definition.title)}</dc:title><dc:creator>Sovereign Protocol</dc:creator><cp:lastModifiedBy>Sovereign Protocol</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${FIXED_TIMESTAMP}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${FIXED_TIMESTAMP}</dcterms:modified></cp:coreProperties>`;
}

function packageEntries(definition) {
  const lists = listsWorksheetXml(definition);
  const includesLists = lists !== null;
  const entries = [
    ["[Content_Types].xml", contentTypesXml(includesLists)],
    ["_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>'],
    ["docProps/app.xml", appPropertiesXml(definition, includesLists)],
    ["docProps/core.xml", corePropertiesXml(definition)],
    ["xl/_rels/workbook.xml.rels", workbookRelationshipsXml(includesLists)],
    ["xl/styles.xml", stylesXml()],
    ["xl/tables/table1.xml", tableXml(definition)],
    ["xl/workbook.xml", workbookXml(definition, includesLists)],
    ["xl/worksheets/_rels/sheet2.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table1.xml"/></Relationships>'],
    ["xl/worksheets/sheet1.xml", instructionsWorksheetXml(definition)],
    ["xl/worksheets/sheet2.xml", trackerWorksheetXml(definition)]
  ];
  if (lists) entries.push(["xl/worksheets/sheet3.xml", lists]);
  return entries;
}

function crc32(buffer) {
  let crc = 0xFFFFFFFF;
  for (const octet of buffer) {
    crc ^= octet;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function assertSafeZipPath(path) {
  invariant(typeof path === "string" && path.length > 0, "ZIP entry path must be a nonempty string");
  invariant(path === path.replaceAll("\\", "/"), `ZIP entry path must use forward slashes: ${path}`);
  invariant(!path.startsWith("/") && !/^[A-Za-z]:/u.test(path), `ZIP entry path must be relative: ${path}`);
  invariant(!path.split("/").some((segment) => segment === "" || segment === "." || segment === ".."), `ZIP entry path is unsafe: ${path}`);
  invariant(Buffer.byteLength(path, "utf8") <= 65_535, `ZIP entry path is too long: ${path}`);
}

function zip(entries) {
  const normalized = entries.map(([path, content]) => {
    assertSafeZipPath(path);
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
    const name = Buffer.from(path, "utf8");
    invariant(data.length <= 0xFFFFFFFF, `ZIP entry exceeds ZIP32 capacity: ${path}`);
    return { path, name, data, crc: crc32(data) };
  }).sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  invariant(new Set(normalized.map(({ path }) => path)).size === normalized.length, "ZIP contains a duplicate entry path");

  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of normalized) {
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034B50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(ZIP_DOS_TIME, 10);
    local.writeUInt16LE(ZIP_DOS_DATE, 12);
    local.writeUInt32LE(entry.crc, 14);
    local.writeUInt32LE(entry.data.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(entry.name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, entry.name, entry.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014B50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(ZIP_DOS_TIME, 12);
    central.writeUInt16LE(ZIP_DOS_DATE, 14);
    central.writeUInt32LE(entry.crc, 16);
    central.writeUInt32LE(entry.data.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(entry.name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, entry.name);
    offset += local.length + entry.name.length + entry.data.length;
  }
  invariant(normalized.length <= 65_535, "ZIP contains too many entries for ZIP32");
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054B50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(normalized.length, 8);
  end.writeUInt16LE(normalized.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

/**
 * Build a deterministic `.xlsx` file as a Buffer. The function performs no I/O.
 * Input values are always stored as values; only an explicit `formula` property
 * produces an Excel formula. Formula columns are locked and input columns are
 * unlocked. The workbook contains Instructions, the tracker, and—when needed—a
 * very-hidden controlled-value sheet.
 *
 * @param {TrackerDefinition} definition
 * @returns {Buffer}
 */
export function generatePhase204Xlsx(definition) {
  return zip(packageEntries(normalizeDefinition(definition)));
}

export const PHASE204_XLSX_FIXED_TIMESTAMP = FIXED_TIMESTAMP;
