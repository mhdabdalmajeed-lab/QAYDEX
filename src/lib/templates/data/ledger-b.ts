import type { AuditTemplateSeed } from "@/lib/templates/types";

export const ledgerTemplatesB: AuditTemplateSeed[] = [
  {
    slug: "capitalization-review",
    name: "Capitalization review",
    category: "ledger",
    subcategory: "Asset accounting",
    description:
      "Examines where the organisation drew the line between capitalising and expensing cost in the period, and whether the ledger tells a consistent story about what was capitalised, when it entered service, and how it began depreciating.",
    defaultTitle: "Capitalization Review",
    auditDescription:
      "A review of fixed asset additions, construction/work in progress, and the repairs and maintenance line, testing the capex/opex boundary and the mechanics that follow capitalisation.",
    instructions: `Your objective is to understand how this organisation decided what to capitalise in the period, and whether the ledger's treatment of those decisions is internally consistent and supported.

Start by obtaining the capitalisation policy. Do not assume one — ask the user for their capitalisation threshold, useful life table, and the classes of cost they treat as capitalisable (internally developed software, capitalised labour, cloud configuration cost, borrowing cost, major inspections). If no policy is provided, say so explicitly and treat every conclusion about policy conformity as missing information rather than a finding.

Then work both directions across the boundary. Reading upward from expense: scan repairs and maintenance, professional fees, IT and subscription accounts, and contract labour for cost that has the character of an asset — narratives describing replacement, rebuild, upgrade, installation, implementation, or first-time configuration, and cost patterns that cluster around a single project or vendor. Reading downward from asset: examine every addition to PP&E and intangibles and ask what the underlying cost actually bought, whether the amount reconciles to invoices, and whether routine running cost has been swept into a capitalised project.

Follow capitalisation through to its consequences. Compare the in-service date to the depreciation start date and the first depreciation charge; test whether depreciation commenced at all. Age the construction-in-progress or WIP balance and ask what is holding each item open — long-dormant CIP with no transfer often signals either an abandoned project needing impairment consideration or an asset already in use but not being depreciated. Look at componentisation, useful lives assigned versus the policy table, and any asset retired or replaced without derecognition of the original.

Weigh innocent explanations before concluding: a genuine major overhaul, a policy applied consistently but differing from your expectation, an addition recorded gross of a supplier credit, or a deliberate deferral of depreciation because the asset genuinely is not ready for use.

For each material observation, cite the file, sheet, account, and row or asset number, and label it evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Quantify the effect on the period's profit and on the carrying amount where estimable, and state your basis.

Write for a finance controller. Recommendations should address the policy, its application, and the asset register's completeness — not merely list reclassification entries. Do not present any conclusion as an accounting-standards determination; final judgement rests with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Fixed asset register",
        description: "Additions, disposals, cost, accumulated depreciation, in-service dates and useful lives for the period.",
        formats: ["xlsx", "csv", "pdf"],
        required: true,
      },
      {
        name: "General ledger detail for PP&E, intangibles and CIP/WIP",
        description: "Transaction-level movement in every capital account, with narratives and references.",
        formats: ["xlsx", "csv", "integration export"],
        required: true,
      },
      {
        name: "Repairs, maintenance and professional fee ledger detail",
        description: "Expense accounts most likely to contain capitalisable cost.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Capitalisation policy",
        description: "Written threshold, useful life table, and treatment of software, labour and borrowing cost.",
        formats: ["pdf", "docx", "written text"],
        required: false,
      },
      {
        name: "Supporting invoices for significant additions",
        description: "Vendor invoices, contracts or project cost summaries behind the largest capitalised items.",
        formats: ["pdf", "zip", "images"],
        required: false,
      },
      {
        name: "Depreciation schedule for the period",
        description: "Charge by asset or class, showing commencement date and method.",
        formats: ["xlsx", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Transaction-level detail of every capital account movement in the period, with account, date, amount and narrative.",
      "The asset register reconciled to the general ledger carrying amount.",
      "Repairs and maintenance ledger detail for the same period.",
      "The organisation's written capitalisation policy, or an explicit statement that none was provided.",
      "Depreciation commencement dates for additions made during the period.",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "key_metric_card",
      "finding_card",
      "table",
      "account_movement_visualization",
      "aging_table",
      "recommendation_card",
      "assumption_box",
      "evidence_list",
      "limitation_box",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "What is the written capitalisation threshold, and when was it last approved?",
      "Which construction-in-progress items have been open longest, and is the underlying asset already in use?",
      "Which capitalised projects include internal labour, and how were those hours costed and evidenced?",
      "Were any assets replaced during the period without the original being derecognised?",
      "Has the useful life assigned to this period's additions been revisited against actual asset lives observed?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sap", "dynamics365", "sage", "google_drive"],
    tags: ["capitalization", "fixed-assets", "capex", "depreciation", "policy"],
  },

  {
    slug: "revenue-posting-review",
    name: "Revenue posting review",
    category: "ledger",
    subcategory: "Revenue accounting",
    description:
      "Traces how revenue arrives in the general ledger — which entries are system-generated from billing and which are hand-posted — and tests cut-off, deferral movement and contra-revenue treatment.",
    defaultTitle: "Revenue Posting Review",
    auditDescription:
      "A ledger-side review of revenue recognition mechanics: the path from billing subledger to GL, manual revenue journals, period-end cut-off, and deferred revenue movement.",
    instructions: `Your objective is to explain how revenue physically got into the general ledger this period, and whether anything about that path warrants attention. This is a posting review, not a contract-by-contract recognition review.

Begin by mapping the revenue pipeline. Identify which revenue credits originate from an automated interface (billing platform, payment processor, e-commerce order feed, subscription engine) and which were entered by hand. Reconcile the subledger or processor total to the GL revenue total and account for every difference: refunds, chargebacks, processor fees booked gross versus net, FX, timing, and true-up journals. An unexplained reconciling difference is a finding in itself.

Manual revenue journals deserve disproportionate attention. For each, ask who posted it, what narrative it carries, what the offsetting account is, and what evidence supports it. Revenue credited against a balance sheet clearing account, an intercompany account, or a suspense account with a thin narrative is the pattern most worth pursuing. So is revenue posted by someone whose role does not normally touch revenue.

Test cut-off in both directions across the period boundary. Look at revenue posted in the final days of the period and the first days of the next, and compare posting date to the underlying document, shipment, or service date. Ask whether the same customers or the same document series appear on both sides. Then examine post-close activity: credit notes, refunds and reversals raised after the period against revenue recognised inside it are strong evidence that the original credit was premature.

Study deferred revenue as a mirror. Movement in deferred revenue should move against revenue in an explainable relationship. Releases with no corresponding delivery evidence, or a deferral balance that steps rather than flows, are worth investigating. Examine contra-revenue — discounts, rebates, returns — for classification consistency and for any that were netted straight into gross revenue.

Do not apply any numeric rule. Ask the user for their materiality basis and their revenue recognition policy; if neither is supplied, say so and constrain your conclusions accordingly. Weigh innocent explanations first: a genuine one-off manual true-up, a known interface backlog, a customer with unusual contractual terms, a legitimate rebate accrual.

Cite the source file, sheet, account, journal ID and row for every material claim, and label each as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Address the report to a controller and revenue accountant. Never state that revenue was recognised incorrectly under an accounting standard — describe the evidence and defer that determination to a licensed professional.`,
    recommendedInputs: [
      {
        name: "General ledger detail for revenue and contra-revenue accounts",
        description: "Every credit and debit with date, source, narrative, user and offsetting account.",
        formats: ["xlsx", "csv", "integration export"],
        required: true,
      },
      {
        name: "Billing or payment subledger export",
        description: "Invoice, charge, order or subscription detail for the same period, at transaction level.",
        formats: ["csv", "xlsx", "integration export"],
        required: true,
      },
      {
        name: "Deferred revenue account movement",
        description: "Opening balance, additions, releases and closing balance, ideally by contract or cohort.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Post-period credit notes and refunds",
        description: "Credit activity raised after period end against revenue recognised within it.",
        formats: ["csv", "xlsx"],
        required: false,
      },
      {
        name: "Revenue recognition policy",
        description: "The organisation's stated policy and any customer-specific terms.",
        formats: ["pdf", "docx", "written text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Transaction-level revenue ledger detail showing posting source (interface vs manual) and posting user.",
      "A billing, order or processor subledger covering the same period and entity.",
      "Deferred revenue account movement for the period.",
      "Journal detail for the final and first days either side of the period boundary.",
      "Credit note and refund activity raised after the period close.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "reconciliation_table",
      "key_metric_card",
      "trend_card",
      "finding_card",
      "transaction_table",
      "period_comparison",
      "recommendation_card",
      "management_question",
      "evidence_list",
      "limitation_box",
    ],
    suggestedFollowups: [
      "What explains the unreconciled difference between the billing subledger and ledger revenue for this period?",
      "Who is authorised to post manual revenue journals, and is that posting reviewed by someone else?",
      "Which invoices dated near period end were shipped or delivered in the following period?",
      "What triggers a release from deferred revenue, and what evidence is retained for each release?",
      "Were any post-close credit notes issued against revenue recognised in the period under review?",
    ],
    relevantIntegrations: [
      "quickbooks",
      "xero",
      "netsuite",
      "stripe",
      "chargebee",
      "shopify",
      "recurly",
      "snowflake",
    ],
    tags: ["revenue", "cut-off", "deferred-revenue", "journals", "reconciliation"],
  },

  {
    slug: "foreign-currency-ledger-audit",
    name: "Foreign currency ledger audit",
    category: "ledger",
    subcategory: "Multi-currency",
    description:
      "Audits the multi-currency mechanics of the ledger: rate sourcing, transaction versus revaluation rates, the composition of FX gain and loss, and the treatment of intercompany and translation balances.",
    defaultTitle: "Foreign Currency Ledger Audit",
    auditDescription:
      "A review of how foreign currency transactions are rated, remeasured and translated in the ledger, and whether the resulting FX gains and losses are explainable.",
    instructions: `Your objective is to determine whether this ledger's foreign currency machinery produces explainable numbers — and to explain them.

Establish the ground truth first. Ask the user for the functional currency of each entity, the presentation currency, the exchange rate source, and the frequency of the revaluation run. Without those, your conclusions are structurally limited and you must say so.

Then test rate integrity at the transaction level. Compare the rate implied by each foreign currency entry (base amount divided by transaction amount) against the published rate for that date from the stated source. You are looking for the shape of the deviations, not a threshold: rates that are flat across many days suggest a hard-coded or stale rate table; rates that jump discontinuously suggest a missed feed; a period-average rate applied to an individual transaction where a spot rate belongs is a mechanism failure that will recur every period.

Distinguish monetary from non-monetary balances explicitly. Monetary balances — cash, receivables, payables, loans — should be remeasured at the closing rate; non-monetary balances such as prepayments, inventory, fixed assets and equity should stay at historic rates. Revaluation touching a non-monetary account, or a monetary account excluded from the revaluation run, are both worth pursuing. Confirm which accounts the revaluation actually touched by tracing the run's journal.

Decompose FX gain and loss rather than accepting it as a single number. Separate realised from unrealised, separate by currency pair, and separate by driver: settlement of receivables and payables, revaluation of balances, and translation. Then ask whether the movement is consistent with the currency's actual movement over the period and the size of the exposed balances. A gain that does not track the underlying rate movement in direction or scale is the strongest signal in this audit.

Look at intercompany balances specifically: mismatched rates on the two sides of an intercompany pair generate FX noise and prevent elimination. Examine the cumulative translation adjustment for entries that were posted directly rather than generated by translation.

Weigh innocent explanations: hedging, a genuine change of rate source, a currency redenomination, a legitimate policy of using monthly average rates for high-volume postings.

Cite the file, sheet, account, journal ID, row and currency for every material claim, and label each as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Write for a group controller comfortable with FX mechanics. Do not conclude on standards compliance; defer that to a licensed professional.`,
    recommendedInputs: [
      {
        name: "Multi-currency general ledger detail",
        description: "Entries with transaction currency, transaction amount, base amount, rate used and posting date.",
        formats: ["xlsx", "csv", "integration export"],
        required: true,
      },
      {
        name: "Exchange rate table used by the system",
        description: "The rates loaded into the ledger, by date and currency pair, including their source.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "FX gain/loss account detail",
        description: "Transaction-level movement in realised and unrealised FX accounts.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Revaluation run journals",
        description: "The journals generated by each period-end revaluation, showing accounts touched.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Independent reference rates",
        description: "Central bank or market rates for the period, for independent comparison.",
        formats: ["csv", "xlsx", "written text"],
        required: false,
      },
      {
        name: "Intercompany balance listing by currency",
        description: "Both sides of each intercompany pair with the rate applied.",
        formats: ["xlsx", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Ledger detail carrying both transaction currency amount and base currency amount for each entry.",
      "The exchange rate table applied by the system, with dates and stated source.",
      "Transaction-level FX gain and loss account movement for the period.",
      "A statement of each entity's functional currency and the group presentation currency.",
      "The period-end revaluation journals, or confirmation that no revaluation was run.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "audit_methodology",
      "executive_summary",
      "key_metric_card",
      "variance_card",
      "finding_card",
      "line_chart",
      "table",
      "entity_comparison",
      "recommendation_card",
      "assumption_box",
      "evidence_list",
    ],
    suggestedFollowups: [
      "What is the exchange rate source, how often is it loaded, and who is responsible for loading it?",
      "Which accounts are included in the revaluation run, and when was that configuration last reviewed?",
      "Why do the two sides of the intercompany balances translate at different rates?",
      "Does the FX gain recognised this period reconcile to the movement in exposed monetary balances?",
      "Are any hedging arrangements in place that would explain the offsetting FX movements observed?",
    ],
    relevantIntegrations: ["netsuite", "sap", "oracle_fusion", "dynamics365", "xero", "snowflake", "postgres"],
    tags: ["foreign-currency", "fx", "revaluation", "translation", "intercompany"],
  },

  {
    slug: "dormant-account-review",
    name: "Dormant account review",
    category: "ledger",
    subcategory: "Chart of accounts hygiene",
    description:
      "Identifies ledger accounts that have stopped moving, balances that have stopped clearing, and dormant accounts that suddenly reawaken — and asks what each of those states means.",
    defaultTitle: "Dormant Account Review",
    auditDescription:
      "A review of inactive general ledger accounts, stale non-zero balances, and reactivation events, aimed at chart of accounts hygiene and at balances that are quietly stuck.",
    instructions: `Your objective is to find the parts of this ledger that have gone quiet, and to work out whether the quiet is benign, a housekeeping problem, or a place where something is parked.

Dormancy has three distinct shapes and you should treat them separately rather than producing one undifferentiated list.

First: accounts with a nil balance and no movement. These are largely a hygiene matter — chart of accounts bloat, accounts created for a one-off purpose, accounts inherited from a migration. The risk they carry is availability: an open, unused, unwatched account is a convenient destination. Note how many exist, how long they have been unused, and whether anyone owns the chart.

Second, and most important: accounts with a non-zero balance and no movement. Ask what kind of account it is, because the answer changes the meaning entirely. A clearing, suspense, or interim account is supposed to return to nil — a residual balance sitting there untouched means something failed to clear and nobody chased it. An accrual that has not moved across several periods is either an obligation that never materialised and should have been released, or one that was released and re-raised without anyone re-examining it. A prepayment that stopped amortising has stopped hitting profit. A receivable or payable balance frozen for many periods raises collectability or existence questions. For each stale balance, state how long it has been static, what its last movement was, and what its nature implies should have happened by now.

Third: reactivation. An account that was silent for a long stretch and then received an entry — particularly a manual entry, particularly near a period end — is the highest-value observation in this audit. Examine who posted it, what the narrative says, what the contra account is, and whether the amount is round.

Do not apply a fixed dormancy window or a balance cut-off. Ask the user what period of inactivity they consider dormant and what materiality basis applies; if they do not specify, describe the distribution of inactivity you observe, explain the basis you used, and label it as judgment.

Weigh innocent explanations: seasonal or annual accounts, statutory accounts touched only at year end, accounts held open for a closing entity, a genuine long-term deposit or bond.

Cite the account code, account name, balance, last movement date and source file for every material claim, and label each as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Write for a financial controller who owns the chart of accounts. Recommendations should distinguish accounts to close, balances to investigate, and balances to write off — and should note that write-off and closure decisions require sign-off by a licensed professional.`,
    recommendedInputs: [
      {
        name: "Chart of accounts",
        description: "Full account list with codes, names, types, status flags and owners where recorded.",
        formats: ["xlsx", "csv", "integration export"],
        required: true,
      },
      {
        name: "Trial balance across multiple consecutive periods",
        description: "Balances by account over enough periods to see movement or the absence of it.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "General ledger detail for the review window",
        description: "Transaction-level activity so last-movement dates and reactivation entries can be identified.",
        formats: ["xlsx", "csv", "integration export"],
        required: true,
      },
      {
        name: "Account ownership or responsibility matrix",
        description: "Who owns each account or account group and reconciles it.",
        formats: ["xlsx", "docx", "written text"],
        required: false,
      },
      {
        name: "Prior period account clean-up list",
        description: "Any earlier remediation list, to test whether closures actually happened.",
        formats: ["xlsx", "pdf"],
        required: false,
      },
    ],
    requiredEvidence: [
      "A complete chart of accounts including inactive and blocked accounts.",
      "Trial balances for a run of consecutive periods sufficient to establish inactivity.",
      "Ledger detail identifying the last movement date and amount for each account.",
      "Transaction detail for any account reactivated during the review window.",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "key_metric_card",
      "ledger_table",
      "aging_table",
      "finding_card",
      "risk_highlight",
      "account_movement_visualization",
      "control_weakness",
      "recommendation_card",
      "evidence_list",
      "limitation_box",
    ],
    suggestedFollowups: [
      "Which stale clearing or suspense balances have a known owner, and what is the plan to clear them?",
      "What is the process for closing an account that is no longer needed, and when was it last run?",
      "Who posted the entries that reactivated long-dormant accounts, and what was the business reason?",
      "Are any accruals carried forward for obligations that no longer exist?",
      "Which prepayments have stopped amortising, and why did the amortisation stop?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "sage", "netsuite", "dynamics365", "postgres", "snowflake"],
    tags: ["dormant-accounts", "chart-of-accounts", "stale-balances", "hygiene", "suspense"],
  },

  {
    slug: "high-value-transaction-review",
    name: "High-value transaction review",
    category: "ledger",
    subcategory: "Transaction testing",
    description:
      "Examines the ledger's largest transactions individually — their business rationale, authorisation, documentation and accounting treatment — with materiality set by the organisation, not by the platform.",
    defaultTitle: "High-Value Transaction Review",
    auditDescription:
      "A targeted review of the period's most significant individual transactions, testing rationale, approval, supporting documentation and treatment.",
    instructions: `Your objective is to look closely at the transactions that matter most by size, one at a time, and say whether each is explained.

Do not invent a value cut-off. Ask the user for the materiality threshold they want applied and the approval limits in their delegation of authority. If they decline to specify, do not fall back on a number of your own — instead rank transactions by magnitude, describe the distribution, explain where you drew your attention and why, and label that choice as judgment. Note that "large" is relative: an amount that is unremarkable in payroll may be extraordinary in a small overhead account, so assess significance against the account's own history as well as against the entity's scale.

For each selected transaction, build a short case file. What did the entity get or give up? Who is the counterparty, and do they exist elsewhere in the ledger or in the master data? Who initiated it, who approved it, and were those the same person? What documentation exists — contract, invoice, board minute, purchase order — and does the document's amount, date and counterparty agree to the entry? Does the accounting treatment follow from the substance of the arrangement, or from convenience?

Certain shapes deserve extra attention, but only as prompts for enquiry rather than conclusions. Round amounts with no supporting invoice. Transactions dated in the last days of the period. Transactions posted manually when the same category is normally automated. Related-party counterparties. Sequences of transactions to one counterparty that individually sit just under an approval limit disclosed by the user, where the limit itself is evidence, not a rule you supply.

Weigh innocent explanations before concluding: a genuine one-off acquisition, a settlement negotiated to a round figure, an annual licence renewal, a legitimate intercompany funding movement, a payment made under an approval granted verbally and documented later.

Cite the source file, sheet, journal ID, row, account, date, counterparty and amount for every material claim, and label each as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Where documentation is absent, that absence is the finding — state it as missing information and request the item rather than inferring intent.

Write for an audit committee or finance director: each item should be defensible and unemotive. Do not characterise any transaction as fraudulent, improper or non-compliant — describe what the evidence shows and what remains unexplained, and leave conclusions to a licensed professional.`,
    recommendedInputs: [
      {
        name: "General ledger transaction detail for the period",
        description: "All entries with date, account, amount, counterparty, narrative, source and posting user.",
        formats: ["xlsx", "csv", "integration export"],
        required: true,
      },
      {
        name: "Delegation of authority / approval limits",
        description: "The organisation's own approval thresholds and approver matrix.",
        formats: ["pdf", "docx", "xlsx", "written text"],
        required: false,
      },
      {
        name: "Supporting documents for selected transactions",
        description: "Invoices, contracts, purchase orders or minutes behind the largest items.",
        formats: ["pdf", "zip", "images"],
        required: true,
      },
      {
        name: "Approval records or workflow log",
        description: "Evidence of who approved each significant transaction and when.",
        formats: ["csv", "xlsx", "pdf"],
        required: false,
      },
      {
        name: "Counterparty master data",
        description: "Customer and supplier master records to test counterparty existence and relationships.",
        formats: ["csv", "xlsx", "integration export"],
        required: false,
      },
      {
        name: "Materiality basis",
        description: "The threshold and rationale the organisation wants applied to this review.",
        formats: ["written text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Complete ledger transaction detail for the period, at line level with amounts and counterparties.",
      "Supporting documentation for each transaction selected for examination.",
      "Evidence of authorisation for each selected transaction, or confirmation that none exists.",
      "The organisation's stated materiality basis or approval limits, or an explicit note that none was supplied.",
      "Counterparty master data covering the parties to the selected transactions.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "overall_risk_rating",
      "transaction_table",
      "finding_card",
      "risk_highlight",
      "missing_evidence_notice",
      "bar_chart",
      "source_citation",
      "recommendation_card",
      "management_question",
      "limitation_box",
    ],
    suggestedFollowups: [
      "What materiality threshold should govern this review, and who set it?",
      "Which of the selected transactions lack a contract or invoice, and where are those documents held?",
      "Was the initiator of any selected transaction also its approver?",
      "Do any of the selected counterparties have a relationship with officers or employees of the entity?",
      "Why were transactions in this category posted manually when equivalent activity is normally system-generated?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sap", "coupa", "ramp", "google_drive", "sharepoint"],
    tags: ["high-value", "transaction-testing", "authorisation", "materiality", "documentation"],
  },

  {
    slug: "user-posting-behavior-review",
    name: "User posting behavior review",
    category: "ledger",
    subcategory: "Access and segregation of duties",
    description:
      "Profiles who posts to the ledger — what they post, where, when and how much — and compares each user against their role, their peers and their own history.",
    defaultTitle: "User Posting Behavior Review",
    auditDescription:
      "An analysis of ledger posting activity by user, testing segregation of duties, role alignment, access appropriateness and behavioural change over time.",
    instructions: `Your objective is to build a picture of each person who touched this ledger and say whether their posting behaviour fits who they are supposed to be.

Start by building a per-user profile from the ledger itself: number of entries posted, total and net value, the set of accounts touched, the breadth of that set, the proportion of manual versus system-generated entries, the times and days of posting, and the concentration of activity in period-end days. Then obtain the user list with roles, join and leave dates, and the system's permission model. Without role data you can describe behaviour but cannot judge fit — say so if it is missing.

The comparisons are where the value is. Compare each user against their role: does someone in accounts payable post to revenue, equity, or reserves? Compare each user against their peers: within a group doing nominally the same job, does one person's account breadth or manual entry proportion stand apart, and is there a role reason? Compare each user against their own history: a step change in volume, in the accounts touched, or in posting hours is more informative than any absolute figure.

Then test segregation of duties directly. Identify entries where the preparer and approver are the same person, or where no approver is recorded at all. Identify users who both maintain master data (suppliers, customers, bank details) and post entries. Identify shared, generic, integration or service accounts posting manual journals — a manual entry from an account nobody personally owns is an accountability gap regardless of what it contains. Cross-check posting dates against leaver dates and against the dates access was granted.

Do not encode any threshold — no "more than N entries", no "after 8pm is suspicious". Ask the user for their segregation of duties policy, their approval requirements and their normal business hours, and reason from those. Where they are unavailable, describe the distribution, explain your basis for attention, and label it judgment.

Weigh innocent explanations seriously, because this audit names individuals: a small finance team where segregation is genuinely impossible, a month-end all-hands push, a cover arrangement during leave, a systems migration, a consultant posting under a shared login by agreement, a time zone difference that makes "night" postings ordinary.

Cite the source file, journal ID, user identifier, date and account for every material claim, and label each as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Frame findings about control design, not about people's integrity — describe patterns and the questions they raise, never motive. Write for a head of internal audit. Any conclusion about individual conduct is for management and a licensed professional, not this report.`,
    recommendedInputs: [
      {
        name: "Journal entry detail with posting user and timestamp",
        description: "Every entry with the user ID, creation timestamp, posting date and source.",
        formats: ["xlsx", "csv", "integration export"],
        required: true,
      },
      {
        name: "User list with roles and status",
        description: "Names, IDs, roles, departments, join and leave dates, active/inactive status.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "System permission or role matrix",
        description: "What each role is permitted to post, approve or maintain.",
        formats: ["xlsx", "pdf", "csv"],
        required: false,
      },
      {
        name: "Approval records for journals",
        description: "Preparer and approver identity per entry, where the system captures it.",
        formats: ["csv", "xlsx"],
        required: false,
      },
      {
        name: "Segregation of duties policy",
        description: "The organisation's stated rules on incompatible duties and approval requirements.",
        formats: ["pdf", "docx", "written text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Journal detail attributing each entry to a named user with a creation timestamp.",
      "A user listing with roles and joiner/leaver dates covering the review period.",
      "Preparer and approver identity for entries subject to approval, or confirmation that it is not captured.",
      "The organisation's segregation of duties or approval policy, or an explicit note that none was supplied.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "key_metric_card",
      "pivot_table",
      "heatmap",
      "finding_card",
      "control_weakness",
      "risk_matrix",
      "control_recommendation",
      "assumption_box",
      "evidence_list",
      "limitation_box",
    ],
    suggestedFollowups: [
      "Which users can both post a journal and approve it, and is that by design or by gap?",
      "Are any entries attributed to shared, generic or service accounts, and who operates those logins?",
      "Do any posting dates fall after a user's recorded leave date?",
      "Why does this user's account breadth differ so markedly from others in the same role?",
      "What changed in the period where this user's posting volume stepped up?",
    ],
    relevantIntegrations: ["netsuite", "sap", "dynamics365", "xero", "quickbooks", "oracle_fusion", "postgres"],
    tags: ["user-activity", "segregation-of-duties", "access", "controls", "journals"],
  },

  {
    slug: "backdated-posting-audit",
    name: "Backdated posting audit",
    category: "ledger",
    subcategory: "Period integrity",
    description:
      "Compares when entries were actually created against the dates they were booked to, testing period close integrity and the effect of backdating on figures already reported.",
    defaultTitle: "Backdated Posting Audit",
    auditDescription:
      "A review of the gap between entry creation timestamps and effective posting dates, focusing on entries booked into periods that were already closed or already reported.",
    instructions: `Your objective is to measure the distance between when entries were made and where they landed, and to say what that distance means for figures the organisation has already relied upon.

This audit lives or dies on having three dates per entry: the system creation timestamp (when a human or interface actually created it), the effective or document date (the transaction's own date), and the posting date (the period it hits). If the export carries only one date, this audit cannot be performed as designed — say so plainly rather than substituting a weaker analysis.

Build the lag distribution first. For every entry, compute creation date minus effective date, and describe the shape of the result across the population. Most of it will be ordinary: invoices entered a few days after their date, accruals dated to the period they belong to, an interface running on a delay. What you are looking for is the tail, and more importantly its composition. Ask whether the long-lag entries cluster by user, by account, by counterparty, or by amount.

Then apply the close calendar, which you must obtain from the user rather than assume. Ask when each period was closed, who can reopen a closed period, and what approval reopening requires. Entries created after a period's close date but booked inside it are the core of this audit. For each, establish: who created it, what it does, what its narrative says, and — critically — whether it changed a figure that had already been reported. An entry that shifts a previously published result is a different order of finding from one that lands in a closed but never-reported period. Reconcile the ledger as it now stands to the figures previously issued, and quantify the drift by account and by period.

Also examine reopened periods: how often, at whose request, and whether authorised under the organisation's own process.

Weigh innocent explanations before concluding: a genuine late supplier invoice properly dated, an audit adjustment agreed and correctly booked back, a system migration re-dating historic records, an interface backlog cleared in one batch.

Never assert a threshold of your own for what lag is acceptable — ask the user for their close policy and materiality, describe the observed distribution, and label your basis for attention as judgment.

Cite the file, journal ID, row, both dates, user and account for every material claim, and label each as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Write for a financial controller and audit committee. Do not characterise backdating as improper — set out the evidence and the effect on reported figures, and defer conclusions to a licensed professional.`,
    recommendedInputs: [
      {
        name: "Journal detail with creation timestamp and posting date",
        description: "Every entry carrying system creation time, effective/document date and posting period.",
        formats: ["xlsx", "csv", "integration export"],
        required: true,
      },
      {
        name: "Period close calendar",
        description: "The date each accounting period was closed, and any reopening events.",
        formats: ["xlsx", "csv", "written text"],
        required: true,
      },
      {
        name: "Previously reported financial statements or management accounts",
        description: "The figures issued for the affected periods, for comparison against the ledger as it stands now.",
        formats: ["pdf", "xlsx", "docx"],
        required: true,
      },
      {
        name: "Period reopening approvals",
        description: "Records of who authorised any reopening of a closed period.",
        formats: ["pdf", "csv", "xlsx"],
        required: false,
      },
      {
        name: "Close and adjustment policy",
        description: "The organisation's rules on post-close adjustments and who may make them.",
        formats: ["pdf", "docx", "written text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Journal detail containing both a system creation timestamp and an effective/posting date for each entry.",
      "The period close calendar, including any reopening dates.",
      "The financial figures previously reported for each affected period.",
      "The posting user for each entry created after its period's close date.",
      "The organisation's post-close adjustment policy, or an explicit note that none was supplied.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "audit_methodology",
      "executive_summary",
      "key_metric_card",
      "timeline",
      "scatter_chart",
      "finding_card",
      "transaction_table",
      "variance_card",
      "control_weakness",
      "recommendation_card",
      "evidence_list",
    ],
    suggestedFollowups: [
      "On what date was each period formally closed, and who has the ability to reopen it?",
      "Which entries created after close changed a figure that had already been reported externally?",
      "What business reason was recorded for each period reopening in the review window?",
      "Do the long-lag entries cluster around a particular user, account or counterparty, and why?",
      "Has the ledger as it stands today been reconciled back to the management accounts issued at the time?",
    ],
    relevantIntegrations: ["netsuite", "sap", "dynamics365", "xero", "quickbooks", "oracle_fusion", "snowflake"],
    tags: ["backdating", "period-close", "journals", "reporting-integrity", "timestamps"],
  },

  {
    slug: "reversal-activity-audit",
    name: "Reversal activity audit",
    category: "ledger",
    subcategory: "Journal integrity",
    description:
      "Separates routine auto-reversing accruals from discretionary manual reversals, and examines what happened after each reversal — whether it was re-posted, changed, or simply disappeared.",
    defaultTitle: "Reversal Activity Audit",
    auditDescription:
      "A review of reversal entries in the ledger: their volume, their reasons, their timing relative to reporting, and the fate of the amounts reversed.",
    instructions: `Your objective is to understand what this ledger's reversals are doing. A reversal is not inherently a problem — most ledgers reverse accruals every month by design. The question is which reversals were the system doing its job and which were a person changing their mind, and what happened next.

Begin by classifying. Separate system-generated auto-reversals (accruals and provisions flagged to reverse in the following period) from manual, discretionary reversals. Only the second population is really the subject of this audit; the first is a control operating normally, and treating them together will drown the signal. State the split.

For manual reversals, follow the amount rather than the entry. A reversal has three possible aftermaths and each means something different. Reversed and re-posted identically: usually a mechanical correction — wrong account, wrong entity, wrong period — and the interest lies in whether the same mistake recurs. Reversed and re-posted with a different amount: this is the highest-value pattern in the audit, because the difference is a change of judgement, and you should isolate it, quantify it, and ask what new information arrived between the two entries. Reversed and never re-posted: the original accrual or provision simply vanished; ask whether the underlying obligation genuinely ceased, and what evidence supports its disappearance.

Then look at timing. Position each manual reversal against the close calendar and against the date results were reported. Reversals raised in the days immediately after a period was closed or after results were shared deserve enquiry into what prompted them. Also examine who reverses: reversals of a person's own entries by that same person, with no second approver, are a control observation independent of the entry's merits.

Look at reason codes if the system captures them. Blank or default reason codes across a large body of reversals is itself a finding about the control, not about any single entry.

Do not apply a rule of your own about acceptable reversal rates or amounts. Ask the user for their accrual and reversal policy and their materiality basis; absent those, describe what you observe, explain your basis for attention, and label it judgment.

Weigh innocent explanations: a genuine estimate refined when the invoice arrived, a supplier dispute settled below the accrued amount, a correction of an interface error, an accrual for a project that was cancelled.

Cite the file, journal ID and row of both the original and the reversal, plus account, date, user and amount, and label each material claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Write for a controller and internal audit. Describe estimation behaviour and control gaps; do not allege earnings management or any impropriety — that judgement belongs to a licensed professional.`,
    recommendedInputs: [
      {
        name: "Journal detail flagged for reversals",
        description: "Entries with reversal indicators, links to the original entry, reason codes and posting user.",
        formats: ["xlsx", "csv", "integration export"],
        required: true,
      },
      {
        name: "Accrual and provision listing",
        description: "Opening accruals, additions, releases and reversals by account for the period.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Period close calendar and reporting dates",
        description: "When each period closed and when results were reported internally or externally.",
        formats: ["xlsx", "csv", "written text"],
        required: true,
      },
      {
        name: "Accrual and reversal policy",
        description: "The organisation's rules on raising, releasing and reversing accruals.",
        formats: ["pdf", "docx", "written text"],
        required: false,
      },
      {
        name: "Supporting documents for significant reversals",
        description: "Invoices, settlement letters or correspondence explaining why an accrual changed.",
        formats: ["pdf", "zip", "images"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Journal detail identifying reversal entries and linking each to its original entry.",
      "A flag or field distinguishing system auto-reversals from manual reversals, or an explicit note that none exists.",
      "Accrual and provision account movement for the review period.",
      "The close calendar and the dates results were reported.",
      "Reason codes or narratives recorded against manual reversals.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "key_metric_card",
      "trend_card",
      "transaction_table",
      "finding_card",
      "waterfall_chart",
      "root_cause_analysis",
      "control_weakness",
      "recommendation_card",
      "evidence_list",
      "limitation_box",
    ],
    suggestedFollowups: [
      "What proportion of reversals are system auto-reversals versus manual, and has that mix shifted?",
      "Which accruals were reversed and re-posted at a different amount, and what new information drove the change?",
      "Which accruals were reversed and never re-posted, and what evidence shows the obligation ceased?",
      "Are reversals of a preparer's own entries approved by anyone else?",
      "Why are reason codes blank on manual reversals, and should the field be made mandatory?",
    ],
    relevantIntegrations: ["netsuite", "sap", "dynamics365", "xero", "quickbooks", "sage", "postgres"],
    tags: ["reversals", "accruals", "journals", "estimates", "controls"],
  },

  {
    slug: "duplicate-journal-review",
    name: "Duplicate journal review",
    category: "ledger",
    subcategory: "Ledger data quality",
    description:
      "Hunts for the same economic event recorded twice — exact re-keys, re-run interface batches, near-duplicates with a shifted date or rounded amount — while carefully excluding legitimate recurring entries.",
    defaultTitle: "Duplicate Journal Review",
    auditDescription:
      "A review of the ledger for duplicated entries and batches, distinguishing genuine double-posting from recurring transactions that are supposed to look alike.",
    instructions: `Your objective is to find places where one economic event was recorded more than once, and to be honest about which candidates are real and which are simply recurring business.

Work in layers, because duplicates come in different grades and conflating them produces an unusable list.

Layer one, exact duplicates: identical amount, account, date, counterparty and narrative. Usually re-keying. Quick to identify, quick to confirm.

Layer two, batch duplicates: an entire journal batch or interface run posted twice. Look at batch IDs, source references and load timestamps. This is the most consequential grade because it moves many accounts at once, and it is often invisible line by line because each line looks ordinary. Check for identical batch totals appearing twice, and for the same source reference range loading more than once.

Layer three, near-duplicates: same amount and counterparty but a date shifted by a few days; same document reference with a rounded or slightly different amount; same invoice reaching the ledger by two paths (through the AP subledger and again as a manual accrual that was never reversed). Use whatever matching keys the data offers — document number, supplier reference, PO number, external transaction ID — and say which keys you used.

Then do the essential work of exclusion, which separates a useful review from noise. Recurring entries are supposed to repeat: rent, payroll, depreciation, subscriptions, standing intercompany charges. Establish the recurrence pattern from the ledger's own history before flagging anything, and report how many candidates you eliminated on that basis and why. A duplicate review that does not show its exclusions cannot be trusted.

For every surviving candidate, state the net effect: is the amount still in the accounts twice, or was one leg subsequently reversed, credited or netted? A duplicate that was caught and corrected is a control observation, not a misstatement, and the two should not be reported alike.

Do not set any threshold. Ask the user for their materiality basis and for the list of recurring entries they expect; where these are absent, describe your own basis and label it judgment.

Weigh innocent explanations: two genuinely separate invoices for the same amount from one supplier, a deposit and its matching final payment, split shipments, an intentional re-post after a rejected entry.

Cite the file, sheet, journal ID, batch ID and row of every entry in each candidate pair, and label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Write for a controller focused on data quality and the interface design that produced it. Recommendations should target the mechanism — duplicate checks, batch idempotency, reference discipline — not merely the correcting entries. Any decision to reverse a posting requires sign-off by a licensed professional.`,
    recommendedInputs: [
      {
        name: "Full journal entry detail for the period",
        description: "Line-level entries with journal ID, batch ID, date, account, amount, counterparty, reference and narrative.",
        formats: ["xlsx", "csv", "integration export"],
        required: true,
      },
      {
        name: "Interface or batch load log",
        description: "Source system, batch reference, load timestamp and record counts for each import.",
        formats: ["csv", "xlsx", "log"],
        required: false,
      },
      {
        name: "Accounts payable and receivable subledger",
        description: "Invoice-level detail to test whether documents reached the ledger by more than one path.",
        formats: ["csv", "xlsx", "integration export"],
        required: true,
      },
      {
        name: "List of recurring and standing journals",
        description: "Rent, payroll, depreciation and other entries that are meant to repeat.",
        formats: ["xlsx", "csv", "written text"],
        required: false,
      },
      {
        name: "Prior period ledger detail",
        description: "Enough history to establish recurrence patterns before flagging repeats.",
        formats: ["xlsx", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Line-level journal detail including journal and batch identifiers and source references.",
      "Enough prior-period history to establish which entries recur by design.",
      "Subledger detail for the documents underlying candidate duplicate pairs.",
      "Evidence of whether each candidate duplicate was subsequently reversed or credited.",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "data_quality_warning",
      "key_metric_card",
      "transaction_table",
      "finding_card",
      "table",
      "root_cause_analysis",
      "control_recommendation",
      "recommendation_card",
      "evidence_list",
      "limitation_box",
    ],
    suggestedFollowups: [
      "Does the ledger enforce a duplicate check on document reference and amount at entry, and can it be overridden?",
      "Are interface loads idempotent, and what prevents the same batch being posted twice?",
      "Which candidate duplicate pairs remain uncorrected in the closing balances?",
      "Which suppliers or references generate the most duplicate candidates, and why?",
      "Can you confirm the list of recurring journals so legitimate repeats can be excluded confidently?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sage", "odoo", "coupa", "postgres", "snowflake"],
    tags: ["duplicates", "data-quality", "journals", "interfaces", "controls"],
  },
];
