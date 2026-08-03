# Implementation guide

## System-of-record boundary

The purchaser's accounting system, bank, and payment providers remain authoritative for invoices, credits, payments, refunds, fees, and settlement. This tracker is an operating queue derived from those records. A calculated value must not post, reverse, or write off a financial transaction.

## Roles

| Role | Minimum responsibility |
| --- | --- |
| Billing owner | Confirms invoice readiness, issuance, amount, due date, and reference. |
| Collections owner | Reviews eligible open balances and documents actions. |
| Accounting reconciler | Confirms payments, credits, refunds, and ledger agreement. |
| Dispute owner | Investigates disputed scope, amount, quality, or payment allocation. |
| Business owner | Approves holds, settlement decisions, escalation, or write-off review. |

The person sending a message must have authority to do so. Access should be limited because invoice and customer records may be sensitive.

## Setup sequence

### 1. Define local policy

Document:

- when an invoice is ready to issue;
- accepted delivery channels and evidence;
- contractual payment terms;
- contact cadence and permitted contact hours;
- service-hold authority and restrictions;
- dispute escalation path;
- refund, credit, and write-off authority;
- retention and access requirements.

Obtain qualified guidance for consumer-debt, lien, notice, interest, fee, privacy, licensing, and jurisdiction-specific requirements. The product does not define them.

### 2. Configure controlled states

- `Invoice_Status`: ISSUED, PARTIALLY_PAID, PAID, DISPUTED, CREDITED, VOID, WRITE_OFF_REVIEW.
- `Dispute_Status`: NONE, CUSTOMER_QUESTION, INTERNAL_REVIEW, RESPONSE_DUE, RESOLVED, ESCALATED.
- `Contact_Eligibility`: ELIGIBLE, PREFERENCE_LIMITED, OPTED_OUT, WRONG_CONTACT, LEGAL_HOLD, UNKNOWN.
- `Promise_Status`: NONE, OPEN, KEPT, MISSED, REPLACED, WITHDRAWN.
- `Action_Type`: VERIFY_RECORD, SEND_INVOICE_COPY, COURTESY_REMINDER, PAST_DUE_FOLLOW_UP, PROMISE_CHECK, DISPUTE_RESPONSE, OWNER_REVIEW, NONE.

Unknown eligibility, legal hold, unresolved ledger variance, or unresolved dispute must suppress routine outreach.

### 3. Import the open-invoice population

Use one row per issued invoice. Use secure references instead of account numbers, bank data, or payment credentials. Record actual issue and due dates. Import credits and payments only when the authoritative record supports them.

### 4. Apply formulas

The delivered workbook contains a protected Excel table named `Receivables`, controlled-value validation, and explicit date and currency formats. Its calculations use the verified `Control_Date`. Test formula behavior for blank dates, future due dates, partial payments, credits, variances, and paid invoices before relying on queues.

### 5. Reconcile

For every open row:

`Original_Amount - Credits_Applied - Payments_Applied = Calculated_Balance`

Compare `Calculated_Balance` with `Ledger_Balance`. A nonzero `Balance_Variance` creates a hold. Resolve the authoritative records; never force the calculation to match by entering an unsupported adjustment.

## Invoice-ready test

Before issuing an invoice in the accounting system, confirm:

- bill-to party and recipient;
- contract/project reference;
- approved base scope and changes;
- performed-work or milestone evidence;
- price, tax, credits, deposit allocation, and payment terms;
- required supporting documents;
- internal authorization.

The tracker may record the resulting invoice only after actual issuance.

## Communication control

Before any message:

- verify the invoice is real and current;
- verify the recipient and eligible channel;
- read the latest dispute and customer preference;
- avoid unsupported fees, threats, deadlines, or legal claims;
- use only actual amount, due date, payment link, and contact route;
- record the material event once.

## Exception handling

| Exception | Safe response |
| --- | --- |
| Ledger variance | Set hold, compare invoice/payment/credit records, and resolve before outreach. |
| Customer disputes amount | Set dispute state, pause routine reminders, acknowledge, and route evidence review. |
| Payment promised | Record amount/date/source as a promise, not a payment. |
| Payment appears in bank but not ledger | Hold external action and reconcile through approved accounting process. |
| Customer opts out of a channel | Preserve the preference and use only a lawful approved alternative, if any. |
| Legal or insolvency notice | Set LEGAL_HOLD and escalate; do not use routine scripts. |
| Partial payment | Record verified payment, leave supported balance open, and recalculate. |
| Refund or chargeback | Preserve it as a separate authoritative event and reconcile the ledger. |

## Maintenance

Reconcile at a fixed frequency suitable for transaction volume. Lock prior-period exports. Test formulas after structural change. Audit user access. Remove personal data that is not needed. Retain contact and decision evidence according to approved policy.
