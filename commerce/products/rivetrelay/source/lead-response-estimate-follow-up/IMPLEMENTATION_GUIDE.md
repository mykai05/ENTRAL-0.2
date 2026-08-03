# Implementation guide

## Intended operating environment

Use this kit for a small specialty-contractor or field-service team that receives inquiries by phone, email, form, referral, or a provider marketplace. It can be maintained in a spreadsheet or mapped into an existing CRM. It does not send communications, verify consent, or synchronize with another system by itself.

## Roles

| Role | Minimum responsibility |
| --- | --- |
| Tracker owner | Maintains field definitions, resolves duplicates, and reviews exceptions. |
| Lead owner | Responds, documents the event, and sets the next action. |
| Estimator | Confirms estimate status, amount, delivery date, and material revision. |
| Business owner | Chooses service standards and reviews unresolved exceptions. |

One person may hold several roles, but each open record should have one named `Assigned_To` value.

## Setup sequence

### 1. Define local operating rules

Record these decisions before importing open work:

- Business hours and the response target used internally.
- Approved contact channels and how consent or preference is documented.
- Estimate stages used by the business.
- Follow-up intervals appropriate to the project type.
- Final outcomes and who may close a record.
- Where estimate files and communication evidence are stored.

The kit intentionally does not prescribe a legal contact cadence. The business must align use with its contracts, customer preferences, platform rules, and applicable law.

### 2. Create the working table

Use the delivered workbook for normal operation. It contains an Excel table, controlled-value validation, explicit date and currency formats, and protected formula columns. Keep the source column names stable so formulas and future imports remain traceable. The CSV template and `lead_tracker_fields_and_formulas.csv` remain the editable import and implementation specification.

Recommended controlled values:

- `Stage`: NEW, CONTACTED, QUALIFYING, SITE_VISIT, ESTIMATE_IN_PROGRESS, ESTIMATE_DELIVERED, DECISION_PENDING, CLOSED.
- `Response_Status`: NOT_STARTED, ATTEMPTED, CONNECTED, WAITING_CUSTOMER, WAITING_INTERNAL, COMPLETE.
- `Outcome`: blank while open; WON, LOST, DECLINED, DUPLICATE, INVALID when closed.
- `Contact_Eligibility`: ELIGIBLE, PREFERENCE_LIMITED, OPTED_OUT, WRONG_CONTACT, UNKNOWN.

Treat `UNKNOWN` as a hold for outbound communication until the business can verify eligibility.

### 3. Import existing work

For each live inquiry, create one record using a business-generated `Lead_ID`. Do not use the customer's phone number or email address as the primary key. If customer contact details are needed, keep them in the business's approved system and place only the secure record reference in `Customer_Record_Ref`.

For historical items, import only facts needed for current operation. Do not infer contact attempts or delivery dates.

### 4. Configure formulas

The delivered workbook uses an Excel table named `Leads`. Equivalent formulas may be used in another spreadsheet tool. Confirm locale-specific separators and date behavior before use. Every age and due calculation uses the explicit verified `Control_Date`; never replace an unknown date with the device date merely to clear an exception.

### 5. Run a controlled first week

- Day 1: enter open leads and check required fields.
- Days 2-3: compare tracker events with the underlying communication and estimate records.
- Day 4: resolve duplicates and adjust local controlled values only if the distinction changes an action.
- Day 5: perform the weekly review using actual records.

## Record-quality checks

A record is operationally complete when:

- its ID is unique;
- received date and source are known or explicitly marked unavailable;
- stage and assigned owner are present;
- open work has a next action and date;
- delivered estimates have a delivery date and secure estimate reference;
- every contact attempt remains in the authoritative communication log, while the tracker retains the latest evidenced channel and date;
- closed work has a final outcome and outcome date;
- opt-outs are preserved.

## Exception handling

| Exception | Safe response |
| --- | --- |
| Duplicate inquiry | Link the duplicate to the retained record and close it as DUPLICATE. |
| Customer disputes contact | Stop outbound contact, preserve the request, and escalate to the business owner. |
| Estimate amount changed | Update the amount only from the approved estimate record; note the revision reference. |
| Owner unavailable | Reassign explicitly; do not leave the old name while another person acts. |
| Contact eligibility unknown | Hold outbound action until verified. |
| Formula error | Treat the derived field as unavailable and repair the formula before relying on the queue. |

## Maintenance

Review controlled values monthly. Archive closed records according to the business's retention policy. Test formulas after any column change. Keep a versioned backup before bulk imports. When mapping into a CRM, reconcile sample records in both directions before retiring the spreadsheet.

## Privacy boundary

Use stable references instead of unnecessary personal details. Limit access to personnel who need the records. Do not paste payment data, government identifiers, private job-site access codes, or sensitive customer communications into the tracker.
