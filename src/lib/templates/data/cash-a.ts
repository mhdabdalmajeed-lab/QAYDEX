import type { AuditTemplateSeed } from "@/lib/templates/types";

/**
 * Seeded cash-domain templates, set A (PRD §17.2 "Cash").
 *
 * Each `instructions` block is the audit method itself. None of them encode a threshold, a scoring
 * rule, or a pre-decided finding: materiality, relevance and conclusion are the model's job working
 * from the evidence and the organisation's own instructions (PRD §6.3).
 */
export const cashTemplatesA: AuditTemplateSeed[] = [
  {
    slug: "cash-audit",
    name: "Cash audit",
    category: "cash",
    subcategory: "Core cash assurance",
    description:
      "A broad examination of the organisation's cash and cash-equivalent balances: existence, completeness, ownership, presentation and the controls around movement of funds.",
    defaultTitle: "Cash audit",
    auditDescription:
      "Establish whether reported cash balances exist, are complete, belong to the entity, are available for use, and are supported by independent third-party evidence.",
    instructions: `You are auditing cash and cash equivalents as a whole. Your objective is to form a supported view on five assertions — existence, completeness, rights and ownership, valuation/translation, and presentation — and on the control environment surrounding cash movement.

Begin by building a complete inventory of cash-holding instruments: every bank account, deposit, money-market holding, card float, merchant-acquirer balance, and cash-on-hand location. Compare that inventory to the chart of accounts, to the bank confirmations or statements provided, and to any account list from the accounting system. Accounts that appear in one source but not another are your first line of enquiry — an account in the bank feed with no ledger equivalent may be unrecorded cash; a ledger account with no statement may be closed, dormant, or held at an institution you have not been told about.

For existence, trace each reported balance to independent third-party evidence rather than to an internal report. For completeness, work in the opposite direction: from statements and confirmations back into the ledger. Read the closing-days activity on both sides of period end for movement that lands in the wrong period, and be alert to transfers between the entity's own accounts that are recorded on only one leg — these inflate or deflate consolidated cash without any external transaction.

Assess materiality yourself from the size and nature of the cash balance relative to the entity's operations, its liquidity headroom, and anything the organisation's instructions say about materiality. If no materiality basis has been given and it would change your conclusions, ask the user for one and state that you have done so rather than assuming a figure.

Weigh innocent explanations before concluding. Timing differences, in-transit transfers, acquirer settlement lag, unposted bank charges, and FX revaluation all produce differences that look like errors and are not. Only escalate where the innocent explanation has been considered and does not fit the evidence.

Cite every material finding to its source — file, sheet, page, row, account and transaction reference. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Where evidence is absent, say so explicitly and name what would resolve it; do not substitute inference for confirmation.

Write for a finance director and their auditors: precise, unemotional, ranked by consequence. Recommendations should be specific and actionable. Do not present any conclusion as a regulatory or legal determination — sign-off remains with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Cash and bank general ledger detail",
        description: "Transaction-level ledger activity for every cash and cash-equivalent account across the period.",
        formats: ["CSV", "XLSX", "QuickBooks export", "Xero export"],
        required: true,
      },
      {
        name: "Bank statements for all accounts",
        description: "Complete statements covering the full period, including accounts believed dormant or closed.",
        formats: ["PDF", "CSV", "MT940", "CAMT.053", "BAI2"],
        required: true,
      },
      {
        name: "Trial balance",
        description: "Period-end trial balance so cash lines can be tied to the reported financial position.",
        formats: ["CSV", "XLSX", "PDF"],
        required: true,
      },
      {
        name: "Bank confirmations or account listing",
        description: "Independent confirmation of accounts held, signatories, and balances at period end.",
        formats: ["PDF", "DOCX"],
        required: false,
      },
      {
        name: "Cash handling and banking policy",
        description: "Internal policy covering account opening, authorisation limits, and custody of physical cash.",
        formats: ["PDF", "DOCX", "written text"],
        required: false,
      },
      {
        name: "Cash count sheets",
        description: "Records of physical cash counts at each holding location during or near the period end.",
        formats: ["XLSX", "PDF", "scanned images"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Period-end balance per bank statement or confirmation for each account in scope",
      "Period-end balance per general ledger for each corresponding cash account",
      "Transaction-level cash ledger activity for the period",
      "The entity's list of bank accounts and cash holding locations",
      "Evidence of the closing-days cut-off activity on both bank and ledger sides",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "overall_risk_rating",
      "key_metric_card",
      "reconciliation_table",
      "finding_card",
      "control_weakness",
      "cash_flow_visualization",
      "missing_evidence_notice",
      "recommendation_card",
      "evidence_list",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Are there bank accounts, deposits or merchant balances held by the entity that do not appear in the chart of accounts?",
      "Who currently holds signing authority on each account, and when was that list last reviewed?",
      "What materiality basis should be applied to cash for this engagement?",
      "Which cash balances are legally or contractually unavailable for general operating use?",
      "Was a physical cash count performed at period end, and by whom?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sage", "plaid", "bank_direct_api", "manual_statement"],
    tags: ["cash", "existence", "completeness", "bank", "assurance"],
  },
  {
    slug: "bank-reconciliation-audit",
    name: "Bank reconciliation audit",
    category: "cash",
    subcategory: "Reconciliation",
    description:
      "Tests whether bank reconciliations are mathematically sound, genuinely supported, prepared and reviewed independently, and free of items used to mask differences.",
    defaultTitle: "Bank reconciliation audit",
    auditDescription:
      "Examine the quality, integrity and reviewability of bank reconciliations, and determine whether reconciling items are real, supported, and clearing as expected.",
    instructions: `You are auditing the bank reconciliation process, not the cash balance in isolation. A reconciliation can foot perfectly and still be worthless; your job is to establish whether it is *true*.

Start with the arithmetic and the tie-points. For each account and each period end, confirm that the statement balance, the reconciling items, and the ledger balance actually resolve to one another, and that the ledger figure used matches the ledger itself rather than a re-keyed number. A reconciliation that ties to a number nobody can find in the general ledger is a finding in its own right.

Then dissect the reconciling items — this is where the audit lives. Classify each one: outstanding cheques, deposits in transit, bank charges not yet posted, direct debits not yet recorded, errors awaiting correction, and unexplained plug figures. For each, seek corroboration that it is a real, dated, identifiable transaction, and then test clearance: did it appear on the following period's statement, and when? Items that recur across period ends without clearing deserve particular scrutiny, as does any item whose only description is a balancing label. Watch for the classic patterns: an unexplained difference carried forward month after month, items that offset each other neatly, reconciling items introduced in the closing days and reversed immediately after, and stale outstanding cheques never written back.

Examine preparation and review as a control. Identify who prepared each reconciliation, who reviewed it, when, and whether preparer and reviewer are the same person or the same person who also initiates payments. Assess whether reconciliations were completed close enough to period end to be useful, or produced retrospectively to satisfy the file.

Do not apply an age or size rule of your own to decide what matters. Judge significance from the nature of the item, the pattern it forms, its effect on reported cash, and any materiality or ageing expectation the organisation's own instructions or policy set out. If the policy is unclear and it affects your conclusions, ask.

Consider benign explanations first — genuine acquirer settlement lag, cheque presentation delay, and cross-border value dating all produce long-lived reconciling items legitimately.

Cite each material finding to account, reconciliation date, item reference, and the statement line or ledger row involved. Label every claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Frame recommendations around process and segregation of duties, not blame. Conclusions here are professional observations, not attestations; final sign-off remains with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Completed bank reconciliations",
        description: "The reconciliation working papers for each account and each period end in scope, as prepared.",
        formats: ["XLSX", "PDF", "accounting system reconciliation report"],
        required: true,
      },
      {
        name: "Bank statements",
        description: "Statements covering the period under review plus the subsequent period, to test clearance of items.",
        formats: ["PDF", "CSV", "MT940", "CAMT.053"],
        required: true,
      },
      {
        name: "Cash account ledger detail",
        description: "Ledger transactions for the reconciled accounts, to verify the ledger side of each reconciliation.",
        formats: ["CSV", "XLSX"],
        required: true,
      },
      {
        name: "Reconciliation preparer and reviewer log",
        description: "Who prepared and approved each reconciliation and when, ideally with system timestamps.",
        formats: ["CSV", "XLSX", "PDF", "screenshots"],
        required: false,
      },
      {
        name: "Reconciliation policy",
        description: "Internal standard covering frequency, ageing expectations, and sign-off requirements.",
        formats: ["PDF", "DOCX", "written text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The reconciliation working paper for each account and period end in scope",
      "Bank statement balances at each reconciliation date",
      "General ledger balances at each reconciliation date",
      "The itemised list of reconciling items with dates and descriptions",
      "Subsequent-period bank statements evidencing whether items cleared",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "reconciliation_table",
      "aging_table",
      "finding_card",
      "control_weakness",
      "risk_highlight",
      "table",
      "missing_evidence_notice",
      "control_recommendation",
      "source_citation",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "What is the oldest unresolved reconciling item, and why has it not been cleared or written off?",
      "Is the reviewer of each reconciliation independent of the person who prepares payments?",
      "How many days after period end are reconciliations typically completed and signed?",
      "Are there any accounts with no reconciliation performed at all during the period?",
      "What is the documented policy for writing back stale outstanding cheques?",
    ],
    relevantIntegrations: ["xero", "quickbooks", "netsuite", "sage", "plaid", "bank_sftp", "manual_statement"],
    tags: ["reconciliation", "cash", "controls", "bank", "cut-off"],
  },
  {
    slug: "cash-flow-audit",
    name: "Cash flow audit",
    category: "cash",
    subcategory: "Cash flow",
    description:
      "Examines the composition, quality and internal consistency of operating, investing and financing cash flows, and whether reported cash generation is genuine and repeatable.",
    defaultTitle: "Cash flow audit",
    auditDescription:
      "Assess whether the cash flow statement is internally consistent, correctly classified, and whether the underlying cash generation is durable rather than the product of timing or one-off items.",
    instructions: `You are auditing cash flow: how cash actually moved, how it has been classified, and whether the picture it paints is honest.

Start with the articulation test. The movement in cash across the period must be explained by the sum of operating, investing and financing flows; the reconciliation from profit to operating cash flow must be traceable to real balance-sheet movements. Tie the opening and closing cash to the balance sheet and to the bank evidence. Where the statement is built indirectly, test each adjustment — depreciation, working capital movements, non-cash charges — against the corresponding ledger and balance sheet movement. Differences you cannot articulate are your starting hypotheses, not rounding.

Then interrogate classification, because classification is where cash flow statements are most often shaped rather than reported. Look for operating outflows presented as investing, financing inflows presented as operating, capitalised costs that reduce operating outflow, factoring or supply-chain finance that converts a financing inflow into apparent operating strength, and interest or tax presented inconsistently between periods. Any reclassification between periods should be explained and its effect quantified.

Assess quality of cash generation, not just its level. Compare operating cash flow against profit across several periods and probe divergence in either direction. Decompose working capital movements — receivables, payables, inventory, deferred revenue — and ask whether cash improvement came from genuine trading or from stretching suppliers, pulling collections forward, or a single large receipt. Examine the intra-period shape, not only the total: a period that ends strong because a large customer paid on the last day is not the same as one that generated cash evenly.

Do not impose your own numeric rules for what constitutes a concerning divergence. Judge significance from the entity's scale, its liquidity position, its trading cycle, and any expectation the organisation's instructions set. If materiality or the intended reporting framework is unclear and it affects your conclusions, ask.

Consider innocent explanations: seasonality, a known contract milestone, deliberate inventory build, a planned capital programme, or a change in payment terms agreed with counterparties. Test these before concluding that quality has deteriorated.

Cite every material finding to the statement line, ledger account, period, and the specific transactions or balances relied on. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Write for a board audience: lead with what changed and what it means for cash availability, and separate observation from inference. Nothing here is an accounting or regulatory determination; a licensed professional must sign off.`,
    recommendedInputs: [
      {
        name: "Cash flow statement",
        description: "The cash flow statement for the period and comparatives, in the form presented to management or the board.",
        formats: ["XLSX", "PDF", "CSV"],
        required: true,
      },
      {
        name: "Balance sheet and income statement",
        description: "Period and comparative statements so cash flow adjustments can be tied to underlying movements.",
        formats: ["XLSX", "PDF", "CSV"],
        required: true,
      },
      {
        name: "General ledger detail",
        description: "Transaction-level ledger data supporting working capital and non-cash adjustment lines.",
        formats: ["CSV", "XLSX", "accounting system export"],
        required: true,
      },
      {
        name: "Bank transaction data",
        description: "Actual bank movements for the period, to test the reported cash movement against real flows.",
        formats: ["CSV", "MT940", "CAMT.053", "PDF"],
        required: false,
      },
      {
        name: "Financing and facility agreements",
        description: "Loan, factoring or supply-chain finance arrangements affecting classification of flows.",
        formats: ["PDF", "DOCX", "written text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The cash flow statement for the period under review with comparatives",
      "Opening and closing cash balances agreed to the balance sheet",
      "Ledger support for each material working capital movement in the statement",
      "Evidence of the classification basis applied to interest, tax and financing items",
      "Bank or ledger evidence of the largest individual cash movements in the period",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "key_metric_card",
      "waterfall_chart",
      "cash_flow_visualization",
      "trend_card",
      "period_comparison",
      "finding_card",
      "assumption_box",
      "recommendation_card",
      "source_citation",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "What explains the gap between reported profit and operating cash flow this period?",
      "Have any items been classified differently from the prior period, and what is the effect?",
      "Does the entity use factoring or supply-chain finance, and how is it presented?",
      "How much of the closing cash position arrived in the final week of the period?",
      "Which working capital movement contributed most to the change in operating cash flow?",
    ],
    relevantIntegrations: ["netsuite", "xero", "quickbooks", "dynamics365", "sap", "snowflake", "plaid"],
    tags: ["cash-flow", "classification", "working-capital", "quality-of-earnings"],
  },
  {
    slug: "liquidity-risk-audit",
    name: "Liquidity risk audit",
    category: "cash",
    subcategory: "Treasury and liquidity",
    description:
      "Assesses whether the entity can meet obligations as they fall due, examining accessible cash, committed facilities, maturity profile, covenants and concentration of funding.",
    defaultTitle: "Liquidity risk audit",
    auditDescription:
      "Determine whether available liquidity, in the right currencies and entities and at the right times, is sufficient to meet obligations as they fall due under both expected and stressed conditions.",
    instructions: `You are assessing liquidity risk — the risk that the entity cannot meet an obligation on the day it falls due, even while appearing solvent on paper.

Start by establishing what liquidity is genuinely *available*, which is rarely the headline cash figure. Strip out restricted balances, cash held as collateral or security deposits, amounts trapped in subsidiaries or jurisdictions with repatriation friction, balances held in currencies that cannot be converted quickly, and minimum operating floats required to keep accounts functioning. Add committed, undrawn, and currently accessible facilities — distinguishing carefully between committed and uncommitted lines, since uncommitted lines have a habit of disappearing precisely when they are needed.

Then build the maturity picture. Lay obligations out on a timeline: payroll dates, tax and VAT payments, debt amortisation and interest, lease commitments, supplier payment runs, and any known one-off settlements. Against these, lay expected inflows with attention to their reliability — contracted and invoiced is not the same as forecast. The purpose is to identify the *tightest* point in the horizon, not the average position. An entity comfortable on a period-average basis can still fail on a specific Tuesday.

Examine structural sources of fragility: concentration of cash in a single institution, dependence on one facility or one lender, dependence on a small number of customers for the majority of inflow, currency mismatch between where cash sits and where obligations arise, and covenant terms whose breach would accelerate obligations or block drawdown. Read the covenant definitions rather than the headline ratio; the definition is where the risk usually hides.

Consider stress, but describe your reasoning transparently: what happens if the largest inflow is delayed, a facility is withdrawn, or collections slow. Do not invent a threshold at which liquidity becomes "inadequate" — that judgement depends on the entity's risk appetite, its facility structure, and the organisation's own instructions. Where a risk appetite, minimum liquidity buffer, or forecast horizon has not been given and it materially affects your conclusion, ask for it and say that you have.

Weigh benign explanations: seasonal trough, a deliberate drawdown ahead of an acquisition, or a timing overlap between a payment run and a known receipt.

Cite each material finding to the account, facility agreement clause, forecast row, or obligation schedule line it rests on. Label every claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Write for a CFO and audit committee: state the tight points, the assumptions behind them, and what would change them. This is a professional assessment, not a solvency opinion or legal determination — a licensed professional must sign off.`,
    recommendedInputs: [
      {
        name: "Account balances by entity and currency",
        description: "Current and period-end balances across all accounts, showing holding entity, institution and currency.",
        formats: ["CSV", "XLSX", "bank portal export"],
        required: true,
      },
      {
        name: "Debt and facility agreements",
        description: "Loan, revolver and overdraft documentation including covenant definitions and drawdown conditions.",
        formats: ["PDF", "DOCX"],
        required: true,
      },
      {
        name: "Obligation and maturity schedule",
        description: "Scheduled payroll, tax, debt service, lease and supplier commitments across the forecast horizon.",
        formats: ["XLSX", "CSV"],
        required: true,
      },
      {
        name: "Short-term cash forecast",
        description: "The entity's own rolling cash forecast covering the assessment horizon.",
        formats: ["XLSX", "CSV"],
        required: false,
      },
      {
        name: "Aged receivables and payables",
        description: "Ageing detail to assess the reliability and timing of expected inflows and outflows.",
        formats: ["CSV", "XLSX", "PDF"],
        required: false,
      },
      {
        name: "Restricted cash schedule",
        description: "Balances subject to legal, contractual or regulatory restriction on use.",
        formats: ["XLSX", "PDF", "written text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Balances for all cash-holding accounts by entity, institution and currency",
      "Committed and uncommitted facility limits with current drawn amounts",
      "Covenant definitions and current measured position where facilities exist",
      "A schedule of contractual obligations and their due dates across the horizon",
      "Evidence supporting the timing and reliability of the largest expected inflows",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "overall_risk_rating",
      "key_metric_card",
      "financial_ratio_card",
      "timeline",
      "risk_matrix",
      "line_chart",
      "risk_highlight",
      "finding_card",
      "assumption_box",
      "limitation_box",
      "recommendation_card",
    ],
    suggestedFollowups: [
      "What is the minimum liquidity buffer the board expects to maintain, and over what horizon?",
      "Which facilities are committed versus uncommitted, and what conditions govern drawdown?",
      "How much cash is held in entities or currencies from which it cannot be moved quickly?",
      "What is the tightest projected day in the next thirteen weeks, and what drives it?",
      "How would a delay in the single largest expected receipt affect the position?",
    ],
    relevantIntegrations: ["plaid", "bank_direct_api", "netsuite", "xero", "dynamics365", "truelayer", "snowflake"],
    tags: ["liquidity", "treasury", "covenants", "solvency", "risk"],
  },
  {
    slug: "payment-audit",
    name: "Payment audit",
    category: "cash",
    subcategory: "Outbound payments",
    description:
      "Reviews outbound payment activity for authorisation, validity of beneficiary, supporting documentation, segregation of duties and evidence of unusual or unauthorised disbursement.",
    defaultTitle: "Payment audit",
    auditDescription:
      "Test whether payments leaving the organisation were properly authorised, went to a legitimate beneficiary for a genuine obligation, and are supported by documentation.",
    instructions: `You are auditing money leaving the organisation. The central question for each payment is simple and hard: was this a genuine obligation, correctly authorised, paid to the right party, in the right amount, once?

Work along the payment chain rather than through the ledger alone. For a payment to be sound there should be a coherent trail: an approved purchase or commitment, a supporting invoice or contract, a beneficiary whose bank details were set up through a controlled process, an authorisation consistent with the delegated authority schedule, execution by someone other than the authoriser, and a bank debit that matches. Break the chain anywhere and you have something to examine.

Focus your attention on the areas where payment fraud and error actually concentrate. Examine payments to beneficiaries added or amended shortly before payment, and try to corroborate the bank detail change against an independently verified source rather than an emailed instruction. Look at manual and out-of-cycle payments outside the normal run, urgent or same-day transfers, and payments processed when normal approvers were away. Compare beneficiary bank details and addresses against employee records and against each other for shared details across supposedly unrelated payees. Look at payments just beneath a person's approval ceiling, sequences of payments to one beneficiary that together look like a split of a larger one, and payments executed outside business hours or on non-working days. Round-sum payments with vague narratives, and payments coded to accounts unrelated to the beneficiary's usual activity, both merit a look.

Do not encode limits of your own. Whether an amount is significant, whether an out-of-hours payment is abnormal, and what constitutes a split, all depend on the entity's authority schedule, its operating pattern, and the organisation's instructions. Read the delegated authority schedule and use *that*. If it has not been provided and your conclusions depend on it, ask for it.

Always weigh innocent explanations before alleging anything. Genuine emergencies, a supplier that legitimately changed banks, a director who genuinely approves both legs in a small team, a shared address between two group companies — these are common. Distinguish a control weakness (the process permits harm) from evidence of harm.

Cite every material finding to payment reference, date, amount, beneficiary, approver, and the source file or system row. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information — and be scrupulous here, since payment findings touch named individuals. Report factually, without accusation. Nothing you write is a legal or regulatory conclusion; a licensed professional must sign off, and suspected fraud must be routed to the entity's own process.`,
    recommendedInputs: [
      {
        name: "Payment transaction listing",
        description: "All outbound payments for the period with date, amount, beneficiary, method, approver and reference.",
        formats: ["CSV", "XLSX", "accounting system export"],
        required: true,
      },
      {
        name: "Bank statements",
        description: "Statements evidencing the actual debits, to test payments recorded against payments made.",
        formats: ["CSV", "PDF", "MT940", "CAMT.053"],
        required: true,
      },
      {
        name: "Beneficiary / vendor master file with change history",
        description: "Standing bank details for payees, ideally with the log of additions and amendments and who made them.",
        formats: ["CSV", "XLSX"],
        required: true,
      },
      {
        name: "Delegated authority schedule",
        description: "The approval limits by role or individual that govern who may authorise which payments.",
        formats: ["PDF", "DOCX", "XLSX", "written text"],
        required: false,
      },
      {
        name: "Supporting invoices and contracts",
        description: "Documentation underpinning a sample of payments selected for detailed testing.",
        formats: ["PDF", "images", "ZIP"],
        required: false,
      },
      {
        name: "Employee master data",
        description: "Employee bank details and addresses, for comparison against beneficiary records.",
        formats: ["CSV", "XLSX"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Complete listing of outbound payments for the period with beneficiary and amount",
      "Bank statement debits corresponding to the recorded payments",
      "Beneficiary standing data including bank account details",
      "Authorisation evidence for payments selected for testing",
      "Supporting invoice, contract or commitment for each payment tested in detail",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "overall_risk_rating",
      "transaction_table",
      "finding_card",
      "risk_highlight",
      "control_weakness",
      "heatmap",
      "supplier_concentration_chart",
      "missing_evidence_notice",
      "control_recommendation",
      "source_citation",
    ],
    suggestedFollowups: [
      "Which beneficiary bank details were changed during the period, by whom, and how was the change verified?",
      "Can the same individual both add a beneficiary and release a payment to it?",
      "What approval was obtained for the manual and out-of-cycle payments identified?",
      "Do any beneficiary bank details or addresses match employee records?",
      "What is the documented process for verifying a supplier's request to change bank details?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sage", "coupa", "ramp", "brex", "bank_direct_api"],
    tags: ["payments", "authorisation", "fraud-risk", "segregation-of-duties", "controls"],
  },
  {
    slug: "receipt-audit",
    name: "Receipt audit",
    category: "cash",
    subcategory: "Inbound receipts",
    description:
      "Examines incoming funds for completeness, correct allocation to customers and invoices, timeliness of banking, and evidence of diversion, lapping or misapplication.",
    defaultTitle: "Receipt audit",
    auditDescription:
      "Test whether all amounts received by the organisation were banked, recorded, and allocated to the right customer and obligation, without diversion or delay.",
    instructions: `You are auditing money coming *in*. The risk profile here is the mirror image of a payment audit: the danger is not that something improper happened and was recorded, but that something proper happened and was *not* — receipts diverted, delayed, or allocated to conceal a gap.

Completeness is the whole game, and it cannot be tested from the ledger, because a diverted receipt leaves no ledger trace. Work from independent external evidence inward. Take the bank statements, the merchant acquirer settlement reports, the PSP payout files, and the point-of-sale takings records, and trace them into the ledger and onto customer accounts. Then approach from the other direction: from invoices raised and orders fulfilled, ask what was collected and when. Gaps in either direction are your starting points.

Test the interval between receipt and banking. Compare the date funds were received or acquired with the date they hit the bank and the date they were recorded. Persistent delay between receipt and banking at a particular location, or by a particular person, is a classic condition for lapping and merits examination — as does a delay that appears only at period end.

Examine allocation quality closely. Look for receipts posted to suspense or unallocated, credits sitting on customer accounts against nothing, part-payments allocated across invoices in patterns that do not match remittance advice, receipts allocated to an older invoice while a newer one was settled by a subsequent receipt, and manual journals moving cash between customer accounts. Lapping shows up as a pattern of allocation, not as a single bad entry — look at sequences over time rather than individual rows. Also examine reversals and re-allocations of previously posted receipts, and credit notes issued shortly after a receipt.

Do not set your own thresholds for what counts as a significant delay, a material unallocated balance, or a suspicious sequence. Judge those against the entity's own banking policy, its trading pattern, and the organisation's instructions. Where policy is silent and it affects your conclusion, ask rather than assume.

Weigh innocent explanations: acquirer settlement lag, weekend and holiday banking, customers paying without remittance advice, genuine over-payments awaiting refund, and consolidated payments covering many invoices. These account for most unallocated cash in most entities.

Cite every material finding to the receipt reference, date, amount, customer, allocation, and the statement or settlement line it came from. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Where a missing source prevents corroborating completeness, say so and name the file that would settle it. Report neutrally; suspected misappropriation belongs to the entity's own process, and no conclusion here is a legal or regulatory determination — a licensed professional must sign off.`,
    recommendedInputs: [
      {
        name: "Receipt transaction listing",
        description: "All recorded receipts for the period with date, amount, payer, method and allocation.",
        formats: ["CSV", "XLSX", "accounting system export"],
        required: true,
      },
      {
        name: "Bank statements",
        description: "Statements evidencing credits received, to test the completeness of what was recorded.",
        formats: ["CSV", "PDF", "MT940", "CAMT.053"],
        required: true,
      },
      {
        name: "Merchant acquirer or PSP settlement reports",
        description: "Payout and settlement files from card, PSP or marketplace channels, showing gross takings and fees.",
        formats: ["CSV", "XLSX", "PDF"],
        required: false,
      },
      {
        name: "Aged receivables ledger",
        description: "Customer account detail so allocation and open-item behaviour can be examined.",
        formats: ["CSV", "XLSX", "PDF"],
        required: true,
      },
      {
        name: "Remittance advices",
        description: "Customer remittance documentation for a sample of receipts selected for allocation testing.",
        formats: ["PDF", "images", "email export"],
        required: false,
      },
      {
        name: "Cash takings or till records",
        description: "Point-of-sale or over-the-counter takings records where physical cash is received.",
        formats: ["CSV", "XLSX", "PDF"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Bank statement credits for the period under review",
      "Recorded receipt listing with customer and invoice allocation",
      "Settlement or payout reports for any card, PSP or marketplace channel in scope",
      "Aged receivables detail showing unallocated cash and open items",
      "Evidence of the interval between receipt and banking for a sample of receipts",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "key_metric_card",
      "transaction_table",
      "aging_table",
      "finding_card",
      "risk_highlight",
      "customer_concentration_chart",
      "data_quality_warning",
      "control_weakness",
      "recommendation_card",
      "evidence_list",
    ],
    suggestedFollowups: [
      "How long, on average, elapses between funds being received and being banked, and does that vary by location?",
      "What is sitting in unallocated cash or suspense, and how old is the oldest item?",
      "Can the person who allocates receipts also raise credit notes or write off balances?",
      "Do acquirer settlement totals reconcile to recorded takings for every settlement in the period?",
      "Were any previously allocated receipts re-allocated to a different customer or invoice, and why?",
    ],
    relevantIntegrations: ["stripe", "adyen", "paypal", "square", "shopify", "xero", "quickbooks", "plaid"],
    tags: ["receipts", "completeness", "allocation", "lapping", "cash"],
  },
  {
    slug: "petty-cash-audit",
    name: "Petty cash audit",
    category: "cash",
    subcategory: "Physical cash and floats",
    description:
      "Reviews petty cash and physical float custody, imprest integrity, supporting documentation, approval of disbursements, and the pattern of small-value spending.",
    defaultTitle: "Petty cash audit",
    auditDescription:
      "Verify that petty cash floats exist, are properly custodied, and that disbursements are supported, approved, business-related and correctly reimbursed.",
    instructions: `You are auditing petty cash and physical floats. The amounts are small; the control signal is not. Petty cash is where custody discipline, documentation habits and approval culture are visible in miniature — and it is a common route for sustained small-scale loss that no single transaction reveals.

Begin with the imprest logic. For each float, establish the authorised float level, the named custodian, and the location. Then test the fundamental identity: cash physically on hand, plus vouchers and receipts not yet reimbursed, plus any advances outstanding, should equal the authorised float. Where a count sheet exists, work from it; where it does not, say so and treat existence as unverified rather than assumed. Confirm that the reimbursement claims submitted actually restore the float to its level and that the general ledger balance for the float agrees to the authorised level rather than drifting.

Then examine the disbursements themselves. For a sample, seek an original receipt or voucher, a business purpose, an approver independent of the custodian, and a date consistent with the claim. Test the population for the patterns that matter: expenditure with no receipt or with a handwritten voucher substituting for one, duplicated receipts across claims, receipts dated outside the claim period, expenditure that should have gone through purchasing or payroll (staff advances, contractor payments, recurring supplier bills), and personal-looking spend. Look at frequency and rhythm — a float replenished far more often than its size and stated purpose imply is telling you something. Look at whether the custodian is also the approver, and whether the same person counts, claims and reconciles.

Do not invent limits. Whether a single item is too large for petty cash, whether a receipt is required, and what may be bought this way are set by the entity's petty cash policy — read it and test against it. If no policy has been supplied and your conclusions depend on it, ask for it and note that you have.

Consider innocent explanations: a genuine emergency purchase, a small office with unavoidable role overlap, a supplier that does not issue receipts, and a float sized for a use case that has since changed. Frame findings proportionately — the point is usually the control gap, not the twenty pounds.

Cite each material finding to the float, location, custodian, claim reference, voucher number, date and count sheet line. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Where physical existence has not been independently counted, state that limitation openly rather than implying verification you did not perform. Recommendations should be practical for the size of the operation. This is not a legal or regulatory conclusion; a licensed professional must sign off.`,
    recommendedInputs: [
      {
        name: "Petty cash ledger or float register",
        description: "The running record of petty cash movements for each float, with dates, amounts and descriptions.",
        formats: ["XLSX", "CSV", "PDF", "scanned book"],
        required: true,
      },
      {
        name: "Cash count sheets",
        description: "Signed physical counts of each float during or at the end of the period.",
        formats: ["XLSX", "PDF", "scanned images"],
        required: true,
      },
      {
        name: "Vouchers and receipts",
        description: "Supporting documentation for disbursements selected for detailed testing.",
        formats: ["PDF", "images", "ZIP"],
        required: false,
      },
      {
        name: "Petty cash policy",
        description: "Internal policy setting float levels, permitted expenditure, receipt and approval requirements.",
        formats: ["PDF", "DOCX", "written text"],
        required: false,
      },
      {
        name: "Reimbursement claims and ledger postings",
        description: "Float top-up claims and the corresponding general ledger entries for the period.",
        formats: ["CSV", "XLSX", "PDF"],
        required: true,
      },
      {
        name: "Custodian list",
        description: "Named custodians and approvers per float and location, with any changes during the period.",
        formats: ["CSV", "XLSX", "written text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Authorised float level and named custodian for each petty cash location",
      "Physical cash count evidence at or near the period end",
      "The petty cash transaction record for the period",
      "Reimbursement claims with the general ledger postings that funded them",
      "Supporting vouchers or receipts for the disbursements tested",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "key_metric_card",
      "table",
      "finding_card",
      "control_weakness",
      "missing_evidence_notice",
      "warning_box",
      "limitation_box",
      "control_recommendation",
      "source_citation",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "When was each float last physically counted, by whom, and was the counter independent of the custodian?",
      "Which disbursements in the period had no supporting receipt, and what were they for?",
      "How often was each float replenished relative to its authorised level?",
      "Is any expenditure being routed through petty cash that policy requires to go through purchasing or payroll?",
      "Have custodians changed during the period, and was a count performed at handover?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "sage", "zoho_books", "expensify", "google_drive", "sharepoint"],
    tags: ["petty-cash", "custody", "imprest", "documentation", "controls"],
  },
  {
    slug: "cash-forecast-audit",
    name: "Cash forecast audit",
    category: "cash",
    subcategory: "Forecasting",
    description:
      "Tests the construction, assumptions, evidential basis and historical accuracy of the cash forecast, and whether it is fit to support the decisions being taken on it.",
    defaultTitle: "Cash forecast audit",
    auditDescription:
      "Evaluate whether the cash forecast is mechanically sound, evidentially grounded, honestly assumed, and demonstrably accurate enough for the decisions it informs.",
    instructions: `You are auditing a forecast, not an outcome. The question is not whether the future arrived as predicted, but whether the forecast was built in a way that deserved to be believed — and whether its track record supports the weight now placed on it.

Start mechanically. Trace the opening balance to actual bank evidence, not to a prior forecast; a forecast that begins from a rolled-forward estimate compounds error invisibly. Check the internal arithmetic — that lines sum, that the closing balance of each period becomes the opening of the next, and that there are no broken links, hard-coded overrides sitting on top of formulas, or stale rows carried from a previous version. Confirm which version you have been given and whether it is the one management actually used.

Then decompose the forecast into its drivers and test each against evidence. Separate the contracted from the expected from the hoped-for: invoiced receivables with agreed terms are a different class of input from pipeline conversion, and they should not sit in the same line without distinction. For inflows, compare assumed collection timing against the entity's actual historical collection behaviour on the same customers, not against stated payment terms. For outflows, check that known fixed obligations — payroll, tax, debt service, leases, rent — appear on their real dates rather than smoothed across periods, and that the payment run cadence used matches the one actually operated.

Test accuracy backwards. Take prior forecast vintages and compare them, at matching horizons, against actuals. Look for direction of bias rather than magnitude alone: a forecast consistently optimistic on collections and consistently late on outflows is not merely inaccurate, it is inaccurate in the way that hurts. Examine whether accuracy degrades sharply beyond a particular horizon, and whether variance clusters in specific drivers.

Surface the assumptions the forecast does not state. Every forecast contains implicit ones — that a facility remains available, that a large customer keeps paying to pattern, that no tax settlement lands, that FX is static. Name them and assess their fragility. Do not impose your own accuracy tolerance or variance rule; what is acceptable depends on the horizon, the entity's liquidity headroom, the decisions being made, and the organisation's instructions. If no accuracy expectation or intended use has been given and it affects your conclusion, ask.

Cite every material finding to the workbook, sheet, cell or row, the forecast version and date, and the actuals compared against. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information, and state assumptions you made yourself. Write for treasury and the CFO: be direct about where the forecast is weakest and why it matters. Sign-off remains with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Current cash forecast model",
        description: "The live forecast workbook or export, ideally with formulas intact rather than values only.",
        formats: ["XLSX", "CSV", "Google Sheets export"],
        required: true,
      },
      {
        name: "Prior forecast versions",
        description: "Earlier forecast vintages, so predicted figures can be compared to actuals at matching horizons.",
        formats: ["XLSX", "CSV", "PDF"],
        required: true,
      },
      {
        name: "Actual cash movements for the comparison period",
        description: "Bank or ledger actuals covering the periods previously forecast.",
        formats: ["CSV", "XLSX", "MT940", "CAMT.053"],
        required: true,
      },
      {
        name: "Aged receivables and payables",
        description: "Open items underpinning the forecast's collection and payment assumptions.",
        formats: ["CSV", "XLSX", "PDF"],
        required: false,
      },
      {
        name: "Documented forecast assumptions",
        description: "Management's stated assumptions, methodology and any commentary accompanying the forecast.",
        formats: ["DOCX", "PDF", "written text"],
        required: false,
      },
      {
        name: "Committed obligation schedule",
        description: "Payroll, tax, debt service and lease commitments with contractual due dates.",
        formats: ["XLSX", "CSV", "PDF"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The current forecast with its opening balance and driver detail",
      "At least one prior forecast vintage covering periods that have now closed",
      "Actual cash movements for those closed periods",
      "Evidence supporting the largest forecast inflow assumptions (contracts, invoices or terms)",
      "The schedule of contractual outflows and their due dates",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "variance_card",
      "line_chart",
      "period_comparison",
      "trend_card",
      "assumption_box",
      "finding_card",
      "data_quality_warning",
      "limitation_box",
      "recommendation_card",
      "source_citation",
    ],
    suggestedFollowups: [
      "Does the forecast's opening balance tie to actual bank evidence or to a previous forecast?",
      "How do assumed collection days compare with actual historical collection behaviour for the same customers?",
      "At what horizon does forecast accuracy visibly degrade, and which drivers cause it?",
      "Is forecast error directionally biased, and if so in which direction?",
      "Which unstated assumptions would most damage the forecast if they failed?",
    ],
    relevantIntegrations: ["xero", "netsuite", "dynamics365", "quickbooks", "plaid", "snowflake", "google_drive"],
    tags: ["forecast", "accuracy", "assumptions", "treasury", "variance"],
  },
  {
    slug: "bank-account-review",
    name: "Bank account review",
    category: "cash",
    subcategory: "Account governance",
    description:
      "Reviews the estate of bank accounts itself: which exist, who authorised them, who can operate them, which are dormant or redundant, and whether the list is complete.",
    defaultTitle: "Bank account review",
    auditDescription:
      "Establish a complete and accurate picture of the bank accounts held by the entity, their purpose, mandates, access rights, activity status and governance.",
    instructions: `You are reviewing the bank account estate as an object in its own right. This is a governance audit, not a balance audit — the balances belong to other work. The question here is: does the organisation know which accounts exist, why each exists, who can move money from it, and whether that is still appropriate?

Build the population from multiple independent directions and reconcile them, because no single source is reliable. Take the chart of accounts, the treasury or finance team's own account list, the bank confirmations or relationship-manager account listings, the statement files actually received, and any accounts visible in the payment or aggregation feed. Every discrepancy between these sources is a finding candidate: an account known to the bank but absent from the ledger may be unrecorded and unmonitored; an account in the ledger with no statements may have been closed without the books being updated; an account nobody can explain the purpose of is a governance failure regardless of its balance.

For each account, establish purpose, holding entity, institution, currency, opening date and authorising decision. Then examine the mandate — who is on it, what each person can do (initiate, approve, release, view), whether any single person can complete a payment alone, and when the mandate was last reviewed. Compare mandate holders against current employee records: leavers who retain access are among the most common and most serious findings in this area. Check whether authority on the account is consistent with the entity's delegated authority schedule rather than with historical habit.

Assess activity status. Identify accounts with no or minimal genuine movement, distinguishing true dormancy from an account that holds a reserve for a reason. Dormant accounts with live mandates are a risk surface with no offsetting benefit; redundant accounts also carry fees and reconciliation cost. But do not treat inactivity as a fault by itself — establish the reason first.

Do not apply your own rule for what makes an account dormant, redundant, or over-mandated. Judge those against the entity's treasury policy, its structure, and the organisation's instructions. If no policy or authority schedule is available and your conclusions depend on it, ask for it.

Weigh innocent explanations: escrow and deposit accounts are meant to be quiet, group structures legitimately need many accounts, and a small entity may have unavoidable mandate overlap.

Cite every material finding to the account identifier (masked appropriately), institution, source document, and the row it came from. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information — and be explicit when you cannot confirm completeness of the account population, since an unknown account cannot be evidenced. Nothing here is a legal determination; a licensed professional must sign off.`,
    recommendedInputs: [
      {
        name: "Bank account listing",
        description: "The entity's own register of accounts: institution, number, entity, currency, purpose and status.",
        formats: ["XLSX", "CSV", "PDF"],
        required: true,
      },
      {
        name: "Bank confirmations or institution account listings",
        description: "Independent confirmation from each institution of the accounts held and mandates in force.",
        formats: ["PDF", "DOCX"],
        required: true,
      },
      {
        name: "Chart of accounts",
        description: "The ledger's cash and bank account structure, to compare against the real account estate.",
        formats: ["CSV", "XLSX", "accounting system export"],
        required: true,
      },
      {
        name: "Bank mandates and signatory lists",
        description: "Who is authorised on each account and what each is permitted to do, with review dates.",
        formats: ["PDF", "XLSX", "DOCX"],
        required: false,
      },
      {
        name: "Employee roster including leavers",
        description: "Current staff and dated leaver records, for comparison against mandate holders.",
        formats: ["CSV", "XLSX"],
        required: false,
      },
      {
        name: "Treasury policy",
        description: "Policy governing account opening, closure, mandate review and permitted institutions.",
        formats: ["PDF", "DOCX", "written text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The entity's own list of bank accounts with purpose and status",
      "Independent confirmation or statement evidence of accounts held at each institution",
      "The chart of accounts entries for cash and bank",
      "Mandate or signatory documentation for each account in scope",
      "Evidence of activity or inactivity for each account across the period",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "table",
      "entity_comparison",
      "finding_card",
      "control_weakness",
      "risk_highlight",
      "account_movement_visualization",
      "missing_evidence_notice",
      "control_recommendation",
      "management_question",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Are there accounts confirmed by an institution that do not appear in the chart of accounts?",
      "Do any mandate holders no longer work for the entity, and when did they leave?",
      "Can any single individual initiate, approve and release a payment on any account alone?",
      "What is the stated business purpose of each account showing little or no activity?",
      "When was each bank mandate last formally reviewed and by whom?",
    ],
    relevantIntegrations: ["plaid", "bank_direct_api", "truelayer", "tink", "netsuite", "xero", "quickbooks"],
    tags: ["bank-accounts", "mandates", "governance", "dormant", "access"],
  },
  {
    slug: "restricted-cash-audit",
    name: "Restricted cash audit",
    category: "cash",
    subcategory: "Restricted and encumbered cash",
    description:
      "Examines cash subject to legal, contractual or regulatory restriction: whether restrictions are identified, respected, correctly presented, and whether restricted funds have been used improperly.",
    defaultTitle: "Restricted cash audit",
    auditDescription:
      "Identify cash that is not freely available, verify the basis and terms of each restriction, and test whether restrictions have been honoured and correctly disclosed.",
    instructions: `You are auditing cash that is not free. Restricted cash fails in two directions: it is presented as available when it is not, inflating apparent liquidity; or it is spent on something the restriction forbids. Both matter, and they need different tests.

Begin by finding the restrictions, which is harder than reading a schedule labelled "restricted cash". Restrictions arise from many places: escrow and deposit arrangements, client or trust money held on behalf of others, grant funding with purpose conditions, collateral pledged against facilities or guarantees, construction retention accounts, regulatory capital or segregation requirements, insurance reserves, landlord deposits, and cash trapped behind exchange controls. Read the underlying instruments — trust deeds, grant agreements, facility and security documents, client-money rules — rather than relying on how management has categorised the balance. Then reconcile back: does every restricted account in the documentation appear in the schedule, and does every balance in the schedule have a document behind it?

For each restriction, establish its precise terms: what the cash may be used for, who may authorise use, what conditions release it, when it expires, and whether any reporting obligation attaches. Vague summaries are not evidence — quote the clause.

Then test compliance. Trace flows into and out of each restricted account and ask whether each movement was permitted and by whom it was authorised. Pay particular attention to transfers from restricted to operating accounts, to sweeps and pooling arrangements that may commingle restricted funds without anyone intending it, to restricted balances used to meet general obligations at a tight point in the month, and to grant funds spent outside the funded purpose. Check whether balances are segregated in fact — a "restricted" balance sitting inside an operating account subject to a cash sweep is restricted in name only.

Finally examine presentation: whether restricted cash is separated from unrestricted in reporting and in any liquidity metric management or lenders rely on.

Do not decide for yourself what proportion of restricted cash is acceptable or what constitutes a breach threshold — the restriction's own terms and the organisation's instructions govern that. If a governing document is unavailable and your conclusion depends on it, say so and request it.

Weigh innocent explanations: a permitted drawdown, a genuine release on condition satisfaction, or pooling the agreement expressly allows.

Cite every material finding to the account, the governing document and clause, the transaction date and reference, and the schedule line. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Be careful with language: report potential non-compliance with a restriction's terms as an audit observation, never as a legal conclusion — that determination and final sign-off belong to a licensed professional.`,
    recommendedInputs: [
      {
        name: "Restricted cash schedule",
        description: "Management's schedule of restricted balances with the nature and basis of each restriction.",
        formats: ["XLSX", "CSV", "PDF"],
        required: true,
      },
      {
        name: "Governing agreements",
        description: "Trust deeds, grant agreements, escrow instructions, security documents and client-money rules.",
        formats: ["PDF", "DOCX"],
        required: true,
      },
      {
        name: "Bank statements for restricted accounts",
        description: "Full statement activity for each restricted or segregated account across the period.",
        formats: ["CSV", "PDF", "MT940", "CAMT.053"],
        required: true,
      },
      {
        name: "Ledger detail for restricted accounts",
        description: "Ledger movements on restricted balances, including transfers to and from operating accounts.",
        formats: ["CSV", "XLSX"],
        required: true,
      },
      {
        name: "Cash pooling and sweep arrangements",
        description: "Documentation of any pooling, sweep or notional offset structure the accounts participate in.",
        formats: ["PDF", "DOCX", "written text"],
        required: false,
      },
      {
        name: "Financial statements or management reporting",
        description: "Reporting in which cash is presented, to test the separation of restricted from available cash.",
        formats: ["PDF", "XLSX"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The schedule of restricted cash balances at period end",
      "The governing document establishing each restriction, with the relevant clause",
      "Bank statement activity for each restricted account across the period",
      "Evidence of authorisation for each material movement out of a restricted account",
      "The presentation of cash in management or statutory reporting for the period",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "overall_risk_rating",
      "table",
      "key_metric_card",
      "finding_card",
      "warning_box",
      "account_movement_visualization",
      "contradiction_alert",
      "missing_evidence_notice",
      "recommendation_card",
      "source_citation",
    ],
    suggestedFollowups: [
      "Which restricted balances lack a governing document in the file, and where is that document held?",
      "Do any restricted accounts participate in a cash sweep or pooling arrangement?",
      "Were any transfers made from restricted to operating accounts, and under what clause were they permitted?",
      "Is restricted cash excluded from the liquidity figures reported to the board and to lenders?",
      "Which restrictions expire or release during the next twelve months, and on what conditions?",
    ],
    relevantIntegrations: ["netsuite", "xero", "quickbooks", "sap", "bank_direct_api", "manual_statement", "sharepoint"],
    tags: ["restricted-cash", "escrow", "covenants", "presentation", "compliance"],
  },
  {
    slug: "unreconciled-item-review",
    name: "Unreconciled item review",
    category: "cash",
    subcategory: "Reconciliation",
    description:
      "A focused investigation of the population of unreconciled and unmatched items: what they are, how old, why they persist, and what they are concealing.",
    defaultTitle: "Unreconciled item review",
    auditDescription:
      "Investigate the composition, age, cause and resolvability of unreconciled items, and determine whether the residue conceals error, loss or misstatement.",
    instructions: `You are investigating the residue — the items that would not match. Where a bank reconciliation audit asks whether the reconciliation process works, this review takes the unmatched population itself as the subject and asks what it is made of and what it is hiding.

Assemble the full population first, across every account and source of unmatched items: bank-side transactions with no ledger counterpart, ledger-side entries with no bank counterpart, suspense and clearing balances, unapplied cash, unmatched acquirer settlements, intercompany differences, and auto-match exception queues. Anything the matching engine rejected is in scope, including items nobody has looked at because the engine quietly parked them.

Then classify. Every unreconciled item is one of a few things, and the class drives the response: a timing difference that will clear; a coding or keying error; a transaction never recorded; a duplicate; an item recorded twice on different sides; a bank error; a fee, interest or FX adjustment nobody posted; a fraud or loss; or a plug — a figure created to make something balance. Assign each material item to a class, and where you cannot, say so rather than defaulting to "timing".

Examine the population's dynamics, not its snapshot. Ask not just how old items are but whether the population is growing, whether the same items recur month after month, and whether new items arise faster than old ones clear. Look for offsetting pairs — a debit and credit of equal magnitude sitting unmatched, which often indicates one mis-posted transaction rather than two problems. Check whether items concentrate in particular accounts, preparers, transaction types or systems, since concentration points at cause. Note whether items spike at period end and vanish afterwards, suggesting they absorb cut-off problems.

Push to root cause. An old item is a symptom; the audit's value is explaining why the process produces it. Interface failure between systems, missing reference data on bank narratives, a payment run posting before it settles, a customer paying without remittance advice — each has a different fix.

Do not set your own ageing or size rules. Significance depends on the class of item, the pattern, the effect on reported cash, and any ageing or write-off policy the organisation's instructions supply. If that policy is missing and it affects your conclusion, ask. Consider benign explanations before escalating: value dating, in-transit transfers, settlement lag.

Cite every material item to account, date, amount, reference, and the file and row it came from. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Where an item cannot be explained on available evidence, report it as unexplained and name what would resolve it — do not manufacture a cause. Recommendations should attack the mechanism, not the backlog. A licensed professional signs off.`,
    recommendedInputs: [
      {
        name: "Unreconciled item listing",
        description: "The open reconciling and unmatched item population with date, amount, account and description.",
        formats: ["CSV", "XLSX", "reconciliation system export"],
        required: true,
      },
      {
        name: "Suspense and clearing account detail",
        description: "Ledger activity in suspense, clearing and holding accounts across the period.",
        formats: ["CSV", "XLSX"],
        required: true,
      },
      {
        name: "Bank statements",
        description: "Statements for the affected accounts, including subsequent periods to test clearance.",
        formats: ["CSV", "PDF", "MT940", "CAMT.053"],
        required: true,
      },
      {
        name: "Cash ledger detail",
        description: "Ledger-side transactions for the affected accounts, to identify counterparts and duplicates.",
        formats: ["CSV", "XLSX"],
        required: true,
      },
      {
        name: "Prior period unreconciled listings",
        description: "Earlier open-item populations, so ageing and clearance dynamics can be measured.",
        formats: ["CSV", "XLSX", "PDF"],
        required: false,
      },
      {
        name: "Write-off and ageing policy",
        description: "Internal policy on how long items may remain open and how they may be written off.",
        formats: ["PDF", "DOCX", "written text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The complete open unreconciled item population with dates and amounts",
      "Suspense and clearing account balances and movements for the period",
      "Bank statement lines corresponding to the unmatched bank-side items",
      "Ledger entries corresponding to the unmatched ledger-side items",
      "Evidence of whether items open at prior period ends have since cleared",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "aging_table",
      "aging_visualization",
      "pivot_table",
      "trend_card",
      "finding_card",
      "root_cause_analysis",
      "risk_highlight",
      "data_quality_warning",
      "control_recommendation",
      "source_citation",
    ],
    suggestedFollowups: [
      "Is the unreconciled population growing or shrinking, and what is the net clearance rate?",
      "Which accounts, systems or preparers account for the largest share of unmatched items?",
      "Are there offsetting debit and credit pairs that suggest a single mis-posted transaction?",
      "What is sitting in suspense at period end, and who owns clearing it?",
      "Do unmatched items spike around period end and then reverse?",
    ],
    relevantIntegrations: ["xero", "quickbooks", "netsuite", "sage", "plaid", "bank_sftp", "postgres"],
    tags: ["reconciliation", "suspense", "aging", "root-cause", "data-quality"],
  },
  {
    slug: "duplicate-payment-audit",
    name: "Duplicate payment audit",
    category: "cash",
    subcategory: "Outbound payments",
    description:
      "Detects and investigates payments made more than once for the same obligation, including near-duplicates across systems, vendors and periods, and tests whether recovery occurred.",
    defaultTitle: "Duplicate payment audit",
    auditDescription:
      "Identify payments made more than once for the same underlying obligation, establish the mechanism that allowed each, and determine whether the overpayment was detected and recovered.",
    instructions: `You are hunting duplicate payments — the same obligation settled more than once. This is rarely fraud and almost always leakage, and it is uniquely worth auditing because the finding is recoverable cash rather than merely an observation.

The naive test — identical vendor, amount and date — catches the easy cases and misses most of the money. Build your matching in layers, from exact to fuzzy, and be explicit about which layer produced each candidate. Match on invoice number where present, but expect inconsistent entry: leading zeros dropped, prefixes added, slashes and hyphens varied, an "A" appended on a re-key. Match on vendor plus amount within a window of dates. Match on amount and invoice date across *different* vendor records — the same supplier set up twice under variant names is among the most productive patterns there is, so cluster the vendor master by bank account, tax registration and address, not only by name. Match across payment methods and systems: an invoice paid once by cheque run and once by manual transfer will never look identical in a single ledger view. Look for an invoice paid once against the PO and once against the invoice, and for a credit note taken with the original still settled.

Extend the search across period boundaries. Duplicates concentrate at the seams — a migration, a cutover, two AP teams running in parallel, an emergency manual payment made because "the run failed" and then processed again when it hadn't. Ask what changed operationally during the period and look there first.

For each credible candidate, confirm rather than report a match. Trace both payments to the bank and confirm both actually left. Confirm they relate to the same obligation and not to a genuine recurring charge of identical amount — rent, subscriptions, retainers and instalments produce vast numbers of false positives, and reporting them destroys the audit's credibility. Then test recovery: was the duplicate identified, a credit taken, a refund received, and did it arrive in the bank? An identified-but-unrecovered duplicate is still lost cash.

Do not encode your own matching thresholds or date windows as rules of judgement. Use them transparently as *search* parameters, state them, and let the evidence decide what is genuinely a duplicate. Materiality and recovery priority depend on the entity's scale, its supplier base, and the organisation's instructions — ask if that affects your conclusion.

Cite every confirmed duplicate to both payment references, dates, amounts, beneficiary, invoice reference, and the bank lines evidencing both debits. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information, and keep unconfirmed candidates clearly separated from confirmed duplicates. Quantify recoverable value where evidence supports it. Frame recommendations around the control that failed. A licensed professional must sign off.`,
    recommendedInputs: [
      {
        name: "Payment transaction listing",
        description: "All payments for the period with date, amount, beneficiary, method, invoice reference and system.",
        formats: ["CSV", "XLSX", "accounting system export"],
        required: true,
      },
      {
        name: "Accounts payable invoice register",
        description: "Invoices recorded, with vendor, invoice number, date, amount and PO reference.",
        formats: ["CSV", "XLSX"],
        required: true,
      },
      {
        name: "Vendor master file",
        description: "Supplier records including bank details, tax registration and address, to cluster duplicate vendors.",
        formats: ["CSV", "XLSX"],
        required: true,
      },
      {
        name: "Bank statements",
        description: "Statements confirming that both legs of each candidate duplicate actually left the bank.",
        formats: ["CSV", "PDF", "MT940", "CAMT.053"],
        required: true,
      },
      {
        name: "Credit notes and refunds received",
        description: "Evidence of recovery, to test whether identified duplicates were actually recouped.",
        formats: ["CSV", "XLSX", "PDF"],
        required: false,
      },
      {
        name: "Supporting invoice images",
        description: "Scanned invoices for candidate duplicates, to confirm the same obligation was paid twice.",
        formats: ["PDF", "images", "ZIP"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Complete payment listing for the period, across all payment methods and systems",
      "Invoice register with vendor and invoice reference for the same period",
      "Vendor master data including bank account details",
      "Bank statement lines evidencing both debits for each confirmed duplicate",
      "Evidence of any credit, refund or recovery relating to identified duplicates",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "audit_methodology",
      "key_metric_card",
      "transaction_table",
      "finding_card",
      "supplier_concentration_chart",
      "control_weakness",
      "root_cause_analysis",
      "action_plan",
      "source_citation",
      "appendix",
    ],
    suggestedFollowups: [
      "Does the vendor master contain multiple records sharing a bank account, tax number or address?",
      "Which duplicates were already identified internally, and was the cash actually recovered?",
      "Did any system migration, cutover or parallel run occur during the period?",
      "Does the AP system block a second payment against an invoice number, and can that block be overridden?",
      "How are emergency manual payments reconciled back against the scheduled payment run?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sage", "coupa", "sap", "bank_direct_api", "postgres"],
    tags: ["duplicate-payments", "leakage", "accounts-payable", "recovery", "controls"],
  },
];
