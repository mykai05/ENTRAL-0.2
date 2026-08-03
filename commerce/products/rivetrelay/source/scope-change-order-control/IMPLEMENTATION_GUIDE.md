# Implementation guide

## Before operational use

Have the business's qualified contract or legal reviewer decide what constitutes authorization, who may approve, whether electronic acceptance is permitted, what notices are required, how taxes are handled, and which emergency-work rules apply. Configure this pack to those decisions; do not treat the included language as jurisdiction-specific legal terms.

## Roles

| Role | Minimum responsibility |
| --- | --- |
| Field lead | Stops scope drift, records observed conditions, and escalates. |
| Change-control owner | Determines status, maintains records, and routes decisions. |
| Estimator | Produces supported cost and schedule impact. |
| Authorized issuer | Sends the approved proposal or contract-required form. |
| Billing owner | Reconciles approved and completed changes to invoices. |
| Business owner | Resolves authority, safety, contract, and customer disputes. |

## Setup sequence

### 1. Define the scope baseline

For each active project, assign one `Original_Scope_Ref` that points to the current approved agreement and scope. Record later approved revisions separately. Do not copy confidential agreements into the tracker; use the approved document-system reference.

### 2. Choose controlled values

- `Change_Status`: IDENTIFIED, PRICING, PENDING_CUSTOMER, APPROVED, DECLINED, ON_HOLD, SCHEDULED, COMPLETED, BILLED, VOID.
- `Requested_By`: CUSTOMER, CONTRACTOR, DESIGNER, AUTHORITY, SITE_CONDITION, OTHER.
- `Approval_State`: NOT_REQUESTED, REQUESTED, APPROVED, DECLINED, EXPIRED, DISPUTED, NOT_APPLICABLE.
- `Billing_Status`: NOT_READY, READY, INVOICED, PARTIALLY_PAID, PAID, DISPUTED, CREDITED.
- `Safety_Class`: ROUTINE, SAFETY_HOLD, EMERGENCY_MAKE_SAFE.

Only the business's approved policy may define when `EMERGENCY_MAKE_SAFE` work may proceed. Record the safety action separately from authorization for permanent changed work.

### 3. Build the tracker

Use the delivered workbook for normal operation. It contains the `ChangeOrders` Excel table, controlled-value validation, explicit date and currency formats, and protected calculated columns. The CSV template and `change_order_fields_and_formulas.csv` remain the editable import and implementation specification.

### 4. Connect supporting records

Every change should point to:

- project record;
- current original-scope reference;
- observed-condition evidence;
- estimate or pricing workpaper;
- issued change proposal;
- approval/decline evidence;
- completion evidence when performed;
- invoice reference when billed.

A filename by itself may be ambiguous. Use a stable reference that the team can resolve in its approved system.

### 5. Pilot on one active project

Reconcile all open field questions on one project. Compare each tracker status to the underlying evidence. Correct the process before expanding to the rest of the portfolio.

## Decision rules

### Is it a change?

1. State the observed condition without blame or inference.
2. Compare it with the current approved scope.
3. If the work is already included, route it as base-scope work, not a change.
4. If uncertain, set `ON_HOLD` and obtain an authorized interpretation.
5. If it is different, create the change record before work proceeds, except for documented make-safe action.

### Is it approved?

`Approval_State=APPROVED` requires:

- the decision maker's authority is acceptable under the business's rules;
- scope, value, schedule impact, and relevant terms match the issued proposal;
- evidence of the decision is stored and referenced;
- the record is not expired, superseded, or disputed.

A verbal conversation may be useful context, but the pack does not define it as binding approval.

## Quality checks

- Unique change-order ID per project.
- Original-scope reference present.
- Observed condition and proposed change are distinct.
- Cost inputs trace to an approved workpaper.
- Schedule impact is stated as days or explicitly unknown.
- Tax treatment is reviewed, not guessed.
- Approval evidence matches the version being scheduled.
- Completion does not automatically imply approval.
- Billing references only approved, performed work under the local process.

## Exception handling

| Exception | Response |
| --- | --- |
| Field work started without record | Stop non-safety work where appropriate, document actual status, and escalate. Do not backdate approval. |
| Customer asks for an immediate change | Document the request and use the approved expedited process. |
| Amount changes after proposal | Issue a new revision; preserve the superseded record. |
| Schedule impact unknown | State `UNKNOWN` and hold unsupported schedule claims. |
| Approval disputed | Set `DISPUTED` or `ON_HOLD`, preserve evidence, and escalate. |
| Emergency condition | Make safe under approved policy, record the action, and separate it from permanent repair authorization. |
| Completed but not billed | Reconcile completion and billing evidence; do not manufacture an invoice date. |

## Maintenance

Review open changes at the same time each week. Reconcile tracker totals to project and billing systems without treating the tracker as the accounting ledger. Version controlled values and formulas. Retain superseded proposals according to the business's document policy.
