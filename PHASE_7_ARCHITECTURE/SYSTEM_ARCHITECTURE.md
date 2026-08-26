# SYSTEM_ARCHITECTURE.md (Phase 7.4 — TARGET)

## 1. System context

```text
[Worker (mobile browser)]   [Staff/Admin (desktop browser)]   [Operator (CLI/cron)]
        │                          │                                │
        └──────────────► MANAGEMENT-V1 WEB APP ◄───────────────────┘
                              │
              ┌───────────────┼─────────────────┐
              ▼               ▼                 ▼
        Auth provider    Postgres DB       Object storage
        (sessions/       (domain data,     (exports/PDF artifacts,
         identities)      RLS, RPCs)        optional)
```

## 2. Technology posture (pending repo confirmation)

Primary option (recommended in ADR-001): **Next.js (App Router) + TypeScript + Supabase (Postgres, Auth, RLS) + Vercel**, matching the stack vocabulary the integration program assumes for Management-V1. Logical architecture below is stack-agnostic; named technologies appear as the primary option and are revisited in TECHNOLOGY_DECISIONS.md. Nothing is installed or changed in this phase.

## 3. Logical architecture

```text
UI LAYER            React Server/Client Components; pages render service outputs;
                    zero business arithmetic (display formatting only)
  │ fetch (typed)
API/ACTION LAYER    route handlers / server actions = thin controllers:
                    authenticate → authorize → validate (Zod) → call ONE domain service → map errors
  │
DOMAIN SERVICES     AuthService · WorkerService · ProductionService · PayrollService ·
(sole rule owners)  AdvanceService · MaterialService · SettlementService · ArchiveService ·
                    AuditService · ReportService/ExportService (+ PricingStrategy)
  │ shared pure core
DOMAIN CORE         lib/domain: week.ts (CALC-001), money.ts (integer policy), types,
                    result/error taxonomy (ValidationError | AuthzError | DuplicateError | NotFound)
  │
DATA ACCESS         typed query layer + SQL RPCs for transactional multi-table mutations
  │
DATABASE            Postgres: domain tables, CHECKs, UNIQUEs, partial unique index,
                    row-level security, append-only audit tables, views for reports
SIDE CHANNELS       cron/scheduled invocation → ArchiveService.runWeek(today) [D-06]
                    operator console → guarded ops endpoints (carry/archive w/ D-04 guard)
```

## 4. Runtime request flows (canonical traces)

Read: Browser → page → PayrollService.weekGrid(worker set) → CALC-001 bounds → SELECT aggregates → computeWeek per worker → precomputed rows → render.
Write (settlement): Button → action → middleware authz(role=staff) → Zod parse → SettlementService.markPaid → tx: upsert ledger row (create-path defaults OR payment-columns update) → AuditService.emit('PAYMENT_FLIP') → commit → flash result.
Batch (archive): Cron/manual trigger → ops authz (service-role secret, never client) → ArchiveService.freezeWeek(date?) → single tx over roster → upsert-or-refresh quantity columns ONLY → run-record row → {created,refreshed} report.

## 5. Boundaries

- Frontend↔backend boundary: network calls only; no DB access from client except through RLS-scoped policies for pure-self reads where used — all cross-worker/admin operations via server layer with service credentials.
- Domain boundary list = ownership table domains (FEATURE_OWNERSHIP_MAP.md).
- Database boundary: Postgres owns INVARIANTS (uniques, CHECKs, partial unique index, FK behavior); services own WORKFLOWS and calculations.
- External services: storage bucket for generated exports (optional), email provider ONLY if notifications ever decided (D-09).
- Background-job boundary: archive cadence (D-06) + carry NEVER auto-scheduled unless once-per-period guard exists (D-04).
- Audit boundary: every mutating service call emits inside the same transaction; audit tables UPDATE/DELETE-denied.
- Reporting boundary: reads only via dedicated views; pricing strategy isolated.

## 6. Key architectural decisions (rationale digest — full ADRs in ARCHITECTURE_DECISION_RECORD.md)

1. Single calculation sources with coordinated SQL executors (kills R-06 duplication class).
2. Column-group authority enforced by ownership + column-list updates + RLS (quantity vs payment split BR-014/015 survives any implementation).
3. Partial unique index for one-ACTIVE-material invariant (DB-enforced, race-proof by construction — supersedes external app-lock approach).
4. Ledger row keyed unique(worker,week) with UPSERT freeze → structural idempotency (BR-018).
5. Append-only audit tables + survival design (SET NULL + name snapshot equivalent) per DATA63-008.
6. Status enum on profiles (extensible beyond boolean approval — D-01 ready) with default preserving PENDING semantics.
7. Exact integer/decimal carry math (rejects float artifact class while preserving truncation-toward-zero contract on non-negative domain).
8. Soft-delete option for production rows deferred to D-02; schema reserves deleted_at/deletion_reason columns to make either choice non-breaking.

## 7. Non-goals this phase
No code, migrations, or configuration changes. No Supabase project mutation. Multi-tenancy, caching layers, mobile apps: explicitly out of scope absent requirements.
