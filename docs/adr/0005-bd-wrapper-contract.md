# 5. Foolery wraps the `bd` CLI — contract & limitations

Date: 2026-05-31
Status: Accepted

## Context

Dogfooding iteration 2.1 surfaced status-update failures
(`unknown command "sync" for "bd"`) and an apparently-empty board. RCA showed
the architecture is already what we want — but it was coupled to a `bd` command
surface that drifted.

Findings:

- A `.beads` repo resolves to the **`cli`** backend (`BdCliBackend`), which
  shells the `bd` CLI for `list / get / create / update / delete / deps`. The
  jsonl-direct `BeadsBackend` is reachable only via the explicit
  `FOOLERY_BACKEND=beads` override — it is the **fallback**, not the live path.
- `bd update` accepts everything the product model needs: `--metadata` (a JSON
  string), `--add-label/--remove-label`, `--notes`, `--acceptance`, `--parent`,
  `--priority`. So **`bd` can hold `metadata.plan/status` and the `wf:state:*`
  labels** — nothing forces the jsonl approach.
- Installed `bd` is **v1.0.4**, which **removed `sync`** in favour of `import`
  (jsonl→DB) and `export` (DB→jsonl). Our code still called `bd sync` in three
  places (`beats-sync-runner`, `bd-internal` auto-heal, `bd-update`).

## Decision

**The API is a thin wrapper over the `bd` CLI; `bd`/Dolt is the source of
truth; `.beads/issues.jsonl` is `bd`'s git-tracked export.** We keep this model
(no rewrite to a second store) and make the wrapper resilient to `bd` version
drift:

1. **Capability-detect, don't assume.** Probe whether `bd sync` exists; on
   `bd ≥ 1.0` use `bd import` (the import-only / auto-heal path) and
   `import` then `export` (the full `/api/sync/beats` reconcile). Keep the
   legacy `sync` path for older `bd`.
2. **Sync is best-effort.** A failed reconcile MUST NOT fail the user's write —
   the write already went through `bd update`; the DB↔jsonl reconcile is a
   follow-on, surfaced as a warning, never a 500.

## Consequences / known limitations

- **CLI-version coupling** is the load-bearing risk (this incident). Mitigated
  by capability detection + best-effort + pinning a tested `bd` range.
- **`bd create` is lint-gated**: it refuses without a `project:<name>` label
  (`bd-lint: refused`). Every create path must attach a `project:*` label (or
  pass `--no-lint`). The add-task form gains a Project picker (iteration 2.2).
- **The jsonl (git export) lags the DB** until `bd export` runs — so the
  git-tracked `issues.jsonl` is only current right after a reconcile.
- **Per-request `bd` process spawn** is the cost of wrapping a CLI; acceptable
  at this scale.
- **Two backends exist** (`cli` canonical, `beads`/jsonl fallback). `cli` is the
  documented live path; the jsonl backend stays for tests / the explicit
  override only.
