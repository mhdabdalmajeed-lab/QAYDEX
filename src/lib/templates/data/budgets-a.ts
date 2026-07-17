import type { AuditTemplateSeed } from "@/lib/templates/types";

export const budgetTemplatesA: AuditTemplateSeed[] = [
  {
    slug: "annual-budget-audit",
    name: "Annual budget audit",
    category: "budgets",
    subcategory: "Annual budgets",
    description:
      "Examines a full-year approved budget end to end: how it was built, whether it is internally coherent, whether it is achievable given history, and whether its approval and ownership are properly evidenced.",
    defaultTitle: "Annual budget audit",
    auditDescription:
      "Reviews the construction, coherence, achievability and governance of the organisation's approved annual budget before or shortly after the year begins.",
    instructions: `You are auditing an approved annual budget as a whole — not the variances it later produces. Your reader is the finance leadership and the board committee that approved it, so write for people who already know the business but have not stress-tested the arithmetic or the logic underneath it.

Start by establishing what you are actually holding. Identify the budget version, its approval date, the approving body, and whether the file you have been given is the board-approved version or a working draft. If you cannot establish this, say so plainly and treat every downstream conclusion as provisional. Ask the user which version is authoritative and what materiality basis they want applied; if they give you one, use it and state it. If they do not, form your own judgement from the size and volatility of the numbers in front of you, explain the basis you chose in one sentence, and label that basis as judgment rather than fact.

Then test the budget as a structure. Does it foot — do departments, cost centres and entities roll to the stated total? Does the phasing across periods reflect the business's actual seasonality, or has an annual figure been divided evenly because nobody phased it? Are the revenue lines and the cost lines that should move together (headcount and payroll, volume and cost of sales, revenue and commission) moving together, or has one been budgeted independently of the other? Compare each significant line to at least two prior years of actuals and to last year's budget, and look for lines that changed materially without a corresponding change in the business, and lines that did not change at all despite obvious cost inflation or contract changes.

Test governance next. Every budget line should have a named owner, a documented basis, and evidence of approval. Missing ownership is a finding in its own right.

Before you conclude anything looks wrong, weigh innocent explanations: a restructure, a new contract, a reclassification between accounts, a change in the chart of accounts, or a deliberate stretch target. Say which explanation you tested and how.

Cite every material figure to its file, sheet, row or approval document. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Frame recommendations as specific actions with a named owner and a decision the leadership must take. State clearly that this review informs but does not replace sign-off by a licensed professional.`,
    recommendedInputs: [
      {
        name: "Approved annual budget",
        description:
          "The board- or management-approved budget for the year, at the lowest level of detail available (account, department, cost centre, period).",
        formats: ["xlsx", "csv", "pdf"],
        required: true,
      },
      {
        name: "Prior year actuals",
        description:
          "Two to three prior years of actual results on the same account structure, so budgeted lines can be compared to history.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Prior year budget",
        description: "Last year's approved budget, to see what changed year on year and whether the change is explained.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
      {
        name: "Budget assumptions and build papers",
        description:
          "The narrative, driver models or working papers describing how each major line was built (headcount plan, price/volume assumptions, inflation rates).",
        formats: ["xlsx", "docx", "pdf", "written text"],
        required: false,
      },
      {
        name: "Board or committee approval record",
        description: "Minutes, sign-off memo or approval workflow record evidencing who approved the budget and when.",
        formats: ["pdf", "docx", "email"],
        required: false,
      },
      {
        name: "Budget ownership register",
        description: "Mapping of budget lines, cost centres or departments to their accountable owner.",
        formats: ["xlsx", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The approved annual budget file, identified by version and approval date.",
      "At least one full prior year of actuals on a comparable account structure.",
      "Evidence of the approval event (minutes, sign-off, or system approval record) or an explicit note that it is missing.",
      "The account, department or cost centre hierarchy used to roll the budget up to its stated total.",
      "The stated assumptions behind any budget line the audit calls out as material.",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "overall_risk_rating",
      "key_metric_card",
      "period_comparison",
      "bar_chart",
      "table",
      "finding_card",
      "assumption_box",
      "management_question",
      "recommendation_card",
      "limitation_box",
    ],
    suggestedFollowups: [
      "Which budget lines were changed after the board pack was circulated, and who authorised those changes?",
      "Why is the phasing of this line flat when the prior two years show clear seasonality?",
      "Which revenue lines depend on contracts that are not yet signed, and what is budgeted if they do not close?",
      "Who is the named owner of each cost centre with no ownership recorded, and when will that be assigned?",
      "What would have to be true for this budget to be achieved, and which of those conditions is least likely?",
    ],
    relevantIntegrations: ["xero", "netsuite", "dynamics365", "google_drive", "sharepoint", "snowflake"],
    tags: ["annual budget", "budget approval", "governance", "planning", "board reporting"],
  },
  {
    slug: "budget-variance-audit",
    name: "Budget variance audit",
    category: "budgets",
    subcategory: "Variance analysis",
    description:
      "Investigates actual-versus-budget differences for a period: which variances are real, which are artefacts of timing or classification, and which explanations from budget owners actually hold up against the ledger.",
    defaultTitle: "Budget variance audit",
    auditDescription:
      "Analyses actual results against budget for the period, distinguishing genuine performance variances from timing, phasing and classification effects, and testing the quality of management's explanations.",
    instructions: `You are auditing variances between actuals and budget for a completed period. The distinctive risk here is not that a variance exists — it is that the variance has been explained away with a story nobody checked. Your job is to separate real economics from accounting noise, and to test explanations rather than repeat them.

Ask the user for their materiality basis and whether they care about absolute currency movement, percentage movement, or both; different lines deserve different lenses and a small percentage on a large line often matters more than a large percentage on a trivial one. If no basis is given, decide from the data, state your reasoning, and label it as judgment.

Work through the variances in three passes. First, decompose. For each significant variance, determine whether it is a price effect, a volume effect, a mix effect, a timing effect, or a classification effect. A cost that arrived in month four instead of month three is a phasing variance, not an overspend, and it should net out against the prior period — check whether it does. Second, corroborate. Trace the variance into the ledger: which transactions actually drive it, and do those transactions match the explanation given? An explanation of "one-off legal fees" that traces to twelve recurring monthly invoices from the same vendor is contradicted by its own evidence — say so directly. Third, look across lines. Offsetting variances that conveniently cancel to zero at the department total, favourable variances that appear only in the final period, and unexplained underspend in discretionary lines all deserve attention, because budget management and budget manipulation look identical in a summary and different in the detail.

Weigh innocent explanations before concluding. A vendor changed payment terms. An accrual was booked in a different period. A cost centre was restructured mid-year. A budget was phased on a calendar the business does not use. Test each of these before you attribute a variance to performance or behaviour.

Where a variance has no explanation and no traceable driver, do not invent one. Record it as missing information and raise a specific question for the budget owner.

Cite every variance to its file, sheet, row and — where you traced it — its ledger transactions. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Recommendations should target the explanation process, not just the number. Defer any sign-off to a licensed professional.`,
    recommendedInputs: [
      {
        name: "Budget versus actual report",
        description: "Period actuals against budget at account and cost centre level, including year-to-date columns.",
        formats: ["xlsx", "csv", "pdf"],
        required: true,
      },
      {
        name: "General ledger detail for the period",
        description:
          "Transaction-level detail for the accounts under review, so variances can be traced to the postings that cause them.",
        formats: ["csv", "xlsx", "accounting system export"],
        required: true,
      },
      {
        name: "Budget owner variance commentary",
        description: "The written explanations budget owners submitted for each significant variance.",
        formats: ["xlsx", "docx", "written text"],
        required: false,
      },
      {
        name: "Budget phasing schedule",
        description: "How the annual budget was spread across periods, needed to tell phasing effects from real overspend.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Accrual and prepayment schedules",
        description: "Period-end accruals and prepayments affecting the accounts under review.",
        formats: ["xlsx", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Budget and actual figures for the period on the same account structure.",
      "Ledger transaction detail supporting each variance the audit calls material.",
      "The budget phasing basis, or an explicit note that phasing could not be determined.",
      "Management's stated explanation for each material variance, or a note that none was provided.",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "variance_card",
      "waterfall_chart",
      "pivot_table",
      "transaction_table",
      "finding_card",
      "contradiction_alert",
      "root_cause_analysis",
      "management_question",
      "recommendation_card",
      "source_citation",
    ],
    suggestedFollowups: [
      "Which of these variances reverse next period, and which are permanent run-rate changes?",
      "The commentary attributes this overspend to a one-off — why does the ledger show recurring monthly invoices from the same supplier?",
      "Why do favourable and adverse variances within this department net almost exactly to zero?",
      "Which discretionary budgets were underspent, and was that a deliberate decision or a delivery failure?",
      "Who reviewed and challenged the variance commentary before it was submitted?",
    ],
    relevantIntegrations: ["xero", "netsuite", "dynamics365", "quickbooks", "sap", "postgres"],
    tags: ["variance analysis", "budget vs actual", "phasing", "commentary quality", "monthly close"],
  },
  {
    slug: "forecast-accuracy-audit",
    name: "Forecast accuracy audit",
    category: "budgets",
    subcategory: "Forecasting",
    description:
      "Measures how well the organisation's forecasts have predicted outcomes over time, looking for systematic bias, degrading accuracy, and forecasts that converge on target only because the target moved.",
    defaultTitle: "Forecast accuracy audit",
    auditDescription:
      "Evaluates the historical accuracy of the organisation's forecasting process across multiple cycles, identifying bias, error patterns and reforecast behaviour.",
    instructions: `You are auditing the forecasting process itself, not any single forecast. The question is whether this organisation's forecasts are a reliable input to decisions, and if not, in which direction and for which lines they fail. This is a longitudinal audit: it needs several forecast cycles, and it is largely worthless with only one.

Build the comparison grid first. For each forecast vintage (the date the forecast was made) and each target period, you need the forecast value and the eventual actual. Ask the user for the forecast cadence and how many cycles they retained; if forecast history has been overwritten in place — a very common problem — say so, because it makes accuracy unauditable and that itself is the finding.

Then look for pattern rather than magnitude. A forecast that is wrong in both directions with roughly equal frequency is imprecise but unbiased. A forecast that is wrong in the same direction almost every cycle is biased, and bias is a process problem with a human cause: sandbagging, optimism, incentive design, or a driver model that is structurally mis-specified. Distinguish these. Examine whether accuracy improves as the target period approaches — it should, and a forecast that does not converge as information arrives suggests the reforecast is anchored to the original plan rather than rebuilt from current data. Look at whether error concentrates in particular lines, departments, or forecast owners, and whether the same line has missed repeatedly across years.

Watch specifically for the convergence artefact: a forecast that appears highly accurate because the target was revised to meet the forecast, or because the forecast was revised late in the period when the answer was already largely known. Check revision dates against period end. Accuracy achieved after the fact is not accuracy.

Weigh innocent explanations honestly. Genuine volatility, a market shock, a large contract landing unpredictably, or a new business line with no history will all produce error that is not a process failure. Say which errors you consider inherent uncertainty and which you consider process weakness, and explain the difference in each case.

Cite each forecast and actual to its file, sheet, row and vintage date. Label every claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Recommendations should address the forecasting process — cadence, ownership, driver models, incentives, retention of forecast history — rather than instructing anyone to be more accurate. Defer conclusions requiring professional sign-off to a licensed professional.`,
    recommendedInputs: [
      {
        name: "Forecast history by vintage",
        description:
          "Each retained forecast with the date it was produced and the periods it covered, so accuracy can be measured by forecast age.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Actual results",
        description: "Actuals for the forecast periods, on the same account and department structure as the forecasts.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Original approved budget",
        description: "The starting plan, so reforecast drift away from (or anchoring to) the budget can be seen.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
      {
        name: "Forecast process documentation",
        description: "Cadence, ownership, review steps and driver models used to produce each forecast.",
        formats: ["docx", "pdf", "written text"],
        required: false,
      },
      {
        name: "Forecast revision log",
        description: "Record of when forecasts were revised and by whom, needed to detect late convergence.",
        formats: ["xlsx", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "At least three forecast vintages with their production dates.",
      "Actual results for every forecast period being scored.",
      "The mapping between forecast lines and actual account lines.",
      "Revision dates for any forecast the audit treats as late-converging, or a note that dates are unavailable.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_methodology",
      "key_metric_card",
      "line_chart",
      "heatmap",
      "trend_card",
      "table",
      "finding_card",
      "root_cause_analysis",
      "management_question",
      "recommendation_card",
      "limitation_box",
    ],
    suggestedFollowups: [
      "This line has been forecast short in nine of the last ten cycles — what in the process produces that consistent direction?",
      "Are forecast owners' incentives tied to beating their own forecast, and if so how is sandbagging controlled?",
      "Why does forecast accuracy not improve between the first and final reforecast of a period?",
      "Which forecast vintages were overwritten rather than retained, and can they be recovered?",
      "Was this target revised to meet the forecast, or the forecast revised to meet the target?",
    ],
    relevantIntegrations: ["xero", "netsuite", "dynamics365", "snowflake", "bigquery", "google_drive"],
    tags: ["forecast accuracy", "bias", "reforecast", "process quality", "trend analysis"],
  },
  {
    slug: "department-budget-review",
    name: "Department budget review",
    category: "budgets",
    subcategory: "Departmental budgets",
    description:
      "Reviews a single department's or cost centre's budget and spending behaviour: whether the allocation is justified, how it is being consumed, and whether the department's own management of it is disciplined.",
    defaultTitle: "Department budget review",
    auditDescription:
      "Examines one department's budget allocation, spending pattern, transfers and accountability, in the context of what the department is actually being asked to deliver.",
    instructions: `You are reviewing one department's budget in depth. This is a narrow, human audit: the department has a named leader, a headcount, a set of commitments, and a spending culture, and your reader is likely that leader's manager or the FP&A partner who supports them. Write with that specificity — name the cost centre, name the lines, avoid speaking about "the organisation" when you mean one team.

Begin by establishing the department's remit and what changed. What is this department responsible for delivering this year, how does its budget compare to last year's budget and last year's actual, and did its scope change — a team absorbed, a function outsourced, a project moved in? Scope change explains most large allocation shifts, and if you cannot establish it you must ask rather than infer.

Then examine consumption pattern rather than total. A department that lands exactly on budget every single month is unusual and worth understanding — real spending is lumpy. Look at the shape of spend across the period: front-loading, a late-period surge, or a burst immediately before year end each carry a different meaning. Examine the composition: how much is fixed and contractual (payroll, licences, leases) versus genuinely discretionary, because a department with almost no discretionary spend has almost no ability to manage a variance and should not be held to one. Look at what the department controls versus what is allocated to it by central recharge; recharges the department cannot influence should be separated in your analysis and in any accountability conclusion.

Check the internal mechanics: budget transfers between lines within the department, whether they were approved and by whom, and whether transfers systematically move money from scrutinised lines to less scrutinised ones. Check that the department's budget has a named owner and that headcount budgeted matches the headcount plan the department is actually running.

Consider innocent explanations before you conclude: a hiring freeze, a supplier who invoices annually in arrears, a project cancelled by someone else, a recharge methodology change. Test them.

Cite every figure to the file, sheet, row, cost centre and — where you used it — the transaction. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Recommendations should be actionable by this department's leadership, phrased as decisions rather than criticism. Any accountability conclusion is an input to a management conversation, not a determination; defer formal sign-off to a licensed professional.`,
    recommendedInputs: [
      {
        name: "Department budget and actuals",
        description: "Budget, forecast and actual by account for the specific cost centre or department under review.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Cost centre transaction detail",
        description: "Transaction-level spend coded to the department, so the shape and composition of spend can be examined.",
        formats: ["csv", "xlsx"],
        required: true,
      },
      {
        name: "Department remit or objectives",
        description: "What the department is accountable for delivering this period, and any scope changes during the year.",
        formats: ["docx", "pdf", "written text"],
        required: false,
      },
      {
        name: "Headcount plan",
        description: "Budgeted versus actual headcount for the department, with start dates and open roles.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Budget transfer and recharge records",
        description: "Approved transfers between budget lines and central recharges allocated to the department.",
        formats: ["xlsx", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Budget and actual figures for the named cost centre or department.",
      "Transaction detail supporting any spending pattern the audit describes.",
      "The department's budget owner, or an explicit note that ownership is unrecorded.",
      "Approval records for any budget transfer the audit calls out.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "key_metric_card",
      "variance_card",
      "bar_chart",
      "line_chart",
      "transaction_table",
      "finding_card",
      "info_box",
      "management_question",
      "recommendation_card",
      "source_citation",
    ],
    suggestedFollowups: [
      "How much of this department's budget is genuinely discretionary versus contractual or recharged?",
      "What drove the concentration of spend in the final weeks of the period?",
      "Which budget transfers within this department were made after the mid-year review, and who approved them?",
      "Did this department's scope change during the year in a way its budget was never adjusted for?",
      "How does budgeted headcount compare to the roles actually filled, and where did the underspend go?",
    ],
    relevantIntegrations: ["netsuite", "dynamics365", "sap", "xero", "ramp", "expensify"],
    tags: ["department budget", "cost centre", "spending pattern", "accountability", "recharges"],
  },
  {
    slug: "capital-expenditure-budget-audit",
    name: "Capital expenditure budget audit",
    category: "budgets",
    subcategory: "Capital budgets",
    description:
      "Audits the capital budget and its projects: authorisation, project-level overruns, capitalisation boundaries, phasing of committed spend, and whether the benefits used to justify approval are being tracked.",
    defaultTitle: "Capital expenditure budget audit",
    auditDescription:
      "Reviews capital budget authorisation, project spend against approved cases, capitalisation treatment and commitment phasing across the capital programme.",
    instructions: `You are auditing the capital budget. Capex is unlike opex in three ways that must shape your whole approach: it is authorised project by project rather than line by line, it spans periods so the budget-versus-actual comparison is about commitment and phasing rather than a monthly run rate, and the boundary between capital and expense is a judgement with a real incentive attached to it.

Start with authorisation. Every project drawing on the capital budget should trace to an approved business case or capex request, with an approved value, an approver at the right level, and an approval date preceding the spend. Test that chain. Spend that precedes its own approval, projects split into pieces that each fall below the next authorisation tier, and approved values that have quietly grown through change requests are the specific risks here — but only the first is unambiguous, so investigate the others rather than asserting them.

Then examine each material project against its case: approved value, spend to date, committed but uninvoiced spend (purchase orders matter enormously here — a project can be on budget in the ledger and hopelessly over in commitment), forecast cost at completion, and the milestones actually delivered. Compare cost-to-date against progress-to-date rather than against elapsed time. Look for projects whose forecast at completion has been revised upward repeatedly in small increments, which reads very differently from a single honest re-baselining.

Test the capitalisation boundary on a sample. Are the costs sitting in capital genuinely capital — asset construction, acquisition, enhancement — or has maintenance, training, internal time, or a service contract been swept in? Ask the user for the organisation's capitalisation policy and apply theirs rather than a generic view; if you cannot obtain it, say so and treat your assessment as interpretation.

Check phasing and deferral: capital slipping to next year with no plan change, and capital pulled forward late in the year, both distort the picture. Check whether the benefits case that justified approval is being tracked at all — very often nobody does, and that is a control finding.

Weigh innocent explanations: scope changes approved through a proper process, supplier lead times, foreign exchange on imported assets, contingency drawn as intended.

Cite each project to its business case, PO, invoice and ledger entry. Label every claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Do not state accounting conclusions on capitalisation as settled; recommend review by a licensed professional.`,
    recommendedInputs: [
      {
        name: "Capital budget by project",
        description: "Approved capital budget broken down by project, with approved values, phasing and asset category.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Capital spend and commitments",
        description:
          "Actual capital spend and open purchase order commitments per project, so commitment overrun is visible, not just invoiced spend.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Approved business cases and capex requests",
        description: "The approval documents for each material project, including approver, approved value and date.",
        formats: ["pdf", "docx", "xlsx"],
        required: true,
      },
      {
        name: "Capitalisation policy",
        description: "The organisation's own policy defining what may be capitalised and the authorisation tiers.",
        formats: ["pdf", "docx", "written text"],
        required: false,
      },
      {
        name: "Fixed asset register",
        description: "Assets added in the period, to reconcile capital spend to what was actually recognised.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Project status or milestone reports",
        description: "Delivery progress per project, so cost-to-date can be compared to progress rather than elapsed time.",
        formats: ["xlsx", "pdf", "docx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Approved capital budget with per-project approved values.",
      "Capital spend and open commitments by project for the period.",
      "The approval record (approver, value, date) for every project the audit examines.",
      "The organisation's capitalisation policy, or an explicit note that it was not provided.",
      "Supporting invoices or ledger entries for any cost whose capital treatment is questioned.",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "overall_risk_rating",
      "key_metric_card",
      "table",
      "waterfall_chart",
      "timeline",
      "finding_card",
      "control_weakness",
      "management_question",
      "control_recommendation",
      "limitation_box",
    ],
    suggestedFollowups: [
      "What is the forecast cost at completion for each project, and how many times has it been revised upward?",
      "Which projects have open commitments that, once invoiced, would exceed their approved value?",
      "Were any capital requests split in a way that kept each piece below the next authorisation threshold?",
      "Which costs currently in capital would fail the organisation's own capitalisation policy on review?",
      "Is anyone tracking the benefits case that justified each approved project?",
    ],
    relevantIntegrations: ["netsuite", "sap", "dynamics365", "oracle_fusion", "coupa", "sharepoint"],
    tags: ["capex", "capital budget", "project overrun", "authorisation", "capitalisation"],
  },
  {
    slug: "revenue-forecast-audit",
    name: "Revenue forecast audit",
    category: "budgets",
    subcategory: "Revenue planning",
    description:
      "Tests a revenue forecast against the pipeline, contracts and billing data that should support it, examining how much depends on business that does not yet exist and how the model converts opportunity into recognised revenue.",
    defaultTitle: "Revenue forecast audit",
    auditDescription:
      "Corroborates the revenue forecast against contracted backlog, pipeline, churn and pricing evidence, and evaluates the conversion assumptions that bridge the gap.",
    instructions: `You are auditing a revenue forecast. The central question is simple and rarely asked directly: how much of this number already exists, and how much is a belief about the future? Everything else follows from that split.

Build the bridge first. Decompose the forecast into contracted and recurring revenue already committed, renewals expected from existing customers, expansion within existing customers, and new business not yet won. Corroborate each layer against different evidence: contracted revenue against signed contracts and the billing system, renewals against the renewal schedule and historical renewal behaviour, expansion against the pipeline and prior expansion rates, new business against pipeline coverage and historical win rates. Where the pipeline needed to deliver the new-business layer would require a multiple of coverage the sales organisation has never historically achieved, that is a finding — state the historical rate you compared against and where it came from.

Then interrogate the model's mechanics. Is revenue phased on when the deal closes or when it is recognised? These are different numbers, and forecasts that conflate them systematically overstate near-term revenue. Check the treatment of churn and downgrade: a forecast that models new business explicitly but assumes churn continues at "current levels" without evidence has a hole in it. Check whether price increases assumed in the forecast have actually been communicated to customers, and whether the volume assumptions are consistent with any capacity, headcount or inventory constraint elsewhere in the plan. Check concentration: how much of the forecast rests on a small number of named customers or deals, and what happens to the total if the largest one slips a quarter.

Ask the user which materiality basis to apply and whether the forecast is a commitment, a target, or an expected case — these are three different artefacts and criticising a stretch target for optimism is a category error. If they do not tell you, ask before concluding.

Weigh innocent explanations: a genuinely new product with no history, a changed sales motion, seasonality, a deliberate stretch case the board understands as such.

Cite every figure to its source — CRM record, contract, billing export, sheet and row. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Frame recommendations around what should be evidenced or re-based, and present downside scenarios as scenarios rather than predictions. Defer sign-off to a licensed professional.`,
    recommendedInputs: [
      {
        name: "Revenue forecast model",
        description: "The forecast by product, segment, customer or region with its phasing and build logic.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Pipeline export",
        description: "Open opportunities with value, stage, close date and owner, so the new-business layer can be corroborated.",
        formats: ["csv", "xlsx", "CRM export"],
        required: true,
      },
      {
        name: "Contracted and recurring revenue schedule",
        description: "Signed contracts, subscription base and renewal dates supporting the committed layer of the forecast.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Historical revenue actuals",
        description: "Prior periods of actual revenue on the same segmentation, plus historical win and renewal rates.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: false,
      },
      {
        name: "Pricing and churn assumptions",
        description: "Documented assumptions on price changes, churn, downgrade and expansion used in the model.",
        formats: ["xlsx", "docx", "written text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The revenue forecast at the level of detail it was built.",
      "Pipeline or contract evidence supporting each forecast layer the audit tests.",
      "Historical win, renewal or churn rates used as a comparison basis, with their source.",
      "The stated assumptions for price, volume and churn, or a note that they were not documented.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "key_metric_card",
      "waterfall_chart",
      "customer_concentration_chart",
      "table",
      "finding_card",
      "assumption_box",
      "risk_highlight",
      "management_question",
      "recommendation_card",
      "source_citation",
    ],
    suggestedFollowups: [
      "What proportion of the forecast is contracted today, and what proportion depends on deals not yet won?",
      "What pipeline coverage does this forecast require, and how does that compare to the coverage historically needed to hit plan?",
      "Is revenue phased on close date or recognition date, and does the model handle the difference?",
      "What is the forecast if the three largest deals each slip one quarter?",
      "Have the price increases assumed in this model actually been communicated to customers?",
    ],
    relevantIntegrations: ["salesforce", "hubspot", "chargebee", "stripe", "netsuite", "xero"],
    tags: ["revenue forecast", "pipeline", "concentration", "assumptions", "recurring revenue"],
  },
  {
    slug: "expense-forecast-audit",
    name: "Expense forecast audit",
    category: "budgets",
    subcategory: "Cost planning",
    description:
      "Tests an expense forecast against run-rate, contracts and headcount plans, distinguishing committed cost from discretionary cost and finding the obligations the forecast has quietly omitted.",
    defaultTitle: "Expense forecast audit",
    auditDescription:
      "Evaluates the cost forecast against contractual commitments, headcount plans and historical run-rate, focusing on omitted obligations and unsupported savings.",
    instructions: `You are auditing an expense forecast. Cost forecasts fail differently from revenue forecasts: revenue forecasts fail by being too optimistic about things that might happen, while expense forecasts fail by omitting things that will definitely happen. Structure your work around that asymmetry — hunt for what is missing at least as hard as you test what is present.

Separate the cost base into committed and discretionary. Committed cost — payroll for people already employed, signed leases, licence agreements, multi-year contracts, insurance, regulated fees — should be corroborated directly against the contract or the payroll system, not against last year's number plus a percentage. Test each material committed line against its underlying agreement: term, renewal date, contractual uplift, and whether an escalation clause the forecast ignores kicks in during the period. Contractual price escalators that were never modelled are one of the most reliable findings in this audit.

Then test the run-rate lines. Compare the forecast for each account against the trailing actual run-rate, and be alert to lines forecast below their own current run-rate with no stated reason. A saving is a plan with an owner and an action; a saving with neither is an assumption, and you should label it as one. Ask specifically what has to happen for each material saving to materialise and whether that action has been started.

Cross-check against the rest of the plan. Does the headcount plan in the forecast match the recruitment plan the business is running, including start dates rather than full-year cost for people joining mid-year, and does it carry the associated cost — employer taxes, benefits, recruitment fees, equipment? Does forecast volume growth carry the variable cost that growth causes? A plan that grows revenue without growing the cost to serve it is internally inconsistent, and that inconsistency is a finding whether or not either number is individually wrong.

Look for known obligations absent entirely: an expiring contract that must be replaced at market rate, a legal matter, a rent review, a system replacement everyone knows is coming.

Weigh innocent explanations before concluding: a genuine renegotiation already signed, a service being insourced, a cost moving to capital, a reclassification.

Cite each line to its contract, payroll record, ledger account, sheet and row. Label every claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Recommendations should name the obligation, the owner and the decision required. Defer sign-off to a licensed professional.`,
    recommendedInputs: [
      {
        name: "Expense forecast",
        description: "Forecast cost by account, department and period, at the level of detail it was built.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Historical expense actuals",
        description: "Trailing actual cost by account, so each forecast line can be compared to its own run-rate.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Contract register",
        description:
          "Material supplier, lease and licence agreements with values, terms, renewal dates and escalation clauses.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
      {
        name: "Headcount and recruitment plan",
        description: "Budgeted roles with start dates and fully loaded cost, plus current employees and leavers.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Documented savings initiatives",
        description: "Each planned cost reduction with its owner, action and expected timing.",
        formats: ["xlsx", "docx", "written text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The expense forecast by account and period.",
      "Trailing actual costs for the same accounts, covering enough periods to establish a run-rate.",
      "Contract or payroll evidence for each committed cost line the audit tests.",
      "The stated basis for any material saving assumed in the forecast, or a note that none was provided.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "key_metric_card",
      "trend_card",
      "line_chart",
      "table",
      "comparison_card",
      "finding_card",
      "missing_evidence_notice",
      "assumption_box",
      "management_question",
      "recommendation_card",
    ],
    suggestedFollowups: [
      "Which contracts contain escalation clauses that take effect in the forecast period, and are they modelled?",
      "This account is forecast below its trailing run-rate — what specific action delivers that reduction, and who owns it?",
      "Do the budgeted roles carry start dates and fully loaded cost, or full-year cost for mid-year joiners?",
      "Which contracts expire during the forecast period, and at what rate would they be replaced?",
      "If revenue grows as planned, where is the corresponding increase in cost to serve?",
    ],
    relevantIntegrations: ["netsuite", "xero", "quickbooks", "coupa", "gusto", "ramp"],
    tags: ["expense forecast", "cost base", "commitments", "run-rate", "savings"],
  },
  {
    slug: "cash-budget-review",
    name: "Cash budget review",
    category: "budgets",
    subcategory: "Cash budgets",
    description:
      "Reviews the cash budget as a timing document: whether the conversion of budgeted profit into budgeted cash is credible, where the low points fall, and whether headroom survives a plausible slippage.",
    defaultTitle: "Cash budget review",
    auditDescription:
      "Examines the cash budget's receipt and payment timing, its bridge from the P&L budget, its liquidity low points and its resilience to plausible slippage.",
    instructions: `You are reviewing a cash budget. The discipline here is timing, not profitability: a business can be comfortably within its P&L budget and still run out of money in week seven. Read this document as a calendar of obligations and expected receipts, and audit the calendar.

Start by bridging. The cash budget should reconcile to the P&L budget through working capital movement, capital spend, financing, tax and non-cash items. Build that bridge and test each leg. The most common failure is the working capital assumption: budgeted receipts implying a collection period the business has never actually achieved, or budgeted payments assuming supplier terms longer than the terms actually agreed. Compare the implied collection and payment days in the budget against what the ledger and aging actually show historically, and state the comparison explicitly rather than asserting the assumption is wrong.

Then examine timing at the level the budget is built — weekly if weekly, monthly if monthly, and say so, because a monthly cash budget can hide an intra-month trough entirely and that limitation belongs in your report. Identify the low points, not the averages. Check whether large lumpy payments are placed in the period they actually fall due: tax, payroll runs where a month has an extra cycle, annual insurance, VAT or sales tax, bonus payments, debt service, dividend. Check that receipts from the largest customers are timed on their actual behaviour rather than their contractual terms — these differ, and the difference is measurable from history.

Test resilience rather than declaring a threshold. Ask what happens to the low points if collections slip by a plausible amount drawn from the business's own historical variability, if the largest expected receipt lands late, or if a facility renewal does not complete. Present these as scenarios with their assumptions stated. Where the budget depends on undrawn facilities, confirm they exist, their headroom, their covenants and their expiry.

Ask the user what minimum cash level the business needs to operate and whether covenant tests apply — use their number and their covenants, not an invented one.

Weigh innocent explanations: a deliberate seasonal drawdown, a receipt genuinely contracted for a specific date, a payment holiday agreed with a supplier.

Cite each assumption to its source — bank data, aging, contract, sheet, row. Label every claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Do not present any liquidity scenario as a prediction, and defer solvency judgements to a licensed professional.`,
    recommendedInputs: [
      {
        name: "Cash budget",
        description: "Budgeted receipts and payments by period at the cadence the business plans on (weekly or monthly).",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Opening bank balances",
        description: "Cash and equivalents at the start of the budget period, by account and currency.",
        formats: ["xlsx", "csv", "bank statement", "pdf"],
        required: true,
      },
      {
        name: "P&L budget",
        description: "The profit budget the cash budget should bridge back to, plus capex and financing plans.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Receivables and payables aging",
        description: "Current aging, used to test whether budgeted collection and payment timing matches actual behaviour.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: false,
      },
      {
        name: "Debt and facility agreements",
        description: "Loan schedules, undrawn facility limits, covenant tests and expiry dates.",
        formats: ["pdf", "xlsx", "written text"],
        required: false,
      },
      {
        name: "Historical bank transactions",
        description: "Prior periods of actual receipts and payments, to establish real timing behaviour.",
        formats: ["csv", "xlsx", "MT940", "CAMT.053"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The cash budget with its stated cadence and period coverage.",
      "Opening cash position, evidenced to a bank source.",
      "The receipt and payment timing assumptions, with the historical behaviour they were compared against.",
      "Facility headroom, limits and covenants for any facility the budget relies on, or a note that they were not provided.",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "key_metric_card",
      "cash_flow_visualization",
      "line_chart",
      "aging_table",
      "finding_card",
      "risk_highlight",
      "assumption_box",
      "management_question",
      "recommendation_card",
      "limitation_box",
    ],
    suggestedFollowups: [
      "What collection period does this cash budget imply, and how does it compare to what the aging actually shows?",
      "Where is the lowest cash point, and is it visible at the cadence this budget is built on?",
      "Are tax, bonus, insurance and debt service payments placed in the periods they actually fall due?",
      "What headroom remains on undrawn facilities, and when do they expire or face a covenant test?",
      "What happens to the low point if the largest expected receipt lands a month late?",
    ],
    relevantIntegrations: ["plaid", "truelayer", "bank_sftp", "xero", "netsuite", "quickbooks"],
    tags: ["cash budget", "liquidity", "working capital", "timing", "scenario"],
  },
  {
    slug: "budget-assumption-review",
    name: "Budget assumption review",
    category: "budgets",
    subcategory: "Assumptions",
    description:
      "Audits the assumption layer beneath a budget or plan: whether assumptions are stated, sourced, mutually consistent, applied as documented, and whether the plan's sensitivity to them is understood.",
    defaultTitle: "Budget assumption review",
    auditDescription:
      "Examines the documented assumptions underpinning a budget or plan for existence, source, internal consistency, faithful application in the model, and sensitivity.",
    instructions: `You are auditing assumptions, not outcomes. Do not re-audit the numbers — audit the beliefs the numbers rest on. Most budget failures are traceable to an assumption that was never written down, never sourced, contradicted another assumption elsewhere in the same model, or was written down and then not actually applied in the spreadsheet.

Work in five passes, and report against each.

Existence. Inventory the assumptions the plan requires — inflation, wage growth, price changes, volume, churn, foreign exchange, interest rates, headcount, utilisation, conversion rates, supplier terms, tax rates. Which of these are documented anywhere, and which are implicit in a formula with no explanation? An assumption embedded in a hardcoded cell and never articulated is invisible to the board that approved the plan; that is a governance finding regardless of whether the number is right.

Source. For each documented assumption, what is it based on — an external published source, internal history, a signed contract, or an opinion? All four are legitimate inputs, but they carry very different weight and the plan should know which is which. Where an assumption claims an external source, check it is identified specifically enough to be verified. Where it rests on internal history, check the history actually supports it rather than being a rounder, friendlier version of it.

Consistency. This is where the real findings usually are. Compare assumptions across the model: does the inflation rate applied to costs match the one used for pricing? Does the FX rate in the revenue model match the one in the cost model? Does headcount in the payroll build match headcount in the capacity model? Does volume growth in revenue match volume in the cost-to-serve? Contradictions between two internally documented assumptions are unambiguous and should be reported as contradictions, with both sources cited.

Application. Trace each stated assumption into the model and confirm the model does what the documentation says. A documented three per cent uplift that the sheet applies to only two of five cost lines is a real, common, and entirely findable defect.

Sensitivity. Identify which assumptions the plan is most sensitive to and whether anyone has quantified that. Present sensitivity as a range with stated inputs, not a prediction.

Weigh innocent explanations: an assumption deliberately differentiated by segment, a rate agreed to be held flat, a documented exception.

Cite every assumption to its file, sheet, cell or paragraph. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Recommend documentation and ownership fixes, and defer sign-off to a licensed professional.`,
    recommendedInputs: [
      {
        name: "Budget or forecast model",
        description: "The working model itself, with formulas intact where possible, so assumptions can be traced into cells.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Documented assumption schedule",
        description: "The written list of planning assumptions circulated or approved alongside the budget.",
        formats: ["xlsx", "docx", "pdf", "written text"],
        required: true,
      },
      {
        name: "Historical actuals",
        description: "Prior periods of actuals used to test whether history supports the assumptions claimed to derive from it.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: false,
      },
      {
        name: "External source references",
        description: "The published indices, rate forecasts or market data cited as the basis for external assumptions.",
        formats: ["pdf", "written text", "url"],
        required: false,
      },
      {
        name: "Contracts underpinning stated terms",
        description: "Agreements evidencing assumed pricing, supplier terms, uplifts or rates.",
        formats: ["pdf", "docx", "xlsx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The budget or forecast model at the level where assumptions are applied.",
      "The documented assumption schedule, or an explicit note that none exists.",
      "The specific source cited for each assumption the audit tests.",
      "The cell, sheet or section where each tested assumption is applied in the model.",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "executive_summary",
      "audit_methodology",
      "assumption_box",
      "table",
      "contradiction_alert",
      "finding_card",
      "scatter_chart",
      "missing_evidence_notice",
      "management_question",
      "recommendation_card",
      "limitation_box",
      "appendix",
    ],
    suggestedFollowups: [
      "Which assumptions are hardcoded in the model but appear nowhere in the documentation the board approved?",
      "Why does the inflation rate applied to costs differ from the one used in the pricing model?",
      "This assumption is described as based on historical experience — which periods, and does the data support it?",
      "The documented uplift is applied to some cost lines and not others: is that deliberate, and who decided?",
      "Which single assumption would move this plan the most, and has anyone quantified that sensitivity?",
    ],
    relevantIntegrations: ["xero", "netsuite", "dynamics365", "google_drive", "sharepoint", "onedrive"],
    tags: ["assumptions", "model review", "consistency", "sensitivity", "documentation"],
  },
];
