import type { AuditTemplateSeed } from "@/lib/templates/types";

export const budgetTemplatesB: AuditTemplateSeed[] = [
  {
    slug: "budget-revision-audit",
    name: "Budget revision audit",
    category: "budgets",
    subcategory: "Budget governance",
    description:
      "Examines every change made to an approved budget during the period — who moved what, when, why, and whether the revision trail explains the difference between the original plan and the budget being reported against today.",
    defaultTitle: "Budget revision audit",
    auditDescription:
      "An audit of in-period budget amendments: reforecasts, transfers between cost centres, contingency releases and silent re-basing, tested against the approved original and the change record.",
    instructions: `You are auditing how an approved budget was changed after approval. The central question is whether the budget being reported against today is still the budget management committed to, and whether every step between the two is documented and explicable.

Start by establishing three anchors and reconciling them: the originally approved budget, the current working budget, and the cumulative list of revisions. If those three do not tie, that gap is itself your first finding — quantify it and say so before analysing anything else. Never assume the revision log is complete; test it by walking a sample of accounts from original to current and asking whether the recorded changes account for the whole movement.

Then characterise the revisions rather than merely listing them. Distinguish reallocations (net-zero transfers between lines) from true increases funded by contingency, reserves or a revised revenue assumption. Look at direction and timing together: revisions concentrated in the final weeks of a period, or made after actuals for that period were already known, deserve close attention because a budget revised to match spend no longer measures anything. Compare each revision's stated rationale against the underlying operational change it claims to reflect, and against the date the driver became known.

Weigh innocent explanations seriously and in writing. Reorganisations legitimately move cost centres. Late supplier repricing, scope changes agreed with a customer, currency moves, and a genuine board-approved reforecast are all normal. Only conclude that a revision is a control concern when the evidence — not the pattern alone — supports it.

Materiality is not yours to fix. Ask the user for the materiality basis they use for budget variances, or infer a basis from their own instructions and state plainly which you used and why. Explain the basis before you apply it.

Cite every material finding to its source: file, sheet, row or the specific revision record, approval reference and date. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information — and where the revision log lacks a rationale or approver, record that as missing information rather than inferring intent.

Write for a finance director and an audit committee: precise, unemotional, no accusation without a citation. Recommendations should address the revision process, not individuals. This is an analytical review, not an assurance opinion — a licensed professional must sign off any conclusion drawn from it.`,
    recommendedInputs: [
      {
        name: "Originally approved budget",
        description: "The budget as approved at the start of the period, before any amendment.",
        formats: ["xlsx", "csv", "pdf"],
        required: true,
      },
      {
        name: "Current working budget",
        description: "The live budget currently used for variance reporting.",
        formats: ["xlsx", "csv", "integration export"],
        required: true,
      },
      {
        name: "Budget revision log",
        description: "Register of amendments with date, amount, direction, requester, approver and stated rationale.",
        formats: ["xlsx", "csv", "system report"],
        required: true,
      },
      {
        name: "Reforecast pack or board reforecast approval",
        description: "Papers supporting any formal reforecast adopted during the period.",
        formats: ["pdf", "pptx", "docx"],
        required: false,
      },
      {
        name: "Actuals by account and period",
        description: "Actual spend so revisions can be compared against known outturn at the revision date.",
        formats: ["xlsx", "csv", "integration export"],
        required: false,
      },
      {
        name: "Budget amendment policy",
        description: "The organisation's own rules for who may amend a budget and under what conditions.",
        formats: ["pdf", "docx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Approved original budget with approval date and approver",
      "Dated revision records showing before and after amounts per account",
      "Stated rationale for each material revision",
      "Evidence of the approval applied to each revision",
      "Reconciliation from original budget to current working budget",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "reconciliation_table",
      "waterfall_chart",
      "timeline",
      "finding_card",
      "control_weakness",
      "missing_evidence_notice",
      "source_citation",
      "recommendation_card",
      "limitation_box",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Which revisions were made after actuals for the affected period were already visible, and who requested them?",
      "Does the amendment policy require a second approver above a level the organisation itself has defined, and was that followed?",
      "Can management reconcile the original approved budget to the current working budget line by line without unexplained residual?",
      "Were any contingency releases reported to the board, and if not, why not?",
    ],
    relevantIntegrations: ["xero", "netsuite", "dynamics365", "sharepoint", "google_drive", "snowflake"],
    tags: ["budget", "revisions", "governance", "change-control", "reforecast"],
  },
  {
    slug: "budget-approval-audit",
    name: "Budget approval audit",
    category: "budgets",
    subcategory: "Budget governance",
    description:
      "Tests whether the budget in force was actually approved by the people authorised to approve it, in the right sequence, on evidence that existed at the time — and whether spend began before approval landed.",
    defaultTitle: "Budget approval audit",
    auditDescription:
      "An audit of the budget authorisation chain: delegation of authority, approval sequence, completeness of sign-off, and whether commitments preceded the approval that was supposed to authorise them.",
    instructions: `You are auditing authorisation, not amounts. The question is whether the budget currently in force carries a complete, timely and authentic chain of approval from the people the organisation itself designated to give it.

Begin by reconstructing the intended approval path from the organisation's delegation of authority or budget policy — do not import a path from general practice. If no policy is supplied, say so explicitly and ask the user for it before you treat any approval as deficient; an approval cannot be judged against a standard you invented.

Then test the actual chain in four dimensions. Completeness: does every budget unit in force have an approval, or are there cost centres carrying a budget nobody signed? Authority: was each approver within their delegated remit for that budget's size and type, per the organisation's own schedule? Sequence: did approvals occur in the required order, and did the aggregate approval follow rather than precede the component approvals it depends on? Timing: compare the approval date against the period start and against the earliest commitment or spend charged to that budget line. Spend that predates its own authorisation is a specific and reportable condition — but establish it from dated evidence, not from a report-run date.

Look also for authorisation that is formally present but substantively hollow: approvals granted in bulk minutes seconds apart, approvals by a person who also prepared the submission, approvals recorded by a delegate without a recorded delegation, and approvals whose supporting pack is dated after the approval itself.

Consider benign explanations before concluding. Systems often record a migration or re-import date rather than the true approval date. Interim budgets and continuing-appropriation arrangements legitimately allow spend before formal adoption. Verbal board approval later minuted is common and may be adequate under the organisation's own rules. Test these explanations rather than dismissing them.

Cite each material finding to a specific approval record, minute reference, workflow entry or email, with date and approver. Label every claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Where an approval record is absent, report missing information — an absent record is not proof of an absent approval.

Address the audience as the CFO and audit committee. Frame recommendations around the authorisation process, thresholds the organisation should set for itself, and evidence retention. Do not state legal or regulatory compliance conclusions; a licensed professional must sign off.`,
    recommendedInputs: [
      {
        name: "Delegation of authority schedule",
        description: "The organisation's own approval limits and authority matrix for budgets.",
        formats: ["pdf", "docx", "xlsx"],
        required: true,
      },
      {
        name: "Approved budget with sign-off record",
        description: "The budget in force together with its recorded approvals.",
        formats: ["xlsx", "pdf", "system report"],
        required: true,
      },
      {
        name: "Board or committee minutes",
        description: "Minutes evidencing budget adoption and any conditions attached.",
        formats: ["pdf", "docx"],
        required: true,
      },
      {
        name: "Approval workflow export",
        description: "System workflow log showing requester, approver, timestamps and status transitions.",
        formats: ["csv", "xlsx", "system report"],
        required: false,
      },
      {
        name: "Earliest commitments and spend by budget line",
        description: "Purchase orders, contracts and postings dated against each budget line.",
        formats: ["csv", "xlsx", "integration export"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Delegation of authority or budget approval policy",
      "Dated approval records naming the approver for each budget unit",
      "Minutes or resolution adopting the budget",
      "Dated commitment or posting data for lines tested for pre-approval spend",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "audit_scope",
      "audit_methodology",
      "executive_summary",
      "table",
      "timeline",
      "finding_card",
      "control_weakness",
      "control_recommendation",
      "missing_evidence_notice",
      "source_citation",
      "management_question",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Which budget lines carry spend dated before their approval, and what authorised that spend in the interim?",
      "Are there approvers acting outside the delegated limits the organisation set for itself, and was that ratified?",
      "Where an approval was made by a delegate, is the delegation itself documented and in force on that date?",
      "Does the approval workflow record the true decision date or the system entry date?",
    ],
    relevantIntegrations: ["netsuite", "dynamics365", "sap", "coupa", "sharepoint", "onedrive"],
    tags: ["budget", "approval", "authorisation", "delegation", "governance"],
  },
  {
    slug: "project-budget-audit",
    name: "Project budget audit",
    category: "budgets",
    subcategory: "Project and capital budgets",
    description:
      "Audits a project or capital budget against its cost-to-date, committed cost and remaining scope — testing whether the reported position reflects the true cost to complete rather than the cash spent so far.",
    defaultTitle: "Project budget audit",
    auditDescription:
      "A project-level budget audit covering baseline integrity, cost-to-date, open commitments, accrual completeness, change orders and forecast cost at completion.",
    instructions: `You are auditing a project budget, where the risk is not overspend against a line but a reported position that understates the cost still to come. Cash spent is the least interesting number in this audit; commitments, accruals and remaining scope are where the truth is.

Establish the approved baseline first, including contingency, and confirm whether contingency sits inside or outside the baseline being reported against — the two conventions produce very different headroom and are frequently conflated. Then rebuild the project's true position from four components: costs posted to date, open purchase orders and contractual commitments not yet invoiced, work performed but not yet billed, and the estimated cost of remaining scope. Compare your rebuilt position against management's reported forecast cost at completion and explain any difference.

Test the relationships that reveal a stressed project. Compare cost incurred to physical progress or milestones achieved rather than to elapsed time. Where costs run ahead of delivered scope, examine whether the forecast has moved at all — a forecast that stays pinned to baseline while incurred cost climbs is a signal worth investigating, though it may simply reflect front-loaded mobilisation costs. Trace change orders and variations from request through pricing to budget effect, and check whether approved variations were funded from contingency, from a budget increase, or silently absorbed. Look for costs charged to the project that belong to business-as-usual, and for project costs parked elsewhere to protect the reported position.

Consider innocent explanations before concluding: retention held back, milestone billing lags, capitalised versus expensed cut-offs, supplier invoicing cycles, and genuine descoping all move these numbers without any control failure.

Do not apply a threshold of your own. Ask the user for the project's materiality or tolerance basis, or take it from their instructions, and state which you used. If contingency drawdown or forecast movement matters, explain your basis for saying so.

Cite every material finding to the source: the cost report row, PO number, invoice reference, change-order reference, or contract clause, with date. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Where commitment data is unavailable, say that your cost-to-complete view is incomplete rather than presenting an understated one as fact.

Write for a project sponsor and the finance business partner: concrete, forward-looking, focused on decisions still open. Recommendations should target forecasting discipline and commitment capture. Defer any assurance conclusion to a licensed professional.`,
    recommendedInputs: [
      {
        name: "Approved project budget or business case",
        description: "The baseline budget including contingency and its stated treatment.",
        formats: ["xlsx", "pdf", "docx"],
        required: true,
      },
      {
        name: "Project cost report to date",
        description: "Costs posted against the project by cost element and period.",
        formats: ["xlsx", "csv", "integration export"],
        required: true,
      },
      {
        name: "Open commitments and purchase orders",
        description: "Contracted but uninvoiced amounts attached to the project.",
        formats: ["csv", "xlsx", "system report"],
        required: true,
      },
      {
        name: "Change order and variation register",
        description: "Requested, approved and rejected scope changes with pricing.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
      {
        name: "Milestone or progress report",
        description: "Physical progress against plan to compare with cost incurred.",
        formats: ["pdf", "pptx", "xlsx"],
        required: false,
      },
      {
        name: "Latest forecast cost at completion",
        description: "Management's current estimate to complete and its build-up.",
        formats: ["xlsx", "pdf"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Approved baseline budget with contingency identified",
      "Cost ledger or project cost report tied to the general ledger",
      "Open commitment schedule with PO references",
      "Change order register with approval evidence",
      "Management's current forecast cost at completion with its assumptions",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "key_metric_card",
      "waterfall_chart",
      "variance_card",
      "table",
      "line_chart",
      "finding_card",
      "assumption_box",
      "source_citation",
      "recommendation_card",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "What is the cost to complete built from remaining scope rather than from baseline minus spend?",
      "How much contingency has been drawn, against which approved variations, and who authorised each release?",
      "Are there project costs sitting in operating cost centres, or operating costs charged to the project?",
      "Does the forecast reflect open commitments and unbilled work performed, or only posted costs?",
    ],
    relevantIntegrations: ["netsuite", "dynamics365", "sap", "coupa", "odoo", "sharepoint", "snowflake"],
    tags: ["budget", "project", "capital", "commitments", "forecast"],
  },
  {
    slug: "overspending-investigation",
    name: "Overspending investigation",
    category: "budgets",
    subcategory: "Variance investigation",
    description:
      "Investigates budget lines that spent more than planned — decomposing the overspend into price, volume, timing, scope and classification effects before attributing cause.",
    defaultTitle: "Overspending investigation",
    auditDescription:
      "A root-cause investigation of overspend: decomposition of the excess, testing of the budget's own quality, and identification of controls that failed to arrest spend before it exceeded plan.",
    instructions: `You are investigating spend that exceeded plan. Resist the instinct to explain the overspend as a behaviour problem before you have tested whether the budget itself was wrong. Roughly half of investigated overspends are misbudgets, misclassifications or timing artefacts, and reporting them as overspend damages both the finding and the auditor's credibility.

Work in this order. First, decompose. Split the excess into the effects that actually drive it: price (paid more per unit), volume (bought more units), mix (bought a different thing), timing (spend landed in this period that the budget placed in another), scope (activity the budget never contemplated), and classification (spend that belongs on a different line). Present the decomposition and its residual honestly; an unexplained residual is a finding in itself.

Second, test the timing and classification hypotheses hard before accepting a real overspend. Look for the mirror-image underspend elsewhere — on another cost centre, another account, or the adjacent period. Check accrual and prepayment treatment at both period ends. Check whether an in-period budget revision moved the goalposts. Check whether a recharge or allocation changed basis mid-period.

Third, once a genuine overspend is established, examine the control path. When did the trajectory first become visible in reporting? Was there a commitment (a PO, a contract, a headcount requisition) that pre-committed the overspend long before it posted, and was it visible at commitment time? Was there an approval that let it through, and did that approval carry a budget check? Who owned the line, and what did they do when it turned?

Weigh legitimate explanations explicitly: demand growth funded by matching revenue, a deliberate management decision to accelerate spend, supplier price shocks, currency, and one-off events. An overspend backed by a documented decision is a communication finding, not a control finding.

Do not set the bar yourself. Ask the user which lines they consider material and on what basis, or take the basis from their instructions, and state which you used and why. Never encode a threshold as a rule.

Cite every material finding to file, sheet, row, account, transaction or PO reference with date and amount. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information — and be disciplined about the difference between "the invoices show a price rise" and "the supplier raised prices".

Write for the budget owner and their finance business partner: diagnostic, specific, non-accusatory. Recommendations should target early visibility and commitment control rather than post-hoc explanation. Defer sign-off to a licensed professional.`,
    recommendedInputs: [
      {
        name: "Budget versus actual by account and cost centre",
        description: "Period and year-to-date comparison at the level variances are managed.",
        formats: ["xlsx", "csv", "integration export"],
        required: true,
      },
      {
        name: "Transaction detail for the overspent lines",
        description: "Postings behind the excess, with dates, vendors and descriptions.",
        formats: ["csv", "xlsx", "integration export"],
        required: true,
      },
      {
        name: "Budget holder variance commentary",
        description: "Explanations already offered by the owners of the affected lines.",
        formats: ["docx", "xlsx", "pdf"],
        required: false,
      },
      {
        name: "Open commitments and purchase orders",
        description: "Committed but unposted spend that pre-dated the overspend becoming visible.",
        formats: ["csv", "xlsx"],
        required: false,
      },
      {
        name: "Accrual and prepayment schedules",
        description: "Cut-off support needed to test timing explanations at both period ends.",
        formats: ["xlsx", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Budget and actual figures for each investigated line, tied to the ledger",
      "Transaction-level detail supporting the excess",
      "Evidence of any in-period budget revision affecting the line",
      "Commitment or purchase order data where spend was pre-committed",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "variance_card",
      "waterfall_chart",
      "transaction_table",
      "root_cause_analysis",
      "finding_card",
      "contradiction_alert",
      "source_citation",
      "recommendation_card",
      "management_question",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Is there a matching underspend in another account, cost centre or period that reclassifies this as timing?",
      "At what point in the period did the trajectory first exceed plan in management reporting, and what happened next?",
      "Was the spend pre-committed by a purchase order or contract signed before the overspend was visible?",
      "Was the excess covered by a documented management decision, and if so why was the budget not revised?",
    ],
    relevantIntegrations: ["xero", "quickbooks", "netsuite", "dynamics365", "coupa", "ramp", "expensify"],
    tags: ["budget", "overspend", "variance", "root-cause", "cost-control"],
  },
  {
    slug: "underspending-investigation",
    name: "Underspending investigation",
    category: "budgets",
    subcategory: "Variance investigation",
    description:
      "Investigates budget lines that spent less than planned — distinguishing genuine savings from deferred cost, unrecorded liabilities, stalled delivery and budget padding.",
    defaultTitle: "Underspending investigation",
    auditDescription:
      "An investigation of underspend as a risk rather than a win: testing whether the saving is real, deferred, unrecorded, or evidence that planned work did not happen.",
    instructions: `You are investigating spend that fell short of plan. Treat underspend as a question, never as good news. An underspend is one of four things, and only one of them is a saving.

Test each candidate explanation in turn and say which the evidence supports. (1) A real saving: the activity happened, and it cost less — you should be able to point to the same output at lower price or lower volume of input. (2) Deferred cost: the activity slipped, and the cost will land later — look for it in the following period's actuals, in the pipeline of requisitions, or in an unchanged full-year forecast that still expects the money to go out. (3) Unrecorded liability: the activity happened but the cost is not in the books — this is the most consequential outcome, because it means the reported result is wrong, not just the budget. (4) Padding: the money was never going to be spent, meaning the budget itself carried slack that displaced other uses of capital.

The unrecorded-liability path deserves specific work. Look for goods-received-not-invoiced balances, services delivered against contracts with no matching invoice, purchase orders closed without receipt, headcount that was hired but whose cost is missing, and suppliers who invoiced regularly and then went quiet without a corresponding contract end. Compare the underspent line's activity indicators against its cost: an unchanged operational level with falling cost is a red flag for missing accruals.

Also examine what the underspend cost the organisation. Was it a capital programme that did not deliver, a maintenance budget that was not spent on maintenance, a training or safety budget quietly surrendered? These are delivery findings even when the accounting is immaculate. And look at end-of-period behaviour on the same line: a year of underspend followed by a late-period rush is a pattern worth naming.

Do not set your own bar for what matters. Ask the user for their materiality basis for budget variances, or take it from their instructions, and state which you used. Never encode a threshold as a decision rule.

Cite each material finding to file, sheet, row, account, PO or contract reference with dates and amounts. Label every claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Where you suspect an unrecorded liability but cannot corroborate it, say so as a hypothesis and specify exactly what evidence would settle it.

Write for the FP&A lead and the financial controller. Recommendations should address accrual completeness, forecast honesty and budget-setting rigour. Defer any assurance conclusion to a licensed professional.`,
    recommendedInputs: [
      {
        name: "Budget versus actual by account and cost centre",
        description: "Period and year-to-date figures for the underspent lines.",
        formats: ["xlsx", "csv", "integration export"],
        required: true,
      },
      {
        name: "Goods received not invoiced and accrual listing",
        description: "Balances that would reveal cost incurred but not recorded.",
        formats: ["csv", "xlsx", "system report"],
        required: true,
      },
      {
        name: "Open purchase orders and contract schedule",
        description: "Committed spend still expected against the underspent lines.",
        formats: ["csv", "xlsx", "pdf"],
        required: false,
      },
      {
        name: "Full-year forecast by line",
        description: "Whether management still expects the money to be spent.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Delivery, headcount or activity report",
        description: "Non-financial indicators to test whether the planned activity actually occurred.",
        formats: ["xlsx", "pdf", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Budget and actual figures for each underspent line, tied to the ledger",
      "Accrual and goods-received-not-invoiced support at period end",
      "Open commitment or contract data for the affected lines",
      "An activity or delivery indicator for at least the material lines",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "variance_card",
      "trend_card",
      "table",
      "bar_chart",
      "risk_highlight",
      "finding_card",
      "assumption_box",
      "source_citation",
      "follow_up_request",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "For each underspent line, is the planned activity complete, deferred, or cancelled — and what evidence shows which?",
      "Do goods-received-not-invoiced or accrual balances explain part of the underspend as an unrecorded cost?",
      "Does the full-year forecast still assume the money will be spent, and if so where is the commitment?",
      "Which underspends represent work that did not happen, and who was told?",
    ],
    relevantIntegrations: ["xero", "quickbooks", "netsuite", "sage", "coupa", "dynamics365", "postgres"],
    tags: ["budget", "underspend", "accruals", "variance", "delivery"],
  },
  {
    slug: "budget-owner-accountability-review",
    name: "Budget owner accountability review",
    category: "budgets",
    subcategory: "Budget governance",
    description:
      "Reviews whether each budget has a named owner with real authority and real consequences — testing ownership coverage, span, commentary quality and whether owners actually control the spend they answer for.",
    defaultTitle: "Budget owner accountability review",
    auditDescription:
      "A review of budget ownership: coverage, clarity, alignment between control and accountability, and the quality of the explanation owners give for their own variances.",
    instructions: `You are reviewing accountability, which means you are auditing people-shaped controls without auditing people. Keep the unit of analysis the role and the process, never the individual's competence.

Begin with coverage and clarity. Map every budget unit to a named owner and find the gaps: budgets with no owner, budgets with several owners and no primary, and owners who left the organisation or changed role without the mapping following them. Then test spans: an owner accountable for a very large number of unrelated cost centres, or for cost centres spread across functions they do not manage, is structurally unable to exercise the control the design assumes — describe that as a design condition, not a performance failure.

The core test is alignment between control and accountability. For a sample of budget lines, ask who actually initiates the spend, who approves the purchase order, who signs the contract, and who answers for the variance. Where those are different people, the accountability is nominal. Recharges and allocations are the usual culprit: an owner charged with costs set by a shared-service pricing decision they neither made nor can influence is being held to account for someone else's decision. Name that pattern where you find it.

Then test the accountability loop in operation. Read the variance commentary the owners actually wrote. Is it explanatory or descriptive — does it say why, or merely restate the number in words? Does it name an action, an owner and a date, and did the previous period's promised action happen? Recurring identical commentary across periods is strong evidence that the loop is not closing. Look also at whether anything follows from an owner's variance: is it discussed, escalated, reflected in reforecast, or simply filed?

Weigh benign explanations. A new owner mid-period, a restructure, or a genuinely uncontrollable cost category all produce the same surface symptoms as weak accountability. Say so where the evidence supports it.

Do not invent thresholds for span, coverage or commentary quality. Where a limit matters, ask the user what the organisation expects, or take it from their instructions, and state your basis.

Cite each material finding to a specific mapping record, commentary text, meeting minute or approval entry, with date. Label every claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information.

Write for the CFO and the head of FP&A: structural, constructive, and never a performance review. Recommendations should address the ownership model, the controllability of what owners are charged with, and the escalation path. Any assurance conclusion is for a licensed professional.`,
    recommendedInputs: [
      {
        name: "Budget owner mapping",
        description: "Cost centre or budget unit to named owner, with effective dates.",
        formats: ["xlsx", "csv", "system report"],
        required: true,
      },
      {
        name: "Budget versus actual by cost centre",
        description: "Variance results per owned unit for the review period.",
        formats: ["xlsx", "csv", "integration export"],
        required: true,
      },
      {
        name: "Variance commentary by owner",
        description: "The explanations owners submitted, ideally across several periods.",
        formats: ["docx", "xlsx", "pdf"],
        required: true,
      },
      {
        name: "Approval and purchase order data by cost centre",
        description: "Who initiated and approved spend on each owned line.",
        formats: ["csv", "xlsx"],
        required: false,
      },
      {
        name: "Allocation and recharge basis",
        description: "How costs an owner does not control are pushed onto their budget.",
        formats: ["xlsx", "pdf", "docx"],
        required: false,
      },
      {
        name: "Budget review meeting minutes",
        description: "Evidence of whether variances are discussed and actions tracked.",
        formats: ["pdf", "docx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Current budget owner mapping with effective dates",
      "Variance results per owned budget unit for the period",
      "Owner-authored variance commentary for at least the material units",
      "Approval or purchase order records showing who initiates spend on sampled lines",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "table",
      "heatmap",
      "entity_comparison",
      "control_weakness",
      "finding_card",
      "info_box",
      "source_citation",
      "control_recommendation",
      "management_question",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Which budget units have no current named owner, or an owner who has since left or changed role?",
      "For which owners is a large share of their budget set by allocations or recharges they cannot influence?",
      "Did the actions promised in the previous period's variance commentary actually happen?",
      "What consequence, if any, followed from the largest variances — reforecast, escalation, or nothing?",
    ],
    relevantIntegrations: ["netsuite", "dynamics365", "xero", "sap", "coupa", "sharepoint", "postgres"],
    tags: ["budget", "accountability", "ownership", "governance", "controls"],
  },
  {
    slug: "rolling-forecast-discipline-review",
    name: "Rolling forecast discipline review",
    category: "budgets",
    subcategory: "Forecasting",
    description:
      "Reviews whether the rolling forecast is a genuine forward view or a mechanical roll of the budget — testing update cadence, forecast accuracy over successive vintages, bias direction and hockey-stick behaviour.",
    defaultTitle: "Rolling forecast discipline review",
    auditDescription:
      "A review of rolling forecast process quality: cadence, vintage-over-vintage accuracy, systematic bias, late correction and whether the forecast changes any decision.",
    instructions: `You are reviewing a forecasting process, not a single forecast. The output that matters is whether this organisation's forward view is believable enough to act on, and the only way to know is to grade past forecasts against what actually happened.

Assemble the forecast vintages — each successive version of the forecast for the same target period — and lay them against the eventual actual. This vintage analysis is the backbone of the audit. Measure how forecast error decays as the target period approaches: a healthy process converges steadily; a process where error collapses only in the final vintage is not forecasting, it is reporting. Look for the hockey stick: a forecast that holds full-year plan while year-to-date underperformance accumulates, implying a step-change in the remaining months that has no operational story behind it. Name the implied run-rate the back half requires and ask whether anything supports it.

Test bias separately from accuracy. Aggregate signed error by owner, by cost category and by line. Consistent one-directional error is not noise; it is a behavioural pattern, and cost forecasts biased high (creating a reliable favourable variance) and revenue forecasts biased optimistic are the two classic shapes. Distinguish bias from a genuinely volatile line where large errors are symmetric.

Then test discipline mechanics. Is the horizon actually rolling, or does it shrink toward year-end so that the organisation loses forward visibility exactly when it matters? Do forecast lines change at all between vintages, or are large parts simply the budget copied forward — compute the share of lines that never move. Is the forecast reconciled to the latest actuals and to open commitments, or built independently and left to drift? Who owns each forecast line, and does the same person own the variance?

Weigh innocent explanations: genuine seasonality, contracted revenue landing late, and a business with real step changes will all look like a hockey stick and are defensible when evidence supports them. Ask for it.

Do not define what accuracy is acceptable. Ask the user for the organisation's own forecast tolerance and its basis, or take it from their instructions, and state which you used and why. Report error as measured, not as pass or fail against a bar you invented.

Cite every material finding to the specific forecast version, file, sheet, row and date, and to the actual it is graded against. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. If forecast vintages were overwritten rather than retained, report that as a limitation — you cannot grade what was not kept.

Write for the FP&A director and the CFO: quantitative, candid about uncertainty, focused on process. Recommendations should address vintage retention, bias feedback and the decisions the forecast should be driving. Defer sign-off to a licensed professional.`,
    recommendedInputs: [
      {
        name: "Forecast vintages by period",
        description: "Each successive forecast version for the same target periods, with version dates.",
        formats: ["xlsx", "csv", "system report"],
        required: true,
      },
      {
        name: "Actuals by account and period",
        description: "Outturn to grade each forecast vintage against.",
        formats: ["xlsx", "csv", "integration export"],
        required: true,
      },
      {
        name: "Original approved budget",
        description: "Baseline for testing whether forecast lines simply copy the budget forward.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Forecast process calendar and ownership",
        description: "Cadence, horizon, submission deadlines and line owners.",
        formats: ["docx", "pdf", "xlsx"],
        required: false,
      },
      {
        name: "Forecast assumption documentation",
        description: "Drivers and assumptions behind material forecast lines.",
        formats: ["xlsx", "docx", "pdf"],
        required: false,
      },
      {
        name: "Open commitments and contracted pipeline",
        description: "Evidence supporting or contradicting the back-half implied run rate.",
        formats: ["csv", "xlsx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "At least three retained forecast vintages for a common target period",
      "Actual results for the graded periods, tied to the ledger",
      "The approved budget for comparison against forecast movement",
      "Dated forecast submissions showing when each vintage was produced",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "audit_methodology",
      "executive_summary",
      "line_chart",
      "period_comparison",
      "variance_card",
      "table",
      "finding_card",
      "risk_highlight",
      "limitation_box",
      "source_citation",
      "recommendation_card",
    ],
    suggestedFollowups: [
      "What run rate does the current full-year forecast imply for the remaining periods, and what evidence supports it?",
      "Which owners or cost categories show consistent one-directional forecast error across vintages?",
      "What share of forecast lines have not moved from the original budget at all, and why?",
      "Are prior forecast vintages retained, and if not, how does the organisation grade its own accuracy?",
    ],
    relevantIntegrations: ["netsuite", "dynamics365", "xero", "snowflake", "bigquery", "salesforce", "sharepoint"],
    tags: ["budget", "forecast", "rolling-forecast", "accuracy", "bias"],
  },
  {
    slug: "budget-concentration-and-dependency-review",
    name: "Budget concentration and dependency review",
    category: "budgets",
    subcategory: "Budget risk",
    description:
      "Maps where the budget is concentrated — in single suppliers, cost lines, contracts, assumptions or people — and tests how much of the plan fails if any one of those dependencies moves.",
    defaultTitle: "Budget concentration and dependency review",
    auditDescription:
      "A structural risk review of the budget: concentration by supplier, category, contract and assumption; single points of failure; and the plan's sensitivity to each dependency.",
    instructions: `You are mapping fragility, not error. The budget may be perfectly accurate and still be dangerously dependent on a handful of things going right. Your job is to find those things, quantify what rests on them, and show what happens if they move.

Work along several axes of concentration and report each. Supplier: how much of budgeted spend flows through how few counterparties, and are any of them sole-sourced or on contracts expiring inside the budget period? Category and cost line: how much of the plan sits in a small number of accounts, and are those accounts fixed, committed, or genuinely discretionary if a cut is needed? Contract: which contracted commitments lock in spend regardless of activity, and when do they reprice or renew? Assumption: which single inputs — an FX rate, a headcount plan, a utilisation rate, a unit price, an expected volume — propagate through multiple lines so that one assumption error moves the whole plan? People: which budget lines depend on a specific individual's estimate that nobody else can reconstruct?

Having mapped them, test sensitivity rather than merely listing. For each material dependency, trace how far it reaches: how many other budget lines move with it, and does the plan contain any offset that absorbs it. Distinguish concentration that is a deliberate, managed strategy — a negotiated volume deal with a strategic supplier, an intentionally single-vendor platform — from concentration that accumulated by accident and nobody has looked at. Both are concentration; only one is a finding.

Then look for the compounding cases: a large supplier that is also sole-sourced, on an expiring contract, priced in a foreign currency, and owned by one budget holder. Those intersections are where budget risk actually lives, and they are invisible if you look at each axis alone.

Set no thresholds of your own for what counts as concentrated. Ask the user for the organisation's own concentration appetite or the basis they want applied, or take it from their instructions, and state which you used and why. Report the distribution and let the reader see the shape.

Cite every material finding to the source: budget line, supplier record, contract reference and clause, assumption cell, or model tab, with amounts and dates. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information — an assumption whose derivation is undocumented is missing information, and should be reported as such rather than accepted.

Write for the CFO and the risk committee: structural, scenario-minded, quantified. Recommendations should address dual-sourcing, contract timing, assumption documentation and the flexibility the plan retains if it needs to bend. Do not draw contractual or legal conclusions; a licensed professional must sign off.`,
    recommendedInputs: [
      {
        name: "Budget by account, cost centre and supplier",
        description: "Budgeted spend at a level that exposes counterparty and category concentration.",
        formats: ["xlsx", "csv", "integration export"],
        required: true,
      },
      {
        name: "Contract register",
        description: "Contracted commitments with values, terms, renewal and repricing dates.",
        formats: ["xlsx", "csv", "pdf"],
        required: true,
      },
      {
        name: "Budget assumption schedule",
        description: "Key rate, volume, price and headcount assumptions and where each feeds.",
        formats: ["xlsx", "docx"],
        required: true,
      },
      {
        name: "Supplier master with sourcing status",
        description: "Which suppliers are sole-sourced or have no qualified alternative.",
        formats: ["csv", "xlsx", "system report"],
        required: false,
      },
      {
        name: "Fixed versus discretionary cost classification",
        description: "Management's own view of which lines can flex if the plan must be cut.",
        formats: ["xlsx", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Budget detail attributable to supplier or counterparty for material spend",
      "Contract register with values and expiry or repricing dates",
      "Documented assumptions with their derivation and the lines they drive",
      "Evidence of sourcing status for the largest budgeted counterparties",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "overall_risk_rating",
      "supplier_concentration_chart",
      "bar_chart",
      "risk_matrix",
      "table",
      "risk_highlight",
      "finding_card",
      "assumption_box",
      "source_citation",
      "recommendation_card",
    ],
    suggestedFollowups: [
      "Which suppliers carry a large share of budgeted spend while also being sole-sourced or on a contract expiring in period?",
      "Which single assumption, if wrong, moves the most budget lines, and who owns its derivation?",
      "How much of the budget is genuinely discretionary if the organisation needed to reduce the plan mid-year?",
      "Is any concentration the result of a deliberate, documented strategy rather than accumulation?",
    ],
    relevantIntegrations: ["netsuite", "dynamics365", "coupa", "sap", "xero", "snowflake", "sharepoint"],
    tags: ["budget", "concentration", "dependency", "risk", "assumptions"],
  },
  {
    slug: "unfunded-commitment-review",
    name: "Unfunded commitment review",
    category: "budgets",
    subcategory: "Budget risk",
    description:
      "Identifies obligations the organisation has already entered into that no budget covers — contracts, renewals, purchase orders, headcount offers and multi-year tails — and quantifies the funding gap.",
    defaultTitle: "Unfunded commitment review",
    auditDescription:
      "A review of committed-but-unfunded obligations: contractual tails, auto-renewals, signed but unbudgeted commitments, and multi-year liabilities with no line in the current or future plan.",
    instructions: `You are looking for money the organisation has already promised to spend that no budget has made room for. This is a forward-liability audit conducted from the budget side, and it succeeds or fails on completeness of the commitment population, not on analysis of it.

Build the commitment population from every source you can reach and say plainly what you could not reach. Open purchase orders. Signed contracts and their remaining term, including auto-renewal clauses that will fire without any further decision. Framework agreements with minimum volume or minimum spend commitments. Leases and licences. Signed employment offers and approved requisitions not yet in payroll. Grant and matching-funding obligations. Committed capital projects with a tail beyond the current period. Anything with a termination penalty is a commitment even if the service can be stopped.

Then match each commitment to the budget that funds it. The match must be specific — a commitment "covered by the general opex budget" is not matched, it is unassessed. For each unmatched or partially matched item, quantify the exposure and place it in time: which period does the cash land in, and is that period budgeted at all? Multi-year tails are the most commonly missed: an obligation properly funded this year and invisible in every year after is exactly the finding this audit exists to produce, so extend your horizon past the current period wherever contract terms allow.

Test the reverse direction too. Where the budget assumes a cost will stop, check that the contract permits it to stop — notice periods and renewal windows routinely make an assumed saving impossible.

Weigh legitimate explanations. Commitments funded from a central provision, a capital envelope, or an approved reforecast not yet reflected in the working budget are funded, just not where you looked. Ask before concluding. Cancellable commitments with no penalty are exposure, not obligation — distinguish them.

Do not decide what gap size matters. Ask the user for the materiality basis they want applied to committed exposure, or take it from their instructions, and state which you used and why.

Cite every material finding to the contract reference and clause, PO number, requisition, or lease schedule, with counterparty, amount, term dates and the budget line you tested it against. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Where no complete contract register exists, say so and be explicit that your population is partial and the true gap may be larger — never present an incomplete population as a total.

Write for the CFO and the audit committee: quantified, time-phased, plain about what you could not see. Recommendations should address commitment capture at the point of signature and the linkage between contracting and budgeting. Do not interpret contract terms as legal advice; a licensed professional must review any conclusion.`,
    recommendedInputs: [
      {
        name: "Contract register with terms and renewal dates",
        description: "All active contracts, values, remaining term, notice periods and auto-renewal clauses.",
        formats: ["xlsx", "csv", "pdf"],
        required: true,
      },
      {
        name: "Open purchase order listing",
        description: "Committed but unreceived or uninvoiced orders with expected delivery dates.",
        formats: ["csv", "xlsx", "system report"],
        required: true,
      },
      {
        name: "Current and forward budget by account and period",
        description: "The plan each commitment must be matched against, including future years where available.",
        formats: ["xlsx", "csv", "integration export"],
        required: true,
      },
      {
        name: "Lease and licence schedule",
        description: "Property, equipment and software obligations with terms.",
        formats: ["xlsx", "pdf", "csv"],
        required: false,
      },
      {
        name: "Approved headcount requisitions and signed offers",
        description: "People costs committed but not yet in payroll or budget.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
      {
        name: "Capital project approvals with multi-year phasing",
        description: "Committed capital tails extending beyond the current budget period.",
        formats: ["xlsx", "pdf"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Contract register or equivalent showing value, term and renewal terms",
      "Open purchase order data with expected timing",
      "Budget by account and period covering the periods the commitments land in",
      "Evidence of the budget line tested against each material commitment",
      "Termination or notice terms for commitments assumed to be cancellable",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "key_metric_card",
      "table",
      "timeline",
      "aging_table",
      "risk_highlight",
      "finding_card",
      "missing_evidence_notice",
      "source_citation",
      "recommendation_card",
      "management_letter_section",
    ],
    suggestedFollowups: [
      "Which contracts auto-renew inside the next twelve months with no budget line covering the renewed term?",
      "What is the total committed spend landing in future periods that has no approved budget at all?",
      "For every assumed cost saving, does the contract's notice period actually allow the cost to stop when planned?",
      "Is there a complete contract register, and if not, what proportion of committed spend is outside your population?",
    ],
    relevantIntegrations: ["coupa", "netsuite", "dynamics365", "sap", "xero", "ramp", "sharepoint"],
    tags: ["budget", "commitments", "contracts", "funding-gap", "obligations"],
  },
];
