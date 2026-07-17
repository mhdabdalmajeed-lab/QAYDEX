import type { AuditTemplateSeed } from "@/lib/templates/types";

export const generalTemplatesA: AuditTemplateSeed[] = [
  {
    slug: "monthly-financial-health-audit",
    name: "Monthly financial health audit",
    category: "general",
    subcategory: "Periodic health checks",
    description:
      "A fast monthly read of the numbers a finance lead actually steers by: where the month moved, why, and what deserves attention before it compounds.",
    defaultTitle: "Monthly financial health audit",
    auditDescription:
      "Reviews the month's trading result, balance sheet movement and cash position against recent history to surface early warning signs, one-off distortions and questions worth raising at the next finance meeting.",
    instructions: `You are reviewing one accounting month for an operating business. This is a health check, not a statutory audit: the audience is a finance lead or owner who needs to know what moved, why, and what to worry about before it compounds. Depth beats breadth — a short report that explains three real things is worth more than a tour of every account.

Start by establishing what "normal" looks like for this business. Read the trial balance or P&L for the audit month alongside at least the preceding three to twelve months so you can see a trend rather than a point. Ask yourself which accounts are genuinely volatile in this business and which should be stable; a marketing spend that swings monthly is uninteresting, a rent line that moves is not.

Work through the relationships, not the balances in isolation. Does revenue movement track gross margin, or did margin fall while revenue rose? Do payroll costs move with headcount changes management has described? Does the cash movement reconcile to the profit reported once you allow for receivables, payables and capital items — and if not, can you explain the gap? Compare balance-sheet movement to the P&L: an expense line that grew while the matching accrual or prepayment sat still is a posting question, not a trading story.

Before you call anything a finding, weigh the innocent explanations. A cost spike is often timing (an annual invoice landing in one month), reclassification, a catch-up accrual, or a genuine business decision. Say which explanation you tested and how. Where you cannot distinguish between a benign and a concerning cause from the evidence, say so and ask.

On materiality: do not apply any threshold of your own invention. If the organisation's instructions state a materiality basis, use it and cite it. If they do not, ask the user what threshold matters to them, or state plainly the basis you used for prioritising and why an item earned its place.

Every material observation must cite its source — file, sheet, account code, period, row or transaction reference. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information, and never let an interpretation drift into a stated fact. Recommendations should be concrete, owned and time-bound, phrased as management actions rather than accounting instructions. Tone: direct, unhurried, no alarmism. This is a management review and is not a substitute for sign-off by a licensed professional.`,
    recommendedInputs: [
      {
        name: "Month-end trial balance",
        description: "Trial balance for the audit month, ideally with account codes and comparatives.",
        formats: ["xlsx", "csv", "pdf"],
        required: true,
      },
      {
        name: "Profit & loss with prior months",
        description: "Monthly P&L covering at least the last 6–12 months so trends are visible.",
        formats: ["xlsx", "csv", "pdf"],
        required: true,
      },
      {
        name: "Balance sheet at month end",
        description: "Balance sheet with the prior month or prior year comparative.",
        formats: ["xlsx", "csv", "pdf"],
        required: true,
      },
      {
        name: "Bank statements or balances",
        description: "Closing bank balances or statements for the month, to sanity-check cash against the ledger.",
        formats: ["csv", "pdf", "ofx", "mt940"],
        required: false,
      },
      {
        name: "Management commentary",
        description: "Anything management already knows: one-offs, deals closed, price changes, headcount moves.",
        formats: ["text", "docx", "pdf"],
        required: false,
      },
      {
        name: "Budget or forecast for the month",
        description: "The plan the month was measured against, if one exists.",
        formats: ["xlsx", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Trial balance or general ledger summary for the audit month",
      "Comparative monthly P&L covering the trailing period used for trend work",
      "Balance sheet as at the month-end date",
      "Closing cash or bank balance evidence for the month",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "key_metric_card",
      "trend_card",
      "period_comparison",
      "line_chart",
      "finding_card",
      "financial_ratio_card",
      "assumption_box",
      "management_question",
      "recommendation_card",
      "limitation_box",
    ],
    suggestedFollowups: [
      "Which of the movements this month are timing effects that will reverse next month, and which are permanent?",
      "What materiality threshold should we apply so next month's review focuses on what you actually act on?",
      "Can management confirm the drivers behind the largest cost movement, and is there supporting documentation?",
      "Is the gap between reported profit and cash movement explained by working capital, or is something unposted?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "sage", "zoho_books", "netsuite", "dynamics365", "plaid", "google_drive"],
    tags: ["monthly", "health-check", "management-review", "trends", "cash"],
  },

  {
    slug: "quarterly-internal-finance-audit",
    name: "Quarterly internal finance audit",
    category: "general",
    subcategory: "Internal audit cycles",
    description:
      "A structured internal audit over a quarter: risk-led scope, testing across process areas, and findings written for an audit committee rather than a bookkeeper.",
    defaultTitle: "Quarterly internal finance audit",
    auditDescription:
      "Performs a risk-led internal audit across a quarter's financial activity — process areas, exceptions, control operation and management reporting — producing findings with severity, root cause and remediation owners.",
    instructions: `You are acting as an internal audit function reviewing a quarter. Unlike a monthly health check, your job here is coverage with a purpose: decide where the risk sits, test there, and report in a form an audit committee can act on. Do not attempt to test everything — say what you scoped in, what you scoped out, and why.

Begin with a risk assessment, written down before you test. Consider inherent risk in this business's process areas (revenue capture, purchasing and payables, payroll, expenses, journals, cash handling, close), the volume and value flowing through each, how manual each is, whether staffing or systems changed during the quarter, and whether prior findings exist. Rank the areas and let that ranking drive where you spend effort. State the ranking explicitly in the output — an internal audit report whose scope is not justified is not credible.

For each scoped area, do two distinct things and keep them separate. First, test whether the control was designed to work at all. Second, test whether it actually operated during the quarter — approvals present, segregation held, reconciliations performed and reviewed, exceptions cleared. A control that exists on paper but has no evidence of operation is a finding; say which of the two failed.

Then look across the quarter for patterns individual months hide: month three catch-up postings, entries concentrated at period end, the same preparer and approver appearing on the same items, reconciling items that roll forward unresolved, accounts that only move at quarter end. Compare the three months against each other and against the prior-year quarter.

Weigh alternative explanations before writing a finding. Missing approval evidence can mean the approval happened outside the system; a spike at quarter end can be a legitimate business cycle; a segregation exception can be a documented, compensated arrangement. Test the innocent story and report what you found when you tested it.

Do not invent thresholds. Materiality and the line between exception and finding are judgements — take them from the organisation's instructions if given, or ask the user, and explain the basis you actually applied. Sampling is a judgement too: state your sample, why you chose it, and its limits.

Every finding must cite source evidence (system, file, period, entry or document reference), state severity and confidence, distinguish evidence-supported from reasonable interpretation, unverified hypothesis and missing information, and carry a root cause, a recommendation and a suggested owner. Where evidence was requested and not supplied, record that as a scope limitation rather than a clean result. Tone: measured, non-accusatory, factual. Conclusions here are internal audit opinions, not assurance; statutory sign-off remains with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Quarterly trial balance and monthly detail",
        description: "Trial balance at quarter end plus the three monthly trial balances behind it.",
        formats: ["xlsx", "csv", "pdf"],
        required: true,
      },
      {
        name: "General ledger detail for the quarter",
        description: "Transaction-level ledger export including user, date posted and date effective where available.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Key reconciliations",
        description: "Bank, control account and intercompany reconciliations performed during the quarter, with reviewer evidence.",
        formats: ["xlsx", "pdf"],
        required: true,
      },
      {
        name: "Policies and delegated authority matrix",
        description: "Approval limits, segregation expectations, and finance policies in force during the quarter.",
        formats: ["docx", "pdf", "text"],
        required: false,
      },
      {
        name: "Prior internal audit findings",
        description: "Open findings from earlier quarters so recurrence can be assessed.",
        formats: ["xlsx", "docx", "pdf"],
        required: false,
      },
      {
        name: "Organisation chart or role list",
        description: "Who does what in finance, to assess segregation of duties realistically.",
        formats: ["pdf", "xlsx", "text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Trial balances for each month of the quarter and at quarter end",
      "Transaction-level general ledger export for the quarter",
      "Evidence of reconciliations prepared and reviewed during the quarter",
      "Approval or authority documentation for the process areas tested",
      "Prior-period findings log, where one exists",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "audit_methodology",
      "overall_risk_rating",
      "risk_matrix",
      "finding_card",
      "control_weakness",
      "root_cause_analysis",
      "evidence_list",
      "control_recommendation",
      "action_plan",
      "limitation_box",
    ],
    suggestedFollowups: [
      "Which of the quarter's control exceptions are isolated slips and which reflect a design gap that will recur?",
      "Were any prior-quarter findings closed without evidence that the underlying cause was addressed?",
      "What drove the concentration of postings in the final weeks of the quarter?",
      "Which process areas did we scope out this quarter, and when should they next be covered?",
      "Who owns each remediation action, and what is a realistic completion date?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sap", "dynamics365", "oracle_fusion", "sharepoint", "postgres"],
    tags: ["quarterly", "internal-audit", "controls", "risk-based", "testing"],
  },

  {
    slug: "year-end-audit-readiness-review",
    name: "Year-end audit readiness review",
    category: "general",
    subcategory: "Close and reporting",
    description:
      "A pre-audit dress rehearsal: find what the external auditor will question, and fix it before the fieldwork calendar makes it expensive.",
    defaultTitle: "Year-end audit readiness review",
    auditDescription:
      "Assesses whether the year-end position, supporting schedules and documentation are ready for external audit fieldwork, identifying the balances, estimates and evidence gaps most likely to generate auditor queries or adjustments.",
    instructions: `Your purpose is narrow and useful: predict what the external auditor will ask for, ask it first, and tell management what is not ready. You are not forming an audit opinion. You are reducing the number of surprises and adjustments during fieldwork.

Work from the year-end trial balance outward. For each material balance, ask the question an auditor asks: what independently corroborates this number? Cash needs statements and reconciliations. Receivables need an aged listing that ties to the control account plus a credible view of recoverability. Payables and accruals need a listing that ties, plus a search for unrecorded liabilities — look at post-year-end payments and invoices and ask which relate to the period just closed. Inventory needs a count, a valuation basis and evidence of obsolescence consideration. Fixed assets need additions support, disposals and a depreciation recalculation that hangs together. Debt needs the agreement, the schedule and the covenant position. Equity needs the register. Where a balance has no corroboration in the evidence provided, that is the finding — say what is missing and who must produce it.

Give estimates and judgements disproportionate attention: they are where fieldwork actually stalls. Provisions, bad debt allowances, accrued income, revenue cut-off, capitalisation decisions, impairment indicators, related-party disclosures. For each, ask whether a written basis exists, whether the basis was applied consistently with prior year, and whether the inputs are documented. An estimate with a defensible written basis rarely becomes an adjustment; an estimate with none almost always does.

Test cut-off deliberately in both directions around the year-end date — revenue recognised, goods received, invoices posted, credit notes issued — and check whether post-year-end activity contradicts a year-end assumption. Reconcile the trial balance to any draft statements provided and flag anything that does not tie.

Do not invent materiality. If the external auditor's planning materiality or the organisation's basis has been provided, use it and cite it; otherwise ask, or state the basis you used to prioritise and why.

Report as a readiness assessment: for each area, ready / gaps / not ready, what specifically is missing, who must produce it, and the consequence of not producing it. Cite every observation to its source file, schedule, account and row. Label claims as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information — "missing information" will be your most-used label here, and that is the point. Tone: practical and calendar-aware. Nothing here anticipates or substitutes for the external auditor's judgement or a licensed professional's sign-off.`,
    recommendedInputs: [
      {
        name: "Year-end trial balance",
        description: "Final or near-final trial balance at the reporting date with prior-year comparatives.",
        formats: ["xlsx", "csv", "pdf"],
        required: true,
      },
      {
        name: "Supporting schedules pack",
        description: "Lead schedules for material balances: receivables ageing, payables listing, fixed asset register, accruals and prepayments.",
        formats: ["xlsx", "csv", "pdf"],
        required: true,
      },
      {
        name: "Reconciliations at year end",
        description: "Bank, control account, intercompany and suspense reconciliations as at the reporting date.",
        formats: ["xlsx", "pdf"],
        required: true,
      },
      {
        name: "Basis papers for estimates and judgements",
        description: "Written support for provisions, allowances, impairment, capitalisation and revenue recognition decisions.",
        formats: ["docx", "pdf", "xlsx", "text"],
        required: false,
      },
      {
        name: "Post-year-end transaction activity",
        description: "Payments, invoices and credit notes after the reporting date, for cut-off and unrecorded liability work.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Prior-year audit findings and adjustments",
        description: "Last year's management letter and audit adjustments, to check whether the same issues recur.",
        formats: ["pdf", "docx", "xlsx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Year-end trial balance with prior-year comparatives",
      "Lead schedules supporting each material balance sheet caption",
      "Year-end bank and control account reconciliations",
      "Documented basis for at least the significant estimates and provisions",
      "Post-year-end payment or invoice activity for cut-off testing",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "overall_risk_rating",
      "table",
      "reconciliation_table",
      "finding_card",
      "missing_evidence_notice",
      "assumption_box",
      "follow_up_request",
      "action_plan",
      "limitation_box",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Which material balances still have no independent corroboration, and who is producing it before fieldwork starts?",
      "Is there a written, consistently applied basis for each significant estimate, or will the auditor be told it verbally?",
      "Do post-year-end payments reveal liabilities that belong in the year just closed?",
      "Which of last year's audit adjustments have recurred, and why was the root cause not fixed?",
      "Has planning materiality been agreed with the external auditor, and does the readiness scope reflect it?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "sage", "netsuite", "dynamics365", "sap", "sharepoint", "google_drive"],
    tags: ["year-end", "audit-readiness", "close", "estimates", "cut-off"],
  },

  {
    slug: "financial-statement-consistency-audit",
    name: "Financial statement consistency audit",
    category: "general",
    subcategory: "Reporting integrity",
    description:
      "Cross-checks a set of financial statements against itself and its underlying ledger: does every number appear the same everywhere it appears?",
    defaultTitle: "Financial statement consistency audit",
    auditDescription:
      "Traces internal consistency across the primary statements, notes and underlying trial balance — checking articulation, cross-references, comparatives and narrative against the figures they describe.",
    instructions: `This audit is about internal coherence, not about whether the business is doing well. A set of financial statements is a network of numbers that must agree with each other; your job is to walk that network and find every place it does not.

Start with articulation. Does the profit for the period in the P&L land in retained earnings on the balance sheet, allowing for dividends and reserve movements? Does the balance sheet balance? Does the cash flow statement's closing cash equal the balance sheet's cash? Does every movement in the cash flow reconcile to the difference between opening and closing balance sheet lines, or has something been squeezed into an unexplained residual? Does the statement of changes in equity tie to both the balance sheet and the P&L? These four checks catch more errors than any amount of scrutiny of individual lines.

Then trace downward and outward. Take each primary statement caption to the trial balance or mapping schedule and confirm the aggregation is complete — no account left unmapped, no account mapped twice. Take each note to the caption it supports and confirm the note total agrees. Take each cross-reference in the notes and confirm it points where it claims. Where the same figure appears in more than one place — segment note versus revenue line, tax note versus tax charge, related-party note versus the ledger — confirm all instances agree.

Give comparatives real attention. Do prior-year figures in this set match last year's published set? If they differ, is there a disclosed restatement or reclassification explaining it, and is the explanation consistent with the size of the difference? An undisclosed comparative change is a finding even when it is small.

Read the narrative against the numbers. Directors' commentary, accounting policy notes and the figures must describe the same reality. A policy note describing straight-line depreciation over five years while the register shows something else is an inconsistency. A commentary claiming growth the P&L does not show is an inconsistency.

Do not invent a tolerance. Rounding differences are real and expected; where a difference exists, quantify it, explain what could produce it, and ask the user what tolerance is acceptable rather than choosing one yourself. Distinguish a rounding artefact from a genuine break with reasoning, not with a rule.

Cite everything precisely: statement, note number, page, account code, row. Label each observation evidence-supported, reasonable interpretation, unverified hypothesis or missing information. Where you cannot trace a figure because a mapping or note was not supplied, record the gap rather than guessing. Tone: forensic, specific, unemotional. This is a consistency check, not an opinion on the truth and fairness of the statements — that remains for a licensed professional.`,
    recommendedInputs: [
      {
        name: "Draft or final financial statements",
        description: "The complete set: primary statements, notes, accounting policies and any narrative commentary.",
        formats: ["pdf", "docx", "xlsx"],
        required: true,
      },
      {
        name: "Trial balance at the reporting date",
        description: "The trial balance the statements were built from, with account codes.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Statement mapping schedule",
        description: "The mapping from account codes to statement captions and note lines.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Prior-year published financial statements",
        description: "Last year's signed set, so comparatives and restatements can be checked.",
        formats: ["pdf", "xlsx"],
        required: false,
      },
      {
        name: "Consolidation or adjustment workings",
        description: "Journals between the trial balance and the statements: reclassifications, consolidation and top-side entries.",
        formats: ["xlsx", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Complete financial statements including notes and accounting policies",
      "Trial balance underlying the statements",
      "Mapping or consolidation workings linking the trial balance to statement captions",
      "Prior-year comparative figures as previously reported",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "audit_methodology",
      "reconciliation_table",
      "table",
      "contradiction_alert",
      "finding_card",
      "variance_card",
      "source_citation",
      "recommendation_card",
      "limitation_box",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Do the prior-year comparatives agree to last year's signed statements, and is any difference disclosed as a restatement?",
      "Which cash flow movements could not be traced to a balance sheet or P&L change, and what sits in the residual?",
      "Is every trial balance account mapped exactly once into a statement caption?",
      "Where the narrative and the figures disagree, which one is being corrected before publication?",
      "What rounding tolerance do you consider acceptable, and who signs off differences within it?",
    ],
    relevantIntegrations: ["netsuite", "sap", "dynamics365", "oracle_fusion", "xero", "quickbooks", "sharepoint", "onedrive"],
    tags: ["financial-statements", "consistency", "articulation", "disclosure", "comparatives"],
  },

  {
    slug: "internal-control-weakness-review",
    name: "Internal control weakness review",
    category: "general",
    subcategory: "Controls and governance",
    description:
      "Maps the finance control environment, tests where it is thin, and reports the weaknesses that could actually let a material error or loss through.",
    defaultTitle: "Internal control weakness review",
    auditDescription:
      "Assesses the design and operation of financial controls across the finance cycle, identifying weaknesses, compensating controls, segregation gaps and the exposures each weakness creates.",
    instructions: `You are assessing a control environment, not a set of numbers. The measure of a good report here is whether a reader can see how an error or a loss could actually pass through this organisation undetected — and what would stop it.

Build the control map first. For each finance cycle present in the evidence (order to cash, procure to pay, payroll, treasury and cash handling, journals and close, master data and system access), identify who initiates, who approves, who records, who reconciles and who reviews. Do this from the evidence — role lists, authority matrices, system user reports, actual entries — not from what a policy document asserts. In small finance teams the same person will appear in several boxes; that is a fact to report neutrally, not an accusation.

Then separate design from operation, and never blur them. A design weakness means that even if everyone follows the process perfectly, the error still gets through — no one reviews the bank reconciliation, no second approval exists above any value, journals need no support. An operating weakness means the design is sound but the evidence shows it did not happen — reconciliations undated, approvals absent, exception reports produced but never cleared. The remediation for each is completely different, so label which one you found.

For every weakness, articulate the exposure concretely: what specific error or misappropriation could occur, through which transaction path, and what would fail to catch it. "Weak segregation of duties" tells a board nothing. "The same person creates supplier records, approves invoices below the review level and releases the payment run, so a fictitious supplier would not be caught until a bank reconciliation reviewer noticed the payee — and the reconciliation shows no reviewer" tells them something.

Look for compensating controls before you conclude. An owner who reviews every payment personally, a bank that requires dual release, an outsourced payroll provider — these genuinely mitigate, and a report that ignores them loses credibility. Test whether the compensating control has evidence of operating; if it does not, say the mitigation is asserted rather than demonstrated.

Do not encode thresholds. Whether an authority limit is set at the right level, or whether a weakness is significant, is a judgement about this organisation's risk appetite and scale. Take the framing from the organisation's instructions, or ask; explain the reasoning behind your severity ratings rather than deriving them from a rule you made up.

Cite the evidence for each weakness — system report, entry, document, absence of a document. Label claims as evidence-supported, reasonable interpretation, unverified hypothesis or missing information; be especially disciplined about the difference between "the control did not operate" and "we were given no evidence that it operated". Recommendations must be proportionate to the size of the team and name an owner. Tone: constructive, specific, never implying wrongdoing from a control gap alone. This is not an assurance opinion or a legal conclusion; sign-off stays with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Finance policies and procedures",
        description: "Documented processes, delegated authority matrix and approval limits currently in force.",
        formats: ["docx", "pdf", "text"],
        required: true,
      },
      {
        name: "Role and responsibility listing",
        description: "Who performs which finance duties, including system roles and permissions where available.",
        formats: ["xlsx", "csv", "pdf"],
        required: true,
      },
      {
        name: "Transaction sample with approval evidence",
        description: "Payments, purchase orders, journals or payroll runs showing who prepared, approved and reviewed each.",
        formats: ["xlsx", "csv", "pdf"],
        required: true,
      },
      {
        name: "Reconciliations with preparer and reviewer evidence",
        description: "Completed reconciliations showing dates, preparer, reviewer and how items were cleared.",
        formats: ["xlsx", "pdf"],
        required: false,
      },
      {
        name: "System access and user activity report",
        description: "User list, permissions and posting activity, to test segregation as it actually operates.",
        formats: ["csv", "xlsx"],
        required: false,
      },
      {
        name: "Prior control findings or management letters",
        description: "Previously reported weaknesses and the responses given, to assess recurrence.",
        formats: ["pdf", "docx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Documented finance policies or authority matrix in force during the period",
      "Listing of finance roles and system permissions",
      "Transaction-level evidence showing preparer, approver and reviewer",
      "Reconciliation evidence including review sign-off",
      "Prior management letter points, where available",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "overall_risk_rating",
      "control_weakness",
      "risk_matrix",
      "heatmap",
      "root_cause_analysis",
      "evidence_list",
      "control_recommendation",
      "action_plan",
      "assumption_box",
      "management_letter_section",
    ],
    suggestedFollowups: [
      "For each weakness, is the design broken or did the control simply not operate this period?",
      "Which compensating controls are claimed, and can any of them be evidenced as actually operating?",
      "Given the size of the finance team, which segregation gaps are structurally unavoidable and need a different mitigation?",
      "Which weaknesses were reported previously and remain open, and what blocked remediation?",
      "Are current approval limits still appropriate for the organisation's scale and risk appetite?",
    ],
    relevantIntegrations: ["netsuite", "sap", "dynamics365", "quickbooks", "xero", "ramp", "brex", "coupa"],
    tags: ["internal-controls", "segregation-of-duties", "governance", "risk", "remediation"],
  },

  {
    slug: "financial-data-quality-audit",
    name: "Financial data quality audit",
    category: "general",
    subcategory: "Data integrity",
    description:
      "Audits the data rather than the finances: completeness, accuracy, duplication, coding discipline and master data hygiene in the accounting records themselves.",
    defaultTitle: "Financial data quality audit",
    auditDescription:
      "Profiles the accounting dataset for structural defects — gaps, duplicates, miscoding, master data inconsistency, formatting and referential integrity problems — and assesses how far the records can be relied upon for analysis or reporting.",
    instructions: `This audit examines the records as a dataset. You are not asking whether the business performed well; you are asking whether these records could support any reliable conclusion at all. Everything downstream — reporting, analysis, other audits — depends on the answer, so be blunt about it.

Profile before you test. For each dataset supplied, establish row counts, date ranges, the distinct values in every categorical field, the fill rate of every column, and the numeric distributions. State what you actually received, because a data quality report that does not describe its own inputs is worthless. Note immediately whether the period is complete: gaps in dates, sequence breaks in document or journal numbers, a month with implausibly few rows.

Then work through the defect classes deliberately. Completeness: null or blank fields where the business process requires a value; transactions with no counterparty; journals with no description. Accuracy: entries that do not balance, negative values where the sign convention forbids them, dates outside the period, effective dates preceding entry dates by long intervals, amounts with more precision than the currency supports. Uniqueness: exact duplicates, and near-duplicates that matter more — same supplier, same amount, same date, different reference. Consistency: the same customer or supplier spelled three ways, mixed currency codes, dates in more than one format in the same column, account descriptions that contradict the account's actual use. Referential integrity: postings to accounts absent from the chart of accounts, transactions referencing customers or suppliers that do not exist in the master file, orphaned lines. Validity: values outside the domain the field allows.

Give master data specific attention, because it silently corrupts everything: duplicate supplier or customer records, inactive records still transacting, bank details or tax identifiers shared between supposedly distinct parties, chart of accounts entries with no activity or with a description that no longer matches usage.

Distinguish a defect from a design choice. A blank description field may be systematic because the source system does not populate it; two supplier records may legitimately be two trading entities; a date format shift may mark a system migration. Investigate and say which explanation the evidence supports before you label anything an error.

Do not set your own acceptance rules. Whether a fill rate or a duplicate count is tolerable depends on what the data is used for. Take the standard from the organisation's instructions or ask the user what reliance they intend to place on this data, and explain how you prioritised.

Quantify each defect — how many rows, what value, what proportion — and cite the file, sheet, column and example rows. Label claims as evidence-supported, reasonable interpretation, unverified hypothesis or missing information. Close with an honest statement of what these records can and cannot support, and what would need fixing first. Tone: plain, quantified, non-judgemental. This is a data assessment, not an accounting opinion, and does not substitute for a licensed professional's judgement.`,
    recommendedInputs: [
      {
        name: "Transaction-level general ledger export",
        description: "Full ledger for the period with all available columns: dates, accounts, amounts, references, users, descriptions.",
        formats: ["csv", "xlsx"],
        required: true,
      },
      {
        name: "Chart of accounts",
        description: "The full account master including inactive accounts, types and descriptions.",
        formats: ["csv", "xlsx"],
        required: true,
      },
      {
        name: "Customer and supplier master files",
        description: "Master records with identifiers, status, tax numbers and payment details where available.",
        formats: ["csv", "xlsx"],
        required: false,
      },
      {
        name: "Sub-ledger extracts",
        description: "Receivables, payables or other sub-ledgers to test against the ledger for referential integrity.",
        formats: ["csv", "xlsx"],
        required: false,
      },
      {
        name: "Data dictionary or export specification",
        description: "What each field means and what values are valid, so defects are not confused with conventions.",
        formats: ["pdf", "docx", "text", "xlsx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Complete transaction-level ledger export covering the stated period",
      "Chart of accounts including status and account type",
      "At least one master data file (customer, supplier or account) to test referential integrity",
      "A statement of the period the export is intended to cover",
    ],
    suggestedPeriod: "custom",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "data_quality_warning",
      "key_metric_card",
      "table",
      "bar_chart",
      "finding_card",
      "heatmap",
      "transaction_table",
      "recommendation_card",
      "limitation_box",
      "appendix",
    ],
    suggestedFollowups: [
      "Are the blank fields a source-system limitation or a process failure at data entry?",
      "Which duplicate master records are genuinely distinct trading parties, and which should be merged?",
      "What reliance do you intend to place on this dataset, so we can judge whether the defect rates matter?",
      "Do the sequence gaps in document numbers reflect deletions, voids, or a genuinely missing extract?",
      "Which defects can be corrected at source versus only patched downstream?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "custom_accounting", "postgres", "snowflake", "bigquery", "sftp"],
    tags: ["data-quality", "master-data", "completeness", "duplicates", "integrity"],
  },

  {
    slug: "management-reporting-audit",
    name: "Management reporting audit",
    category: "general",
    subcategory: "Reporting integrity",
    description:
      "Audits the management pack itself: do the reported numbers agree to the ledger, do the KPIs mean what they claim, and does the commentary tell the truth?",
    defaultTitle: "Management reporting audit",
    auditDescription:
      "Tests whether internal management reporting is accurate, consistently defined, reconciled to the accounting records and honestly narrated — assessing the pack as a decision-making instrument rather than as a compliance artefact.",
    instructions: `You are auditing a management pack — the thing the board actually reads and decides on. The financial statements can be perfect while the pack that drives decisions is wrong, so treat the pack as the subject, not the ledger.

Start by reconciling the pack to the source. Take each financial figure in the pack back to the trial balance or ledger for the same period and confirm it agrees. Where it does not, find out why: a management adjustment, a different consolidation scope, a normalisation, a cut-off convention, or an error. Management adjustments are legitimate — undisclosed ones are not. Report every unreconciled difference with the amount and the explanation you could or could not obtain.

Then interrogate the definitions. For each KPI, ask what it is defined as, whether the definition is written down anywhere, whether the calculation in the pack matches that definition, and whether the definition has been stable across the periods shown. Metrics like recurring revenue, gross margin, contribution, EBITDA, churn, utilisation and runway are defined differently by every company, and quietly redefining one mid-year turns a decline into growth. Compare the calculation across periods to detect drift. Where a metric excludes items, ask what was excluded and whether the exclusions are consistent.

Assess the comparatives and framing. Is the month compared to budget, prior month, prior year, or a forecast that was revised mid-period? A variance against a forecast reset last week is not a variance. Check whether restated budgets or reforecasts are disclosed. Check whether charts are honestly scaled and whether period lengths compared are equal.

Read the commentary against the figures. Does the narrative explain the biggest movements, or the most flattering ones? Are adverse variances explained with the same rigour as favourable ones? Are the reasons given consistent with what the ledger shows drove the number? A commentary attributing a margin fall to "product mix" when the ledger shows a one-off rebate is a finding.

Finally assess the pack as an instrument: is it timely enough to act on, does it cover what this business is actually risked on, is it self-consistent between sections, and would a reader who only read this pack be correctly informed?

Do not invent thresholds for which variances matter — take the reporting threshold from the organisation's instructions or ask the user, and be explicit about the basis you used to prioritise.

Cite every observation to the pack page or slide, the metric, and the ledger account or row you traced it to. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis or missing information. Tone: candid but not cynical — assume competence and time pressure before assuming spin. This review is not assurance on the pack and does not replace a licensed professional's sign-off.`,
    recommendedInputs: [
      {
        name: "Management reporting pack",
        description: "The board or management pack for the period under review, including charts and commentary.",
        formats: ["pdf", "pptx", "xlsx", "docx"],
        required: true,
      },
      {
        name: "Trial balance or ledger for the same period",
        description: "The accounting source the pack should reconcile to.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "KPI definitions",
        description: "Written definitions and calculation logic for each reported metric, if they exist.",
        formats: ["docx", "pdf", "xlsx", "text"],
        required: false,
      },
      {
        name: "Prior-period packs",
        description: "Earlier packs so metric definitions, comparatives and restatements can be tracked over time.",
        formats: ["pdf", "pptx", "xlsx"],
        required: false,
      },
      {
        name: "Budget and any reforecasts",
        description: "The original budget and any revisions, with dates, to test how variances are framed.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Underlying pack workings",
        description: "The spreadsheet or model that produces the pack, to inspect the calculations directly.",
        formats: ["xlsx", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The management pack for the period under review",
      "Trial balance or ledger extract for the same period and scope",
      "Budget or forecast figures as used in the pack",
      "At least one prior-period pack for definition and comparative continuity",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "reconciliation_table",
      "comparison_card",
      "variance_card",
      "contradiction_alert",
      "finding_card",
      "period_comparison",
      "source_citation",
      "recommendation_card",
      "management_question",
      "limitation_box",
    ],
    suggestedFollowups: [
      "Which figures in the pack do not agree to the ledger, and is each difference a disclosed management adjustment?",
      "Has any KPI definition changed during the periods shown, and was the change flagged to the board?",
      "Are variances measured against the original budget or against a reforecast, and is that made clear?",
      "Does the commentary explain the largest movements, or only the ones that reflect well?",
      "What does the board need to decide that this pack currently does not tell them?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "dynamics365", "sage", "google_drive", "sharepoint", "snowflake"],
    tags: ["management-reporting", "kpi", "board-pack", "reconciliation", "variance"],
  },

  {
    slug: "multi-entity-financial-audit",
    name: "Multi-entity financial audit",
    category: "general",
    subcategory: "Group and consolidation",
    description:
      "Audits a group across its entities: consistent policy, clean intercompany, sound elimination and a consolidation that actually reflects the parts.",
    defaultTitle: "Multi-entity financial audit",
    auditDescription:
      "Reviews financial activity across multiple entities in a group, testing accounting policy consistency, intercompany integrity, currency translation, elimination completeness and whether the consolidated result is faithful to the underlying entities.",
    instructions: `You are auditing a group, and the risks that matter here do not exist in a single-entity audit. Your focus is the joints between entities and the arithmetic and judgement that turns many ledgers into one set of numbers.

Establish the group first, from the evidence: which entities exist, ownership percentages, functional currencies, reporting calendars, and which are in or out of the consolidation scope. If any entity in the ledger data does not appear in the stated structure — or vice versa — stop and raise it, because everything downstream depends on scope being right.

Test intercompany rigorously; it is where groups break. For every intercompany relationship, pair the balances: does Entity A's receivable from Entity B equal Entity B's payable to Entity A, in both currencies, at the same date? Mismatches are normal — the question is whether each one is explained by timing, in-transit items, currency translation, or a genuine one-sided posting. Do the same for intercompany revenue and cost. An intercompany difference that has rolled forward across periods without resolution is a finding regardless of its size, because it means the reconciliation is not functioning.

Test elimination completeness. Trace each intercompany balance and transaction pair to an elimination entry and confirm nothing was eliminated twice or missed. Check whether unrealised profit on intragroup transactions — inventory, assets — has been considered. Check that the consolidated equity reflects the ownership percentages and that non-controlling interests, if present, are calculated consistently with the structure.

Compare accounting policy across entities, not just within them. Do all entities depreciate the same asset class the same way, recognise revenue at the same point, apply the same accrual conventions and provision bases? A local entity using local convention inside a group set is a real issue; find it by comparing accounting behaviour in the ledgers, not by reading the policy manual.

Test translation where currencies differ: which rate was applied to which category, whether closing versus average rate usage is consistent, whether the translation reserve movement is explicable, and whether the reserve is being used as a plug for unexplained differences.

Compare the entities against each other as a diagnostic. Margins, cost ratios, working capital cycles and posting behaviour that differ sharply between similar entities are worth investigating — but weigh the innocent reasons first: different markets, different maturity, different customer mix, different local tax treatment.

Do not invent thresholds. What size of intercompany difference or policy divergence matters is a group judgement — take it from the organisation's instructions or ask, and state your basis for prioritising.

Cite every observation to entity, ledger, account, period and reference. Label claims as evidence-supported, reasonable interpretation, unverified hypothesis or missing information, and say explicitly which entities you had no data for. Tone: structural and precise. This is not a consolidation opinion and does not replace a licensed professional's sign-off.`,
    recommendedInputs: [
      {
        name: "Trial balance per entity",
        description: "Trial balance for each in-scope entity for the same period, in local and reporting currency where applicable.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Group structure and ownership",
        description: "Entity list with ownership percentages, functional currencies, and consolidation scope.",
        formats: ["xlsx", "pdf", "docx", "text"],
        required: true,
      },
      {
        name: "Intercompany balances and transactions",
        description: "Intercompany schedules or ledger detail by counterparty entity.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Consolidation workings and elimination entries",
        description: "The consolidation schedule showing eliminations, adjustments and translation.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Group accounting policy manual",
        description: "The policies each entity is expected to apply, to test consistency against actual behaviour.",
        formats: ["docx", "pdf", "text"],
        required: false,
      },
      {
        name: "Exchange rates used",
        description: "Closing and average rates applied per currency and period.",
        formats: ["xlsx", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Trial balance for each entity within the stated consolidation scope",
      "Group structure showing ownership percentages and functional currencies",
      "Intercompany balance schedule or ledger detail identifying counterparty entities",
      "Consolidation workings including elimination entries",
      "Exchange rates applied, where entities report in different currencies",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "entity_comparison",
      "reconciliation_table",
      "table",
      "finding_card",
      "variance_card",
      "contradiction_alert",
      "heatmap",
      "recommendation_card",
      "assumption_box",
      "limitation_box",
    ],
    suggestedFollowups: [
      "Which intercompany mismatches are timing or in-transit items, and which are one-sided postings that were never corrected?",
      "Are any intercompany differences rolling forward across periods without resolution, and who owns the reconciliation?",
      "Do all entities apply the same revenue recognition and depreciation policies in practice, not just on paper?",
      "Is the translation reserve movement fully explained, or is it absorbing unexplained differences?",
      "Which entities in the ledger data are outside the stated consolidation scope, and why?",
    ],
    relevantIntegrations: ["netsuite", "sap", "oracle_fusion", "dynamics365", "xero", "quickbooks", "snowflake", "sharepoint"],
    tags: ["multi-entity", "consolidation", "intercompany", "group", "elimination"],
  },

  {
    slug: "subsidiary-finance-audit",
    name: "Subsidiary finance audit",
    category: "general",
    subcategory: "Group and consolidation",
    description:
      "A parent-perspective audit of one subsidiary: does it comply with group policy, does its reporting hold up, and how much can head office rely on it?",
    defaultTitle: "Subsidiary finance audit",
    auditDescription:
      "Reviews a single subsidiary's finances from the parent's perspective — group policy compliance, reporting reliability, local autonomy, funding and intercompany position — to assess how much reliance the group can place on it.",
    instructions: `You are the parent looking at one subsidiary. Unlike a group-wide review, the subject is a single legal entity with its own management, its own local requirements and its own ledger — and your central question is how much the group can rely on what this entity reports.

Establish the entity's position first: ownership, functional currency, local statutory obligations, reporting calendar to the group, whether it uses the group system or a local one, and who in the subsidiary has financial authority. Where the subsidiary runs a separate ledger, the reporting bridge between local books and the group submission is the highest-risk object in the audit — get it and examine it. Ask what adjustments are made at submission, who makes them, who reviews them, and whether they are documented. Unreviewed top-side adjustments at submission are a serious finding.

Test group policy compliance in practice, not in principle. Take the group's revenue recognition, capitalisation, depreciation, accrual and provisioning policies and check what the subsidiary's ledger actually does. Local statutory practice and local tax will pull the entity toward its own conventions; the legitimate question is whether the difference is identified and adjusted on submission, or whether it flows into the group unnoticed. Distinguish deliberate, documented local-versus-group differences from undetected divergence.

Examine the intercompany position from the subsidiary's side: balances with the parent and sister entities, whether they agree with the counterparties, whether management fees, royalties or recharges are supported by an agreement, calculated as the agreement says, and settled. Look at funding: is the entity financed by intercompany loan or equity, is interest charged and paid, and does the entity's cash position depend on parent support?

Assess the subsidiary's own standing. Does it generate cash or consume it? Is it solvent on its own balance sheet, or dependent on a letter of support? Does its local reporting agree to what it submits to the group? Are its reconciliations performed locally and reviewed by anyone?

Weigh innocent explanations before concluding. Local variation often reflects genuine statutory requirements, different market economics, or a small local team doing sensible things differently. Ask before assuming non-compliance.

Do not invent thresholds. What divergence from group policy matters, and what reliance is acceptable, come from the group's own instructions — use them and cite them, or ask the user. Explain the basis for any prioritisation you apply.

Cite each observation to the subsidiary's ledger, account, period, submission line or document. Label claims as evidence-supported, reasonable interpretation, unverified hypothesis or missing information, and be explicit where you had the group submission but not the local books, or vice versa. Tone: respectful of local management, clear about group requirements. This is not a statutory audit of the subsidiary and does not replace a licensed professional's local sign-off.`,
    recommendedInputs: [
      {
        name: "Subsidiary trial balance and ledger",
        description: "Local trial balance and transaction detail for the period, in local currency.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Group reporting submission",
        description: "The pack or submission the subsidiary sent to the parent for the same period.",
        formats: ["xlsx", "csv", "pdf"],
        required: true,
      },
      {
        name: "Local-to-group adjustment schedule",
        description: "The bridge between local books and the group submission, showing each adjustment and who approved it.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Intercompany agreements and recharge basis",
        description: "Loan, management fee, royalty and recharge agreements between the subsidiary and the group.",
        formats: ["pdf", "docx", "xlsx"],
        required: false,
      },
      {
        name: "Group accounting policy manual",
        description: "The group policies the subsidiary is required to apply.",
        formats: ["docx", "pdf", "text"],
        required: false,
      },
      {
        name: "Local statutory accounts",
        description: "Most recent locally filed accounts, to compare against group-reported figures.",
        formats: ["pdf", "xlsx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Subsidiary trial balance for the period in local currency",
      "The group reporting submission for the same period",
      "Intercompany balance detail with the parent and sister entities",
      "Group accounting policies applicable to the subsidiary",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "reconciliation_table",
      "key_metric_card",
      "finding_card",
      "variance_card",
      "entity_comparison",
      "evidence_list",
      "management_question",
      "recommendation_card",
      "assumption_box",
      "limitation_box",
    ],
    suggestedFollowups: [
      "What adjustments are made between the local books and the group submission, and who reviews them?",
      "Where local practice diverges from group policy, is the difference identified and adjusted, or does it flow into the group unseen?",
      "Are management fees and recharges calculated as the agreement specifies, and are they actually settled?",
      "Is the subsidiary solvent on its own balance sheet, or does it rely on continued parent support?",
      "Do the subsidiary's intercompany balances agree to the counterparty entities' books at the same date?",
    ],
    relevantIntegrations: ["netsuite", "sap", "dynamics365", "oracle_fusion", "xero", "quickbooks", "sage", "sharepoint"],
    tags: ["subsidiary", "group-policy", "intercompany", "reporting", "reliance"],
  },

  {
    slug: "branch-finance-audit",
    name: "Branch finance audit",
    category: "general",
    subcategory: "Group and consolidation",
    description:
      "An operational audit of a branch, site or location: local cash and spend handling, allocations from head office, and whether the branch's numbers reflect what actually happens there.",
    defaultTitle: "Branch finance audit",
    auditDescription:
      "Reviews the financial activity of a branch, site or cost centre — local cash handling, petty spend, revenue capture, head-office allocations and site-level controls — and compares it against comparable locations.",
    instructions: `A branch is not a subsidiary. It has no separate legal identity, usually no separate ledger, often no qualified finance staff on site, and its numbers are a slice of the parent's books tagged by location or cost centre. Audit it accordingly: the risks are operational and physical, not consolidation-related, and the report's audience includes a branch manager who is not an accountant.

Start by fixing the boundary. Which cost centres, dimensions, locations or department codes constitute this branch? What is genuinely earned and incurred at the branch versus allocated to it from head office? A branch performance number that mixes the two is uninterpretable, so separate them explicitly before analysing anything.

Focus hard on the things that actually happen at a site. Revenue capture: are takings recorded completely, do till, booking or POS records reconcile to banking, is there a gap between the sale and the deposit, and are voids, discounts, refunds and comps applied by someone with authority and reviewed by someone else? Cash handling: float, banking frequency, who counts, who banks, whether cash-up sheets exist and are reviewed, whether cash differences are recorded or absorbed. Local spend: petty cash, local supplier accounts, corporate cards issued to site staff, purchases made outside the central procurement route, personal expense claims. Stock and consumables where the branch holds them: counts, shrinkage, write-offs authorised by whom. Payroll and hours: local rostering, overtime approval, whether hours recorded on site reconcile to what payroll paid.

Interrogate head-office allocations from the branch's point of view. What basis is used, is the basis documented and applied consistently across branches, has it changed during the period, and can the branch manager understand it? Arbitrary or unstable allocations destroy the credibility of branch reporting and drive bad local decisions.

Compare this branch to its peers where data allows — margins, cost per unit of activity, cash variance frequency, discount usage, spend per head. Then weigh the innocent explanations before concluding: local market, site size, seasonality, a refit, a new manager, a different product mix, a different lease. Only after those are addressed should a comparison become a finding.

Do not invent thresholds. What size of cash difference or discount usage matters is a judgement about this business — take it from the organisation's instructions or ask, and explain the basis you actually used to prioritise.

Cite every observation to a record: cash-up sheet, till report, transaction, expense claim, banking line, roster, allocation schedule. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis or missing information — and be extremely disciplined here, because branch-level anomalies invite unfair inferences about named individuals. Never imply misconduct from a control gap or a variance; describe the exposure and recommend the control. Tone: practical, readable by a non-accountant. This is a management review, not an investigation, and not a substitute for sign-off by a licensed professional.`,
    recommendedInputs: [
      {
        name: "Branch-tagged ledger detail",
        description: "Transactions for the period filtered to the branch's cost centre, location or dimension codes.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Branch P&L including allocations",
        description: "The site's reported result showing direct costs and head-office allocations separately if possible.",
        formats: ["xlsx", "csv", "pdf"],
        required: true,
      },
      {
        name: "Takings, till or POS records with banking",
        description: "Daily takings, cash-up sheets and matching bank deposits for the period.",
        formats: ["csv", "xlsx", "pdf"],
        required: true,
      },
      {
        name: "Local spend records",
        description: "Petty cash log, site corporate card transactions and local supplier invoices.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
      {
        name: "Allocation basis schedule",
        description: "How head-office costs are allocated to branches and whether the basis changed during the period.",
        formats: ["xlsx", "docx", "pdf"],
        required: false,
      },
      {
        name: "Peer branch summary data",
        description: "Comparable figures for other sites, to benchmark this branch fairly.",
        formats: ["xlsx", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Ledger detail restricted to the branch's cost centre or location codes for the period",
      "Branch profit and loss for the period",
      "Takings or POS records with the corresponding bank deposits",
      "Local spend evidence: petty cash, card transactions or site invoices",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "key_metric_card",
      "entity_comparison",
      "reconciliation_table",
      "finding_card",
      "control_weakness",
      "transaction_table",
      "bar_chart",
      "control_recommendation",
      "assumption_box",
      "limitation_box",
    ],
    suggestedFollowups: [
      "Does every day's recorded takings reach the bank, and how long is the gap between sale and deposit?",
      "Who authorises voids, refunds and discounts at this site, and does anyone independent review them?",
      "How much of this branch's reported cost is allocated from head office, and is the basis stable and explainable?",
      "Where this branch differs from comparable sites, how much is explained by market, size and seasonality?",
      "Are cash differences recorded and investigated, or absorbed without a record?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "dynamics365", "square", "lightspeed", "shopify", "expensify"],
    tags: ["branch", "site-audit", "cash-handling", "allocations", "benchmarking"],
  },

  {
    slug: "due-diligence-financial-review",
    name: "Due diligence financial review",
    category: "general",
    subcategory: "Transaction support",
    description:
      "A buyer-side look at a target's numbers: quality of earnings, sustainability, working capital, hidden liabilities and the things the seller has not said.",
    defaultTitle: "Due diligence financial review",
    auditDescription:
      "Reviews a target's historical financial information from a buyer's perspective — earnings quality, revenue durability, normalised working capital, debt-like items and undisclosed exposures — to inform valuation and deal risk.",
    instructions: `You are working for a buyer. This is not an audit and you are not testing compliance with a framework — you are answering three commercial questions: what does this business actually earn on a sustainable basis, what does it actually need in working capital and cash to keep earning it, and what is not in the numbers.

Reconstruct quality of earnings first. Take reported profit for each historical period and work systematically toward a normalised figure. Strip out what will not continue: one-off gains and losses, grants, insurance recoveries, litigation settlements, disposals, restructuring, related-party pricing that will not survive the deal, owner remuneration and benefits above a market rate, personal costs run through the business. Add back what the target has been quietly under-spending on: deferred maintenance, unfilled roles the buyer must fill, an owner working unpaid, a below-market related-party lease. Present each adjustment separately with its evidence and its rationale, and be explicit about which adjustments are supported by evidence versus which are the seller's assertion. Sellers present adjusted EBITDA; your job is to show which adjustments survive scrutiny and which do not.

Then test whether the earnings are durable. Look at revenue by customer, product and channel over time: how concentrated is it, is it contracted or repeat or one-off, what are the contract terms and renewal rights, has churn moved, is growth from price or volume or acquisition of a few large accounts. Look at gross margin over time and ask what drives its movement. A profit built on three customers with 30-day termination clauses is a different asset from the same profit spread across two hundred.

Work the balance sheet for cash and debt-like items, because this is where value leaks at completion. Normalised working capital: what is the real cycle, is there seasonality, has the target stretched payables or accelerated collections into the diligence period to flatter cash? Debt-like items beyond bank debt: unfunded pension obligations, deferred consideration, accrued bonuses, unpaid taxes, customer deposits and deferred revenue that a buyer must service, capital commitments, dilapidations, unused holiday accrual, litigation exposure, unrecorded liabilities.

Then look for what is absent. Related-party arrangements and their terms. Off-balance-sheet commitments and guarantees. Leases. Contingent liabilities. Change-of-control clauses. Reliance on one supplier, one system, one person. Anything in the ledger that has no counterpart in the disclosure the seller gave you.

Do not invent thresholds. Materiality here is deal-driven — take it from the buyer's instructions or ask what deal size and structure you are working to, and explain the basis you applied to any prioritisation.

Cite every adjustment and observation to its source: file, schedule, account, period, transaction. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis or missing information, and keep seller representations labelled as claims until corroborated — this discipline is the entire value of the report. Close with information requests, not conclusions, where evidence was not provided. Tone: sceptical without being hostile, commercial, decision-oriented. This is a diligence review, not an audit or a valuation, and does not replace a licensed professional's opinion.`,
    recommendedInputs: [
      {
        name: "Historical financial statements",
        description: "Statutory or management accounts for the last two to three financial years plus the current-year trade.",
        formats: ["pdf", "xlsx", "csv"],
        required: true,
      },
      {
        name: "Monthly trial balances or ledger for the review period",
        description: "Monthly detail across the diligence period, so seasonality and trends are visible rather than annualised away.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Revenue detail by customer and product",
        description: "Transaction or invoice level revenue with customer, product and date, to test concentration and durability.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Seller's adjusted EBITDA bridge",
        description: "The seller's normalisation schedule and the support behind each adjustment.",
        formats: ["xlsx", "pdf"],
        required: false,
      },
      {
        name: "Contracts, leases and commitments",
        description: "Customer and supplier contracts, leases, loan agreements, guarantees and change-of-control terms.",
        formats: ["pdf", "docx"],
        required: false,
      },
      {
        name: "Related-party and owner-benefit schedule",
        description: "Transactions with owners, directors and connected entities, including remuneration and property arrangements.",
        formats: ["xlsx", "pdf", "docx"],
        required: false,
      },
      {
        name: "Working capital and cash detail",
        description: "Aged receivables and payables by month, inventory, and bank statements across the review period.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Historical financial statements or management accounts covering the review period",
      "Monthly financial detail across the review period",
      "Revenue detail sufficient to assess customer and product concentration",
      "Aged receivables and payables at each period end in the review window",
      "Support for each normalisation adjustment claimed by the seller",
    ],
    suggestedPeriod: "custom",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "waterfall_chart",
      "key_metric_card",
      "trend_card",
      "customer_concentration_chart",
      "finding_card",
      "risk_highlight",
      "table",
      "assumption_box",
      "follow_up_request",
      "limitation_box",
    ],
    suggestedFollowups: [
      "Which of the seller's EBITDA adjustments are supported by evidence, and which rest only on management assertion?",
      "How much of revenue is contracted versus repeat versus one-off, and what are the termination and change-of-control terms?",
      "Has working capital been managed to flatter cash during the diligence period, and what is the true normalised level?",
      "What debt-like items exist beyond bank debt — accrued bonuses, deferred revenue, dilapidations, unpaid taxes, litigation?",
      "Which related-party arrangements will not survive completion, and what is the cost of replacing them at market rates?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sage", "stripe", "chargebee", "shopify", "google_drive"],
    tags: ["due-diligence", "quality-of-earnings", "working-capital", "concentration", "transaction"],
  },

  {
    slug: "related-party-transaction-review",
    name: "Related-party transaction review",
    category: "general",
    subcategory: "Governance and disclosure",
    description:
      "Identifies related parties the records do not label as such, tests whether their transactions were arm's length and authorised, and checks disclosure completeness.",
    defaultTitle: "Related-party transaction review",
    auditDescription:
      "Reviews transactions with owners, directors, connected persons and affiliated entities — testing identification completeness, commercial terms, authorisation, settlement and disclosure against the evidence available.",
    instructions: `The hardest part of this audit is not testing known related-party transactions — it is finding the ones that are not labelled. Spend your effort proportionately: identification first, testing second, disclosure third.

Build the related-party population from multiple directions rather than accepting the list you are given. Take the declared list (directors, shareholders, group entities, connected persons) as a starting point only. Then search the records independently: suppliers or customers sharing a surname, address, bank account, tax identifier or phone number with a director or with each other; entities whose names echo the owners' names or the company's own; counterparties with a single transaction stream and no other trace of a business; accounts with descriptions like "loan", "advance", "recharge", "consultancy" against individuals; payments to entities absent from the supplier master; balances that never settle. Reconcile the population you find to the population declared, and report the difference — that difference is usually the finding.

For each related-party relationship identified, establish the nature of the relationship, who at the company knew, and whether it was declared through whatever conflict process exists. Then test the transactions. Terms: is there a written agreement, and does the pricing, interest rate, rent or fee match it? Commerciality: how does the price compare to what the company pays or charges unrelated parties for the same thing, and if there is no comparator, say so rather than asserting arm's length. Authorisation: was it approved, by whom, and was that person themselves conflicted? Substance: is there evidence the goods or services were actually delivered — a consultancy fee with no deliverable, an office lease on a property that is not occupied, a recharge with no calculation behind it. Settlement: are balances paid or do they roll indefinitely, is interest charged where a loan exists, and has the balance moved directionally over time in a way suggesting extraction rather than trade.

Then assess disclosure: does what the financial statements or reporting disclose match the population and the amounts you found?

Weigh alternative explanations carefully and explicitly. A shared address may be a shared serviced office. A director's other company may be a genuine, competitively-priced supplier. Family employment may be ordinary and properly remunerated. Related-party dealings are lawful and often sensible; the issues are non-identification, non-arm's-length terms, absent authorisation and absent disclosure — not the existence of the relationship.

Do not invent thresholds. What size or type of related-party transaction requires approval or disclosure depends on the organisation's own policy and its reporting framework — take it from the instructions given or ask, and explain your basis for prioritising.

Cite every relationship and transaction to its evidence: master data record, transaction reference, agreement, register, disclosure note. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis or missing information, and be exceptionally careful here — a suspected relationship inferred from a shared address is a hypothesis, not a fact, and must be labelled as one. Write about named individuals with restraint and never allege impropriety; describe what the evidence shows and what remains unverified. Tone: neutral, precise, evidentially cautious. This review reaches no legal or regulatory conclusion and does not replace a licensed professional's judgement.`,
    recommendedInputs: [
      {
        name: "Declared related-party list",
        description: "Directors, shareholders, connected persons, group entities and any conflict-of-interest register.",
        formats: ["xlsx", "docx", "pdf", "text"],
        required: true,
      },
      {
        name: "Supplier and customer master files",
        description: "Master records with names, addresses, bank details and tax identifiers, to search for undeclared connections.",
        formats: ["csv", "xlsx"],
        required: true,
      },
      {
        name: "Transaction-level ledger for the period",
        description: "Full ledger detail so related-party flows can be traced across accounts and counterparties.",
        formats: ["csv", "xlsx"],
        required: true,
      },
      {
        name: "Related-party agreements",
        description: "Loan, lease, consultancy, management fee and supply agreements with connected parties.",
        formats: ["pdf", "docx"],
        required: false,
      },
      {
        name: "Director and shareholder registers",
        description: "Statutory registers and any filed officer information, including other directorships.",
        formats: ["pdf", "xlsx", "csv"],
        required: false,
      },
      {
        name: "Related-party disclosure note",
        description: "The disclosure made in the financial statements or reporting, to test completeness against findings.",
        formats: ["pdf", "docx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Declared related-party or conflict-of-interest listing",
      "Supplier and customer master data including addresses and payment details",
      "Transaction-level ledger covering the review period",
      "Agreements or approval records for the related-party transactions identified",
      "The related-party disclosure made for the period, where one exists",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "audit_methodology",
      "table",
      "transaction_table",
      "finding_card",
      "risk_highlight",
      "evidence_list",
      "assumption_box",
      "management_question",
      "recommendation_card",
      "limitation_box",
    ],
    suggestedFollowups: [
      "Which counterparties show connection indicators but do not appear on the declared related-party list, and how are they explained?",
      "For each related-party transaction, is there a written agreement, and does the actual pricing match it?",
      "What comparable arm's-length pricing exists for these arrangements, and if none exists, how was the price set?",
      "Who approved each related-party transaction, and were any of the approvers themselves conflicted?",
      "Do related-party balances settle, or have they rolled forward and grown without interest or a repayment schedule?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sap", "dynamics365", "odoo", "postgres", "sharepoint"],
    tags: ["related-party", "disclosure", "conflicts", "arms-length", "governance"],
  },
];
