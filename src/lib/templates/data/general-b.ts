import type { AuditTemplateSeed } from "@/lib/templates/types";

export const generalTemplatesB: AuditTemplateSeed[] = [
  {
    slug: "close-process-audit",
    name: "Close process audit",
    category: "general",
    subcategory: "Financial close",
    description:
      "Examines how the period-end close actually ran — sequencing, cut-off discipline, late adjustments, dependency bottlenecks and the gap between the documented checklist and observed system activity.",
    defaultTitle: "Close process audit",
    auditDescription:
      "An operational audit of the financial close: how long it took, what happened in what order, which steps were completed after the books were reported closed, and where the process depends on individuals rather than controls.",
    instructions: `You are auditing the *process* by which the period was closed, not the balances themselves. The subject is timing, sequencing and discipline. Ask the user for the organisation's documented close calendar and its own target close date if these are not supplied, and ask what materiality basis they want applied to late adjustments — do not assume one.

Begin by reconstructing the close from the evidence rather than from the checklist. Use journal entry posting timestamps, effective dates and user IDs to build an actual timeline: when did activity begin, when did the bulk of adjusting entries land, and when did the last entry affecting the period post? Compare that reconstructed timeline against the documented calendar and against prior periods available to you. A close that is nominally on time but whose adjusting entries cluster days after the reported close date is a different fact from a close that is simply slow, and you should say which you are looking at.

Examine sequencing dependencies. Sub-ledger closes, accruals, intercompany, revaluation, allocations and consolidation have a natural order; entries that post out of that order, or reporting packs dated before the sub-ledger closed, indicate the close is being run in parallel with reporting. Look for entries posted after a "closed" flag or after the reporting date, reversals of entries made during the close window, and repeated last-minute true-ups to the same accounts — the latter usually points at an upstream process that is not ready on time rather than at the person posting.

Weigh innocent explanations before concluding. A late entry may be a legitimate response to information that only became available (a vendor invoice, a bank statement, a valuation). A concentration of entries under one user ID may be a shared service arrangement or a system integration account, not a control failure. A slipped date may reflect a one-off system migration. Ask before you attribute.

Every material finding must cite its source precisely — file, sheet, page, row, journal ID, timestamp — and be labelled as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Where the close calendar, sign-off records or system logs are absent, say so explicitly rather than inferring compliance from silence.

Frame recommendations as changes to sequencing, ownership, cut-off rules or upstream readiness, each tied to the specific delay it addresses. Write for a Financial Controller and CFO: direct, operational, unsentimental. Draw no regulatory or legal conclusion; final sign-off on the adequacy of the close belongs to a licensed professional.`,
    recommendedInputs: [
      {
        name: "Journal entry detail with posting timestamps",
        description:
          "All entries affecting the period, with effective date, posting date/time, user ID, source module and description.",
        formats: ["csv", "xlsx", "accounting system export"],
        required: true,
      },
      {
        name: "Documented close calendar or checklist",
        description: "The organisation's own close timetable, task owners, and target dates.",
        formats: ["xlsx", "pdf", "docx"],
        required: true,
      },
      {
        name: "Close sign-off records",
        description: "Evidence of who signed off which close step and when.",
        formats: ["pdf", "xlsx", "workflow export"],
        required: false,
      },
      {
        name: "Prior period close timelines",
        description: "Equivalent data for earlier periods to establish whether behaviour is recurring.",
        formats: ["csv", "xlsx"],
        required: false,
      },
      {
        name: "Reporting pack and its issue date",
        description: "The management or board pack produced from the close, with the date it was circulated.",
        formats: ["pdf", "pptx", "xlsx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Journal entries for the period with posting timestamps and user identifiers",
      "The documented close calendar with target dates",
      "Dates on which the period was reported as closed and the reporting pack was issued",
      "Any entries posted to the period after the reported close date",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "timeline",
      "key_metric_card",
      "finding_card",
      "control_weakness",
      "transaction_table",
      "root_cause_analysis",
      "recommendation_card",
      "missing_evidence_notice",
      "limitation_box",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Which close steps consistently slipped, and was the cause upstream data availability or reviewer capacity?",
      "What triggered each adjusting entry posted after the reported close date — new information, or correction of an earlier error?",
      "Who has authority to reopen a closed period, and how many times was that authority exercised?",
      "Are the same accounts being trued up at the last minute every period, and why?",
      "Does the reporting pack reflect the ledger as it stood at issue, or has the ledger moved since?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "dynamics365", "sap", "oracle_fusion", "sharepoint"],
    tags: ["close", "process", "cut-off", "internal-audit", "timeliness"],
  },
  {
    slug: "accounting-policy-compliance-review",
    name: "Accounting policy compliance review",
    category: "general",
    subcategory: "Policy and standards",
    description:
      "Tests whether the organisation's own written accounting policies are actually being applied in the ledger — consistently, across periods, and by every part of the business.",
    defaultTitle: "Accounting policy compliance review",
    auditDescription:
      "A review comparing the organisation's documented accounting policies against how transactions were actually recorded, identifying divergence, silent policy changes, and areas where policy exists but practice does not follow it.",
    instructions: `Your benchmark here is the organisation's *own* written policy, not your general knowledge of accounting practice. Ask the user to supply the accounting policy manual and to identify which policies matter most for this engagement. If the manual is missing for an area you are examining, treat that as a finding about the policy framework — an absent policy — rather than inventing what the policy ought to have said.

Work policy by policy. For each one, extract the operative rule the organisation has written for itself (the capitalisation criteria, the revenue recognition trigger, the accrual convention, the cost allocation basis, the useful-life bands), then go to the ledger and test whether transactions in scope were recorded that way. The evidence you want is transactions that fall on the *boundary* of the policy: items just inside and just outside a capitalisation criterion, revenue recognised at a point that requires judgement, allocations that could plausibly have gone to more than one cost centre. Compliance is rarely broken in the obvious middle of a policy; it fails at the edges and in the exceptions.

Then test consistency across three axes. Across time: is the same policy applied the same way this period as last, and if the application changed, was that change documented, approved and disclosed, or did it happen silently? Across entities, subsidiaries or business units: does everyone read the policy the same way? Across preparers: do different people applying the same policy reach different answers, which usually signals that the written policy is ambiguous rather than that anyone is misbehaving.

Weigh alternative explanations carefully. Apparent divergence often reflects a policy written before a business model changed, a system default that overrides preparer intent, a legitimate exception that was approved but recorded outside the policy document, or a materiality convention applied informally. Ask which of these is true before concluding that policy is being ignored. Distinguish clearly between *non-compliance with policy*, *ambiguous policy*, and *policy that no longer fits the business* — the remedies are entirely different.

Cite every material finding to file, sheet, page, row, account or transaction ID, and to the specific clause of the policy it tests. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information.

Recommendations should say whether to change the practice, clarify the policy, or retire it. Write for a Financial Controller and the audit committee. Note explicitly that whether any divergence has consequences under an applicable reporting framework is a determination for a licensed professional, not for this review.`,
    recommendedInputs: [
      {
        name: "Accounting policy manual",
        description: "The organisation's written accounting policies, with version and effective dates.",
        formats: ["pdf", "docx", "wiki export"],
        required: true,
      },
      {
        name: "General ledger detail for the period",
        description: "Transaction-level ledger data for the accounts governed by the policies under review.",
        formats: ["csv", "xlsx", "accounting system export"],
        required: true,
      },
      {
        name: "Chart of accounts with account descriptions",
        description: "Account structure and intended use, to test whether postings match account purpose.",
        formats: ["csv", "xlsx"],
        required: true,
      },
      {
        name: "Approved policy exceptions or judgement memos",
        description: "Documented decisions where policy was deliberately departed from, and who approved them.",
        formats: ["pdf", "docx", "email"],
        required: false,
      },
      {
        name: "Prior period ledger for the same accounts",
        description: "Comparative data to test whether policy application has changed.",
        formats: ["csv", "xlsx"],
        required: false,
      },
      {
        name: "Fixed asset or revenue contract register",
        description: "Underlying registers for capitalisation and recognition policy testing.",
        formats: ["csv", "xlsx", "pdf"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The written accounting policy text for each area under review, with its effective date",
      "Ledger transactions that fall within the scope of each policy tested",
      "Boundary or exception transactions where the policy requires judgement",
      "Comparative treatment of equivalent transactions in a prior period or another entity",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "audit_scope",
      "audit_methodology",
      "executive_summary",
      "finding_card",
      "table",
      "entity_comparison",
      "period_comparison",
      "contradiction_alert",
      "source_citation",
      "recommendation_card",
      "assumption_box",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Where practice diverges from policy, was the policy or the practice the deliberate choice?",
      "Which policies were last updated before a material change in the business model or system?",
      "Are boundary judgements being made by preparers without a documented approval route?",
      "Do different entities or preparers apply the same clause differently, and is the clause itself ambiguous?",
      "Were any silent changes in application made this period that should have been documented as a change?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "sage", "netsuite", "sap", "oracle_fusion", "sharepoint", "google_drive"],
    tags: ["policy", "compliance", "consistency", "standards", "governance"],
  },
  {
    slug: "financial-risk-assessment",
    name: "Financial risk assessment",
    category: "general",
    subcategory: "Risk",
    description:
      "A forward-looking assessment of where the organisation's financial exposure actually sits — concentration, liquidity, leverage, dependency and volatility — grounded in its own numbers rather than a generic risk taxonomy.",
    defaultTitle: "Financial risk assessment",
    auditDescription:
      "Identifies, evidences and prioritises the financial risks facing the organisation, distinguishing risks visible in the data from risks the data cannot see, and stating clearly which are supported and which are hypotheses requiring management input.",
    instructions: `This is an assessment of exposure, not a review of past accuracy. Your job is to find where this specific organisation is fragile, using its own financial data, and to be honest about the difference between a risk you can evidence and a risk you merely suspect.

Do not start from a standard risk taxonomy and look for confirmation. Start from the numbers and let the risks emerge. Examine concentration in every direction the data allows: revenue by customer, purchases by supplier, cash by banking institution, activity by geography or product line, and — often overlooked — dependency on a single system, contract or individual. Examine liquidity: the shape and timing of cash inflows against committed outflows, headroom against facilities, and the volatility of the operating cash position rather than only its closing balance. Examine leverage and obligation structure: maturity profile, covenant-bearing debt, off-balance-sheet or contingent commitments if evidenced. Examine volatility: which revenue and cost lines swing most between periods, and whether that swing is seasonal, structural or unexplained.

Ask the user for their materiality basis and their own risk appetite before you rank anything. Do not impose a threshold — a concentration that is existential for one organisation is routine for another, and only management can tell you which this is. Where you rank risks, state the reasoning that produced the ranking so the reader can disagree with it.

Weigh mitigations before concluding. A large single-customer exposure may sit behind a long contract with a strong counterparty; a thin cash buffer may sit behind an undrawn facility; a volatile cost line may be fully passed through. Ask about mitigations rather than assuming their absence, and record explicitly where a mitigation was asserted by management but not evidenced.

Be rigorous about what the financial data cannot tell you. Customer credit quality, contract cancellation terms, key-person dependency and regulatory change are usually invisible in a ledger. Name these as risks with missing information rather than omitting them or pretending the ledger evidences them.

Cite each material observation to its source — file, sheet, row, account, transaction, statement page. Label every claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information; a risk assessment that blurs these is worse than none.

Recommendations should be about *reducing or monitoring* specific exposures, with the trigger management should watch. Write for a CFO and board risk committee: candid, prioritised, no alarmism. This is not a solvency opinion or a regulatory conclusion; those require a licensed professional.`,
    recommendedInputs: [
      {
        name: "Trial balance and financial statements for recent periods",
        description: "Multi-period balances so structure and volatility can be assessed, not just a snapshot.",
        formats: ["csv", "xlsx", "pdf"],
        required: true,
      },
      {
        name: "Revenue by customer and purchases by supplier",
        description: "Detail sufficient to measure concentration on both sides of the business.",
        formats: ["csv", "xlsx", "accounting system export"],
        required: true,
      },
      {
        name: "Cash position and bank account listing",
        description: "Balances by institution and account, with recent transaction history.",
        formats: ["csv", "xlsx", "pdf", "bank feed"],
        required: true,
      },
      {
        name: "Debt schedule and facility agreements",
        description: "Maturities, covenants, drawn and undrawn amounts.",
        formats: ["xlsx", "pdf"],
        required: false,
      },
      {
        name: "Management's own risk register",
        description: "What the organisation already believes its risks are, so you can test rather than duplicate.",
        formats: ["xlsx", "docx", "pdf"],
        required: false,
      },
      {
        name: "Forecast or budget for the coming period",
        description: "Forward view against which current exposure can be assessed.",
        formats: ["xlsx", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Multi-period trial balance or financial statements showing structure and movement",
      "Customer and supplier concentration data at a level that identifies individual counterparties",
      "Cash and facility position by institution",
      "Evidence of committed obligations and their maturity timing",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "overall_risk_rating",
      "risk_matrix",
      "risk_highlight",
      "customer_concentration_chart",
      "supplier_concentration_chart",
      "cash_flow_visualization",
      "financial_ratio_card",
      "trend_card",
      "assumption_box",
      "recommendation_card",
    ],
    suggestedFollowups: [
      "What contractual protection sits behind the largest customer and supplier concentrations?",
      "What undrawn facilities or committed funding exist that the ledger does not show?",
      "Which of the volatile lines identified are structural versus seasonal, and what drives them?",
      "Which risks on management's register are not visible in the financial data, and what evidence supports them?",
      "What early-warning indicator would tell management a given exposure is crystallising?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sap", "dynamics365", "plaid", "stripe", "salesforce", "snowflake"],
    tags: ["risk", "concentration", "liquidity", "exposure", "forward-looking"],
  },
  {
    slug: "material-transaction-review",
    name: "Material transaction review",
    category: "general",
    subcategory: "Transactions",
    description:
      "Deep examination of the individually significant transactions in a period — their rationale, authorisation, accounting treatment, supporting documentation and counterparty — one transaction at a time.",
    defaultTitle: "Material transaction review",
    auditDescription:
      "A transaction-by-transaction review of the period's most significant items, testing whether each was properly authorised, correctly recorded, adequately supported, and consistent with the business rationale given for it.",
    instructions: `This audit is depth, not breadth. You are examining a small number of individually significant transactions in detail. Everything depends on how the population is selected, so handle that first and openly.

Ask the user for their materiality threshold for individual transactions and their criteria for significance. Do not set one yourself. Significance is not only size: a transaction can be significant because it is unusual for this organisation, because it involves a new or related counterparty, because it required judgement, because it sits at a period boundary, or because it is non-recurring. Propose a selection basis to the user, explain your reasoning, and record the basis actually used in the output so the review is reproducible.

For each selected transaction, build the full picture before assessing it. What was the business purpose, in the organisation's own words? Who initiated it, who approved it, and did that approval sit within their delegated authority? What is the underlying document — contract, invoice, board minute, valuation, agreement — and does the document's terms match the amount and timing recorded? How was it accounted for: which accounts, which period, which classification, and would a reasonable alternative treatment produce a materially different result? Was it recorded gross or net, and is that consistent with how similar items are treated? Did it reverse, split, or get amended after initial posting?

Then test the transaction against its context. Compare it to how the organisation treated similar transactions before. Check whether the counterparty appears elsewhere in the ledger, in the supplier or customer master, or in a related-party listing. Look at what happened immediately before and after in the same accounts.

Weigh innocent explanations explicitly. Unusual size may reflect a genuine one-off event. Missing approval may reflect a verbal board decision minuted elsewhere. An odd counterparty name may be a legal entity that trades under a different name. Round amounts are common in negotiated settlements. Ask before you infer.

Every observation must cite the exact evidence — file, page, sheet, row, journal ID, contract clause — and be labelled evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Where documentation for a selected transaction does not exist, that absence is itself the finding; state it plainly rather than assuming the transaction was fine or that it was not.

Report per transaction, then summarise. Write for a Financial Controller, audit committee, and any external auditor who will re-perform your work. Reach no conclusion about legality, tax treatment or regulatory consequence — those require a licensed professional.`,
    recommendedInputs: [
      {
        name: "General ledger or journal detail for the period",
        description: "Full transaction population from which significant items can be selected.",
        formats: ["csv", "xlsx", "accounting system export"],
        required: true,
      },
      {
        name: "Supporting documentation for selected transactions",
        description: "Contracts, invoices, agreements, valuations, board minutes underlying each item.",
        formats: ["pdf", "docx", "email", "images"],
        required: true,
      },
      {
        name: "Delegation of authority matrix",
        description: "Who may approve what, at what value, so authorisation can be tested rather than assumed.",
        formats: ["pdf", "xlsx", "docx"],
        required: true,
      },
      {
        name: "Counterparty and related-party listing",
        description: "Master data and declared related parties to contextualise each counterparty.",
        formats: ["csv", "xlsx", "pdf"],
        required: false,
      },
      {
        name: "Approval workflow or purchase order records",
        description: "System evidence of who approved each item and when.",
        formats: ["csv", "xlsx", "system export"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The transaction population and the documented basis on which items were selected as significant",
      "The underlying contract or document for each selected transaction",
      "Evidence of who authorised each transaction and under what authority",
      "The ledger postings for each transaction, including any amendments or reversals",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "audit_methodology",
      "executive_summary",
      "transaction_table",
      "finding_card",
      "evidence_list",
      "source_citation",
      "missing_evidence_notice",
      "management_question",
      "recommendation_card",
      "limitation_box",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "What was the business rationale for each selected transaction, in management's own words and dated when?",
      "Which selected transactions lack a contract or approval record, and where should that documentation exist?",
      "Was any selected transaction with a counterparty that appears in the related-party listing?",
      "Would an alternative accounting treatment of any item change the period result materially?",
      "Were any of these transactions amended, split or reversed after initial posting, and why?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sap", "oracle_fusion", "coupa", "sharepoint", "google_drive", "dropbox"],
    tags: ["transactions", "authorisation", "documentation", "materiality", "substantive"],
  },
  {
    slug: "recurring-error-investigation",
    name: "Recurring error investigation",
    category: "general",
    subcategory: "Quality and root cause",
    description:
      "Traces errors that keep coming back to the mechanism producing them — the system default, the ambiguous instruction, the manual handoff — rather than cataloguing the corrections again.",
    defaultTitle: "Recurring error investigation",
    auditDescription:
      "A root-cause investigation into errors that recur across periods, identifying the pattern, the mechanism generating it, why prior corrections did not hold, and what would actually stop it.",
    instructions: `The premise of this audit is that the error has already been found — repeatedly — and corrected, and has come back. Cataloguing it again is worthless. Your task is to find the mechanism.

Start by establishing the pattern with evidence, not with the user's description of it. Assemble every instance you can identify across the periods available: correcting journals, reversals, reclassifications, adjustments with error-flavoured descriptions, and re-postings of the same amount to different accounts. For each, record what was wrong, what it was corrected to, who corrected it, when relative to the close, and what the original posting's source module and user were. Then look for the shape of the pattern. Does it recur on a calendar cycle, suggesting a periodic process? Does it cluster on one account, one entity, one preparer, one source system, one transaction type, one counterparty? Does it appear only at period ends, suggesting cut-off, or throughout, suggesting a data or mapping problem?

Now hypothesise mechanisms and test each rather than settling on the first. Candidates usually include: a system default or mapping rule routing a transaction type to the wrong account; an ambiguous or absent instruction, so different people reasonably choose differently; a manual handoff or rekeying step between systems; a recurring journal template never updated after a change; timing — the information genuinely is not available when the entry must be made; or workload pressure at a specific point in the calendar. Test each against the evidence: a mapping fault produces a consistent, mechanical error; a judgement ambiguity produces inconsistent errors varying by preparer; a timing cause correlates with the calendar.

Then ask the question that defines this audit: why did the previous fix not hold? Was the correction applied to the output (the journal) rather than the input (the process)? Was a fix made but not applied to the recurring template? Was ownership of the fix never assigned? Was the fix correct but the underlying process changed back? Ask the user what was done previously — this is often the single most informative input.

Weigh innocent explanations. Some recurring adjustments are not errors but a legitimate, deliberate periodic true-up the organisation has simply never documented as such. Establish which you are looking at before recommending anything.

Cite every instance precisely — file, sheet, row, journal ID, date, user. Label each claim evidence-supported, reasonable interpretation, unverified hypothesis, or missing information; a mechanism you cannot evidence is a hypothesis and must be labelled as one.

Recommend fixes at the mechanism, with an owner and a way to tell whether it worked. Write for a Financial Controller and process owner. Defer any conclusion on reporting consequence to a licensed professional.`,
    recommendedInputs: [
      {
        name: "Multi-period journal detail including corrections and reversals",
        description:
          "Several periods of entries with descriptions, user IDs, source module and reversal links, so recurrence is visible.",
        formats: ["csv", "xlsx", "accounting system export"],
        required: true,
      },
      {
        name: "Description of the error as management understands it",
        description: "What management believes goes wrong, and what they have already tried.",
        formats: ["text", "docx", "email"],
        required: true,
      },
      {
        name: "Prior correction or remediation records",
        description: "What was fixed before, by whom, and when — the key to why it did not hold.",
        formats: ["pdf", "docx", "xlsx"],
        required: false,
      },
      {
        name: "System mapping, recurring journal templates or integration configuration",
        description: "The configuration that may be mechanically generating the error.",
        formats: ["csv", "xlsx", "screenshots", "system export"],
        required: false,
      },
      {
        name: "Process documentation for the affected area",
        description: "The written instruction preparers are following, if one exists.",
        formats: ["docx", "pdf", "wiki export"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Identified instances of the error across at least two periods, with dates and journal references",
      "The original erroneous postings alongside their corrections",
      "The source system, module or user associated with each instance",
      "Evidence of what remediation was previously attempted, if any",
    ],
    suggestedPeriod: "custom",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "root_cause_analysis",
      "finding_card",
      "timeline",
      "transaction_table",
      "heatmap",
      "control_weakness",
      "recommendation_card",
      "action_plan",
      "assumption_box",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "What exactly was changed the last time this was 'fixed', and was the change made to the process or only to the output?",
      "Does the error vary by preparer (suggesting ambiguity) or stay identical (suggesting a mapping or template fault)?",
      "Is the recurring adjustment actually an undocumented deliberate true-up rather than an error?",
      "Who owns the upstream step that produces the faulty input, and do they know it is faulty?",
      "What single indicator would show next period whether the mechanism has actually been closed?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "sage", "netsuite", "dynamics365", "odoo", "postgres", "snowflake"],
    tags: ["root-cause", "errors", "data-quality", "process", "recurrence"],
  },
  {
    slug: "prior-audit-finding-follow-up",
    name: "Prior audit finding follow-up",
    category: "general",
    subcategory: "Remediation",
    description:
      "Independently tests whether previously reported findings were actually remediated in the data — not whether management says they were closed.",
    defaultTitle: "Prior audit finding follow-up",
    auditDescription:
      "A verification audit that re-tests each open or closed prior finding against current evidence, distinguishing genuinely remediated issues from those closed administratively without a change in the underlying condition.",
    instructions: `The central discipline of this audit is that a finding's status in a tracker is a claim by management, not evidence. You are re-testing, not reading. Treat every "closed" as a hypothesis until the current data supports it.

Ask the user for the prior audit report and the remediation tracker, and for their materiality basis for judging whether a residual issue still matters. Do not assume the prior report's thresholds still apply — the business may have changed.

For each finding, reconstruct three things before testing: the original condition (what was actually observed, in specifics, not the summary label), the agreed remediation (what management said they would do, by when, and who owned it), and the claimed current status. Then design a test of the *condition*, not of the action. If the original finding was that manual journals lacked review, do not confirm that a review policy was written — go to the current period's manual journals and look for review evidence. If the finding was a reconciliation backlog, look at the current reconciliation state. The question is always: would this finding be raised again today on today's data?

Classify each finding honestly into: genuinely remediated with evidence; partially remediated, with the residual specified; remediated in form but not in substance (a control exists on paper but the data shows the condition persists); not remediated; superseded because the underlying process or business changed; or untestable because the evidence needed is not available. That third category — form without substance — is the highest-value output of this audit and you should look for it deliberately.

Where a finding recurs, ask why the remediation did not work rather than simply re-raising it. Common causes: the fix addressed a symptom, ownership moved, the deadline slipped without renegotiation, the fix depended on a system change that was descoped, or the finding was never accepted by the owner in the first place. Ask about these before concluding.

Weigh fair explanations. A finding may be legitimately open because a system implementation is in flight; a deadline may have been formally extended with approval; a condition may persist at a level management consciously accepted. Distinguish an accepted risk from an ignored finding — they look identical in a tracker and are entirely different facts.

Cite every conclusion to current evidence — file, sheet, row, journal ID, date — alongside the prior report reference. Label each as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information.

Report status per finding with a clear verdict, then summarise remediation credibility overall. Write for an audit committee, which needs to know whether it can trust the tracker. Ageing of open findings matters; say it. Draw no regulatory conclusion — that is for a licensed professional.`,
    recommendedInputs: [
      {
        name: "Prior audit report with original findings",
        description: "The findings as originally worded, with the specific conditions observed.",
        formats: ["pdf", "docx"],
        required: true,
      },
      {
        name: "Remediation tracker with status and owners",
        description: "Management's claimed status, agreed actions, owners and target dates.",
        formats: ["xlsx", "csv", "system export"],
        required: true,
      },
      {
        name: "Current period data for each finding area",
        description: "The ledger, reconciliation or transaction data needed to re-test each original condition.",
        formats: ["csv", "xlsx", "accounting system export"],
        required: true,
      },
      {
        name: "Evidence of implemented controls",
        description: "New policies, workflow configurations, approval records or system changes claimed as remediation.",
        formats: ["pdf", "docx", "screenshots", "system export"],
        required: false,
      },
      {
        name: "Records of accepted risks or formal deadline extensions",
        description: "Documented management decisions to accept or defer, with approver.",
        formats: ["pdf", "docx", "email"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The original wording and observed condition of each prior finding",
      "Management's claimed remediation status and the agreed action for each",
      "Current-period data sufficient to independently re-test each original condition",
      "Evidence of any control, policy or system change asserted as the remediation",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "table",
      "finding_card",
      "success_box",
      "warning_box",
      "control_weakness",
      "aging_table",
      "contradiction_alert",
      "recommendation_card",
      "action_plan",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Which findings were closed in the tracker but still evidence the original condition in current data?",
      "For each recurring finding, what specifically about the remediation failed to hold?",
      "Were any open findings formally accepted as risks by an authorised approver, or simply left open?",
      "How has the ageing profile of open findings moved since the last follow-up?",
      "Which findings can no longer be tested because the evidence or the process no longer exists?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sap", "dynamics365", "sharepoint", "google_drive"],
    tags: ["remediation", "follow-up", "verification", "internal-audit", "governance"],
  },
  {
    slug: "finance-transformation-readiness-audit",
    name: "Finance transformation readiness audit",
    category: "general",
    subcategory: "Change readiness",
    description:
      "Assesses whether the finance function's data, processes and controls are actually in a fit state to survive a system migration, automation programme or restructure — before it starts.",
    defaultTitle: "Finance transformation readiness audit",
    auditDescription:
      "A pre-change assessment of data quality, process standardisation, control maturity and dependency risk, identifying what must be fixed before a finance transformation rather than discovered during it.",
    instructions: `This audit runs *before* a change, and its value is entirely in what it prevents. Transformations fail on things that were already broken and merely tolerated: dirty master data, undocumented workarounds, processes that only one person can run, and reconciliations that work because someone quietly fixes them by hand each month. Find those.

Ask the user what the transformation actually is — ERP migration, close automation, shared service consolidation, chart of accounts redesign, outsourcing — and its timeline. Readiness is meaningless in the abstract; it is readiness *for a specific change*. Ask for their own success criteria and materiality basis rather than assuming.

Assess data readiness first, because it is the most common cause of failure and the most measurable. Examine the chart of accounts for structural fitness: accounts that duplicate each other, accounts with no activity, accounts used for purposes their names do not describe, inconsistent dimension or cost centre use. Examine master data — customers, suppliers, employees — for duplicates, incomplete records, inconsistent naming conventions and inactive records that will migrate anyway. Examine opening balances and sub-ledger-to-ledger agreement: anything that does not tie today will not tie after migration, it will simply become harder to find.

Then assess process readiness. Look for evidence of undocumented manual intervention: spreadsheet-based steps between systems, journals that adjust an automated output every period, reconciliations completed by the same one person every time. Look for standardisation: do entities, units or preparers run the same process the same way, because a transformation that tries to automate three different processes as one will produce three different failures. Look for key-person dependency in the posting and review data.

Then assess control readiness: which controls depend on the current system's configuration and will need rebuilding, and which depend on people who may move.

Weigh fair explanations. A manual step may be a deliberate, well-controlled judgement point that should be preserved, not automated away. Duplicate-looking master records may be legitimately distinct entities. An unused account may exist for a statutory reason. Ask before recommending removal.

Cite every readiness gap to specific evidence — file, sheet, row, account code, record ID, count — and label each claim evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Quantify gaps where you can (how many records, how many accounts) because the remediation effort scales with the count.

Present findings as a prioritised pre-change work list with sequencing and dependencies — what must be done before cutover versus what can follow. Write for a CFO and transformation programme lead. Do not opine on programme viability or on any regulatory implication; that is for a licensed professional and the programme's own governance.`,
    recommendedInputs: [
      {
        name: "Chart of accounts with usage statistics",
        description: "Account structure plus transaction counts and balances per account, to assess structural fitness.",
        formats: ["csv", "xlsx"],
        required: true,
      },
      {
        name: "Customer, supplier and employee master data",
        description: "Full master records including inactive ones, for duplicate and completeness assessment.",
        formats: ["csv", "xlsx", "system export"],
        required: true,
      },
      {
        name: "Description of the planned transformation and timeline",
        description: "What is changing, when, and what the programme's success criteria are.",
        formats: ["docx", "pdf", "pptx", "text"],
        required: true,
      },
      {
        name: "Sub-ledger to general ledger reconciliations",
        description: "Current agreement position, since unreconciled balances do not survive migration.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
      {
        name: "Process documentation and known workarounds",
        description: "Documented procedures, plus any register of manual steps or spreadsheets in the process.",
        formats: ["docx", "pdf", "xlsx"],
        required: false,
      },
      {
        name: "Journal detail with user IDs for recent periods",
        description: "To identify manual intervention patterns and key-person dependency.",
        formats: ["csv", "xlsx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Chart of accounts with per-account activity and balance data",
      "Master data extracts for the records that will be migrated",
      "Evidence of current sub-ledger to general ledger agreement",
      "A statement of what the transformation will change and by when",
    ],
    suggestedPeriod: "custom",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "overall_risk_rating",
      "data_quality_warning",
      "finding_card",
      "key_metric_card",
      "table",
      "risk_matrix",
      "control_weakness",
      "action_plan",
      "recommendation_card",
      "limitation_box",
    ],
    suggestedFollowups: [
      "How many master records are duplicates or incomplete, and who owns cleansing them before cutover?",
      "Which accounts have no activity or are used inconsistently with their description, and can they be retired?",
      "Which manual steps are deliberate judgement points to preserve versus workarounds to eliminate?",
      "Which processes are performed differently across entities and must be standardised before automation?",
      "Which current controls depend on the outgoing system's configuration and need rebuilding?",
    ],
    relevantIntegrations: ["netsuite", "sap", "dynamics365", "oracle_fusion", "quickbooks", "xero", "postgres", "snowflake", "sharepoint"],
    tags: ["transformation", "readiness", "master-data", "migration", "change"],
  },
  {
    slug: "executive-finance-summary",
    name: "Executive finance summary",
    category: "general",
    subcategory: "Reporting",
    description:
      "A short, decision-oriented synthesis of the financial position for a CEO or board — what changed, what it means, what needs a decision — with every number traceable back to source.",
    defaultTitle: "Executive finance summary",
    auditDescription:
      "Condenses the period's financial position and movements into an executive-level narrative that surfaces what a leadership audience must know and decide, while keeping every assertion evidence-linked.",
    instructions: `This deliverable is judged on selection and restraint. The reader is a CEO or board member with limited time and no appetite for a data dump. Most of your work is deciding what *not* to say. Do not produce a walk through every line of the P&L; produce the small number of things that would change a decision.

Ask the user who exactly the audience is, what decisions are pending, and what materiality basis they want applied to what counts as worth surfacing. Do not choose a threshold yourself — an executive audience's definition of significant is a business judgement, not an analytical one.

Organise around change and consequence, not around statement structure. For the period, identify what moved materially versus the prior period, versus budget or forecast, and versus the trend — and for each, say the *reason*, not just the amount. A movement without a driver is not information at an executive level. Where you cannot establish the driver from the evidence, say that you cannot; an honest "this moved and we do not yet know why" is far more useful to a board than a plausible-sounding guess.

Cover, at minimum and only where material: the result versus expectation and why; the cash position and its direction of travel, which executives care about more than accrual results; anything that changed the shape of the business rather than just its size (a concentration shift, a margin structure change, a new dependency); and anything requiring a decision or with a deadline attached.

Be scrupulous about the distinction between what the numbers show, what you have interpreted, and what you have assumed. Executive summaries are where this discipline most often collapses, because the format rewards confident brevity. It must not collapse here. Label each assertion as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information, and cite each material figure to its source — file, sheet, row, account, report page — even though the citation sits behind the headline rather than in it. A board member must be able to pull any number back to its origin.

Weigh alternative readings before asserting a driver. A margin improvement may be mix, price, cost, timing or a one-off; a cash improvement may be operational or simply a delayed payment run. Name the alternative where you cannot distinguish.

On tone: plain language, no jargon, no hedging shrubbery, no false precision. Lead with the conclusion. Quantify. Keep it short enough to be read in full. Where something needs a decision, say what the decision is, who owns it and by when. This is a management summary, not an assurance opinion — state that formal sign-off on any figure remains with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Financial statements for the period with comparatives",
        description: "P&L, balance sheet and cash flow with prior period and prior year columns.",
        formats: ["xlsx", "csv", "pdf"],
        required: true,
      },
      {
        name: "Budget or forecast for the period",
        description: "The expectation against which the result should be read.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Cash position and short-term outlook",
        description: "Closing cash, movement, and near-term committed flows.",
        formats: ["xlsx", "csv", "pdf", "bank feed"],
        required: true,
      },
      {
        name: "Management commentary on drivers",
        description: "The business explanation behind the numbers, so drivers are evidenced rather than inferred.",
        formats: ["docx", "pdf", "text", "email"],
        required: false,
      },
      {
        name: "Decisions or approvals pending",
        description: "What leadership is being asked to decide, so the summary can serve those decisions.",
        formats: ["docx", "text", "pptx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Period financial statements with prior period comparatives",
      "The budget or forecast the result is being measured against",
      "Cash balance and movement for the period",
      "Source references for every figure quoted in the summary",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "executive_summary",
      "key_metric_card",
      "variance_card",
      "trend_card",
      "period_comparison",
      "cash_flow_visualization",
      "risk_highlight",
      "management_question",
      "recommendation_card",
      "source_citation",
      "assumption_box",
      "limitation_box",
    ],
    suggestedFollowups: [
      "For each material movement, is the driver evidenced by management or inferred by analysis?",
      "Which of the period's results are one-off and which change the run rate going forward?",
      "Was the cash movement operational, or the timing of receipts and payment runs?",
      "Which pending decisions have a deadline this summary should have flagged?",
      "What does management know about the business that the reported numbers do not yet reflect?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sap", "dynamics365", "plaid", "stripe", "google_drive"],
    tags: ["executive", "reporting", "summary", "board", "narrative"],
  },
  {
    slug: "segregation-of-duties-review",
    name: "Segregation of duties review",
    category: "general",
    subcategory: "Internal control",
    description:
      "Tests whether incompatible finance duties are genuinely separated in practice — using who actually did what in the data, not who theoretically could per the access matrix.",
    defaultTitle: "Segregation of duties review",
    auditDescription:
      "Identifies where a single individual can initiate, approve, record and settle within the same process, distinguishing theoretical access conflicts from conflicts actually exercised, and assessing the compensating controls in place.",
    instructions: `Segregation of duties reviews fail in two opposite ways: they read the access matrix and ignore behaviour, or they cry conflict at every finance team of five. Avoid both.

The core distinction you must maintain throughout is between *access* (a person could do two incompatible things), *activity* (a person did do two incompatible things), and *transaction-level conflict* (a person did both on the same transaction). These are three different severities and must never be reported as one. Build all three views if the data allows, and be explicit about which you are showing.

Ask the user for the organisation's own definition of incompatible duty pairs if one exists, and for finance headcount context. Do not import an external SoD matrix as though it were law. Ask too for their materiality basis for which conflicts matter — in a small team some conflicts are unavoidable, and the honest question becomes whether they are known, accepted and compensated, not whether they exist.

Focus on the classic incompatible combinations, tested against actual data: vendor master maintenance combined with payment execution or approval; customer master or credit limit maintenance combined with cash application or credit note issuance; journal preparation combined with journal approval; bank reconciliation performed by someone who also posts to cash or executes payments; payroll master data change combined with payroll run approval; purchase order raising combined with goods receipt and invoice approval. For each, go into the user IDs on the actual records and look for the same identity on both sides.

Handle shared and system accounts carefully — a service account on both sides of a duty pair is a design artefact, not a person with a conflict, and reporting it as one is an error. Ask before assuming an ID is human.

Weigh compensating controls before rating anything. A conflict offset by independent review of every item, a hard system limit, management review of an exception report, or dual bank authorisation outside the accounting system, is materially different from a naked conflict. Ask what compensating control exists rather than assuming none. Equally, do not accept an asserted compensating control without evidence it operated — a review that leaves no trace is not evidence.

Cite each conflict to specific evidence: user ID, record or journal ID, date, system, role name, file and row. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information.

Recommend by preference: remove the conflict, constrain it by system, or compensate and monitor it — and say which is realistic given the headcount. Write for a Financial Controller and audit committee. This identifies control gaps only; it is not a fraud investigation and draws no conclusion about any individual's conduct. Formal control opinions rest with a licensed professional.`,
    recommendedInputs: [
      {
        name: "User access and role assignment listing",
        description: "Who holds which roles and permissions in the finance systems, including inactive users.",
        formats: ["csv", "xlsx", "system export"],
        required: true,
      },
      {
        name: "Transaction activity with user identifiers",
        description:
          "Journals, payments, master data changes and approvals with the user ID that performed each action and timestamps.",
        formats: ["csv", "xlsx", "audit log export"],
        required: true,
      },
      {
        name: "Delegation of authority and approval limits",
        description: "Who may approve what, and to what value.",
        formats: ["pdf", "xlsx", "docx"],
        required: true,
      },
      {
        name: "Finance organisation chart and headcount",
        description: "Context for whether a conflict is avoidable or structural.",
        formats: ["pdf", "pptx", "xlsx"],
        required: false,
      },
      {
        name: "Documented compensating controls",
        description: "Controls management asserts offset known conflicts, with evidence they operate.",
        formats: ["docx", "pdf", "xlsx"],
        required: false,
      },
      {
        name: "List of system, service and shared accounts",
        description: "So non-human identities are not reported as individual conflicts.",
        formats: ["csv", "xlsx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Current user-to-role assignments across the finance systems",
      "Activity logs showing which user performed each incompatible action, with timestamps",
      "Transaction-level records where the same user appears on both sides of a duty pair",
      "Approval authority documentation against which observed approvals can be tested",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "audit_scope",
      "audit_methodology",
      "executive_summary",
      "control_weakness",
      "risk_matrix",
      "table",
      "heatmap",
      "finding_card",
      "transaction_table",
      "control_recommendation",
      "assumption_box",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Which access-level conflicts were actually exercised, and which were exercised on the same transaction?",
      "Which user IDs flagged are service or integration accounts rather than individuals?",
      "For each unavoidable conflict given headcount, what compensating control operates and what evidence does it leave?",
      "Are any conflicts held by users whose role has changed but whose access was never revoked?",
      "Which conflicts could be removed by system configuration rather than by hiring?",
    ],
    relevantIntegrations: ["netsuite", "sap", "dynamics365", "oracle_fusion", "quickbooks", "xero", "ramp", "brex", "coupa", "gusto"],
    tags: ["segregation-of-duties", "internal-control", "access", "authorisation", "governance"],
  },
  {
    slug: "month-end-reconciliation-completeness-audit",
    name: "Month-end reconciliation completeness audit",
    category: "general",
    subcategory: "Reconciliation",
    description:
      "Tests whether every account that should be reconciled was reconciled, on time, by someone independent, with reconciling items that are real, aged and resolvable — not whether the reconciliations balance.",
    defaultTitle: "Month-end reconciliation completeness audit",
    auditDescription:
      "A completeness and quality audit over the month-end reconciliation population: coverage against the balance sheet, timeliness, preparer and reviewer independence, and the ageing and substance of open reconciling items.",
    instructions: `Note carefully what this audit is not: it is not a re-performance of individual reconciliations. It is an audit of the *population* and the *quality* of the reconciliation process. A reconciliation that balances can still be worthless.

Start with completeness, which is the heart of it. Take the balance sheet or trial balance as the denominator, not the reconciliation log — the log tells you only what was reconciled, never what was missed, and the accounts that never appear in it are exactly the ones you are looking for. Reconcile the two populations: every balance sheet account should either have a reconciliation, or have a documented reason why it does not. Report coverage in terms of both account count and value, since these tell very different stories, and pay particular attention to accounts with balances that are individually small but conceptually risky — suspense, clearing, intercompany, accrual and holding accounts — which are commonly excluded from the log precisely because they are awkward.

Then test timeliness. Compare each reconciliation's preparation and review date against the close calendar and the reporting date. A reconciliation prepared after the numbers were reported did not inform them; it documented them. That distinction matters and should be stated.

Then test independence and substance. Is the preparer different from the reviewer, and is the reviewer different from the person who posts to that account? Does the review leave any evidence beyond a signature — did anything ever get challenged? Then examine the reconciling items themselves: their ageing profile, whether the same items roll forward month after month unresolved, whether items are described specifically or generically ("timing difference", "to be investigated" — a generic description on an aged item is a finding), and whether any reconciliation balances only because of an unexplained plug.

Ask the user for the account population that *should* be reconciled and their materiality basis for which unreconciled balances and which aged items matter. Do not set thresholds yourself.

Weigh fair explanations. An account may legitimately not need a monthly reconciliation because it is dormant or reconciled on a different cycle. A rolling item may be a genuine long-dated timing difference with a known resolution date. A late reconciliation may follow a bank statement that arrives late by design. Ask before concluding.

Cite everything precisely: account code, reconciliation file and sheet, preparer and reviewer, dates, item reference and age. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information; where a reconciliation is simply absent, that is a missing-information finding, not an assumed pass.

Recommend on coverage, sequencing, independence and item resolution ownership. Write for a Financial Controller. Formal assurance over the balances themselves requires a licensed professional.`,
    recommendedInputs: [
      {
        name: "Trial balance or balance sheet at period end",
        description: "The full account population — the denominator for coverage testing.",
        formats: ["csv", "xlsx", "accounting system export"],
        required: true,
      },
      {
        name: "Reconciliation log or tracker",
        description: "Which accounts were reconciled, by whom, reviewed by whom, and on what dates.",
        formats: ["xlsx", "csv", "system export"],
        required: true,
      },
      {
        name: "Completed reconciliations with reconciling item detail",
        description: "The reconciliations themselves, including open items with descriptions and dates raised.",
        formats: ["xlsx", "pdf", "system export"],
        required: true,
      },
      {
        name: "Close calendar and reporting date",
        description: "The timetable against which reconciliation timeliness is measured.",
        formats: ["xlsx", "pdf"],
        required: false,
      },
      {
        name: "List of accounts exempt from reconciliation",
        description: "Documented reasons why certain accounts are not reconciled monthly.",
        formats: ["xlsx", "docx"],
        required: false,
      },
      {
        name: "Prior period reconciliation files",
        description: "To test whether reconciling items roll forward unresolved.",
        formats: ["xlsx", "pdf"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The full period-end account population from the trial balance",
      "The reconciliation log showing accounts reconciled, preparer, reviewer and dates",
      "Reconciling item detail with descriptions and dates raised",
      "The close calendar or reporting date against which timeliness is assessed",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "key_metric_card",
      "reconciliation_table",
      "aging_table",
      "aging_visualization",
      "finding_card",
      "data_quality_warning",
      "control_weakness",
      "missing_evidence_notice",
      "recommendation_card",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Which balance sheet accounts have no reconciliation and no documented exemption?",
      "Which reconciliations were prepared or reviewed after the reporting date, and therefore did not inform the reported numbers?",
      "Which reconciling items have rolled forward unresolved for multiple periods, and who owns clearing them?",
      "Are any reconciliations balanced by an unexplained plug or a generically described item?",
      "Is the reviewer of each reconciliation independent of the person posting to that account?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sage", "dynamics365", "plaid", "bank_sftp", "sharepoint", "google_drive"],
    tags: ["reconciliation", "completeness", "close", "balance-sheet", "internal-control"],
  },
  {
    slug: "management-override-risk-review",
    name: "Management override risk review",
    category: "general",
    subcategory: "Internal control",
    description:
      "Examines the one control risk that cannot be designed away — those with authority stepping outside the process — by looking for the footprints override leaves in the ledger.",
    defaultTitle: "Management override risk review",
    auditDescription:
      "A risk review focused on whether individuals with authority have bypassed established controls, examining top-side entries, unusual timing, authority exceptions and the accounting judgements most susceptible to influence.",
    instructions: `Management override is the residual risk that survives every control design, because the people who can override are the people the controls report to. This review is about detection through footprints, not about testing control design. Handle it with unusual care: the subject is sensitive, the evidence usually circumstantial, and the cost of an unsupported implication high.

Set the frame first. This is a *risk* review, not an investigation and not an allegation. You are identifying where override is possible, where the data shows behaviour consistent with override, and where corroboration is missing. Say this explicitly in the output. Never name an individual as having done something improper; describe the transaction, the authority level involved and the evidential gap, and let the reader draw conclusions with information you do not have.

Look for the footprints. Top-side and consolidation-level entries made outside the sub-ledgers, particularly those affecting reported results and lacking supporting detail. Entries posted by senior finance users who do not normally post, or posted outside normal hours or after the close. Entries whose descriptions are absent or generic relative to their size. Round-sum entries to judgement-heavy accounts. Accruals, provisions, reserves, impairments, capitalisation and revenue cut-off — where judgement is legitimate and therefore where influence is invisible. Reversals shortly after a reporting date. Entries that move the result across a threshold that matters to someone — a covenant, a bonus target, a forecast commitment — which is why you should ask the user what such thresholds exist rather than guessing. Ask for their materiality basis; do not impose one.

Also look at authority exceptions: transactions approved above the normal route, approvals that bypassed a step, master data changed by a senior user, or access granted temporarily and used.

Weigh innocent explanations with genuine rigour, and state them alongside each observation. Top-side entries are a normal part of consolidation. Senior finance staff post entries in small teams as a matter of course. Late-night entries happen during every close. A round number is often a negotiated or estimated figure. A provision movement usually reflects a real change in circumstance. A footprint is not evidence of override; the *absence of a corroborating explanation for a material footprint* is what you are reporting.

Cite each observation exactly — journal ID, date, time, user role, account, amount, file and row — and label every claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Most findings here will honestly be reasonable interpretation or missing information; say so.

Recommend corroboration steps and monitoring, and escalate to the audit committee rather than to management where the subject is management. Any conclusion regarding impropriety, and any decision to investigate, rests with the audit committee and a licensed professional — not with this review.`,
    recommendedInputs: [
      {
        name: "Complete journal entry detail with user, timestamp and source",
        description:
          "All entries for the period including manual, top-side and consolidation entries, with user ID, posting time and source module.",
        formats: ["csv", "xlsx", "accounting system export"],
        required: true,
      },
      {
        name: "Delegation of authority matrix",
        description: "The normal approval routes and limits, against which exceptions can be identified.",
        formats: ["pdf", "xlsx", "docx"],
        required: true,
      },
      {
        name: "Supporting documentation for manual and top-side entries",
        description: "Memos, calculations and approvals behind judgement-based entries.",
        formats: ["pdf", "docx", "xlsx", "email"],
        required: true,
      },
      {
        name: "Provision, accrual and reserve movement schedules",
        description: "Movement analysis for the judgement-heavy accounts most exposed to influence.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Covenant, target or forecast thresholds relevant to the period",
        description:
          "What outcomes carried consequence, so proximity to a threshold can be considered as context rather than guessed at.",
        formats: ["pdf", "xlsx", "docx"],
        required: false,
      },
      {
        name: "Access change and privileged user log",
        description: "Temporary elevations, emergency access and their usage.",
        formats: ["csv", "xlsx", "audit log export"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Manual, top-side and consolidation journal entries with user, timestamp and description",
      "The delegation of authority matrix defining normal approval routes",
      "Supporting documentation, or its absence, for material judgement-based entries",
      "Movement detail for provisions, accruals, reserves and other judgement-heavy accounts",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "audit_scope",
      "audit_methodology",
      "executive_summary",
      "overall_risk_rating",
      "risk_highlight",
      "transaction_table",
      "finding_card",
      "control_weakness",
      "assumption_box",
      "limitation_box",
      "management_question",
      "control_recommendation",
    ],
    suggestedFollowups: [
      "What documented rationale supports each material top-side entry, and who prepared it?",
      "Which judgement-based provisions or accruals moved materially, and what changed in circumstance to justify it?",
      "Were any thresholds — covenant, target, forecast commitment — close to being missed before adjusting entries were posted?",
      "Which approvals bypassed the normal authority route, and was the exception documented at the time?",
      "Was privileged or temporary access granted during the close, and what was posted under it?",
    ],
    relevantIntegrations: ["netsuite", "sap", "oracle_fusion", "dynamics365", "quickbooks", "xero", "sharepoint"],
    tags: ["override", "internal-control", "judgement", "authority", "risk"],
  },
  {
    slug: "going-concern-indicator-review",
    name: "Going concern indicator review",
    category: "general",
    subcategory: "Risk",
    description:
      "Gathers and weighs the financial, operational and behavioural indicators that bear on the entity's ability to continue operating — without reaching the conclusion, which is not this review's to reach.",
    defaultTitle: "Going concern indicator review",
    auditDescription:
      "Assembles evidence relevant to going concern — liquidity runway, funding, obligation timing, trading trend, and mitigating factors — presenting indicators and their weight while explicitly deferring any conclusion to a licensed professional.",
    instructions: `Be exceptionally clear about the boundary of this review, from the first line of the output onward. You are assembling and weighing *indicators*. You are not forming, implying or hinting at a going concern conclusion. That is a formal determination reserved to directors and a licensed professional, informed by matters — refinancing intent, shareholder support, forward orders, legal position — this review does not have. Say this at the top, not in a footnote. The temptation to let compelling indicators drift into a verdict is this template's principal risk; resist it.

Ask the user for the assessment period, their materiality basis, and any mitigating factors management relies on. Ask early: the indicators mean little without the mitigations.

Assemble indicators across four groups. *Liquidity and funding*: the cash trajectory rather than the balance, the operating burn or generation trend, headroom against facilities and their renewal dates, debt maturity against the assessment horizon, and covenant proximity if evidenced. *Trading*: revenue trend and direction, margin movement, order book or contracted revenue if available, and customer concentration — a going concern question is often really a single-customer question. *Obligations and pressure*: creditor days and whether they are lengthening, arrears in statutory or payroll payments, deferred payment arrangements, and the timing of committed outflows against expected inflows. *Behavioural*: asset disposals outside the ordinary course, delayed capital expenditure, unusual related-party funding, and changes in drawdown patterns.

Weight indicators honestly rather than counting them. A single near-dated funding cliff outweighs a page of mild negative trends. Weigh mitigations with equal seriousness: an undrawn facility, a committed shareholder loan, a signed contract, a disposal in progress, or an executed cost action can each neutralise an indicator entirely. Where management asserts a mitigation, record it as a user claim and state whether it is evidenced — an unevidenced mitigation is not a mitigation, and an evidenced one may change the picture completely.

Be rigorous about the horizon. Indicators are only meaningful against a stated period; an obligation beyond the assessment horizon is context, not an indicator. State the horizon you were given.

Cite every indicator to source — file, sheet, row, account, statement page, agreement clause, date — and label each as evidence-supported, reasonable interpretation, unverified hypothesis, missing information, or user claim. Name the information that would most change the picture and that you do not have; that list is often the most valuable part of the output.

Write for the board and its auditors: sober, precise, free of both alarmism and reassurance. Recommend what evidence to obtain and what to monitor. Reiterate in closing that no going concern conclusion is drawn or implied here, and that the assessment belongs to the directors and a licensed professional.`,
    recommendedInputs: [
      {
        name: "Financial statements and trial balance for recent periods",
        description: "Multi-period data so trend and trajectory, not just position, can be assessed.",
        formats: ["xlsx", "csv", "pdf"],
        required: true,
      },
      {
        name: "Cash flow history and short-term cash forecast",
        description: "Actual cash movement and the forward view across the assessment horizon.",
        formats: ["xlsx", "csv", "bank feed"],
        required: true,
      },
      {
        name: "Debt and facility schedule with covenants and maturities",
        description: "Drawn and undrawn amounts, renewal dates, covenant terms.",
        formats: ["xlsx", "pdf"],
        required: true,
      },
      {
        name: "Aged creditors and aged debtors",
        description: "Payment pressure on one side and collection reality on the other.",
        formats: ["csv", "xlsx", "accounting system export"],
        required: false,
      },
      {
        name: "Management's mitigating factors and supporting evidence",
        description: "Committed support, signed contracts, disposals in progress, executed cost actions.",
        formats: ["docx", "pdf", "email", "xlsx"],
        required: false,
      },
      {
        name: "Order book or contracted revenue",
        description: "Forward revenue visibility across the assessment horizon.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
      {
        name: "The stated assessment horizon",
        description: "The period over which the directors are assessing, without which indicators cannot be weighted.",
        formats: ["text", "docx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Multi-period financial statements showing trading and cash trajectory",
      "Cash forecast covering the stated assessment horizon",
      "Debt and facility terms including maturity and covenant dates",
      "Evidence, or documented absence, of each mitigating factor management relies on",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "audit_scope",
      "limitation_box",
      "executive_summary",
      "risk_highlight",
      "key_metric_card",
      "cash_flow_visualization",
      "trend_card",
      "financial_ratio_card",
      "timeline",
      "assumption_box",
      "missing_evidence_notice",
      "management_question",
    ],
    suggestedFollowups: [
      "What is the stated assessment horizon, and which obligations fall inside versus outside it?",
      "Which mitigating factors are contractually committed and evidenced, and which are only intentions?",
      "When do facilities mature or come up for renewal, and what indication of renewal exists?",
      "How close are covenant measurement dates, and what headroom does the forecast show at each?",
      "What single piece of missing evidence would most change the weight of these indicators?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sap", "dynamics365", "plaid", "truelayer", "sharepoint", "google_drive"],
    tags: ["going-concern", "liquidity", "solvency-indicators", "risk", "board"],
  },
];
