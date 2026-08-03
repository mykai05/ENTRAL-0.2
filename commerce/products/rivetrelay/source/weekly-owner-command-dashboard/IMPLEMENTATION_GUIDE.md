# Implementation guide

## Metric-source map

Complete this map before first use. Each field must have a source, owner, cutoff, and reconciliation rule.

| Input family | Preferred source evidence | Owner question |
| --- | --- | --- |
| Leads and estimates | Verified lead/CRM export and approved estimate register | Are all open inquiries and issued estimates included once? |
| Change orders | Current approved change register | Are approved, completed, and billed states distinguished? |
| Invoices and cash | Accounting ledger and verified settlement report | Are invoices issued and cash received kept separate? |
| Receivables | Accounting open-invoice report | Does the total reconcile as of the cutoff? |
| Projects | Current project/field status records | Is at-risk status supported by a specific condition? |
| Capacity | Approved crew/resource schedule | Are available and committed days measured consistently? |
| Safety holds | Approved safety/operations record | Are open holds visible without exposing sensitive details? |
| Owner decisions | Decision queue or task record | Does each item have an owner, evidence, and due date? |

## Definitions

- `Lead_Response_Coverage`: leads with a documented first response divided by leads received in the same bounded cohort. It is not response-time performance.
- `Estimate_Acceptance_Rate`: accepted estimates divided by estimates with a recorded accept/decline decision. It excludes undecided estimates.
- `Capacity_Load`: committed crew-days divided by available crew-days for the same next-week scope. It is not labor productivity.
- `AR_Past_Due`: open accounts receivable past the authoritative due date at cutoff. It is not predicted loss.
- `Completed_Unbilled_Change_Value`: supported approved change value recorded complete but not actually invoiced. It is not revenue or cash.
- `Owner_Decisions_Open`: decisions explicitly requiring owner authority at cutoff. Routine tasks do not belong here.
- `Data_Unavailable_Count`: required fields unavailable or unreconciled. Zero means each required input was validated, not that every business value was zero.

## Status rules

Customize thresholds to the business and preserve the approved rule version.

### BLOCKED

Use when a verified condition prevents authorized work, safe operation, required payment action, customer commitment, or an owner decision from proceeding. Examples may include an unresolved safety hold, missing authority for a critical action, an unavailable required crew/resource, or an accounting variance that blocks an external statement.

### DEGRADED

Use when work can proceed but a verified exception threatens the weekly plan, such as overdue owner decisions, capacity overcommitment, materially aged receivables under active review, or incomplete source data.

### HEALTHY

Use only when no blocking condition is open, material exceptions are assigned within tolerance, and required data is reconciled. Healthy does not mean perfect or guarantee a result.

The final `Overall_Status` is a supported owner/operations classification. Do not calculate it solely from color or a single metric.

## Setup sequence

### 1. Establish the reporting boundary

- Local week start/end.
- Data cutoff and timezone.
- Included legal business or operating unit.
- Currency.
- Source systems and versions.
- Person authorized to close the weekly packet.

### 2. Import the table

Use the delivered workbook for normal operation. It contains the `WeeklyCommand` Excel table, controlled-value validation, explicit date, currency, and percentage formats, and protected calculated columns. The CSV template and field dictionary remain the editable import and implementation specification.

### 3. Test with one historical week

Recreate one week from closed source records. Trace every input back to evidence. Compare formula results by hand. If a source value cannot be confirmed, leave it unavailable and record the reason.

### 4. Start the live cadence

Create one row per week and never overwrite a closed prior week. Corrections should create a versioned evidence note and update the affected value with a clear reconciliation record.

## Data quality control

`Data_Quality_Flag` must be `REVIEW` when:

- a required input is blank;
- `Data_Unavailable_Count` is greater than zero;
- responded leads exceed received leads for the bounded cohort;
- accepted estimates exceed decided estimates;
- past-due AR exceeds total open AR;
- committed capacity is reported but available capacity is blank or zero;
- projects at risk exceed active projects;
- evidence packet or as-of time is missing.

Do not hide exceptions by changing the cohort after seeing the result.

## Privacy and access

The weekly row should use aggregate values and secure evidence references. Do not include customer names, employee medical data, bank details, card data, credentials, private project disputes, or sensitive safety narratives in the dashboard.

## Maintenance

Review metric definitions quarterly and after a source-system change. Version threshold rules. Retest formulas after column changes. Preserve evidence packets and decision logs according to policy. Retire a metric if it no longer informs a decision rather than keeping decorative activity counts.
