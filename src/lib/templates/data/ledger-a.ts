import type { AuditTemplateSeed } from "@/lib/templates/types";

export const ledgerTemplatesA: AuditTemplateSeed[] = [
  {
    slug: "general-ledger-audit",
    name: "General ledger audit",
    category: "ledger",
    subcategory: "Ledger-wide review",
    description:
      "A broad review of the general ledger for the period: population integrity, account movement, posting behaviour, and the areas that warrant deeper work.",
    defaultTitle: "General ledger audit",
    auditDescription:
      "Examine the general ledger as a whole — confirm the population is complete and internally consistent, profile account movement and posting behaviour, and identify the accounts and entries that merit further investigation.",
    instructions: `You are reviewing an organisation's general ledger for the stated period. This is a breadth-first audit: understand the whole population, establish whether it can be relied on, then point to where depth is needed — not exhaustively test every entry.

Start with population integrity, because every later conclusion depends on it. Do total debits equal total credits, in aggregate and by period? Does each account's movement reconcile to the trial balance (opening + net movement = closing)? Are there gaps or duplicates in entry numbering, date ranges with no activity where activity would be expected, or accounts in the trial balance that never appear in the ledger detail, or the reverse? If the extract does not tie out, say so plainly before reporting anything else — an unreconciled population caps the reliability of everything downstream, and you should state that cap.

Then profile the population rather than eyeballing it. Stratify entries by value, account, source or journal type (system-generated versus manual), posting user, and posting date versus effective date. You are looking for structure that does not fit the business: a few sources producing most of the value, a user whose entries sit far outside their peers' pattern, an account whose activity clusters in the last days of a period, round values where the underlying process would produce ragged amounts, blank or uninformative descriptions, or debit/credit account pairings with no rationale you can articulate.

Do not import a threshold. Ask the user for the materiality basis they want applied and any known risk areas or policies; if none is supplied, form a view from the ledger's own scale and dispersion, state that basis explicitly, and let the user challenge it. Significance comes from the evidence and the organisation's instructions, never from a number you invented.

Before calling anything a finding, argue the innocent explanation first. Concentrated period-end postings may be a normal accrual cycle. Round amounts may be contractual. A high-volume user may be a shared integration account. Test the benign story against the evidence and report what survives it.

Cite every material observation to its source — file, sheet, account code, entry ID, row. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information, and never let an interpretation drift into a statement of fact. Where you lack what you need (approvals, sub-ledger detail, policy documents), record it as missing information and request it rather than inferring.

Write for a finance director and their auditors: direct, specific, ranked by consequence. Recommendations should name the process or control, not just the symptom. You are not issuing an opinion — a licensed professional signs off; you produce the evidence and analysis for them to weigh.`,
    recommendedInputs: [
      {
        name: "General ledger detail export",
        description: "Full transaction-level ledger for the period, with account, date, amount, source, user and description fields.",
        formats: ["csv", "xlsx", "txt", "accounting integration"],
        required: true,
      },
      {
        name: "Trial balance (opening and closing)",
        description: "Trial balance at the start and end of the period, used to confirm the ledger extract reconciles.",
        formats: ["csv", "xlsx", "pdf"],
        required: true,
      },
      {
        name: "Chart of accounts",
        description: "Account codes, names, types and hierarchy so account behaviour can be read against intent.",
        formats: ["csv", "xlsx"],
        required: false,
      },
      {
        name: "Accounting policies and close calendar",
        description: "Company policy notes, close timetable and cut-off rules that explain expected posting patterns.",
        formats: ["pdf", "docx", "written text"],
        required: false,
      },
      {
        name: "Prior period audit findings",
        description: "Previous findings or management letter points, so recurrence can be assessed.",
        formats: ["pdf", "docx", "written text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Transaction-level general ledger covering the full audit period",
      "Trial balance that the ledger movement can be reconciled to",
      "Account code and account name for every posting",
      "Posting date and effective/document date for each entry",
      "Source or journal type identifying system-generated versus manual entries",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "overall_risk_rating",
      "data_quality_warning",
      "key_metric_card",
      "ledger_table",
      "account_movement_visualization",
      "finding_card",
      "risk_matrix",
      "evidence_list",
      "recommendation_card",
      "limitation_box",
    ],
    suggestedFollowups: [
      "Which materiality basis should be applied to this ledger, and who set it?",
      "Can you provide the sub-ledger detail behind the accounts with the largest unexplained movement?",
      "Which posting users are shared or system accounts rather than individuals?",
      "Were any accounting policy or system changes made during the period that would alter posting behaviour?",
      "Which of these accounts are reconciled monthly, and can we see the reconciliation files?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "sage", "netsuite", "dynamics365", "sap", "oracle_fusion", "postgres", "snowflake"],
    tags: ["ledger", "general-ledger", "trial-balance", "posting-behaviour", "data-integrity"],
  },

  {
    slug: "journal-entry-audit",
    name: "Journal entry audit",
    category: "ledger",
    subcategory: "Journal entry testing",
    description:
      "Entry-level testing across the full journal population — attributes, timing, sequence, users and pairings — to surface entries that do not fit the organisation's normal process.",
    defaultTitle: "Journal entry audit",
    auditDescription:
      "Test the journal entry population for the period: attribute completeness, sequence integrity, timing, preparer behaviour, account pairings and reversal activity, identifying entries whose characteristics warrant explanation.",
    instructions: `You are testing the journal entry population for the stated period. Unlike a ledger-wide review, your unit of analysis is the entry — the balanced document — not the account. Reconstruct entries from their lines before analysing anything; an entry judged from a single line is judged wrongly.

Work the entry attributes together, not one at a time. Each entry has (or should have) a preparer, an approver, a posting timestamp, an effective date, a source or journal type, a description, and its lines. The interesting signals are conjunctions: an entry that is manual *and* posted outside business hours *and* undescribed *and* touching an income statement account is a different animal from any one of those alone. Build the profile, then look at entries sitting at its edges.

Areas to work through. **Sequence integrity**: are entry numbers contiguous within their series, and where they break, is a void record present? Gaps mean either missing data or deleted entries — distinguish those before concluding. **Timing**: measure the lag between effective and posting date, and read its distribution rather than its average; a long tail matters more than the mean. **Account pairings**: build the debit/credit combinations that actually occur and identify pairings that are rare or lack a coherent business story — revenue credited straight to a clearing account, expense reversed against equity. **Reversals**: pair entries with their reversals; note those reversed soon after posting, in a later period, or by someone other than the preparer. **Duplicates**: find entries matching on amount, account and near-identical date or description, then test whether the second is a reposting or a legitimately repeated transaction.

Never encode a numeric rule. Ask what materiality and risk focus they want; if they give none, derive your basis from the population's own distribution, state it, and flag it as your judgment. What counts as an outlier is a function of this organisation's process, which the evidence describes and you must read.

Weigh the ordinary explanation before escalating: off-hours posting is normal in an offshore shared service centre, sequence gaps where numbering is allocated per user session, identical recurring entries for rent. Say which you tested and whether the evidence supported it.

Cite every entry you name — entry ID, posting date, account codes, file and row — and label every claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Absent approval or documentation is missing information: request it; absence is not proof of a control failure. Report to an audience who must ask management about these entries: give them the entry, the anomaly, the explanation you ruled out, and the question to ask. Conclusions on propriety belong to a licensed professional.`,
    recommendedInputs: [
      {
        name: "Journal entry export with line detail",
        description: "All journal entries for the period, including entry header and every line, with preparer, approver and timestamps.",
        formats: ["csv", "xlsx", "accounting integration"],
        required: true,
      },
      {
        name: "Journal source/type reference",
        description: "List of journal sources, batch types or codes and what each represents (AP, AR, payroll, manual, integration).",
        formats: ["csv", "xlsx", "written text"],
        required: false,
      },
      {
        name: "User list with roles",
        description: "Posting users mapped to roles, departments and whether the account is a person or a system integration.",
        formats: ["csv", "xlsx"],
        required: false,
      },
      {
        name: "Chart of accounts",
        description: "Account codes, names and types, so account pairings can be interpreted.",
        formats: ["csv", "xlsx"],
        required: false,
      },
      {
        name: "Journal approval policy",
        description: "Who may prepare, approve and post journals, and any documented authority limits or segregation rules.",
        formats: ["pdf", "docx", "written text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Journal entries at line level with a stable entry identifier linking lines to their header",
      "Posting timestamp and effective/document date for each entry",
      "Preparer (and approver where captured) for each entry",
      "Journal source, batch or type code for each entry",
      "Entry or document numbering sequence for the period",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_methodology",
      "overall_risk_rating",
      "key_metric_card",
      "transaction_table",
      "heatmap",
      "timeline",
      "finding_card",
      "control_weakness",
      "source_citation",
      "management_question",
      "limitation_box",
    ],
    suggestedFollowups: [
      "Can management explain the entries flagged with no description or a generic description?",
      "Do the sequence gaps correspond to voided entries, and can the void log be produced?",
      "Which journal sources are automated integrations, and which require human preparation?",
      "For the entries reversed in a later period, what changed between the original posting and the reversal?",
      "Are preparer and approver ever the same person under current system configuration?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "sage", "netsuite", "dynamics365", "sap", "oracle_fusion", "odoo", "postgres", "sqlserver"],
    tags: ["ledger", "journal-entries", "entry-testing", "sequence", "reversals"],
  },

  {
    slug: "manual-journal-entry-review",
    name: "Manual journal entry review",
    category: "ledger",
    subcategory: "Management override risk",
    description:
      "A focused review of manually prepared journals — the entries that bypass transactional controls — with emphasis on authorisation, support and management override risk.",
    defaultTitle: "Manual journal entry review",
    auditDescription:
      "Review the manual and topside journal population: why each entry was made outside the transactional systems, who prepared and approved it, what supports it, and whether the pattern suggests override of controls.",
    instructions: `You are reviewing manual journals only — entries keyed by a person rather than generated by a transactional sub-system. Manual journals are the route by which the ordinary controls in AP, AR, payroll and billing are bypassed. Every manual entry is an assertion by a person that the systems got it wrong or could not express something. Your question for each: what was that assertion, and is it supported?

Define the population honestly and say how. "Manual" is a system-configuration concept, not a universal one — it may mean a source code, a journal type, a missing sub-ledger reference, or a particular data-entry screen. State which field you used, and flag ambiguous entries rather than silently sorting them.

Then interrogate the *reason*. Read narratives as evidence, not decoration. A good manual journal explains itself: what it corrects, which document it relates to, which period it belongs to. Group entries by the reason they give and note those giving none. A population where much of the manual value carries no articulable business reason is itself the finding, regardless of whether any individual entry is wrong.

Look hard at authorisation and segregation. Who prepared each entry, who approved it, and are they the same person or in one reporting line? Are approvals dated after posting, or preparers approving each other reciprocally? Do senior staff appear as preparers of entries that should sit with the team — the classic topside pattern? Weigh what an entry *does*, not its size: entries moving results between income statement lines, touching reserves or provisions near a period boundary, or clearing a balance without settlement, carry more risk than routine reclassifications.

Adopt no numeric rule. Ask for the materiality basis, authority matrix, and any known sensitive accounts. If they give none, reason from the evidence and the entries' own distribution, state your basis openly, and mark it your judgment.

Test the innocent explanation before escalating. Manual accruals at period end are normal. A finance manager posting directly may reflect a small team with no alternative, not concealment. An odd account pairing may reflect a chart lacking the account the preparer needed — a design finding, not a propriety one. Say which you tested.

Cite each entry — entry ID, date, preparer, accounts, amount, file and row — and label every claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Where you have no supporting documentation, do not call the entry unsupported; say the support was not provided, and request it. Describe behaviour and evidence, not motive. Frame recommendations around the process gap revealed — journal policy, approval configuration, chart design. Any conclusion about fraud or override is for a licensed professional.`,
    recommendedInputs: [
      {
        name: "Manual journal export",
        description: "Manually prepared journals for the period with preparer, approver, timestamps, narrative and line detail.",
        formats: ["csv", "xlsx", "accounting integration"],
        required: true,
      },
      {
        name: "Journal source classification",
        description: "How the system distinguishes manual entries from sub-ledger and integration-generated entries.",
        formats: ["csv", "xlsx", "written text"],
        required: true,
      },
      {
        name: "Delegation of authority matrix",
        description: "Approval limits and who may authorise journals of what nature or value.",
        formats: ["pdf", "xlsx", "docx", "written text"],
        required: false,
      },
      {
        name: "Supporting documentation for selected entries",
        description: "Journal support packs, calculations, emails or memos behind specific manual entries.",
        formats: ["pdf", "xlsx", "docx", "eml"],
        required: false,
      },
      {
        name: "Finance team structure",
        description: "Reporting lines and roles, so segregation between preparer and approver can be assessed.",
        formats: ["xlsx", "pdf", "written text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Manual journal entries with line detail for the full period",
      "A field or rule that reliably identifies an entry as manual",
      "Preparer identity for each manual entry",
      "Approver identity and approval timestamp where the system captures them",
      "Entry narrative or description text as recorded at posting",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "overall_risk_rating",
      "risk_highlight",
      "transaction_table",
      "pivot_table",
      "finding_card",
      "control_weakness",
      "control_recommendation",
      "management_question",
      "missing_evidence_notice",
      "assumption_box",
    ],
    suggestedFollowups: [
      "For each manual entry without a narrative, what was the underlying business event?",
      "Does the system currently permit a preparer to approve their own journal, and for which journal types?",
      "Why were these adjustments made manually rather than through the originating sub-ledger?",
      "Can you provide the support packs for the manual entries affecting accruals and provisions?",
      "Which manual entries are recurring by design, and is there a standing approval for them?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "sage", "netsuite", "dynamics365", "sap", "oracle_fusion", "erpnext", "sharepoint", "google_drive"],
    tags: ["ledger", "manual-journals", "management-override", "segregation-of-duties", "authorisation"],
  },

  {
    slug: "period-end-posting-review",
    name: "Period-end posting review",
    category: "ledger",
    subcategory: "Cut-off and close",
    description:
      "A cut-off-focused review of activity around the period boundary: entries posted after close, effective-date backdating, accrual and reversal hygiene, and late adjustments.",
    defaultTitle: "Period-end posting review",
    auditDescription:
      "Examine postings around the period boundary — what was booked in the close window, what was backdated into the period after it ended, and whether cut-off was applied consistently.",
    instructions: `You are reviewing postings around a period boundary. This audit turns on one distinction most ledger extracts blur: the date an entry *claims* (its effective or document date) versus the date it was actually *recorded* (its posting timestamp). Establish which fields carry each before analysing anything. If only one is available, say so up front — that materially limits what you can conclude, and the limit must be stated, not reasoned around.

Build a timeline of the close. Take the period end and lock dates from the user's close calendar; ask if not supplied, and never assume the ledger closes on the last day of the month. Map activity across three windows: effective in the period and posted before period end; posted during the close window; and posted after the nominal close. The third group is where cut-off risk concentrates, and its size and shape tell you how disciplined the close actually is versus how it is documented.

Then examine what the late activity *does*. Accruals, provisions and revenue cut-off entries posted deep into the close window deserve more attention than a reclassification between two expense accounts, because they move the result rather than its presentation. Test whether entries booked late reverse in the following period as accruals should, or persist — an accrual that never reverses is either an error or a permanent adjustment misdescribed. Check whether the same accounts are adjusted late in successive periods, which points to a process that structurally cannot close on time.

Test the boundary itself. Are there entries whose effective date sits in a closed prior period, or dated in the period but recorded weeks later, unexplained? Does the ledger show a locked period reopened, and who authorised it?

Encode no numeric rule for lateness, materiality or acceptable lag. Ask for the close calendar, cut-off policy and materiality basis. In their absence, characterise the distribution the evidence shows, state your basis, and label it judgment to accept or replace.

Consider the ordinary explanation first. Late postings are expected in the close window — that is what the window is for. Backdating is legitimate when an invoice arrives after period end for goods received before it; that is accrual accounting working. Distinguish "posted late for good reason and properly supported" from "posted late without explanation".

Cite specifically — entry ID, effective date, posting timestamp, account, amount, file and row — and label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Write for a controller preparing for their auditors, ranking by effect on the reported result. Recommendations should address the close process: timetable, sub-ledger cut-off, accrual estimation, period locking. Whether the statements are fairly stated is for a licensed professional.`,
    recommendedInputs: [
      {
        name: "Ledger export with both effective and posting dates",
        description: "Entries around the period boundary showing document/effective date and the actual posting timestamp separately.",
        formats: ["csv", "xlsx", "accounting integration"],
        required: true,
      },
      {
        name: "Close calendar and cut-off policy",
        description: "The close timetable, the period lock date, and documented cut-off rules by sub-ledger.",
        formats: ["pdf", "xlsx", "docx", "written text"],
        required: true,
      },
      {
        name: "Accrual and prepayment schedules",
        description: "The period's accruals and prepayments with their reversal dates, to test accrual hygiene.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
      {
        name: "Following period ledger extract",
        description: "Early activity in the next period so reversals of period-end accruals can be traced.",
        formats: ["csv", "xlsx", "accounting integration"],
        required: false,
      },
      {
        name: "Period reopening log",
        description: "Any record of closed periods being reopened, and who authorised it.",
        formats: ["csv", "xlsx", "pdf", "written text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Effective/document date and posting timestamp as separate fields",
      "Ledger activity covering the period end and the close window",
      "The nominal period end date and the actual system lock date",
      "Account code and type for each period-end entry",
      "Journal source or type distinguishing accruals and adjustments from routine postings",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "overall_risk_rating",
      "timeline",
      "key_metric_card",
      "transaction_table",
      "bar_chart",
      "finding_card",
      "period_comparison",
      "recommendation_card",
      "source_citation",
      "limitation_box",
    ],
    suggestedFollowups: [
      "What is the documented close timetable, and on what date was the period actually locked?",
      "For entries posted after the lock date, who authorised reopening the period?",
      "Which period-end accruals did not reverse in the following period, and why?",
      "Are the same accounts adjusted late every close, and what in the process causes that?",
      "What cut-off procedures are applied to goods received not invoiced at period end?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "sage", "netsuite", "dynamics365", "sap", "oracle_fusion", "postgres", "snowflake"],
    tags: ["ledger", "cut-off", "period-end", "close-process", "accruals"],
  },

  {
    slug: "suspense-account-audit",
    name: "Suspense account audit",
    category: "ledger",
    subcategory: "Clearing and suspense",
    description:
      "A review of suspense, clearing and holding accounts: what enters them, how quickly items clear, what has aged, and what the residual balance actually consists of.",
    defaultTitle: "Suspense account audit",
    auditDescription:
      "Examine suspense, clearing and holding account activity — the composition and ageing of the balance, the throughput and clearance discipline, and what the unresolved items represent.",
    instructions: `You are auditing suspense, clearing and holding accounts — accounts that hold items temporarily while their proper treatment is determined. Everything follows from one fact: a suspense account is only healthy if it empties. A balance that persists is a set of transactions nobody could classify, and unclassified transactions are misstatements waiting to be discovered.

Identify the population honestly. These accounts are rarely all named "suspense" — look for clearing, holding, unallocated, temporary, transit and interface accounts, and for accounts whose *behaviour* is suspense-like (frequent equal-and-opposite postings, near-zero balances punctuated by spikes). List what you included and what you may have missed without a chart of accounts.

The central analysis is composition, not balance. An account showing a small net balance may be netting large opposing items that have each sat for months; the net conceals the problem entirely. So decompose: age the open items from their original posting date, and report gross debits and gross credits ageing separately as well as net. Then measure throughput — of items entering during the period, what proportion cleared, and how quickly? Is clearance steady, or does it collapse and then get swept in one entry at close, suggesting the account is cleared for presentation rather than resolved?

Then ask what the items *are*. Group open items by source and description. Items from a single interface point to a mapping fault upstream — a systems finding, not a bookkeeping one. Items from bank feeds point to unidentified receipts or payments. Items placed by manual journal point to a person choosing suspense over a decision. Examine how the balance clears: identified and cleared to a real account, or written off in bulk to a P&L line?

Set no numeric rule. Ask for the materiality basis and any policy on suspense clearance (many organisations state a maximum age); if none is supplied, describe what the evidence shows about ageing and composition, state your basis, and let them apply their standard.

Weigh the innocent explanation. A large in-transit balance at period end is normal for payments crossing a boundary. An interface clearing account is *meant* to carry a balance intraday.

Cite everything — account code, item posting date, amount, source, file and row — and label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Where the ledger does not say what an item is, that is missing information: request identification rather than assuming impropriety. Report to the controller who owns these accounts, leading with the aged and unidentified items. Recommendations should target the upstream cause — interface mapping, remittance capture, coding at source, a clearance routine — not merely "clear the account". Defer any financial-statement conclusion to a licensed professional.`,
    recommendedInputs: [
      {
        name: "Suspense and clearing account ledger detail",
        description: "Transaction-level activity for every suspense, clearing, holding and transit account in the period.",
        formats: ["csv", "xlsx", "accounting integration"],
        required: true,
      },
      {
        name: "Chart of accounts",
        description: "Account codes, names and types, used to identify the full suspense/clearing population.",
        formats: ["csv", "xlsx"],
        required: true,
      },
      {
        name: "Open item listing with original dates",
        description: "The uncleared items making up the closing balance, with the date each originally entered the account.",
        formats: ["csv", "xlsx"],
        required: false,
      },
      {
        name: "Suspense account policy",
        description: "The organisation's rules on when suspense may be used, who owns clearance, and expected clearance timing.",
        formats: ["pdf", "docx", "written text"],
        required: false,
      },
      {
        name: "Prior period closing balances",
        description: "Suspense balances at earlier period ends, so persistence and trend can be assessed.",
        formats: ["csv", "xlsx", "pdf"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Transaction-level detail for all suspense, clearing and holding accounts",
      "Original posting date for every item making up the closing balance",
      "Source, journal type or interface identifier for items entering suspense",
      "Item descriptions or narratives as recorded",
      "Closing balance per account agreed to the trial balance",
    ],
    suggestedPeriod: "monthly",
    expectedOutputStructure: [
      "executive_summary",
      "overall_risk_rating",
      "key_metric_card",
      "aging_table",
      "aging_visualization",
      "ledger_table",
      "finding_card",
      "root_cause_analysis",
      "trend_card",
      "recommendation_card",
      "missing_evidence_notice",
      "management_question",
    ],
    suggestedFollowups: [
      "Who owns clearance of each suspense account, and how often is it reviewed?",
      "What are the oldest open items, and what has prevented their identification?",
      "Which upstream interface is generating the recurring unmatched postings?",
      "Were any suspense balances written off during the period, and who approved that?",
      "Does the organisation have a stated maximum age for items held in suspense?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "sage", "netsuite", "dynamics365", "sap", "oracle_fusion", "odoo", "postgres", "plaid"],
    tags: ["ledger", "suspense", "clearing-accounts", "ageing", "unreconciled-items"],
  },

  {
    slug: "intercompany-reconciliation-audit",
    name: "Intercompany reconciliation audit",
    category: "ledger",
    subcategory: "Multi-entity",
    description:
      "A review of intercompany balances and activity across entities: pairing, mismatches, in-transit items, currency effects, and readiness for elimination.",
    defaultTitle: "Intercompany reconciliation audit",
    auditDescription:
      "Reconcile intercompany balances between counterparty entities — identify unmatched pairs, timing differences, currency-driven gaps and unsupported balances that would not eliminate on consolidation.",
    instructions: `You are reconciling intercompany balances across a group. The defining feature of this audit is symmetry: every intercompany balance should have a mirror in the counterparty's books. Where the mirror does not exist or does not agree, something is wrong in one entity, the other, or between them — and your job is to say which, not merely that a difference exists.

Establish the pairing structure first. For each entity, identify the intercompany accounts and the counterparty each represents. Some groups use one account per counterparty, some a single control with a partner dimension, some both inconsistently. State the structure you found and where it is ambiguous. Then build the matrix — entity A's balance with B against B's balance with A — and confirm it is square. Counterparty codes matching no real entity are findings themselves.

Decompose each difference rather than reporting its net; a difference is not a finding, its *cause* is. **Timing / in-transit**: goods or cash despatched by one entity before period end and recorded by the other after — check whether the item appears in the counterparty's following period, which proves timing rather than error. **Currency**: where entities report in different currencies, a difference may be wholly explained by translation at different rates. Test the balance in transaction currency first; a difference that vanishes there is an FX policy issue, not a reconciliation break. **Recognition asymmetry**: one entity booked a recharge, fee or interest the other has not accepted or classified alike. **One-sided entries**: posted to intercompany with no corresponding instruction to the counterparty — the most serious category, because nobody is looking at it.

Encode no numeric rule for what difference matters. Ask for the group's materiality basis, intercompany policy and elimination approach. If not supplied, characterise the differences the evidence shows, state your basis, and mark it judgment.

Test the ordinary explanation before escalating. In-transit balances at period end are normal in any group that trades physically. A translation difference is arithmetic, not error. A difference equal to a known management charge is a recognition timing question.

Cite by entity, account, counterparty code, currency, amount and source row. Where you assert an item is timing, show the counterparty evidence proving it; where you cannot, label it a reasonable interpretation rather than a fact. Label all claims: evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. If given only one side of the group, say so plainly — a one-sided review identifies candidates but reconciles nothing.

Write for a group controller preparing to consolidate, ranking by what would fail to eliminate. Recommendations should address the intercompany process: counterparty confirmation, settlement cadence, transaction-currency recording, an owner per relationship. Consolidation conclusions rest with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Intercompany account detail per entity",
        description: "Transaction-level intercompany activity for every entity in scope, with counterparty identifier.",
        formats: ["csv", "xlsx", "accounting integration"],
        required: true,
      },
      {
        name: "Entity list and group structure",
        description: "Entities in scope, their reporting currency, and ownership relationships.",
        formats: ["xlsx", "csv", "pdf", "written text"],
        required: true,
      },
      {
        name: "Intercompany balances in transaction and reporting currency",
        description: "Balances stated in both the original transaction currency and the entity's reporting currency.",
        formats: ["csv", "xlsx"],
        required: false,
      },
      {
        name: "FX rates used at period end",
        description: "Closing and average rates applied by each entity, to isolate translation-driven differences.",
        formats: ["csv", "xlsx", "written text"],
        required: false,
      },
      {
        name: "Intercompany policy and recharge agreements",
        description: "Group policy on intercompany trading, management charges, interest and settlement.",
        formats: ["pdf", "docx", "written text"],
        required: false,
      },
      {
        name: "Following period intercompany activity",
        description: "Early next-period activity so in-transit items can be proven as timing differences.",
        formats: ["csv", "xlsx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Intercompany balances for both sides of each relationship in scope",
      "Counterparty entity identifier on each intercompany posting",
      "Transaction currency and amount for each intercompany balance",
      "Reporting currency of each entity and the rates applied at period end",
      "Transaction-level detail behind each intercompany control balance",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "overall_risk_rating",
      "reconciliation_table",
      "entity_comparison",
      "variance_card",
      "finding_card",
      "root_cause_analysis",
      "heatmap",
      "recommendation_card",
      "source_citation",
      "limitation_box",
    ],
    suggestedFollowups: [
      "For each unmatched balance, has the counterparty entity confirmed its position in writing?",
      "Which differences clear in the following period, and which have persisted across closes?",
      "Are intercompany balances recorded in transaction currency, or only in each entity's reporting currency?",
      "What is the group's settlement cadence for intercompany balances, and is it being followed?",
      "Which management recharges were booked by the charging entity but not accepted by the receiving entity?",
    ],
    relevantIntegrations: ["netsuite", "sap", "oracle_fusion", "dynamics365", "xero", "sage", "postgres", "snowflake", "sqlserver"],
    tags: ["ledger", "intercompany", "multi-entity", "consolidation", "foreign-currency"],
  },

  {
    slug: "opening-balance-audit",
    name: "Opening balance audit",
    category: "ledger",
    subcategory: "Balance integrity",
    description:
      "Verification that the period's opening balances agree to the prior period close, with prior period adjustments, restatements and migration balances identified and explained.",
    defaultTitle: "Opening balance audit",
    auditDescription:
      "Verify that opening balances roll forward correctly from the prior period's closing position, and identify any adjustment, restatement or migration difference affecting the starting point of the period.",
    instructions: `You are verifying the opening balances of a period. This audit exists because everything reported for the period is measured *from* this starting point — if it is wrong, every movement, variance and result computed on top of it silently inherits the error.

The core test is the roll-forward: for every account, prior period closing balance should equal current period opening balance. Compare account by account, never in aggregate — a net-zero difference across the trial balance can conceal two offsetting account-level errors that each distort reporting. Report the accounts that do not agree and the exact amount. Confirm the opening trial balance itself balances, and that the account population matches on both sides: an account present at prior close but absent at opening, or the reverse, is as much a break as a changed number, and often signals an undocumented chart of accounts change.

Classify differences by cause rather than listing them. **Prior period adjustments**: entries posted into the closed prior period after its balances were reported — check whether the prior figures were reissued or whether the ledger now disagrees with what was published. **Restatements**: deliberate error corrections or policy changes, which should be documented and explain the affected lines. **Retained earnings roll**: confirm prior period income statement balances closed to retained earnings correctly and opened at nil — an income statement account with an opening balance is nearly always a close-process fault. **Migration balances**: where a system changed, opening balances were loaded rather than rolled, and must be tested against the source system's close.

Set no numeric threshold. Ask for the materiality basis and whether any restatement or migration is known. If not supplied, report all differences with their amounts, state the basis on which you prioritise them, and mark it your judgment.

Consider the innocent explanation. A difference equal to a documented restatement is not an error — it is the restatement working. A new account with an opening balance may be a legitimate reclassification of an old one; look for its offsetting pair before calling it a break.

Cite precisely: account code, prior close figure with its source, opening figure with its source, and the difference. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. If you were not given the prior period's *reported* balances — as opposed to the ledger's current state of that period — say so; without them you cannot distinguish a clean roll-forward from a prior period quietly rewritten.

Write for whoever will rely on this period's numbers: exact about amounts, unambiguous about which accounts disagree. Recommendations should address period locking, restatement documentation and migration reconciliation. Restatement disclosure is for a licensed professional.`,
    recommendedInputs: [
      {
        name: "Opening trial balance",
        description: "Account-level balances at the first day of the audit period.",
        formats: ["csv", "xlsx", "pdf", "accounting integration"],
        required: true,
      },
      {
        name: "Prior period closing trial balance",
        description: "Account-level balances at the prior period's close, ideally as originally reported.",
        formats: ["csv", "xlsx", "pdf"],
        required: true,
      },
      {
        name: "Prior period adjustment log",
        description: "Any entries posted into the prior period after it was closed and reported.",
        formats: ["csv", "xlsx", "written text"],
        required: false,
      },
      {
        name: "Restatement memo",
        description: "Documentation of any error correction or accounting policy change affecting opening balances.",
        formats: ["pdf", "docx", "written text"],
        required: false,
      },
      {
        name: "System migration reconciliation",
        description: "Where a system changed, the reconciliation of loaded opening balances to the legacy system's close.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Opening trial balance for the audit period at account level",
      "Prior period closing trial balance at the same account granularity",
      "A consistent account code mapping across both periods",
      "Retained earnings and income statement account balances at both dates",
      "Any post-close entries affecting the prior period",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "overall_risk_rating",
      "reconciliation_table",
      "variance_card",
      "comparison_card",
      "finding_card",
      "data_quality_warning",
      "evidence_list",
      "recommendation_card",
      "limitation_box",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Were the prior period's reported figures reissued after the post-close entries were made?",
      "Is there a signed restatement memo supporting the differences in opening balances?",
      "Why do these income statement accounts carry an opening balance rather than nil?",
      "Which accounts were added, merged or retired between the two periods, and under whose authority?",
      "Can the migrated opening balances be reconciled line by line to the legacy system's final close?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "sage", "netsuite", "dynamics365", "sap", "oracle_fusion", "custom_accounting", "postgres"],
    tags: ["ledger", "opening-balances", "roll-forward", "restatement", "prior-period"],
  },

  {
    slug: "closing-balance-audit",
    name: "Closing balance audit",
    category: "ledger",
    subcategory: "Balance integrity",
    description:
      "Substantiation of the period's closing balances: agreement to sub-ledgers and reconciliations, quality of supporting evidence, and balances carried without support.",
    defaultTitle: "Closing balance audit",
    auditDescription:
      "Test whether the closing balances are substantiated — agreed to sub-ledgers, supported by reconciliations, and free of unexplained residuals — before they become the next period's starting point.",
    instructions: `You are testing whether the period's closing balances are substantiated. Where an opening balance audit asks *did the number carry forward correctly*, this one asks a harder question: *is the number real*. A balance is real when something outside the ledger corroborates it — a sub-ledger, a statement, a schedule, a counterparty, a count. Establish which balances have that corroboration, which have only the ledger's own word, and which have neither.

Classify the balance sheet by how each account can be substantiated, because the standard of evidence differs by account type. Control accounts must agree to their sub-ledger; test agreement account by account and investigate the residual, because a control account that does not tie means one of the two is wrong and reporting is running off the wrong one. Bank and cash must agree to an external statement via a reconciliation. Accruals, provisions and prepayments must agree to a supporting schedule that itself computes to the balance — check it adds up, not merely that one exists. Intercompany must agree to a counterparty; fixed assets to a register.

Judge the reconciliations rather than counting them. A reconciliation's existence proves nothing; its *reconciling items* are the evidence. Are they identified, dated and clearing, or is there a plug line described as "difference" or "to agree"? A balancing figure with no name is an unreconciled balance wearing a reconciliation's clothes. Note whether preparation and review were done by different people, and whether it preceded close sign-off.

Then look for balances that should not persist: debits in accounts that should be credits; balances in accounts that ought to clear each period; accounts with a balance and no movement across several periods — dormant balances nobody tests because nothing changes.

Set no numeric rule. Ask for the materiality basis and any substantiation policy; if absent, prioritise from the evidence — balance size, quality of support, persistence — state your basis, and mark it judgment.

Weigh the innocent explanation. A control account difference equal to a known in-transit batch is timing. A credit balance in receivables is usually an overpayment, not an error.

Cite every balance — account, closing figure, the corroborating source and its own reference (statement date, schedule tab, sub-ledger total), file and row — and label every claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Where a reconciliation was not provided, report the balance as *not substantiated within this review* rather than as misstated; that distinction matters. Write for a controller who must defend these balances, leading with those carrying no support. Recommendations should target the substantiation process: ownership, review, timing, treatment of unexplained residuals. Whether these balances are fairly stated is for a licensed professional.`,
    recommendedInputs: [
      {
        name: "Closing trial balance",
        description: "Account-level balances at the period end, agreeing to the ledger.",
        formats: ["csv", "xlsx", "pdf", "accounting integration"],
        required: true,
      },
      {
        name: "Account reconciliations pack",
        description: "Balance sheet reconciliations for the period end, including reconciling items and reviewer sign-off.",
        formats: ["xlsx", "pdf"],
        required: true,
      },
      {
        name: "Sub-ledger balances at period end",
        description: "Receivables, payables, fixed asset register and inventory totals to agree to their control accounts.",
        formats: ["csv", "xlsx", "pdf"],
        required: false,
      },
      {
        name: "Bank statements at period end",
        description: "External statements supporting cash balances.",
        formats: ["pdf", "csv", "ofx", "banking integration"],
        required: false,
      },
      {
        name: "Accrual, provision and prepayment schedules",
        description: "Supporting calculations behind estimated balances.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
      {
        name: "Prior period closing balances",
        description: "Earlier closing positions so persistence and dormancy can be assessed.",
        formats: ["csv", "xlsx"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Closing trial balance at account level agreeing to the general ledger",
      "Reconciliations for material balance sheet accounts with their reconciling items",
      "Sub-ledger totals corresponding to each control account",
      "External corroboration for cash balances at the period end date",
      "Supporting schedules behind accrual, provision and prepayment balances",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "overall_risk_rating",
      "reconciliation_table",
      "key_metric_card",
      "table",
      "finding_card",
      "missing_evidence_notice",
      "evidence_list",
      "control_weakness",
      "recommendation_card",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Which balance sheet accounts have no reconciliation for this period end, and who owns them?",
      "What do the unexplained reconciling items described as 'difference' actually consist of?",
      "Were the reconciliations prepared and independently reviewed before the close was signed off?",
      "Why does the receivables control account not agree to the aged debtors listing?",
      "Which balances have not moved across several periods, and what supports them today?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "sage", "netsuite", "dynamics365", "sap", "oracle_fusion", "plaid", "sharepoint", "onedrive"],
    tags: ["ledger", "closing-balances", "substantiation", "reconciliation", "balance-sheet"],
  },

  {
    slug: "chart-of-accounts-review",
    name: "Chart of accounts review",
    category: "ledger",
    subcategory: "Ledger design",
    description:
      "A structural review of the chart of accounts: hierarchy and classification integrity, duplicates and near-duplicates, dormancy, dimension design, and fitness for reporting.",
    defaultTitle: "Chart of accounts review",
    auditDescription:
      "Review the design and use of the chart of accounts — its structure, classification consistency, duplication, dormancy and dimensions — and whether it supports reliable reporting.",
    instructions: `You are reviewing the chart of accounts as a piece of design — the vocabulary the organisation uses to describe itself financially, and whether it is fit for purpose. Bad chart design does not announce itself in one wrong entry; it manifests as chronic misclassification, reconciliation pain, and reports nobody quite trusts.

Review the structure first. Is the numbering scheme coherent and actually followed, or do accounts sit in ranges that contradict their type? Does each account's type agree with its name, its place in the hierarchy, and — critically — how it is actually *used* in the ledger? An account typed as an expense that carries a persistent credit balance and takes postings from the billing sub-ledger is misclassified whatever its label says; the ledger is your best evidence for what an account really is. Check the hierarchy rolls up cleanly: one parent path per account, no orphans.

Then look for duplication and drift. Near-duplicate accounts — the same concept expressed twice, often a legacy account and its replacement — are the commonest cause of misclassification, because a preparer choosing between two plausible accounts chooses inconsistently. Identify such pairs and evidence the claim with actual posting patterns: same counterparties, sources, descriptions. Look for granularity failures both ways: accounts so broad they support no analysis (a large "other" account is a design finding and a place things hide), and accounts so narrow they are forgotten.

Then examine use. Which accounts are dormant — open, postable, never used? Every dormant account is an opportunity for a misposting nobody notices, because nobody reviews it. Which were created during the period, by whom, with what approval? Uncontrolled account creation is a governance finding. How are dimensions used — mandatory where they matter, or is the same information sometimes in the account code and sometimes in a dimension, making consistent reporting impossible?

Encode no numeric rule about counts, sizes or dormancy periods. Ask what reporting the chart must support, the materiality basis, and any statutory mapping it feeds. In their absence, reason from the evidence, state your basis, mark it judgment.

Consider the innocent explanation. A large account count is normal in a group reporting across jurisdictions. Dormant accounts may be retained for comparatives, and apparent duplicates may serve separate mappings.

Cite by account code, name, type, parent, posting volume and value, with file and row, and label every claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Write for whoever owns the chart, tying every observation to its reporting consequence — a chart finding with no consequence is noise. Sequence recommendations (what to merge, close, govern), noting that changing a chart mid-year affects comparatives. Statutory reporting adequacy rests with a licensed professional.`,
    recommendedInputs: [
      {
        name: "Chart of accounts export",
        description: "All accounts with code, name, type, parent, status and creation date.",
        formats: ["csv", "xlsx", "accounting integration"],
        required: true,
      },
      {
        name: "Posting volume and value by account",
        description: "Activity per account for the period, so design can be tested against actual use.",
        formats: ["csv", "xlsx", "accounting integration"],
        required: true,
      },
      {
        name: "Reporting mapping",
        description: "How accounts map to management reports, statutory accounts or a group reporting chart.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
      {
        name: "Dimension / cost centre structure",
        description: "Cost centres, departments, projects and entities available alongside the account code.",
        formats: ["csv", "xlsx"],
        required: false,
      },
      {
        name: "Account creation and change log",
        description: "Who created, renamed, retyped or deactivated accounts during the period, and when.",
        formats: ["csv", "xlsx", "written text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Complete chart of accounts including inactive accounts",
      "Account type and parent/hierarchy for every account",
      "Transaction count and value posted to each account in the period",
      "Account status (active/inactive) and creation date where available",
      "The reporting lines or mapping each account rolls up to",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "key_metric_card",
      "table",
      "pivot_table",
      "bar_chart",
      "finding_card",
      "control_weakness",
      "risk_highlight",
      "recommendation_card",
      "action_plan",
      "assumption_box",
    ],
    suggestedFollowups: [
      "Who authorises the creation of a new account, and is that control enforced in the system?",
      "Are these near-duplicate accounts intentional, and what distinguishes them for a preparer?",
      "What is posted to the large 'other' and 'miscellaneous' accounts, and why is it not classified?",
      "Which dormant accounts can be deactivated without breaking comparatives or statutory mapping?",
      "Where the same information sits in both an account code and a dimension, which is authoritative?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "sage", "netsuite", "dynamics365", "sap", "oracle_fusion", "zoho_books", "odoo", "postgres"],
    tags: ["ledger", "chart-of-accounts", "classification", "ledger-design", "governance"],
  },

  {
    slug: "expense-classification-audit",
    name: "Expense classification audit",
    category: "ledger",
    subcategory: "Classification accuracy",
    description:
      "A review of how costs are coded: account and cost centre accuracy, consistency for like transactions, capital versus operating treatment, and the effect on reported results.",
    defaultTitle: "Expense classification audit",
    auditDescription:
      "Test whether expenditure is classified correctly and consistently — to the right account, cost centre and period, and with the right capital versus operating treatment — and quantify the effect of what is not.",
    instructions: `You are testing whether expenditure has been classified correctly. The amount is usually right — it was paid, it exists — and the risk sits in *where* it landed: which account, which cost centre, which period, and whether it belonged on the balance sheet. Misclassification is quiet: it breaks no reconciliation and fails no control, it simply makes the reported result describe something other than what happened.

The strongest technique is consistency, not inspection: rather than judging each posting against your own idea of the right account, find like transactions and test whether they were treated alike. Group expenditure by supplier, description pattern and source, then look at the spread of accounts each landed in. A supplier whose invoices land in five expense accounts is telling you something: either they genuinely provide several services (verify it), or coding is decided per-invoice by whoever keys it — a process finding affecting every period. Apply the same test to cost centre coding.

Then work the treatment questions that change the result rather than its presentation. **Capital versus operating**: look for expenditure with the character of an asset — enhancement not maintenance, long useful life, project build costs, implementation labour — sitting in an expense account, and routine repairs sitting in additions. Both directions are misstatements; the second is the one people forget. Do not decide it on price. **Period**: expenditure covering a term should be spread if that term crosses the boundary; check for costs expensed in full where a prepayment would be expected. **Nature versus function**: costs coded by who bought them rather than what they are cannot aggregate.

Set no numeric rule: not a capitalisation threshold, not a materiality figure. Ask for the capitalisation policy, coding guidance and materiality basis. If not supplied, say the capital/operating assessment is judgmental without the policy, describe what you observed, and label your view as judgment.

Argue the innocent explanation first; this is where confident wrongness is easiest. A supplier's costs may legitimately span accounts. What looks capitalisable may be a like-for-like replacement, correctly expensed. State the alternative you tested and whether evidence supported it.

Cite by transaction — supplier, date, amount, account posted, cost centre, description, file and row — and where you say something is misclassified, name the account it belongs in and why. Label every claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information; where you need the invoice, request it.

Quantify: a classification finding without its effect on the reported result — which lines are over- or understated, and by how much — is an observation, not a finding. Recommendations should address coding at source, supplier defaults, policy clarity and reviewer training. Treatment is confirmed by a licensed professional.`,
    recommendedInputs: [
      {
        name: "Expense transaction detail",
        description: "All expenditure postings for the period with supplier, date, amount, account, cost centre and description.",
        formats: ["csv", "xlsx", "accounting integration"],
        required: true,
      },
      {
        name: "Chart of accounts and cost centre list",
        description: "Available expense accounts and cost centres with their intended use.",
        formats: ["csv", "xlsx"],
        required: true,
      },
      {
        name: "Capitalisation and expense coding policy",
        description: "The organisation's own policy on capital versus operating treatment and how costs should be coded.",
        formats: ["pdf", "docx", "written text"],
        required: false,
      },
      {
        name: "Supplier master data",
        description: "Suppliers with their category or default expense account, to test coding consistency.",
        formats: ["csv", "xlsx"],
        required: false,
      },
      {
        name: "Fixed asset additions register",
        description: "Capitalised additions for the period, to test the boundary in both directions.",
        formats: ["csv", "xlsx", "pdf"],
        required: false,
      },
      {
        name: "Invoices for selected transactions",
        description: "Supporting invoices for postings whose nature cannot be determined from the ledger alone.",
        formats: ["pdf", "jpg", "png"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Transaction-level expenditure with account, cost centre and description for the period",
      "Supplier or counterparty identifier on each expense posting",
      "Chart of accounts showing the expense accounts available to preparers",
      "Fixed asset additions for the period to test the capital/operating boundary",
      "Prior period expenditure by account for consistency comparison",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "overall_risk_rating",
      "key_metric_card",
      "pivot_table",
      "transaction_table",
      "heatmap",
      "period_comparison",
      "finding_card",
      "variance_card",
      "recommendation_card",
      "source_citation",
    ],
    suggestedFollowups: [
      "Why do this supplier's invoices post to several different expense accounts?",
      "Can we see the invoices for the items with characteristics of capital expenditure booked to repairs?",
      "What is the organisation's written capitalisation policy, and when was it last reviewed?",
      "Who decides the expense account at the point of entry, and against what guidance?",
      "Which cost centre codings were corrected after the fact, and what triggered the correction?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "sage", "netsuite", "dynamics365", "sap", "zoho_books", "expensify", "ramp", "brex", "coupa"],
    tags: ["ledger", "expense-classification", "capitalisation", "cost-centre", "coding-consistency"],
  },
];
