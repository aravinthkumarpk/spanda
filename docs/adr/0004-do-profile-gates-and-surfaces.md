# 4. Do profile, sign-off, and the gate surfaces

Date: 2026-05-30
Status: Accepted

Supersedes the lifecycle/profile, status-surface, and altitude portions of
[ADR-0003](0003-beads-sync.md). ADR-0003's field mapping and "no new store"
principle still hold; this ADR replaces *which profile a Do initiative runs*
and *how the human acts on the gates*.

## Context

Iteration 02 shipped on an assumption that quietly contradicted itself: the
add-task form mapped task type **Do → `profileId: "do"`**, but the `do` profile
in `workflows.ts` is a leftover rename of `autopilot_no_planning` —
`planningMode: "skipped"` with `AGENT_OWNERS`, i.e. **no planning and zero
human gates**. Meanwhile ADR-0003 said a Do initiative carries
`profileId: semiauto`, and `CONTEXT.md` defines Do as running the full
`Open → Plan → Plan review → … → Execution review → Done` lifecycle with **two
human gates**. So a "Do" initiative created through the UI would never stop at
either gate — the opposite of the model.

Iteration 2.1 resolved this and the surrounding surface questions by interview.

## Decision

### 1. `do` is the canonical, human-gated Do profile

Redefine the `do` builtin profile (do **not** point Do at `semiauto`):

- `planningMode: "required"`, `implementationReviewMode: "required"`.
- `owners: SEMIAUTO_OWNERS` → exactly two human gates: **`plan_review`** and
  **`implementation_review`**. The agent owns planning, implementation,
  sign-off, and shipment; the human owns only the two review gates.
- `semiauto` is left untouched as the upstream / knots-coarse compat id
  (`KNOTS_COARSE_DESCRIPTOR_ID`) and never surfaces as a task type.
- The autonomous no-planning lifecycle is **not** lost — it remains available as
  the separate `autopilot_no_planning` profile.

Because we fixed the profile (not the mapping), the form's `"Do" → "do"`
mapping is now correct.

### 2. An explicit agent `sign_off` state

Add an agent-owned **`sign_off`** state between `implementation` and the human
`implementation_review` gate, so the agent's "check first" (gstack
qa / review / canary, via `spanda-signoff`) is a real, visible lifecycle step —
not a convention parked in free text. Realized with a `signOffMode` flag on the
profile config (scoped to `do`; the shared SDLC graph is **not** mutated, so
`semiauto`/`autopilot` are unaffected). Lifecycle:

```
implementation (agent) → sign_off (agent) → implementation_review (human) → shipment (agent) → shipped
```

`sign_off` is an action state, so it renders in the **Doing** board column
("Signing off") — no fifth column. The human approval still precedes shipment,
per ADR-0003 / `CONTEXT.md` ("Ship… triggered by your Execution review
approval, never before").

### 3. The human acts on gates with explicit Approve / Reject — not drag

- The **"Review"** primary tab is the **human-gate queue**
  (`GET /api/beats?requiresHumanAction=true`) — the initiatives resting at
  `ready_for_plan_review` / `ready_for_implementation_review`. The legacy
  escalations (`finalcut`) view is a different, execution-time concern and moves
  into the **More** menu.
- Gate decisions use explicit **Approve** / **Reject** controls on the Review
  queue and the status page. **Reject captures a note** ("your reject note is
  the instruction"); Execution-review reject offers the plan's choice — *redo
  the task* (default) or *mis-planned → back to Plan*. Approve = the forward
  (non-rollback) transition; Reject = the rollback transition.
- **Drag** performs only single-step, reason-free moves — *mark for planning*
  (`ready_for_planning → planning`), *Start* (`ready_for_implementation →
  implementation`), advancing agent-claimable work, and terminal-confirm. It
  never performs a gate approve/reject (a branch + a reason it can't encode).

### 4. The status page is the initiative's detail pane

There is no standalone detail route (`/beats/[id]` redirects to
`/beats?beat=<id>`, a pane). So `BeatDetail` branches on altitude: an
**initiative** (`altitude:initiative`) renders the `StatusPage` — live state,
"what's done" (`metadata.status`), sign-off evidence (during `sign_off`), the
pending question (`metadata.question`), the task breakdown, and the Approve /
Reject controls. A **task** renders the existing detail. `metadata.question` is
the *async* "I parked a question" channel shown here; live blocks stay in
Escalations.

### 5. Altitude is stamped at create

The empty-X gap (a spec'd thing with no children classifies structurally as a
task) affects empty **initiatives and empty projects**. So stamp at create:

- `altitude:initiative` — add-task form, `/today` promote, quick-capture.
- `altitude:project` — `move-to-project`.
- tasks are **not** stamped (a parented leaf classifies correctly; not pinning
  keeps the structure honest). `classifyBeatRole` remains the fallback for every
  unlabeled / legacy beat.

### 6. `CONTEXT.md` is the canonical glossary; `ui-vocab` implements it

The plain `ui-vocab` map is reconciled to `CONTEXT.md`: the dispatch verb
becomes **"Start"** (consumed via `useVocab()`, not a board-only literal), and
`ReTakes` → "Retakes" so "Review" unambiguously means the human gate. Remaining
cosmetic divergences (`Setlist`, `Escalations`/"Blockers", `Capsule`) are
tracked, non-blocking.

### 7. `metadata` stays an open dict; Today is the default landing

- `metadata` keeps no sub-schema; `plan` / `status` / `question` / `learned`
  are a *documented* reserved-key registry, and readers type-guard.
- The app's default landing (`/`) redirects to **`/today`** when a repo is
  registered (the change feed you check first), keeping
  `/beats?settings=repos` for the no-repo onboarding case.

## Consequences

- `workflows.ts` gains `signOffMode` + the `sign_off` state/transitions; the
  `do` profile is redefined; `workflows-spanda-profiles.test.ts` flips from
  "do = no planning" to "do = planning + sign_off + two human gates."
- Board-column classification is re-verified for `do` (incl. `sign_off` →
  Doing); `validNextStates` (A7) and the drag resolver (A2) pick up the new
  transitions automatically because both are loom-derived.
- New `"review"` view (human-gate queue); `finalcut` demoted to More.
- `StatusPage` gains Approve/Reject + sign-off evidence and is mounted in the
  initiative detail pane.
- Migration: existing `do` beads sit at `ready_for_implementation`, a valid
  state in the redefined `do`; they continue forward through the new
  `sign_off` + gate states. No data migration required.
- Knots caveat: a knots `.loom` `do` profile must declare the same `sign_off`
  state to stay in sync — a Phase-2 item; the beads builtin catalog is the
  source of truth for this iteration.
