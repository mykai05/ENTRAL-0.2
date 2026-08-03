import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "..");
const sourceRoot = join(repositoryRoot, "commerce", "products", "rivetrelay", "source");

const products = [
  {
    id: "RR-LR-001",
    slug: "lead-response-estimate-follow-up",
    name: "Lead Response and Estimate Follow-Up Kit",
    price: "$29",
    files: [
      "CLAIMS_INVENTORY.csv", "IMPLEMENTATION_GUIDE.md", "RESPONSE_AND_FOLLOW_UP_PLAYBOOK.md",
      "START_HERE.md", "VERSION_LICENSE_SUPPORT.md", "lead_tracker_fields_and_formulas.csv",
      "lead_tracker_fictional_example.csv", "lead_tracker_template.csv"
    ]
  },
  {
    id: "RR-CO-001",
    slug: "scope-change-order-control",
    name: "Scope and Change-Order Control Pack",
    price: "$49",
    files: [
      "CLAIMS_INVENTORY.csv", "IMPLEMENTATION_GUIDE.md", "SCOPE_AND_CHANGE_ORDER_PLAYBOOK.md",
      "START_HERE.md", "VERSION_LICENSE_SUPPORT.md", "change_order_fields_and_formulas.csv",
      "change_order_tracker_fictional_example.csv", "change_order_tracker_template.csv"
    ]
  },
  {
    id: "RR-BC-001",
    slug: "billing-collections-accelerator",
    name: "Billing and Collections Accelerator",
    price: "$49",
    files: [
      "BILLING_AND_COLLECTIONS_PLAYBOOK.md", "CLAIMS_INVENTORY.csv", "IMPLEMENTATION_GUIDE.md",
      "START_HERE.md", "VERSION_LICENSE_SUPPORT.md", "receivables_fields_and_formulas.csv",
      "receivables_tracker_fictional_example.csv", "receivables_tracker_template.csv"
    ]
  },
  {
    id: "RR-WD-001",
    slug: "weekly-owner-command-dashboard",
    name: "Weekly Owner Command Dashboard",
    price: "$39",
    files: [
      "CLAIMS_INVENTORY.csv", "IMPLEMENTATION_GUIDE.md", "START_HERE.md", "VERSION_LICENSE_SUPPORT.md",
      "WEEKLY_COMMAND_PLAYBOOK.md", "weekly_dashboard_fields_and_formulas.csv",
      "weekly_dashboard_fictional_example.csv", "weekly_dashboard_template.csv"
    ]
  }
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseCsv(source, file) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  assert.equal(quoted, false, `${file} has an unterminated quoted cell`);
  if (cell !== "" || row.length > 0) {
    row.push(cell.replace(/\r$/u, ""));
    rows.push(row);
  }
  assert.ok(rows.length >= 1, `${file} must contain a header`);
  const width = rows[0].length;
  assert.ok(width > 1, `${file} must contain multiple columns`);
  rows.forEach((entry, index) => assert.equal(entry.length, width, `${file} row ${index + 1} width mismatch`));
  assert.equal(new Set(rows[0]).size, rows[0].length, `${file} has duplicate headers`);
  return rows;
}

function objects(rows) {
  return rows.slice(1).map((row) => Object.fromEntries(rows[0].map((field, index) => [field, row[index]])));
}

function number(value) {
  return value === "" ? null : Number(value);
}

function daysBetween(later, earlier) {
  return Math.round((Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) / 86_400_000);
}

function leadReference(row) {
  const daysSinceEstimate = row.Estimate_Delivered_Date && row.Control_Date
    ? Math.max(0, daysBetween(row.Control_Date, row.Estimate_Delivered_Date))
    : "";
  const followUpFlag = row.Stage === "CLOSED" ? "CLOSED"
    : !row.Control_Date || !["ELIGIBLE", "PREFERENCE_LIMITED"].includes(row.Contact_Eligibility) ? "HOLD"
      : !row.Next_Action_Date ? "DUE"
        : row.Next_Action_Date < row.Control_Date ? "OVERDUE"
          : row.Next_Action_Date === row.Control_Date ? "DUE" : "NOT_DUE";
  const review = !row.Lead_ID || !row.Received_Date || !row.Control_Date || row.Received_Date > row.Control_Date
    || !row.Customer_Record_Ref || !row.Project_Type || !row.Lead_Source || !row.Contact_Eligibility
    || !row.Priority || !row.Stage || row.Follow_Up_Count === "" || number(row.Follow_Up_Count) < 0
    || !row.Response_Status || !row.Evidence_Ref
    || Boolean(row.Last_Contact_Date && row.Last_Contact_Date > row.Control_Date)
    || (number(row.Follow_Up_Count) > 0 && (!row.Last_Contact_Date || !row.Last_Contact_Channel))
    || (row.Stage !== "CLOSED" && (!row.Assigned_To || !row.Next_Action || !row.Next_Action_Date))
    || (["ESTIMATE_DELIVERED", "DECISION_PENDING"].includes(row.Stage)
      && (!row.Estimate_Ref || !row.Estimate_Delivered_Date || row.Estimate_Delivered_Date > row.Control_Date))
    || (row.Stage === "CLOSED" && (!row.Outcome || !row.Outcome_Date || row.Outcome_Date > row.Control_Date));
  return { daysSinceEstimate: String(daysSinceEstimate), followUpFlag, quality: review ? "REVIEW" : "COMPLETE" };
}

function scopeReference(row) {
  const total = row.Cost_Impact_PreTax && row.Tax_Impact
    ? (number(row.Cost_Impact_PreTax) + number(row.Tax_Impact)).toFixed(2) : "";
  const pending = row.Approval_State === "REQUESTED" && row.Proposal_Issued_Date && row.Control_Date
    ? Math.max(0, daysBetween(row.Control_Date, row.Proposal_Issued_Date)) : 0;
  const unbilled = row.Approval_State === "APPROVED"
    && ["APPROVED", "SCHEDULED", "COMPLETED", "BILLED"].includes(row.Change_Status)
    && ["NOT_READY", "READY"].includes(row.Billing_Status) && total !== "" ? total : "0.00";
  const proposalRequired = ["PENDING_CUSTOMER", "APPROVED", "DECLINED", "SCHEDULED", "COMPLETED", "BILLED"].includes(row.Change_Status);
  const finalDecision = ["APPROVED", "DECLINED", "EXPIRED", "DISPUTED"].includes(row.Approval_State);
  const execution = ["APPROVED", "SCHEDULED", "COMPLETED", "BILLED"].includes(row.Change_Status);
  const completed = ["COMPLETED", "BILLED"].includes(row.Change_Status);
  const invoiced = ["INVOICED", "PARTIALLY_PAID", "PAID", "DISPUTED", "CREDITED"].includes(row.Billing_Status);
  const review = !row.Project_ID || !row.Change_Order_ID || !row.Revision || number(row.Revision) < 1
    || !row.Date_Identified || !row.Control_Date || row.Date_Identified > row.Control_Date || !row.Requested_By
    || !row.Safety_Class || !row.Observed_Condition || !row.Original_Scope_Ref || !row.Change_Status
    || !row.Schedule_Impact_State || !row.Approval_State || !row.Billing_Status || !row.Owner
    || (proposalRequired && (!row.Proposed_Change || !row.Cost_Impact_PreTax || !row.Tax_Impact || !row.Proposal_Ref
      || !row.Proposal_Issued_Date || row.Proposal_Issued_Date < row.Date_Identified || row.Proposal_Issued_Date > row.Control_Date))
    || (row.Approval_State === "REQUESTED" && (!row.Proposal_Ref || !row.Proposal_Issued_Date))
    || (finalDecision && (!row.Decision_Date || row.Decision_Date > row.Control_Date || !row.Decision_Evidence_Ref))
    || (row.Approval_State === "APPROVED" && !row.Authorized_By)
    || (completed && (!row.Work_Completed_Date || row.Work_Completed_Date > row.Control_Date || !row.Completion_Evidence_Ref))
    || (invoiced && !row.Invoice_Ref);
  const authority = (row.Approval_State === "APPROVED" && row.Decision_Evidence_Ref && row.Authorized_By)
    || (row.Safety_Class === "EMERGENCY_MAKE_SAFE" && row.Approval_State === "NOT_APPLICABLE"
      && row.Decision_Evidence_Ref && row.Authorized_By);
  return { total, pending: String(pending), unbilled, control: review ? "REVIEW" : execution && !authority ? "HOLD" : "COMPLETE" };
}

function billingReference(row) {
  const calculated = number(row.Original_Amount) - number(row.Credits_Applied) - number(row.Payments_Applied);
  const variance = calculated - number(row.Ledger_Balance);
  const aging = calculated <= 0 || !row.Due_Date || !row.Control_Date ? 0 : Math.max(0, daysBetween(row.Control_Date, row.Due_Date));
  const bucket = calculated <= 0 || aging === 0 ? "CURRENT" : aging <= 30 ? "1-30" : aging <= 60 ? "31-60" : aging <= 90 ? "61-90" : "91+";
  const action = !row.Control_Date || row.Calculated_Balance === "" || row.Ledger_Balance === "" || Math.abs(variance) > 0.009 ? "HOLD"
    : calculated <= 0 ? "CLOSED"
      : !["ELIGIBLE", "PREFERENCE_LIMITED"].includes(row.Contact_Eligibility)
        || ["PAID", "CREDITED", "VOID"].includes(row.Invoice_Status)
        || !["NONE", "RESOLVED"].includes(row.Dispute_Status) ? "HOLD"
        : !row.Next_Action_Date ? "DUE" : row.Next_Action_Date < row.Control_Date ? "OVERDUE"
          : row.Next_Action_Date === row.Control_Date ? "DUE" : "NOT_DUE";
  const review = !row.Invoice_ID || !row.Project_ID || !row.Customer_Record_Ref || !row.Issue_Date || !row.Due_Date
    || !row.Control_Date || row.Issue_Date > row.Control_Date || number(row.Original_Amount) < 0
    || number(row.Credits_Applied) < 0 || number(row.Payments_Applied) < 0 || number(row.Ledger_Balance) < 0
    || !row.Invoice_Status || !row.Contact_Eligibility || !row.Dispute_Status || !row.Promise_Status || !row.Owner
    || !row.Invoice_Evidence_Ref || !row.Latest_Event_Evidence_Ref || Math.abs(variance) > 0.009
    || (calculated > 0 && ["PAID", "CREDITED", "VOID"].includes(row.Invoice_Status))
    || (calculated <= 0 && !["PAID", "CREDITED", "VOID", "WRITE_OFF_REVIEW"].includes(row.Invoice_Status))
    || (row.Invoice_Status === "DISPUTED" && row.Dispute_Status === "NONE")
    || (row.Promise_Status === "OPEN" && (!row.Promise_Amount || number(row.Promise_Amount) < 0 || !row.Promise_Date))
    || (row.Promise_Status === "NONE" && Boolean(row.Promise_Amount || row.Promise_Date))
    || (calculated > 0 && (!row.Next_Action_Type || row.Next_Action_Type === "NONE" || !row.Next_Action_Date));
  return { calculated: calculated.toFixed(2), variance: variance.toFixed(2), aging: String(aging), bucket, action, quality: review ? "REVIEW" : "COMPLETE" };
}

function weeklyReference(row) {
  const received = number(row.Leads_Received);
  const responded = number(row.Leads_With_First_Response);
  const decided = number(row.Estimates_Decided);
  const accepted = number(row.Estimates_Accepted);
  const available = number(row.Available_Crew_Days_Next_Week);
  const committed = number(row.Committed_Crew_Days_Next_Week);
  const leadRate = received > 0 && responded >= 0 && responded <= received ? responded / received : null;
  const estimateRate = decided > 0 && accepted >= 0 && accepted <= decided ? accepted / decided : null;
  const capacity = available > 0 && committed >= 0 ? committed / available : null;
  const numericFields = ["Leads_Received", "Leads_With_First_Response", "Estimates_Issued", "Estimates_Decided", "Estimates_Accepted",
    "Estimate_Value_Issued", "Approved_Change_Value", "Completed_Unbilled_Change_Value", "Invoices_Issued_Value", "Cash_Received",
    "Open_AR", "AR_Past_Due", "Credits_And_Refunds", "Active_Projects", "Projects_At_Risk", "Available_Crew_Days_Next_Week",
    "Committed_Crew_Days_Next_Week", "Owner_Decisions_Open", "Safety_Holds", "Data_Unavailable_Count"];
  const required = ["Week_Start", "Week_End", "Data_As_Of", "Business_Scope", "Currency", ...numericFields,
    "Overall_Status", "Top_Exception", "Next_Owner_Action", "Evidence_Packet_Ref"];
  const review = required.some((field) => row[field] === "") || row.Week_End < row.Week_Start || row.Currency.length !== 3
    || numericFields.some((field) => number(row[field]) < 0) || responded > received || accepted > decided
    || number(row.AR_Past_Due) > number(row.Open_AR) || number(row.Projects_At_Risk) > number(row.Active_Projects)
    || (committed > 0 && available <= 0) || number(row.Data_Unavailable_Count) > 0
    || (number(row.Safety_Holds) > 0 && row.Overall_Status !== "BLOCKED")
    || (row.Overall_Status === "HEALTHY" && (number(row.Projects_At_Risk) > 0 || number(row.Owner_Decisions_Open) > 0
      || number(row.Safety_Holds) > 0 || number(row.Data_Unavailable_Count) > 0 || capacity > 1));
  return { leadRate, estimateRate, capacity, quality: review ? "REVIEW" : "COMPLETE" };
}

async function sourceFiles(directory = sourceRoot) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(path));
    else if (entry.isFile()) files.push(path);
  }
  return files.sort();
}

test("Phase 204 product source is the exact complete five-product corpus", async () => {
  const readme = await readFile(join(sourceRoot, "README.md"), "utf8");
  for (const product of products) {
    assert.ok(readme.includes(product.id));
    assert.ok(readme.includes(product.name));
    assert.ok(readme.includes(product.price));
    const actual = (await readdir(join(sourceRoot, product.slug))).sort();
    assert.deepEqual(actual, [...product.files].sort(), `${product.id} source file set drifted`);
  }
  const bundleFiles = (await readdir(join(sourceRoot, "complete-contractor-control-bundle"))).sort();
  assert.deepEqual(bundleFiles, [
    "BUNDLE_MANIFEST.csv", "CLAIMS_INVENTORY.csv", "INTEGRATION_GUIDE.md", "START_HERE.md",
    "VERSION_LICENSE_SUPPORT.md"
  ]);
  assert.equal((await sourceFiles()).length, 38);
});

test("all CSV files parse strictly and contain no unsafe customer-value formulas", async () => {
  const files = (await sourceFiles()).filter((path) => path.endsWith(".csv"));
  assert.equal(files.length, 18);
  for (const path of files) {
    const rel = relative(repositoryRoot, path);
    const rows = parseCsv(await readFile(path, "utf8"), rel);
    const isFormulaDictionary = basename(path).includes("fields_and_formulas");
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      for (let columnIndex = 0; columnIndex < rows[rowIndex].length; columnIndex += 1) {
        const value = rows[rowIndex][columnIndex];
        if (/^[+@-]/u.test(value) || (value.startsWith("=") && !isFormulaDictionary)) {
          assert.fail(`${rel} row ${rowIndex + 1} column ${columnIndex + 1} contains an unsafe formula-leading value`);
        }
      }
    }
  }
});

test("trackers, examples, field dictionaries, claims, and governance stay aligned", async () => {
  for (const product of products) {
    const directory = join(sourceRoot, product.slug);
    const files = await readdir(directory);
    const trackerName = files.find((file) => file.endsWith("_template.csv"));
    const exampleName = files.find((file) => file.endsWith("_fictional_example.csv"));
    const dictionaryName = files.find((file) => file.endsWith("_fields_and_formulas.csv"));
    assert.ok(trackerName && exampleName && dictionaryName);
    const tracker = parseCsv(await readFile(join(directory, trackerName), "utf8"), trackerName);
    const example = parseCsv(await readFile(join(directory, exampleName), "utf8"), exampleName);
    const dictionary = parseCsv(await readFile(join(directory, dictionaryName), "utf8"), dictionaryName);
    assert.deepEqual(example[0], tracker[0], `${product.id} tracker/example fields drifted`);
    assert.deepEqual(dictionary.slice(1).map((row) => row[0]), tracker[0], `${product.id} field dictionary drifted`);
    assert.ok(example.length >= 5, `${product.id} needs at least four populated examples`);
    assert.match(example.flat().join("\n"), /FICTIONAL/u);
    const formulaIndex = dictionary[0].indexOf("Spreadsheet_Formula_or_Instruction");
    const formulas = dictionary.slice(1).map((row) => row[formulaIndex]).filter(Boolean);
    assert.ok(formulas.length >= 3, `${product.id} must include working spreadsheet formulas`);
    formulas.forEach((formula) => {
      assert.ok(formula.startsWith("="), `${product.id} has a malformed formula`);
      assert.equal((formula.match(/\(/gu) ?? []).length, (formula.match(/\)/gu) ?? []).length);
      assert.equal((formula.match(/\[/gu) ?? []).length, (formula.match(/\]/gu) ?? []).length);
    });
    const claims = parseCsv(await readFile(join(directory, "CLAIMS_INVENTORY.csv"), "utf8"), `${product.id} claims`);
    assert.equal(claims.length, 8, `${product.id} must bind exactly seven claims`);
    assert.ok(claims.slice(1).every((row) => row.every((cell) => cell.trim().length > 0)));
    const governance = await readFile(join(directory, "VERSION_LICENSE_SUPPORT.md"), "utf8");
    for (const required of ["Version 1.0.0", "Permitted-use", "AI", "Support"]) {
      assert.ok(governance.toLocaleLowerCase().includes(required.toLocaleLowerCase()), `${product.id} lacks ${required}`);
    }
    assert.match(governance, /not [^.\n]*legal/iu, `${product.id} lacks a legal-advice boundary`);
  }
});

test("bundle manifest binds every component source file to an exact digest", async () => {
  const manifestPath = join(sourceRoot, "complete-contractor-control-bundle", "BUNDLE_MANIFEST.csv");
  const rows = parseCsv(await readFile(manifestPath, "utf8"), "BUNDLE_MANIFEST.csv");
  assert.equal(rows.length, 33);
  const header = rows[0];
  const pathIndex = header.indexOf("Relative_Path");
  const hashIndex = header.indexOf("SHA256");
  const requiredIndex = header.indexOf("Required");
  const seen = new Set();
  for (const row of rows.slice(1)) {
    assert.equal(row[requiredIndex], "true");
    assert.match(row[hashIndex], /^[0-9a-f]{64}$/u);
    assert.ok(!seen.has(row[pathIndex]), `duplicate manifest path ${row[pathIndex]}`);
    seen.add(row[pathIndex]);
    const bytes = await readFile(join(sourceRoot, row[pathIndex]));
    assert.equal(sha256(bytes), row[hashIndex], `${row[pathIndex]} digest drifted`);
  }
});

test("all 23 fictional rows match the fail-closed reference calculations", async () => {
  const leadRows = objects(parseCsv(await readFile(join(sourceRoot, products[0].slug, products[0].files.find((file) => file.endsWith("_fictional_example.csv"))), "utf8"), "lead example"));
  const scopeRows = objects(parseCsv(await readFile(join(sourceRoot, products[1].slug, products[1].files.find((file) => file.endsWith("_fictional_example.csv"))), "utf8"), "scope example"));
  const billingRows = objects(parseCsv(await readFile(join(sourceRoot, products[2].slug, products[2].files.find((file) => file.endsWith("_fictional_example.csv"))), "utf8"), "billing example"));
  const weeklyRows = objects(parseCsv(await readFile(join(sourceRoot, products[3].slug, products[3].files.find((file) => file.endsWith("_fictional_example.csv"))), "utf8"), "weekly example"));
  assert.equal(leadRows.length + scopeRows.length + billingRows.length + weeklyRows.length, 23);
  for (const row of leadRows) {
    const expected = leadReference(row);
    assert.equal(row.Days_Since_Estimate, expected.daysSinceEstimate, `${row.Lead_ID} days drifted`);
    assert.equal(row.Follow_Up_Flag, expected.followUpFlag, `${row.Lead_ID} follow-up drifted`);
    assert.equal(row.Record_Quality_Flag, expected.quality, `${row.Lead_ID} quality drifted`);
  }
  for (const row of scopeRows) {
    const expected = scopeReference(row);
    assert.equal(row.Total_Change, expected.total, `${row.Change_Order_ID} total drifted`);
    assert.equal(row.Days_Pending_Decision, expected.pending, `${row.Change_Order_ID} pending days drifted`);
    assert.equal(row.Unbilled_Approved_Value, expected.unbilled, `${row.Change_Order_ID} unbilled value drifted`);
    assert.equal(row.Control_Flag, expected.control, `${row.Change_Order_ID} control drifted`);
  }
  for (const row of billingRows) {
    const expected = billingReference(row);
    assert.equal(row.Calculated_Balance, expected.calculated, `${row.Invoice_ID} balance drifted`);
    assert.equal(row.Balance_Variance, expected.variance, `${row.Invoice_ID} variance drifted`);
    assert.equal(row.Aging_Days, expected.aging, `${row.Invoice_ID} aging drifted`);
    assert.equal(row.Aging_Bucket, expected.bucket, `${row.Invoice_ID} aging bucket drifted`);
    assert.equal(row.Action_Flag, expected.action, `${row.Invoice_ID} action drifted`);
    assert.equal(row.Record_Quality_Flag, expected.quality, `${row.Invoice_ID} quality drifted`);
  }
  for (const row of weeklyRows) {
    const expected = weeklyReference(row);
    assert.ok(Math.abs(number(row.Lead_Response_Coverage) - expected.leadRate) < 0.0001);
    assert.ok(Math.abs(number(row.Estimate_Acceptance_Rate) - expected.estimateRate) < 0.0001);
    assert.ok(Math.abs(number(row.Capacity_Load) - expected.capacity) < 0.0001);
    assert.equal(row.Data_Quality_Flag, expected.quality, `${row.Week_Start} quality drifted`);
  }
});

test("adversarial missing, inconsistent, and future-dated rows fail closed", () => {
  const lead = {
    Lead_ID: "L1", Received_Date: "2026-07-10", Control_Date: "2026-07-11", Customer_Record_Ref: "C1", Project_Type: "Repair",
    Lead_Source: "Referral", Contact_Eligibility: "UNKNOWN", Priority: "HIGH", Stage: "NEW", Assigned_To: "Owner",
    Last_Contact_Date: "", Last_Contact_Channel: "", Next_Action: "Verify eligibility", Next_Action_Date: "2026-07-11",
    Estimate_Ref: "", Estimate_Delivered_Date: "", Follow_Up_Count: "0", Response_Status: "NOT_STARTED", Outcome: "",
    Outcome_Date: "", Evidence_Ref: "E1"
  };
  assert.equal(leadReference(lead).followUpFlag, "HOLD");
  assert.equal(leadReference({ ...lead, Lead_Source: "" }).quality, "REVIEW");
  assert.equal(leadReference({ ...lead, Contact_Eligibility: "ELIGIBLE", Received_Date: "2026-07-12" }).quality, "REVIEW");

  const scope = {
    Project_ID: "P1", Change_Order_ID: "CO1", Revision: "1", Date_Identified: "2026-07-01", Control_Date: "2026-07-05",
    Requested_By: "CUSTOMER", Safety_Class: "ROUTINE", Observed_Condition: "Observed", Original_Scope_Ref: "S1",
    Proposed_Change: "Change", Change_Status: "APPROVED", Cost_Impact_PreTax: "100", Tax_Impact: "0", Schedule_Impact_State: "VERIFIED",
    Proposal_Ref: "PR1", Proposal_Issued_Date: "2026-07-02", Approval_State: "APPROVED", Decision_Date: "2026-07-03",
    Decision_Evidence_Ref: "D1", Authorized_By: "", Work_Completed_Date: "", Completion_Evidence_Ref: "", Billing_Status: "READY",
    Invoice_Ref: "", Owner: "Owner"
  };
  assert.equal(scopeReference(scope).control, "REVIEW");
  assert.equal(scopeReference({ ...scope, Authorized_By: "Customer", Approval_State: "REQUESTED" }).control, "HOLD");

  const billing = {
    Invoice_ID: "I1", Project_ID: "P1", Customer_Record_Ref: "C1", Issue_Date: "2026-07-01", Due_Date: "2026-07-10",
    Control_Date: "2026-07-11", Original_Amount: "100", Credits_Applied: "100", Payments_Applied: "0", Calculated_Balance: "0",
    Ledger_Balance: "10", Invoice_Status: "CREDITED", Contact_Eligibility: "ELIGIBLE", Dispute_Status: "NONE", Promise_Amount: "",
    Promise_Date: "", Promise_Status: "NONE", Next_Action_Type: "NONE", Next_Action_Date: "", Owner: "Owner",
    Invoice_Evidence_Ref: "E1", Latest_Event_Evidence_Ref: "E2"
  };
  assert.equal(billingReference(billing).action, "HOLD");
  assert.equal(billingReference(billing).quality, "REVIEW");
  assert.equal(billingReference({ ...billing, Original_Amount: "100", Credits_Applied: "0", Ledger_Balance: "100", Invoice_Status: "PAID" }).action, "HOLD");

  const weekly = {
    Week_Start: "2026-07-01", Week_End: "2026-07-07", Data_As_Of: "2026-07-08T08:00:00-07:00", Business_Scope: "B1", Currency: "USD",
    Leads_Received: "1", Leads_With_First_Response: "1", Estimates_Issued: "1", Estimates_Decided: "1", Estimates_Accepted: "1",
    Estimate_Value_Issued: "100", Approved_Change_Value: "0", Completed_Unbilled_Change_Value: "0", Invoices_Issued_Value: "0",
    Cash_Received: "0", Open_AR: "0", AR_Past_Due: "0", Credits_And_Refunds: "0", Active_Projects: "1", Projects_At_Risk: "0",
    Available_Crew_Days_Next_Week: "1", Committed_Crew_Days_Next_Week: "1", Owner_Decisions_Open: "0", Safety_Holds: "1",
    Data_Unavailable_Count: "0", Overall_Status: "HEALTHY", Top_Exception: "NONE", Next_Owner_Action: "NONE", Evidence_Packet_Ref: "E1"
  };
  assert.equal(weeklyReference(weekly).quality, "REVIEW");
  assert.equal(weeklyReference({ ...weekly, Safety_Holds: "0", Leads_Received: "-1" }).quality, "REVIEW");
});

test("source claims are bounded, original, non-placeholder, and pre-publication fail closed", async () => {
  const files = await sourceFiles();
  const corpus = (await Promise.all(files.map((path) => readFile(path, "utf8")))).join("\n");
  assert.doesNotMatch(corpus, /ScopeLedger/iu);
  assert.doesNotMatch(corpus, /\b(?:TODO|TBD|lorem ipsum|insert (?:copy|text) here|coming soon)\b/iu);
  assert.match(corpus, /AI-assisted|generative-AI-assisted/iu);
  assert.match(corpus, /fictional/iu);
  assert.match(corpus, /does not guarantee/iu);
  assert.match(corpus, /publication.*owner.*approv/isu);
  for (const path of files) {
    const size = (await stat(path)).size;
    assert.ok(size > 250, `${relative(repositoryRoot, path)} is an empty shell`);
  }
});
