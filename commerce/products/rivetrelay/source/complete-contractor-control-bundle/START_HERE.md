# Complete Contractor Control Bundle

- Product ID: RR-BU-001
- Version: 1.0.0
- Initial test price: $119
- Working brand: RivetRelay (provisional; not cleared for publication)

## What the bundle includes

The bundle combines the exact versioned contents of:

1. Lead Response and Estimate Follow-Up Kit — RR-LR-001 v1.0.0.
2. Scope and Change-Order Control Pack — RR-CO-001 v1.0.0.
3. Billing and Collections Accelerator — RR-BC-001 v1.0.0.
4. Weekly Owner Command Dashboard — RR-WD-001 v1.0.0.

`BUNDLE_MANIFEST.csv` binds every included component source file to its SHA-256 digest. The bundle does not duplicate or silently alter the four products.

## Recommended implementation order

### Step 1 — assign operating ownership

Name owners for lead intake, estimating, scope/change control, billing, reconciliation, disputes, weekly data close, and owner decisions. One person may hold several roles; each live record must still have one accountable owner.

### Step 2 — establish source authority

Identify the approved system or evidence for customer records, estimates, agreements, change decisions, project completion, invoices, payments, credits, schedules, and decisions. Keep those systems authoritative. The bundle provides working views and procedures, not a replacement database.

### Step 3 — implement one product at a time

1. Start the lead tracker and close ownerless/open-next-action gaps.
2. Start change control on one active project and verify approval evidence before broader use.
3. Build the receivables queue from actually issued, reconciled invoices.
4. Start the weekly dashboard only after its inputs have named sources and owners.

### Step 4 — connect stable references

Use internal IDs to connect the lifecycle:

`Lead_ID` → `Project_ID` → `Change_Order_ID` → `Invoice_ID` → weekly evidence packet

Do not place unnecessary personal data in those identifiers. Do not manufacture a link when the source systems do not support one.

### Step 5 — run the weekly command review

Use reconciled aggregates and secure evidence references. Keep estimates, approved change value, invoices, cash received, open receivables, and outcomes distinct.

## First-week completion test

- Every open lead has an owner, eligibility state, and next action.
- Every proposed scope deviation has a stable record and original-scope reference.
- No changed work is marked approved without decision evidence.
- Every open invoice reconciles to the accounting ledger or is held.
- Every dispute and opt-out uses the appropriate hold path.
- Weekly inputs use the same cutoff and named sources.
- Owner decisions have one owner, due date, and evidence reference.
- Calculated values were independently checked after import.

## Important boundary

This bundle organizes business operations. It does not send messages, create legally binding changes, issue invoices, process payments, connect to provider accounts, replace source systems, or guarantee sales, collection, compliance, margin, or any other outcome.

All example data is fictional. `RivetRelay` remains a provisional working brand until the owner approves publication and brand/legal/marketplace clearance is complete.
