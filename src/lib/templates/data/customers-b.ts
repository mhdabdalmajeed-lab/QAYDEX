import type { AuditTemplateSeed } from "@/lib/templates/types";

export const customerTemplatesB: AuditTemplateSeed[] = [
  {
    slug: "customer-profitability-audit",
    name: "Customer profitability audit",
    category: "customers",
    subcategory: "Profitability",
    description:
      "Rebuilds profitability customer by customer — from gross revenue down through discounts, credits, cost of delivery and the cost of financing the receivable — and tests whether the allocations underpinning those numbers are defensible.",
    defaultTitle: "Customer profitability audit",
    auditDescription:
      "A review of which customers actually make money once discounts, rebates, returns, service cost and slow payment are charged back to them, and whether the organisation's own profitability reporting can be trusted.",
    instructions: `You are auditing profitability at the individual customer level. The organisation almost certainly has a view on which customers are its best; your job is to test that view against the evidence rather than to reproduce it.

Start with the bridge, not the ranking. For each significant customer, rebuild the path from gross invoiced value down to a contribution figure: gross revenue, less discounts and rebates, less credit notes and returns, less directly attributable cost of delivery (product cost, freight, installation, support hours, third-party pass-through), less any customer-specific cost the organisation carries but does not bill. Reconcile the sum of those customer-level bridges back to the ledger revenue and cost lines for the period. If the bridge does not reconcile, that gap is your first finding — a profitability report that does not tie to the ledger is an opinion, not a measurement.

The allocation layer is where this audit earns its keep. Identify every cost reaching a customer through an allocation rather than a direct charge, and interrogate the driver behind it. Does the driver actually track the cost's behaviour — support cost allocated on revenue rather than ticket volume systematically flatters the noisy small customer and punishes the quiet large one. Was it set once and never revisited? Test what happens to the ranking if a challenged driver is replaced with a more faithful one, and report that sensitivity rather than a single point estimate.

Look for the leaks direct margin hides: off-invoice rebates settled by credit note, freight absorbed rather than recharged, out-of-contract service delivered as goodwill, pricing below the approved list without recorded approval, and the financing cost of a customer paying far outside terms while showing healthy gross margin. Payment behaviour is a profitability fact, not just a collections fact.

Weigh innocent explanations before concluding a customer is unprofitable: a deliberate loss-leader with strategic rationale, a launch-phase account still absorbing onboarding cost, a one-off, a mix shift, or an allocation artefact of the kind you just tested. Say what settled the point.

Do not apply any numeric threshold as a decision rule. Ask the user what materiality basis and contribution expectation apply; absent that, state the basis you adopted and what would change under a different one.

Cite every material finding to file, sheet, row, invoice or customer ID, and label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Where a cost driver cannot be verified, name the record you need and leave the point open. Write for a commercial finance lead who must defend a repricing conversation internally. This is analysis, not an audit opinion, and no conclusion is a regulatory or legal determination — sign-off rests with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Revenue by customer for the period",
        description: "Invoiced revenue by customer and product or service line, gross of discounts where available.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Cost of sales and direct cost detail",
        description: "Product, delivery, freight and service cost attributable to customers or to lines that can be traced to them.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Discount, rebate and credit note listing",
        description: "All off-invoice value given back to customers in the period, with reason codes and approvers where recorded.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Cost allocation methodology",
        description: "The workings and drivers used to push indirect or shared cost onto customers.",
        formats: ["xlsx", "docx", "pdf"],
        required: false,
      },
      {
        name: "Service or support activity data",
        description: "Ticket volumes, support hours or delivery events by customer, used to test allocation drivers.",
        formats: ["xlsx", "csv", "integration"],
        required: false,
      },
      {
        name: "Aged receivables and payment history",
        description: "Used to charge the cost of slow payment back to the customers who cause it.",
        formats: ["xlsx", "csv", "integration"],
        required: false,
      },
      {
        name: "Management's customer profitability report",
        description: "The organisation's existing view, so it can be challenged rather than assumed.",
        formats: ["xlsx", "pdf", "pptx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Revenue by customer for the period, reconcilable to ledger revenue",
      "Direct cost detail attributable to customers or to traceable delivery lines",
      "Discount, rebate, return and credit note activity by customer",
      "The allocation drivers used for any indirect cost charged to customers",
      "Payment history or aged receivables supporting any financing-cost adjustment",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "audit_methodology",
      "waterfall_chart",
      "table",
      "comparison_card",
      "financial_ratio_card",
      "finding_card",
      "assumption_box",
      "evidence_list",
      "recommendation_card",
      "limitation_box",
    ],
    suggestedFollowups: [
      "Which allocation drivers were last reviewed, by whom, and what changed when they were?",
      "Which customers are loss-making on contribution but retained for a stated strategic reason, and who owns that decision?",
      "Are off-invoice rebates accrued as they are earned, or only recognised when the credit note is raised?",
      "What approval was obtained for pricing granted below the approved list to the accounts identified?",
      "What would the customer ranking look like if support cost were allocated on activity rather than on revenue?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sap", "dynamics365", "salesforce", "snowflake"],
    tags: ["profitability", "contribution", "cost-allocation", "pricing", "rebates"],
  },
  {
    slug: "bad-debt-risk-audit",
    name: "Bad debt risk audit",
    category: "customers",
    subcategory: "Credit risk",
    description:
      "Assesses the credit loss embedded in the receivables book: which balances are genuinely at risk, whether the allowance reflects that risk, and whether the organisation's provisioning basis is applied consistently and honestly.",
    defaultTitle: "Bad debt risk audit",
    auditDescription:
      "A forward-looking review of expected credit loss — testing the evidence behind each at-risk balance, the integrity of the provisioning basis, and whether write-off behaviour tells a different story from the provision.",
    instructions: `You are assessing bad debt risk in the receivables book. This is a valuation audit with a forecasting problem inside it: the question is not what is owed but what will actually be collected, and the evidence for that lives partly in the ledger and partly outside it.

Begin with the provisioning basis itself. Establish what the organisation's stated policy is, when it was last calibrated, and — crucially — whether the loss rates it applies were derived from this book's own history or inherited from somewhere else. Test the basis backwards: apply the current policy to a prior period and compare the provision it would have produced against the losses that actually crystallised. A policy that has under-provided for several periods running is a finding about the policy, not about any one customer.

Then work the book. Age is a symptom, not the diagnosis. Real risk shows in behaviour: has the customer stopped paying entirely, or are they paying new invoices while old ones ossify — usually a dispute or cash-rationing hierarchy rather than insolvency? Has the payment pattern lengthened progressively? How many promises to pay have been broken? Has the account been placed on stop, escalated, or handed to a third party? Has an invoice been re-issued, re-dated or partially credited in a way that resets its apparent age without resetting the underlying risk — look for this deliberately, because it is the most common way an aging report understates exposure.

Corroborate externally where you can: credit agency deterioration, filings, press, sector distress, the customer's own communications. Weigh innocent explanations honestly before impairing anything — a dispute over a purchase order number, an invoice sent to the wrong entity, genuinely long negotiated terms, a public-sector payer with slow but certain settlement, a balance settled by netting against a payable.

Compare the provision to write-off history and to the release pattern. Provisions raised in a good period and quietly released in a bad one are an earnings-management thread worth pulling — without asserting intent you cannot evidence.

Never encode a threshold as a rule. Ask the user what materiality and expected-loss framework apply; if none is supplied, state the basis you used and how sensitive your conclusion is to it.

Cite every material finding to file, sheet, row, invoice or customer ID, and label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Where the evidence to settle a balance's risk is absent, name the document you need and leave it open. Write for a controller who must justify the provision to an external auditor: be specific about uncertainty, and present no conclusion as a regulatory, accounting-standard or legal determination — that rests with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Aged receivables at period end",
        description: "Invoice-level detail by customer with original invoice date, due date and current aging bucket.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Bad debt provision calculation and policy",
        description: "The allowance workings plus the stated provisioning matrix or expected-loss basis.",
        formats: ["xlsx", "docx", "pdf"],
        required: true,
      },
      {
        name: "Historical write-off and recovery record",
        description: "Amounts written off and later recovered over prior periods, used to back-test the policy.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Collections notes and promise-to-pay log",
        description: "Contact history, escalations, stop-list status and broken payment promises by account.",
        formats: ["xlsx", "csv", "pdf", "eml"],
        required: false,
      },
      {
        name: "Customer credit assessments",
        description: "Credit limits, agency scores or internal risk gradings and when they were last refreshed.",
        formats: ["xlsx", "pdf", "integration"],
        required: false,
      },
      {
        name: "Dispute register",
        description: "Open disputes with the disputed amount and status, distinguishing dispute from distress.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Invoice-level aged receivables with original (not re-issued) invoice dates",
      "The provision calculation and the stated basis behind its loss rates",
      "Write-off and recovery history for at least one prior comparable period",
      "Collections or dispute evidence for the balances assessed as at risk",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "overall_risk_rating",
      "aging_visualization",
      "aging_table",
      "risk_matrix",
      "finding_card",
      "risk_highlight",
      "trend_card",
      "evidence_list",
      "missing_evidence_notice",
      "recommendation_card",
    ],
    suggestedFollowups: [
      "When was the provisioning matrix last calibrated against this book's own loss history, and by whom?",
      "Which aged balances have been re-issued or re-dated, and what was the original invoice date on each?",
      "For the accounts paying new invoices while old ones age, is there an open dispute or a cash constraint?",
      "What provision releases were recorded in the period, and what evidence supported each release?",
      "Which at-risk balances are covered by credit insurance, a guarantee, or a right of set-off against a payable?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sap", "oracle_fusion", "dynamics365", "salesforce"],
    tags: ["bad-debt", "provision", "credit-risk", "expected-loss", "write-off"],
  },
  {
    slug: "unapplied-receipt-audit",
    name: "Unapplied receipt audit",
    category: "customers",
    subcategory: "Cash application",
    description:
      "Investigates cash received but not matched to an invoice — why it is sitting unapplied, how long it has sat, what it is masking in the aging, and whether the cash application process itself is the control weakness.",
    defaultTitle: "Unapplied receipt audit",
    auditDescription:
      "A review of unapplied and on-account cash: the population, the age profile, the root causes, the receivables and revenue distortion it creates, and the process failures behind it.",
    instructions: `You are auditing unapplied cash — money received from customers that has not been matched to a specific invoice. This is a process audit with a balance-sheet consequence, not housekeeping: unapplied cash simultaneously overstates the aging of real debt and understates the cash the customer has actually paid, corrupting two things auditors rely on at once.

First, establish the population properly, because it hides in several places: the formal unapplied or on-account bucket in the sub-ledger; customer accounts carrying a net credit balance inside a debit control total; suspense or clearing accounts receiving customer cash; payments applied to a dummy or generic customer record; and bank credits from customers with no receipts entry at all. Reconcile the total you assemble to the ledger, and state which sources you could and could not interrogate.

Then age it and ask why. Cash unapplied for days is a timing artefact of normal processing; cash unapplied for months is a symptom. Categorise root causes rather than listing items — remittance advice not received or not machine-readable, part payments the system will not split, short payments where the customer deducted a rebate or disputed line that nobody chased, payments against invoices never raised, duplicate customer records splitting the payer from the debtor, overpayments, and cash from a customer that has ceased trading. The distribution across those causes tells you where the control is failing.

Test the consequence, not just the condition. Take the oldest and largest items and ask which invoices they should have cleared; if applied, would balances currently aged, or currently provided against, disappear? An organisation provisioning for debt it has already been paid is a real and common finding.

Consider innocent explanations before concluding a control failure: genuine prepayments and contractual deposits, a system migration, a payer paying on a schedule rather than per invoice, an intercompany settlement routed as a customer receipt. Weigh the unpalatable ones with care — unapplied cash is a classic place to park a lapping scheme — but never assert misappropriation without evidence; frame it as a hypothesis with the test that would confirm or clear it.

Do not encode any threshold as a rule. Ask what materiality applies and what the organisation's own service standard for cash application is; absent that, state the basis you adopted.

Cite every material finding to file, sheet, row, receipt reference or bank line, and label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Write for a receivables manager and their controller: be specific about which items to clear first and what blocks each. This is not an audit opinion and no conclusion is a regulatory or legal determination — sign-off rests with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Unapplied and on-account cash listing",
        description: "Receipt-level detail with receipt date, amount, customer (or lack of one) and days unapplied.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Aged receivables at period end",
        description: "Invoice-level detail, so unapplied cash can be tested against the balances it should have cleared.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Bank statements for the period",
        description: "Customer credits as they hit the bank, used to find receipts never entered into the sub-ledger.",
        formats: ["pdf", "csv", "mt940", "camt.053", "integration"],
        required: true,
      },
      {
        name: "Suspense and clearing account activity",
        description: "Movements on accounts where unidentified customer cash is parked.",
        formats: ["xlsx", "csv", "integration"],
        required: false,
      },
      {
        name: "Remittance advices",
        description: "Customer remittance detail for a selection of unapplied receipts.",
        formats: ["pdf", "eml", "xlsx"],
        required: false,
      },
      {
        name: "Cash application procedure",
        description: "The documented process, including who may apply cash, who may write off a residual, and the escalation path.",
        formats: ["docx", "pdf"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Unapplied, on-account and customer credit-balance detail with receipt dates",
      "Aged receivables at the same date, at invoice level",
      "Bank statement or payment processor records covering customer receipts for the period",
      "Suspense or clearing account movements where customer cash is held",
      "Remittance advices for the selected items, where they exist",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "key_metric_card",
      "aging_table",
      "transaction_table",
      "reconciliation_table",
      "root_cause_analysis",
      "finding_card",
      "control_weakness",
      "evidence_list",
      "control_recommendation",
      "follow_up_request",
    ],
    suggestedFollowups: [
      "For the oldest unapplied receipts, which invoices were they intended to settle and what is blocking application?",
      "Are any provided-for or chased balances already covered by cash sitting unapplied on the same customer?",
      "Who is authorised to write off an unapplied residual, and were the write-offs in the period approved at that level?",
      "How many customer records are duplicated such that the payer and the debtor sit on different accounts?",
      "Which unapplied balances relate to customers that have since stopped trading, and are they refundable?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sage", "dynamics365", "stripe", "plaid", "adyen"],
    tags: ["unapplied-cash", "cash-application", "receivables", "suspense", "reconciliation"],
  },
  {
    slug: "customer-contract-review",
    name: "Customer contract review",
    category: "customers",
    subcategory: "Contracts",
    description:
      "Reads the customer contract population against what was actually billed and recognised — testing whether pricing, terms, obligations and exit rights in the paper match the behaviour in the ledger.",
    defaultTitle: "Customer contract review",
    auditDescription:
      "A contract-to-ledger review: does what the organisation agreed to sell, at what price, on what terms, match what it invoiced, collected and recognised — and what commitments are buried in the paper that nobody has priced?",
    instructions: `You are reviewing customer contracts against the organisation's billing and revenue records. The governing question is simple and rarely asked directly: does the ledger behave the way the paper says it should?

Start by establishing whether a contract population even exists in a testable form. Reconcile the customers generating revenue in the period to the contract register. Revenue from a customer with no contract on file, and a contract on file with no revenue against it, are both threads — the first is an evidence gap around the right to bill, the second may be an unrecognised obligation or a dead account.

Then read for the terms that actually move numbers, against the ledger rather than in isolation. Test billed price against contracted price, including escalators, indexation clauses and tiered rates that should have stepped during the period — agreed uplifts never applied are among the most common and most recoverable leaks you will find. Test contractual payment terms against the invoice and against actual settlement behaviour; a customer paying to a term nobody agreed is either an undocumented concession or an unenforced right. Test billing frequency and trigger events (milestone, delivery, acceptance, usage) against when revenue was actually invoiced and recognised.

Read for what the organisation has promised and may not have priced: service credits and SLA penalties, rebate and volume-discount ladders, most-favoured-customer clauses, uncapped support or implementation obligations, rights of return or refund, termination-for-convenience rights, and auto-renewal terms whose notice periods may already have lapsed. For each, ask whether the ledger reflects it — an accrued rebate, a provision, a deferred balance — or whether it exists only in the paper.

Corroborate against non-accounting evidence: signed amendments, purchase orders, order forms, the CRM record. Give particular weight to side letters and email amendments, which frequently override the master agreement and rarely reach finance.

Weigh innocent explanations before concluding: a superseded contract you were not given, a concession properly approved but poorly filed, a proration convention, an amendment post-dating the extract. Say what you considered.

Do not set a numeric threshold as a decision rule. Ask the user what materiality basis applies and whether a defined contract population was agreed; if not, state the selection basis you adopted and its limitations.

Cite every material finding to the contract name, clause or section, and to the ledger file, sheet, row or invoice it contradicts. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Write for a finance lead working alongside a commercial or legal counterpart. You read contracts here as a finance professional, not as counsel: present no interpretation as a legal or regulatory determination, and defer contractual and accounting sign-off to a licensed professional.`,
    recommendedInputs: [
      {
        name: "Customer contract population",
        description: "Executed master agreements, order forms and any amendments or side letters for the customers in scope.",
        formats: ["pdf", "docx"],
        required: true,
      },
      {
        name: "Contract register",
        description: "The organisation's own schedule of contracts with value, start, end, renewal and notice dates.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Invoice and revenue detail by customer",
        description: "What was actually billed and recognised in the period, at a level that can be traced to contract terms.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Price list and approved discount schedule",
        description: "The pricing the contracts should have been written against, plus the approval matrix for exceptions.",
        formats: ["xlsx", "pdf", "docx"],
        required: false,
      },
      {
        name: "CRM contract and opportunity records",
        description: "Deal terms as recorded commercially, useful for spotting terms that never reached finance.",
        formats: ["integration", "xlsx", "csv"],
        required: false,
      },
      {
        name: "Deferred revenue and accrual schedules",
        description: "Used to test whether contractual obligations are reflected on the balance sheet.",
        formats: ["xlsx", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Executed contracts (including amendments) for the customers selected",
      "Invoices or revenue detail for the same customers covering the review period",
      "The contract register or equivalent schedule of terms and renewal dates",
      "The approved price list or pricing authority the contracts should conform to",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "audit_methodology",
      "table",
      "finding_card",
      "warning_box",
      "comparison_card",
      "source_citation",
      "evidence_list",
      "missing_evidence_notice",
      "recommendation_card",
      "management_question",
    ],
    suggestedFollowups: [
      "Which contracted price escalators or indexation clauses were due in the period but never billed?",
      "Are there side letters, email amendments or verbal concessions that override the master agreements on file?",
      "Which contracts auto-renewed because a notice deadline passed, and was that intentional?",
      "What service credits, SLA penalties or rebate ladders are contractually owed but not accrued in the ledger?",
      "Which revenue-generating customers have no executed contract on file, and on what basis are they being billed?",
    ],
    relevantIntegrations: ["salesforce", "hubspot", "netsuite", "chargebee", "recurly", "sharepoint", "google_drive"],
    tags: ["contracts", "pricing", "terms", "obligations", "revenue-leakage"],
  },
  {
    slug: "sales-return-audit",
    name: "Sales return audit",
    category: "customers",
    subcategory: "Returns",
    description:
      "Examines returns and the credits issued against them — whether goods actually came back, whether the credit matched the return, whether returns cluster suspiciously around period ends, and whether the returns provision holds up.",
    defaultTitle: "Sales return audit",
    auditDescription:
      "A review of the returns population: authorisation, physical receipt, credit accuracy, timing around period ends, restocking and scrap treatment, and the adequacy of any provision for returns not yet made.",
    instructions: `You are auditing sales returns. A return is one of the few transactions that leaves a trace in three places at once — the returns authorisation, the physical inventory movement, and the credit to the customer — which makes it unusually testable, and unusually revealing when the three disagree.

Build the three-way picture first. For a selection of returns, match the return authorisation (RMA or equivalent) to the goods-inward receipt to the credit note, and run the test in each direction, because each catches a different failure. Credits with no physical receipt may be goodwill, or a credit dressed as a return; goods received with no credit means a customer is owed money the ledger does not show; returns authorised with neither receipt nor credit are a process leak.

Test the credit against the original invoice line, not just the total. A return credited at a price the goods were never sold at, at current rather than historic price, or for quantities exceeding what was invoiced, is a specific and evidenced finding. Check the credit reversed cost of sales and restored inventory — or wrote it to scrap — consistently: reversing revenue while leaving cost in place overstates margin damage, and restoring unsaleable stock overstates assets.

Then interrogate the timing distribution deliberately. Plot returns and credits by date, watching the days either side of each period end. Returns clustering immediately after a period end against invoices raised immediately before it is the classic signature of channel stuffing, and it is exactly what this audit exists to find. Pursue it — but weigh innocent explanations first: a seasonal or promotional pattern, a quality incident traceable to a batch, a new product with a known return rate, a customer's inventory rebalancing, a policy change.

Be sceptical of a population where most returns carry a generic reason code — a data quality finding in itself that blocks the root cause analysis management needs. Assess whether post-period returns relating to pre-period sales are provided for, and whether the provision basis reflects this book's observed behaviour rather than an inherited rate.

Do not encode a numeric threshold as a decision rule. Ask what materiality applies and what the returns and provisioning policies are; if unavailable, state what you assumed and its effect.

Cite every material finding to file, sheet, row, credit note, RMA or invoice number, and label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Write for a controller who must discuss this with operations and sales; where a pattern suggests deliberate timing, present it as a hypothesis with its settling test, never an assertion. No conclusion is a regulatory or legal determination — sign-off rests with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Returns and credit note listing",
        description: "All returns and credits in the period with dates, customer, original invoice reference, quantity, value and reason code.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Sales invoice detail",
        description: "Original invoice lines so credits can be matched to what was actually sold and at what price.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Return authorisation records",
        description: "RMA log or equivalent showing what was authorised, by whom, and when.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
      {
        name: "Goods-inward and stock movement records",
        description: "Warehouse receipts and inventory movements evidencing that returned goods physically came back.",
        formats: ["xlsx", "csv", "integration"],
        required: false,
      },
      {
        name: "Returns provision calculation",
        description: "The workings for returns expected against sales already recognised, plus the stated basis.",
        formats: ["xlsx", "pdf"],
        required: false,
      },
      {
        name: "Returns and credit authorisation policy",
        description: "Who may authorise a return or issue a credit, and at what value.",
        formats: ["docx", "pdf"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Credit note and return detail for the period with dates and original invoice references",
      "Sales invoice lines for the invoices being credited",
      "Inventory receipt or stock movement evidence for a selection of returns",
      "The returns provision basis and its calculation, if a provision is recorded",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "timeline",
      "bar_chart",
      "transaction_table",
      "finding_card",
      "risk_highlight",
      "data_quality_warning",
      "root_cause_analysis",
      "evidence_list",
      "control_recommendation",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Why do returns cluster in the days following the period end, and against which invoices were they raised?",
      "Which credit notes were issued without any evidence of goods being physically received back?",
      "Who authorised the credits above the policy limit, and what supporting documentation exists for each?",
      "What proportion of returns carry a generic reason code, and can the underlying reasons be reconstructed?",
      "Was returned stock restored to saleable inventory, and has its condition actually been verified?",
    ],
    relevantIntegrations: ["netsuite", "dynamics365", "sap", "shopify", "woocommerce", "cin7", "lightspeed"],
    tags: ["returns", "credit-notes", "cut-off", "channel-stuffing", "inventory"],
  },
  {
    slug: "customer-exposure-review",
    name: "Customer exposure review",
    category: "customers",
    subcategory: "Concentration and exposure",
    description:
      "Quantifies total economic exposure to individual customers and to correlated groups of them — receivables, unbilled work, committed cost, prepayments and contractual commitment — and asks what happens if the largest one fails.",
    defaultTitle: "Customer exposure review",
    auditDescription:
      "A risk review that aggregates every form of exposure to a customer, groups customers by what actually correlates their failure, and tests the resilience of the business to losing the biggest ones.",
    instructions: `You are reviewing economic exposure to customers. This is not a receivables audit and not a revenue concentration count — it is an aggregation and resilience question. The failure it exists to prevent is a business that knows its largest debtor but not its largest exposure.

Define exposure broadly and build it up per customer. The receivable is only the visible layer. Add unbilled work in progress and accrued revenue, inventory built or bought for that customer, committed purchase obligations entered into to serve them, capitalised contract costs, prepayments made on their behalf, retentions, guarantees given, and the forward contractual commitment the organisation has locked itself into. Then net off what genuinely mitigates: deposits held, credit insurance (check the actual cover and its exclusions, not merely that a policy exists), enforceable set-off against the same counterparty, parent guarantees, letters of credit. State which mitigants you verified and which you took on assertion.

Then group. This is where the review adds most value and where most reporting fails, because the unit of risk is rarely the customer record. Aggregate by ultimate parent or beneficial owner — one group frequently appears as several unrelated-looking accounts. Beyond legal grouping, find correlated exposure: customers sharing a sector, geography, end-market, funding source, regulator or single large payer. Two unrelated customers selling exclusively into one collapsing industry are one exposure, not two.

Then test resilience rather than describing the profile. Model what happens if the largest exposure fails outright: the immediate loss, the revenue and contribution that disappears with it, the committed cost that does not, the cash timing effect, and whether covenants or facility headroom are touched. Repeat for the largest correlated group. Examine trajectory too — exposure growing while payment behaviour deteriorates is more dangerous than a larger, stable one.

Weigh the reassuring explanations before concluding: exposure to a highly rated counterparty, a diversified group merely sharing a parent, a seasonal peak that unwinds, exposure covered by an enforceable set-off. Say which you tested.

Do not encode a concentration threshold as a rule. Ask what exposure limits, credit policy or risk appetite the organisation has set and who approved them; if none exists, that absence is itself reportable, and state the basis you used to judge significance.

Cite every material figure to file, sheet, row, customer or contract reference, and label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Write for a CFO or audit committee reader who needs the exposure picture and the resilience answer, not a list of accounts. This is neither an audit opinion nor a credit rating, and no conclusion is a regulatory or legal determination — sign-off rests with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Receivables and unbilled revenue by customer",
        description: "Open receivables plus accrued or unbilled amounts, at the review date.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Revenue by customer for the period",
        description: "Used to size the contribution and revenue at risk behind each exposure.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Customer group and ownership mapping",
        description: "Ultimate parent or beneficial owner for each customer account, so related accounts aggregate correctly.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
      {
        name: "Contract commitment schedule",
        description: "Forward contracted value, committed purchase obligations and retentions by customer.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
      {
        name: "Credit insurance and security register",
        description: "Cover limits, exclusions, guarantees, letters of credit and deposits held.",
        formats: ["pdf", "xlsx", "docx"],
        required: false,
      },
      {
        name: "Credit policy and exposure limits",
        description: "The organisation's stated risk appetite, limits and approval authorities, if any exist.",
        formats: ["docx", "pdf"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Open receivables and unbilled amounts by customer at the review date",
      "Revenue by customer for the period under review",
      "Ownership or group mapping for the largest customer accounts",
      "Evidence of any mitigant claimed — insurance cover, guarantee, deposit or right of set-off",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "overall_risk_rating",
      "customer_concentration_chart",
      "risk_matrix",
      "key_metric_card",
      "table",
      "finding_card",
      "risk_highlight",
      "assumption_box",
      "evidence_list",
      "recommendation_card",
    ],
    suggestedFollowups: [
      "Which separately maintained customer accounts share an ultimate parent, and what is the combined exposure?",
      "What exactly does the credit insurance cover for the largest exposures, and what are the exclusions?",
      "Which exposures are growing fastest, and is payment behaviour on those accounts improving or deteriorating?",
      "If the largest exposure failed today, what committed cost would remain and would any covenant be breached?",
      "Which customers are correlated by end-market, funding source or single ultimate payer rather than by ownership?",
    ],
    relevantIntegrations: ["netsuite", "sap", "dynamics365", "oracle_fusion", "salesforce", "snowflake", "postgres"],
    tags: ["concentration", "exposure", "credit-risk", "resilience", "counterparty"],
  },
  {
    slug: "cut-off-and-invoice-timing-audit",
    name: "Cut-off and invoice timing audit",
    category: "customers",
    subcategory: "Cut-off",
    description:
      "Tests whether sales were recorded in the right period by comparing invoice dates against delivery, acceptance and system-entry evidence, with focused attention on the days either side of each period boundary.",
    defaultTitle: "Cut-off and invoice timing audit",
    auditDescription:
      "A period-boundary audit of sales invoicing: were invoices dated when the obligation was actually satisfied, or when the period needed them to be — and what does the entry-versus-document date gap reveal?",
    instructions: `You are testing sales cut-off — whether revenue landed in the period it belongs to. The audit turns on one distinction, easy to state and easy to lose: the document date is an assertion, the date of the underlying event is a fact. Compare them.

Work the boundary in both directions rather than sampling evenly. Take invoices dated in the last days of the period and test forward to independent evidence the obligation was satisfied by that date — dispatch note, proof of delivery, carrier tracking, acceptance sign-off, timesheet, usage log, milestone certificate. Then take performance events in the first days of the following period and test backward for invoices already raised before the boundary. Then invert: take deliveries in the final days and confirm they were invoiced in that period, catching the understatement direction overstatement-focused testing misses.

The most informative artefact here is usually the gap between an invoice's document date and its system entry timestamp. Extract both wherever exposed and examine the distribution. Invoices dated inside the period but entered after it closed are not automatically wrong — normal close processing produces this — but a cluster concentrated on large values, a few customers or a few users is what this audit exists to surface. Look for the reverse: invoices entered before the boundary, dated after it.

Examine the adjacent behaviours revealing timing pressure: credit notes issued just after the period end against invoices raised just before it, manual sales journals bypassing the billing sub-ledger near the boundary, invoices raised against purchase orders that post-date them, unusual dispatch activity in the final days.

Weigh innocent explanations before concluding anything about deliberate timing. A month-end delivery surge, a billing cycle coinciding with the boundary, a bill-and-hold arrangement with real substance, batch invoicing run late, a customer requiring invoices dated to their own cycle — all ordinary, all resembling manipulation. State which you considered and what evidence bore on each.

Do not apply a numeric threshold as a decision rule, and do not declare a fixed window to be "the cut-off period". Ask what materiality applies and what the recognition trigger is for each stream; if not supplied, state the trigger you assumed and flag that your conclusions depend on it.

Cite every material finding to file, sheet, row, invoice number, dispatch reference and both dates involved, and label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Where entry timestamps are unavailable, say so plainly — it materially limits this audit. Write for a controller preparing for external audit; present timing patterns with a proposed test, never as an accusation of intent. No conclusion is a regulatory or legal determination — sign-off rests with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Sales invoice listing spanning the period boundary",
        description: "Invoices either side of the cut-off with document date and, critically, system entry or creation timestamp and user.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Dispatch, delivery or performance evidence",
        description: "Dispatch notes, proof of delivery, acceptance certificates, timesheets or usage logs for the boundary transactions.",
        formats: ["xlsx", "csv", "pdf"],
        required: true,
      },
      {
        name: "Credit notes issued after the period end",
        description: "Post-boundary credits, tested against the pre-boundary invoices they relate to.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Manual sales journals near the boundary",
        description: "Revenue posted outside the billing sub-ledger around the period end, with poster and posting date.",
        formats: ["xlsx", "csv", "integration"],
        required: false,
      },
      {
        name: "Revenue recognition policy",
        description: "The organisation's stated trigger for each revenue stream, which defines what 'the right period' means.",
        formats: ["docx", "pdf"],
        required: false,
      },
      {
        name: "Customer purchase orders for boundary invoices",
        description: "Used to confirm an order existed and was dated before the invoice raised against it.",
        formats: ["pdf", "xlsx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Invoice listing covering both sides of the period boundary, with document dates",
      "System entry or creation timestamps for those invoices, where the system records them",
      "Independent delivery, dispatch or performance evidence for the selected boundary transactions",
      "Credit notes raised after the period end with their original invoice references",
      "The stated revenue recognition trigger for each revenue stream in scope",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "audit_methodology",
      "timeline",
      "transaction_table",
      "scatter_chart",
      "finding_card",
      "risk_highlight",
      "contradiction_alert",
      "source_citation",
      "limitation_box",
      "recommendation_card",
    ],
    suggestedFollowups: [
      "For invoices dated before the period end but entered after it, what evidence shows delivery occurred by the invoice date?",
      "Which post-period credit notes reverse pre-period invoices, and what reason was recorded for each?",
      "Are there bill-and-hold arrangements, and does the customer's own documentation support them?",
      "Which users raised the boundary invoices, and does that differ from who normally raises sales invoices?",
      "Were any deliveries in the final days of the period left uninvoiced until the following period, and why?",
    ],
    relevantIntegrations: ["netsuite", "sap", "dynamics365", "oracle_fusion", "xero", "quickbooks", "odoo"],
    tags: ["cut-off", "revenue-recognition", "invoice-timing", "period-end", "occurrence"],
  },
  {
    slug: "related-party-customer-review",
    name: "Related-party customer review",
    category: "customers",
    subcategory: "Related parties",
    description:
      "Identifies customers that are related parties — declared or otherwise — and tests whether transactions with them were conducted, priced, settled and disclosed as they would have been with an independent party.",
    defaultTitle: "Related-party customer review",
    auditDescription:
      "A review of sales to related parties: completeness of the related-party population itself, arm's-length testing of terms and pricing, settlement behaviour, and the adequacy of disclosure.",
    instructions: `You are reviewing customers who are related parties of the organisation. Start from one principle: the declared related-party list is a hypothesis, not the population. The significant finding is usually not how a known related party was treated — it is a relationship nobody declared.

So spend real effort on completeness before testing terms. Compare the declared list against the customer master and look for the signatures a relationship leaves in data: a customer sharing an address, phone, bank account, domain or contact with a director, employee, shareholder or group entity; accounts created or maintained by a user connected to them; a name echoing a director's surname; accounts opened outside normal onboarding, with no credit check, or on terms no independent customer received. Cross-check directorship and shareholding records, the group structure, and conflict-of-interest declarations. Where you can only infer a relationship, label it a hypothesis with the record needed to confirm it — never assert one unevidenced.

Then test arm's length on every dimension, not just headline price. Compare pricing and discount against independent customers at comparable volume. Compare credit terms, limits and enforcement — was the account ever placed on stop, chased or escalated as an independent debtor would be? Compare settlement behaviour: balances that roll forward indefinitely, settle by netting rather than cash, or are periodically cleared and reinstated, are the most revealing patterns here. Ask whether the revenue has commercial substance — was anything delivered, and is there evidence from outside the group?

Then consider accounting consequences: whether balances are presented correctly rather than buried in trade receivables, whether provisions follow the same basis as everyone else's, whether the arrangement is in substance a distribution or funding transaction rather than a sale, and whether it was authorised by someone independent of the relationship.

Weigh innocent explanations carefully, because a wrong inference here is costly. Shared addresses occur in serviced offices. Similar names are often coincidence. Favourable terms may be approved and commercially rational. Netting may be ordinary group treasury practice. Separate the fact of a relationship from any suggestion of impropriety.

Do not encode a threshold as a rule. Ask for the group structure, the declared register and the materiality basis; if unavailable, say so plainly — this review is limited without them.

Cite every material finding to file, sheet, row, customer ID, invoice or register entry, and label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Handle unconfirmed relationships with particular care in the summary. Write for an audit committee or an owner who may be personally connected to what you find: be neutral, factual and non-accusatory. Nothing here is a regulatory, tax or legal determination — that rests with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Declared related-party register",
        description: "The organisation's own list of related parties and connected persons, with the basis of each relationship.",
        formats: ["xlsx", "docx", "pdf"],
        required: true,
      },
      {
        name: "Customer master data",
        description: "Full customer records including addresses, bank details, contacts, credit terms, created-by user and creation date.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Sales and receivables detail by customer",
        description: "Transactions and open balances for the period, so terms and settlement behaviour can be compared.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Group structure and directorship records",
        description: "Ownership chart, director and shareholder listings, and any conflict-of-interest declarations.",
        formats: ["pdf", "xlsx", "docx"],
        required: false,
      },
      {
        name: "Pricing and discount records for comparable customers",
        description: "The independent-customer benchmark needed to make an arm's-length comparison meaningful.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Prior period financial statement disclosures",
        description: "What was previously disclosed as related-party activity, for continuity and completeness testing.",
        formats: ["pdf", "docx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The declared related-party or connected-person register, or a statement that none exists",
      "Customer master records including address, bank and contact fields for matching",
      "Sales and open receivable detail for identified and suspected related parties",
      "Comparable pricing or terms for independent customers, to support arm's-length testing",
      "Group structure, directorship or shareholding evidence for relationships asserted",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "entity_comparison",
      "table",
      "finding_card",
      "risk_highlight",
      "comparison_card",
      "assumption_box",
      "evidence_list",
      "missing_evidence_notice",
      "management_question",
      "management_letter_section",
    ],
    suggestedFollowups: [
      "Which customer accounts share an address, bank account or contact with a director, employee or group entity?",
      "How do the credit terms and pricing given to each related-party customer compare with independent customers of similar volume?",
      "Are related-party balances settled in cash, or cleared by journal or netting — and how often does a cleared balance reinstate?",
      "Who authorised the terms granted to related-party customers, and were they independent of the relationship?",
      "Is there evidence from outside the group that goods or services were actually delivered to these customers?",
    ],
    relevantIntegrations: ["netsuite", "sap", "dynamics365", "oracle_fusion", "quickbooks", "xero", "postgres"],
    tags: ["related-party", "arms-length", "governance", "disclosure", "master-data"],
  },
  {
    slug: "collections-performance-audit",
    name: "Collections performance audit",
    category: "customers",
    subcategory: "Collections",
    description:
      "Evaluates how well the collections function actually works — measured behaviour rather than reported activity — covering dunning execution, escalation discipline, promise reliability, disputes as a blocker, and the cash consequence of the gaps.",
    defaultTitle: "Collections performance audit",
    auditDescription:
      "An operational audit of the collections process: is the dunning cycle actually executed, are escalations enforced, are promises kept, do disputes stall recovery, and what is the measurable cash cost of the answer?",
    instructions: `You are auditing how well the organisation collects what it is owed. This is an operational and control audit, not a valuation one — you test the process and the behaviour it produces, then the cash consequence. Resist the pull toward provisioning; that is a different engagement.

Start with what the process claims to be: when after due date first contact happens, the escalation ladder, who owns which segment, when an account goes on stop, when it leaves for a third party. Then test whether that happened — take aged accounts and check, item by item, whether the contact the policy required was made, on time, by the right owner. A dunning process that exists in a document but not in the contact log is the finding, and it is commoner than a bad policy.

Measure behaviour rather than activity counts. The metrics carrying information are DSO decomposed into its drivers (terms granted versus terms honoured), the best-possible DSO gap, collection effectiveness, first-contact-to-cash time, and roll-rate — how much of each bucket moves on rather than clearing. Compare against the organisation's own prior periods, because that is evidenced; if you cite an external benchmark, name its source and limitations rather than treating it as authoritative.

Interrogate promises to pay: how many made, how many kept in full and on time, how many accounts broke promises repeatedly without escalation. High promise volume with a low keep rate and no consequence means the team is being managed, not collecting.

Then treat disputes as a collections blocker rather than a credit issue. Measure how long they sit unresolved, who owns resolution (if collections raises disputes but sales resolves them, look hard at that handoff), and how much of the aged book a dispute blocks rather than unwillingness to pay. That usually reframes the picture.

Weigh alternatives before blaming the function: terms sales granted that collections never agreed, a customer with an inflexible payment run, an upstream billing failure (wrong PO reference, wrong entity, invoice never sent) making debt uncollectable, understaffing. Test whether the root cause sits upstream — often it does.

Do not apply any numeric threshold as a decision rule, nor import a benchmark as a target. Ask what the organisation's own service standards and terms are; if none are defined, that absence is itself reportable.

Cite every material finding to file, sheet, row, account, invoice or contact-log entry, and label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Write for a credit manager and controller: name the process step that failed, quantify the cash consequence, make each recommendation actionable by a named owner. No conclusion is a regulatory or legal determination — sign-off rests with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Aged receivables at period end and for prior comparable periods",
        description: "Invoice-level detail across periods, so roll-rates and trend can be measured rather than asserted.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Collections contact and activity log",
        description: "Dated record of calls, emails, letters and escalations by account and by collector.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Cash receipts by customer for the period",
        description: "Used to compute collection effectiveness and first-contact-to-cash timing.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Promise-to-pay log",
        description: "Promises made, amounts, dates due and whether they were kept.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Collections and credit control policy",
        description: "The documented dunning cycle, escalation ladder, stop-list rules and ownership by segment.",
        formats: ["docx", "pdf"],
        required: false,
      },
      {
        name: "Dispute register",
        description: "Open and closed disputes with raised date, blocked amount, owner and resolution date.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
      {
        name: "Agreed customer payment terms",
        description: "Contracted terms per customer, to separate terms granted from terms honoured in the DSO decomposition.",
        formats: ["xlsx", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Aged receivables for the current and at least one prior comparable period, at invoice level",
      "Dated collections contact history for the accounts selected",
      "Cash receipts by customer covering the period under review",
      "The documented collections policy and escalation ladder, or confirmation that none is documented",
      "Dispute records for aged balances asserted to be blocked by a dispute",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "key_metric_card",
      "trend_card",
      "line_chart",
      "aging_table",
      "heatmap",
      "finding_card",
      "control_weakness",
      "root_cause_analysis",
      "evidence_list",
      "action_plan",
    ],
    suggestedFollowups: [
      "For aged accounts with no contact logged, why was the documented dunning cycle not executed?",
      "How much of the aged book is blocked by an unresolved dispute rather than by customer unwillingness to pay?",
      "How many accounts have broken repeated payment promises without triggering the escalation the policy requires?",
      "How much of the DSO gap comes from terms granted outside policy versus customers failing to honour agreed terms?",
      "Which aged invoices were never validly delivered to the customer — wrong entity, wrong PO reference, or never sent?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sage", "dynamics365", "salesforce", "hubspot"],
    tags: ["collections", "dso", "dunning", "disputes", "credit-control", "receivables"],
  },
];
