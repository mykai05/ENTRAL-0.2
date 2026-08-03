# Weekly Owner Command Dashboard

- Product ID: RR-WD-001
- Version: 1.0.0
- Initial test price: $39
- Working brand: RivetRelay (provisional; not cleared for publication)

## What this dashboard does

This dashboard converts a bounded weekly set of verified operating inputs into an owner review: what changed, what is constrained, what requires a decision, and what happens next. It does not connect to source systems, predict results, or replace accounting, project, safety, or customer records.

## Included source files

- `START_HERE.md`: first-use path and weekly cadence.
- `IMPLEMENTATION_GUIDE.md`: metric dictionary, source mapping, ownership, thresholds, and controls.
- `WEEKLY_COMMAND_PLAYBOOK.md`: data-close checklist, review agenda, decision log, and next-action protocol.
- `weekly_dashboard_template.csv`: clean weekly source table.
- `weekly_dashboard_fictional_example.csv`: four fully populated fictional weeks.
- `weekly_dashboard_fields_and_formulas.csv`: field definitions, validation, and formulas.
- `VERSION_LICENSE_SUPPORT.md`: version, permitted use, limitations, support, and AI disclosure.
- `CLAIMS_INVENTORY.csv`: bounded claims linked to evidence.

## First setup

1. Choose one fixed weekly cutoff and one owner review time.
2. Assign a named source owner for leads, estimates, changes, invoices, cash, projects, capacity, safety holds, and decisions.
3. Map every field to an authoritative source before entering a value.
4. Mark unavailable data as unavailable; never enter zero unless the verified value is zero.
5. Define local `HEALTHY`, `DEGRADED`, and `BLOCKED` rules in writing.
6. Open the delivered dashboard workbook and retain its protected formulas and validation rules; use the CSV source only for a controlled import.
7. Run the first review from a closed evidence packet, not from memory.

## Weekly cadence

### Data close

- Freeze the as-of time.
- Reconcile each input to its source.
- Preserve the evidence packet reference.
- Record unavailable inputs and unresolved variances.
- Calculate rates only when their denominators and source values are valid.

### Owner command review

Answer in order:

1. Is any safety, customer, cash, capacity, or authority condition blocking work?
2. Which exceptions materially changed this week?
3. Which owner decisions are open and by when?
4. Which committed actions were completed, missed, or superseded?
5. What are the three bounded next actions for the coming week?

### Close the review

- Assign each action to one owner and date.
- Link the supporting mission/task or business record where available.
- Record why a decision was made.
- Carry forward only unresolved items; do not duplicate them as new work.

## Interpretation boundary

The dashboard describes recorded operations through its as-of time. It does not establish profitability, tax position, earned revenue, customer satisfaction, safety compliance, or future performance. A green status is not valid when required data is unavailable or contradictory.
