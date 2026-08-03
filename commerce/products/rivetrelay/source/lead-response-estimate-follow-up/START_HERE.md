# Lead Response and Estimate Follow-Up Kit

- Product ID: RR-LR-001
- Version: 1.0.0
- Initial test price: $29
- Working brand: RivetRelay (provisional; not cleared for publication)

## What this kit does

This kit gives a specialty contractor one place to record a new inquiry, set the next action, document estimate delivery, and close the loop. It is an operating aid, not a CRM replacement or a promise that a lead will convert.

## Included source files

- `START_HERE.md`: quick start and operating rhythm.
- `IMPLEMENTATION_GUIDE.md`: setup, ownership, field mapping, quality controls, and maintenance.
- `RESPONSE_AND_FOLLOW_UP_PLAYBOOK.md`: channel-aware scripts, call notes, and stage checklists.
- `lead_tracker_template.csv`: clean import/source table.
- `lead_tracker_fictional_example.csv`: six fully populated fictional records.
- `lead_tracker_fields_and_formulas.csv`: field definitions, validation rules, and spreadsheet formulas.
- `VERSION_LICENSE_SUPPORT.md`: version, permitted use, support, limitations, and AI disclosure.
- `CLAIMS_INVENTORY.csv`: bounded claims and their source evidence.

The populated fictional tracker is a static example snapshot with `Control_Date` set to 2026-07-13. The packaged workbook recalculates date-derived values only from the explicit control date; it never substitutes the device's current date.

## Twenty-minute start

1. Assign one person as the tracker owner and one backup.
2. Open the delivered tracker workbook, retain its protected formula columns, and set the verified `Control_Date` for each operating row.
3. Use the CSV template and field dictionary from the editable-source archive only for a controlled import or system mapping.
4. Enter every open inquiry and estimate. Use a stable internal lead ID rather than a phone number or email address.
5. Assign a stage, owner, and next action date to every open record.
6. Select only scripts that match the actual event and the customer's permitted contact channel.
7. Review the overdue and unassigned queues at the start and end of each workday.

## Daily operating loop

### Start of day

- Filter `Follow_Up_Flag` to `DUE` or `OVERDUE`.
- Assign records where `Assigned_To` is blank.
- Confirm the customer has not opted out before sending a follow-up.
- Prioritize promised callbacks and estimates already delivered.

### During the day

- Record each material contact attempt once.
- Set the next action while the context is fresh.
- Do not mark an estimate delivered until the delivery channel and date are known.
- Record objections as facts, not guesses about the customer's intent.

### End of day

- Resolve missing next-action dates.
- Close records that were won, lost, declined, duplicate, or invalid.
- Escalate estimates older than the business's chosen review window.
- Keep opt-outs and wrong-contact records suppressed.

## Weekly review questions

- Which open leads have no assigned owner?
- Which delivered estimates have no documented next action?
- Which follow-ups are overdue?
- Which lead sources produced actual booked work in this period?
- Which objections repeat often enough to require an operational response?

The tracker supports these questions only when records are complete. Blank or stale data must be treated as unavailable, not as a positive result.
