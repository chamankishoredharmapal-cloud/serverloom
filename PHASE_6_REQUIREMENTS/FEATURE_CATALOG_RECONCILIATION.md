# FEATURE_CATALOG_RECONCILIATION.md (Phase 6.1)

Independent second-pass audit of `01_FEATURE_CATALOG.md` against the full evidence base: all 30 application routes (`accounts/urls.py`), root health route, `/admin/` mount, complete template form/button inventory (22 form/action sites across 13 templates), service layer, management commands, models/model-methods, signals (none), middleware (all stock), scheduler artifacts (none), and prior phase reports (Phase 1–5).

## 1. Route-to-Feature Map (complete — no orphans)

| Route(s) | Feature | Notes |
| -------- | ------- | ----- |
| signup/ | F-01 | |
| login/, logout/, accounts/login/ alias | F-02/F-03 | alias = implementation redundancy, not a capability |
| employee/dashboard/ | F-06 | |
| employee/saree-count/ | F-07 | |
| employee/pagdi/ | F-08 (+inert self-finish branch C-01) | |
| employee/warp/ | F-09 | |
| employee/history/ | F-10 | |
| employee/salary-history/ | F-11 | |
| panel/, panel/dashboard/ | F-12 | alias view = same capability |
| panel/employees/ | F-13 | includes search UI |
| panel/employees/<id>/ | F-14 (+C-02 inert approve branch, add_saree/delete_saree/save_salary entry points of F-05/F-15/F-16) | |
| panel/employees/<id>/approve/ | F-04 | dedicated endpoint; GET→400 verified |
| panel/pagdi/, /create/ | F-18/F-17 | |
| panel/warp/, /create/, /<id>/finish/ | F-19/F-20 | |
| panel/weekly-salary/ | F-21 | |
| panel/give-advance/, clear-advance/ | F-22/F-23 | |
| panel/mark-paid/, mark-unpaid/ | F-24/F-25 | |
| panel/salary-slip/ | F-26 | |
| panel/salary-history/ | F-29 | |
| panel/saree-entry/ | F-15 primary entry | detail-page add_saree = alternate entry point (MERGED) |
| panel/download-history/ | F-27 | |
| panel/download-global-weekly-salary/ | F-28 | |
| / (root) | F-35 | reclassified TECHNICAL/NFR — not a business feature |
| /admin/ | F-32/F-33 | super-admin CRUD + audit access |

## 2. Existing Features F-01…F-37 — Verdicts

**Confirmed accurate (no changes):** F-01, F-02, F-03, F-05, F-06, F-07, F-09, F-10, F-11, F-12, F-13, F-14, F-16, F-17, F-18, F-19, F-20, F-21, F-22, F-23, F-24, F-25, F-26, F-27, F-28, F-29, F-30, F-32, F-33.

**UPDATED:**
- **F-31** — added missing `--dry-run` sub-capability (rollback-sentinel pattern, same as archive command; independently grep-verified in command source).
- **F-04** — documented inert alternate entry point: detail-page `action=approve` handler exists but NO template posts it (superseded by dedicated POST endpoint).
- **F-08** — explicitly classified the embedded employee self-finish POST branch as OBSERVED INERT CAPABILITY (no button anywhere; Phase 2 #10 BACKEND_ONLY finding still true post-stabilization).

**RECLASSIFIED:**
- **F-34** (notification recipient registry) → **UNKNOWN / INERT**: entity exists, nothing sends anything; business intent undocumented.
- **F-35** (health endpoint) → **OBSERVED TECHNICAL CAPABILITY** (moved to NFR observability; not a business feature).
- **F-37** (absence of pagination) → **OBSERVED LIMITATION** (not a feature; carried as NFR scale note + Open Question).

## 3. Candidate Features from Independent Sweep

| Candidate | Discovered via | Verdict | Reason |
| --------- | -------------- | ------- | ------ |
| C-01 Employee self-finish pagdi (POST branch, views.py:171-174) | route/UI trace | MERGE into F-08 as inert sub-capability | No UI trigger exists anywhere (template grep confirms); unreachable by users |
| C-02 Detail-page approve action (views.py:342-346) | code trace | REJECT as standalone; record under F-04 | No template posts `action=approve`; superseded by F-04 endpoint |
| C-03 carry_advance --dry-run | command source | ADD to F-31 | Real operator capability, previously unstated |
| C-04 Duplicate login route & dashboard alias | urls.py | REJECT | Implementation redundancy |
| C-05 Model methods made_sarees/remaining_sarees/is_active/salary_earned | models.py | REJECT as features → CALCULATION domain | Calculation infrastructure, not user capability |
| C-06 templatetags arithmetic filters | core/templatetags | REJECT | Presentation-layer implementation detail |
| C-07 Session key `employee_id` write at login | views.py:82,87 | REJECT | Legacy implementation detail (no remaining consumers trust it) |

No genuine missing business feature found. The application's entire capability surface is covered by F-01…F-37.

## 4. Duplication / Boundary Audit

- Production entry has TWO UI entry points (global form F-15; detail-page add_saree) → ONE business feature, two entry points (recorded in Entry-Point Map).
- Approval has TWO code paths (dedicated endpoint F-04 active; detail-action branch inert) → ONE feature.
- Salary domain intentionally split into distinct capabilities (grid review, give/clear advance, paid/unpaid, archive, ledger, exports) — boundaries are correct at business level; NOT merged.
- Advance give vs clear vs carry: three distinct capabilities (interactive ×2, batch command ×1) — correctly separate.

## 5. Inert / Partial Capabilities Register

| Item | Type | Evidence |
| ---- | ---- | -------- |
| Employee pagdi self-finish branch | INERT | views.py:171-174; zero template posters |
| Detail-page approve branch | INERT | views.py:342-346; zero template posters |
| AlertEmail registry | INERT/UNKNOWN purpose | model exists; no sender anywhere |
| Profile-picture media path | INERT (super-admin only) | settings configured; no app upload surface |
| WarpChangeHistory super-admin visibility | PARTIAL GAP | model audited but unregistered in admin.py |

## 6. Bugs vs Requirements (feature-relevant separation)

All former BUG-01…BUG-24 items remain OUTSIDE the requirement set except where their FIX defined new required behavior (graceful input rejection FR-014, POST-only approval FR-004, rate UI FR-005, payment-state/archive authority split FR-023/FR-028, single-active material invariant FR-016/FR-019, audit survival DATA requirements). BUG-23 cosmetic debt and the inert branches above are explicitly excluded from requirements.

## 7. Totals (post-reconciliation)

| Category | Count | Items |
| -------- | ----- | ----- |
| Total feature entries | **37** | F-01…F-37 |
| Verified requirements | **31** | F-01…F-31 |
| Observed behaviors/optional | **1** | F-32 |
| Partial (capability without adequate surface) | **1** | F-33 |
| Inert | **2** | F-36 (+C-01/C-02 folded) |
| Unknown | **1** | F-34 |
| Reclassified non-feature (technical/limitation) | **2** | F-35, F-37 |
| Open bugs inside catalog | **0** | (historical bugs tracked separately; fixes absorbed as requirements) |
| New standalone features discovered | **0** | candidates merged/rejected per §3 |
| Merged entry-point duplicates | **3** | production-entry ×2, approval ×2, dashboard alias |
| Removed/reclassified | **3** | F-34/F-35/F-37 |

## 8. Priority Tiers (business importance)

- **CORE:** F-01, F-02, F-15, F-17, F-19, F-21, F-22, F-23, F-24, F-28(ledger semantics), F-30 (the money/material spine)
- **IMPORTANT:** F-03, F-04, F-05, F-06, F-07, F-08, F-09, F-10, F-11, F-14, F-16, F-18, F-20, F-25, F-26, F-27, F-29, F-31
- **SUPPORTING:** F-12, F-13, F-32, F-33
- **OPTIONAL:** none beyond above
- **INERT/OBSERVED ONLY:** F-34, F-35, F-36, F-37

## 9. Feature Dependency Graph

```text
Identity chain:
Signup(F-01) → Approval(F-04) → Login(F-02)/Logout(F-03) → [role gate]

Production spine:
Approved Worker(F-04) → Rate set(F-05) → Production entry(F-15/F-16)
    → Weekly grid(F-21) → Advances(F-22/F-23) → Paid flags(F-24/F-25)
    → Archive(F-30) → Ledger(F-29/F-11) → Exports(F-26/F-27/F-28)

Materials spine:
Worker → Pagdi assign(F-17) → progress lists(F-18/F-08)
Worker → Warp assign(F-19) → explicit finish(F-20) → lists(F-09)

Ops spine:
Carry command(F-31) operates on advance balances (depends on F-22 history)
```

Archive (F-30) depends on production entries + advances; ledger consumers (exports, salary histories) depend on archive; payment flags interleave but never alter quantities (pinned rule BR-014/BR-015).
