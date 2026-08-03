# Billing and Collections Accelerator

- Product ID: RR-BC-001
- Version: 1.0.0
- Initial test price: $49
- Working brand: RivetRelay (provisional; not cleared for publication)

## What this product does

This product helps a contractor reconcile issued invoices, payments, credits, disputes, promises, and next actions in one operating view. It does not issue invoices, process payments, determine enforceability, or guarantee collection.

## Included source files

- `START_HERE.md`: controlled setup and daily/weekly operation.
- `IMPLEMENTATION_GUIDE.md`: accounting boundary, ownership, reconciliation, and exception handling.
- `BILLING_AND_COLLECTIONS_PLAYBOOK.md`: invoice readiness, communication scripts, dispute route, and checklists.
- `receivables_tracker_template.csv`: clean import/source table.
- `receivables_tracker_fictional_example.csv`: seven fully populated fictional records.
- `receivables_fields_and_formulas.csv`: field definitions, validations, aging, and control formulas.
- `VERSION_LICENSE_SUPPORT.md`: version, permitted use, limitations, support, and AI disclosure.
- `CLAIMS_INVENTORY.csv`: bounded public-claim evidence.

The populated fictional tracker is a static example snapshot with `Control_Date` set to 2026-07-13. The packaged workbook recalculates aging and action values only from the explicit control date; it never substitutes the device's current date.

## Safe first setup

1. Confirm the accounting system remains the financial system of record.
2. Assign a billing owner, a collections owner, and a dispute escalation owner.
3. Open the delivered tracker workbook and import only actually issued invoices using stable accounting references.
4. Reconcile original amount, credits, payments, and balance to the accounting system.
5. Retain the protected formula columns and set the verified `Control_Date`; use the CSV source only for a controlled import or system mapping.
6. Record the next action for each open balance.
7. Verify the contract, recipient, channel eligibility, and local collection rules before any external message.

Never record a draft invoice as issued, an open invoice as revenue collected, a promise as payment, or an unresolved difference as zero.

## Daily operating loop

### Reconcile

- Import or record actual invoices issued since the last review.
- Record payments and credits from the accounting system or verified provider event.
- Resolve any computed balance that differs from the system of record.
- Preserve refund, chargeback, and dispute states separately.

### Act

- Filter `Action_Flag` to `HOLD`, `OVERDUE`, or `DUE`.
- Resolve holds before contact.
- Confirm the latest customer preference and communication history.
- Use the message matching the actual lifecycle event.
- Set the next action and date from a supported commitment or internal policy.

### Close

- Mark `PAID` only after verified settlement.
- Mark `CREDITED` only from an issued credit reference.
- Mark `WRITE_OFF_REVIEW` as a review state; do not alter the accounting ledger from this tracker.

## Weekly owner review

- Total open balance reconciled to the ledger.
- Past-due balances by aging bucket.
- Broken or due promises.
- Unresolved disputes and required owner decisions.
- Completed work awaiting invoice issuance in the upstream process.
- Credits, refunds, or chargebacks requiring reconciliation.
- Accounts on service hold under approved contract and policy.

If data is not reconciled, report it as unavailable or under review. Do not fill gaps with estimates.
