# TCO_ANALYSIS.md (Phase 8.17)

Pricing verified July–August 2026 against official/vendor pages and cross-checked aggregator reviews (sources: supabase.com/pricing; costbench/toolradar/jetadmin Supabase guides; neon.com pricing docs + vela/budgetforge Neon breakdowns; hetzner.com + deployhandbook/vpsfor.dev Hetzner tables; crunchydata.com "from $10/month"). Anything not verifiable marked NOT VERIFIED. USD; ₹ conversions omitted deliberately (FX volatility) — mental rule of thumb ≈ ×83–88.

Workload basis: WORKLOAD_AND_SCALE SMALL profile («1 GB DB over 5 years, trivial egress, ≤100 workers).

## Infrastructure cost per option

### LOW usage (dev + first months)
| Option | Monthly | Composition |
| ------ | ------- | ----------- |
| A Supabase Free (dev/staging) | **$0** | 2 projects, 500 MB DB, pauses after 7d inactivity — acceptable for non-prod |
| B Self-host VPS (Hetzner CX22-class) | ~$5 +20% backups ≈ **$6** | 2 vCPU/4 GB/40 GB |
| C1 Neon Free | $0 | 100 CU-hrs, 0.5 GB, 6h restore window |
| C2 Crunchy Bridge smallest | ~$10 | managed PG |
| D SQLite (inside free app host) | $0 | file |

### EXPECTED production usage
| Option | Monthly infra | Notes |
| ------ | ------------- | ----- |
| A Supabase Pro | **$25** (incl. $10 Micro compute credit) | always-on, daily backups×7d, 8 GB DB, 250 GB egress — every quota ≫ need |
| A+ if PITR desired | +add-on (price tier NOT VERIFIED this pass — check console at enablement) | only if owner sets RPO<24h |
| B Self-host | ~$6 infra + monitoring/storage extras (~$1–3) | plus YOUR hours ↓ |
| C1 Neon Launch always-on micro | ≈ $0.106×730 ≈ **$8** + storage ≈ $0.35/GB ≈ negligible → ~$8–10 | scale-to-zero irrelevant (always-on payroll) |
| C2 Crunchy Bridge | $10–20 typical small instance | |
| D SQLite | $0 | host-dependent; no managed recovery exists at any price |

### HIGHER growth (×10 workforce — hypothetical)
All options remain < $60/mo infra (Supabase Small compute $15 add-on; Neon CU bump; bigger VPS CX32 $7.59). Database cost never becomes the constraint; application tier dominates.

## Operational cost (the honest differentiator)

| Obligation | A Supabase | B Self-host | C Managed-PG-only | D SQLite |
| ---------- | ---------- | ----------- | ------------------ | -------- |
| Engine patching/upgrade | provider | YOU monthly | provider | manual lib bumps |
| Backup config + offsite + rotation | provider (L1) + optional L3 | YOU build all | provider | YOU script |
| Restore drills | runbook + quarterly evidence (≈1 h/qtr) | build tooling then drill (≈4 h/qtr realistically) | drill only (≈1 h/qtr) | DIY everything |
| Monitoring/alerting | included dashboards | assemble (uptime, disk, slow-log) | basic included | app-level only |
| Security patching/TLS | provider | YOU (OS+PG+certs) | provider | n/a server-side |
| Incident response @ odd hours | provider first line | YOU | provider first line | YOU |
| Est. operator hours/month | **≤1 h** (drills/reviews) | 3–6 h steady-state | ≤1 h | grows with risk events |

At even a conservative $25–50/h valuation of founder/operator time, Option B's 3–6 h/month erases its $19/mo infra advantage and then some — before counting the asymmetric downside of an unmonitored failed backup on a payroll system of record.

## Annual TCO summary (EXPECTED tier)

| Option | Infra/yr | Ops burden | Risk-adjusted verdict |
| ------ | -------- | ---------- | --------------------- |
| **A Supabase Pro** | **$300** (+optional PITR add-on) | lowest | **SELECTED — best capability-per-dollar at this scale** |
| B Self-hosted | ~$80 | highest; hidden-cost class documented by community reports | inferior TCO once time priced |
| C1/C2 managed PG-only | $96–240 | low | close second; loses on auth-integration labor, wins nothing required |
| D SQLite | $0 | deceptively low until recovery event | rejected on requirements regardless of cost |

## Cost-guardrail commitments

Enable Pro spend-cap (default-on) so overages block instead of bill · egress profile makes the $0.09/GB tier unreachable · MAU count (≤~110 humans) nowhere near 100k included · storage « quotas. Re-check official pricing quarterly during ops review; re-open decision only on structural change (multi-workshop, compliance needs, provider pivot).
