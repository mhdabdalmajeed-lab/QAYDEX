
# Product Requirements Document

## AI Accounting Audit Platform

**Document status:** Product definition
**Primary ICP:** Companies conducting internal finance audits
**Secondary ICP:** Accounting and audit firms serving clients
**Core outcome:** Identify financial risks, errors, inconsistencies, control weaknesses, and areas requiring investigation
**Audit engine:** Latest approved production GPT models through API
**Product model:** Multi-tenant B2B SaaS

---

# 1. Product Overview

The AI Accounting Audit Platform allows finance teams and audit firms to conduct comprehensive financial audits using company instructions, uploaded evidence, written context, and connected financial systems.

Users create an audit by:

1. Selecting an audit template or starting from scratch.
2. Selecting previously saved audit instructions.
3. Adding or editing instructions for the specific audit.
4. Providing files, written context, and integration data.
5. Reviewing the available inputs.
6. Starting the audit.
7. Receiving a dynamically generated audit containing findings, risks, charts, tables, highlighted observations, summaries, recommendations, and other generative interface components.
8. Continuing the investigation through an AI chat grounded in the audit’s inputs and outputs.
9. Returning to the audit at any time to review evidence, findings, conversations, and previous revisions.

The platform must not rely on hard-coded accounting audit rules to determine findings. The GPT model decides how to interpret the data, what risks to investigate, what comparisons to make, and how to present the results based on the selected instructions and available evidence.

---

# 2. Product Vision

Create an AI-native financial audit workspace that can inspect an organization’s complete financial context, surface meaningful risks, explain its reasoning through cited evidence, and adapt its audit approach to the organization’s policies and objectives.

The platform should function as:

* An internal financial audit analyst.
* A continuous financial risk investigator.
* An audit preparation assistant.
* A financial data exploration workspace.
* A client audit platform for accounting firms.
* A persistent institutional memory for previous audits and findings.

---

# 3. Product Goals

## 3.1 Primary Goals

* Detect financial risks, errors, inconsistencies, unusual activity, missing information, and weak controls.
* Allow organizations to define exactly how audits should be conducted.
* Support virtually any financial input format.
* Generate consistent and structured audits from unstructured evidence.
* Make every material finding traceable to its supporting evidence.
* Allow users to investigate audit findings conversationally.
* Preserve every audit, input, instruction, result, and conversation for future access.
* Provide more than 100 ready-to-use audit templates.
* Support both internal organizational audits and client-facing audit engagements.

## 3.2 Secondary Goals

* Reduce the time needed to prepare and review financial evidence.
* Help finance teams identify issues before external audits.
* Standardize internal audit practices across departments and subsidiaries.
* Allow audit firms to deliver repeatable services across multiple clients.
* Improve the accessibility of complex accounting information.
* Turn financial information into management-level recommendations.

---

# 4. Non-Goals

The initial product will not:

* Replace the legal sign-off of a licensed auditor.
* Guarantee regulatory compliance without professional review.
* Automatically submit regulatory filings.
* Automatically change accounting records.
* Automatically approve or reject transactions.
* Use hard-coded thresholds to determine whether a transaction is fraudulent or incorrect.
* Present model-generated conclusions as legally definitive.
* silently modify a completed audit when a newer GPT model becomes available.

---

# 5. Target Users

## 5.1 Internal Finance Audit Teams

Typical users:

* Internal auditors.
* Finance managers.
* Financial controllers.
* CFOs.
* Accounting managers.
* Risk and compliance teams.
* Treasury teams.
* Department heads reviewing financial performance.

Primary use cases:

* Monthly financial health audits.
* Pre-close and post-close reviews.
* Internal control reviews.
* Expense audits.
* General ledger reviews.
* Budget variance investigations.
* Cash flow and liquidity analysis.
* Customer receivables audits.
* Supplier and payables audits.
* Subsidiary and branch audits.

## 5.2 Accounting and Audit Firms

Typical users:

* Audit partners.
* Audit managers.
* Senior auditors.
* Junior auditors.
* Outsourced finance teams.
* Accounting advisory teams.

Primary use cases:

* Client financial reviews.
* Audit preparation engagements.
* Internal control assessments.
* Transaction testing.
* Due diligence.
* Management letter preparation.
* Recurring client monitoring.
* Financial health assessments.

---

# 6. Core Product Principles

## 6.1 Instruction-First Auditing

Every audit must be governed by explicit instructions.

Instructions can define:

* Audit objective.
* Audit scope.
* Accounting period.
* Materiality considerations.
* Risk areas.
* Required comparisons.
* Reporting format.
* Tone and level of detail.
* Company-specific policies.
* Industry-specific considerations.
* Areas that must be excluded.
* Required evidence standards.
* Required recommendations.
* Whether the model should ask questions before completing the audit.

## 6.2 Evidence-Linked Findings

Every significant finding should reference:

* The source file, integration, or written input.
* Relevant pages, rows, records, transactions, or sections.
* The data used to reach the conclusion.
* The audit instruction that caused the area to be investigated.

## 6.3 Model-Driven Audit Logic

The platform must not contain a traditional rule engine that determines audit findings.

The GPT model is responsible for:

* Choosing the audit approach.
* Understanding the instructions.
* Interpreting financial evidence.
* Identifying relevant relationships.
* Determining what requires investigation.
* Forming conclusions.
* Selecting the most appropriate output components.
* Generating follow-up questions.
* Producing recommendations.

Deterministic platform functionality is limited to:

* Authentication and permissions.
* File upload and storage.
* Integration synchronization.
* Data extraction orchestration.
* Input validation.
* Arithmetic and data-processing tools invoked by the model.
* Output schema validation.
* Evidence linking.
* Audit versioning.
* Rendering generated components.
* Logging and monitoring.

## 6.4 Persistent Audit Context

An audit is not a one-time generated report. It is a persistent workspace containing:

* Instructions.
* Inputs.
* Parsed evidence.
* Generated outputs.
* Findings.
* Charts and tables.
* User comments.
* AI conversations.
* Revisions.
* Exports.
* Activity history.

## 6.5 Consistency Without Hard-Coded Findings

Audit consistency should be achieved through:

* Versioned templates.
* Versioned instructions.
* Stable system prompts.
* Structured output schemas.
* Low-variance model settings where appropriate.
* Required evidence references.
* Automated model self-review.
* A separate model quality-review pass.
* Stored model version and prompt version.
* Stored input snapshots.
* Explicit audit completeness checks.
* Reusable organization-level instructions.

---

# 7. Core Information Architecture

The primary application navigation contains:

* AI Chat
* Ledger
* Budgets
* Cash
* Customers
* Suppliers
* Integrations
* Audits
* Templates
* Instructions
* Settings

The requested accounting sections act as both:

1. Data exploration pages.
2. Entry points for creating specialized audits.

---

# 8. Audit Lifecycle

## 8.1 Create Audit

Users can create an audit from:

* A blank audit.
* An audit template.
* A previous audit.
* A ledger page.
* A budget page.
* A cash page.
* A customer page.
* A supplier page.
* An AI chat conversation.
* An integration dataset.

## 8.2 Select Template

The user selects from more than 100 templates.

The template automatically loads:

* Default audit title.
* Audit description.
* Audit instructions.
* Recommended inputs.
* Required evidence.
* Suggested accounting period.
* Expected output structure.
* Suggested follow-up questions.
* Relevant data integrations.

## 8.3 Select Instructions

The user can select:

* Organization-wide instructions.
* Department instructions.
* Audit-type instructions.
* Industry instructions.
* Client instructions.
* Custom instructions.
* Instructions included by the selected template.

The interface must clearly show which instructions are active.

## 8.4 Add Audit-Specific Instructions

Users can add or modify instructions while creating the audit.

Examples:

* Focus on unusual journal entries made after business hours.
* Review whether revenue recognition is consistent with contracts.
* Ignore immaterial foreign exchange differences.
* Compare results against the board-approved budget.
* Explain findings for a non-accounting executive audience.
* Produce a detailed management action plan.

## 8.5 Add Inputs

The product must support three universal input methods:

### Files

Users can upload any file.

Priority formats include:

* XLSX.
* XLS.
* CSV.
* PDF.
* DOCX.
* TXT.
* JSON.
* XML.
* Images.
* Scanned statements.
* ZIP archives.
* Accounting system exports.
* Bank statement formats.
* Invoice and receipt files.

Unsupported or unreadable files should be stored and clearly flagged.

### Written Text

Users can add:

* Audit context.
* Management explanations.
* Policies.
* Notes.
* Questions.
* Known concerns.
* Period descriptions.
* Business model information.
* Transaction explanations.
* Previous audit findings.

### Integrations

Users can ingest connected data from:

* Accounting systems.
* ERP platforms.
* Bank accounts.
* Payment processors.
* CRM systems.
* Expense platforms.
* Payroll systems.
* Data warehouses.
* Cloud storage.
* Internal databases.
* APIs.

## 8.6 Review Inputs

Before starting the audit, users see:

* All uploaded files.
* All written inputs.
* All integration datasets.
* Detected accounting periods.
* Detected currencies.
* Detected entities.
* Potential duplicate inputs.
* Missing recommended inputs.
* Extraction status.
* Parsing warnings.
* Data freshness.
* Estimated audit scope.

The user may proceed even when inputs are incomplete.

## 8.7 Generate Audit

The model:

1. Reads the complete instruction hierarchy.
2. Reviews available inputs.
3. Determines whether clarification is required.
4. Builds an internal audit plan.
5. Parses and analyzes relevant evidence.
6. Performs required calculations and comparisons.
7. Identifies findings and risks.
8. Links findings to evidence.
9. Generates the audit interface.
10. Runs a quality-review pass.
11. Publishes the audit.

## 8.8 Review Audit

The completed audit opens as an interactive workspace rather than a static report.

## 8.9 Continue Through Chat

A floating chat control at the bottom of the audit allows the user to:

* Ask about findings.
* Challenge conclusions.
* Request deeper analysis.
* Add new evidence.
* Ask for alternative explanations.
* Generate new charts.
* Compare periods.
* Convert a conversation into a new audit revision.

Selecting the floating chat opens a new conversation in the AI Chat page with the audit’s full context attached.

---

# 9. Instructions System

## 9.1 Instructions Library

Users can create reusable instruction sets.

Instruction categories include:

* Organization.
* Client.
* Subsidiary.
* Department.
* Audit type.
* Accounting standard.
* Industry.
* Reporting.
* Risk.
* Data handling.
* Output formatting.

## 9.2 Instruction Fields

Each instruction contains:

* Name.
* Description.
* Instruction text.
* Category.
* Applicable modules.
* Applicable entities.
* Applicable audit templates.
* Owner.
* Visibility.
* Priority.
* Effective date.
* Expiration date.
* Version.
* Status.
* Tags.

## 9.3 Instruction Priority

The instruction hierarchy is:

1. Platform safety and security requirements.
2. Organization mandatory instructions.
3. Client or entity mandatory instructions.
4. Template instructions.
5. User-selected reusable instructions.
6. Audit-specific instructions.
7. Chat-level instructions.

Conflicts must be identified before the audit starts.

The product should present conflicting instructions and ask the user to resolve them rather than silently selecting one.

## 9.4 Instruction Versioning

Every audit stores an immutable snapshot of the instructions used.

Editing an instruction later must not change an existing audit.

A user may choose to:

* Keep the original audit unchanged.
* Re-run the audit using the updated instruction.
* Create a new audit revision.
* Compare results between instruction versions.

---

# 10. AI Chat

## 10.1 General AI Chat

The AI Chat page provides a conversational interface for financial analysis.

Users can:

* Start a blank financial conversation.
* Attach files.
* Add written context.
* Attach integration data.
* Attach an existing audit.
* Attach selected findings.
* Attach ledger accounts or transactions.
* Attach budget periods.
* Attach bank accounts.
* Attach customers.
* Attach suppliers.
* Ask the AI to create an audit.

## 10.2 Audit-Grounded Chat

When launched from an audit, the chat automatically receives:

* Audit instructions.
* Audit inputs.
* Parsed data.
* Audit findings.
* Generated output blocks.
* Evidence references.
* Previous audit conversations.
* Audit revision history.

## 10.3 Chat Capabilities

The AI can:

* Explain a finding.
* Identify supporting evidence.
* Re-evaluate a conclusion.
* Compare multiple periods.
* Compare multiple entities.
* Generate a chart or table.
* Summarize a long report.
* Find contradictions.
* Suggest missing evidence.
* Draft management questions.
* Draft an audit committee summary.
* Create a remediation plan.
* Create a new audit from the conversation.
* Add a new finding to an audit revision.
* Generate an exportable report section.

## 10.4 Chat Interface

The interface includes:

* Conversation list.
* Search.
* Pinned conversations.
* Audit-linked conversations.
* File and data attachments.
* Source references.
* Generated tables and charts.
* Suggested follow-up prompts.
* Model status.
* Context usage indicator.
* Conversation export.
* Rename and archive controls.

## 10.5 Chat Safety

The AI must distinguish between:

* Evidence-supported findings.
* Reasonable interpretations.
* Unverified hypotheses.
* Missing information.
* User-provided claims.
* Professional judgment requirements.

---

# 11. Ledger

## 11.1 Ledger Overview

The Ledger page provides access to:

* General ledger accounts.
* Trial balances.
* Journal entries.
* Chart of accounts.
* Opening balances.
* Closing balances.
* Account activity.
* Accounting periods.
* Entities and subsidiaries.
* Currencies.
* Cost centers.
* Departments.
* Projects.
* Transaction dimensions.

## 11.2 Ledger Data Views

Users can view:

* Account-level summaries.
* Transaction-level details.
* Monthly movement.
* Debit and credit activity.
* Period comparisons.
* Entity comparisons.
* Journal source comparisons.
* Manual versus automated postings.
* User-level posting activity.
* Supporting documents.

## 11.3 Ledger Audit Areas

Ledger audit templates can investigate:

* Unusual journal entries.
* Duplicate postings.
* Reversed entries.
* Late postings.
* Period-end adjustments.
* Backdated entries.
* Unsupported entries.
* Entries posted by unusual users.
* Entries posted outside expected periods.
* Round-number transactions.
* Suspense account activity.
* Dormant account activity.
* Unexpected account relationships.
* Misclassifications.
* Balance inconsistencies.
* Opening balance issues.
* Intercompany differences.
* Foreign currency issues.
* Reconciliation gaps.
* Unexpected manual adjustments.
* Changes in posting behavior.
* Missing transaction descriptions.
* Weak supporting evidence.
* Potential management override.
* Potential expense capitalization.
* Potential revenue timing issues.

The model determines relevance based on instructions and evidence rather than fixed thresholds.

## 11.4 Ledger Actions

Users can:

* Start a ledger audit.
* Attach selected accounts to AI Chat.
* Attach selected transactions to an audit.
* Request an explanation of account movement.
* Generate a reconciliation review.
* Compare ledger periods.
* Save a filtered ledger view.
* Export supporting data.

---

# 12. Budgets

## 12.1 Budget Overview

The Budgets page supports:

* Annual budgets.
* Department budgets.
* Project budgets.
* Capital budgets.
* Cash budgets.
* Rolling forecasts.
* Reforecasts.
* Scenario plans.
* Board-approved budgets.
* Management targets.

## 12.2 Budget Data

Budget records can include:

* Account.
* Department.
* Cost center.
* Entity.
* Project.
* Period.
* Currency.
* Budget amount.
* Forecast amount.
* Actual amount.
* Variance.
* Budget owner.
* Assumptions.
* Commentary.
* Approval status.
* Revision history.

## 12.3 Budget Audit Areas

Budget audits can examine:

* Actual versus budget differences.
* Actual versus forecast differences.
* Unexplained overspending.
* Unexplained underspending.
* Revenue shortfalls.
* Margin deterioration.
* Repeated forecast misses.
* Unrealistic assumptions.
* Budget manipulation.
* Late budget revisions.
* Unauthorized budget changes.
* Inconsistent assumptions.
* Departmental spending patterns.
* Capital expenditure overruns.
* Missing budget ownership.
* Poor variance explanations.
* Seasonal inconsistencies.
* Cash impact of budget deviations.
* Budget concentration.
* Dependency on uncertain revenue.
* Unfunded commitments.
* Misalignment with strategic plans.

## 12.4 Budget Actions

Users can:

* Start a budget audit.
* Compare budget versions.
* Ask AI to explain a variance.
* Generate a variance chart.
* Produce a budget risk summary.
* Generate questions for budget owners.
* Create a management action plan.
* Attach budget data to an existing audit.

---

# 13. Cash

## 13.1 Cash Overview

The Cash page includes:

* Bank accounts.
* Cash accounts.
* Bank statements.
* Cash movements.
* Cash flow statements.
* Payment activity.
* Receipt activity.
* Bank reconciliations.
* Liquidity position.
* Restricted cash.
* Petty cash.
* Cash forecasts.

## 13.2 Cash Data Views

Users can view:

* Daily cash position.
* Weekly cash movement.
* Monthly cash movement.
* Account balances.
* Inflows and outflows.
* Transfer activity.
* Payment beneficiaries.
* Receipt sources.
* Currency exposure.
* Unreconciled items.
* Outstanding deposits.
* Outstanding payments.
* Cash forecast versus actual.

## 13.3 Cash Audit Areas

Cash audits can investigate:

* Unreconciled transactions.
* Missing bank transactions.
* Duplicate payments.
* Duplicate receipts.
* Unusual transfers.
* Transfers between related accounts.
* Suspicious beneficiaries.
* Unusual withdrawal patterns.
* Negative cash balances.
* Dormant bank accounts.
* Restricted cash misuse.
* Unexpected cash shortages.
* Cash flow deterioration.
* Liquidity pressure.
* Concentrated payment activity.
* Large manual payments.
* Unexpected weekend activity.
* Round-number transfers.
* Bank fee anomalies.
* Old outstanding reconciliation items.
* Unsupported petty cash activity.
* Payment timing concerns.
* Cash forecast inaccuracies.
* Potential cash leakage.
* Potential unauthorized transactions.

## 13.4 Cash Actions

Users can:

* Start a cash audit.
* Start a bank reconciliation audit.
* Investigate selected transactions.
* Compare bank and ledger data.
* Generate a liquidity risk report.
* Generate cash flow charts.
* Attach bank accounts to AI Chat.
* Request explanations for cash movement.

---

# 14. Customers

## 14.1 Customer Overview

The Customers page includes:

* Customer master records.
* Customer accounts.
* Invoices.
* Credit notes.
* Receipts.
* Refunds.
* Outstanding balances.
* Aging.
* Credit limits.
* Payment terms.
* Contracts.
* Sales orders.
* Revenue records.
* Customer communications.

## 14.2 Customer Data Views

Users can view:

* Customer balances.
* Aging buckets.
* Revenue by customer.
* Revenue by period.
* Revenue concentration.
* Payment performance.
* Credit exposure.
* Disputes.
* Refund activity.
* Credit note activity.
* Customer profitability.
* Contract and invoice relationships.

## 14.3 Customer Audit Areas

Customer audits can investigate:

* Overdue receivables.
* Uncollectible balances.
* Revenue concentration.
* Unusual revenue growth.
* Revenue decline.
* Unusual invoice timing.
* Duplicate invoices.
* Missing invoices.
* Credit note abuse.
* Refund anomalies.
* Customer master duplicates.
* Unusual payment terms.
* Credit limit exceptions.
* Revenue recognition concerns.
* Contract and invoice inconsistencies.
* Unsupported discounts.
* Unusual sales returns.
* Related-party customers.
* Dormant customers with activity.
* New customers with high exposure.
* Customer profitability concerns.
* Potential channel stuffing.
* Potential fictitious sales.
* Unapplied receipts.
* Disputed receivables.
* Receivable aging deterioration.
* Customer data quality issues.

## 14.4 Customer Actions

Users can:

* Start a customer audit.
* Start a receivables audit.
* Start a revenue audit.
* Analyze a specific customer.
* Compare customer periods.
* Generate aging analysis.
* Generate a collections priority list.
* Draft customer confirmation requests.
* Attach customers to AI Chat.
* Add customer records to an existing audit.

---

# 15. Suppliers

## 15.1 Supplier Overview

The Suppliers page includes:

* Supplier master records.
* Supplier invoices.
* Purchase orders.
* Goods receipts.
* Payments.
* Credit notes.
* Outstanding balances.
* Aging.
* Contracts.
* Supplier bank details.
* Supplier categories.
* Approval records.
* Related entities.

## 15.2 Supplier Data Views

Users can view:

* Supplier balances.
* Spend by supplier.
* Spend by category.
* Spend by department.
* Payment history.
* Invoice history.
* Purchase order matching.
* Contract coverage.
* Bank detail changes.
* Supplier concentration.
* Supplier aging.
* Supplier creation activity.

## 15.3 Supplier Audit Areas

Supplier audits can investigate:

* Duplicate suppliers.
* Duplicate invoices.
* Duplicate payments.
* Split purchases.
* Missing purchase orders.
* Missing goods receipts.
* Invoice and purchase order mismatches.
* Unusual payment terms.
* Supplier bank detail changes.
* Payments to new suppliers.
* Related-party suppliers.
* Dormant suppliers with activity.
* Unusual supplier creation.
* Unsupported supplier invoices.
* Excessive supplier concentration.
* Unusual price increases.
* Contract leakage.
* Purchases outside contracts.
* Repeated manual payments.
* Round-number invoices.
* Sequential invoice anomalies.
* High-risk supplier behavior.
* Potential fictitious suppliers.
* Employee and supplier relationship indicators.
* Supplier master data weaknesses.
* Unusual credit notes.
* Prepayments without resolution.
* Long-outstanding payables.
* Payment timing inconsistencies.

## 15.4 Supplier Actions

Users can:

* Start a supplier audit.
* Start a payables audit.
* Start a procurement audit.
* Analyze an individual supplier.
* Compare supplier periods.
* Generate a duplicate payment review.
* Review purchase order matching.
* Attach suppliers to AI Chat.
* Add supplier records to an existing audit.

---

# 16. Integrations

## 16.1 Accounting Integrations

Target systems include:

* QuickBooks.
* Xero.
* Sage.
* Zoho Books.
* NetSuite.
* Microsoft Dynamics.
* SAP.
* Oracle.
* Odoo.
* ERPNext.
* Custom accounting systems.

## 16.2 Banking Integrations

Support:

* Open banking providers.
* Direct bank APIs.
* Bank statement ingestion.
* Secure file transfer.
* Manual statement uploads.
* Multi-bank aggregation.

## 16.3 Business System Integrations

Support:

* ERP systems.
* CRM systems.
* Payroll systems.
* Expense platforms.
* Procurement platforms.
* Payment processors.
* E-commerce platforms.
* Subscription billing systems.
* Point-of-sale systems.
* Inventory systems.

## 16.4 Data Integrations

Support:

* PostgreSQL.
* MySQL.
* Microsoft SQL Server.
* Snowflake.
* BigQuery.
* Redshift.
* REST APIs.
* GraphQL APIs.
* SFTP.
* Webhooks.
* Custom connectors.

## 16.5 File Storage Integrations

Support:

* Google Drive.
* Microsoft OneDrive.
* SharePoint.
* Dropbox.
* Amazon S3.
* Azure Blob Storage.

## 16.6 Integration Connection Flow

Users can:

1. Select an integration.
2. Authenticate.
3. Select organizations or entities.
4. Select datasets.
5. Select the accounting period.
6. Preview available data.
7. Configure synchronization.
8. Map fields where required.
9. Save the connection.
10. Use the data in audits.

## 16.7 Integration Requirements

Each connection stores:

* Connection owner.
* Authentication status.
* Connected entity.
* Available datasets.
* Last synchronization.
* Next synchronization.
* Data period.
* Sync history.
* Errors.
* Permissions.
* Audit usage history.

## 16.8 Integration Auditability

The platform must log:

* When data was imported.
* Which records were imported.
* Which records changed.
* Which audit used the data.
* Which data snapshot was used.
* Whether the source changed after the audit.
* Whether the integration was disconnected.

---

# 17. Audit Templates

## 17.1 Template Library Requirements

The platform must launch with at least 100 templates.

Templates must be:

* Searchable.
* Filterable.
* Categorized.
* Previewable.
* Versioned.
* Duplicable.
* Customizable.
* Organization-shareable.
* Client-shareable.
* Creatable from completed audits.

## 17.2 Initial Template Distribution

### General Finance and Internal Audit: 20+

Examples:

* Monthly financial health audit.
* Quarterly internal finance audit.
* Year-end audit readiness review.
* Financial statement consistency audit.
* Internal control weakness review.
* Financial data quality audit.
* Management reporting audit.
* Multi-entity financial audit.
* Subsidiary finance audit.
* Branch finance audit.
* Due diligence financial review.
* Related-party transaction review.
* Close process audit.
* Accounting policy compliance review.
* Financial risk assessment.
* Material transaction review.
* Recurring error investigation.
* Prior audit finding follow-up.
* Finance transformation readiness audit.
* Executive finance summary.

### Ledger: 25+

Examples:

* General ledger audit.
* Journal entry audit.
* Manual journal entry review.
* Period-end posting review.
* Suspense account audit.
* Intercompany reconciliation audit.
* Opening balance audit.
* Closing balance audit.
* Chart of accounts review.
* Expense classification audit.
* Capitalization review.
* Revenue posting review.
* Foreign currency ledger audit.
* Dormant account review.
* High-value transaction review.
* User posting behavior review.
* Backdated posting audit.
* Reversal activity audit.
* Duplicate journal review.
* Supporting documentation review.
* Account movement audit.
* Trial balance audit.
* Consolidation audit.
* Cost center posting review.
* Ledger data quality audit.

### Budgets: 15+

Examples:

* Annual budget audit.
* Budget variance audit.
* Forecast accuracy audit.
* Department budget review.
* Capital expenditure budget audit.
* Revenue forecast audit.
* Expense forecast audit.
* Cash budget review.
* Budget assumption review.
* Budget revision audit.
* Budget approval audit.
* Project budget audit.
* Overspending investigation.
* Underspending investigation.
* Budget owner accountability review.

### Cash: 20+

Examples:

* Cash audit.
* Bank reconciliation audit.
* Cash flow audit.
* Liquidity risk audit.
* Payment audit.
* Receipt audit.
* Petty cash audit.
* Cash forecast audit.
* Bank account review.
* Restricted cash audit.
* Unreconciled item review.
* Duplicate payment audit.
* Suspicious transfer review.
* Cash leakage investigation.
* Beneficiary risk review.
* Currency exposure audit.
* Treasury control audit.
* Cash concentration review.
* Short-term solvency review.
* Bank fee audit.

### Customers: 15+

Examples:

* Accounts receivable audit.
* Revenue audit.
* Customer aging audit.
* Customer credit audit.
* Credit note audit.
* Refund audit.
* Revenue concentration audit.
* Revenue recognition review.
* Customer master data audit.
* Customer profitability audit.
* Bad debt risk audit.
* Unapplied receipt audit.
* Customer contract review.
* Sales return audit.
* Customer exposure review.

### Suppliers: 15+

Examples:

* Accounts payable audit.
* Supplier audit.
* Procurement audit.
* Duplicate supplier audit.
* Duplicate invoice audit.
* Duplicate payment audit.
* Supplier master data audit.
* Purchase order compliance audit.
* Three-way matching review.
* Supplier concentration audit.
* Supplier bank detail audit.
* Related-party supplier review.
* Contract leakage audit.
* Prepayment audit.
* Supplier credit note audit.

The initial target should be approximately 120 to 140 templates.

---

# 18. Audit Output System

## 18.1 Generative Interface

The GPT model returns structured interface blocks rather than only producing markdown text.

The model can select and arrange blocks based on:

* Audit instructions.
* Data type.
* Finding severity.
* Available evidence.
* Intended audience.
* Audit objective.

## 18.2 Supported Output Blocks

The initial component library should support:

* Executive summary.
* Audit scope.
* Audit methodology.
* Overall risk rating.
* Finding card.
* Risk highlight.
* Warning box.
* Information box.
* Success box.
* Data quality warning.
* Missing evidence notice.
* Key metric card.
* Trend card.
* Comparison card.
* Variance card.
* Financial ratio card.
* Table.
* Pivot-style table.
* Transaction table.
* Ledger table.
* Aging table.
* Reconciliation table.
* Bar chart.
* Line chart.
* Area chart.
* Pie chart.
* Donut chart.
* Waterfall chart.
* Scatter chart.
* Heatmap.
* Risk matrix.
* Timeline.
* Period comparison.
* Entity comparison.
* Customer concentration chart.
* Supplier concentration chart.
* Cash flow visualization.
* Aging visualization.
* Account movement visualization.
* Evidence list.
* Source citation.
* Recommendation card.
* Action plan.
* Management question.
* Root cause analysis.
* Control weakness.
* Control recommendation.
* Assumption box.
* Limitation box.
* Contradiction alert.
* Follow-up request.
* Appendix.
* Methodology explanation.
* Audit conclusion.
* Management letter section.

## 18.3 Finding Structure

Each finding contains:

* Title.
* Summary.
* Detailed explanation.
* Risk category.
* Severity.
* Confidence.
* Financial impact when estimable.
* Affected periods.
* Affected entities.
* Affected accounts.
* Supporting evidence.
* Relevant instructions.
* Potential explanations.
* Recommended follow-up.
* Recommended remediation.
* Management response.
* Owner.
* Status.
* Due date.
* Comments.

## 18.4 Output Interactions

Users can:

* Expand a finding.
* View supporting evidence.
* Open the original source.
* Ask AI about the block.
* Regenerate the block.
* Request a different visualization.
* Edit the narrative.
* Add a comment.
* Assign the finding.
* Change status.
* Add management response.
* Export the block.
* Hide the block.
* Include the block in a report.
* Create a follow-up audit.

---

# 19. Audit Detail Page

## 19.1 Left Input Panel

The audit detail page contains a persistent collapsible left panel.

The panel displays:

* Audit instructions.
* Uploaded files.
* Written inputs.
* Connected integrations.
* Imported datasets.
* Input status.
* Parsing status.
* Data period.
* Data freshness.
* Evidence references.
* Missing recommended evidence.
* Added input history.

Users can:

* Preview an input.
* Search inputs.
* Filter inputs.
* Add new inputs.
* Remove inputs from a new revision.
* Reprocess an input.
* Ask AI about an input.
* See where an input was referenced.
* Compare input versions.

## 19.2 Main Audit Canvas

The center of the page contains:

* Audit title.
* Audit status.
* Audit period.
* Entity.
* Template.
* Overall summary.
* Generated audit blocks.
* Findings.
* Recommendations.
* Appendices.
* Revision controls.

## 19.3 Floating Chat Inbox

A floating chat control remains visible at the bottom of the page.

It allows the user to:

* Enter a question immediately.
* See recent audit conversations.
* Start a new audit-grounded chat.
* Continue an existing audit conversation.
* Attach an additional file.
* Select findings to discuss.

Submitting a message opens the AI Chat page with the audit context attached.

## 19.4 Audit Header Actions

Users can:

* Share.
* Export.
* Duplicate.
* Create revision.
* Compare revisions.
* Add evidence.
* Edit instructions for a new revision.
* Archive.
* Delete.
* Mark as reviewed.
* Mark as approved.

---

# 20. Audit History and Library

The Audits page contains:

* All audits.
* Draft audits.
* Processing audits.
* Completed audits.
* Audits requiring input.
* Audits requiring review.
* Approved audits.
* Archived audits.

Filters include:

* Audit type.
* Template.
* Entity.
* Client.
* Period.
* Creator.
* Reviewer.
* Status.
* Risk level.
* Finding category.
* Integration.
* Date created.
* Date completed.

Each audit card displays:

* Audit name.
* Audit type.
* Entity or client.
* Period.
* Overall risk.
* Number of findings.
* Creator.
* Last updated.
* Status.
* Template.

---

# 21. Collaboration and Review

## 21.1 Roles

Initial roles include:

* Workspace owner.
* Administrator.
* Finance manager.
* Internal auditor.
* Auditor.
* Reviewer.
* Approver.
* Contributor.
* Read-only user.
* Client user.

## 21.2 Collaboration Features

Users can:

* Comment on findings.
* Mention teammates.
* Assign findings.
* Add management responses.
* Request evidence.
* Mark findings as accepted.
* Mark findings as disputed.
* Mark findings as resolved.
* Add remediation deadlines.
* Approve audits.
* Compare reviewer changes.
* View activity history.

## 21.3 Audit Firm Client Separation

Audit firms require:

* Separate client workspaces.
* Client-specific instructions.
* Client-specific integrations.
* Client-specific templates.
* Client access controls.
* Restricted internal notes.
* Client-visible findings.
* Client-visible reports.
* Engagement-level permissions.

---

# 22. AI Processing Architecture

## 22.1 Processing Stages

### Stage 1: Intake

* Receive instructions.
* Receive files.
* Receive written context.
* Receive integration snapshots.
* Identify entities, periods, and currencies.

### Stage 2: Parsing

* Extract text.
* Extract tables.
* Extract transactions.
* Extract accounting dimensions.
* Extract document metadata.
* Preserve source locations.

### Stage 3: Context Construction

* Organize inputs by entity.
* Organize inputs by period.
* Organize inputs by accounting module.
* Build evidence references.
* Detect relationships between files and records.

### Stage 4: Audit Planning

The GPT model generates an internal audit plan based on:

* Selected template.
* Instructions.
* Available evidence.
* Missing evidence.
* Audit objective.
* Intended audience.

### Stage 5: Analysis

The GPT model:

* Investigates relevant evidence.
* Requests calculations through controlled tools.
* Compares periods and entities.
* Examines relationships.
* Identifies inconsistencies.
* Generates hypotheses.
* Tests hypotheses against available evidence.
* Determines findings.

### Stage 6: Evidence Review

The system verifies that:

* Findings contain evidence references.
* Referenced evidence exists.
* Numerical claims link to source data.
* Unsupported claims are marked as hypotheses.
* Missing information is disclosed.

### Stage 7: Interface Generation

The GPT model selects:

* Output blocks.
* Charts.
* Tables.
* Highlight boxes.
* Finding cards.
* Recommendations.
* Audit structure.

### Stage 8: Quality Review

A separate GPT review pass checks:

* Instruction compliance.
* Evidence coverage.
* Internal contradictions.
* Numerical consistency.
* Missing sections.
* Unsupported conclusions.
* Presentation quality.

### Stage 9: Publication

The platform stores:

* Input snapshot.
* Instruction snapshot.
* Prompt version.
* Model version.
* Tool calls.
* Generated blocks.
* Findings.
* Evidence links.
* Quality review results.
* Completion timestamp.

---

# 23. Consistency and Reproducibility

Using the latest available model without controls would make audits change unpredictably. The product must therefore use the latest **approved** GPT model rather than automatically switching every request to an untested release.

Requirements:

* Store the exact model identifier used.
* Store the system prompt version.
* Store template version.
* Store instruction versions.
* Store input snapshots.
* Store output schema version.
* Use controlled generation parameters.
* Use structured responses.
* Validate every generated block.
* Never silently regenerate completed audits.
* Require a new revision when re-running an audit.
* Allow users to compare revisions.
* Allow administrators to approve model upgrades.
* Evaluate new models against a representative audit set before activation.

The platform should target consistency of process and evidence, not identical wording.

---

# 24. Reporting and Export

Users can export:

* Full audit report.
* Executive summary.
* Findings report.
* Management letter.
* Remediation plan.
* Evidence appendix.
* Selected audit blocks.
* Audit activity history.
* Audit instructions.
* Audit input list.

Initial formats:

* PDF.
* DOCX.
* XLSX.
* CSV.
* HTML.
* Shareable secure link.

Exports must preserve:

* Charts.
* Tables.
* Evidence references.
* Finding severity.
* Page structure.
* Organization branding.
* Client branding where applicable.

---

# 25. Security and Compliance

## 25.1 Data Security

The platform requires:

* Encryption in transit.
* Encryption at rest.
* Tenant isolation.
* Role-based access control.
* Secure file storage.
* Signed file URLs.
* Secret management.
* Integration token encryption.
* Audit logs.
* Session management.
* Configurable retention.
* Secure deletion.

## 25.2 AI Data Controls

Organizations must be able to configure:

* Whether data may be sent to external model APIs.
* Which model providers are permitted.
* Which regions may process data.
* Whether conversations are retained.
* Whether data may be used for product improvement.
* Which users may run audits.
* Which integrations may be used.
* Which file types may be uploaded.

## 25.3 Audit Trail

The platform logs:

* User actions.
* Input uploads.
* Input removals.
* Instruction changes.
* Audit generation.
* Audit regeneration.
* Model version.
* Prompt version.
* Finding edits.
* Finding status changes.
* Exports.
* Shares.
* Approvals.
* Integration synchronizations.

---

# 26. Non-Functional Requirements

## 26.1 Performance

* Standard pages should load within two seconds under normal conditions.
* Large audit inputs must process asynchronously through durable background jobs.
* Users must see progress by processing stage.
* Failed stages must be retryable without restarting the full audit.
* Large datasets must support chunked processing.
* Audit pages must use progressive loading.
* Charts and tables should render independently.

## 26.2 Scalability

The platform must support:

* Hundreds of concurrent audits.
* Large accounting exports.
* Multi-entity organizations.
* Thousands of files per workspace.
* Millions of ledger records.
* Hundreds of client workspaces per audit firm.
* Multiple model calls per audit.
* Queue-based processing.
* Rate-limit management.
* Model fallback configurations.

## 26.3 Reliability

* Inputs must never be silently dropped.
* Partial audits must not be presented as complete.
* Failed model calls must be retried safely.
* Duplicate processing must be prevented.
* Generated outputs must be schema validated.
* Evidence references must remain stable.
* Audit revisions must be immutable after approval.

## 26.4 Accessibility

* Keyboard navigation.
* Screen-reader support.
* Accessible charts.
* High-contrast states.
* Clear severity indicators that do not depend only on color.
* Exported reports with structured headings.

---

# 27. Core Data Entities

## Workspace

* Name.
* Type.
* Industry.
* Currency.
* Accounting standards.
* Fiscal year.
* Members.
* Settings.

## Organization Entity

* Legal name.
* Entity type.
* Registration details.
* Base currency.
* Fiscal period.
* Parent entity.
* Subsidiaries.

## Client

* Client details.
* Engagements.
* Instructions.
* Integrations.
* Users.
* Branding.

## Audit

* Name.
* Objective.
* Scope.
* Period.
* Entity.
* Template.
* Status.
* Creator.
* Reviewer.
* Instructions.
* Inputs.
* Findings.
* Outputs.
* Revisions.

## Audit Template

* Name.
* Category.
* Description.
* Instructions.
* Recommended inputs.
* Required outputs.
* Version.
* Visibility.

## Instruction

* Name.
* Category.
* Text.
* Priority.
* Version.
* Applicability.
* Owner.

## Input

* Type.
* Source.
* File.
* Integration.
* Written text.
* Entity.
* Period.
* Status.
* Parsed content.
* Evidence references.

## Finding

* Title.
* Severity.
* Confidence.
* Explanation.
* Evidence.
* Recommendation.
* Owner.
* Status.

## Output Block

* Block type.
* Position.
* Content.
* Data.
* Evidence.
* Configuration.
* Version.

## Conversation

* Messages.
* Attached audit.
* Attached inputs.
* Attached findings.
* Generated outputs.
* Participants.

---

# 28. Success Metrics

## Product Usage

* Audits created per workspace.
* Audits completed per month.
* Audit templates used.
* Inputs added per audit.
* Integration usage.
* Audit-grounded chat usage.
* Returning audit viewers.
* Audit revisions created.

## Audit Quality

* Percentage of findings with evidence references.
* Percentage of audits passing quality review.
* User acceptance rate of findings.
* User rejection rate of findings.
* Findings converted into remediation tasks.
* Findings resolved.
* Unsupported claim rate.
* Numerical correction rate.
* Instruction compliance score.

## Business Impact

* Time saved per audit.
* Reduction in manual evidence review.
* Number of risks identified before external review.
* Number of recurring errors detected.
* Reduction in audit preparation time.
* Client retention for audit firms.
* Number of active entities per workspace.

---

# 29. MVP Scope

## P0: Required for Initial Release

* Multi-tenant workspaces.
* Internal company workspace type.
* Audit firm workspace type.
* Audit creation.
* Blank audits.
* Template-based audits.
* Instructions library.
* Audit-specific instructions.
* File uploads.
* Written inputs.
* Initial accounting integrations.
* GPT-based parsing and analysis.
* Structured generative interface.
* Evidence-linked findings.
* Audit detail page.
* Left input panel.
* Floating audit chat.
* AI Chat page.
* Audit history.
* Audit revisions.
* Ledger section.
* Budgets section.
* Cash section.
* Customers section.
* Suppliers section.
* Integrations section.
* At least 100 templates.
* PDF and DOCX export.
* Role-based permissions.
* Audit logs.

## P1: Shortly After Release

* Finding assignments.
* Management responses.
* Approval workflows.
* Client portals.
* Scheduled recurring audits.
* Continuous integration monitoring.
* Custom template builder.
* Custom output layouts.
* Organization branding.
* Audit comparison.
* Advanced database connectors.
* Secure share links.
* XLSX exports.
* Remediation tracking.

## P2: Expansion

* Continuous audit monitoring.
* Cross-audit trend analysis.
* Multi-year risk analysis.
* Benchmarking across entities.
* Industry template marketplace.
* Partner-built integrations.
* Private model deployment.
* Customer-hosted data environments.
* Automated management reporting.
* Audit committee workspace.
* Advanced workflow automation.

---

# 30. MVP Acceptance Criteria

The MVP is considered functionally complete when:

1. A user can create an organization workspace.
2. A user can create an audit from a blank state or template.
3. A user can select reusable instructions.
4. A user can add audit-specific instructions.
5. A user can upload files of multiple formats.
6. A user can provide written context.
7. A user can attach integration data.
8. The platform can parse and organize the inputs.
9. The GPT model can generate an evidence-linked audit.
10. The audit can include text, charts, tables, findings, and highlighted boxes.
11. The audit remains accessible after completion.
12. The audit detail page contains a left input panel.
13. The audit page contains a floating chat control.
14. The floating chat opens an audit-grounded AI conversation.
15. Users can ask follow-up questions using the audit’s inputs and outputs.
16. Users can create a new audit revision.
17. Completed audit revisions remain immutable.
18. Users can export an audit.
19. Users can access at least 100 audit templates.
20. Administrators can view a complete audit activity log.

---

# 31. Principal Product Risks

## Model Hallucinations

Mitigation:

* Mandatory evidence references.
* Explicit uncertainty labels.
* Model quality-review pass.
* Source preview.
* User approval workflows.
* Clear professional-review disclaimer.

## Inconsistent Audits

Mitigation:

* Versioned templates.
* Versioned prompts.
* Structured output.
* Stored model versions.
* Controlled generation settings.
* Audit revision comparison.

## Incorrect Numerical Analysis

Mitigation:

* Model-invoked calculation tools.
* Structured datasets.
* Numerical validation.
* Evidence-linked computations.
* Separate numerical review pass.

## Extremely Large Inputs

Mitigation:

* Incremental parsing.
* Hierarchical summarization.
* Dataset indexing.
* Model tool calls.
* Input prioritization.
* Progressive audit generation.

## Conflicting Instructions

Mitigation:

* Instruction priority hierarchy.
* Conflict detection.
* User-visible conflict resolution.
* Immutable instruction snapshot.

## Overreliance on AI Conclusions

Mitigation:

* Clearly separate findings, hypotheses, and missing evidence.
* Require reviewer approval.
* Avoid definitive legal or regulatory statements.
* Preserve all supporting evidence.
* Make model limitations visible.

---

# 32. Final Product Definition

The AI Accounting Audit Platform is a persistent financial investigation environment where organizations define how audits should be conducted, supply any available financial evidence, and use GPT models to generate comprehensive, interactive, evidence-linked audits.

The product’s differentiation is not simply that it generates financial reports. Its differentiation is that it combines:

* Reusable audit instructions.
* More than 100 specialized templates.
* Universal financial data ingestion.
* Model-driven audit reasoning.
* Generative user interfaces.
* Persistent audit workspaces.
* Evidence-linked findings.
* Audit-grounded conversational investigation.
* Internal company workflows.
* Audit firm client workflows.

The platform should feel less like a reporting dashboard and more like an AI financial audit team working inside a structured, traceable, and reviewable workspace.



--- important: 


 The platform should **not become an accounting system, ERP, ledger viewer, or financial data warehouse**.

My previous PRD drifted too far by describing persistent ledger accounts, customer records, supplier records, bank accounts, and budgets at the workspace level. That would turn the product into an accounting management platform, which is not what you want.

## Correct product model

The only primary objects stored and managed by the platform are:

* Audits
* Audit templates
* Audit instructions
* Audit inputs
* Audit outputs
* Audit conversations
* Audit findings and revisions

All accounting data exists **inside the audit that it was provided for**.

For example, when a user uploads a general ledger spreadsheet:

* It is attached to Audit A.
* It is parsed for Audit A.
* Its resulting tables, evidence, and findings belong to Audit A.
* It does not create a global ledger inside the platform.
* It does not appear as reusable accounting data across the workspace unless the user explicitly adds it to another audit.

## Revised navigation

### AI Chat

A list of AI conversations.

Subitems:

* New chat
* All conversations
* Audit-linked conversations
* Pinned conversations
* Archived conversations

A chat may be blank, or grounded in one or more selected audits.

### Ledger

A library of audits categorized as ledger audits.

Subitems:

* All ledger audits
* General ledger audits
* Journal entry audits
* Trial balance audits
* Account classification audits
* Period-end audits
* Intercompany audits
* Suspense account audits
* Ledger reconciliation audits
* Ledger audit templates
* Create ledger audit

There is no persistent global ledger page. Opening an audit shows the ledger files and data attached to that specific audit.

### Budgets

A library of budget-related audits.

Subitems:

* All budget audits
* Budget variance audits
* Forecast accuracy audits
* Department budget audits
* Capital budget audits
* Cash budget audits
* Budget assumption audits
* Budget approval audits
* Budget audit templates
* Create budget audit

There is no platform-wide budget database.

### Cash

A library of cash-related audits.

Subitems:

* All cash audits
* Bank reconciliation audits
* Cash-flow audits
* Liquidity audits
* Payment audits
* Receipt audits
* Petty-cash audits
* Treasury audits
* Cash audit templates
* Create cash audit

Bank statements and cash records remain inside each audit.

### Customers

A library of customer and receivables audits.

Subitems:

* All customer audits
* Accounts receivable audits
* Revenue audits
* Customer aging audits
* Customer credit audits
* Revenue recognition audits
* Refund audits
* Credit-note audits
* Customer audit templates
* Create customer audit

There is no customer CRM or global customer master.

### Suppliers

A library of supplier, purchasing, and payables audits.

Subitems:

* All supplier audits
* Accounts payable audits
* Procurement audits
* Duplicate invoice audits
* Duplicate payment audits
* Supplier master audits
* Purchase-order audits
* Three-way matching audits
* Supplier audit templates
* Create supplier audit

There is no supplier management module.

### Integrations

A connection-management page used only to bring data into audits.

Subitems:

* Available integrations
* Connected integrations
* Connection credentials
* Import history
* Connection activity
* Failed imports
* Integration permissions
* Add integration

An integration does not automatically create a permanent accounting dataset in the product.

The user should select:

1. An integration.
2. The organization or account.
3. The records and date range.
4. The audit receiving the data.
5. Whether the import is a one-time snapshot or refreshed for that audit.

## Audit-centric data structure

Each audit contains its own isolated workspace:

### Instructions

* Template instructions
* Selected saved instructions
* Audit-specific instructions
* Instruction versions
* Instruction conflicts

### Inputs

* Uploaded files
* Written context
* Integration imports
* Supporting documents
* Parsed tables
* Extracted transactions
* Input status
* Input warnings
* Data date range
* Input versions

### Outputs

* Audit summary
* Findings
* Risks
* Errors
* Charts
* Tables
* Highlight boxes
* Recommendations
* Evidence references
* Missing-data notices
* Follow-up questions

### Conversations

* Audit-grounded AI chat
* Finding discussions
* Additional analysis
* User challenges
* Generated follow-ups
* New audit revision requests

### History

* Original audit
* Added inputs
* Regenerations
* Audit revisions
* Reviewer changes
* Exports
* Approvals

## How pages should behave

Each domain page should effectively be a filtered audit dashboard.

For example, the Ledger page may show:

| Audit                  | Template             | Company   | Period    | Findings | Risk   | Status        |
| ---------------------- | -------------------- | --------- | --------- | -------: | ------ | ------------- |
| Q2 Ledger Review       | General Ledger Audit | Company A | Q2 2026   |       14 | High   | Completed     |
| Closing Entries Review | Period-End Audit     | Company A | June 2026 |        6 | Medium | Review needed |

The page may also show domain-relevant summary information derived from those audits, such as:

* Total ledger audits
* Open findings
* High-risk audits
* Audits awaiting review
* Recently completed audits

But it should not show or manage live ledger transactions outside an audit.

## Important integration behavior

I would avoid continuous global syncing in the first version. It creates unnecessary data retention, security, and consistency problems.

The cleaner model is:

* Connections are reusable.
* Imports are audit-specific.
* Each audit stores an immutable snapshot of the imported data.
* A user can refresh the data only by creating or updating an audit revision.
* Previous audit results continue referencing the exact data snapshot used at the time.

This is critical because an audit must remain reproducible. If connected source data changes later, the historical audit cannot silently change with it.

## Revised positioning

The product is:

> An AI audit workspace that organizes audits by financial domain.

It is not:

> A financial operations platform that also performs audits.

The PRD should be rewritten around this audit-first architecture, removing all global operational accounting views and replacing them with categorized audit libraries and audit-specific data workspaces.
