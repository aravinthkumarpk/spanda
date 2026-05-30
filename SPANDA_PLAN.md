# Spanda — Execution Plan

> Living design doc. Built one decision at a time via the design interview.
> Status: in progress. Last updated 2026-05-30.

## What Spanda is

A clean, generic kanban for managing work at three altitudes — **Project → Initiative → Task** — where **both agents and humans** operate on the same board. It sits on top of a memory-manager backend (Beads / Knots) through a single `BackendPort` interface. The product is generic: any team or solo operator can use it; nothing is hardcoded to one person's data.

```
ALTITUDE 3  STRATEGY    Projects      — how are my products doing? where do I invest?
ALTITUDE 2  TRIAGE      Today         — what matters now? turn it into real work
ALTITUDE 1  EXECUTION   Board         — an agent (or human) runs a task, review, ship
```

---

## Vocabulary (locked)

| Plain word | Was | What it is |
|---|---|---|
| **Project** | — | A thing you manage over time. The bird's-eye unit. |
| **Initiative** | Scene | One feature's worth of work — a group of tasks. |
| **Task** | Beat | A single unit of work. |
| **Batch** | Wave | The tasks in an initiative that can run at the same time. |
| **Run** | Take | Hand a task to an agent to execute. *(shipped)* |

Hierarchy: **Project → Initiative → Task**. A **Batch** is "the tasks in an initiative unblocked right now" — a scheduling detail, not a thing you create.

Navigation: **Projects · Today · Board · Review** (+ a "More" menu). Setlist → **Plan** (an initiative's inner view).

---

## Resolved decisions (design interview)

### Q1 — Canonical database
**The new system operates on the registered repo's beads DB** (the user's instance = `personal-os/.beads`, ~146 real tasks the daily already reads).
- The `spanda` repo's knots DB is the **test DB** — dev scaffolding for building Spanda itself, not where real work lives.
- Product stays multi-repo capable and generic; "canonical" just means: the registered work repo, whatever it is.

### Q2 — Data model: Project → Initiative → Task
**Native parent hierarchy**, not labels.
- Project = top parent bead; Initiative = sub-parent (epic-type); Task = leaf — via the native `parent` field + `parent_of` edges.
- Evidence: `Beat` has a native `parent?: string` field; `BeatType` is an open string (so "epic"/parent types are valid); `BeatDependency` supports `parent_of`.
- Labels stay **orthogonal** (cross-cutting concerns only: `work:*` bucket, status). The existing `project:*` label is **demoted to a compatibility alias** — the parent/epic is the structural truth.
- Why: backend-native, generic, nests cleanly; "initiative = expandable card" and the Plan view fall out for free.

### Q3 — Board columns vs buckets
**Normalized 4 columns: To do · Doing · Review · Done.**
- Each profile's states map *into* these columns via the loom classification the backend already derives (`queueStates → To do`, `actionStates → Doing`, `reviewQueueStates → Review`, `terminalStates → Done`).
- All buckets (do/coordinate/followup) coexist on one board. A `coordinate` task's `scheduled` shows under "To do", its `done` under "Done".
- **Bucket = a filter chip + a small card label, not a column.** Its real job is picking the profile (lifecycle) at create time.
- No hardcoded state names. This *replaces* the current Overview, which hardcodes `WORK_ITEM_OVERVIEW_STATES` and splits into Work Items/Exploration/Gates/Terminated tabs — the over-complication being removed.
- Cost: a normalized column hides the specific state (you see "Doing", not "nudged"). Mitigation: card shows its real state as a small label; opening the card shows the full lifecycle.

---

### Q4 — Agent vs human actions
**Owner-derived primary action**, not a fixed "Run".
- `nextActionOwnerKind === "agent"` && `isAgentClaimable` → **Run** (hand to an agent). Do-profile action states.
- `nextActionOwnerKind === "human"` → the profile's human verb: coordinate → *Mark scheduled / Mark done*; followup → *Nudge / Escalate / Mark done*; decide → *Record decision*.
- `none` / terminal → no action button.
- On the normalized board, a "Doing" card is agent-running or human-action depending on the owner. Verb is owner-derived, never hardcoded.
- Evidence: `Beat.nextActionOwnerKind`/`isAgentClaimable` exist; `canTakeBeat()` already returns false for human-owned/terminal. Extend the existing `actionColumn` (beat-column-defs-extra.tsx) — swap the fixed Run/Plan label for an owner→verb lookup, keep the canTakeBeat gate for the agent path.
- This is what makes "agents AND humans on one board" real: the board reads the owner and offers the right verb.

### Q5 — Initiative "Plan" (batches)
**Reuse the existing wave/execution-plan code, lazily.**
- Plan view = the initiative's child tasks grouped by dependency depth (= batches), using the existing wave logic (Setlist → Plan, repointed at the parent's children + their `blocks`/`blocked_by` edges).
- Only show batches when children actually have dependency edges; independent children degrade to a plain list. Simple initiatives stay simple, complex ones get batch ordering. ~No new logic.
- Caveat: the wave/execution-plan code has 4 overloaded `Plan`/`Wave` types (TAXONOMY-flagged); pick one as the Plan source, don't tangle the others.

### Q6 — /today promote target
**Minimal defaults, edit-before-write.** Promoted line → lands in the Board's **To do** column.
- Defaults: title = the line text; bucket = `do`; project = **unsorted** (no parent); repo = the canonical work repo; acceptance = empty stub (required for `do`, so the form makes you fill it).
- Pre-filled form, edit anything, confirm. Nothing created silently. Reuses shipped quick-capture validate/normalize.
- **Dedup:** created task carries `source:today-YYYY-MM-DD`; /today reads that label and shows a "→ promoted" marker so a line isn't double-created across mornings.

### Q7 — Project health signal
**Activity-based, zero new fields.**
- **Moving** = a child task changed state (`updated`) within N days. **Stalled** = no change in N days (default **7**, configurable; reuses shipped stale-badge logic). **Blocked** = open tasks but none actionable. **Done** = all children terminal.
- Honest (reads real movement, can't be set-and-forget-stale), generic, ships with C2.
- Metric-based health (toward a target by check-by) is **C3** (needs metric+check-by fields) — layered on later.
- Snooze-until for deliberately-parked projects: **deferred** until false-positives bite.

### Q8 — One source of truth: metadata home + enforcement
**Metadata on the parent bead; enforced by contract + a hermetic test.**
- A Project/Initiative *is* a bead (the parent). Bet/intent → its `description`; owner → `owner`; rest → labels/fields. **No sidecar JSON, no projects table** — one record, nothing to sync.
- Every story carries the acceptance criterion: *"operates only via `BackendPort` / `/api/beats*`; creates no storage outside the repo's beads DB."*
- A **hermetic test** asserts the new features (promote, projects rollup, tracker actions) call `backend.*` and never write outside the repo's memory-manager dir — mirroring the shipped DS-compliance grep-the-tree test.
- Backed by the existing `FOOLERY DISPATCH FAILURE` fail-loud guard (throws rather than silently falling back to a stub/new store).

---

## Reality check against the live DB (changed the plan)

Read of `personal-os/.beads` (79 open tasks) **contradicted an assumption** and corrected Epic D:
- **0 tasks have a parent edge** — everything is flat. The epics I assumed (mbu/t14/w20) are not parents of the open set.
- Grouping today is **`project:*` labels only**: agent-studio 36, ai-transformation 28, personal 14.
- Bucket labels: work:do 54, work:followup 11, **work:coordinate 3 + work:coord 6 (two spellings of the same bucket)**, and **5 tasks with no `work:*` at all**.
- So Epic D is **build the hierarchy**, not verify it.

### Q9/Q10 — Epic D, corrected
**Backfill parents from labels, once** (the native hierarchy Q2 assumes doesn't exist yet).
- One-time idempotent D-step (tarball-backed first): for each `project:*` value, create/reuse a top **Project parent** bead, then set `parent` on every task with that label (78 rows). After this the hierarchy exists; `project:*` becomes the alias.
- Initiatives (middle layer) are created over time as needed — not backfilled.
- Fold in the two hygiene fixes the data revealed: normalize **`work:coord` → `work:coordinate`** (6 rows) so there's one spelling, and assign a bucket to the **5 unbucketed** tasks.
- D1 (merge two DBs) note: the user's DB already holds both `personal-os` + `my-personal-os` IDs in one `issues.jsonl` — confirm whether a separate `my-personal-os` DB still needs merging, or D1 is already effectively done and D collapses to the backfill + hygiene pass.

---

## Build order (dependency-aware)

```
NOW   1. D    clean beads: backfill parents from project:* + hygiene (work:coord→coordinate, 5 unbucketed)   ← foundation; A4/C1 need it
      2. A2   shared Add/Update task form (keystone — reused by A3, B2, Board capture)
      3. A3   task tracker actions (Add/Update/Complete) — needs A2
      4. A1   collapse 9 tabs → Projects/Today/Board/Review (+More); normalized 4 columns
      5. B2   /today → promote a line to the Board — needs A2
NEXT  6. A4   filter + stale + profile routing wireups — needs D labels
      7. C1   Project as native parent (read the backfilled hierarchy)
      8. C2   portfolio health view — needs C1
LATER 9. B3   triage states before a task exists
     10. C3   project metrics / leverage (horizon)
```

B1 (/today reads like the clarity daily) — prototype live at spanda-dev.

## One-source-of-truth guarantee (the architecture)

1. Single door: every read/write goes through `BackendPort` (`list/get/create/update/close`); `AutoRoutingBackend` binds it to the registered repo's beads/knots marker DB. No second table the UI can reach.
2. API routes are thin wrappers: Add→`POST /api/beats`, Update→`PATCH /api/beats/:id`, Complete→`POST /api/beats/:id/close`. No migration/seed scripts.
3. /today-promote and Projects are **views over labels/parents** on ordinary tasks — nothing new is created.
4. Drift prevention: per-story acceptance criterion + hermetic test (Q8) + the fail-loud `FOOLERY DISPATCH FAILURE` guard.

---

## Foundation already shipped (Phase 2 — reuse, don't rebuild)

Vocabulary layer (Run), `/today` route, 4 profiles catalog, and the **pure logic** for label-filter, quick-capture (validate/normalize), stale badge. Most remaining work is wiring these into the UI + two new layers (Today launchpad, Projects).
