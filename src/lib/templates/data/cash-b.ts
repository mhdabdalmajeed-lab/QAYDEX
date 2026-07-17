import type { AuditTemplateSeed } from "@/lib/templates/types";

export const cashTemplatesB: AuditTemplateSeed[] = [
  {
    slug: "suspicious-transfer-review",
    name: "Suspicious transfer review",
    category: "cash",
    subcategory: "Fraud and irregularity",
    description:
      "Examines bank-to-bank and bank-to-third-party transfers for patterns that are hard to explain by ordinary trading activity, and tests each pattern against innocent explanations before it is reported.",
    defaultTitle: "Suspicious transfer review",
    auditDescription:
      "A targeted review of transfer activity across the organisation's bank and cash accounts for the period, focused on identifying movements whose timing, counterparty, structure, or authorisation trail is inconsistent with the organisation's normal payment behaviour.",
    instructions: `You are reviewing transfer activity for signs of irregularity. A "transfer" here means any movement of funds initiated by the organisation: between its own accounts, to third parties outside the normal purchase-to-pay flow, and any reversal or recall of either.

Begin by building a picture of what normal looks like for this organisation from its own data — not from any external benchmark. Profile transfer activity by counterparty, initiating account, channel (batch payment run, standing order, manual/one-off wire, card, internal sweep), day of week, hour where timestamps exist, and value distribution. Only once you can describe the normal pattern should you name deviations from it.

Then examine the population for structural signals: transfers that were split into several parts that would otherwise have travelled as one; transfers whose narrative or reference is empty, generic, or copied from an unrelated payment; round-value transfers where the surrounding population is not round; transfers made and reversed or recalled shortly afterwards; transfers to a counterparty whose bank details changed shortly before the payment; transfers initiated outside normal working hours or during a period when the usual approver was absent; and transfers to accounts that appear only once in the whole period.

Do not treat any of these as a finding by itself. Each is a question. For every candidate, seek corroboration in a second source before concluding: the ledger posting and the account it hit, an invoice or contract, an approval record, a board or treasury minute, an internal transfer log, or the counterparty's presence in the supplier master. Actively construct and weigh the innocent explanation — a genuine urgent supplier payment, a treasury sweep under a cash pooling arrangement, a payroll top-up, a refund, a bank-initiated correction, a keying error later fixed. Report the candidate only if the innocent explanation fails or cannot be tested.

Cite every material observation to its source: file name, sheet or page, row, date, transaction or reference number, and amount. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information, and never let an unverified hypothesis carry the weight of a conclusion.

You decide what is material here. If the engagement has not told you the materiality basis or the transfer types in scope, ask before concluding rather than assuming, and state the basis you used.

Write for a finance director and an audit committee: measured, specific, and free of insinuation. Describe conduct and evidence, not motive. Where evidence is absent, say what would resolve the question and who holds it. Nothing in this review is a determination of fraud or of legal or regulatory breach; frame conclusions as matters requiring investigation and sign-off by a licensed professional.`,
    recommendedInputs: [
      {
        name: "Bank transaction extract for the period",
        description:
          "All debits and credits across every bank account in scope, with dates, value dates, counterparty names and account identifiers, references, channel, and running balances.",
        formats: ["CSV", "XLSX", "MT940", "CAMT.053", "BAI2"],
        required: true,
      },
      {
        name: "Bank statements as issued",
        description: "Statements as issued by the bank, used to corroborate the extract and confirm nothing was omitted.",
        formats: ["PDF", "CSV"],
        required: true,
      },
      {
        name: "Cash and bank general ledger detail",
        description: "Ledger postings for cash and bank accounts so each transfer can be traced to its accounting treatment.",
        formats: ["CSV", "XLSX", "PDF"],
        required: true,
      },
      {
        name: "Payment authorisation records",
        description: "Approval logs, banking platform audit trails, or signed payment run schedules showing who initiated and who released each payment.",
        formats: ["CSV", "XLSX", "PDF", "screenshot"],
        required: false,
      },
      {
        name: "Supplier and counterparty master data",
        description: "Approved counterparties with bank details and, where available, the change history for those details.",
        formats: ["CSV", "XLSX"],
        required: false,
      },
      {
        name: "Treasury and intercompany policy",
        description: "Written policy covering sweeps, pooling, payment limits, and which transfers are permitted without a purchase document.",
        formats: ["PDF", "DOCX", "text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Complete bank transaction listing for every in-scope account covering the full period without gaps.",
      "Bank statements or an equivalent independent source against which the transaction listing can be corroborated.",
      "Cash and bank ledger detail permitting each transfer to be traced to its posting.",
      "Some record of who initiated and who approved payments, or an explicit statement that no such record exists.",
      "A list of the organisation's own bank accounts so internal transfers can be distinguished from external ones.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "audit_methodology",
      "executive_summary",
      "overall_risk_rating",
      "transaction_table",
      "finding_card",
      "risk_highlight",
      "timeline",
      "source_citation",
      "assumption_box",
      "management_question",
      "recommendation_card",
    ],
    suggestedFollowups: [
      "Who initiated and who released each of the transfers flagged, and were those two people different?",
      "Can management produce the underlying instruction, invoice, or minute for each transfer we could not corroborate?",
      "Were any counterparty bank details changed in the period, and what verification was performed before the change took effect?",
      "Which of these counterparties appear in the approved supplier master, and how were the remainder set up?",
      "Do the recalled or reversed transfers have a documented reason, and was the original error investigated?",
    ],
    relevantIntegrations: ["plaid", "tink", "truelayer", "bank_direct_api", "bank_sftp", "manual_statement", "quickbooks", "xero", "netsuite"],
    tags: ["cash", "transfers", "fraud-risk", "irregularity", "banking"],
  },

  {
    slug: "cash-leakage-investigation",
    name: "Cash leakage investigation",
    category: "cash",
    subcategory: "Value protection",
    description:
      "Investigates where cash is quietly leaving the organisation without a corresponding benefit — duplicate settlements, unclaimed credits, silent price creep, unused services, and revenue that never landed.",
    defaultTitle: "Cash leakage investigation",
    auditDescription:
      "An investigation into avoidable cash outflows and unrealised cash inflows across the period, quantifying leakage by mechanism and tracing each pound or dollar to the transaction that carried it out of the organisation.",
    instructions: `This is not a fraud review. Leakage is mostly ordinary process failure: money that left without buying anything, or money that was earned but never collected. Your job is to find the mechanisms, size them from the evidence, and say which ones are worth fixing.

Work mechanism by mechanism rather than transaction by transaction. On the outflow side, look for: the same obligation settled twice through different routes (a supplier paid by both direct debit and payment run, an expense reimbursed and also charged to a company card); credit notes, rebates, and overpayments sitting unapplied while new invoices are paid gross; recurring subscriptions and service charges still being drawn after the underlying service or headcount ended; unit prices drifting upward against the contracted rate without a documented variation; early-payment discounts available but not taken, and late-payment penalties incurred; and refunds or chargebacks issued without an offsetting original receipt. On the inflow side, look for: settlement from payment processors that does not reconcile to gross takings net of stated fees; deposits recorded in the ledger with no bank counterpart; and receipts posted to suspense and never cleared.

Quantify each mechanism from the data itself. Show your arithmetic — the population you took, the matching logic you applied, what you excluded and why. State whether a figure is a measured amount, an extrapolation from a sample, or an indicative estimate, and never present the three as if they were the same thing.

Before reporting anything as leakage, weigh the innocent explanation. A near-duplicate may be a genuine second delivery, a staged payment, a re-issued invoice after a credit, or the same reference reused by the supplier. A price increase may be contractual indexation. An unreconciled deposit may be timing. Test the alternative against evidence; if it holds, exclude the item and say so.

You decide what is material and worth reporting, based on the evidence and any instruction the organisation has given you. Do not apply a threshold of your own invention. If no materiality basis has been provided, ask for one — and where recurring leakage is small per event but persistent, consider annualised effect rather than event size when explaining why it matters.

Cite every quantified item to file, sheet or page, row, transaction reference, date, and amount. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Where a mechanism is plausible but the data to size it is absent, say exactly which extract would close the gap.

Write for a CFO who will decide what to chase: lead with recoverable amounts and the control change that prevents recurrence, and separate one-off recoveries from run-rate savings. Recoveries and contractual positions must be confirmed by the organisation and its advisers; this review does not determine legal entitlement.`,
    recommendedInputs: [
      {
        name: "Bank transaction extract",
        description: "All bank movements for the period across accounts, cards, and payment processors, with references and counterparties.",
        formats: ["CSV", "XLSX", "MT940", "CAMT.053"],
        required: true,
      },
      {
        name: "Accounts payable transaction detail",
        description: "Invoices, credit notes, and payments by supplier, including invoice numbers, dates, amounts, and payment method.",
        formats: ["CSV", "XLSX"],
        required: true,
      },
      {
        name: "Supplier contracts and rate cards",
        description: "Contracted prices, indexation clauses, discount terms, and service end dates for material suppliers.",
        formats: ["PDF", "DOCX", "XLSX"],
        required: false,
      },
      {
        name: "Corporate card and expense data",
        description: "Card transactions and expense claims, used to detect the same cost settled through two channels.",
        formats: ["CSV", "XLSX"],
        required: false,
      },
      {
        name: "Payment processor settlement reports",
        description: "Gross takings, fees, refunds, chargebacks, and payouts, so settlement can be reconciled to receipts.",
        formats: ["CSV", "XLSX", "PDF"],
        required: false,
      },
      {
        name: "Subscription and recurring charge inventory",
        description: "A list of standing orders, direct debits, and SaaS subscriptions with owner and status.",
        formats: ["CSV", "XLSX", "text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Bank transaction detail covering the whole period for all accounts through which cash left or entered.",
      "Accounts payable detail linking invoices, credit notes, and payments at line level.",
      "Evidence of the agreed price or entitlement for any item reported as an overpayment (contract, rate card, or approved order).",
      "Sufficient reference data to distinguish a genuine repeat obligation from a duplicate settlement.",
      "Processor or receipts data where inflow leakage is in scope.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "key_metric_card",
      "waterfall_chart",
      "finding_card",
      "table",
      "transaction_table",
      "root_cause_analysis",
      "source_citation",
      "assumption_box",
      "limitation_box",
      "action_plan",
    ],
    suggestedFollowups: [
      "Which of the candidate duplicate settlements can the supplier confirm as receipts against a single obligation, and are any still recoverable?",
      "Why were unapplied credit notes not offset before the next payment run — is this a system limitation or a process choice?",
      "Who owns each recurring charge that continued after the service ended, and what triggers cancellation today?",
      "What explains the gap between processor gross takings less stated fees and the amount that reached the bank?",
      "If we annualise the recurring leakage identified, does it change the priority the organisation places on the control fix?",
    ],
    relevantIntegrations: ["plaid", "bank_direct_api", "manual_statement", "quickbooks", "xero", "netsuite", "ramp", "brex", "expensify", "stripe", "adyen"],
    tags: ["cash", "leakage", "duplicate-payments", "recovery", "controls"],
  },

  {
    slug: "beneficiary-risk-review",
    name: "Beneficiary risk review",
    category: "cash",
    subcategory: "Counterparty risk",
    description:
      "Reviews who the organisation actually pays — the beneficiary population behind the bank account — testing for unknown, duplicated, changed, or unusually connected payees.",
    defaultTitle: "Beneficiary risk review",
    auditDescription:
      "A review of the payee population across the organisation's outbound payments for the period, assessing how beneficiaries are established, verified, changed, and retired, and identifying beneficiaries whose legitimacy is not evidenced.",
    instructions: `The subject of this review is the beneficiary, not the payment. Build the payee population from the bank data itself — every distinct beneficiary that received funds in the period — and then ask, for each one, how it came to be payable at all.

Reconcile the bank beneficiary population to the approved supplier or payee master. Three groups matter and should be handled differently. Beneficiaries paid but absent from the master are the highest-value question: establish how they were added at the bank and whether an approval exists. Beneficiaries on the master but never paid are a housekeeping and dormancy issue that becomes a risk if a dormant record can be reactivated silently. Beneficiaries in both should be tested for consistency of name, bank details, and tax or registration identifier between the two systems.

Then examine the population for the relationship signals an experienced reviewer looks for: distinct beneficiary names sharing a bank account number; a beneficiary account matching an employee's payroll account; near-duplicate names differing by punctuation, spacing, legal suffix, or a transposed character; beneficiaries whose registered address matches an employee address or another beneficiary; beneficiaries created and paid within a short window with no intervening approval; and beneficiaries whose bank details were amended shortly before payment. Examine the change history for beneficiary bank details specifically — who requested, who approved, whether the two were the same person, and what independent verification (callback to a known number, not a number on the request) was performed.

None of these signals is a conclusion. Shared bank accounts occur legitimately in factoring, group structures, agency arrangements, and payroll bureaux. Employees are genuinely reimbursed. Name similarity occurs between real affiliates. For each candidate, state the innocent explanation, test it against evidence, and only report where it fails or cannot be tested. Where you cannot test it, report the gap as missing information rather than dressing the hypothesis as a finding.

You decide relevance and materiality from the evidence and the organisation's own instructions. Do not invent a value or count threshold. If the organisation has not told you what beneficiary categories are in scope, or whether related-party payees are expected, ask before concluding.

Cite each beneficiary observation to its sources: bank file and row, master data record identifier, change log entry, and the specific payments concerned with dates and amounts. Label every claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information.

Handle personal data with restraint: name individuals only where necessary to the finding, and describe the control failure rather than accusing a person. Frame recommendations around how beneficiaries are created, verified, amended, and periodically re-attested. This review identifies risk indicators; it is not a sanctions, know-your-customer, or legal determination, and any such conclusion requires a licensed professional.`,
    recommendedInputs: [
      {
        name: "Outbound payment extract with beneficiary detail",
        description: "Every payment made in the period with beneficiary name, account identifier, sort code/IBAN, date, amount, and reference.",
        formats: ["CSV", "XLSX", "MT940", "CAMT.053"],
        required: true,
      },
      {
        name: "Approved supplier / payee master",
        description: "The master record of approved payees including bank details, tax identifier, address, status, and creation date.",
        formats: ["CSV", "XLSX"],
        required: true,
      },
      {
        name: "Beneficiary change log",
        description: "History of additions and amendments to beneficiary bank details, with requester, approver, and timestamps.",
        formats: ["CSV", "XLSX", "PDF"],
        required: false,
      },
      {
        name: "Employee bank and address data",
        description: "Payroll bank details and addresses, used only to test for overlap with the beneficiary population.",
        formats: ["CSV", "XLSX"],
        required: false,
      },
      {
        name: "Related-party and group entity list",
        description: "Known affiliates, subsidiaries, and declared related parties so expected overlaps can be distinguished from unexpected ones.",
        formats: ["CSV", "XLSX", "text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "A complete list of beneficiaries paid in the period, derived from bank data rather than from the ledger alone.",
      "The approved payee master as at the period end, or an explicit statement that no such master is maintained.",
      "Evidence of the verification step applied when a beneficiary is created or its bank details are changed.",
      "Payment-level detail for every beneficiary reported, sufficient to cite dates, amounts, and references.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "overall_risk_rating",
      "supplier_concentration_chart",
      "table",
      "finding_card",
      "risk_highlight",
      "control_weakness",
      "source_citation",
      "missing_evidence_notice",
      "management_question",
      "control_recommendation",
    ],
    suggestedFollowups: [
      "How was each beneficiary that is absent from the payee master established at the bank, and who authorised it?",
      "What independent verification is performed before a beneficiary's bank details are changed, and is the callback made to a previously held number?",
      "Can management explain the beneficiaries sharing a bank account with another beneficiary or with an employee?",
      "When were dormant beneficiary records last reviewed, and can a dormant record be reactivated without a second approval?",
      "Which beneficiaries are related parties, and are those relationships declared and disclosed?",
    ],
    relevantIntegrations: ["plaid", "truelayer", "bank_direct_api", "bank_sftp", "quickbooks", "xero", "netsuite", "coupa", "gusto", "adp"],
    tags: ["cash", "beneficiaries", "payee-master", "counterparty-risk", "controls"],
  },

  {
    slug: "currency-exposure-audit",
    name: "Currency exposure audit",
    category: "cash",
    subcategory: "Treasury risk",
    description:
      "Audits the organisation's foreign currency cash position — balances, flows, translation and transaction exposure, hedging, and the rates actually applied to conversions.",
    defaultTitle: "Currency exposure audit",
    auditDescription:
      "An audit of foreign currency cash holdings and flows for the period, examining net exposure by currency, the mechanics and cost of conversions, hedge coverage, and how exchange differences reached the income statement.",
    instructions: `This audit is about currency, not about cash generally. Anchor everything to the currency dimension: balances by currency, flows by currency, and the difference between exposure the organisation chose and exposure it merely inherited.

Start by reconstructing the position. For each currency, establish opening and closing bank balances in original currency and in the reporting currency, and the rate used for each translation. Confirm the rate source and the rate date against the organisation's stated policy — closing rate for monetary balances, transaction-date or an average rate for flows — and identify where a different rate was actually applied. A translated balance that cannot be reproduced from a stated rate and a stated source is a finding in itself.

Then analyse exposure. Separate structural exposure (recurring revenue in one currency, costs in another) from incidental exposure (a one-off purchase, a delayed settlement). Compute the net position by currency and how it moved through the period, and examine whether the organisation is naturally hedged — whether inflows and outflows in the same currency offset in timing as well as in amount, because a matched annual total with mismatched monthly timing is not a hedge. Where hedges exist, test coverage against the underlying exposure, check that hedge maturities align with the exposure they cover, and identify over-hedging as carefully as under-hedging.

Examine conversion economics closely, because this is where cost hides. For each material conversion, compare the effective rate achieved (amount debited divided by amount credited) against an independent reference rate for the same date, and separate the spread from any explicit fee. Look at whether conversions were batched or fragmented, whether the same currency pair was converted back and forth within a short window, and whether balances are held in a currency with no forthcoming obligation in it.

Finally trace realised and unrealised exchange differences to the ledger and explain the movement in terms of position and rate, not as a residual.

You decide what exposure is material and what warrants a finding. Do not impose a coverage ratio, a spread limit, or a value threshold of your own — the organisation's treasury policy and risk appetite govern that. If the policy has not been provided, ask for it and say what you assumed in its absence.

Cite each figure to its source: statement file and page, transaction row, rate source and date, and ledger reference. Label every claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information, and be explicit when a rate is one you sourced rather than one the organisation used.

Write for a treasurer and a CFO. Be precise about direction — say which way the organisation is exposed and what a move against it costs. Do not forecast rates. Nothing here is hedge accounting advice or a determination of accounting treatment; that requires a licensed professional.`,
    recommendedInputs: [
      {
        name: "Bank balances and transactions by currency",
        description: "Opening and closing balances and all movements per account in original currency, with value dates.",
        formats: ["CSV", "XLSX", "MT940", "CAMT.053"],
        required: true,
      },
      {
        name: "Foreign exchange conversion records",
        description: "Each conversion showing amount sold, amount bought, effective rate, fees, date, and counterparty.",
        formats: ["CSV", "XLSX", "PDF"],
        required: true,
      },
      {
        name: "Exchange rate table used for reporting",
        description: "The closing and average rates applied, with their source and effective dates.",
        formats: ["CSV", "XLSX", "PDF"],
        required: true,
      },
      {
        name: "Treasury / FX policy",
        description: "Stated policy on which exposures are hedged, permitted instruments, rate sources, and approval limits.",
        formats: ["PDF", "DOCX", "text"],
        required: false,
      },
      {
        name: "Hedge instrument schedule",
        description: "Forwards, options, and swaps outstanding with notional, currency pair, rate, and maturity.",
        formats: ["CSV", "XLSX", "PDF"],
        required: false,
      },
      {
        name: "Ledger detail for exchange gains and losses",
        description: "Realised and unrealised FX postings so differences can be traced and explained.",
        formats: ["CSV", "XLSX"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Bank balances and movements stated in original currency for every foreign currency account in scope.",
      "The exchange rates applied for translation, together with their source and date.",
      "Conversion-level detail sufficient to compute the effective rate achieved on each material conversion.",
      "Ledger postings for realised and unrealised exchange differences.",
      "The treasury or FX policy, or an explicit statement that none exists.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "key_metric_card",
      "entity_comparison",
      "line_chart",
      "table",
      "variance_card",
      "finding_card",
      "risk_highlight",
      "source_citation",
      "assumption_box",
      "recommendation_card",
    ],
    suggestedFollowups: [
      "Which currency exposures are deliberate and which arose by default from where customers and suppliers happen to sit?",
      "What rate source and rate date does policy require, and can each translated balance be reproduced from it?",
      "Why were balances converted back and forth in the same currency pair within the period — was there an operational reason?",
      "Do hedge maturities line up with the timing of the underlying flows, or only with their annual totals?",
      "What spread over the reference rate is the organisation accepting, and has it ever been negotiated or tendered?",
    ],
    relevantIntegrations: ["plaid", "tink", "truelayer", "bank_direct_api", "bank_sftp", "netsuite", "dynamics365", "sap", "xero", "snowflake"],
    tags: ["cash", "currency", "treasury", "fx", "hedging"],
  },

  {
    slug: "treasury-control-audit",
    name: "Treasury control audit",
    category: "cash",
    subcategory: "Treasury governance",
    description:
      "Audits the treasury control environment — mandates, delegated authority, segregation of duties, banking platform entitlements, and whether the controls described on paper are the controls the data shows.",
    defaultTitle: "Treasury control audit",
    auditDescription:
      "An audit of how treasury activity is governed and controlled, testing bank mandates, authority limits, system entitlements, and key-person dependency against the actual record of who did what during the period.",
    instructions: `This audit tests the control environment around treasury, not the individual transactions. The central technique is confrontation: take the control as described in policy, then take the record of what actually happened, and report where the two diverge. A policy that is not observable in the data is not a control.

Cover four layers. First, mandates and authority: obtain the bank mandates for every account and compare the named signatories and limits against current employees, against the delegated authority matrix, and against each other. Leavers still holding a mandate, limits at the bank that exceed the internal matrix, and accounts whose mandate cannot be produced are each distinct issues — do not merge them.

Second, entitlements in the banking and treasury platforms: reconcile the entitlement report to the mandate and to the authority matrix. Test whether the same identity can create a beneficiary and release a payment, whether a maker can approve their own instruction, whether administrator rights are held by people who also transact, and whether shared or generic logins exist. Where dual authorisation is claimed, verify from the audit trail that two distinct identities were involved and that the second was not a rubber stamp applied seconds after the first.

Third, operation: test whether the controls actually fired. Sample the period's activity and follow it through — was an out-of-limit payment stopped, was a mandate change evidenced, was an override logged with a reason. Look for the tell-tale pattern of controls bypassed under pressure: month-end urgency, absence cover, a system outage.

Fourth, resilience and key-person risk: identify where a single individual can move funds unaided, holds the only credential, or is the only person who understands a process, and what happens in their absence.

Weigh the innocent explanation before reporting. A leaver on a mandate may reflect bank processing lag rather than internal failure. A single approver may be a documented, time-limited exception. Test it; if it holds, say so.

You judge severity from the evidence and from the organisation's own risk appetite and instructions. Do not import a control framework's numeric expectations or invent limits — where you compare against a framework, name it and attribute it as context, not as a rule you applied.

Cite each control observation to its evidence: mandate document and page, entitlement report row, authority matrix version, audit trail entry with timestamp and user identifier, and the transactions concerned. Label every claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information.

Write for an audit committee and a head of treasury. State the exposure a weakness creates in plain terms — what could happen and how much could move — rather than citing the deficiency abstractly. Recommend the smallest change that closes the gap, and distinguish what can be fixed internally from what requires the bank. This is not an assurance opinion or a compliance certification; sign-off rests with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Bank mandates and account signatory lists",
        description: "Current mandates for every bank account showing authorised signatories, limits, and effective dates.",
        formats: ["PDF", "XLSX", "scan"],
        required: true,
      },
      {
        name: "Delegated authority matrix",
        description: "The internal policy setting who may approve what value of payment, and under which conditions.",
        formats: ["PDF", "DOCX", "XLSX"],
        required: true,
      },
      {
        name: "Banking platform entitlement report",
        description: "User entitlements and roles in each banking or treasury platform, including administrators.",
        formats: ["CSV", "XLSX", "PDF"],
        required: true,
      },
      {
        name: "Payment audit trail for the period",
        description: "Maker/checker records with user identifiers and timestamps for created, approved, rejected, and released payments.",
        formats: ["CSV", "XLSX", "PDF"],
        required: false,
      },
      {
        name: "Employee roster with joiners and leavers",
        description: "Current staff and movements in the period, to test mandates and entitlements against actual employment.",
        formats: ["CSV", "XLSX"],
        required: false,
      },
      {
        name: "Treasury policy and exception log",
        description: "The written policy plus any logged overrides, exceptions, and their approvals.",
        formats: ["PDF", "DOCX", "XLSX", "text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Bank mandates or signatory lists for every account in scope, or an explicit statement that they cannot be produced.",
      "The delegated authority matrix in force during the period, with its version and approval date.",
      "An entitlement or user-access listing for each banking or treasury platform used.",
      "An audit trail showing who created and who approved payments, sufficient to test segregation of duties.",
      "An employee roster covering the period, including leavers.",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "audit_methodology",
      "overall_risk_rating",
      "control_weakness",
      "risk_matrix",
      "table",
      "finding_card",
      "source_citation",
      "limitation_box",
      "control_recommendation",
      "management_letter_section",
    ],
    suggestedFollowups: [
      "Which individuals hold a bank mandate but are no longer employed, and when was each mandate last reviewed with the bank?",
      "Can any single identity both create a beneficiary and release a payment in any platform, and has that combination ever been exercised?",
      "Where the audit trail shows approval within seconds of creation, what did the approver actually see and check?",
      "Which overrides were exercised in the period, who authorised them, and were they logged with a reason at the time?",
      "If the treasury lead were unavailable for two weeks, which payments could not be made and which controls would lapse?",
    ],
    relevantIntegrations: ["bank_direct_api", "bank_sftp", "plaid", "truelayer", "netsuite", "sap", "dynamics365", "xero", "gusto", "adp"],
    tags: ["cash", "treasury", "controls", "segregation-of-duties", "governance"],
  },

  {
    slug: "cash-concentration-review",
    name: "Cash concentration review",
    category: "cash",
    subcategory: "Structure and counterparty exposure",
    description:
      "Reviews where the organisation's cash actually sits — by bank, entity, currency, and jurisdiction — and what that concentration costs it in counterparty risk, protection limits, and idle balances.",
    defaultTitle: "Cash concentration review",
    auditDescription:
      "A review of the distribution of cash balances across banks, legal entities, currencies, and jurisdictions at points through the period, assessing counterparty concentration, deposit protection, accessibility, and the efficiency of the sweeping and pooling structure.",
    instructions: `This review is about distribution, not quantum. The organisation may hold ample cash and still be badly positioned if it sits in the wrong bank, the wrong entity, or a form it cannot reach in time.

Begin by mapping the estate. Enumerate every account: bank, legal entity, currency, jurisdiction, purpose, whether it is included in a pooling or sweeping structure, and whether it is dormant. Reconcile the estate to the general ledger and to the bank's own account listing; an account known to the bank but absent from the ledger, or vice versa, is a finding before you analyse a single balance.

Then measure concentration along each axis independently, because they behave differently. By banking counterparty: how much of the group's cash depends on a single institution's continued operation, and what would be inaccessible for how long if that institution failed or froze accounts. By legal entity: whether cash sits where the obligations sit, and whether moving it to where it is needed requires a dividend, a loan agreement, withholding tax, or regulatory consent. By jurisdiction: whether balances are trapped by capital controls or local minimum requirements. By currency: cross-reference to obligations denominated in that currency.

Assess protection and accessibility rather than balances alone. Consider deposit protection schemes and how much of each balance falls outside them, security and set-off rights the bank may hold, balances pledged as collateral or subject to a charge, and restricted or escrowed cash that is legally not available. Then look at efficiency: balances idle in non-interest-bearing accounts while the group borrows elsewhere, sweeps configured but not firing, sweeps firing so aggressively that operating accounts go overdrawn and incur fees, and target balances that were set once and never revisited.

Examine the position on several dates through the period, not only at period end. Period-end balances are the ones most likely to have been arranged.

You decide what concentration is excessive. Do not invent a maximum share per bank or a protection coverage target — that judgment belongs to the organisation's treasury policy and board risk appetite. Where policy exists, test against it and cite it. Where it does not, say so, ask for it, and present the exposure factually so the reader can judge.

Cite every balance to statement, page, account identifier, and date, and every structural fact to the pooling agreement, charge document, or bank confirmation that establishes it. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information — in particular, do not assert that cash is trapped or protected without a document that says so.

Write for a treasurer and a board. Present the picture visually and lead with what is unavailable rather than what is held. Deposit protection eligibility, set-off rights, and cross-border restrictions are legal questions on which this review is indicative only; confirm them with the banks and with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Bank account inventory",
        description: "Every account across the group with bank, entity, currency, jurisdiction, purpose, and status.",
        formats: ["CSV", "XLSX", "text"],
        required: true,
      },
      {
        name: "Balance history by account",
        description: "Daily or period-end balances per account across the period, in original and reporting currency.",
        formats: ["CSV", "XLSX", "MT940", "CAMT.053"],
        required: true,
      },
      {
        name: "Cash pooling and sweeping agreements",
        description: "Pooling structures, sweep rules, target balances, and the entities participating.",
        formats: ["PDF", "DOCX", "XLSX"],
        required: false,
      },
      {
        name: "Restricted cash and security schedule",
        description: "Balances pledged, escrowed, charged, or otherwise restricted, with the supporting document reference.",
        formats: ["XLSX", "PDF", "text"],
        required: false,
      },
      {
        name: "Group structure and intercompany funding arrangements",
        description: "Legal entities, ownership, and the agreements permitting cash to move between them.",
        formats: ["PDF", "XLSX", "text"],
        required: false,
      },
      {
        name: "Trial balance cash accounts",
        description: "Ledger cash balances by entity to reconcile against the bank estate.",
        formats: ["CSV", "XLSX", "PDF"],
        required: false,
      },
    ],
    requiredEvidence: [
      "A complete inventory of bank accounts across all in-scope entities, corroborated against the banks' own listings.",
      "Balances per account at multiple dates within the period, not only at period end.",
      "Documentation for any balance described as restricted, pledged, or trapped.",
      "The pooling or sweeping arrangement documentation where such a structure is in place.",
      "Ledger cash balances permitting reconciliation to the bank estate.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "key_metric_card",
      "donut_chart",
      "entity_comparison",
      "table",
      "risk_highlight",
      "finding_card",
      "heatmap",
      "source_citation",
      "limitation_box",
      "recommendation_card",
    ],
    suggestedFollowups: [
      "If the bank holding the largest share of group cash suspended access tomorrow, which obligations could not be met and for how long?",
      "How much of each balance falls outside deposit protection, and has the organisation confirmed eligibility with each bank?",
      "Which balances are legally restricted or pledged, and can management produce the charge or escrow document for each?",
      "Where cash sits in an entity that does not need it, what would it cost in tax, consent, or time to move it?",
      "Are any accounts held with a bank but absent from the ledger, and who reconciles the account estate?",
    ],
    relevantIntegrations: ["plaid", "tink", "truelayer", "bank_direct_api", "bank_sftp", "manual_statement", "netsuite", "sap", "dynamics365", "snowflake"],
    tags: ["cash", "concentration", "counterparty-risk", "pooling", "treasury"],
  },

  {
    slug: "short-term-solvency-review",
    name: "Short-term solvency review",
    category: "cash",
    subcategory: "Liquidity",
    description:
      "Reviews whether the organisation can meet its obligations as they fall due over the near term, testing committed outflows against realistically available cash and facilities rather than balance-sheet ratios alone.",
    defaultTitle: "Short-term solvency review",
    auditDescription:
      "A review of the organisation's ability to settle liabilities as they fall due over the near term, building a dated obligation profile against available and accessible liquidity, and testing that profile under adverse but plausible conditions.",
    instructions: `Short-term solvency is a timing question, not a ratio question. An organisation with a healthy current ratio can still fail to pay a supplier on Tuesday. Build the answer from dated obligations and dated availability, and use ratios only to summarise afterwards.

Construct the obligation profile first. List what must be paid and when: trade payables by due date rather than by invoice date, payroll and associated taxes with their statutory dates, tax and duty payments, rent and lease instalments, debt service including interest and any amortisation, and known committed capital spend. Distinguish contractual obligations from discretionary ones, because only the discretionary ones can flex. Note where payables are already past due — an aged payables profile that has been quietly stretching is one of the most reliable early signals, and you should look for it explicitly by comparing the aging at several dates rather than only at period end.

Then construct the availability profile, and be strict about it. Available cash is cash the organisation can actually spend: exclude restricted, escrowed, pledged, and trapped balances, and exclude cash in an entity that cannot lawfully or practically remit it to where the obligation sits. Add undrawn committed facilities only where the facility is committed rather than on demand, and only after testing headroom against covenants — a facility whose drawing would breach a covenant is not liquidity. Add expected receipts only where they are supported: contracted, invoiced, and consistent with actual collection behaviour observed in the data, not the collection behaviour assumed in the forecast.

Overlay the two profiles and identify the points at which the profile turns negative, how deep, for how long, and what is driving it. Then stress it. Delay collections in line with the worst experience visible in the organisation's own history; remove the largest customer receipt; assume a facility is not renewed; bring forward a contested payment. State each stress and its source of plausibility.

You decide what a comfortable buffer is and what warrants concern, from the evidence and the organisation's instructions. Do not encode a coverage ratio or days-of-cash rule. If the organisation has a stated policy or covenant, test against it and cite it; otherwise present the profile and ask what buffer the board expects.

Cite every obligation and every source of liquidity to its evidence — aged payables row, loan agreement clause and page, facility letter, bank balance and date. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information, and label forecast receipts explicitly as assumptions with their basis.

Write plainly for a CFO and a board. Say when, how much, and what closes the gap. This review does not constitute a going-concern assessment, a solvency opinion, or advice on directors' duties; those require a licensed professional.`,
    recommendedInputs: [
      {
        name: "Aged accounts payable at multiple dates",
        description: "Payables by supplier and due date at period end and at earlier dates, to reveal whether payment terms are stretching.",
        formats: ["CSV", "XLSX", "PDF"],
        required: true,
      },
      {
        name: "Aged accounts receivable and collection history",
        description: "Receivables by customer and due date, plus actual settlement dates so real collection behaviour can be measured.",
        formats: ["CSV", "XLSX", "PDF"],
        required: true,
      },
      {
        name: "Bank balances and available cash by account",
        description: "Balances by account and entity with any restriction, pledge, or trapped status identified.",
        formats: ["CSV", "XLSX", "MT940"],
        required: true,
      },
      {
        name: "Debt and facility agreements",
        description: "Loan agreements, facility letters, and covenant schedules with maturity, headroom, and drawing conditions.",
        formats: ["PDF", "DOCX", "XLSX"],
        required: false,
      },
      {
        name: "Payroll and tax payment calendar",
        description: "Committed payroll runs, statutory contributions, and tax due dates for the horizon under review.",
        formats: ["XLSX", "CSV", "PDF"],
        required: false,
      },
      {
        name: "Short-term cash forecast",
        description: "Management's own rolling forecast, so its assumptions can be tested against observed behaviour.",
        formats: ["XLSX", "CSV"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Aged payables with due dates, at more than one date so trend in payment behaviour can be observed.",
      "Aged receivables together with actual settlement history for the period.",
      "Bank balances by account and entity, with restrictions identified.",
      "Facility documentation for any undrawn facility counted as available liquidity, including covenant terms.",
      "The calendar of committed payroll, tax, and debt service obligations for the horizon under review.",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "executive_summary",
      "overall_risk_rating",
      "key_metric_card",
      "cash_flow_visualization",
      "line_chart",
      "aging_table",
      "financial_ratio_card",
      "finding_card",
      "assumption_box",
      "source_citation",
      "limitation_box",
      "action_plan",
    ],
    suggestedFollowups: [
      "Has the aged payables profile stretched over recent periods, and is that a deliberate working-capital decision or a symptom?",
      "Which undrawn facilities are genuinely committed, and would drawing them breach any covenant at the next test date?",
      "How does management's forecast collection rate compare with the collection behaviour actually observed in the ledger?",
      "Which balances counted as available are restricted, pledged, or sitting in an entity that cannot remit them?",
      "If the largest expected receipt slipped by a month, on which date would the organisation first be unable to pay, and what would give first?",
    ],
    relevantIntegrations: ["plaid", "bank_direct_api", "manual_statement", "quickbooks", "xero", "netsuite", "dynamics365", "sage", "snowflake"],
    tags: ["cash", "liquidity", "solvency", "working-capital", "forecasting"],
  },

  {
    slug: "bank-fee-audit",
    name: "Bank fee audit",
    category: "cash",
    subcategory: "Cost assurance",
    description:
      "Audits what the banks actually charged — per-item fees, maintenance charges, FX spreads, interest, and penalties — against the agreed tariff, and recomputes charges from the underlying activity.",
    defaultTitle: "Bank fee audit",
    auditDescription:
      "An audit of banking charges incurred during the period, recomputing fees from transaction volumes and the contracted tariff, identifying billing errors and avoidable charges, and assessing whether the fee structure matches how the organisation actually banks.",
    instructions: `The discipline of this audit is recomputation. Do not review bank charges by inspecting them for reasonableness — rebuild what the charge should have been from the tariff and the underlying activity, and explain the difference.

Start by extracting the fee population. Bank charges hide in three places: itemised on the fee statement or analysis, netted inside a transaction so that the amount credited is less than the amount sent, and embedded in an exchange rate spread that appears nowhere as a fee. Capture all three. Netted and embedded charges are usually the larger number and the one management has never seen.

Then obtain the tariff — the pricing schedule, negotiated rate card, or facility letter — and note its effective dates and any volume tiers or bundled allowances. Recompute charges category by category: per-item transaction fees against the count of items actually processed by type and channel; account maintenance against the accounts open and their duration; payment charges by rail, distinguishing domestic, SEPA, and international, and identifying charge-bearer settings (whose side paid the correspondent fee); interest charged against the balance and the rate that should have applied, checking the day-count convention and the compounding; and unauthorised overdraft, returned item, and stop-payment penalties.

Compare recomputed to charged and analyse each difference. Some will be tariff breaches — a rate applied that is not the contracted rate, a tier not honoured, an allowance not applied, a fee for a service not received, a charge continuing on a closed account. Some will be avoidable behaviour rather than bank error — payments sent by the expensive rail when a cheap one would have done, accounts kept open with no purpose, overdraft interest incurred while another account of the same group held a positive balance, and conversions done on the bank's spot spread rather than a dealt rate.

Weigh the innocent explanation: an apparent overcharge may reflect a tariff amendment you have not been shown, a service used once, or a timing difference between the charge and the activity that caused it. Ask before asserting a billing error.

You decide which differences are material and worth pursuing, from the evidence and the organisation's instructions. Do not set your own threshold for what counts as an overcharge worth reporting. Where a difference is small per item but occurs on every item, consider annualised effect and say so.

Cite each recomputation to its inputs: fee statement page and line, tariff clause and page, the transaction count and the source it came from, dates, and amounts. Show the calculation so the bank's relationship manager can follow it. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information.

Write for a treasurer preparing to go back to the bank: quantify by category, rank by recoverable amount, and separate what to reclaim from what to renegotiate from what to change internally. Contractual entitlement to a refund is a legal question this audit does not determine; confirm with the bank and a licensed professional.`,
    recommendedInputs: [
      {
        name: "Bank fee statements or account analysis",
        description: "Itemised charge statements per account for the period, ideally in the bank's analysis format.",
        formats: ["PDF", "CSV", "XLSX", "CAMT.086"],
        required: true,
      },
      {
        name: "Contracted tariff or pricing schedule",
        description: "The agreed rate card, negotiated pricing, tiers, allowances, and effective dates.",
        formats: ["PDF", "DOCX", "XLSX"],
        required: true,
      },
      {
        name: "Bank transaction detail for the period",
        description: "All items processed, by type, channel, and rail, so per-item fees can be recomputed from actual volumes.",
        formats: ["CSV", "XLSX", "MT940", "CAMT.053"],
        required: true,
      },
      {
        name: "Daily balance history",
        description: "Balances by account and day, to recompute interest and identify offsettable overdraft positions.",
        formats: ["CSV", "XLSX"],
        required: false,
      },
      {
        name: "FX conversion records",
        description: "Conversions with amounts sent and received, so the embedded spread can be separated and quantified.",
        formats: ["CSV", "XLSX", "PDF"],
        required: false,
      },
      {
        name: "Ledger detail for bank charges",
        description: "The account used for bank charges, to reconcile the fee population to what was booked.",
        formats: ["CSV", "XLSX"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Itemised bank charge statements covering every account and every month of the period.",
      "The contracted tariff in force, with effective dates, or an explicit statement that pricing is undocumented.",
      "Transaction detail sufficient to count chargeable items by type and channel.",
      "Balance and rate information where interest or overdraft charges are in scope.",
      "Conversion detail where FX spread is in scope.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "key_metric_card",
      "variance_card",
      "reconciliation_table",
      "bar_chart",
      "finding_card",
      "table",
      "source_citation",
      "assumption_box",
      "recommendation_card",
      "appendix",
    ],
    suggestedFollowups: [
      "Where recomputed fees differ from charged fees, has the bank amended the tariff without notifying the organisation?",
      "Which volume tiers or bundled allowances were earned in the period, and were they actually applied?",
      "Why were payments routed by the more expensive rail, and would the cheaper rail have met the settlement requirement?",
      "What FX spread is embedded in conversions, and has the organisation ever compared it against a dealt-rate arrangement?",
      "Were overdraft charges incurred on one account while another account in the same group held a positive balance, and why is there no offset?",
    ],
    relevantIntegrations: ["bank_sftp", "bank_direct_api", "manual_statement", "plaid", "truelayer", "quickbooks", "xero", "netsuite", "stripe", "adyen"],
    tags: ["cash", "bank-fees", "cost-recovery", "recomputation", "banking"],
  },

  {
    slug: "intercompany-transfer-review",
    name: "Intercompany transfer review",
    category: "cash",
    subcategory: "Group cash movements",
    description:
      "Reviews cash moved between group entities — funding, sweeps, recharges, and settlements — testing that both sides agree, that each movement has a basis, and that transfers are not disguising something else.",
    defaultTitle: "Intercompany transfer review",
    auditDescription:
      "A review of cash transfers between entities within the group during the period, testing bilateral agreement of the intercompany accounts, the documentary basis for each movement, its characterisation as loan, recharge, dividend, or settlement, and the transparency of the resulting balances.",
    instructions: `Intercompany cash is where group reporting most often loses its footing, because a transfer that is clear at the bank can be ambiguous in the accounts of both entities. Test the movement and its two accounting reflections together.

Start with reconciliation. Build the intercompany matrix: for each entity pair, the balance each side reports as owed to or by the other, at period end and at the start. They must agree, and each difference must be explained rather than plugged. Classify differences by cause — genuine timing where cash was in transit at the cut-off, a movement recorded by one side only, the same movement booked at different amounts, an FX translation difference where the pair transacts across currencies, and a movement classified as a loan by one entity and as an expense recharge by the other. The last category matters most: mirror-image classification disagreement means one entity's income statement is wrong. Never accept a "difference" that has been cleared to a suspense or an equity reserve without a documented reason.

Then test the basis for each material movement. Cash moving between entities should rest on something: an intercompany loan agreement with terms, a service agreement supporting a recharge, a board resolution for a dividend or capital contribution, a cash-pooling agreement for an automated sweep, or a purchase document for a genuine trading settlement. Ask specifically what the movement is, because the answer has consequences the entities may not have considered: interest, withholding, thin capitalisation, distributable reserves, and local consent. A transfer described as "funding" with no agreement is a finding.

Look also for what transfers can conceal: circular flows where cash goes out and returns through another entity leaving a revenue or expense behind; movements clustered immediately before a period end that reverse immediately after; transfers routed through a third entity for no operational reason; and balances that only ever grow, which is a loan nobody has agreed to call.

Weigh the innocent explanation — automated sweeps under a pooling agreement legitimately create high-volume circular-looking flows, and cut-off timing genuinely creates differences. Test each before concluding.

You determine materiality and which balances matter, from the evidence and the group's own instructions. Do not apply your own value or ageing threshold to intercompany differences.

Cite every balance and movement to both sides: each entity's ledger, account, and row; the bank transaction with date and reference; and the agreement, resolution, or minute with page. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information.

Write for a group financial controller and the entity finance leads who must act. Be explicit about which entity must adjust and to what. Transfer pricing, withholding tax, distributable reserves, and local company-law consequences are outside this review's determination — flag them for a licensed professional.`,
    recommendedInputs: [
      {
        name: "Intercompany balances by entity pair",
        description: "Each entity's reported receivable from and payable to every other entity, at period start and end.",
        formats: ["CSV", "XLSX", "PDF"],
        required: true,
      },
      {
        name: "Intercompany transaction detail",
        description: "All intercompany postings for the period with date, amount, currency, counterparty entity, and narrative.",
        formats: ["CSV", "XLSX"],
        required: true,
      },
      {
        name: "Bank transactions for group accounts",
        description: "Bank movements across group entities so each intercompany posting can be tied to actual cash.",
        formats: ["CSV", "XLSX", "MT940", "CAMT.053"],
        required: true,
      },
      {
        name: "Intercompany agreements and board resolutions",
        description: "Loan agreements, service/recharge agreements, pooling agreements, and resolutions for dividends or contributions.",
        formats: ["PDF", "DOCX"],
        required: false,
      },
      {
        name: "Group structure chart",
        description: "Legal entities, ownership percentages, functional currencies, and jurisdictions.",
        formats: ["PDF", "XLSX", "text"],
        required: false,
      },
      {
        name: "Recharge and allocation methodology",
        description: "How shared costs are allocated between entities and the basis used in the period.",
        formats: ["XLSX", "DOCX", "PDF", "text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Intercompany balances from both sides of each entity pair, at the same date.",
      "Transaction-level intercompany detail permitting each difference to be explained rather than plugged.",
      "Bank data tying material intercompany postings to actual cash movements.",
      "The agreement, resolution, or pooling document underlying each material transfer, or an explicit statement that none exists.",
      "The group structure, including functional currencies where pairs transact cross-currency.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "entity_comparison",
      "reconciliation_table",
      "pivot_table",
      "finding_card",
      "contradiction_alert",
      "account_movement_visualization",
      "source_citation",
      "missing_evidence_notice",
      "management_question",
      "recommendation_card",
    ],
    suggestedFollowups: [
      "For each entity pair whose balances disagree, which side is wrong and what adjustment is required in that entity's books?",
      "Which intercompany transfers rest on no agreement, resolution, or invoice, and how were they characterised in each entity's accounts?",
      "Are any movements classified as a loan by one entity and as an expense or recharge by the other?",
      "Which intercompany balances have only grown — are they intended to be repaid, and on what terms and timetable?",
      "What explains the transfers concentrated immediately before period end that reversed shortly afterwards?",
    ],
    relevantIntegrations: ["netsuite", "sap", "dynamics365", "oracle_fusion", "xero", "quickbooks", "bank_direct_api", "bank_sftp", "postgres", "snowflake"],
    tags: ["cash", "intercompany", "group", "reconciliation", "transfers"],
  },

  {
    slug: "payment-approval-control-review",
    name: "Payment approval control review",
    category: "cash",
    subcategory: "Payment controls",
    description:
      "Reviews the approval control over outbound payments end to end — from request to release — testing whether authority limits, segregation, and evidence of review actually held for the payments that were made.",
    defaultTitle: "Payment approval control review",
    auditDescription:
      "A review of the approval controls governing outbound payments in the period, tracing payments through request, authorisation, and bank release, and testing limit compliance, segregation of duties, exception handling, and the substance of approval.",
    instructions: `This review follows the payment through its approval chain and asks, at each step, whether the control was applied and whether it meant anything. It is deliberately narrower than a treasury control audit: the unit of analysis is the payment.

Reconstruct the chain for the population. For each payment: who raised the request, on what basis (purchase order, invoice, contract, expense claim, or nothing); who approved it and against what authority; who released it at the bank; when each step occurred; and whether the amount and beneficiary at release matched those at approval. That last test is the one most often skipped and the one that catches the most: an approval given for one amount or one beneficiary and released as another.

Then test limit compliance. Map each payment to the authority band that applied on its date, using the version of the matrix in force then — not the current one. Look for payments approved by someone whose limit did not extend to them, payments approved at a level of authority that was delegated informally, and the specific pattern of payments sitting just inside a band while the underlying obligation exceeded it, which is the signature of splitting. Investigate splitting on its own terms: same beneficiary, same or adjacent dates, same purpose, aggregating above a band.

Test segregation as executed rather than as configured. Requester, approver, and releaser should be distinct identities and distinct people — check for shared credentials, delegation to an assistant, and one person acting through another's login. Where the system permits self-approval under any circumstance, find whether it was ever used.

Test the substance of approval. Approval applied in bulk to a long payment run, or seconds after creation, or outside working hours in a pattern that suggests batching, may be a rubber stamp. Ask what the approver saw. Look at rejections: an approval process that has never rejected anything is not evidencing review.

Handle exceptions explicitly: emergency and manual payments, payments made outside the normal run, and out-of-hours releases. Each should have a documented reason and retrospective approval. Weigh innocent explanations — a genuine urgent payment, an approved standing arrangement, a documented delegation during leave — and test them before reporting.

You judge which failures matter and how severely, from the evidence and the organisation's instructions. Do not invent authority limits, an acceptable exception rate, or a value threshold; test against the organisation's own matrix and, where it is silent or contradictory, say so and ask.

Cite each tested payment to its evidence: payment reference, date, amount, beneficiary, approval record with user identifier and timestamp, matrix version and clause, and the bank release record. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information, and state your sampling basis and coverage.

Write for a financial controller. Describe control failures without accusing individuals, quantify the value that passed through each gap, and recommend the specific configuration or process change that closes it. This is not an assurance opinion; sign-off rests with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Payment register for the period",
        description: "Every outbound payment with date, amount, beneficiary, method, reference, and the run it belonged to.",
        formats: ["CSV", "XLSX"],
        required: true,
      },
      {
        name: "Approval workflow audit trail",
        description: "Requester, approver, releaser, timestamps, actions taken including rejections, and the amount at each step.",
        formats: ["CSV", "XLSX", "PDF"],
        required: true,
      },
      {
        name: "Delegated authority matrix with version history",
        description: "Authority limits by role and value band, with effective dates so the correct version can be applied.",
        formats: ["PDF", "DOCX", "XLSX"],
        required: true,
      },
      {
        name: "Supporting documents for sampled payments",
        description: "Purchase orders, invoices, contracts, or claims underlying the payments selected for testing.",
        formats: ["PDF", "XLSX", "scan"],
        required: false,
      },
      {
        name: "Bank release confirmations",
        description: "Bank-side records showing what was actually released, to compare against what was approved.",
        formats: ["CSV", "XLSX", "PDF", "MT940"],
        required: false,
      },
      {
        name: "Exception and emergency payment log",
        description: "Manual, urgent, and out-of-cycle payments with their stated reason and retrospective approval.",
        formats: ["XLSX", "CSV", "PDF"],
        required: false,
      },
    ],
    requiredEvidence: [
      "A complete payment register for the period, reconcilable to bank outflows.",
      "An approval audit trail identifying distinct users and timestamps for each control step.",
      "The delegated authority matrix versions in force during the period, with effective dates.",
      "Bank-side release evidence permitting comparison of the amount and beneficiary approved against those released.",
      "Supporting documentation for the payments selected for testing.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "audit_methodology",
      "control_weakness",
      "transaction_table",
      "finding_card",
      "table",
      "risk_highlight",
      "source_citation",
      "limitation_box",
      "control_recommendation",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "For payments where the released amount or beneficiary differed from the approved one, who made the change and was it re-approved?",
      "Which payments were approved by someone whose authority limit did not cover them, and how did the system permit it?",
      "Are the payments to the same beneficiary sitting just below an authority band parts of a single larger obligation?",
      "How many payments has the approval process rejected in the period, and if none, what is the approver actually reviewing?",
      "What reason was recorded for each emergency or out-of-cycle payment, and was retrospective approval obtained?",
    ],
    relevantIntegrations: ["bank_direct_api", "bank_sftp", "plaid", "quickbooks", "xero", "netsuite", "sage", "coupa", "ramp", "brex"],
    tags: ["cash", "payments", "approval", "controls", "segregation-of-duties"],
  },

  {
    slug: "outstanding-deposit-review",
    name: "Outstanding deposit review",
    category: "cash",
    subcategory: "Reconciliation items",
    description:
      "Reviews deposits in transit — receipts recorded in the ledger that have not cleared the bank — testing whether each is genuine timing, and whether ageing deposits are concealing something else.",
    defaultTitle: "Outstanding deposit review",
    auditDescription:
      "A review of deposits in transit at the reconciliation date, testing subsequent clearance, ageing, and composition, and distinguishing ordinary timing differences from errors, misposted receipts, or unsupported entries.",
    instructions: `A deposit in transit is a claim: the organisation says it has received money that the bank has not yet confirmed. Most such claims are true and clear within days. This review is about the ones that do not, because an outstanding deposit is one of the easier places to hide a shortfall — a receipt that never existed can sit as "in transit" indefinitely if nobody tests clearance.

Start from the reconciliation itself. Take the deposits-in-transit listing at the reconciliation date and test each item to subsequent clearance in the bank data after the date, matching on amount, date, and reference rather than amount alone, because amount-only matching happily pairs an outstanding deposit with an unrelated later receipt. Record for each item the date it was recorded, the date it cleared, and the elapsed time. Items that have not cleared by the time you review are the population that matters.

Then analyse that population. Profile ageing and ask what a normal clearance interval looks like for this organisation given its receipt channels — a cheque, a card settlement, a foreign wire, and a cash lodgement have genuinely different clearance behaviours, and comparing them against a single expectation produces false findings. Look for items recorded on the last day or two of a period and cleared well into the next, which may be legitimate cut-off or may be a receipt recognised early to flatter a period-end position. Look for round amounts, for items whose narrative is generic, for items recurring at each period end with a similar value, for items cleared and immediately re-raised, and for items written off or reversed without explanation rather than cleared.

For each aged item, seek corroboration outside the reconciliation: the customer remittance advice, the till or lodgement record, the processor settlement report, the deposit slip, the sales ledger allocation. Weigh the innocent explanation — bank holidays, a cheque held pending, a wire in a correspondent chain, a lodgement made after the branch cut-off, an error since corrected. Report only where the explanation fails or cannot be tested, and where it cannot be tested say precisely what document would settle it.

Compare the pattern across periods. A single aged deposit is a housekeeping item; the same balance ageing across successive reconciliations, or a total that never falls, is a different matter and should be characterised as such.

You decide what ageing and what value are material here, from the evidence, the receipt channel, and the organisation's instructions. Do not encode an ageing rule of your own. Ask the organisation what clearance behaviour it expects if it has not told you.

Cite each item to reconciliation file and row, ledger posting reference, the clearing bank transaction with date and amount or the confirmation of its absence, and any corroborating document. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information.

Write for a financial controller who owns the reconciliation. Be careful in tone: most of these items are genuine, and the value of the review is in isolating the few that are not and in fixing why they were not caught sooner. Nothing here determines misappropriation; that requires investigation and a licensed professional.`,
    recommendedInputs: [
      {
        name: "Bank reconciliations for the period",
        description: "Reconciliations per account showing the deposits-in-transit listing with item dates, amounts, and references.",
        formats: ["XLSX", "CSV", "PDF"],
        required: true,
      },
      {
        name: "Bank transactions covering the period and the subsequent window",
        description: "Bank data extending beyond the reconciliation date so subsequent clearance can be tested.",
        formats: ["CSV", "XLSX", "MT940", "CAMT.053"],
        required: true,
      },
      {
        name: "Cash and bank ledger receipts detail",
        description: "Receipt postings with dates, amounts, references, and the customer or source they were allocated to.",
        formats: ["CSV", "XLSX"],
        required: true,
      },
      {
        name: "Remittance advices and deposit records",
        description: "Customer remittances, deposit slips, till lodgement records, or processor settlement reports supporting sampled items.",
        formats: ["PDF", "CSV", "XLSX", "scan"],
        required: false,
      },
      {
        name: "Prior-period reconciliations",
        description: "Earlier reconciliations so recurring or persistently ageing items can be identified.",
        formats: ["XLSX", "PDF"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The deposits-in-transit listing at each reconciliation date in scope, at item level.",
      "Bank transaction data extending sufficiently past the reconciliation date to evidence clearance or its absence.",
      "Ledger receipt postings permitting each in-transit item to be traced to its original entry.",
      "Supporting documentation for the aged items selected for testing, or a statement that it cannot be produced.",
      "At least one prior-period reconciliation to establish whether items recur.",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "reconciliation_table",
      "aging_table",
      "aging_visualization",
      "key_metric_card",
      "finding_card",
      "data_quality_warning",
      "source_citation",
      "missing_evidence_notice",
      "management_question",
      "recommendation_card",
    ],
    suggestedFollowups: [
      "Which deposits in transit had still not cleared by the date of this review, and can management produce the remittance or lodgement record for each?",
      "Do any in-transit items recur at successive period ends with a similar value, and what is the underlying receipt?",
      "How does clearance time differ by receipt channel, and is the reconciliation being reviewed against the right expectation for each?",
      "Were any in-transit items reversed or written off rather than cleared, who approved that, and what was the stated reason?",
      "Who prepares and who independently reviews these reconciliations, and does the reviewer test subsequent clearance or only the arithmetic?",
    ],
    relevantIntegrations: ["plaid", "truelayer", "bank_direct_api", "bank_sftp", "manual_statement", "quickbooks", "xero", "sage", "stripe", "square", "shopify"],
    tags: ["cash", "reconciliation", "deposits-in-transit", "cut-off", "receipts"],
  },

  {
    slug: "bank-statement-completeness-audit",
    name: "Bank statement completeness audit",
    category: "cash",
    subcategory: "Data integrity",
    description:
      "Audits whether the bank data the organisation is auditing is itself complete — every account, every day, every page, every transaction — before any conclusion is drawn from it.",
    defaultTitle: "Bank statement completeness audit",
    auditDescription:
      "An audit of the completeness and integrity of the bank statement population for the period, testing account coverage, date continuity, statement sequencing, balance roll-forward, and agreement between the statements and any derived extract.",
    instructions: `Every other cash audit assumes the bank data is complete. This one tests that assumption, and it must be run without borrowing conclusions from the data whose completeness is in question. Incomplete bank data does not announce itself: it looks exactly like clean data with fewer rows.

Test completeness on four axes.

Account coverage: establish the population of accounts independently of the statements supplied. Sources include the ledger's cash accounts, bank confirmations, the banking platform's own account listing, mandates, interest and fee statements referencing an account, and transfers in the supplied data whose counterparty is an account of the organisation that never appears as a statement. An account that appears as a counterparty but never as a source is the classic tell. Report accounts known to exist for which no statement was provided, and accounts provided that the ledger does not know about.

Date continuity: for each account, confirm the statements span the period end to end with no gap and no overlap. Check statement sequence numbers where the bank issues them and report any break in the series.

Balance roll-forward: this is the strongest test available and it should be performed for every account. The closing balance of each statement must equal the opening balance of the next, and the opening balance plus the sum of movements must equal the closing balance on every statement. A page missing from the middle of a PDF, a truncated export, a filtered download, and a manually edited file all fail this test where a visual review would not. Where an extract was derived from statements — CSV, MT940, CAMT — reconcile item count and value totals between the extract and the statement as issued, per account per month, and report any difference before analysing anything.

Source integrity: assess how the data reached you. Prefer statements obtained directly from the bank or a feed over files that passed through the organisation. Note file provenance, whether PDFs are native or scanned, whether a spreadsheet contains formulas, hidden rows, filters, or manual overwrites, and whether an export's own date range matches what was requested. Flag internal inconsistencies — duplicated rows, out-of-order dates, transactions dated outside the statement period, currency stated inconsistently.

Weigh innocent explanations: a missing account may be closed, a gap may reflect a month with no activity, a sequence break may be a bank's own numbering quirk. Test each and say which held.

You judge which gaps are material and what they mean for reliance. Do not encode a completeness threshold. Be explicit about the consequence: state clearly which subsequent audits can and cannot be relied upon given what is missing, because that is the point of this work.

Cite every gap precisely: account identifier, statement reference and page, date range, expected and actual balances, and counts. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information.

Write for whoever will rely on this data. Lead with the reliance conclusion. This is a data-integrity assessment, not a bank confirmation or an audit opinion on cash; independent confirmation and sign-off require a licensed professional.`,
    recommendedInputs: [
      {
        name: "All bank statements for the period as issued",
        description: "Complete statements per account, every page, covering the full period without gaps.",
        formats: ["PDF", "CSV", "MT940", "CAMT.053", "BAI2"],
        required: true,
      },
      {
        name: "Bank transaction extract",
        description: "Any derived transaction file used for analysis, to be reconciled back to the statements as issued.",
        formats: ["CSV", "XLSX"],
        required: true,
      },
      {
        name: "Ledger cash and bank account listing",
        description: "The chart of accounts entries for cash and bank, used to establish the expected account population.",
        formats: ["CSV", "XLSX", "PDF"],
        required: true,
      },
      {
        name: "Bank confirmations or platform account listing",
        description: "An independent list of accounts held with each institution, including closed and dormant accounts.",
        formats: ["PDF", "CSV", "XLSX"],
        required: false,
      },
      {
        name: "Import and extraction logs",
        description: "Provenance records showing how each file was obtained, by whom, when, and over what date range.",
        formats: ["CSV", "text", "PDF"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Statements for every account claimed to be in scope, covering the full period, with opening and closing balances visible.",
      "An independent source for the expected account population, not derived solely from the statements supplied.",
      "Any derived extract used for analysis, alongside the statements it was derived from, so the two can be reconciled.",
      "Ledger cash account listing for the period.",
      "Provenance information for each file, or an explicit note that provenance is unknown.",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "audit_methodology",
      "data_quality_warning",
      "reconciliation_table",
      "table",
      "missing_evidence_notice",
      "finding_card",
      "timeline",
      "source_citation",
      "limitation_box",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Which accounts appear as an internal counterparty in the supplied data but were never provided as a statement, and why?",
      "For each account where the roll-forward failed, is a page or a date range missing, and can the bank reissue the statement directly?",
      "Where the extract and the statement disagree on item count or value, what transformation was applied between them?",
      "Were any statements or extracts prepared or edited by the organisation rather than obtained directly from the bank?",
      "Given the gaps identified, which cash conclusions drawn from this data should be treated as unsupported until the data is completed?",
    ],
    relevantIntegrations: ["bank_sftp", "bank_direct_api", "plaid", "tink", "truelayer", "manual_statement", "quickbooks", "xero", "sharepoint", "google_drive"],
    tags: ["cash", "completeness", "data-integrity", "bank-statements", "reconciliation"],
  },
];
