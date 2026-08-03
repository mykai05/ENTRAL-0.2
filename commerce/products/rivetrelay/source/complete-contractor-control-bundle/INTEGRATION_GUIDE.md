# Bundle integration guide

## 1. Lifecycle map

The four products cover related but distinct records:

| Stage | Authoritative event | Bundle working record | Must not be confused with |
| --- | --- | --- | --- |
| Inquiry | Verified customer inquiry | Lead row | Qualified opportunity or sale |
| Estimate | Approved estimate actually issued | Lead row with estimate reference | Customer acceptance or revenue |
| Scope change | Condition/request compared with approved scope | Change-order row | Authorized changed work |
| Approval | Acceptable decision evidence for exact revision | Approval fields | Silence, draft, or verbal assumption |
| Completion | Verified performed work | Completion evidence | Invoice or payment |
| Billing | Invoice actually issued in accounting system | Receivable row | Cash received |
| Settlement | Verified payment/credit/refund event | Reconciled receivable fields | Promise or forecast |
| Owner review | Closed bounded source packet | Weekly dashboard row | Real-time monitoring or prediction |

## 2. Stable-reference design

Keep identifiers stable and non-sensitive.

- `Customer_Record_Ref`: approved customer-system reference, not an email, phone number, or account credential.
- `Lead_ID`: one inquiry/opportunity record.
- `Project_ID`: one approved internal project record.
- `Original_Scope_Ref`: current approved agreement/scope revision.
- `Change_Order_ID`: one proposed deviation with a preserved revision history.
- `Invoice_ID`: actual accounting invoice reference.
- `Evidence_Packet_Ref`: secure weekly index of source readbacks.

Maintain a mapping in an approved system when IDs differ across tools. Do not insert secret URLs, tokens, access codes, banking details, or full personal records into CSV files.

## 3. Handoff rules

### Lead to project

Create or link a `Project_ID` only after the business's accepted-work process succeeds. Preserve the lead outcome and evidence. A won lead does not by itself prove a signed agreement, deposit, scheduling authority, or earned revenue.

### Project to change control

Every proposed scope deviation must link to the current approved `Original_Scope_Ref`. The field observation and approval decision are separate records. Preserve superseded revisions.

### Change control to billing

Route a change to billing only when the business's approval and completion criteria are supported. Create an `Invoice_ID` only after actual issuance in the accounting system. `Unbilled_Approved_Value` and `Completed_Unbilled_Change_Value` are operating exceptions, not revenue.

### Billing to weekly command

Aggregate actually issued invoices, verified cash receipts, authoritative open receivables, and settled credits/refunds separately. Reconcile the cutoff. The dashboard should contain totals and secure references rather than customer-level details.

## 4. A fictional threaded example

The following is fictional and illustrates identifiers, not a promised result:

1. `FICTIONAL-L-2001` records a permitted referral inquiry for a shop-lighting upgrade.
2. The approved estimate `FICTIONAL-EST-2001` is delivered and later accepted through the business's actual process.
3. The resulting internal project is `FICTIONAL-P-2001`.
4. A site condition creates proposed change `FICTIONAL-CO-2001-R1`.
5. The exact revision is approved with evidence `FICTIONAL-DEC-2001` and completed with `FICTIONAL-COMP-2001`.
6. Accounting actually issues `FICTIONAL-INV-2001`; the receivables row reconciles to the ledger.
7. The weekly evidence packet `FICTIONAL-WEEK-2001` includes the verified aggregate inputs without copying the customer record.

At every stage, an unsupported event remains absent or held. The lifecycle does not advance merely because the prior template was completed.

## 5. Ninety-minute controlled deployment

### Minutes 0-15 — ownership and sources

- Confirm roles and source authority.
- Choose the reporting cutoff/timezone.
- Define contact, approval, dispute, and escalation policies.

### Minutes 15-35 — lead control

- Import open leads.
- Resolve duplicates.
- Set eligibility, owner, and next action.
- Verify formulas on the fictional example and two actual internal test records before broad use.

### Minutes 35-55 — change control

- Create scope baselines for one project.
- Reconcile open field questions.
- Confirm the local approval and emergency routes.
- Verify approval and unbilled-value controls.

### Minutes 55-75 — receivables

- Import actually issued open invoices.
- Reconcile balances.
- Hold variances, disputes, opt-outs, and unknown eligibility.
- Verify aging and queue formulas.

### Minutes 75-90 — weekly command

- Close one evidence packet.
- Enter verified aggregate inputs.
- Resolve data-quality exceptions.
- Run the owner review and assign no more than three material next actions.

Ninety minutes is a suggested controlled setup agenda, not a guarantee. Larger or unreconciled record sets require more time.

## 6. Cross-product quality gates

### Identity gate

- Stable IDs are unique in their record type.
- References resolve in approved systems.
- No identifier embeds unnecessary personal or secret information.

### Authority gate

- Contact eligibility is known before outreach.
- Change approval matches exact revision and acceptable authority.
- Financial events come from accounting/provider evidence.
- Owner decisions stay within recorded authority.

### Evidence gate

- Material events have secure evidence references.
- Unknown inputs stay unknown.
- Fictional examples never enter live operating totals.

### Calculation gate

- Formula columns are protected.
- Sample results match manual calculations.
- Spreadsheet locale and date behavior are verified.
- Errors or variances create review/hold states.

### Lifecycle gate

- Estimate is not sale.
- Approval is not completion.
- Completion is not invoice.
- Invoice is not cash.
- Promise is not payment.
- Activity is not outcome.

## 7. Weekly integrated review

1. Lead owner reads due/held inquiries.
2. Change-control owner reads pending, held, and approved-unbilled changes.
3. Accounting reconciler reads balance variances, disputes, and due actions.
4. Data owner closes aggregate inputs.
5. Business owner resolves authority decisions and confirms three next actions.

## 8. Pause and recovery

Pause use of an affected output when a formula is broken, source access is uncertain, identifiers collide, approval evidence is disputed, ledger balance does not reconcile, external contact eligibility is unknown, or a file digest does not match `BUNDLE_MANIFEST.csv`.

Recover by restoring the last verified source file, reconciling the authoritative record, retesting formulas, documenting the correction, and resuming only the affected workflow. Do not rewrite underlying business history to make the working view pass.
