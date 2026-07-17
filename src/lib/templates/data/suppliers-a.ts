import type { AuditTemplateSeed } from "@/lib/templates/types";

export const supplierTemplatesA: AuditTemplateSeed[] = [
  {
    slug: "accounts-payable-audit",
    name: "Accounts payable audit",
    category: "suppliers",
    subcategory: "Payables",
    description:
      "Examines the payables balance and the process that produced it: whether recorded liabilities are complete, correctly cut off, properly aged, and supported by genuine obligations to genuine suppliers.",
    defaultTitle: "Accounts payable audit",
    auditDescription:
      "Reviews the accounts payable ledger for completeness, cut-off, valuation and aging integrity, and tests whether the payables balance reflects real, approved and unsettled obligations.",
    instructions: `You are auditing accounts payable as a balance and as a process. Your reader is the finance leadership who owns the number and the external auditor who will later challenge it, so be precise about what you tested and what you could not.

Begin by anchoring the balance. Reconcile the AP sub-ledger total to the payables control account in the general ledger at period end and explain any difference line by line rather than as a single plug. An unexplained reconciling item is itself a finding. Confirm the aging buckets recompute from invoice dates and terms rather than trusting the report's own columns.

Completeness is the dominant risk here, because understated payables flatter both the balance sheet and the result. Perform a search for unrecorded liabilities: examine payments made in the weeks after period end and ask whether the underlying goods or services were received before the cut-off date; examine goods received but not invoiced, open purchase orders with receipts and no matching bill, and accrual reversals that were never replaced by an invoice. Read supplier statements against ledger balances and investigate each direction of difference — invoices the supplier shows that you do not is a completeness issue; invoices you show that the supplier does not may signal duplication or a fictitious entry.

Then test the composition. Look for debit balances sitting in payables (often unresolved prepayments, over-payments or misposted credit notes), long-outstanding items that no longer represent live obligations, round-number balances, and balances against suppliers with no recent activity. Examine payment terms actually applied versus contracted terms, and payment timing patterns that look inconsistent with those terms in either direction.

Weigh materiality deliberately. Ask the user for the materiality basis they want applied and use it if given; otherwise form a judgement from the size and volatility of the balance, state the basis in one sentence, and label it as judgement rather than fact.

Before concluding, test innocent explanations: timing differences, disputed invoices deliberately withheld, retentions, consignment arrangements, entity or currency mapping, and known process backlogs. Say which you considered and how you ruled it in or out.

Cite every material figure to its file, sheet, row, transaction or statement page. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Frame recommendations as specific actions with a named owner. This review informs but does not replace sign-off by a licensed professional.`,
    recommendedInputs: [
      {
        name: "Accounts payable aged trial balance",
        description:
          "Supplier-level open payables at period end with invoice dates, due dates, terms and aging buckets, at transaction level where available.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "AP sub-ledger transaction detail",
        description:
          "All invoices, credit notes, payments and adjustments posted to payables during the period, with posting dates and users.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "General ledger payables control account",
        description: "Movements and closing balance of the payables control account, to reconcile against the sub-ledger.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Post-period-end payments and cash book",
        description:
          "Payments made in the weeks following the cut-off date, used to search for liabilities that existed but were not recorded.",
        formats: ["xlsx", "csv", "bank statement"],
        required: false,
      },
      {
        name: "Supplier statements",
        description: "Statements received from significant suppliers at or near period end for balance corroboration.",
        formats: ["pdf", "xlsx", "csv"],
        required: false,
      },
      {
        name: "Goods received not invoiced report",
        description: "Open receipts without a matched supplier invoice at period end, supporting the accrual completeness test.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Payment terms and approval policy",
        description: "The organisation's stated supplier payment terms, approval limits and payment run policy.",
        formats: ["pdf", "docx", "written text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The aged payables listing at period end, identified by report date and source system.",
      "The general ledger payables control balance for the same date, to evidence the sub-ledger reconciliation.",
      "Transaction-level AP postings for the period under review.",
      "Either post-period-end payment data or supplier statements to support the completeness conclusion.",
      "The invoice date, due date and terms used for any aging conclusion the audit draws.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "overall_risk_rating",
      "key_metric_card",
      "aging_table",
      "aging_visualization",
      "reconciliation_table",
      "finding_card",
      "missing_evidence_notice",
      "control_weakness",
      "recommendation_card",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Which post-period-end payments relate to goods or services received before the cut-off date, and were they accrued?",
      "What explains each reconciling item between the AP sub-ledger and the payables control account?",
      "Why do debit balances remain open in payables, and what is the plan to clear or reclassify them?",
      "For the oldest outstanding balances, is the obligation still live, disputed, or should it be written back?",
      "Which supplier statements were requested but not received, and how will that gap be closed?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "sage", "netsuite", "dynamics365", "sap", "oracle_fusion", "zoho_books"],
    tags: ["payables", "cut-off", "completeness", "aging", "reconciliation"],
  },
  {
    slug: "supplier-audit",
    name: "Supplier audit",
    category: "suppliers",
    subcategory: "Supplier review",
    description:
      "A whole-relationship review of the supplier base: who the organisation buys from, how much, on what basis, with what contractual cover, and which relationships carry the most risk.",
    defaultTitle: "Supplier audit",
    auditDescription:
      "Reviews the supplier population end to end — spend, concentration, contract coverage, pricing behaviour, terms and relationship risk — to identify which suppliers warrant closer scrutiny.",
    instructions: `You are auditing the supplier base as a portfolio of relationships, not a list of transactions. Your reader is the CFO and the procurement lead, who need to know where money is going, who controls those relationships, and which of them would hurt if they failed or turned out to be improper.

Start with the shape of the spend. Build the spend distribution by supplier, by category and by department for the period, and compare it to the prior period on the same basis. The questions that matter are: which suppliers absorb a disproportionate share of spend, which appeared or disappeared this period, and which grew or shrank in a way the business cannot explain. Concentration is not itself a fault — sole-source engineering or a single landlord is normal — so treat it as an exposure to be described and quantified, not a finding to be asserted.

Then test the basis of each significant relationship. Is there a live contract or purchase order framework, and does the spend actually fall within it? Compare unit prices or rates charged over time against the contracted rate and against the same goods bought elsewhere; look for uplifts applied without a contractual mechanism, and for scope that drifted beyond what was signed. Examine payment terms actually granted against the organisation's standard terms and ask why any supplier is treated differently.

Then look at relationship risk. Consider suppliers whose registered details, addresses, bank details or contact names overlap with employees or with each other; suppliers that transact but have no contract, no PO and no clear owner; dormant suppliers that suddenly reactivate; and suppliers whose invoicing pattern (round numbers, sequential numbering, invoices only just under an approval level) does not resemble ordinary commercial billing.

On materiality, ask the user what basis they want applied to spend and to individual relationships. If they give you one, apply it and say so. If not, form a judgement from the distribution in front of you, explain the basis in one sentence, and label it as judgement.

Before you conclude a relationship is improper, weigh the innocent reading: a legitimate rebrand, an acquisition, a genuinely specialised supplier, a group of entities under one parent, an intercompany recharge, or a data-entry convention. Name the alternative you tested.

Cite every supplier, figure and pattern to its source record, row or document. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information — indicators of impropriety are hypotheses until corroborated. Do not assert fraud or legal breach; describe what the evidence shows and what would confirm or clear it. This review informs but does not replace sign-off by a licensed professional.`,
    recommendedInputs: [
      {
        name: "Supplier master listing",
        description:
          "All supplier records with registration details, addresses, bank details, contacts, categories, status and creation dates.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Supplier spend and invoice history",
        description:
          "Invoices and payments by supplier for the period and at least one comparative period, with category and department coding.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Contract register",
        description: "Live supplier contracts with dates, values, agreed rates, renewal terms and contract owners.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
      {
        name: "Purchase order data",
        description: "Purchase orders raised in the period, to establish which spend was pre-authorised and against what.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Employee register",
        description:
          "Employee names, addresses and bank details, used only to look for overlaps with supplier records where the organisation permits this comparison.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Procurement and supplier onboarding policy",
        description: "The organisation's rules on approving, onboarding and reviewing suppliers, and standard payment terms.",
        formats: ["pdf", "docx", "written text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The supplier master listing, identified by extract date and source system.",
      "Supplier-level spend for the audited period and at least one comparative period.",
      "The invoice or payment records underpinning any supplier singled out as significant or unusual.",
      "The contract or purchase order relied on when concluding that spend was or was not covered.",
      "The organisation's standard payment terms or procurement policy where compliance is assessed.",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "overall_risk_rating",
      "supplier_concentration_chart",
      "key_metric_card",
      "period_comparison",
      "table",
      "finding_card",
      "risk_matrix",
      "assumption_box",
      "recommendation_card",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "For the largest suppliers by spend, what is the contingency if that relationship fails or the price moves?",
      "Which suppliers transacted materially without a contract or purchase order framework, and who authorised that?",
      "What drove the suppliers that appeared for the first time this period, and who onboarded them?",
      "Why do certain suppliers hold payment terms different from the organisation's standard, and who approved them?",
      "Which supplier relationships have no named internal owner accountable for performance and pricing?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sap", "dynamics365", "coupa", "oracle_fusion", "ramp"],
    tags: ["suppliers", "concentration", "contracts", "spend", "relationship-risk"],
  },
  {
    slug: "procurement-audit",
    name: "Procurement audit",
    category: "suppliers",
    subcategory: "Procurement",
    description:
      "Reviews how buying decisions are made and controlled: competitive process, approval authority, split purchases, off-contract buying and whether procurement policy survives contact with the business.",
    defaultTitle: "Procurement audit",
    auditDescription:
      "Examines the procurement process from requisition to award — competition, authorisation, policy compliance, split purchasing and maverick spend — and tests whether controls operate as designed.",
    instructions: `You are auditing the procurement process, not the payables balance. The distinction matters: your subject is the decision to buy and the authority under which it was made. Your reader is the procurement director and the audit committee, who need to know whether the policy is real or decorative.

Start by reading the organisation's own procurement policy, because it — not any rule you bring — defines what compliance means here. Extract from it the authorisation levels, the thresholds at which competition or a tender is required, and the exceptions permitted. If no policy is provided, say so, and treat every compliance conclusion as unavailable rather than inventing a standard.

Then test the process against that policy. For purchases requiring competition, was competition actually run, and is the evidence there — multiple quotes, a scored evaluation, a documented award rationale? Look for single-source awards, quotes that arrive from suppliers with overlapping details, evaluation criteria that appear to have been written around one bidder, and awards that predate the quotes they were supposedly based on.

Split purchasing deserves specific attention. Look for sequences of related orders to the same supplier, close in time, for related goods, whose individual values each fall just below an authorisation or competition level the policy sets. Aggregate them and ask whether the aggregate would have required a different route. Do not assert avoidance from arithmetic alone — genuine phased delivery, budget release timing and call-off contracts all produce the same shape.

Test authorisation as it actually operated: approvals given after the commitment was made, approvals by someone below the required level, approvals by the requisitioner themselves, and orders raised retrospectively to legitimise a purchase already agreed. Then look for maverick spend — buying that bypassed procurement altogether and arrived through corporate cards, expenses or direct invoices.

On materiality and thresholds, use only what the policy or the user gives you; if the user does not supply a materiality basis, form one from the spend profile, state it in one sentence, and label it as judgement.

Before concluding a breach, weigh innocent explanations: genuine emergency purchases, framework call-offs, a documented policy waiver, a supplier that is genuinely sole-source, or a system that records approval dates differently from when approval was given. Say which you tested.

Cite every purchase, approval and quote to its record, row or document. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Frame recommendations as control changes with a named owner and a decision required. State that this review informs but does not replace sign-off by a licensed professional.`,
    recommendedInputs: [
      {
        name: "Procurement policy",
        description:
          "The organisation's own policy: authorisation levels, competition and tender requirements, permitted exceptions and waiver process.",
        formats: ["pdf", "docx", "written text"],
        required: true,
      },
      {
        name: "Purchase order and requisition data",
        description:
          "Requisitions and purchase orders for the period with values, dates, requesters, approvers, suppliers and categories.",
        formats: ["xlsx", "csv", "procurement system export"],
        required: true,
      },
      {
        name: "Approval and workflow log",
        description: "System record of who approved what and when, including approval level and any delegation used.",
        formats: ["xlsx", "csv", "system export"],
        required: false,
      },
      {
        name: "Tender and quotation records",
        description: "Quotes received, evaluation scoring and award rationale for competitively procured purchases.",
        formats: ["pdf", "xlsx", "docx"],
        required: false,
      },
      {
        name: "Delegation of authority matrix",
        description: "Who may approve what value, in which category, and any temporary delegations in force during the period.",
        formats: ["xlsx", "pdf", "docx"],
        required: false,
      },
      {
        name: "Corporate card and expense data",
        description: "Card and expense spend for the period, to identify buying that bypassed the procurement route entirely.",
        formats: ["xlsx", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The procurement policy or delegation matrix that defines what compliance means for this organisation.",
      "Purchase order or requisition records covering the audited period.",
      "The approval record relied on for any conclusion about authorisation.",
      "The quotation or tender evidence for any purchase assessed against a competition requirement.",
      "The underlying order records for any group of purchases described as potentially split.",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "audit_methodology",
      "overall_risk_rating",
      "key_metric_card",
      "table",
      "finding_card",
      "control_weakness",
      "control_recommendation",
      "management_question",
      "limitation_box",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "For purchases awarded without competition, what waiver was granted and by whom?",
      "Which groups of related orders would have crossed an approval level if aggregated, and what explains their sequencing?",
      "How much of the period's spend bypassed procurement entirely via cards, expenses or direct invoices?",
      "Where approval post-dates the commitment, was the goods or service already contracted before authority existed?",
      "Which delegations of authority were active during the period, and were they documented before use?",
    ],
    relevantIntegrations: ["coupa", "netsuite", "sap", "dynamics365", "oracle_fusion", "ramp", "brex", "expensify"],
    tags: ["procurement", "authorisation", "split-purchases", "policy-compliance", "maverick-spend"],
  },
  {
    slug: "duplicate-supplier-audit",
    name: "Duplicate supplier audit",
    category: "suppliers",
    subcategory: "Master data",
    description:
      "Identifies the same commercial counterparty existing more than once in the supplier master, and assesses what that duplication costs in control, spend visibility and payment risk.",
    defaultTitle: "Duplicate supplier audit",
    auditDescription:
      "Examines the supplier master for records that represent the same real-world entity, evaluates why the duplication arose, and quantifies its effect on spend visibility and payment control.",
    instructions: `You are looking for one real supplier occupying two or more records. This is a master data audit with a fraud edge: most duplication is administrative sloppiness, but a deliberate duplicate is one of the cleanest ways to route payments around a control, so treat both readings seriously and let the evidence choose.

Work across identifiers rather than any single one. Compare supplier names after normalising for legal suffixes, punctuation, spacing, abbreviations, ampersands and transliteration — "Northgate Ltd", "Northgate Limited" and "NORTHGATE LTD." are the easy case. Then compare the identifiers that people rarely think to vary: tax or VAT registration numbers, company registration numbers, bank account and IBAN, remittance email, phone number, and street address normalised for formatting. Records that share a bank account but nothing else are far more interesting than records that share a name but nothing else, and you should say why.

Then look for near-misses that are not clerical at all: a second record created shortly before a large payment; a record whose only difference from an existing one is the bank account; a record created and used once then left dormant; a duplicate created by a user who also approved payments against it. Examine creation dates, creating users and the first transaction on each record together — the sequence often carries more meaning than the similarity score.

Quantify the consequence, do not just count pairs. For each duplicate group show the spend split across the records, whether payment terms or approval routing differ between them, whether the same invoice was ever paid on both, and whether the split pushed individual records below a level at which review would have occurred. Spend visibility loss is a real finding even where no payment error resulted.

Ask the user what materiality basis to apply to the spend affected; if they do not give one, form a judgement from the population, state it in one sentence, and label it as judgement.

Weigh innocent explanations before concluding. Distinct legal entities under a common parent share names and addresses; a supplier that changed bank or moved office legitimately produces a second record where the process forbids editing; separate records may be maintained per subsidiary, currency or payment method. Say which explanation you tested for each group.

Cite each candidate record by its supplier ID and source row, and each supporting transaction by its reference. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information — matched records are candidates for confirmation, never proven duplicates on similarity alone. Recommend merge, block or investigation per group with a named owner. This review informs but does not replace sign-off by a licensed professional.`,
    recommendedInputs: [
      {
        name: "Supplier master listing",
        description:
          "The full supplier master including inactive records, with names, tax and registration numbers, addresses, bank details, contacts, status and creation dates.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Supplier spend by record",
        description: "Invoice and payment totals by supplier record for the period, to quantify the spend affected by each duplicate group.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Supplier creation and change log",
        description: "Who created or amended each supplier record and when, including the first transaction posted against it.",
        formats: ["xlsx", "csv", "system audit log"],
        required: false,
      },
      {
        name: "Supplier onboarding policy",
        description: "The organisation's rules for creating suppliers, required verification, and who may approve a new record.",
        formats: ["pdf", "docx", "written text"],
        required: false,
      },
      {
        name: "Group structure or parent-subsidiary mapping",
        description: "Known related legal entities, so genuinely distinct group companies are not reported as duplicates.",
        formats: ["xlsx", "pdf", "written text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The supplier master extract including inactive records, identified by extract date and source system.",
      "The specific fields matched (name, tax number, bank account, address) for every duplicate group reported.",
      "Spend or payment totals per record in each duplicate group.",
      "The creation date and creating user for records flagged as suspicious rather than clerical, where available.",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "audit_methodology",
      "overall_risk_rating",
      "key_metric_card",
      "table",
      "finding_card",
      "data_quality_warning",
      "entity_comparison",
      "control_weakness",
      "recommendation_card",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "For records sharing a bank account but not a name, who created the second record and why?",
      "Which duplicate groups are genuinely distinct legal entities under a common parent, and can that be evidenced?",
      "Does the system permit editing supplier bank details, or does the process force a new record to be created?",
      "Has any invoice been paid against more than one record within the same duplicate group?",
      "Who is accountable for merging or blocking confirmed duplicates, and by when?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sap", "dynamics365", "coupa", "oracle_fusion", "postgres"],
    tags: ["duplicates", "master-data", "supplier-records", "data-quality", "payment-risk"],
  },
  {
    slug: "duplicate-invoice-audit",
    name: "Duplicate invoice audit",
    category: "suppliers",
    subcategory: "Payables",
    description:
      "Finds the same supplier invoice recorded more than once in payables, distinguishing genuine double-entry from legitimate repeat billing, and traces which duplicates reached payment.",
    defaultTitle: "Duplicate invoice audit",
    auditDescription:
      "Examines posted supplier invoices for duplicate recording, assesses how each duplicate entered the ledger, and identifies which were paid, credited or remain open.",
    instructions: `You are auditing the recording of supplier invoices, not the payments made against them. The subject is the ledger entry: has one supplier document been captured twice, and if so, what happened next. Keep that boundary clear, because a duplicate invoice that was caught and credited is a control success story, while one still sitting open is a live overstatement of payables.

Match on combinations rather than one key. Exact matches on supplier plus invoice number plus amount are the trivial tier and you should report them separately, because their prevalence tells you about capture discipline. The valuable work is the near-matches: same supplier and amount with an invoice number that differs by a transposition, a leading zero, a prefix, a suffix, or an added slash; same invoice number and amount posted to two different supplier records; same supplier and invoice number with amounts differing by tax, rounding or currency conversion; same amount and date with a scanned reference that OCR read two ways.

For each candidate, establish provenance. How did each entry arrive — manual keying, OCR capture, EDI feed, an emailed PDF processed twice, a re-sent statement copy? Look at posting dates, posting users and entry channel together. Two entries from different channels days apart is the classic accidental duplicate; two identical manual entries by the same user minutes apart is usually a system retry.

Then trace the outcome of every confirmed duplicate: paid, part-paid, credited, blocked, or still open. Quantify the exposure that remains and the exposure that was recovered. Report separately on duplicates that the organisation's own controls caught, because that evidences whether the control works.

Ask the user for the materiality basis to apply to individual duplicates and to aggregate exposure; if none is given, form a judgement from the invoice population, state the basis in one sentence, and label it as judgement.

Weigh the innocent explanation for each candidate before calling it. Recurring charges of identical value — rent, retainers, subscriptions, standing fees — legitimately repeat with distinct invoice numbers, and sometimes with the same number if the supplier's own numbering is poor. Instalment billing, milestone billing, split-shipment invoicing, and a credit note reversed and reissued all mimic duplication. So does a supplier who genuinely re-issues an invoice after a dispute. Name the explanation you tested for each group.

Cite every candidate to its supplier, invoice number, posting date, amount and source row or document reference. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Recommend recovery, credit or write-back per item and a capture control change per pattern, each with a named owner. This review informs but does not replace sign-off by a licensed professional.`,
    recommendedInputs: [
      {
        name: "Supplier invoice register",
        description:
          "All supplier invoices posted in the period with supplier ID, invoice number, invoice date, posting date, gross and net amount, currency and status.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Payment and credit note records",
        description: "Payments, part-payments and credit notes applied to those invoices, to trace the outcome of each duplicate.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Invoice capture metadata",
        description: "Entry channel, capturing user, OCR confidence or source document reference for each posted invoice.",
        formats: ["xlsx", "csv", "system export"],
        required: false,
      },
      {
        name: "Supplier master listing",
        description: "Supplier records, needed to detect the same invoice posted across two different supplier records.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Recurring charge schedule",
        description: "Known standing charges such as rent, retainers or subscriptions whose repeated equal values are legitimate.",
        formats: ["xlsx", "csv", "written text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The supplier invoice register for the period, identified by extract date and source system.",
      "The matched fields (supplier, invoice number, date, amount) for every duplicate candidate reported.",
      "Payment or credit note status for each confirmed duplicate, evidencing whether exposure remains.",
      "The posting date and capture channel or user for candidates described as a process failure, where available.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "audit_methodology",
      "overall_risk_rating",
      "key_metric_card",
      "transaction_table",
      "finding_card",
      "warning_box",
      "source_citation",
      "control_weakness",
      "recommendation_card",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "For confirmed duplicates still open in payables, when will they be credited and who will action it?",
      "Which duplicates reached payment, and has recovery been sought from the supplier?",
      "Do invoice numbers get normalised at capture, and would that have prevented the near-match duplicates found?",
      "How many duplicates were caught by existing controls versus found only by this review?",
      "Which suppliers routinely re-issue or re-send invoices, and can that be handled at the source?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "sage", "netsuite", "dynamics365", "sap", "coupa", "odoo"],
    tags: ["duplicates", "invoices", "payables", "capture-controls", "overstatement"],
  },
  {
    slug: "supplier-duplicate-payment-audit",
    name: "Supplier duplicate payment audit",
    category: "suppliers",
    subcategory: "Payments",
    description:
      "Traces cash actually leaving the organisation twice for the same obligation, quantifies unrecovered exposure, and examines the payment controls that allowed it.",
    defaultTitle: "Supplier duplicate payment audit",
    auditDescription:
      "Examines outgoing supplier payments for the same liability settled more than once, reconciles against bank records, and assesses recovery status and payment control design.",
    instructions: `You are auditing money that left the bank, which is what separates this review from a duplicate invoice audit. A duplicate invoice is a bookkeeping error; a duplicate payment is cash gone. Your reader is the treasury and AP leadership, who need to know the recoverable amount, the recovered amount, and why the payment run did not stop it.

Work from payments outward, and reconcile to bank rather than trusting the ledger's own payment records. Confirm that each payment you analyse actually cleared, because a cancelled or re-issued payment often appears twice in the ledger and once in the bank — that is a recording artefact, not a duplicate payment, and reporting it as one destroys your credibility.

Match on several axes. Same supplier, same amount, same or near date is the starting point. Then extend: same invoice reference settled through two different payment runs; the same liability paid once by BACS or ACH and once by manual transfer, card or cheque; the same amount paid to two supplier records that resolve to the same bank account; a payment made against an invoice that had already been settled by a credit note offset or a payment on account. Manual and off-cycle payments deserve disproportionate attention — they bypass the batch-level duplicate checks that catch the ordinary case.

Look at the mechanism, not only the instance. Cluster findings by how they occurred: a run executed twice, an invoice re-entered then paid on both entries, a payment made outside the run while the invoice stayed open in it, a supplier chasing an already-paid invoice and being paid again, or a supplier with two records. Each mechanism implies a different control and owner.

Then trace recovery for every confirmed duplicate: refunded, offset against later invoices, credited, written off, or unrecovered and unremarked. Aged unrecovered duplicates are the sharpest finding here — quantify them and state how long they have sat.

Ask the user what materiality basis applies to individual and aggregate exposure; if none is given, judge from the payment population, state the basis in one sentence, and label it as judgement.

Weigh innocent explanations first: legitimately identical recurring payments such as rent or standing retainers, instalments of equal value, a payment plus a genuinely separate deposit, a reversed and reissued payment, and intercompany settlements. Say which you tested for each cluster.

Cite each payment to its date, amount, method, reference, supplier record and bank line. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Recommend recovery action per item and a control change per mechanism, each with a named owner and a date. This review informs but does not replace sign-off by a licensed professional.`,
    recommendedInputs: [
      {
        name: "Supplier payment register",
        description:
          "All outgoing supplier payments in the period with date, amount, currency, method, payment run reference, supplier record and invoices settled.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Bank statements or transaction feed",
        description: "Cleared bank transactions for the paying accounts, to confirm which payments actually left and which were cancelled.",
        formats: ["csv", "pdf", "MT940", "CAMT.053", "bank feed"],
        required: true,
      },
      {
        name: "Supplier invoice register",
        description: "The invoices those payments were applied to, including status, so a payment can be tied to its obligation.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Supplier master with bank details",
        description: "Supplier records and their bank accounts, to detect the same account paid via two different supplier records.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Credit notes and refunds received",
        description: "Credits, refunds and offsets from suppliers, used to establish which duplicates have already been recovered.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Payment run and approval log",
        description: "Who released each run or manual payment and when, including off-cycle and emergency payments.",
        formats: ["xlsx", "csv", "system export"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The supplier payment register for the period, identified by extract date and source system.",
      "Bank records confirming that each payment reported as duplicated actually cleared.",
      "The invoice or obligation each duplicated payment was applied to.",
      "The recovery status (refund, offset, credit or none) of every confirmed duplicate payment.",
      "The payment method and run reference for payments described as bypassing the standard run.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "overall_risk_rating",
      "key_metric_card",
      "transaction_table",
      "reconciliation_table",
      "finding_card",
      "risk_highlight",
      "root_cause_analysis",
      "control_weakness",
      "action_plan",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "What is the total unrecovered duplicate payment exposure, and how long has the oldest item been outstanding?",
      "Which duplicates arose from manual or off-cycle payments made outside the standard payment run?",
      "Does the payment run block an invoice reference that has already been settled, and was that control active all period?",
      "Have suppliers been formally asked to refund, or is recovery relying on future offsets?",
      "Who approved the off-cycle payments involved, and was that approval within their authority?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sap", "dynamics365", "plaid", "bank_sftp", "oracle_fusion"],
    tags: ["duplicate-payments", "cash-loss", "recovery", "payment-controls", "bank-reconciliation"],
  },
  {
    slug: "supplier-master-data-audit",
    name: "Supplier master data audit",
    category: "suppliers",
    subcategory: "Master data",
    description:
      "Assesses the quality, completeness and governance of supplier records themselves — who can create them, what verification happens, what changes are logged, and where the data is simply wrong.",
    defaultTitle: "Supplier master data audit",
    auditDescription:
      "Reviews the supplier master for completeness, accuracy, validity and change control, and evaluates whether creation and amendment of supplier records is adequately governed.",
    instructions: `You are auditing the supplier master as an asset and a control point. Not the spend, not the invoices — the records themselves and the governance around them. Bad master data is where duplicate payments, misdirected funds and invisible spend all begin, so frame findings in terms of what the weakness enables, not merely that a field is blank.

Start with completeness and validity, field by field. Which records lack a tax or registration number, a verified bank account, an address, a category, a payment term, or an internal owner? Test validity, not just presence: registration numbers that do not match the expected format for their jurisdiction, bank details whose format is wrong for the country, addresses that are a PO box or a residential address for a supplier billing as a corporation, contact emails on free webmail domains for suppliers of significant size, and dates that are impossible or default values.

Then test the population's hygiene. How many records are dormant with no transaction for a long period, and are they blocked or still payable? How many were created and never used? Is status maintained, or is everything "active" by default? Duplication is in scope only as a data-quality symptom — quantify it, and defer pair analysis to a dedicated duplicate review.

Governance is the sharper half of this audit. Examine who can create and amend supplier records, whether that population is appropriate, and whether creation authority is segregated from invoice approval and payment release. Look at the change log: are amendments recorded with user, timestamp and before/after values? Are bank detail changes subject to independent verification, and is that verification evidenced rather than asserted? Look for records created and transacted on the same day, records created by users who also approved the first payment, and records amended shortly before a payment run.

On thresholds, use the organisation's own onboarding policy to define what "complete" means. If no policy exists, say so and describe the gaps against a reasonable expectation you state explicitly and label as judgement. Ask the user which fields they consider mandatory before you score completeness.

Weigh innocent explanations: migrations from legacy systems legitimately leave sparse historical records; one-time suppliers may never need full onboarding; sole traders genuinely have residential addresses and personal emails; some jurisdictions do not issue the identifiers you expect. Say which you considered.

Cite every deficiency to the supplier ID and source row, and every governance conclusion to the change log entry or policy clause relied on. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Recommend remediation grouped by root cause with a named owner. This review informs but does not replace sign-off by a licensed professional.`,
    recommendedInputs: [
      {
        name: "Supplier master listing",
        description:
          "The complete supplier master including inactive and blocked records, with every field: identifiers, bank details, addresses, contacts, terms, category, status and owner.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Supplier change audit log",
        description: "Creations and amendments with user, timestamp, field changed and before/after values, especially for bank details.",
        formats: ["xlsx", "csv", "system audit log"],
        required: true,
      },
      {
        name: "Supplier onboarding policy",
        description: "The organisation's required fields, verification steps, approval route and periodic review expectations for supplier records.",
        formats: ["pdf", "docx", "written text"],
        required: false,
      },
      {
        name: "User access and role assignments",
        description: "Who holds create and amend rights on supplier records, and which of them also approve invoices or release payments.",
        formats: ["xlsx", "csv", "system export"],
        required: false,
      },
      {
        name: "Supplier transaction summary",
        description: "Last transaction date and period spend per supplier record, to identify dormant and never-used records.",
        formats: ["xlsx", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The full supplier master extract including inactive records, identified by extract date and source system.",
      "The specific fields and records evidencing any completeness or validity deficiency reported.",
      "The change log entries supporting any conclusion about amendment control, or an explicit note that no log was available.",
      "The onboarding policy or the stated expectation used to define completeness, where compliance is assessed.",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "overall_risk_rating",
      "data_quality_warning",
      "key_metric_card",
      "table",
      "heatmap",
      "finding_card",
      "control_weakness",
      "control_recommendation",
      "limitation_box",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Which users can both create a supplier record and approve or release a payment to it?",
      "Are bank detail changes independently verified with the supplier through a channel other than the one requesting the change?",
      "Which dormant supplier records remain open for payment, and why are they not blocked?",
      "Which records were created and transacted against on the same day, and who authorised them?",
      "What is the plan to remediate records missing mandatory fields, and who owns it?",
    ],
    relevantIntegrations: ["netsuite", "sap", "dynamics365", "oracle_fusion", "coupa", "quickbooks", "xero", "postgres"],
    tags: ["master-data", "data-quality", "change-control", "segregation-of-duties", "onboarding"],
  },
  {
    slug: "purchase-order-compliance-audit",
    name: "Purchase order compliance audit",
    category: "suppliers",
    subcategory: "Procurement",
    description:
      "Tests whether spend that should have been pre-authorised by a purchase order actually was, and whether the POs raised were valid, timely and within the authority of the person who raised them.",
    defaultTitle: "Purchase order compliance audit",
    auditDescription:
      "Examines purchase order coverage and validity — no-PO invoices, retrospective POs, PO value breaches and PO amendments — to test whether commitment control operates as designed.",
    instructions: `You are auditing the purchase order as a commitment control. The point of a PO is that authority is granted before the organisation is obligated; your job is to test whether that sequence actually held. Your reader is the procurement and finance leadership, and the finding they care about is not "POs are missing" but "the organisation committed money before anyone with authority agreed to it."

Establish the PO policy first — which categories require a PO, which are exempt, and the value at which the requirement bites. That policy, not any figure you supply, defines the standard. If it is not provided, say so and report coverage descriptively rather than as compliance.

Then measure coverage honestly. Take the invoice population, exclude categories the policy exempts, and identify invoices with no PO reference, references that do not resolve to a real PO, and references to a PO belonging to a different supplier. Report coverage by value and by count, by category and department — a high coverage rate by count can conceal that the largest purchases are the uncovered ones, so present both and comment on the gap.

Sequence is where the real findings live. Compare PO creation date to invoice date, to goods receipt date, and to any contract or order confirmation date. A PO raised after the invoice arrived is a retrospective PO: the paperwork exists but the control did not operate. Quantify retrospective POs separately from missing POs, because management routinely reports the first as compliant.

Then test PO validity: was it raised by someone with authority for that value and category; was it approved before the commitment; was it amended after issue and if so by whom and how much did the value move; is invoiced value creeping beyond the PO value through amendments or tolerance; are POs left open long after delivery, or closed while receipts remain outstanding. Look for POs whose value sits just beneath an approval level the policy names, and for amendments that raise a PO past a level it would not originally have cleared.

For materiality, apply the user's basis if given; otherwise judge from the spend profile, state the basis in one sentence, and label it as judgement.

Weigh innocent explanations: genuine emergencies, utilities and rent that carry no PO by design, framework call-offs invoiced against a blanket PO, intercompany charges, and systems recording the PO reference elsewhere. Say which you tested.

Cite every invoice and PO by number, date, value, supplier and source row. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Recommend control changes with a named owner and a decision required. This review informs but does not replace sign-off by a licensed professional.`,
    recommendedInputs: [
      {
        name: "Purchase order register",
        description:
          "All POs open or raised in the period with number, creation date, approval date, approver, supplier, category, value, amendments and status.",
        formats: ["xlsx", "csv", "procurement system export"],
        required: true,
      },
      {
        name: "Supplier invoice register",
        description: "Invoices posted in the period with supplier, date, value, category, department and the PO reference where present.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "PO policy and exemptions",
        description: "Which spend requires a purchase order, which categories are exempt, and the value at which the requirement applies.",
        formats: ["pdf", "docx", "written text"],
        required: true,
      },
      {
        name: "Goods receipt records",
        description: "Receipt dates and quantities, used to place the PO correctly in the commitment sequence.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Delegation of authority matrix",
        description: "Approval limits by role, value and category, to test whether each PO was raised and approved within authority.",
        formats: ["xlsx", "pdf", "docx"],
        required: false,
      },
      {
        name: "PO amendment log",
        description: "Changes to PO value, quantity or supplier after issue, with the user and timestamp for each change.",
        formats: ["xlsx", "csv", "system export"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The purchase order register for the period, identified by extract date and source system.",
      "The supplier invoice population the coverage rate is calculated against, with its exclusions stated.",
      "The PO policy or exemption list defining which spend required a purchase order.",
      "PO creation and approval dates alongside invoice dates for any item reported as retrospective.",
      "The approval limit relied on for any conclusion that a PO exceeded the raiser's authority.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "audit_methodology",
      "key_metric_card",
      "comparison_card",
      "table",
      "bar_chart",
      "finding_card",
      "control_weakness",
      "control_recommendation",
      "management_question",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "What is PO coverage by value rather than by count, and which categories drive the gap between the two?",
      "How many POs were raised after the invoice date, and are they counted as compliant in management reporting?",
      "Which POs were amended upward after approval, and would the revised value have required a higher approver?",
      "Which POs remain open long after delivery, and what commitment do they still represent?",
      "For no-PO spend, is the exemption documented in policy or has it simply become custom?",
    ],
    relevantIntegrations: ["coupa", "netsuite", "sap", "dynamics365", "oracle_fusion", "cin7", "odoo", "erpnext"],
    tags: ["purchase-orders", "commitment-control", "procurement", "authorisation", "compliance"],
  },
  {
    slug: "three-way-matching-review",
    name: "Three-way matching review",
    category: "suppliers",
    subcategory: "Procurement",
    description:
      "Tests the match between purchase order, goods receipt and supplier invoice — whether it is performed, whether tolerances are appropriate, and what passes through unmatched or force-matched.",
    defaultTitle: "Three-way matching review",
    auditDescription:
      "Reviews the operation of three-way matching across PO, goods receipt and invoice, examining match rates, exceptions, tolerance use and manual overrides.",
    instructions: `You are testing one control: that what was ordered, what arrived, and what was billed agree before payment is authorised. This is narrower than a procurement or PO compliance audit — assume the PO exists and ask whether the match around it works.

Rebuild the match yourself rather than reading the system's match status. Join invoice lines to receipt lines to PO lines and compare each dimension independently: quantity, unit price, extended value, and item. Report the dimensions separately, because they fail for different reasons and land with different owners. Price variances point at contract and master data; quantity variances point at receiving; value-only variances often mean freight, tax or currency rather than a real discrepancy.

Map the population before judging it. How many invoices matched three ways, how many two ways (PO and invoice, no receipt evidence), and how many were paid with no match at all? Which categories and suppliers sit in each bucket? Service purchases legitimately lack a physical receipt and often use a milestone or acceptance record instead — treat that as a distinct route, not an exception.

The exception population is where the audit earns its keep. Examine invoices that failed the match and were paid anyway: who released them, under what authority, and how often does the same user appear? Look at force-matches and overrides, and at receipts entered after the invoice arrived — a receipt keyed to clear a blocked invoice is not evidence that goods arrived, and the timestamps usually reveal it. Look for one supplier repeatedly generating the same exception type, which is a contract problem masquerading as a matching problem.

Tolerances deserve explicit attention. Report the tolerances configured, who set them, when they were last reviewed, and how much value passes within them unreviewed. Do not propose a tolerance figure of your own; describe the exposure the current settings create and ask management to set the appetite. If tolerances are undocumented, that is the finding.

Ask the user what materiality basis applies to variance value. If none is given, judge from the invoice population, state the basis in one sentence, and label it as judgement.

Weigh innocent explanations: partial deliveries, over- or under-shipment within contractual allowance, freight and duty billed separately, rounding on unit conversion, currency movement between order and invoice, and receipts held in a warehouse system not provided to you. Say which you tested.

Cite every exception to its invoice, receipt and PO line references and source rows. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Recommend control and configuration changes with a named owner and a decision management must take. This review informs but does not replace sign-off by a licensed professional.`,
    recommendedInputs: [
      {
        name: "Purchase order lines",
        description: "PO detail at line level with item, quantity ordered, unit price, extended value, currency and supplier.",
        formats: ["xlsx", "csv", "procurement system export"],
        required: true,
      },
      {
        name: "Goods receipt records",
        description: "Receipt lines with PO reference, item, quantity received, receipt date, entering user and any acceptance record.",
        formats: ["xlsx", "csv", "system export"],
        required: true,
      },
      {
        name: "Supplier invoice lines",
        description: "Invoice detail at line level with PO reference, item, quantity billed, unit price, tax, freight and total.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Match exception and override log",
        description: "Invoices that failed the match, the exception type, who overrode or released them and when.",
        formats: ["xlsx", "csv", "system export"],
        required: false,
      },
      {
        name: "Matching tolerance configuration",
        description: "Configured price, quantity and value tolerances, who set them and when they were last reviewed.",
        formats: ["xlsx", "pdf", "system export", "written text"],
        required: false,
      },
      {
        name: "Contract pricing schedule",
        description: "Agreed unit prices and allowances, so price variances can be traced to contract rather than assumed to be errors.",
        formats: ["xlsx", "pdf", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Line-level PO, goods receipt and invoice data for the period, identified by extract date and source system.",
      "The matched line references (PO line, receipt line, invoice line) for every exception reported.",
      "The configured tolerances, or an explicit note that the configuration was not made available.",
      "The override or release record for any invoice reported as paid despite a failed match.",
      "The contracted price relied on where a price variance is attributed to incorrect billing.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "audit_methodology",
      "key_metric_card",
      "variance_card",
      "reconciliation_table",
      "transaction_table",
      "finding_card",
      "control_weakness",
      "root_cause_analysis",
      "control_recommendation",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "How much invoice value was paid within configured tolerance without any human review, and who set that tolerance?",
      "Which users most frequently override failed matches, and is that within their authority?",
      "How many goods receipts were entered after the invoice arrived, and who entered them?",
      "Which suppliers generate repeated price variances, and does the contracted rate match the master data?",
      "For service purchases with no goods receipt, what acceptance evidence substitutes for the third leg of the match?",
    ],
    relevantIntegrations: ["coupa", "netsuite", "sap", "dynamics365", "oracle_fusion", "cin7", "odoo", "erpnext"],
    tags: ["three-way-match", "goods-receipt", "tolerances", "exceptions", "procurement"],
  },
];
