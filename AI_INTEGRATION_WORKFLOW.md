# EXTERNAL APPLICATION → MANAGEMENT-V1 INTEGRATION
# CONTINUOUS AI WORKFLOW & PHASE CONTROL DOCUMENT

## Document Purpose

This document is the permanent operating guide for any AI agent working on the downloaded external application and its eventual integration with Management-V1.

The objective is:

> **First understand the external application completely. Then prove that it works correctly. Then determine how Management-V1 should be integrated into it. Then implement the integration safely and verify the result.**

This document exists to prevent:
- wrong assumptions
- premature implementation
- repeated repository analysis
- loss of context between AI sessions
- confusing the external application's business with Management-V1
- copying features without understanding their behavior
- fixing things before understanding them
- changing architecture unnecessarily
- declaring a feature working based only on UI/code presence
- breaking working external functionality during integration

---

# 0. MASTER OBJECTIVE

The external application is the **base application**.

Management-V1 is the **system whose features will eventually be integrated into the external application**.

These are NOT currently assumed to be the same type of application.

Do not force Management-V1's architecture, terminology, workflows, database model, or assumptions onto the external application before understanding both systems.

The final goal is:

```text
EXTERNAL APPLICATION
        │
        │ Understand completely
        ▼
Verified External Application
        │
        │ Determine integration boundaries
        ▼
Integration Architecture
        │
        │ Add Management-V1 capabilities
        ▼
Integrated Application
        │
        │ Regression + security + business verification
        ▼
Production-Ready Integrated System
```

---

# 1. CURRENT PROJECT STATE

The external repository has already been downloaded and opened in VS Code.

OpenCode / OX Alpha is being used as the primary local AI coding/reasoning agent.

The analysis must be performed against the actual repository.

Do not rely only on README files or assumptions.

---

# 2. NON-NEGOTIABLE AI OPERATING RULES

These rules apply to EVERY phase.

## Rule 1 — Understand before changing

Never modify code merely because something looks unusual.

First determine:
- what it does
- why it exists
- what depends on it
- whether it is intentional
- whether changing it could break another workflow

---

## Rule 2 — Evidence over assumption

Every important claim must be based on:
- source code
- database schema/migrations
- tests
- configuration
- runtime behavior
- browser behavior
- logs
- documentation

Classify uncertainty explicitly.

Use:

- `CONFIRMED`
- `LIKELY`
- `INFERRED`
- `UNCLEAR`
- `NOT FOUND`

Never silently convert inference into fact.

---

## Rule 3 — UI does not prove functionality

A button, route, form, template, model, or menu item does NOT prove a feature works.

A feature should be considered verified only after tracing or testing:

```text
UI
 ↓
Route
 ↓
Logic
 ↓
Backend/service
 ↓
Database
 ↓
Result
```

Where possible, runtime-test the actual workflow.

---

## Rule 4 — Backend does not prove user accessibility

A function may exist without a UI.

A model may exist without a consumer.

A route may exist without a working template.

A template may exist without a route.

Always distinguish:
- implemented
- reachable
- usable
- working
- tested

---

## Rule 5 — Do not redesign during investigation

Until the integration-design phase:
- do not refactor
- do not modernize
- do not replace frameworks
- do not migrate databases
- do not rewrite modules
- do not "clean up" unrelated code

---

## Rule 6 — Preserve the external application's existing behavior

The external application is the base system.

Existing working functionality should be treated as valuable until proven otherwise.

Any later modification must consider:
- regression
- data compatibility
- permissions
- workflows
- transactions
- historical data
- deployment

---

## Rule 7 — Do not implement Management-V1 prematurely

Do not add Management-V1 features during reconnaissance, discovery, business analysis, or QA.

First establish:

> "What does the external application currently do, and does it actually work?"

Only then design integration.

---

## Rule 8 — Do not repeat completed phases unnecessarily

Read the existing phase reports.

Use targeted repository inspection.

Do not reread the entire repository simply because a new session started.

---

## Rule 9 — Reports are persistent project memory

Every completed phase must produce a Markdown report.

The report is part of the project state.

Future AI agents must read previous phase reports before starting a new phase.

---

## Rule 10 — Keep terminal responses concise

The detailed analysis belongs in Markdown files.

The final terminal response should contain:
- phase status
- report filename
- important blockers if any
- next phase status

Do not waste context explaining the entire report in chat.

---

# 3. PHASE PIPELINE

The approved workflow is:

```text
PHASE 1
Repository Reconnaissance
        ↓
PHASE 2
Feature Discovery
        ↓
PHASE 3
Business Workflow & Logic Reconstruction
        ↓
PHASE 4
Application Verification / QA Audit
        ↓
PHASE 5
Architecture & Integration Readiness
        ↓
PHASE 6
Management-V1 Integration Design
        ↓
PHASE 7
Implementation
        ↓
PHASE 8
Full Regression / Acceptance Verification
        ↓
FINAL INTEGRATED APPLICATION
```

Do not skip phases unless the project owner explicitly changes this plan.

---

# PHASE 1 — REPOSITORY RECONNAISSANCE

## Objective

Understand the technical structure of the external application.

Question:

> "What is this repository made of, and how is it architecturally organized?"

## Inspect

- README
- package/dependency files
- directory structure
- configuration
- entry points
- routes
- database/migrations
- models
- backend/server/edge functions
- major components/templates
- services
- hooks
- types
- authentication
- authorization
- tests
- deployment

## Produce

`PHASE_1_REPOSITORY_RECONNAISSANCE.md`

## Required output

- Executive summary
- Repository structure
- Technology stack
- Application entry flow
- Route map
- Module map
- Component architecture
- Hook/state architecture
- Business logic locations
- Database architecture
- Authentication
- Authorization
- Backend/edge functions
- External integrations
- Data flows
- Testing
- Deployment
- Consolidated system map
- Uncertainties

## Phase 1 question

> "How is the application built?"

## Completion condition

A developer unfamiliar with the repository should be able to understand its major technical architecture without reading the entire source tree.

---

# PHASE 2 — FEATURE DISCOVERY

## Objective

Determine what the application can actually do.

Question:

> "What features really exist, and can each feature be traced from UI to persistence?"

## Core tracing rule

For each feature:

```text
USER ACTION
 ↓
UI
 ↓
ROUTE
 ↓
VIEW / CONTROLLER
 ↓
VALIDATION
 ↓
BUSINESS LOGIC
 ↓
SERVICE / API / RPC
 ↓
DATABASE
 ↓
SIDE EFFECTS
 ↓
RESULT
```

## Discover

- authentication
- user management
- CRUD
- production
- payroll
- assignments
- payments
- advances
- reporting
- exports
- history
- audit
- notifications
- search
- filters
- settings
- automation
- CLI operations
- admin-only capabilities
- employee/user capabilities

## Classify

Each feature:

- VERIFIED
- PARTIAL
- UI_ONLY
- BACKEND_ONLY
- DOCUMENTED_ONLY
- BROKEN
- UNCLEAR

## Produce

`PHASE_2_FEATURE_DISCOVERY.md`

## Required output

- Master feature inventory
- Deep feature traces
- User workflows
- State machines
- CRUD matrix
- Search/filter/history
- Reporting/export
- Authentication/user management
- Admin capabilities
- Normal user capabilities
- Audit system
- Transactions/concurrency
- Validation
- Notifications
- Files/media
- Automation
- Feature dependencies
- Dead/orphaned/partial functionality
- Evidence map
- Completeness summary

## Phase 2 question

> "What can the application actually do?"

---

# PHASE 3 — BUSINESS WORKFLOW & LOGIC RECONSTRUCTION

## Objective

Understand the real business rules behind the features.

Question:

> "How does the business process actually operate?"

## Analyze

- business domains
- end-to-end workflows
- business rules
- calculations
- entity lifecycles
- state transitions
- dependencies
- data ownership
- source of truth
- auditability
- transaction boundaries
- concurrency
- reversals/corrections
- time/date rules
- permissions
- failures/recovery
- operational model
- hidden assumptions
- duplicated business logic
- business/implementation gaps

## Rule classifications

- CONFIRMED BUSINESS RULE
- IMPLEMENTATION RULE
- INFERRED RULE
- UNCLEAR

## Produce

`PHASE_3_BUSINESS_LOGIC_RECONSTRUCTION.md`

## Required output

- Business domain map
- Major workflows
- Business rule inventory
- Formula/calculation inventory
- Entity lifecycles
- State transition analysis
- Rule dependencies
- Data ownership
- Source-of-truth analysis
- Audit model
- Transaction boundaries
- Concurrency analysis
- Reversal/correction logic
- Time/date rules
- Permission model
- Failure/recovery model
- Operational model
- Hidden assumptions
- Business logic duplication
- Business logic gaps
- Real-world workflow reconstruction
- Technical workflow reconstruction
- Business vs implementation gaps
- Business system map

## Phase 3 question

> "What business rules and operational processes are encoded in this software?"

---

# PHASE 4 — APPLICATION VERIFICATION / QA AUDIT

## STATUS

This is the NEXT required phase after this control document.

## Objective

Prove whether the external application actually works correctly.

Question:

> "If this application were given to the real business today, what works, what fails, what is unsafe, and what must be fixed before integration?"

This phase must go beyond static analysis.

Where possible, the AI must:
- run the application
- run existing tests
- inspect runtime logs
- use browser automation
- execute real workflows
- test invalid inputs
- test permissions
- test database behavior
- test concurrency-sensitive operations
- verify deployment/configuration where possible

## DO NOT MODIFY APPLICATION CODE DURING THE FIRST QA PASS

The first verification pass is observational.

Do not fix issues immediately.

Record them first.

If test data is required:
- use isolated/local test data
- do not destroy real production data
- do not reset a production database
- do not execute destructive commands against unknown environments

## Test categories

### A. Startup/build

Verify:
- dependency installation
- build
- application startup
- database connection
- static assets
- migrations
- environment variables

### B. Authentication

Test:
- signup
- duplicate signup
- login
- wrong password
- unapproved account
- approved account
- logout
- session expiry where testable
- direct protected-route access

### C. Authorization

Test:
- employee → admin routes
- employee → another employee data
- unauthenticated → protected route
- staff/non-staff boundaries
- direct URL access
- forged IDs
- object-level access

### D. Core business workflows

Run every major workflow identified in Phase 2/3.

For example:

```text
Onboarding
Production
Pagdi
Warp
Advance
Payroll
Payment
Archive
History
Reports
Exports
```

Only use the actual application's workflows.

### E. Happy paths

Verify normal successful behavior.

### F. Invalid input

Test:
- missing values
- invalid numbers
- negative numbers
- malformed IDs
- duplicate records
- invalid dates
- invalid states

### G. Boundary cases

Test:
- zero
- one
- maximum reasonable values
- empty histories
- first record
- no active assignment
- already completed record
- already paid
- already cleared
- beginning/end of week

### H. Repeatability

Test:
- clicking twice
- submitting twice
- retry after success
- retry after failure
- repeated commands

Determine whether operations are:
- idempotent
- duplicate-producing
- error-producing
- unsafe

### I. Concurrency

Where feasible, test:
- simultaneous advance updates
- simultaneous payment actions
- duplicate production entry
- assignment conflicts
- archive vs active updates

Use safe isolated data.

### J. Database integrity

Verify:
- constraints
- foreign keys
- uniqueness
- transactions
- rollback
- orphan records
- state consistency

### K. Audit/history

Verify:
- expected mutations create history
- actor is recorded
- timestamp is recorded
- before/after values are accurate
- audit mutation is transactional
- missing audit cases

### L. Reports/exports

Verify:
- PDF generation
- XLSX generation
- data correctness
- file integrity
- permissions
- historical/current data accuracy

### M. Navigation/UI

Test:
- links
- buttons
- forms
- redirects
- empty states
- errors
- 404s
- 500s
- mobile/basic responsive behavior where relevant

### N. Operations

Verify:
- management commands
- scheduled jobs
- archive
- carry-forward
- deployment scripts
- CI/CD
- production configuration

Distinguish:

```text
Implemented
vs
Configured
vs
Actually scheduled
vs
Actually verified
```

### O. Security

Audit and test:
- CSRF
- authentication
- authorization
- IDOR
- unsafe methods
- session handling
- secret exposure
- insecure direct object references
- dangerous file handling
- debug configuration
- production settings

Do not exploit beyond what is necessary for safe verification.

## Phase 4 severity

Classify findings:

### BLOCKER
Must be fixed before integration.

### CRITICAL
Major data loss/security/business correctness risk.

### HIGH
Serious functional or operational risk.

### MEDIUM
Meaningful defect but workaround exists.

### LOW
Minor defect.

### COSMETIC
Visual/non-business issue.

### VERIFIED
Tested and working.

### UNKNOWN
Could not be verified.

## Produce

`PHASE_4_APPLICATION_VERIFICATION.md`

## Required report

- Environment used
- Test setup
- Test data strategy
- Build/startup result
- Test summary
- Authentication results
- Authorization results
- Core workflow results
- Validation results
- Boundary results
- Repeatability results
- Concurrency results
- Database integrity results
- Audit results
- Reporting/export results
- UI/navigation results
- Operations results
- Security results
- Bugs
- Blockers
- Risk matrix
- Evidence
- Recommended fixes ONLY after evidence is recorded
- Final readiness verdict

## Phase 4 question

> "Does the external application actually work reliably enough to become the base for integration?"

## Phase 4 completion condition

Do NOT proceed to integration planning until the application has a clear readiness verdict.

Possible verdicts:

- `READY FOR INTEGRATION`
- `READY WITH REQUIRED FIXES`
- `NOT READY FOR INTEGRATION`
- `UNABLE TO VERIFY`

---

# PHASE 5 — ARCHITECTURE & INTEGRATION READINESS

## Objective

Only after QA determine whether the external application is structurally ready to accept Management-V1 capabilities.

Question:

> "Where can Management-V1 be integrated without destabilizing the existing application?"

## Analyze

- existing architecture boundaries
- domain boundaries
- database boundaries
- authentication compatibility
- authorization compatibility
- user/entity relationships
- routing
- frontend/UI architecture
- backend/service architecture
- transaction model
- audit model
- deployment model
- shared data
- naming collisions
- dependency conflicts
- migration strategy
- integration risks

## Important distinction

This is NOT yet implementation.

It is integration readiness analysis.

## Produce

`PHASE_5_INTEGRATION_READINESS.md`

## Required output

- Current architecture after QA
- Stable components
- Unstable components
- Integration boundaries
- Shared concepts
- Conflicting concepts
- Data mapping
- Authentication mapping
- Authorization mapping
- Database integration points
- UI integration points
- Backend integration points
- Migration risks
- Regression risks
- Technical debt relevant to integration
- Integration blockers
- Readiness verdict

---

# PHASE 6 — MANAGEMENT-V1 INTEGRATION DESIGN

## Objective

Design the actual integration.

Question:

> "How do we bring Management-V1 into the external application while preserving the external application's working business?"

## IMPORTANT

Management-V1 is NOT being copied blindly.

We must compare:

```text
External application's actual behavior
+
Management-V1's intended behavior
```

Then decide how the two systems should coexist.

## Analyze

- feature mapping
- workflow mapping
- entity mapping
- database mapping
- role mapping
- permission mapping
- route mapping
- UI placement
- service boundaries
- state transitions
- audit requirements
- migration requirements
- backward compatibility
- reporting impact

## Classification

Every Management-V1 capability should be:

- INTEGRATE AS-IS
- ADAPT
- MERGE
- REPLACE
- EXTEND
- KEEP SEPARATE
- DEFER
- REJECT

Do not choose based on convenience alone.

Base decisions on:
- business correctness
- user workflow
- data integrity
- architecture
- maintainability
- security
- regression risk

## Produce

`PHASE_6_MANAGEMENT_V1_INTEGRATION_DESIGN.md`

---

# PHASE 7 — IMPLEMENTATION

## Objective

Implement the approved integration design.

Only begin after:
- Phase 4 readiness is acceptable
- Phase 5 identifies integration boundaries
- Phase 6 is approved

## Implementation rules

1. Make small, traceable changes.
2. Preserve working external functionality.
3. Do not rewrite unrelated modules.
4. Use existing architecture where reasonable.
5. Introduce new architecture only when justified.
6. Maintain data integrity.
7. Maintain authorization.
8. Maintain auditability.
9. Add/modify tests for changed behavior.
10. Verify each increment before continuing.

## Workflow

```text
Design
 ↓
Database/migration
 ↓
Backend
 ↓
Business logic
 ↓
Authorization
 ↓
UI
 ↓
Tests
 ↓
Verification
 ↓
Next feature
```

Do not implement the entire integration blindly in one pass.

## Produce

Implementation progress documents as needed.

At minimum:

`PHASE_7_IMPLEMENTATION_STATUS.md`

---

# PHASE 8 — FULL REGRESSION / ACCEPTANCE VERIFICATION

## Objective

Prove that the integrated application works.

Question:

> "Did Management-V1 integration preserve the external application and produce the intended combined system?"

## Test

### External application regression

Every previously verified core workflow.

### New Management-V1 workflows

Every integrated capability.

### Integration workflows

Workflows crossing both systems.

### Security

All roles and boundaries again.

### Database

- migrations
- existing data
- new data
- relationships
- constraints
- rollback

### Concurrency

All critical mutations.

### Reports

Existing + new reporting.

### Deployment

Build + production verification.

## Critical rule

A feature is not considered complete merely because:
- code exists
- build passes
- tests pass

It must also satisfy the business workflow.

## Produce

`PHASE_8_FINAL_VERIFICATION.md`

Final verdict:

- `PRODUCTION READY`
- `READY WITH KNOWN LOW-RISK ISSUES`
- `NOT READY`

---

# 4. PHASE GATE SYSTEM

Every phase has a gate.

Do not silently continue.

```text
PHASE 1
   │
   ├── Complete? ── NO → continue Phase 1
   │
   YES
   ↓
PHASE 2
   │
   ├── Complete? ── NO → continue Phase 2
   │
   YES
   ↓
PHASE 3
   │
   ├── Complete? ── NO → continue Phase 3
   │
   YES
   ↓
PHASE 4 QA
   │
   ├── Not ready → FIX/REVERIFY before integration
   │
   └── Ready
        ↓
PHASE 5
        ↓
PHASE 6
        ↓
PHASE 7
        ↓
PHASE 8
```

---

# 5. REPORT CHAIN

These reports form the permanent project knowledge chain:

```text
PHASE_1_REPOSITORY_RECONNAISSANCE.md
        ↓
PHASE_2_FEATURE_DISCOVERY.md
        ↓
PHASE_3_BUSINESS_LOGIC_RECONSTRUCTION.md
        ↓
PHASE_4_APPLICATION_VERIFICATION.md
        ↓
PHASE_5_INTEGRATION_READINESS.md
        ↓
PHASE_6_MANAGEMENT_V1_INTEGRATION_DESIGN.md
        ↓
PHASE_7_IMPLEMENTATION_STATUS.md
        ↓
PHASE_8_FINAL_VERIFICATION.md
```

Before beginning a phase, read the relevant previous reports.

---

# 6. EVIDENCE STANDARD

For important findings, use:

```text
Evidence:
File:
Function/Class:
Route:
Model/Table:
Template/Component:
Test:
Runtime result:
```

For runtime findings additionally record:

```text
Environment:
Date:
Action:
Expected:
Actual:
Result:
```

Do not claim runtime verification if only static analysis was performed.

---

# 7. TEST DATA SAFETY

Never assume a database is disposable.

Before destructive testing determine:
- local vs staging vs production
- database target
- backup availability
- test account
- test employee/data

Never run destructive resets against an unknown environment.

Never delete real business data to prove a test.

---

# 8. BUG REPORT FORMAT

Every bug should use:

## BUG-[NUMBER] — [SHORT TITLE]

**Severity:** BLOCKER / CRITICAL / HIGH / MEDIUM / LOW / COSMETIC

**Status:** CONFIRMED / LIKELY / UNCLEAR

**Area:**

**Precondition:**

**Steps to reproduce:**

```text
1.
2.
3.
```

**Expected:**

**Actual:**

**Impact:**

**Evidence:**

**Likely cause:**

**Fix recommendation:**

During QA, recommendations must come AFTER reproduction/evidence.

---

# 9. DECISION STANDARD

Never make a major architectural decision from one observation.

Before changing a core subsystem:

```text
Observation
 ↓
Evidence
 ↓
Business impact
 ↓
Dependency analysis
 ↓
Risk analysis
 ↓
Decision
```

---

# 10. WHAT "WORKING PERFECTLY" MEANS

Do not interpret "perfectly" as "zero imperfections."

For this project, the external application should be considered ready when:

- critical workflows work
- business calculations are correct
- data remains consistent
- authorization works
- critical security boundaries hold
- important transactions are safe
- reports are correct
- operational jobs can actually execute
- known defects are understood
- integration blockers are resolved
- remaining issues are explicitly documented

Minor cosmetic defects do not automatically block integration.

Unknown critical behavior DOES.

---

# 11. CONTINUITY PROTOCOL FOR EVERY NEW AI SESSION

When a new AI agent/session starts:

## Step 1

Read this document:

`AI_INTEGRATION_WORKFLOW.md`

## Step 2

Determine the latest completed phase from the repository.

## Step 3

Read the latest phase report.

## Step 4

Do NOT repeat completed work.

## Step 5

Determine the next phase.

## Step 6

State internally:

```text
Current phase:
Previous phase:
Objective:
Allowed actions:
Forbidden actions:
Expected deliverable:
```

## Step 7

Work only within that phase.

---

# 12. CURRENT PROJECT STATUS

At the time this document was created:

```text
Phase 1 — COMPLETE
Phase 2 — COMPLETE
Phase 3 — COMPLETE
Phase 4 — NEXT
Phase 5 — NOT STARTED
Phase 6 — NOT STARTED
Phase 7 — NOT STARTED
Phase 8 — NOT STARTED
```

Existing reports:

```text
PHASE_1_REPOSITORY_RECONNAISSANCE.md
PHASE_2_FEATURE_DISCOVERY.md
PHASE_3_BUSINESS_LOGIC_RECONSTRUCTION.md
```

The next task is:

> **Phase 4 — Application Verification / QA Audit**

Do NOT start Management-V1 integration yet.

---

# 13. PHASE 4 IMMEDIATE INSTRUCTION

When beginning Phase 4:

1. Read this control document.
2. Read Phase 1 report.
3. Read Phase 2 report.
4. Read Phase 3 report.
5. Inspect available tests and runtime setup.
6. Determine the safest isolated test environment.
7. Start the application if possible.
8. Run existing automated tests.
9. Execute critical workflows manually/browser-automated where possible.
10. Record actual results.
11. Test failure/boundary/repeat/concurrency/security behavior.
12. Produce `PHASE_4_APPLICATION_VERIFICATION.md`.
13. Do NOT fix issues during the first verification pass unless explicitly authorized.
14. Give a final readiness verdict.
15. STOP.

---

# 14. FINAL PROJECT PRINCIPLE

The AI must always remember:

> **We are not trying to replace the external application.**

We are trying to:

1. Understand it.
2. Verify it.
3. Stabilize it.
4. Understand where Management-V1 fits.
5. Integrate Management-V1 carefully.
6. Preserve valuable existing functionality.
7. Produce one coherent, reliable application.

The correct mindset is:

```text
UNDERSTAND
    ↓
VERIFY
    ↓
STABILIZE
    ↓
DESIGN
    ↓
INTEGRATE
    ↓
TEST
    ↓
VERIFY AGAIN
```

Never:

```text
SEE FEATURE
 ↓
COPY FEATURE
 ↓
BREAK EXISTING SYSTEM
```

---

# END OF CONTROL DOCUMENT
