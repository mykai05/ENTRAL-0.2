# Scope and Change-Order Control Pack

- Product ID: RR-CO-001
- Version: 1.0.0
- Initial test price: $49
- Working brand: RivetRelay (provisional; not cleared for publication)

## What this pack does

This pack helps a contractor distinguish original scope from a proposed change, document cost and schedule impact, capture a decision reference, and hand an approved change to billing. It is an operational record system, not a substitute for a contract, legal review, or locally required change-order form.

## Included source files

- `START_HERE.md`: quick start and operating rhythm.
- `IMPLEMENTATION_GUIDE.md`: setup, responsibilities, controls, and exception handling.
- `SCOPE_AND_CHANGE_ORDER_PLAYBOOK.md`: baseline worksheet, field notice, decision record, scripts, and checklists.
- `change_order_tracker_template.csv`: clean import/source table.
- `change_order_tracker_fictional_example.csv`: six fully populated fictional records.
- `change_order_fields_and_formulas.csv`: field rules, validation, and formulas.
- `VERSION_LICENSE_SUPPORT.md`: version, use terms, limitations, support, and AI disclosure.
- `CLAIMS_INVENTORY.csv`: bounded claims linked to artifacts.

The populated fictional tracker is a static example snapshot with `Control_Date` set to 2026-07-11. The packaged workbook recalculates pending-day and control values only from the explicit control date and current verified row values.

## Thirty-minute start

1. Identify the approved agreement, scope, drawings, selections, and allowances for each active project.
2. Assign one change-control owner and one field escalation route.
3. Open the delivered tracker workbook, retain its protected formula columns, and set the verified `Control_Date`; use the CSV template only for a controlled import.
4. Give field personnel the four-step rule: observe, make safe if necessary, document, and escalate.
5. Create a record for every proposed deviation from the current approved scope.
6. Do not mark a change `APPROVED` without an acceptable decision reference under the business's contract and local requirements.
7. Reconcile approved changes with billing at least weekly.

## Core status flow

`IDENTIFIED` → `PRICING` → `PENDING_CUSTOMER` → `APPROVED` or `DECLINED` → `SCHEDULED` → `COMPLETED` → `BILLED`

Use `ON_HOLD` when a required fact, decision, authority, or safety resolution is missing. Never move a record forward merely to make the queue look current.

## Daily field-to-office handoff

- Field identifies the condition and preserves a factual photo or note reference.
- Office links the original-scope reference and confirms whether the condition is actually a change.
- Estimator records cost and schedule impact from an approved calculation.
- Authorized person issues the proposal or required form.
- Customer decision is recorded with its evidence reference.
- Operations schedules only authorized work, subject to documented safety/emergency rules.
- Billing reconciles approved value to an invoice reference.

## Weekly owner review

- Unpriced identified changes.
- Proposed work being performed without an approval reference.
- Approved changes not yet scheduled.
- Completed changes not yet billed.
- Declined changes that still appear in field scope.
- Records with uncertain contract or decision authority.

The pack reports only what users record. Missing approvals, values, dates, or evidence must remain visible as exceptions.
