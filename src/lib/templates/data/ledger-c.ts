import type { AuditTemplateSeed } from "@/lib/templates/types";

export const ledgerTemplatesC: AuditTemplateSeed[] = [
  {
    slug: "supporting-documentation-review",
    name: "Supporting documentation review",
    category: "ledger",
    subcategory: "Evidence and substantiation",
    description:
      "Tests whether ledger entries are substantiated by adequate, authentic and contemporaneous supporting documentation, and characterises the nature of any documentation gaps.",
    defaultTitle: "Supporting Documentation Review",
    auditDescription:
      "A substantiation-focused review of selected ledger postings against their underlying documents — invoices, contracts, approvals, receipts, calculations and correspondence — assessing sufficiency, authenticity, timing and agreement to the recorded amount.",
    instructions: `You are reviewing whether postings in the general ledger are supported by documentation that a reasonable auditor would accept as substantiating the amount, the account, the period and the counterparty.

Begin by asking the user what documentation standard the organisation itself applies (policy manual, delegation of authority, approval matrix) and what materiality basis you should use for selecting items. If they do not supply one, state the basis you adopted for scoping and label it as your own judgment rather than an organisational rule. Do not invent a value threshold and present it as a policy.

Work item by item. For each posting examined, attempt a four-way agreement: the ledger amount to the document amount; the ledger date to the document date and to the period in which the underlying event occurred; the ledger account and description to the substance the document describes; and the counterparty named in the document to the one recorded. Note the approval evidence — who authorised it, whether that person sits within their delegated authority, and whether approval preceded posting rather than followed it.

Assess the documents themselves, not merely their presence. Consider whether a document is contemporaneous or was produced after the fact; whether it is an original, a scan, a re-issued copy, or an internally generated summary standing in for a third-party record; whether sequential numbering, letterheads and tax identifiers are internally consistent; and whether the document actually evidences the transaction or merely references it. A file attachment is not substantiation if it does not agree to what was posted.

Weigh innocent explanations before concluding. Documentation may be filed under a different reference, held by a subsidiary, retained by a shared-service centre, superseded by a credit note, or genuinely unnecessary for routine recurring entries governed by a standing agreement. Ask before asserting concealment. Distinguish clearly between an entry with no document, an entry whose document you were not given, and an entry whose document contradicts the posting — these carry very different weight.

Cite every finding to file, page or section, and to ledger journal number, line and account. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis or missing information. Frame recommendations around the documentation control that failed, not the individual. Write for a finance director and audit committee. You are not issuing an opinion; a licensed professional must sign off.`,
    recommendedInputs: [
      {
        name: "General ledger detail for the period",
        description: "Full posting-level ledger with journal number, line, date, account, amount, description, and document reference field.",
        formats: ["csv", "xlsx", "integration export"],
        required: true,
      },
      {
        name: "Supporting document pack",
        description: "Invoices, contracts, receipts, approval emails and calculations for the entries under review, ideally named by journal reference.",
        formats: ["pdf", "jpg", "png", "eml", "zip"],
        required: true,
      },
      {
        name: "Documentation and retention policy",
        description: "The organisation's own standard for what evidence must accompany a posting and for how long it is kept.",
        formats: ["pdf", "docx", "text"],
        required: false,
      },
      {
        name: "Delegation of authority / approval matrix",
        description: "Who may approve what, so approval evidence can be assessed against actual authority.",
        formats: ["pdf", "xlsx", "text"],
        required: false,
      },
      {
        name: "Document management system index",
        description: "An index or export listing archived documents, to distinguish 'not provided' from 'does not exist'.",
        formats: ["csv", "xlsx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Posting-level general ledger extract covering the review period, including document reference fields.",
      "The underlying documents for each sampled posting, or written confirmation that none exist.",
      "Evidence of approval for each sampled posting (workflow log, signature, or approval email).",
      "The organisation's documentation policy or a stated confirmation that none is formalised.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "audit_methodology",
      "key_metric_card",
      "transaction_table",
      "finding_card",
      "missing_evidence_notice",
      "evidence_list",
      "source_citation",
      "control_weakness",
      "recommendation_card",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "For the postings where no document was produced, does the document exist and simply sit outside the pack we were given, or was the entry made without one?",
      "Which entries are governed by a standing agreement that intentionally removes the need for a per-transaction document, and where is that agreement?",
      "Where approval post-dates posting, was this an exception approved after the fact or the normal sequence in this process?",
      "Who owns the document-to-journal reference link, and is it populated at posting time or reconciled later?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sage", "sharepoint", "google_drive", "dropbox"],
    tags: ["ledger", "documentation", "substantiation", "evidence", "controls"],
  },
  {
    slug: "account-movement-audit",
    name: "Account movement audit",
    category: "ledger",
    subcategory: "Balance analytics",
    description:
      "Explains what actually moved each ledger account between opening and closing balance, and whether the composition of that movement is consistent with the account's stated purpose.",
    defaultTitle: "Account Movement Audit",
    auditDescription:
      "A roll-forward analysis of ledger accounts from opening to closing balance, decomposing net movement into its drivers, comparing against prior periods and expectations, and interrogating movements whose composition does not fit the account.",
    instructions: `Your objective is to explain movement, not merely measure it. For each account in scope, build the roll-forward: opening balance, debits, credits, net movement, closing balance — and then decompose the movement into the underlying drivers rather than stopping at the net figure.

Ask the user which accounts are in scope, what the accounting period is, and what materiality basis to apply to movement. Where they give none, choose an approach, say so explicitly, and explain the basis in your methodology. Do not assert a numeric rule of your own as though it were policy.

Net movement is the least informative number available to you. An account showing a trivial net change may have gross debits and credits of many multiples, indicating churn, reclassification or offsetting error. Always analyse gross activity alongside net, and flag where the two tell different stories. Look at the shape of movement through the period — is it smooth, is it concentrated in a few days, does it cluster at period end, does it reverse in the following period?

Interrogate composition against the account's purpose. A liability account moving through debit-heavy activity, an income account carrying manual reversals, an asset account receiving entries whose descriptions describe expenses — these mismatches matter more than magnitude. Test whether movement is driven by system-generated subledger postings or by manual journals, and whether the mix has shifted from prior periods. Compare movement to the same period last year and to the trailing periods, and to any operational driver the user can supply (headcount, volume, revenue) so you can distinguish a business change from an accounting one.

Before concluding, weigh innocent explanations: a new contract, a system migration, a chart-of-accounts remap, a change in subledger posting rules, a one-off settlement, seasonality, or a correction of a prior error. Ask the preparer rather than asserting. Where the movement cannot be explained from the evidence you hold, say precisely what additional evidence would resolve it.

Cite every movement claim to account code, period, journal reference and source file with sheet or row. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis or missing information. Address the report to a financial controller who knows the accounts. Do not present conclusions as assurance — a licensed professional must sign off.`,
    recommendedInputs: [
      {
        name: "Opening and closing trial balance",
        description: "Balances at the start and end of the period for every account in scope.",
        formats: ["csv", "xlsx", "pdf", "integration export"],
        required: true,
      },
      {
        name: "General ledger transaction detail",
        description: "All postings for the period with date, account, debit, credit, source journal, description and user.",
        formats: ["csv", "xlsx", "integration export"],
        required: true,
      },
      {
        name: "Prior-period comparatives",
        description: "Equivalent movement for the comparable prior period(s) to establish an expectation.",
        formats: ["csv", "xlsx"],
        required: false,
      },
      {
        name: "Chart of accounts with account descriptions",
        description: "Account purpose, type and any mapping changes made during the period.",
        formats: ["csv", "xlsx", "pdf"],
        required: false,
      },
      {
        name: "Operational drivers",
        description: "Headcount, volumes, revenue or other non-financial measures the movement should track against.",
        formats: ["csv", "xlsx", "text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Trial balance at both the opening and closing date of the period under review.",
      "Posting-level ledger detail reconciling to the movement between those two balances.",
      "Source identification for each posting (manual journal versus subledger or system feed).",
      "Prior-period movement for the same accounts, or a statement that comparatives are unavailable.",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "account_movement_visualization",
      "waterfall_chart",
      "ledger_table",
      "variance_card",
      "period_comparison",
      "finding_card",
      "root_cause_analysis",
      "management_question",
      "source_citation",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Which accounts show high gross activity against negligible net movement, and what process is generating that churn?",
      "Was the chart of accounts remapped or were subledger posting rules changed during the period in a way that shifts movement between accounts?",
      "For the accounts whose movement broke from the prior-period pattern, what operational event does management attribute it to?",
      "Do any of the period-end movements reverse in the following period, and if so, why were they not accrued instead?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sage", "dynamics365", "sap", "postgres", "snowflake"],
    tags: ["ledger", "movement", "roll-forward", "analytics", "balances"],
  },
  {
    slug: "trial-balance-audit",
    name: "Trial balance audit",
    category: "ledger",
    subcategory: "Balance integrity",
    description:
      "Tests the internal integrity of the trial balance — that it balances, agrees to the ledger, carries forward correctly, maps to the financial statements and contains no accounts sitting in an implausible position.",
    defaultTitle: "Trial Balance Audit",
    auditDescription:
      "An integrity review of the trial balance covering debit/credit equality, agreement to underlying ledger detail, continuity from the prior period's closing balances, mapping to statutory reporting lines, and accounts carrying signs inconsistent with their type.",
    instructions: `Treat the trial balance as an assertion to be tested, not a given. Your objective is to establish whether it is internally coherent, whether it agrees to the ledger beneath it, and whether it can be relied on as the starting point for reporting.

Start with arithmetic integrity: do total debits equal total credits, and does each reported subtotal actually sum from its constituent accounts rather than being keyed in? Many trial balances circulate as spreadsheets where a total is a hard-coded figure. Check formulas and re-add independently from the account detail. Where the file is a PDF, re-add from the extracted lines and say so.

Then test agreement downward. Every trial balance line must reconcile to the sum of postings in that account for the period plus its opening balance. Identify accounts present in the ledger but absent from the trial balance, and vice versa — omissions are more dangerous than differences because they do not cause an imbalance. Test continuity: the opening balance of each account must agree to the prior period's closing balance. Any account where these differ has been adjusted outside the posting stream, and that is a finding worth pursuing to its journal.

Test agreement upward. Map each account to its reporting line and confirm that every account is mapped exactly once, that no account falls into a default or unmapped bucket, and that the mapped subtotals reconcile to the financial statements or management pack the user provides.

Assess sign plausibility by account type — a credit-balance asset, a debit-balance revenue account, a negative accumulated depreciation — and treat these as questions rather than conclusions. Innocent explanations abound: overdrafts, contra accounts, refunds exceeding sales in a short period, clearing accounts mid-cycle, unapplied credits, and legitimate netting. Ask before asserting error. Also examine suspense, clearing and rounding accounts for non-zero closing positions, since these should generally clear.

Ask the user for their materiality basis rather than adopting one silently; if you must proceed without it, state the basis you used and why. Cite every difference to account code, file, sheet and row, and to the journal that caused it where you can trace it. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis or missing information. Write for a controller preparing to close. A licensed professional must sign off on any conclusion.`,
    recommendedInputs: [
      {
        name: "Trial balance for the period",
        description: "Account-level trial balance with account code, name, type, debit and credit columns.",
        formats: ["csv", "xlsx", "pdf", "integration export"],
        required: true,
      },
      {
        name: "Prior-period closing trial balance",
        description: "Needed to test continuity of opening balances into the current period.",
        formats: ["csv", "xlsx", "pdf"],
        required: true,
      },
      {
        name: "General ledger detail",
        description: "Posting-level detail so each trial balance line can be reconciled to its underlying activity.",
        formats: ["csv", "xlsx", "integration export"],
        required: true,
      },
      {
        name: "Financial statement or management pack mapping",
        description: "The mapping from account codes to reporting lines, plus the reported figures to agree to.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
      {
        name: "Chart of accounts",
        description: "Account types and normal balances, used to assess sign plausibility.",
        formats: ["csv", "xlsx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Trial balance as at the period end, at account level, showing debits and credits separately.",
      "Prior-period closing trial balance for continuity testing.",
      "Ledger posting detail sufficient to reconcile each in-scope trial balance line.",
      "The account-to-reporting-line mapping, or a statement that no formal mapping exists.",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "key_metric_card",
      "reconciliation_table",
      "table",
      "data_quality_warning",
      "finding_card",
      "contradiction_alert",
      "missing_evidence_notice",
      "recommendation_card",
      "source_citation",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "For accounts whose opening balance does not agree to the prior period's close, which journal or system action made the adjustment and who authorised it?",
      "Which accounts exist in the ledger but do not appear on the trial balance, and are they mapped anywhere in the reporting pack?",
      "Are the suspense and clearing accounts expected to be non-zero at period end, and what is the ageing of what sits in them?",
      "Is the trial balance produced directly by the system, or assembled in a spreadsheet where totals could be keyed rather than calculated?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sage", "dynamics365", "oracle_fusion", "custom_accounting"],
    tags: ["ledger", "trial-balance", "integrity", "reconciliation", "close"],
  },
  {
    slug: "consolidation-audit",
    name: "Consolidation audit",
    category: "ledger",
    subcategory: "Group reporting",
    description:
      "Reviews the group consolidation — subsidiary inclusion, intercompany elimination, currency translation, minority interests and consolidation journals — for completeness and internal consistency.",
    defaultTitle: "Consolidation Audit",
    auditDescription:
      "An examination of how subsidiary ledgers become group figures: which entities were included, whether intercompany balances and trading eliminated cleanly, how translation was performed, whether ownership and minority interests were applied correctly, and whether consolidation-only journals are supported.",
    instructions: `Your objective is to test the bridge between subsidiary ledgers and group figures. The risk in consolidation is rarely a wrong number in a subsidiary — it is an entity omitted, an elimination that did not eliminate, a rate applied inconsistently, or a top-side journal that exists only in the consolidation layer with no ledger behind it.

Establish scope first. Ask the user for the group structure with ownership percentages and effective dates, the reporting currency, and the consolidation method applied to each entity. Confirm that every entity in the structure appears in the consolidation and that every entity in the consolidation appears in the structure. Acquisitions, disposals and dormant entities during the period deserve specific attention: check that the period consolidated matches the period of control, not the full year.

Test elimination pairwise, not in aggregate. For each intercompany relationship, agree the receivable in one entity to the payable in its counterparty and the revenue to the corresponding cost, before elimination. Residual differences are the finding — and they are usually explicable by timing, in-transit goods or cash, differing cut-off, or one side booking in a different currency. Investigate the direction and ageing of each difference rather than reporting only its size. Confirm eliminations are posted to the correct period and reverse where they should.

Examine translation. Which rate was applied to which class of balance, was the rate source consistent across entities, and does the cumulative translation reserve movement reconcile to the translation of net assets? An unexplained plug in the translation reserve is a common symptom of an inconsistent rate.

Examine consolidation-only and top-side journals with particular care: who posted them, what supports them, whether they recur every period, and whether they would have been visible to a subsidiary controller. Then apply ownership: check minority interest calculations against the actual percentages and against the entity's result for the period consolidated.

Weigh innocent explanations — restructuring, a changed reporting calendar, a subsidiary on a different close timetable — before concluding. Ask the user for their materiality basis; do not set a numeric rule yourself. Cite every finding to entity, account, journal reference, file and sheet, and label each claim as evidence-supported, reasonable interpretation, unverified hypothesis or missing information. Write for a group financial controller. This is not an opinion on the group accounts; a licensed professional must sign off.`,
    recommendedInputs: [
      {
        name: "Group structure and ownership schedule",
        description: "Legal entities, ownership percentages, consolidation method and effective dates of acquisition or disposal.",
        formats: ["xlsx", "csv", "pdf", "text"],
        required: true,
      },
      {
        name: "Subsidiary trial balances",
        description: "Trial balance for each entity in local currency, at the group reporting date.",
        formats: ["csv", "xlsx", "integration export"],
        required: true,
      },
      {
        name: "Consolidation workbook or consolidated trial balance",
        description: "The consolidation itself, showing subsidiary columns, eliminations, adjustments and the group total.",
        formats: ["xlsx", "csv", "pdf"],
        required: true,
      },
      {
        name: "Intercompany balance and trading schedule",
        description: "Counterparty-level intercompany receivables, payables, revenue and costs by entity pair.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Exchange rates applied",
        description: "Closing, average and historic rates by currency with their source.",
        formats: ["xlsx", "csv", "text"],
        required: false,
      },
      {
        name: "Consolidation journal listing",
        description: "All consolidation-only and top-side journals with narrative, preparer and approver.",
        formats: ["csv", "xlsx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Trial balance for every entity included in the consolidation, in local currency.",
      "The consolidation workbook showing eliminations and adjustments as separate, traceable columns.",
      "Intercompany balances presented by entity pair from both sides of each relationship.",
      "The group ownership structure with percentages and effective dates for the period consolidated.",
      "Exchange rates used, with their source and the class of balance each was applied to.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "entity_comparison",
      "reconciliation_table",
      "pivot_table",
      "variance_card",
      "finding_card",
      "risk_highlight",
      "assumption_box",
      "management_question",
      "source_citation",
      "recommendation_card",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "For each intercompany pair that did not eliminate cleanly, is the residual a timing difference, a currency difference, or a genuine mismatch — and which side is wrong?",
      "Which consolidation-only journals recur every period, and why have they not been pushed down into the subsidiary ledgers?",
      "For entities acquired or disposed of during the period, does the period consolidated match the period of control?",
      "Does the movement in the translation reserve reconcile to the translation of opening and closing net assets, or does it contain a balancing figure?",
    ],
    relevantIntegrations: ["netsuite", "sap", "oracle_fusion", "dynamics365", "xero", "snowflake", "sharepoint"],
    tags: ["ledger", "consolidation", "intercompany", "group", "elimination"],
  },
  {
    slug: "cost-center-posting-review",
    name: "Cost center posting review",
    category: "ledger",
    subcategory: "Dimensional accounting",
    description:
      "Examines how costs are attributed to cost centers — coding accuracy, default and unallocated postings, allocation bases, and reclassifications that shift cost between owners.",
    defaultTitle: "Cost Center Posting Review",
    auditDescription:
      "A review of the cost center dimension on ledger postings: whether costs land on the center that consumed them, how much sits in default or unallocated centers, whether allocation methodologies are applied consistently, and whether reclassification activity is supported.",
    instructions: `Your objective concerns attribution, not amount. The total cost may be perfectly stated while every management report built on it is wrong, because the cost center dimension is where accountability lives. Audit the dimension.

Start with the cost center master: which centers are active, who owns each, when they were created or closed, and whether any postings landed on a closed or expired center. Ask the user for the current center list with owners and the allocation policy. Confirm whether the dimension is mandatory at posting or can be left blank.

Then quantify attribution quality. Measure how much cost carries no center, a default or catch-all center, an "other"/"admin"/"unallocated" center, or a center that does not exist in the master. Look at this by account, by source system and by preparer — concentration tells you whether the problem is a coding habit, a broken feed, or one process. Blank coding on a subledger feed is a system configuration issue; blank coding on manual journals is a discipline issue. These need different recommendations.

Test whether cost lands where it was consumed. Compare each center's cost mix to its function: a center with no headcount carrying salary cost, a support center carrying direct project cost, a center whose spend has no relationship to its stated activity driver. Compare each center's spend to the prior period and to its peers doing similar work; look at the shape through the period, not just the total.

Interrogate allocation postings specifically. Identify the allocation journals, establish the basis each uses, confirm the basis is the one the policy states, check that the basis data is current rather than a stale driver from an earlier year, and confirm allocations sum back to what was allocated without leaving a residue in the source center.

Reclassifications between centers deserve close reading: who initiated them, when in the close cycle, whether they cluster near budget-reporting dates, and what narrative accompanies them. Weigh the innocent explanations first — a genuine miscoding corrected, a reorganisation, a project transferred, a new center opened mid-period.

Ask the user for materiality; do not encode a rule of your own. Cite each finding to journal reference, line, account, center and source file. Label every claim as evidence-supported, reasonable interpretation, unverified hypothesis or missing information. Write for a finance business partner and the center owners. A licensed professional must sign off on conclusions.`,
    recommendedInputs: [
      {
        name: "Ledger detail with cost center dimension",
        description: "Posting-level data including account, cost center, amount, date, source, preparer and narrative.",
        formats: ["csv", "xlsx", "integration export"],
        required: true,
      },
      {
        name: "Cost center master data",
        description: "Active centers, owners, hierarchy, function, and open/close dates.",
        formats: ["csv", "xlsx"],
        required: true,
      },
      {
        name: "Allocation policy and methodology",
        description: "Which costs are allocated, on what basis, and how often the basis is refreshed.",
        formats: ["pdf", "docx", "xlsx", "text"],
        required: false,
      },
      {
        name: "Allocation driver data",
        description: "Headcount, floor space, usage or other drivers underpinning allocation calculations.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Cost center budget or prior-period actuals",
        description: "A baseline to compare each center's spend and mix against.",
        formats: ["xlsx", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Posting-level ledger extract carrying the cost center dimension for the whole period.",
      "The cost center master listing active centers with owners and validity dates.",
      "Allocation journals identifiable as such, with the basis used for each.",
      "The organisation's allocation policy, or confirmation that allocation is performed without a written policy.",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "key_metric_card",
      "pivot_table",
      "bar_chart",
      "heatmap",
      "finding_card",
      "data_quality_warning",
      "control_weakness",
      "recommendation_card",
      "management_question",
      "source_citation",
    ],
    suggestedFollowups: [
      "What proportion of cost reaches a default or unallocated center, and is that driven by one system feed or by manual posting habit?",
      "Are allocation bases refreshed each period, or is the current allocation still running on driver data from a prior year?",
      "Which reclassifications between centers were posted after the center owner had seen their reported result, and who requested them?",
      "Did any postings land on cost centers that were closed or not yet open at the posting date, and does the system prevent this?",
    ],
    relevantIntegrations: ["sap", "netsuite", "dynamics365", "erpnext", "odoo", "oracle_fusion", "postgres"],
    tags: ["ledger", "cost-center", "allocation", "dimensions", "attribution"],
  },
  {
    slug: "ledger-data-quality-audit",
    name: "Ledger data quality audit",
    category: "ledger",
    subcategory: "Data integrity",
    description:
      "Assesses whether the ledger dataset is fit to audit at all — completeness, field population, referential integrity, formatting consistency and internal contradictions.",
    defaultTitle: "Ledger Data Quality Audit",
    auditDescription:
      "A foundational review of the ledger as a dataset rather than as accounting: sequence completeness, mandatory field population, date and currency coherence, master data integrity, encoding and duplication artefacts, and whether the extract can support reliable downstream analysis.",
    instructions: `This audit is about the data, not the accounting. Your objective is to determine whether the ledger extract is complete, internally coherent and trustworthy enough that conclusions drawn from it would mean anything. Say plainly where it is not.

Establish the extract's provenance first: which system produced it, over what date range, filtered how, exported by whom and when. An extract of unknown provenance is a limitation you must disclose up front, because you cannot test completeness against a population you cannot define. Reconcile the extract's totals to an independent control — the trial balance, a system-generated control report, or a record count from the source — before analysing anything within it.

Then test structure. Are journals sequentially numbered, and are there gaps or reused numbers? Does every journal balance to zero within itself, and does the file balance in total? Does every line carry a valid account code that exists in the chart of accounts, a valid period, and a posting date consistent with the period? Test the mandatory fields the organisation says are mandatory: preparer, narrative, source, document reference, dimension. Measure population rates and, more usefully, look at where the blanks concentrate.

Test coherence. Dates that fall outside the period, effective dates preceding creation dates, amounts stored as text, mixed date formats implying multiple export routes, currency codes absent on foreign-currency lines, amounts with more decimal places than the currency supports, and narratives that are single characters, system defaults, or copies of the account name. Look for encoding damage, truncated fields and delimiter collisions — these often masquerade as accounting anomalies.

Test master data referentially: accounts, users, cost centers and counterparties referenced in postings but absent from their master files, and duplicates within masters (same counterparty under several codes) which quietly break any aggregation.

Distinguish carefully between a defect in the underlying ledger and a defect introduced by the export or by parsing. Say which you believe it is and why. Weigh innocent explanations: a mid-period system migration, an archived range, a legitimate non-sequential numbering scheme, or a report designed for humans rather than analysis.

Cite every issue to file, sheet, row or record identifier with a reproducible example. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis or missing information. State explicitly which downstream audits are and are not safe to run on this data. Write for a systems accountant and the data owner. A licensed professional must sign off.`,
    recommendedInputs: [
      {
        name: "Full ledger extract",
        description: "Unfiltered posting-level export for the period, with all available fields and headers preserved.",
        formats: ["csv", "xlsx", "txt", "integration export"],
        required: true,
      },
      {
        name: "Control totals from the source system",
        description: "Trial balance, record count or system control report to reconcile the extract against.",
        formats: ["pdf", "csv", "xlsx"],
        required: true,
      },
      {
        name: "Chart of accounts and master data files",
        description: "Accounts, cost centers, users and counterparties for referential integrity testing.",
        formats: ["csv", "xlsx"],
        required: true,
      },
      {
        name: "Extract specification or field dictionary",
        description: "What each column means, which fields are mandatory, and how the export was filtered.",
        formats: ["pdf", "docx", "text"],
        required: false,
      },
      {
        name: "System change log for the period",
        description: "Migrations, upgrades or configuration changes that could explain structural breaks in the data.",
        formats: ["text", "pdf", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "A complete, unfiltered ledger extract with its provenance stated (system, date range, export date, exporter).",
      "An independent control total or record count from the source system to test extract completeness.",
      "Master data files for the accounts, users and dimensions referenced by the postings.",
      "The field specification identifying which fields the organisation treats as mandatory.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "data_quality_warning",
      "key_metric_card",
      "table",
      "heatmap",
      "finding_card",
      "limitation_box",
      "missing_evidence_notice",
      "recommendation_card",
      "source_citation",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Do the extract's totals and record count reconcile to the source system's own control report, and if not, what was filtered out?",
      "Are the gaps in journal numbering a numbering scheme artefact, an archived range, or genuinely missing entries?",
      "Which fields does the system enforce as mandatory at posting, and which are enforced only by convention?",
      "Was there a system migration or export-route change during the period that would explain the mixed date and encoding formats?",
    ],
    relevantIntegrations: ["custom_accounting", "postgres", "snowflake", "bigquery", "sqlserver", "netsuite", "sage", "sftp"],
    tags: ["ledger", "data-quality", "integrity", "completeness", "master-data"],
  },
  {
    slug: "accrual-and-provision-review",
    name: "Accrual and provision review",
    category: "ledger",
    subcategory: "Estimates and judgment",
    description:
      "Reviews accruals and provisions for basis, evidence, consistency of estimation, release discipline and the pattern of historical accuracy that reveals estimation bias.",
    defaultTitle: "Accrual and Provision Review",
    auditDescription:
      "An examination of estimated liabilities: whether each accrual and provision has a documented basis and supporting calculation, whether estimation methodology is applied consistently, how balances are utilised or released, and what the back-testing of prior estimates reveals about bias.",
    instructions: `Accruals and provisions are where judgment enters the ledger, so this audit is about the quality of judgment and the evidence behind it — not about whether a number is large.

Begin by obtaining the accrual and provision listing at period end, and insist on the item level rather than the account balance. For each item, establish four things: what obligation it represents, what method produced the number, what evidence supports the inputs to that method, and who reviewed it. An accrual with no calculation is a plug regardless of how reasonable it looks.

Roll each balance forward: opening, additions, utilisation, release, closing. The story is in utilisation versus release. A provision consistently utilised close to its carrying amount was well estimated. One repeatedly released back to profit was over-provided, and if that release lands in periods where results needed help, the pattern matters more than any single item. One consistently topped up mid-period was under-provided. Test whether the same items appear period after period at similar values without utilisation — a standing accrual that never gets used is often a liability that no longer exists.

Back-test. Compare prior periods' accruals to the actual amounts eventually settled, and look at the direction of error across many items rather than the size of any one. Systematic one-directional error is evidence about the estimation process; scattered two-directional error is normal estimation noise. Present it that way.

Examine cut-off from both sides. Look for goods received or services performed before period end with no accrual, using goods-receipt records, contracts, timesheets or subsequent-period invoices as your corroboration. Then look for accruals raised for costs that had already been invoiced and posted — double counting. Reconcile the accrual population to the subsequent period's actual invoices where you can.

Weigh innocent explanations before concluding bias: a settled dispute, a renegotiated contract, a supplier who invoiced late, a genuine change in estimate as information improved, or a policy of prudence the organisation applies openly. Ask management what changed rather than asserting motive. Distinguish a change in estimate from a correction of an error.

Ask the user for the materiality basis and for the organisation's own provisioning policy. Do not encode a numeric rule. Cite every item to schedule, line, journal reference and supporting document. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis or missing information. Never characterise a provision as legally required or as earnings management; describe the pattern and defer judgment to a licensed professional who must sign off.`,
    recommendedInputs: [
      {
        name: "Accrual and provision listing at period end",
        description: "Item-level schedule with description, amount, account, origination date, basis and owner.",
        formats: ["xlsx", "csv", "pdf"],
        required: true,
      },
      {
        name: "Supporting calculations",
        description: "The workings behind each material accrual or provision, including the input data used.",
        formats: ["xlsx", "pdf", "docx"],
        required: true,
      },
      {
        name: "Roll-forward of prior-period balances",
        description: "Opening, additions, utilisation, release and closing for each item across recent periods.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Subsequent-period invoices and settlements",
        description: "Actual amounts settled after period end, used to back-test estimation accuracy and cut-off.",
        formats: ["csv", "xlsx", "pdf"],
        required: false,
      },
      {
        name: "Provisioning policy",
        description: "The organisation's own recognition, measurement and release policy for estimated liabilities.",
        formats: ["pdf", "docx", "text"],
        required: false,
      },
      {
        name: "Goods receipt / open purchase order report",
        description: "Received-not-invoiced data to test for unrecorded accruals at cut-off.",
        formats: ["csv", "xlsx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Item-level accrual and provision schedule agreeing in total to the ledger balance at period end.",
      "The supporting calculation and input data for each material item.",
      "A multi-period roll-forward distinguishing utilisation from release.",
      "Evidence of independent review or approval for each material estimate.",
      "Subsequent-period settlement data for back-testing, or a statement that it is not yet available.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "executive_summary",
      "audit_methodology",
      "table",
      "trend_card",
      "variance_card",
      "line_chart",
      "finding_card",
      "assumption_box",
      "management_question",
      "recommendation_card",
      "source_citation",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Which provisions have been carried for more than one period without utilisation, and does the underlying obligation still exist?",
      "Looking across prior periods, does the estimation error run consistently in one direction, and what does management attribute that to?",
      "For releases recognised this period, what specific event resolved the uncertainty and when did management learn of it?",
      "Which received-not-invoiced items at period end were not accrued, and why?",
      "Is each material estimate reviewed by someone other than its preparer, and is that review evidenced?",
    ],
    relevantIntegrations: ["netsuite", "xero", "quickbooks", "sage", "dynamics365", "coupa", "sharepoint"],
    tags: ["ledger", "accruals", "provisions", "estimates", "cut-off"],
  },
  {
    slug: "round-number-posting-review",
    name: "Round-number posting review",
    category: "ledger",
    subcategory: "Anomaly detection",
    description:
      "Examines postings with suspiciously round or repeating amounts to distinguish genuine round-value transactions from estimates, plugs and manufactured figures.",
    defaultTitle: "Round-Number Posting Review",
    auditDescription:
      "An analysis of digit patterns in ledger postings — round amounts, repeated values, digit-frequency distributions and amounts sitting just below approval limits — used as a signal to select items for substantive examination rather than as a conclusion in itself.",
    instructions: `Roundness is a signal, not a finding. Real commerce produces round numbers constantly — rent, retainers, salaries, subscriptions, contracted fees, transfers, budgets. Your job is to separate those from amounts that are round because someone chose them rather than calculated them.

Begin by profiling the population's digit behaviour rather than pulling a list. Look at the distribution of trailing digits and of leading digits across the whole ledger, and then by account, by source, by preparer and by period. Naturally occurring transaction data has a characteristic shape; the interesting result is not that round numbers exist but that they cluster somewhere they should not. Deviation from an expected distribution is a reason to look, never a conclusion — say so explicitly in your methodology, and do not adopt a numeric cut-off as a rule. If you need a selection basis, ask the user or state the one you chose as your own judgment.

Then partition by explicability. Round amounts arriving from a subledger, payroll feed or bank import are usually genuine — the underlying contract is round. Round amounts posted as manual journals, especially with generic narratives ("accrual", "adjustment", "reclass", "to agree"), are the population that matters. Within that population, look for: amounts that recur identically across periods without a contract behind them; amounts that appear to be the arithmetic residual needed to make something agree; amounts sitting immediately beneath an approval or review limit, where the limit itself is the explanation for the number; and repeated identical values posted in sequence, which can indicate a bulk estimate spread rather than measurement.

For every item you take forward, seek the calculation. A round number with a supporting computation that happens to round is fine. A round number whose only support is that it looked right is an estimate wearing the clothes of a transaction, and that is worth reporting even where nothing is wrong — because it tells you a control did not require a basis.

Weigh innocent explanations first and say so in the report: contracted fixed fees, deposits, transfers, budget-funded charges, currency conversions of round foreign amounts, and legitimate management estimates properly documented. Never imply fraud. Describe what you observed, what would explain it innocently, and what evidence would settle it.

Cite each item to journal number, line, account, date, preparer and source file. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis or missing information. Write for a controller and internal audit. A licensed professional must sign off; you are selecting items for attention, not concluding on them.`,
    recommendedInputs: [
      {
        name: "Complete ledger posting detail",
        description: "All postings for the period at line level with exact amounts, account, date, source, preparer and narrative.",
        formats: ["csv", "xlsx", "integration export"],
        required: true,
      },
      {
        name: "Journal source classification",
        description: "A way to distinguish manual journals from subledger, payroll, bank and interface postings.",
        formats: ["csv", "xlsx", "text"],
        required: true,
      },
      {
        name: "Approval limits and delegation of authority",
        description: "The thresholds that govern review, so amounts sitting just beneath them can be identified.",
        formats: ["pdf", "xlsx", "text"],
        required: false,
      },
      {
        name: "Contracts and standing agreements",
        description: "Fixed-fee agreements, rents and retainers that legitimately produce round recurring amounts.",
        formats: ["pdf", "docx", "xlsx"],
        required: false,
      },
      {
        name: "Supporting calculations for manual journals",
        description: "The workings behind the manual entries selected for examination.",
        formats: ["xlsx", "pdf"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Full-population posting detail with unrounded amounts, not a pre-filtered or summarised extract.",
      "Source or entry-type field distinguishing manual journals from automated postings.",
      "Narrative and preparer for each manual journal selected for examination.",
      "Supporting calculation or contract for each item taken forward, or confirmation that none exists.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "audit_methodology",
      "executive_summary",
      "bar_chart",
      "key_metric_card",
      "transaction_table",
      "finding_card",
      "risk_highlight",
      "assumption_box",
      "limitation_box",
      "management_question",
      "source_citation",
    ],
    suggestedFollowups: [
      "For the round manual journals with generic narratives, what calculation produced the amount and where is it held?",
      "Do any of the round amounts correspond exactly to the residual needed for an account or reconciliation to agree?",
      "Which round recurring amounts are backed by a standing contract, and can that contract be produced?",
      "Are there clusters of amounts sitting immediately below an approval limit, and who set the amounts?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sage", "sap", "odoo", "postgres", "snowflake"],
    tags: ["ledger", "anomaly", "round-numbers", "manual-journals", "estimates"],
  },
  {
    slug: "weekend-and-after-hours-posting-review",
    name: "Weekend and after-hours posting review",
    category: "ledger",
    subcategory: "Posting behaviour",
    description:
      "Reviews postings made outside normal working hours to understand whether timing reflects legitimate operational rhythm or reduced oversight, correlating time-of-posting with entry type, user and approval.",
    defaultTitle: "Weekend and After-Hours Posting Review",
    auditDescription:
      "An examination of when entries were actually made — evenings, weekends, public holidays — assessed against the organisation's working calendar, close timetable, automation schedules and time zones, to identify postings made when independent review was least likely.",
    instructions: `The premise of this audit is oversight, not diligence. Entries made when nobody else is working are not wrong; they are less likely to be seen by anyone. Your objective is to establish whether the organisation's out-of-hours posting activity carries the review that in-hours activity carries, and whether the timing pattern of any user or process warrants attention.

Get the timing basis right before analysing anything, or your entire report is noise. Establish which timestamp you are using — system creation time, effective posting date, approval time, last-modified time — and say so. Establish the timestamp's time zone and whether the system stores UTC while users work in several countries. Establish the organisation's working calendar, including local public holidays for each location, and its close timetable, because close weekends are legitimately worked. Establish which posting identities are service accounts, interfaces or scheduled jobs, whose overnight timestamps mean nothing at all. Ask the user for these; if you cannot obtain them, state the limitation prominently and reduce your confidence accordingly. A report that flags a scheduled interface running at 02:00 destroys its own credibility.

Then analyse the human, manual population that remains. Look at the distribution of postings by hour of day and day of week — as a heatmap, by user and by entry type. What matters is deviation from a person's own baseline and from their peers, not the raw hour. Someone who always works evenings is a working pattern; someone who posts in-hours all year except for three Sunday-night journals is a question.

Correlate timing with the attributes that carry risk: is the entry manual or automated, does it touch a sensitive account, does it carry a meaningful narrative, was it approved and by whom, was the approval also out of hours, and did the same person prepare and approve it? Out-of-hours plus self-approval plus a generic narrative is a materially different observation from any one of those alone. Note whether out-of-hours entries cluster in the last days of a period or immediately after a reporting deadline.

Weigh innocent explanations explicitly: month-end close, a global team, shift work, system maintenance windows, a genuinely busy person, remote working, and batch corrections. Ask before asserting. Never suggest concealment or misconduct.

Cite every observation to journal number, timestamp, time zone, user and source file. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis or missing information. Frame recommendations around review coverage and segregation of duties. Write for internal audit and the financial controller. A licensed professional must sign off.`,
    recommendedInputs: [
      {
        name: "Ledger postings with creation timestamps",
        description: "Line-level postings including system creation timestamp, effective date, user, entry type and narrative.",
        formats: ["csv", "xlsx", "integration export"],
        required: true,
      },
      {
        name: "System audit log",
        description: "Creation, modification and approval events with timestamps and acting user identity.",
        formats: ["csv", "xlsx", "txt"],
        required: true,
      },
      {
        name: "User directory",
        description: "Users with role, location, time zone, employment status and a flag for service or interface accounts.",
        formats: ["csv", "xlsx"],
        required: true,
      },
      {
        name: "Working calendar and close timetable",
        description: "Working days, local public holidays per location, and the dates of each period-end close.",
        formats: ["xlsx", "csv", "pdf", "text"],
        required: false,
      },
      {
        name: "Scheduled job and interface schedule",
        description: "When automated postings are expected to run, so machine activity can be excluded from human analysis.",
        formats: ["text", "csv", "pdf"],
        required: false,
      },
      {
        name: "Approval workflow log",
        description: "Who approved each entry and when, to test whether out-of-hours entries received independent review.",
        formats: ["csv", "xlsx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Posting data carrying a genuine system creation timestamp, with its time zone stated.",
      "A user directory identifying service and interface accounts and each human user's working location.",
      "The organisation's working calendar and close timetable for the period under review.",
      "Approval records showing who reviewed each out-of-hours entry and when.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "audit_scope",
      "audit_methodology",
      "executive_summary",
      "heatmap",
      "timeline",
      "transaction_table",
      "finding_card",
      "control_weakness",
      "limitation_box",
      "assumption_box",
      "control_recommendation",
      "source_citation",
    ],
    suggestedFollowups: [
      "Which timestamp does the system store — creation, approval or last modification — and in which time zone is it recorded?",
      "Which posting identities are service accounts or scheduled interfaces rather than people, and can that list be confirmed?",
      "For out-of-hours manual entries that were also self-approved, what business need required them to be posted then?",
      "Do out-of-hours postings concentrate in close weekends, or do they also appear in ordinary mid-period weekends?",
      "Is there a compensating review of out-of-hours activity, and who performs it?",
    ],
    relevantIntegrations: ["netsuite", "sap", "dynamics365", "oracle_fusion", "xero", "quickbooks", "postgres", "sqlserver"],
    tags: ["ledger", "posting-behaviour", "timing", "segregation-of-duties", "controls"],
  },
];
