import type { AuditTemplateSeed } from "@/lib/templates/types";

export const customerTemplatesA: AuditTemplateSeed[] = [
  {
    slug: "accounts-receivable-audit",
    name: "Accounts receivable audit",
    category: "customers",
    subcategory: "Receivables",
    description:
      "Examines the existence, completeness, valuation and collectability of the receivables balance, tracing from the ledger control account through the sub-ledger to individual customer transactions and cash received after the period end.",
    defaultTitle: "Accounts receivable audit",
    auditDescription:
      "An end-to-end review of the trade receivables balance: does it reconcile, does it exist, is it collectable, and is the allowance for doubtful accounts defensible on the evidence available?",
    instructions: `You are auditing the trade accounts receivable balance for the period supplied. Your objective is to form a supported view on four assertions in this order: reconciliation, existence, completeness, and valuation. Do not treat the balance as correct simply because it agrees to itself.

Begin by reconciling the receivables control account in the general ledger to the aged receivables sub-ledger at period end. Any difference is your first thread — pull it apart before doing anything else, because an unreconciled control account undermines every other conclusion you might draw. Look for journals posted directly to the control account that bypass the sub-ledger, unapplied cash sitting in suspense, credit balances inside a debit control total, and manual adjustments posted at or after the cut-off date.

For existence, prioritise the balances that matter most to the total rather than sampling evenly. Ask the user for their materiality basis for this engagement if it has not been supplied, and explain how that basis shaped your selection; if no basis is available, state the basis you used and why. Corroborate selected balances with the strongest available evidence: cash received after the period end applied against the specific invoice is usually more persuasive than a customer confirmation, which is in turn more persuasive than an internally generated invoice copy. Where you rely on subsequent receipts, verify that the receipt genuinely clears the balance you are testing and is not a later invoice being misapplied.

For completeness and cut-off, examine invoices raised either side of the period end against dispatch or service-delivery evidence, and examine credit notes raised shortly after the period end that relate to pre-year-end invoices.

For valuation, evaluate whether the allowance reflects what the evidence about each customer actually says: dispute correspondence, payment history deterioration, stalled collections activity, and balances where only newer invoices are being paid while older ones sit. Before concluding a balance is impaired, weigh innocent explanations — a disputed line on an otherwise-good invoice, a customer on a genuinely long negotiated term, an intercompany or related-party balance settled by netting, a payment in transit.

Cite every material finding to its source: file, sheet, page, row, invoice number or transaction ID. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information, and never let an interpretation drift into the summary as fact. Where evidence is absent, say so explicitly and request it rather than filling the gap with inference.

Frame recommendations as specific, actionable steps addressed to a finance controller who knows the ledger well. Keep the tone measured and professional. You are not issuing an audit opinion and must not present any conclusion as a regulatory or legal determination — final sign-off rests with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Aged receivables report at period end",
        description: "Sub-ledger detail by customer and invoice, with invoice dates, due dates and aging buckets.",
        formats: ["xlsx", "csv", "pdf"],
        required: true,
      },
      {
        name: "Trial balance or general ledger extract",
        description: "Used to reconcile the receivables control account to the sub-ledger total.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Post period-end cash receipts listing",
        description: "Receipts banked after the period end showing which invoices they were applied against.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Bad debt provision calculation",
        description: "The allowance workings, including any provisioning policy or matrix the organisation applies.",
        formats: ["xlsx", "pdf", "docx"],
        required: false,
      },
      {
        name: "Customer confirmations or statements",
        description: "Third-party confirmation replies or customer-issued statements for selected balances.",
        formats: ["pdf", "eml", "xlsx"],
        required: false,
      },
      {
        name: "Dispute and collections correspondence",
        description: "Notes or emails evidencing disputed invoices and collection efforts on older balances.",
        formats: ["pdf", "eml", "docx", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Aged receivables sub-ledger at period end reconciling to a stated control account balance",
      "General ledger or trial balance showing the receivables control account",
      "Cash receipts applied after the period end, linked to specific invoices",
      "Supporting documents for selected invoices (invoice copy plus dispatch or delivery evidence)",
      "The organisation's bad debt provisioning basis, if one exists",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "reconciliation_table",
      "aging_table",
      "key_metric_card",
      "finding_card",
      "risk_highlight",
      "evidence_list",
      "missing_evidence_notice",
      "recommendation_card",
      "limitation_box",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "What materiality basis should be applied to this receivables balance, and who approved it?",
      "Which of the aged balances are subject to an open dispute, and what is the disputed amount on each?",
      "Can we obtain direct confirmations for the balances where subsequent cash has not been received?",
      "Who has the authority to write off a receivable, and were all write-offs in the period approved at that level?",
      "Are any receivable balances due from related parties or entities under common control?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sap", "dynamics365", "oracle_fusion", "salesforce"],
    tags: ["receivables", "collectability", "reconciliation", "cut-off", "valuation"],
  },
  {
    slug: "revenue-audit",
    name: "Revenue audit",
    category: "customers",
    subcategory: "Revenue",
    description:
      "Tests recorded revenue for occurrence, accuracy and completeness by tracing the order-to-cash chain, corroborating sales against cash and third-party records, and interrogating the movement in revenue against operational drivers.",
    defaultTitle: "Revenue audit",
    auditDescription:
      "A substantive review of recorded revenue: did the sales happen, are they measured correctly, is anything missing, and does the revenue story hold together against the operational and cash evidence?",
    instructions: `You are auditing recorded revenue for the period supplied. Revenue is the account most exposed to manipulation pressure in most organisations, so approach it with professional scepticism while remaining fair to the evidence.

Start by building a picture of how revenue should behave for this business before you look for exceptions. Understand the revenue streams, the typical order-to-cash chain, and the operational drivers — units, subscribers, sites, headcount, billable hours, whichever apply. Then test whether the recorded numbers behave the way that picture predicts. The relationships that matter most here are revenue against cash collected, revenue against the operational driver, revenue against gross margin, and revenue against the receivables balance and days sales outstanding. A revenue movement that no driver explains, or revenue that grows while cash conversion deteriorates, is a thread worth pulling; it is not by itself a finding.

Then work the chain in both directions. Trace from source documents (orders, contracts, dispatch notes, timesheets, platform settlement reports) forward into the ledger to test completeness. Trace from ledger revenue entries back to source documents to test occurrence. Give particular attention to revenue recorded by manual journal rather than through the billing sub-ledger, revenue posted in the last days of the period, revenue posted by users who do not normally post sales, entries with round or repeated amounts, and revenue recognised against customers with no history of paying.

Corroborate against third parties wherever possible: payment processor settlement reports, marketplace payout statements, bank credits, and customer-signed contracts carry far more weight than anything the organisation produced about itself.

Before concluding that any anomaly is a misstatement, weigh the innocent explanations properly — a genuine large one-off contract, a pricing change, a new product launch, a seasonal pattern, a system migration mid-period, a reclassification between streams. State which explanations you considered and why the evidence does or does not support them.

Do not apply a numeric threshold as a decision rule. Ask the user what materiality basis applies here; if none is provided, state the basis you adopted and what would change under a different one.

Cite every material finding to file, sheet, page, row, invoice or transaction ID, and label every claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Where the evidence needed to resolve a thread does not exist in what you were given, name the specific document you would need and leave the point open rather than resolving it by assumption.

Write for a CFO and an audit committee reader: direct, quantified, no hedging that hides the point and no assertion that outruns the evidence. Nothing here constitutes an audit opinion or a legal conclusion; sign-off rests with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Revenue transaction detail for the period",
        description: "Invoice-level or line-level revenue with customer, date, product or stream, and posting source.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Prior period revenue detail",
        description: "The comparable period, at the same level of detail, for movement and trend analysis.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Operational driver data",
        description: "Units shipped, subscribers, billable hours, sites or transactions — whatever should move with revenue.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
      {
        name: "Payment processor or marketplace settlement reports",
        description: "Third-party records of amounts collected, used to corroborate recorded sales.",
        formats: ["csv", "xlsx", "pdf", "integration"],
        required: false,
      },
      {
        name: "Manual journals affecting revenue accounts",
        description: "Revenue entries not originated by the billing system, with poster, date and narrative.",
        formats: ["xlsx", "csv", "integration"],
        required: false,
      },
      {
        name: "Major customer contracts",
        description: "Signed agreements for the largest or most unusual revenue arrangements in the period.",
        formats: ["pdf", "docx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Revenue transaction detail reconciling to the revenue figure in the trial balance",
      "A comparable prior period at the same level of detail",
      "Source documents for selected revenue entries (order, contract, dispatch or delivery evidence)",
      "Third-party corroboration for at least one revenue stream (settlement report, bank credits or confirmations)",
      "Listing of manual journals posted to revenue accounts in the period",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "audit_methodology",
      "trend_card",
      "period_comparison",
      "bar_chart",
      "transaction_table",
      "finding_card",
      "risk_highlight",
      "source_citation",
      "recommendation_card",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Which operational metric does management consider the primary driver of revenue, and does the recorded revenue move with it?",
      "Who is authorised to post a manual journal to a revenue account, and is that access appropriate?",
      "Can each of the largest revenue transactions in the period be traced to a signed contract and a delivery record?",
      "What proportion of period revenue had converted to cash by the reporting date, and how does that compare to the prior period?",
      "Were any revenue streams reclassified, renamed or re-mapped during the period in a way that breaks comparability?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sap", "stripe", "shopify", "chargebee", "salesforce"],
    tags: ["revenue", "occurrence", "completeness", "analytical-review", "order-to-cash"],
  },
  {
    slug: "customer-aging-audit",
    name: "Customer aging audit",
    category: "customers",
    subcategory: "Receivables",
    description:
      "Interrogates the integrity of the aged receivables report itself and the direction of travel in the aging profile, distinguishing genuine collection deterioration from artefacts of how the aging is built.",
    defaultTitle: "Customer aging audit",
    auditDescription:
      "A focused review of the aging report: is the aging mechanically correct, is the profile deteriorating, and what is actually driving the movement between buckets?",
    instructions: `You are auditing the aged receivables report. This audit is deliberately narrower than a full receivables audit: your subject is the aging profile — whether it is constructed correctly, what it says about collection performance, and how it has moved.

First test the mechanics of the report before you interpret it, because an aging report is easy to make look better than reality. Verify what the aging is actually measured from: invoice date or due date. These produce materially different profiles and organisations sometimes switch quietly between them. Recompute the bucketing on a selection of invoices from their stated dates and confirm the report agrees. Check that the report total agrees to the receivables control account and that no balances have been dropped, netted or suppressed. Look specifically for the mechanics that flatter a profile: credit balances and unapplied receipts netted against old debit balances so an aged item disappears; invoices re-raised with a fresh date after being credited, resetting the clock on a stale debt; payment terms extended retrospectively so an overdue item re-enters a current bucket; balances moved to a different customer code.

Then interpret the movement. Compare the profile to the prior period end and, where possible, several period ends, so you can distinguish a trend from a single point. The comparisons that carry meaning are the shape of the profile over time, days sales outstanding, the proportion of the balance beyond terms, and the concentration of the oldest buckets in a few customers. A rising balance is not deterioration if sales rose proportionately; a stable balance can hide deterioration if the mix has shifted from current to aged. Say which it is, and show the working.

Weigh innocent explanations before concluding: a large invoice raised near the period end that is not yet due, a customer on genuinely extended contracted terms, a seasonal billing cycle, a migration that reset invoice dates, a single dispute distorting one bucket.

Do not apply any numeric threshold as a decision rule. Ask the user which balances or aging bands they consider material and on what basis. Where they cannot say, state the basis you used and its limits.

Cite every material observation to the specific customer, invoice number, row and file it came from, and label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Where the aging report alone cannot settle a question — and often it cannot — say what additional evidence would settle it.

Report to a credit control manager and a financial controller: practical, specific, and oriented toward what to chase and what to investigate. Do not present any conclusion about recoverability as final; that judgement, and any sign-off, rests with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Aged receivables report at period end",
        description: "Detailed by customer and invoice, with the aging basis and bucket definitions visible.",
        formats: ["xlsx", "csv", "pdf", "integration"],
        required: true,
      },
      {
        name: "Prior period aged receivables reports",
        description: "One or more earlier period ends on the same basis, to establish direction of travel.",
        formats: ["xlsx", "csv", "pdf"],
        required: true,
      },
      {
        name: "Customer payment terms master",
        description: "Contracted terms by customer, needed to test whether items are genuinely beyond terms.",
        formats: ["xlsx", "csv", "integration"],
        required: false,
      },
      {
        name: "Unapplied receipts and credit balances listing",
        description: "Cash on account and credit balances that may be netting against aged items.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Sales by period",
        description: "Revenue by month, so balance movements can be assessed against underlying sales volume.",
        formats: ["xlsx", "csv", "integration"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Aged receivables report at the current period end, agreeing to the control account",
      "At least one comparable prior period aging report on the same basis",
      "The stated aging basis (invoice date or due date) and bucket definitions",
      "Invoice dates and due dates at line level for recomputation of bucketing",
      "Payment terms by customer for the balances being tested",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "aging_table",
      "aging_visualization",
      "period_comparison",
      "trend_card",
      "data_quality_warning",
      "finding_card",
      "table",
      "recommendation_card",
      "assumption_box",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Is the aging calculated from invoice date or due date, and has that basis changed in the period under review?",
      "Which invoices in the oldest bucket were previously credited and re-raised, and why?",
      "Why are there unapplied receipts on accounts that also carry aged debit balances?",
      "Which customers had their payment terms amended during the period, and who authorised each change?",
      "What collection action has been taken on the oldest balances, and when was the last contact recorded?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sage", "dynamics365", "zoho_books", "odoo"],
    tags: ["aging", "collections", "dso", "receivables", "data-quality"],
  },
  {
    slug: "customer-credit-audit",
    name: "Customer credit audit",
    category: "customers",
    subcategory: "Credit control",
    description:
      "Reviews the credit granting and monitoring control environment: how limits are set, who approves exceptions, whether exposure respects the limits set, and whether the credit framework is exercised or merely documented.",
    defaultTitle: "Customer credit audit",
    auditDescription:
      "A controls-oriented review of customer credit: are limits set on a rational basis, enforced in the system, monitored in practice, and are exceptions approved by someone with the authority to approve them?",
    instructions: `You are auditing the customer credit control environment. This is primarily a controls audit, not a balance audit — your subject is whether credit decisions are made, enforced and monitored by a process that would catch a bad one, and only secondarily what the current exposure is.

Establish the intended control first. Obtain the credit policy, or reconstruct the de facto policy if none is written, and identify: who may grant a credit limit, on what evidence, who may increase one, who may approve trading beyond a limit, and how often limits are reviewed. Then test whether that intent survives contact with the system and the people. The interesting question is almost never "does a policy exist" — it usually does — but "does it bind."

Test the granting decision. For a selection of customers, examine what evidence supported the limit set: credit reference, trade references, financial statements, payment history, or nothing at all. Look for limits set at onboarding and never revisited, limits equal to the value of the first order, and limits held by customers who no longer trade.

Test enforcement. Compare exposure — balance plus unbilled orders and undelivered commitments, not just the ledger balance — against the limit in force. Where exposure exceeds the limit, establish whether the system blocked, warned, or did nothing, and who released it. Look for the release patterns that matter: releases by the person who owns the sales target, repeated releases by one person, releases at period end, limits raised on the day an order was blocked, and orders split to sit under a limit.

Test monitoring and segregation of duties. Determine whether whoever sets limits is independent of whoever sells, and whoever releases held orders independent of both. Establish whether limits were reviewed after known deterioration signals: slowing payment, disputes, insolvency notices, a change of ownership.

Do not encode any threshold as a decision rule. Whether a given exposure or exception is significant is a judgement — ask the user for their risk appetite and materiality basis; if none is available, state the basis you adopted and its limits.

Cite every finding to its source — file, sheet, row, customer code, approval record, timestamp — and label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Where you infer an approval was absent because no record exists, label that missing information, not an unapproved transaction; those are different claims.

Report as a control weakness assessment to a finance director and internal audit: name the control, the way it fails, the exposure that creates, and a proportionate remedy. Do not characterise any weakness as a breach of law or regulation; a licensed professional owns that conclusion and sign-off.`,
    recommendedInputs: [
      {
        name: "Customer credit limit master",
        description: "Limits by customer with effective dates, who set them, and the last review date.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Current customer exposure report",
        description: "Outstanding balances plus open orders and undelivered commitments by customer.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Credit policy document",
        description: "The written policy covering limit setting, approval authorities and exception handling.",
        formats: ["pdf", "docx"],
        required: false,
      },
      {
        name: "Credit hold and release log",
        description: "Orders blocked on credit, who released them, when, and on what stated grounds.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
      {
        name: "Credit limit change history",
        description: "Audit trail of limit increases and decreases with user and timestamp.",
        formats: ["xlsx", "csv", "integration"],
        required: false,
      },
      {
        name: "Credit assessment files for selected customers",
        description: "Credit bureau reports, trade references or financials supporting the limits granted.",
        formats: ["pdf", "xlsx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Credit limits in force at the reporting date, with effective dates",
      "Customer exposure at the reporting date on a stated basis (balance, or balance plus open orders)",
      "The approval authority framework for granting limits and releasing holds, written or described",
      "Evidence of who released credit-held orders in the period, with timestamps",
      "Supporting credit assessment evidence for a selection of granted limits",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "overall_risk_rating",
      "control_weakness",
      "finding_card",
      "table",
      "risk_matrix",
      "entity_comparison",
      "control_recommendation",
      "management_question",
      "missing_evidence_notice",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Who is authorised to release an order held on credit, and are they independent of the sales target it serves?",
      "Which credit limits have never been reviewed since the customer was onboarded?",
      "Were any credit limits increased on the same day an order was blocked, and who approved them?",
      "What triggers a mandatory credit review — and did any of those triggers fire in the period without a review following?",
      "Does the exposure calculation include open orders and undelivered commitments, or only the ledger balance?",
    ],
    relevantIntegrations: ["netsuite", "sap", "dynamics365", "oracle_fusion", "salesforce", "xero", "quickbooks"],
    tags: ["credit-control", "exposure", "authorisation", "segregation-of-duties", "controls"],
  },
  {
    slug: "credit-note-audit",
    name: "Credit note audit",
    category: "customers",
    subcategory: "Adjustments",
    description:
      "Investigates credit notes issued against customer invoices — their authorisation, business rationale, timing and pattern — as both a revenue reversal risk and a recognised concealment route for fictitious sales and misappropriated receipts.",
    defaultTitle: "Credit note audit",
    auditDescription:
      "A targeted review of credit note activity: why each material credit was issued, who approved it, when it was raised relative to the original invoice and the period end, and what the pattern reveals.",
    instructions: `You are auditing credit notes issued against customer invoices. Keep two reasons for their scrutiny in view: they reverse revenue, and they are a standard concealment mechanism — a fictitious sale booked to hit a target is quietly credited afterwards, and a diverted receipt is covered by crediting the invoice it was meant to pay.

Start by categorising every credit note by its stated reason, then test whether that reason is supported by anything outside the credit note itself. A pricing-error credit should have a corrected price and a customer communication behind it; a return should have goods coming back into stock; a service failure should have a complaint. A credit with a blank, generic or copied narrative supports nothing, and a population where most narratives are generic is itself the finding.

Then examine timing and pattern, where credit notes give themselves away. Look at the interval between invoice and credit — credits raised very soon after suggest the invoice should not have been raised; credits raised long after suggest a problem known and deferred. Look at credits raised shortly after a period end against invoices dated shortly before it, and credits clustered around commission or bonus measurement dates. Look at credits exactly matching an invoice, credits split into parts, credits recurring for one customer, credits raised by whoever raised the invoice, and credits raised by someone with no billing role. Cross-reference against cash receipts on the same account: a credit landing in place of an expected payment is a more serious question than one following a documented return.

Test authorisation against the actual authority framework, and check whether approval is a system control or a signature added afterward. Where raiser and approver are the same person, say so plainly.

Weigh innocent explanations: a genuine goods return, a negotiated retrospective discount, a duplicate invoice being corrected, a billing error hitting many customers at once, an annual rebate settled by credit note. Many credit note populations are entirely benign; say so if that is what the evidence shows.

Never encode a threshold as a rule. Ask the user for the materiality basis and which credit reasons carry risk in their business; if unavailable, state and justify the basis you used.

Cite every material finding to credit note number, original invoice number, customer, file, sheet and row, and label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Where a credit is unsupported, be precise: that is missing evidence, not proven fraud.

Report to a financial controller and, where patterns suggest it, internal audit. Recommend investigation steps, not verdicts. Nothing here is a legal conclusion; a licensed professional owns sign-off.`,
    recommendedInputs: [
      {
        name: "Credit note listing for the period",
        description: "All credit notes with number, date, customer, amount, reason narrative, raiser and approver.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Linked original invoices",
        description: "The invoices being credited, with dates and amounts, so intervals and matching can be tested.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Credit note approval records",
        description: "System approval trail or signed authorisations for credits issued.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
      {
        name: "Supporting documentation for selected credits",
        description: "Return notes, customer complaints, pricing corrections or rebate agreements.",
        formats: ["pdf", "eml", "docx", "xlsx"],
        required: false,
      },
      {
        name: "Cash receipts by customer",
        description: "Used to test whether credits appear in place of expected customer payments.",
        formats: ["xlsx", "csv", "integration"],
        required: false,
      },
      {
        name: "Prior period credit note listing",
        description: "A comparable period to establish whether credit activity is normal for this business.",
        formats: ["xlsx", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Complete credit note listing for the period, reconciling to the credit note total in the ledger",
      "The original invoice referenced by each material credit note",
      "Reason narrative or credit code for each credit note",
      "Identity of the raiser and approver for a selection of credits",
      "Supporting documentation behind a selection of credits (return, complaint, or agreement)",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "transaction_table",
      "finding_card",
      "risk_highlight",
      "heatmap",
      "timeline",
      "root_cause_analysis",
      "evidence_list",
      "control_weakness",
      "recommendation_card",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Which credit notes were raised and approved by the same person, and does the system permit that?",
      "Why were credits raised shortly after the period end against invoices dated shortly before it?",
      "Do the credits recorded as goods returns have matching stock movements back into inventory?",
      "Are sales commissions clawed back when an invoice is subsequently credited, and was that applied here?",
      "Which customers received a credit in a period where an expected payment did not arrive?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "chargebee", "recurly", "sap", "odoo", "zoho_books"],
    tags: ["credit-notes", "revenue-reversal", "authorisation", "fraud-risk", "adjustments"],
  },
  {
    slug: "refund-audit",
    name: "Refund audit",
    category: "customers",
    subcategory: "Adjustments",
    description:
      "Follows refunds as cash leaving the business to a customer: whether each refund traces to a genuine underlying receipt, whether the destination matches the payer, and whether refund activity reconciles between the payment processor and the ledger.",
    defaultTitle: "Refund audit",
    auditDescription:
      "A cash-out review of customer refunds: does each refund reverse a real payment, did the money go back where it came from, and does processor refund activity agree to what the ledger recorded?",
    instructions: `You are auditing customer refunds. Keep the distinction from credit notes sharp: a credit note adjusts a receivable, a refund moves cash out to a customer. That difference drives this audit — your questions are whether the money left for a real reason, whether it went to the right destination, and whether anyone could have made it leave unnoticed.

Anchor on the three-way relationship: the original receipt, the refund, and the ledger entry. Every refund should trace to a specific identifiable inbound payment. Refunds with no traceable original receipt are your highest priority regardless of size, because that is what a manufactured refund looks like. Test that the refund does not exceed the original receipt, and look for one receipt refunded twice across systems or channels.

Test the destination. Where destination data exists — card last four digits, bank account, wallet address — compare it against the original payer. Refunds redirected to a different instrument than the one that paid, refunds to accounts matching employee details, refunds to a single destination serving many unrelated customers, and manually keyed destinations where the channel normally returns automatically are all worth pursuing.

Reconcile the populations rather than trusting either one. Refunds in the processor or platform, refunds in the ledger, and refunds visible as bank debits should agree. Investigate what falls out in either direction: a processor refund with no ledger entry hides a loss; a ledger refund with no processor record may be fabricated.

Examine authorisation and access. Determine who can initiate a refund, whether initiation and approval are separated, whether refunds outside the standard return window need a second party, and whether permissions match current roles — including leavers.

Weigh innocent explanations seriously: an expired card forcing a manual bank refund, a chargeback also appearing as a refund and looking like a duplicate, a goodwill payment, a batch lag straddling the period end, a partial refund on a partial return, currency conversion creating an apparent overpayment.

Do not encode a threshold as a decision rule. Ask the user for their materiality basis and refund policy tolerances; if unavailable, state and justify the basis you adopted.

Cite every material finding to refund ID, original transaction ID, customer, file, sheet and row, and label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Refund anomalies are frequently benign — do not let a pattern become an accusation, and be explicit when naming an area to investigate rather than a proven irregularity.

Report to a finance manager and, where destination or authorisation concerns arise, flag that the matter needs the organisation's own investigation channel. Nothing here is a legal conclusion or an audit opinion; sign-off rests with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Refund transaction listing",
        description: "All refunds with refund ID, date, customer, amount, channel, initiator and original transaction reference.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Original receipts or payments listing",
        description: "Inbound customer payments the refunds should trace back to.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Payment processor refund and settlement report",
        description: "Processor-side refund records used to reconcile against the ledger.",
        formats: ["csv", "xlsx", "pdf", "integration"],
        required: false,
      },
      {
        name: "Bank statements for the period",
        description: "To confirm refunds actually left the bank and in the amounts recorded.",
        formats: ["pdf", "csv", "ofx", "camt.053"],
        required: false,
      },
      {
        name: "Refund policy and authorisation matrix",
        description: "Who may initiate and approve refunds, and under what conditions.",
        formats: ["pdf", "docx"],
        required: false,
      },
      {
        name: "Refund destination details",
        description: "Masked card, bank or wallet destination per refund, for payer-versus-payee comparison.",
        formats: ["xlsx", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Complete refund listing for the period with original transaction references",
      "The inbound receipts population covering the refunded transactions",
      "Processor or platform refund records for reconciliation against the ledger",
      "Bank evidence that refunded amounts left the account",
      "The refund authorisation framework and who held refund permissions in the period",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "reconciliation_table",
      "transaction_table",
      "key_metric_card",
      "finding_card",
      "risk_highlight",
      "contradiction_alert",
      "control_weakness",
      "source_citation",
      "control_recommendation",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Which refunds have no traceable original inbound receipt, and what does the finance team say about each?",
      "Were any refunds sent to a destination different from the instrument that made the original payment?",
      "Do processor refund totals reconcile to the refunds posted in the ledger for each month of the period?",
      "Who currently holds refund initiation rights, and does that list include anyone who has left or changed role?",
      "Are refunds outside the standard return window subject to a second approval, and was that applied consistently?",
    ],
    relevantIntegrations: ["stripe", "adyen", "paypal", "shopify", "square", "woocommerce", "quickbooks", "xero"],
    tags: ["refunds", "cash-out", "reconciliation", "payments", "fraud-risk"],
  },
  {
    slug: "revenue-concentration-audit",
    name: "Revenue concentration audit",
    category: "customers",
    subcategory: "Revenue",
    description:
      "Measures dependency on individual customers, groups and channels, tests whether apparent diversification survives grouping of related entities, and assesses the disclosure, going-concern and credit implications of the concentration found.",
    defaultTitle: "Revenue concentration audit",
    auditDescription:
      "An assessment of who the business actually depends on: concentration by customer and group, how it has moved, whether it is disclosed, and what would happen if the largest relationships were lost.",
    instructions: `You are auditing revenue concentration. This is a dependency and disclosure audit, not a transaction-testing audit — the question is not whether the revenue is real but who the business is exposed to, how that changed, and whether anyone has said so.

The most important step, and the one most often skipped, is grouping before measuring. Concentration measured on raw customer codes is almost always understated. Consolidate customers that are the same economic counterparty: subsidiaries of a common parent, entities sharing a billing address, registration number, bank account or contact, franchisees under one master agreement, resellers whose demand traces to one client, and duplicate codes from a migration. State your grouping basis and show it — a reader must be able to disagree and see the effect. Report both the ungrouped and grouped picture.

Then measure across several cuts, because a business can be diversified on one and dangerously dependent on another: by customer group, channel, contract, and decision-maker. Look at the share held by the largest relationships, the shape of the distribution, and its movement against the prior period. Concentration that is stable and contractually secured is a different animal from concentration that grew sharply through one unwritten arrangement.

Then assess what it means. Test the durability of the largest relationships: is there a signed contract, what is its remaining term, what are the termination and change-of-control provisions, is it a framework with no volume commitment. Cross the concentration against credit exposure and payment behaviour — the largest customer also being the slowest payer compounds two risks usually reported separately. Consider profitability: a dominant customer winning deep discounts may be a larger share of revenue than of margin.

Consider disclosure and going concern. Where concentration is significant, ask whether it is reflected in the financial statements, board reporting and lender covenants. Do not assert a disclosure requirement as settled — the applicable framework is a matter for the reporting accountant and a licensed professional.

Never encode a threshold. Do not state as a rule that any share is or is not significant. Ask what dependency the board considers acceptable and on what basis; if unavailable, present the measured position, explain what would make it material in your judgement, and leave the determination with the reader.

Cite every material figure to file, sheet, row and customer code, and label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information — grouping decisions especially are interpretations.

Write for a board and audit committee: strategic, quantified, honest about the limits of what the revenue ledger alone can tell you. This is not an audit opinion, a going-concern determination, or a disclosure conclusion; sign-off rests with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Revenue by customer for the period",
        description: "Full-year or full-period revenue by customer code, reconciling to total revenue.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Prior period revenue by customer",
        description: "The comparable period, to measure how concentration has moved.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Customer master with group and parent relationships",
        description: "Parent codes, registration numbers, addresses or group flags used to consolidate related entities.",
        formats: ["xlsx", "csv", "integration"],
        required: false,
      },
      {
        name: "Contracts for the largest customer relationships",
        description: "Signed agreements showing term, volume commitment, termination and change-of-control terms.",
        formats: ["pdf", "docx"],
        required: false,
      },
      {
        name: "Gross margin by customer",
        description: "To distinguish share of revenue from share of profit for the dominant relationships.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Receivables balance by customer",
        description: "To assess whether concentration of revenue coincides with concentration of credit exposure.",
        formats: ["xlsx", "csv", "integration"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Revenue by customer for the period, reconciling to reported total revenue",
      "A comparable prior period on the same customer coding basis",
      "The basis used to group related customers into economic counterparties",
      "Contract evidence for the largest relationships, or confirmation that none exists",
      "Receivables balances by customer at the reporting date",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "customer_concentration_chart",
      "key_metric_card",
      "pivot_table",
      "period_comparison",
      "risk_highlight",
      "finding_card",
      "assumption_box",
      "limitation_box",
      "recommendation_card",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Which customer codes belong to the same parent or group, and has anyone maintained that mapping?",
      "What is the remaining contracted term and notice period for each of the largest relationships?",
      "Is the largest customer relationship secured by a signed contract with a volume commitment, or a framework with none?",
      "Does the largest customer by revenue also represent the largest credit exposure or the slowest payment behaviour?",
      "Is the current level of customer dependency reflected in board reporting, lender covenants or the financial statements?",
    ],
    relevantIntegrations: ["netsuite", "sap", "dynamics365", "salesforce", "hubspot", "xero", "quickbooks", "snowflake"],
    tags: ["concentration", "dependency", "customer-risk", "disclosure", "revenue"],
  },
  {
    slug: "revenue-recognition-review",
    name: "Revenue recognition review",
    category: "customers",
    subcategory: "Revenue",
    description:
      "Examines when and how much revenue is recognised against the performance obligations in customer contracts, testing the accounting policy as applied rather than as written, with focus on timing, allocation and deferral.",
    defaultTitle: "Revenue recognition review",
    auditDescription:
      "A policy-and-contract review of recognition timing: what the customer contracts promise, when those promises are satisfied, and whether the revenue and deferred revenue balances reflect that.",
    instructions: `You are reviewing revenue recognition. Distinguish this from a revenue audit: you are not primarily asking whether the sales happened, but whether revenue was recognised in the right period and amount given what the contracts actually promise. A transaction can be entirely genuine and still be recognised wrongly.

Work from the contracts, not the invoices. An invoice tells you when someone was billed, a cash event; billing timing and recognition timing are routinely conflated. Read a selection of contracts across each revenue stream and identify the distinct promises, when each is satisfied, and what the customer pays for each. Then compare that against how revenue was recognised.

Focus on the arrangements where the answer is genuinely hard: contracts bundling distinct promises where the whole price was recognised on first delivery; upfront, implementation and setup fees taken at once where they are not distinct from an ongoing service; annual or multi-year arrangements billed upfront where deferral was done crudely or not at all; variable consideration such as usage tiers, rebates, penalties and refund rights; modifications and mid-term upgrades treated as new contracts; agency arrangements presented gross where the business may be an intermediary; and arrangements with a right of return or unmet acceptance criteria.

Then test deferred revenue as the mechanical check on the policy, because that is where recognition errors accumulate and become visible. Roll it forward: opening, plus amounts billed and deferred, less amounts released, equals closing. Investigate releases with no corresponding delivery event, balances that never unwind, negative deferrals, and manual journals moving amounts between deferred revenue and revenue near a period end.

Test the policy as applied against the policy as written; where they differ, establish which the systems implement — recognition schedules evidence practice better than a policy memo.

Weigh alternative explanations: a genuine change in terms, a distinct promise you underrated, immateriality management has assessed and documented, a permitted practical expedient, or a system handling the schedule correctly somewhere you have not looked.

Do not encode a threshold. Ask for the applicable reporting framework, the materiality basis, and management's documented policy; if unavailable, state what you assumed and how a different framework changes your view.

Cite every material point to contract, clause, invoice, schedule, journal, file, sheet and row, and label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Recognition is unusually judgement-dependent — where a matter turns on judgement, set out both readings rather than picking one silently.

Write for a technical accounting reader and the external auditor who sees this next: precise, with the contractual basis shown. This is a review, not a conclusion on compliance with any accounting standard; that determination and sign-off rest with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Customer contracts for selected arrangements",
        description: "Signed agreements across each revenue stream, including any modifications and side letters.",
        formats: ["pdf", "docx"],
        required: true,
      },
      {
        name: "Revenue recognition policy",
        description: "Management's documented policy and any technical accounting memos supporting it.",
        formats: ["pdf", "docx"],
        required: true,
      },
      {
        name: "Deferred revenue roll-forward",
        description: "Opening balance, additions, releases and closing balance by contract or customer.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Revenue recognition schedules",
        description: "System-generated schedules showing how each arrangement releases to revenue over time.",
        formats: ["xlsx", "csv", "integration"],
        required: false,
      },
      {
        name: "Billing and invoicing detail",
        description: "When customers were billed, so billing timing can be separated from recognition timing.",
        formats: ["xlsx", "csv", "integration"],
        required: false,
      },
      {
        name: "Manual journals to revenue and deferred revenue",
        description: "Entries moving amounts between deferral and revenue outside the billing system.",
        formats: ["xlsx", "csv", "integration"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Signed customer contracts covering the arrangements selected for review",
      "Management's stated revenue recognition policy",
      "Deferred revenue roll-forward reconciling opening to closing balance",
      "Recognition schedules or the workings used to release revenue over time",
      "Billing detail for the selected arrangements, distinct from recognition detail",
      "Listing of manual journals affecting revenue or deferred revenue accounts",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "audit_scope",
      "audit_methodology",
      "executive_summary",
      "table",
      "account_movement_visualization",
      "variance_card",
      "finding_card",
      "warning_box",
      "assumption_box",
      "source_citation",
      "recommendation_card",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Which reporting framework applies, and is there a technical memo supporting the policy for each revenue stream?",
      "For the bundled arrangements, how was the transaction price allocated across the distinct promises?",
      "Which deferred revenue balances have not moved during the period, and what contract sits behind each?",
      "How are contract modifications and mid-term upgrades handled — as continuations or as new arrangements?",
      "Are any arrangements presented gross where the business may be acting as an agent rather than a principal?",
    ],
    relevantIntegrations: ["netsuite", "chargebee", "recurly", "sap", "oracle_fusion", "dynamics365", "xero", "salesforce"],
    tags: ["revenue-recognition", "deferred-revenue", "contracts", "cut-off", "accounting-policy"],
  },
  {
    slug: "customer-master-data-audit",
    name: "Customer master data audit",
    category: "customers",
    subcategory: "Master data",
    description:
      "Audits the customer master file itself — duplicates, dormant and fictitious records, ownership of change, and the bank and address fields whose integrity determines where money and goods actually go.",
    defaultTitle: "Customer master data audit",
    auditDescription:
      "A data integrity and access review of the customer master: is each record real, unique and current, and is control over who can create or change one adequate to the exposure it creates?",
    instructions: `You are auditing the customer master file. Treat it as a control, not a spreadsheet. Every downstream number in the customer domain — aging, concentration, credit exposure, revenue by customer — inherits this file's quality, and its fields determine where refunds, goods and correspondence go. Bad master data does not merely produce untidy reports; it produces wrong conclusions from correct arithmetic.

Start with uniqueness, the most common defect and the most quietly damaging. Detect probable duplicates using several signals rather than one: near-identical names once punctuation, legal suffixes and case are normalised; shared registration numbers, addresses, bank details, email or phone; and one customer created twice around a migration. Report these as candidates for confirmation, never as confirmed duplicates — that needs a human who knows the customers. Quantify the consequence: which duplicates hold balances, which split one relationship's credit limit across two codes, which understate measured concentration.

Then test for records that should not be active: dormant records carrying a balance, dormant records that suddenly transacted, records created immediately before a sale and never used again, records with no registration number or verifiable address, records whose bank or address details match an employee's, and records whose only contact is a free email domain where the population otherwise uses corporate ones. Each is a question, not an answer — a small genuine customer can look exactly like a fictitious one on the master file alone; say so.

Then examine change control, which makes the rest sustainable. Establish who can create a record and who can amend sensitive fields — bank details, address, credit limit, payment terms, tax status. Test whether creation is segregated from sales and cash handling, whether bank detail changes are verified independently with the customer rather than against the request, and whether the change log records who changed what and when. Attend to changes made shortly before a payment and records changed by an account that also processes receipts.

Assess field quality where it has consequence: payment terms blank or inconsistent with the contract, wrong tax status, mismatched currency, absent credit limit.

Do not encode any threshold. Whether a level of duplication or a control gap matters is a judgement — ask what data quality standard and materiality basis apply; if unavailable, state and justify the basis you used.

Cite every finding to customer code, field, file, sheet and row, and label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Fuzzy matches are interpretations by construction.

Report to a master data owner and the financial controller: a prioritised remediation list and a control fix, not a defect count. Nothing here is a fraud finding or a legal conclusion; a licensed professional owns sign-off.`,
    recommendedInputs: [
      {
        name: "Customer master file export",
        description: "All customer records with code, name, address, registration number, contact, terms, currency and status.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Transaction activity by customer",
        description: "Invoices, credits and receipts per customer code, to identify dormant and reactivated records.",
        formats: ["xlsx", "csv", "integration"],
        required: true,
      },
      {
        name: "Master data change log",
        description: "Audit trail of record creations and field amendments with user and timestamp.",
        formats: ["xlsx", "csv", "integration"],
        required: false,
      },
      {
        name: "Customer bank detail fields",
        description: "Bank or remittance details held against customer records, for duplicate and integrity testing.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "User access listing for the customer master",
        description: "Who can create and amend customer records, and which sensitive fields each role can touch.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
      {
        name: "Master data governance policy",
        description: "Standards for record creation, verification and periodic review, if documented.",
        formats: ["pdf", "docx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Complete customer master export covering all active and inactive records",
      "Transaction activity per customer code across the period under review",
      "Change log or audit trail for customer record creations and amendments",
      "User access rights over customer record creation and sensitive field amendment",
      "Balances held by customer code at the reporting date",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "data_quality_warning",
      "table",
      "finding_card",
      "key_metric_card",
      "entity_comparison",
      "control_weakness",
      "assumption_box",
      "control_recommendation",
      "action_plan",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Which of the identified probable duplicate records refer to the same customer, and which should be merged or blocked?",
      "Who can create a customer record, and is that person independent of sales and of cash handling?",
      "How are changes to customer bank details verified — against the request, or independently with the customer?",
      "Which dormant customer records transacted during the period, and who reactivated them?",
      "When was the customer master last reviewed for redundant records, and who owns that review?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sap", "dynamics365", "salesforce", "hubspot", "postgres"],
    tags: ["master-data", "duplicates", "data-quality", "access-control", "governance"],
  },
];
