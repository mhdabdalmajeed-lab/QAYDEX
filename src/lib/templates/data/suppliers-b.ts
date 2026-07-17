import type { AuditTemplateSeed } from "@/lib/templates/types";

export const supplierTemplatesB: AuditTemplateSeed[] = [
  {
    slug: "supplier-concentration-audit",
    name: "Supplier concentration audit",
    category: "suppliers",
    subcategory: "Supply base structure",
    description:
      "Examines how the organisation's spend is distributed across its supply base, where dependency has quietly accumulated, and whether concentrated relationships are governed and substitutable.",
    defaultTitle: "Supplier concentration audit",
    auditDescription:
      "Assesses dependency risk in the supply base by mapping spend distribution, identifying suppliers the organisation cannot easily replace, and testing whether concentration is deliberate and governed.",
    instructions: `You are examining how the organisation's purchasing spend is distributed across its supply base and what dependency that distribution has created. Your reader is the CFO and the procurement lead; both know their big suppliers by name but rarely see the shape of the whole book at once.

Begin by fixing the denominator. Establish total addressable spend for the period, what is excluded (payroll, taxes, intercompany, pass-through), and whether spend is measured on invoice date, posting date or payment date. Concentration ratios are meaningless if the base is unstated, so state it. Then normalise the supply base before you count: the same economic counterparty frequently sits under several ledger accounts because of name variants, legal entity changes, acquisitions between suppliers, or separate divisions billing separately. Group by tax registration number, bank account, remittance address and parent ownership where available — real concentration is almost always higher than the raw vendor list suggests, and the difference between the two is itself worth reporting.

Then look at shape rather than a single number. Rank suppliers by spend and describe the curve: how quickly it falls away, how many suppliers make up the bulk, whether the tail is long and fragmented. Compare the current period to prior periods to see where dependency is growing, not just where it is high. Cross-cut the analysis by category and by business criticality — a supplier who is small in money but sole-source for a component that stops production is a bigger dependency than a large commodity supplier with ten alternatives. Ask the user which categories they consider critical if the data does not tell you.

For each concentrated relationship, test governance: is there a current signed contract, an agreed exit or transition provision, an alternative source qualified, and a named owner? Also look for the reverse exposure — where the organisation is likely a large share of that supplier's revenue, giving it leverage but also creating a failure risk.

Weigh innocent explanations before concluding. Concentration is often a deliberate, sound strategy: negotiated volume discounts, deliberate consolidation, a genuinely thin market, or a regulated single provider. Distinguish concentration that was chosen from concentration that simply happened.

Do not import a threshold. Decide relevance from the evidence, ask the user for their concentration risk appetite, and explain the basis you used. Cite every figure to file, sheet, row or supplier account. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. This review informs but does not replace sign-off by a licensed professional.`,
    recommendedInputs: [
      {
        name: "Supplier spend by period",
        description:
          "Total purchases or payments by supplier for the period under review, at supplier-account level with category or GL account where available.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Supplier master file",
        description:
          "Vendor master records including legal name, trading names, tax registration number, parent entity, address and status.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Prior period spend",
        description:
          "One to three prior periods of spend on the same supplier structure, so the direction of concentration can be seen rather than only its level.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Contract register",
        description:
          "Signed agreements with key suppliers, showing term, renewal, exit provisions and pricing basis.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
      {
        name: "Category and criticality mapping",
        description:
          "Which spend categories or suppliers the business regards as operationally critical or single-sourced.",
        formats: ["xlsx", "csv", "written text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Supplier-level spend for the period, reconcilable to a stated total purchases figure.",
      "The supplier master data used to group related accounts into single economic counterparties.",
      "The basis of measurement (invoice, posting or payment date) and any spend categories excluded from the denominator.",
      "Contract or sourcing evidence for each relationship the audit identifies as concentrated, or an explicit note that it is missing.",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "overall_risk_rating",
      "supplier_concentration_chart",
      "key_metric_card",
      "table",
      "period_comparison",
      "risk_highlight",
      "finding_card",
      "assumption_box",
      "recommendation_card",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "Which of the concentrated suppliers are single-sourced by choice, and which because no alternative has ever been qualified?",
      "For the largest relationships, do the contracts contain exit, transition or step-in rights, and when do they next renew?",
      "Have any of the top suppliers been consolidated through acquisition since the master file was last cleansed?",
      "Roughly what share of each key supplier's revenue do we represent, and what happens operationally if one fails?",
      "What concentration exposure does leadership consider acceptable, and has that ever been stated formally?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sap", "coupa", "dynamics365", "snowflake"],
    tags: ["suppliers", "concentration", "dependency", "procurement", "vendor-risk"],
  },
  {
    slug: "supplier-bank-detail-audit",
    name: "Supplier bank detail audit",
    category: "suppliers",
    subcategory: "Payment integrity",
    description:
      "Tests the integrity of supplier remittance bank details: who changed them, when, on what authority, and whether any change pattern is consistent with payment diversion fraud.",
    defaultTitle: "Supplier bank detail audit",
    auditDescription:
      "Examines the history of supplier bank account data and its change controls to detect payment redirection risk and unverified amendments to remittance instructions.",
    instructions: `You are auditing the integrity of supplier bank details — the one field in the payables system that turns a legitimate invoice into money in the wrong account. Your reader is the financial controller and whoever owns payables controls. Write without alarmism: most bank detail changes are legitimate, and treating them all as suspicious destroys the signal.

Start with the change history, because standing data alone tells you almost nothing. You need the audit log of amendments to bank fields: old value, new value, timestamp, the user who made the change, and the user who approved it. If the system does not retain that history, that absence is the headline finding — say so explicitly and describe what cannot be concluded without it, rather than substituting guesswork.

Where you have the history, examine the anatomy of each change rather than merely counting them. Look at the proximity between a bank detail change and the next payment to that supplier — a change made shortly before a large payment run, with no intervening verification step, is the classic diversion pattern. Look at who made and who approved the change, and whether those are the same person or people who could not plausibly be independent. Look for changes made outside business hours, by users who do not normally touch vendor master data, or on dormant suppliers that suddenly reactivate. Look for the destination: bank accounts shared across multiple unrelated suppliers, accounts in a country inconsistent with the supplier's trading address, personal-name accounts behind a corporate supplier, or an account that also appears in payroll data.

Then test the control, not just the exceptions. Was independent verification performed — an outbound call to a number held on file from before the change request, not a number supplied in the request email? Was the change supported by a document, and does that document look like it came through a channel the fraudster could control? Ask the user what their bank-detail verification procedure is and test the population against their own stated policy rather than a rule you invented.

Weigh innocent explanations seriously: bank mergers and sort code migrations, a supplier genuinely changing bank, factoring assignment redirecting payment to a finance house, a treasury sweep, or a data cleanse. Each superficially resembles fraud. Say which you tested and how.

Set no numeric trigger of your own. Cite every change to its log entry, row, timestamp and supplier account. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. A suspected diversion is an allegation about people — never state it as established, and defer conclusions to a licensed professional and, where warranted, a formal investigation.`,
    recommendedInputs: [
      {
        name: "Supplier bank detail change log",
        description:
          "System audit trail of amendments to vendor bank fields, with old and new values, timestamp, requesting user and approving user.",
        formats: ["xlsx", "csv", "system audit log export"],
        required: true,
      },
      {
        name: "Supplier master file with current bank details",
        description:
          "Current vendor records including account name, account number or IBAN, sort code or BIC, country and supplier status.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Payment run history",
        description:
          "Payments made to suppliers in the period with dates and amounts, so changes can be placed in time relative to disbursements.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Bank detail verification records",
        description:
          "Callback logs, verification forms or ticket records evidencing independent confirmation of each change.",
        formats: ["pdf", "xlsx", "csv", "written text"],
        required: false,
      },
      {
        name: "Vendor master change policy",
        description:
          "The organisation's documented procedure for requesting, verifying and approving bank detail amendments.",
        formats: ["pdf", "docx", "written text"],
        required: false,
      },
      {
        name: "Employee bank account data",
        description:
          "Payroll bank details, if the organisation wishes supplier accounts tested for overlap with employee accounts.",
        formats: ["xlsx", "csv", "payroll export"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The bank detail change history for the period, or an explicit statement that no such history is retained.",
      "Current supplier bank details linked to their supplier accounts.",
      "Payment dates and amounts allowing each change to be positioned relative to subsequent disbursements.",
      "The organisation's stated verification procedure, against which the population is tested.",
      "Verification evidence for each change the audit raises, or a note that none was located.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "overall_risk_rating",
      "risk_highlight",
      "transaction_table",
      "timeline",
      "finding_card",
      "control_weakness",
      "missing_evidence_notice",
      "control_recommendation",
      "management_question",
      "limitation_box",
    ],
    suggestedFollowups: [
      "Does the payables system retain a full before-and-after audit trail of bank field changes, and for how long?",
      "For each change raised, who verified the new details, by what channel, and against a contact number held before the request arrived?",
      "Can the same user both request and approve a bank detail change, and has that ever happened in the period?",
      "Do any supplier bank accounts match an employee account or appear under more than one unrelated supplier?",
      "Which changes reflect invoice financing or factoring assignments, and is the assignment documented?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sap", "coupa", "gusto", "adp", "sqlserver"],
    tags: ["suppliers", "fraud-risk", "payments", "master-data", "controls"],
  },
  {
    slug: "related-party-supplier-review",
    name: "Related-party supplier review",
    category: "suppliers",
    subcategory: "Related parties",
    description:
      "Identifies suppliers connected to owners, directors, staff or affiliated entities, and tests whether those relationships were disclosed, approved and transacted at arm's length.",
    defaultTitle: "Related-party supplier review",
    auditDescription:
      "Reviews the supply base for related-party relationships, testing completeness of disclosure, adequacy of approval, and whether pricing and terms reflect arm's-length dealing.",
    instructions: `You are looking for suppliers that are not at arm's length from the organisation — entities connected to owners, directors, key management, their families, or to other companies under common control. Your reader is the audit committee and the external auditor who will ask about related-party completeness. The point is not that related-party trading is wrong; it is routine and often commercially sensible. The point is whether it was disclosed, approved by people who had no stake in it, and priced as it would have been with a stranger.

Start with the declared population: the related-party register, directors' interests declarations, group structure charts, and prior financial statement disclosures. Take that as your baseline, then work outward, because the register's completeness is the actual question. Match the supplier master against directors' and officers' registers, shareholder lists, and — where provided — employee records. Look beyond names to attributes people forget to disguise: shared registered addresses, shared directors across entities, shared phone numbers or domains, shared bank accounts, and suppliers registered at a residential address that also appears in HR data. Where the evidence permits, follow ownership up to the ultimate beneficial owner rather than stopping at the immediate parent.

For each candidate relationship, move from identification to substance. Establish what was actually bought, whether the goods or services were genuinely received, and whether the supplier had the capacity to deliver them — a related supplier with no employees, no premises and round-number monthly invoices for "consultancy" is a different proposition from a family-owned haulier with trucks. Test the commercial terms against the same category bought from unrelated suppliers: unit price, payment terms, discount treatment, whether the work was competitively tendered, and whether the supplier was granted terms nobody else gets. Test the approval trail: who authorised the onboarding, who approves the invoices, and whether the connected individual sat anywhere in that chain.

Weigh innocent explanations before you conclude. Common surnames coincide. Serviced-office providers give hundreds of unconnected companies the same address. A director may sit on the board of a supplier through an entirely disclosed and approved arrangement. Say which explanation you tested and what would settle it.

Do not encode any threshold or automatic trigger; decide relevance from the evidence and from the organisation's own related-party policy, and ask the user for that policy if it is not in front of you. Cite every match to its file, row and identifying attribute. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Connectedness is an assertion about named individuals: state it as an indicator requiring confirmation, never as fact, and defer disclosure and reporting conclusions to a licensed professional.`,
    recommendedInputs: [
      {
        name: "Supplier master file",
        description:
          "Vendor records with legal name, registration number, registered and remittance address, contact details and bank account.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Directors, officers and shareholders register",
        description:
          "Names, addresses and interests of directors, officers, key management and beneficial owners, including declared outside directorships.",
        formats: ["xlsx", "csv", "pdf"],
        required: true,
      },
      {
        name: "Supplier spend for the period",
        description: "Purchases and payments by supplier, so identified relationships can be sized and dated.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Existing related-party register",
        description: "The organisation's current list of known related parties and approved related-party transactions.",
        formats: ["xlsx", "csv", "pdf", "written text"],
        required: false,
      },
      {
        name: "Group structure and ownership chart",
        description: "Entities under common control, with ownership percentages and ultimate beneficial owners.",
        formats: ["pdf", "xlsx", "written text"],
        required: false,
      },
      {
        name: "Employee master data",
        description: "Employee names and addresses, where the organisation authorises testing for staff-connected suppliers.",
        formats: ["xlsx", "csv", "payroll export"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The supplier master data used to identify candidate relationships, including the attributes matched on.",
      "The register of directors, officers or beneficial owners against which suppliers were compared.",
      "Spend and transaction detail for each relationship the audit raises.",
      "The organisation's existing related-party register, or a note that none was provided.",
      "Approval and pricing evidence for each related-party supplier identified, or a note that it is missing.",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "overall_risk_rating",
      "entity_comparison",
      "table",
      "finding_card",
      "risk_highlight",
      "comparison_card",
      "assumption_box",
      "management_question",
      "recommendation_card",
      "limitation_box",
    ],
    suggestedFollowups: [
      "Is the related-party register refreshed by positive annual declaration from every director and senior manager, or only on change?",
      "For each connected supplier identified, was the appointment competitively tendered, and who approved it?",
      "Do any connected suppliers have terms, pricing or payment priority that unrelated suppliers in the same category do not receive?",
      "Can the organisation evidence that the goods or services from each related supplier were actually received?",
      "Were any of these relationships disclosed in the last set of financial statements, and if not, why not?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sap", "dynamics365", "coupa", "gusto", "postgres"],
    tags: ["suppliers", "related-parties", "governance", "disclosure", "conflict-of-interest"],
  },
  {
    slug: "contract-leakage-audit",
    name: "Contract leakage audit",
    category: "suppliers",
    subcategory: "Contract compliance",
    description:
      "Compares what suppliers actually charged against what their contracts entitle them to charge, quantifying value lost through off-contract pricing, missed discounts and uplifts nobody agreed to.",
    defaultTitle: "Contract leakage audit",
    auditDescription:
      "Tests invoiced amounts against contracted rates, discounts, rebates and uplift mechanics to identify and quantify value leaking out of negotiated supplier agreements.",
    instructions: `You are auditing the gap between what was negotiated and what was paid. Contract leakage is rarely dramatic — it is the slow bleed of rate cards that drifted, discounts never applied, rebates never claimed, and uplifts applied more generously or more often than the agreement allows. Your reader is the procurement director and the CFO, who want a quantified number they can recover, not a list of concerns.

Begin by building the entitlement picture, supplier by supplier, from the contract and every amendment, variation and side letter attached to it. Extract the mechanics precisely: the rate card, effective dates, volume tiers and how attainment is measured, the rebate mechanism and who must claim it, the indexation clause including which index and reference date it uses, any cap on annual increase, payment terms and early-settlement discounts, and charges the contract expressly prohibits. Uplift clauses deserve particular care — many disputes turn on whether the index reference month, the compounding basis, or the anniversary date was applied as written.

Then confront that entitlement with the invoice population. Recalculate line by line where the data allows: invoiced unit price against contracted price for the date of supply, quantity against what was received, and extended amounts against your own recomputation. Look for the recurring leakage patterns. Price drift, where the rate quietly moves away from the card between renewals. Uplift applied before the anniversary, above the index, or twice. Volume tiers reached but never retro-applied. Rebates accrued but never claimed. Off-contract buying — the same category bought from the same supplier outside the agreement at list price, often through a different purchasing route. Ancillary charges (delivery, fuel, minimum order, admin fees) the contract folds into the price. And settlement discounts forfeited because the organisation paid late through its own process — report that separately, because the remedy is internal, not a supplier claim.

Weigh innocent explanations before asserting a claim: an approved variation you were not given, an emergency spot purchase, a specification change, a currency clause, or genuine drafting ambiguity where the supplier's reading is reasonable. Distinguish a recoverable overcharge from a badly drafted contract. Say which you tested.

Invent no threshold. Size each item, aggregate by supplier and by leakage mechanism, ask the user for their materiality and recovery appetite, and explain the basis you used. Cite every recalculation to the contract clause and the invoice line, sheet and row. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Frame recommendations as recoverable value with a named owner and a route — credit note, retro-claim, or remediation at renewal — and note that contractual interpretation and any recovery action require a licensed professional's sign-off.`,
    recommendedInputs: [
      {
        name: "Supplier contracts and amendments",
        description:
          "Executed agreements with rate cards, volume tiers, rebate terms, indexation and uplift clauses, plus all variations and side letters.",
        formats: ["pdf", "docx", "xlsx"],
        required: true,
      },
      {
        name: "Invoice line detail",
        description:
          "Supplier invoices at line level with date of supply, item, quantity, unit price, extended amount and any ancillary charges.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Purchase order data",
        description: "POs with agreed prices and quantities, so contracted, ordered and invoiced prices can be compared.",
        formats: ["xlsx", "csv", "procurement export"],
        required: false,
      },
      {
        name: "Rebate and volume statements",
        description: "Supplier rebate calculations, tier attainment statements or credit notes issued under the agreement.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
      {
        name: "Payment history",
        description:
          "Invoice due dates and actual payment dates, to test whether early-settlement discounts were earned or forfeited.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Index reference data",
        description: "The published index values referenced by any indexation clause, for the relevant reference periods.",
        formats: ["xlsx", "csv", "written text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The executed contract and every amendment governing each supplier tested, with the specific clauses relied upon.",
      "Invoice line detail sufficient to recompute price times quantity for the date of supply.",
      "The rate card or pricing schedule effective at each invoice date.",
      "Rebate or tier evidence for any claimed under-recovery, or a note that it was not provided.",
      "Payment dates for any early-settlement discount tested.",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "audit_methodology",
      "key_metric_card",
      "variance_card",
      "transaction_table",
      "waterfall_chart",
      "finding_card",
      "reconciliation_table",
      "recommendation_card",
      "action_plan",
      "limitation_box",
    ],
    suggestedFollowups: [
      "Are there approved variations or side letters for these suppliers that were not included in the contract pack we reviewed?",
      "Which index, reference month and compounding basis does each uplift clause actually specify, and is that how it was applied?",
      "Were volume tiers reached in the period, and did the supplier retro-apply them or wait to be asked?",
      "How much of this category was bought off-contract, through which purchasing route, and who authorised it?",
      "Which of the quantified items will be pursued as recovery, and who owns the claim?",
    ],
    relevantIntegrations: ["coupa", "netsuite", "sap", "dynamics365", "xero", "quickbooks", "snowflake", "sharepoint"],
    tags: ["suppliers", "contracts", "leakage", "pricing", "recovery"],
  },
  {
    slug: "prepayment-audit",
    name: "Prepayment audit",
    category: "suppliers",
    subcategory: "Prepayments and accruals",
    description:
      "Tests the prepayments balance for existence, accurate amortisation, correct period allocation and stale items that should have been released to the profit and loss account.",
    defaultTitle: "Prepayment audit",
    auditDescription:
      "Examines prepaid supplier costs to confirm each item exists, is supported, is amortising on a defensible basis, and does not conceal expenses that should already have been charged.",
    instructions: `You are auditing prepayments — amounts paid to suppliers in advance and carried as an asset because the benefit is not yet consumed. Your reader is the financial controller and whoever signs the balance sheet. Prepayments are where deferred costs hide, so treat the balance as a schedule to be proved, not a total to be accepted.

Start by proving the schedule. Does the listing foot and agree to the general ledger control account? If not, that difference is your first finding and everything downstream is qualified. Then age the balance by original payment date and by the period the benefit relates to. Old items are the highest-yield area: a prepayment unchanged for several periods is usually an expense that should have been released, a deposit that is really a receivable, an asset that should have been capitalised, or something nobody can explain — each with a different fix.

Test each material item on four questions. Does it exist — is there an invoice or contract evidencing payment for a future benefit, or has a routine expense been parked here to flatter the period? Is the amount right — recompute the carrying value from the contract term, payment amount and elapsed time, and compare to the ledger. Is the amortisation basis defensible — straight-line is common but not always right; usage-based, seasonal or milestone-based consumption may be more faithful, and the basis should be consistent with prior periods and with how the benefit is consumed. Does it belong in the period — check cut-off in both directions: items paid before year end but recognised after, and current-period expenses parked here to move cost forward.

Then look at the population, not just the items. Are recurring prepayments (insurance, licences, rent, subscriptions) present every year but missing this year — an omission misstates as surely as an error. Are there prepayments to suppliers now dormant, disputed or insolvent, where the benefit will never arrive and the asset is impaired?

Weigh innocent explanations. A long-dated item may be a genuine multi-year licence. A basis change may reflect real changed consumption. A stale item may be a deposit correctly held pending contract end. Say which you tested and what settled it.

Set no threshold of your own. Ask the user for the materiality basis they want; if none is given, form a judgement from the composition of the balance and state that basis in one sentence, labelled as judgement. Cite every item to its schedule row, invoice, contract clause and ledger account. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. This review informs but does not replace sign-off by a licensed professional.`,
    recommendedInputs: [
      {
        name: "Prepayments schedule",
        description:
          "The listing supporting the prepayments balance: item, supplier, original amount, period covered, amortisation to date and closing carrying value.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "General ledger prepayment account activity",
        description:
          "Movements on the prepayment control account for the period, including additions and releases, to agree to the schedule.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Supporting invoices and contracts",
        description:
          "Supplier invoices and agreements evidencing the payment, the period of benefit and the service term for material items.",
        formats: ["pdf", "xlsx", "csv"],
        required: true,
      },
      {
        name: "Prior period prepayments schedule",
        description:
          "The comparable schedule from the prior period, to identify stale items, recurring items and basis changes.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Accounting policy for prepayments",
        description: "The organisation's stated policy on recognition, amortisation basis and release of prepaid costs.",
        formats: ["pdf", "docx", "written text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The prepayments schedule, footed and agreed to the general ledger control account.",
      "Ledger movements on the prepayment account for the period.",
      "Invoice or contract support for each item the audit tests, showing the period of benefit.",
      "The amortisation basis applied to each material item and the prior period treatment of the same item.",
      "The prior period schedule, or an explicit note that comparatives were unavailable.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "reconciliation_table",
      "aging_table",
      "key_metric_card",
      "ledger_table",
      "finding_card",
      "variance_card",
      "warning_box",
      "missing_evidence_notice",
      "recommendation_card",
      "audit_conclusion",
    ],
    suggestedFollowups: [
      "What supports the oldest items on the schedule, and why have they not been released?",
      "Which recurring prepayments appeared last year but are absent this year, and was that deliberate?",
      "Has the amortisation basis changed for any item, and if so what change in consumption justified it?",
      "Are any prepayments held with suppliers who are dormant, in dispute or insolvent, and is the asset still recoverable?",
      "Who reviews and signs off the prepayments schedule each period, and against what support?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sage", "dynamics365", "zoho_books", "oracle_fusion"],
    tags: ["suppliers", "prepayments", "cut-off", "balance-sheet", "amortisation"],
  },
  {
    slug: "supplier-credit-note-audit",
    name: "Supplier credit note audit",
    category: "suppliers",
    subcategory: "Credits and adjustments",
    description:
      "Examines credit notes received from suppliers: whether they were valid, applied to the right invoice, actually recovered in cash or offset, and whether expected credits were never chased at all.",
    defaultTitle: "Supplier credit note audit",
    auditDescription:
      "Tests the completeness, validity and application of supplier credit notes, including unapplied credits, expired balances and credits due but never issued.",
    instructions: `You are auditing credit notes received from suppliers — money owed back for returns, overcharges, rebates, service failures and duplicate billing. This audit has two failure directions and most reviews look at only one. Credits can be improper: fabricated, misapplied, or concealing something. Credits can also be missing: earned and never issued, issued and never applied, or applied then quietly written off. The second direction is usually where the money is. Your reader is the payables manager and the financial controller.

Start by reconciling the credit population to the ledger. Credit notes recorded should agree to credit movements on the supplier control account, and unapplied credits on the aged payable to the balance carried. Explain any difference before proceeding — an unreconciled population makes everything after it provisional.

Then test what the credits are for. Group them by reason code or narrative and read the shape of that distribution by supplier. Ask whether the reason is corroborated: a returns credit should tie to a return note and a stock movement; a pricing credit to the contracted rate and the overcharge; a rebate credit to volume attainment; a duplicate-billing credit to the duplicate it reverses — and check that duplicate was not also paid. Look for credits with no supporting reason, round-sum credits, and credits raised near period end that reverse shortly after, which can indicate the balance sheet being managed rather than a real adjustment.

Then test application. An unapplied credit is cash the organisation has lost the use of. Age them and ask why each is still open: is the supplier trading, is there an offsetting debit, has the credit passed a contractual expiry, has it been written off and who approved that? Look for credits applied to a different invoice, supplier account or period than the transaction they relate to.

Then test completeness — the direction easiest to miss. Where you have contracts, rebate terms, or records of disputes, returns, service credits or rejected deliveries, ask whether a credit was ever received for each. Credits earned but never chased appear nowhere in the ledger, so you must come at them from operational evidence.

Weigh innocent explanations: consolidated credits covering many invoices, a supplier's own timing, a globally negotiated settlement, or a dispute still open. Say which you tested.

Encode no threshold or exception rule. Ask the user for their materiality basis and the credit terms they believe apply, and explain the basis you used. Cite every credit to its document number, ledger row, and the invoice or contract it relates to. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Recovery and write-off decisions require a licensed professional's sign-off.`,
    recommendedInputs: [
      {
        name: "Supplier credit note listing",
        description:
          "All credit notes received in the period with supplier, date, amount, reason code or narrative, and the invoice each relates to.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Aged payables with unapplied credits",
        description: "Supplier balances showing open items, unapplied credits and their age at the reporting date.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Supplier invoice history",
        description: "Invoices for the period, so credits can be matched to the transactions they purport to adjust.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Goods return and dispute records",
        description:
          "Returns notes, rejected delivery logs, service credit claims or dispute tickets, used to test whether earned credits were ever received.",
        formats: ["xlsx", "csv", "pdf", "written text"],
        required: false,
      },
      {
        name: "Rebate and contract terms",
        description: "Agreements setting out rebates, volume credits or service-level credits the organisation is entitled to.",
        formats: ["pdf", "docx", "xlsx"],
        required: false,
      },
      {
        name: "Credit write-off approvals",
        description: "Records of unapplied credits written off, with amount, date and approver.",
        formats: ["xlsx", "csv", "pdf"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The credit note population for the period, reconciled to credit movements on the supplier control account.",
      "Aged unapplied credit balances at the reporting date.",
      "The invoice, return note, contract clause or dispute record supporting each credit the audit tests.",
      "Approval evidence for any unapplied credit written off, or a note that none was located.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "reconciliation_table",
      "aging_table",
      "aging_visualization",
      "transaction_table",
      "key_metric_card",
      "finding_card",
      "warning_box",
      "root_cause_analysis",
      "recommendation_card",
      "management_question",
    ],
    suggestedFollowups: [
      "Why are the oldest unapplied credits still open, and are those suppliers still trading with us?",
      "Which credits have no supporting return note, dispute record or pricing evidence behind them?",
      "Were rebates and service credits we were contractually entitled to actually received in the period?",
      "Who approves writing off an unapplied supplier credit, and how much was written off this year?",
      "For duplicate-billing credits, can we confirm the original duplicate invoice was not also paid?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sage", "coupa", "dynamics365", "odoo", "cin7"],
    tags: ["suppliers", "credit-notes", "payables", "recovery", "reconciliation"],
  },
  {
    slug: "split-purchase-review",
    name: "Split purchase review",
    category: "suppliers",
    subcategory: "Procurement compliance",
    description:
      "Looks for purchases deliberately broken into smaller pieces to stay under an approval or tendering limit, and tests whether the pattern reflects avoidance or ordinary business rhythm.",
    defaultTitle: "Split purchase review",
    auditDescription:
      "Examines purchasing patterns for orders fragmented across time, requisitioners or cost centres in ways consistent with circumventing the organisation's own authorisation and tendering limits.",
    instructions: `You are looking for structuring in the purchase-to-pay process: a requirement that should have gone through a higher approval level or a competitive tender, broken into pieces small enough that it did not. Your reader is the head of procurement and internal audit. Note carefully what governs this audit — the limits being avoided are the organisation's own delegated authority limits, and you must obtain them from the user or their policy documents. Do not assume a limit, invent one, or carry one over from another engagement. If the user cannot tell you what the approval matrix is, that gap is itself a finding: describe the fragmentation patterns you observe without asserting any limit was circumvented.

Once you have their authority matrix and tendering rules, work outward from the natural units of a purchase rather than individual documents. A split shows up as several transactions sharing a purpose but kept apart. Look for orders to the same supplier for the same or closely related goods raised within a short window, each falling just under an approval step. Look at the distance below the limit: a cluster of values sitting immediately beneath a step, where the distribution above it is thin, tells you more than any single transaction. Look for one requirement spread across several requisitioners, cost centres or legal entities, so no approver sees the whole. Look for sequential POs that, aggregated over a year, would plainly have required a tender.

Then test intent through surrounding evidence, not numbers alone. Who raised each piece, and who approved them — the same requisitioner and approver across a cluster differs materially from unrelated people coincidentally buying from one vendor. Was there a single quote, specification or scope of work covering the whole requirement, later chopped up? Were the pieces raised after approval for the whole was refused or delayed?

Weigh innocent explanations properly, because this pattern has many benign causes and accusing people wrongly is expensive. Repeat consumable purchasing produces clusters. Phased delivery is often operationally legitimate. Budget release in tranches, framework call-offs under an already-tendered agreement, and emergency purchases all resemble splitting in the data alone. A supplier invoicing monthly under a standing arrangement is not being split. Say which explanation you tested and what evidence distinguishes avoidance from rhythm.

Cite every cluster to the specific POs, invoices, requisitioners, approvers, dates and rows constituting it, and state the limit you tested against and where you got it. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Deliberate circumvention is an allegation about named people — present it as an indicator requiring management explanation, never as established fact, and defer any conclusion to a licensed professional.`,
    recommendedInputs: [
      {
        name: "Purchase order and requisition data",
        description:
          "POs and requisitions with date, supplier, requisitioner, approver, cost centre, line detail, quantity and value.",
        formats: ["xlsx", "csv", "procurement export"],
        required: true,
      },
      {
        name: "Delegated authority matrix",
        description:
          "The organisation's own approval limits by role and value band, plus the thresholds at which competitive tendering is required.",
        formats: ["pdf", "docx", "xlsx", "written text"],
        required: true,
      },
      {
        name: "Supplier invoice data",
        description:
          "Invoices with date, supplier, value and line detail, so purchases invoiced without a PO are also in scope.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Procurement policy",
        description: "The rules on tendering, single-source justification, framework call-offs and emergency purchases.",
        formats: ["pdf", "docx", "written text"],
        required: false,
      },
      {
        name: "Quotes, specifications and scopes of work",
        description:
          "Underlying sourcing documents, which can reveal a single requirement later divided across multiple orders.",
        formats: ["pdf", "docx", "xlsx"],
        required: false,
      },
      {
        name: "Goods receipt records",
        description: "Receipt dates and quantities, to distinguish genuinely phased delivery from artificial fragmentation.",
        formats: ["xlsx", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The organisation's own delegated authority and tendering thresholds, with the source they were taken from.",
      "Purchase order or requisition data including requisitioner, approver, date and value.",
      "Invoice or receipt data for each cluster raised, allowing the underlying requirement to be reconstructed.",
      "The sourcing document, quote or scope of work behind each cluster the audit raises, or a note that none was located.",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "audit_methodology",
      "transaction_table",
      "scatter_chart",
      "bar_chart",
      "finding_card",
      "control_weakness",
      "management_question",
      "assumption_box",
      "control_recommendation",
      "limitation_box",
    ],
    suggestedFollowups: [
      "What are the current delegated authority and tendering thresholds, when did they last change, and are they enforced in the system or only in policy?",
      "For each cluster raised, was there a single underlying quote, specification or scope of work covering the whole requirement?",
      "Did the same requisitioner and approver appear across every piece of the cluster, and could either see the aggregate?",
      "Which of these clusters were call-offs under an already-tendered framework agreement?",
      "Does the purchasing system aggregate spend per supplier per requirement when testing an approval limit, or evaluate each document in isolation?",
    ],
    relevantIntegrations: ["coupa", "netsuite", "sap", "dynamics365", "oracle_fusion", "quickbooks", "xero", "ramp"],
    tags: ["suppliers", "procurement", "authorisation", "fraud-risk", "controls"],
  },
  {
    slug: "employee-supplier-conflict-indicator-review",
    name: "Employee-supplier conflict indicator review",
    category: "suppliers",
    subcategory: "Conflicts of interest",
    description:
      "Matches employee records against the supplier master for shared identifiers that may indicate an undisclosed personal interest in a vendor, and tests disclosure and approval around each match.",
    defaultTitle: "Employee-supplier conflict indicator review",
    auditDescription:
      "Compares employee and vendor data for shared addresses, bank accounts, tax numbers and contact details, testing whether any resulting conflict of interest was declared and managed.",
    instructions: `You are running an indicator review, not an investigation, and that distinction governs everything you write. You are matching employee data against the supplier master to surface signals that an employee may have an undisclosed personal interest in a vendor. Your reader is HR, compliance and internal audit — people who will act on what you write, so the epistemic labelling here must be stricter than in any other supplier audit.

Before matching anything, confirm the ground rules: that the organisation authorises this comparison of employee personal data, which fields are in scope, and what their conflict-of-interest policy requires people to declare. Test against their policy, not your own idea of good practice. Take their register as the baseline — the real question is what sits in the data but not the register.

Match on identifying attributes and be explicit about the strength of each. A shared bank account between employee and supplier is strong and rarely coincidental, as is a shared tax identifier. A shared residential address is moderate but degrades badly in dense housing, shared flats and serviced offices, as is a shared personal phone or email domain. A shared surname alone is weak and should rarely be reported by itself. Rank matches by identifier strength and by how many independent identifiers coincide — two weak matches on one pair mean more than either alone. Consider near-matches too, since names and addresses are entered inconsistently, but be candid that fuzzy matching produces false positives.

Then ask what each candidate would mean if real. Does the employee sit anywhere in the chain that created, approved or paid that supplier? Was the vendor created shortly after they joined, or by their own user account? Does the supplier's activity — round sums, vague descriptions, no PO, invoices only ever approved by one person — corroborate or contradict the signal? A match on someone with no purchasing role is far weaker than one on the vendor's onboarder.

Weigh innocent explanations first, and say so in the report: employees legitimately live at addresses others have lived at, family-run suppliers are often properly declared, and an employee may be a genuine expense-reimbursement payee in the vendor file.

Encode no threshold or escalation rule. Present each match with its identifier, strength, corroboration, and the question management must answer. Cite every match to the exact records, fields and rows on both sides. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information, defaulting to unverified hypothesis for anything resting on identity matching alone. State plainly that these are indicators requiring explanation, not evidence of wrongdoing, and that any conclusion or disciplinary step requires a licensed professional and proper HR and legal process.`,
    recommendedInputs: [
      {
        name: "Employee master data",
        description:
          "Employee records with name, address, personal contact details, bank account, tax or national identifier, start date and role, provided under an authorised comparison.",
        formats: ["xlsx", "csv", "payroll export"],
        required: true,
      },
      {
        name: "Supplier master file",
        description:
          "Vendor records with legal and trading name, address, contact details, bank account, tax registration, creation date and creating user.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Conflict of interest declarations register",
        description: "Existing declared interests, outside directorships and family relationships, and their approval status.",
        formats: ["xlsx", "csv", "pdf"],
        required: true,
      },
      {
        name: "Supplier transaction history",
        description:
          "Invoices and payments per supplier with approver and requisitioner, to corroborate or weaken each identifier match.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: false,
      },
      {
        name: "Vendor master creation log",
        description: "Records of who created or amended each vendor and when, to link a match to a purchasing role.",
        formats: ["xlsx", "csv", "system audit log export"],
        required: false,
      },
      {
        name: "Conflict of interest policy",
        description: "The organisation's stated rules on what employees must declare and how conflicts are managed.",
        formats: ["pdf", "docx", "written text"],
        required: false,
      },
    ],
    requiredEvidence: [
      "Confirmation that the employee-to-supplier data comparison is authorised, and which employee fields were in scope.",
      "The employee and supplier records matched, identified by row and field, for every candidate reported.",
      "The existing declarations register used as the baseline for what was already disclosed.",
      "The organisation's conflict of interest policy, or a note that it was not provided.",
      "Corroborating transaction or vendor-creation evidence for each candidate raised, or a statement that none exists.",
    ],
    suggestedPeriod: "annual",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "audit_methodology",
      "table",
      "risk_matrix",
      "finding_card",
      "assumption_box",
      "management_question",
      "data_quality_warning",
      "control_recommendation",
      "limitation_box",
      "follow_up_request",
    ],
    suggestedFollowups: [
      "Does the organisation authorise matching employee bank and identifier data against the vendor master, and under what basis?",
      "Are conflict declarations collected by positive annual confirmation from all staff, or only when someone volunteers one?",
      "For each candidate raised, does the employee have any role in creating, approving or paying that supplier?",
      "Which of these matches are already covered by an approved declaration we were not shown?",
      "Can employees create vendor master records in the same system where they approve invoices?",
    ],
    relevantIntegrations: ["gusto", "adp", "quickbooks", "xero", "netsuite", "sap", "coupa", "postgres"],
    tags: ["suppliers", "conflict-of-interest", "fraud-risk", "master-data", "compliance"],
  },
  {
    slug: "long-outstanding-payables-review",
    name: "Long-outstanding payables review",
    category: "suppliers",
    subcategory: "Payables management",
    description:
      "Investigates supplier balances that have sat unpaid far beyond terms, distinguishing genuine liabilities from disputes, duplicates, errors and amounts that no longer exist.",
    defaultTitle: "Long-outstanding payables review",
    auditDescription:
      "Examines aged supplier balances that remain unsettled well past their terms, testing whether each represents a real obligation, why it persists, and what the balance conceals.",
    instructions: `You are auditing the old end of the payables ledger — balances unpaid long past their terms. Your reader is the financial controller and the treasurer. Two opposite errors live here at once: the ledger may overstate liabilities that no longer exist, and it may hide real obligations behind items everyone assumes are stale. Treat the balance as questions about individual items, not a number to explain away.

Start with the ageing itself, because a wrong age makes the whole review wrong. Confirm the age runs from invoice or due date rather than posting date, that the listing foots and agrees to the payables control account, and that partial payments and credits were applied against the items they relate to rather than the oldest open item by default. Where allocation is automatic, the profile can be an artefact of that logic rather than a picture of what is unpaid.

Then classify the old items, because each class resolves differently. Disputed invoices, where goods, service or price is contested, should tie to a dispute record and remain a live liability. Invoices blocked on a missing goods receipt or failed match are real but stuck on process. Duplicates — the same invoice open twice, or open once and already paid — deserve attention on the paid side, where cash has often already left. Posting errors: wrong supplier account, wrong currency, one-sided reversals. And extinguished amounts: suppliers dissolved, liabilities time-barred, balances no longer recognised.

Corroborate rather than assume. Where a balance is old and the supplier still active, ask whether their statement agrees — an item they do not show suggests the liability is not real; an item they show that you do not is far more serious. A supplier who kept delivering while long owed is either very patient or not actually owed.

Then read the pattern beyond the ledger. Old balances concentrated with a few suppliers may be a dispute nobody escalated. Ageing that deteriorated sharply may reflect a liquidity decision leadership should own explicitly rather than let happen through the payment run — with commercial consequences (forfeited discounts, tightening terms, supply risk) for the report.

Apply no threshold of your own. Take terms from the contracts and supplier master and ask the user what materiality basis they want; if none is given, form a judgement from the composition of the balance and state that basis in one sentence, labelled as judgement. Cite every balance to its supplier account, invoice number, ledger row and date. Label each claim as evidence-supported, reasonable interpretation, unverified hypothesis, or missing information. Writing back a liability is an accounting and legal judgement — recommend it for consideration, never assert it, and defer to a licensed professional.`,
    recommendedInputs: [
      {
        name: "Aged payables listing",
        description:
          "Open supplier balances at the reporting date by invoice, with invoice date, due date, amount and ageing bucket.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Payables control account activity",
        description: "General ledger movements on the payables control account for the period, to agree to the aged listing.",
        formats: ["xlsx", "csv", "accounting system export"],
        required: true,
      },
      {
        name: "Supplier master with payment terms",
        description: "Agreed terms per supplier, plus status, so age can be assessed against what was actually agreed.",
        formats: ["xlsx", "csv"],
        required: true,
      },
      {
        name: "Supplier statements",
        description:
          "Statements received from suppliers for the largest or oldest balances, to corroborate whether the liability exists on their side.",
        formats: ["pdf", "xlsx", "csv"],
        required: false,
      },
      {
        name: "Dispute and invoice-hold records",
        description: "Records of contested invoices, blocked matches or held payments explaining why items remain open.",
        formats: ["xlsx", "csv", "written text"],
        required: false,
      },
      {
        name: "Payment history",
        description: "Payments in the period, so items believed unpaid can be checked against amounts already disbursed.",
        formats: ["xlsx", "csv"],
        required: false,
      },
      {
        name: "Prior period aged payables",
        description: "The comparable ageing from a prior period, to show which items are persistent and how the profile moved.",
        formats: ["xlsx", "csv"],
        required: false,
      },
    ],
    requiredEvidence: [
      "The aged payables listing, footed and agreed to the payables control account.",
      "Agreed payment terms per supplier, and the date basis used to calculate the age.",
      "Invoice-level detail for each balance the audit raises, including invoice number and date.",
      "Corroboration for each old item classified as disputed, duplicated or extinguished — statement, dispute record, or payment evidence.",
      "The prior period ageing, or an explicit note that comparatives were unavailable.",
    ],
    suggestedPeriod: "quarterly",
    expectedOutputStructure: [
      "executive_summary",
      "audit_scope",
      "reconciliation_table",
      "aging_table",
      "aging_visualization",
      "key_metric_card",
      "period_comparison",
      "transaction_table",
      "finding_card",
      "root_cause_analysis",
      "recommendation_card",
      "management_question",
    ],
    suggestedFollowups: [
      "Is the ageing calculated from due date, and does the ledger allocate payments to specific invoices or to the oldest open item by default?",
      "For the oldest balances, does the supplier's own statement show the same item, and are they still chasing it?",
      "Which of these old items are genuinely disputed, and which are simply stuck in an invoice-matching hold nobody cleared?",
      "Have any of these items already been paid on a separate invoice number or supplier account?",
      "Did the ageing profile deteriorate because of a deliberate liquidity decision, and if so was that decision made and owned at leadership level?",
    ],
    relevantIntegrations: ["quickbooks", "xero", "netsuite", "sage", "dynamics365", "oracle_fusion", "coupa", "snowflake"],
    tags: ["suppliers", "payables", "aging", "liabilities", "working-capital"],
  },
];
