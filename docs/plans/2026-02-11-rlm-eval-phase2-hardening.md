# RLM Diplomacy Eval - Phase 2 Hardening Backlog

## Scope
This is the follow-up checklist for objective, long-run RLM Diplomacy model evaluation. These items are pre-registered as Phase 2 requirements before score publication or model promotion decisions.

## Phase 2 Requirements
- [ ] Pre-register the exact metric formula and weights before running evals.
- [ ] Add anti-gaming guards so models cannot farm score via stalling, chat spam, or draw-loop behavior.
- [ ] Separate dev seeds and locked holdout seeds to prevent benchmark overfitting.
- [ ] Enforce strict power and position balancing per model across the full run set.
- [ ] Include uncertainty reporting (confidence intervals or error bars), not only point scores.
- [ ] Define minimum sample size before declaring one model better.
- [ ] Version-lock runtime, prompt, and tooling so score changes are model-driven, not infra drift.
- [ ] Add hard reliability penalties (timeouts, defaults, malformed orders, empty orders).
- [ ] Track efficiency too (quality per token, dollar cost, and latency), not only raw strength.
- [ ] Keep full audit logs and deterministic replay metadata for every scored run.
- [ ] Define promotion criteria upfront, including what score delta is practically meaningful.

## API Extension Notes
Current `/api/agents/elo` now returns both:
- legacy fields (`system`, `base`, `kFactor`, `ratings`) for existing consumers
- a modular `bundle` payload with:
  - `schemaVersion`
  - `request` (requested systems and filters)
  - `systems[]` (versioned scoring outputs)
  - per-system `parameters`, `sample`, and `filters`
  - `capabilities.phase2ReadyFor` for planned expansion contracts

This keeps today’s ELO endpoint stable while allowing future systems and guard-aware scoring components to be added without breaking the route contract.
