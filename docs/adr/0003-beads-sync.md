# 3. Beads sync — how the model maps onto beads storage

Date: 2026-05-30
Status: Accepted

## Context

The board IS beads (`.beads/issues.jsonl` via `/api/beats`). The product model
(altitudes, lifecycle, spec/plan/status) must map onto beads' real fields — no
new store. Verified beads facts (`beads-jsonl-dto.ts`, `schemas.ts`,
`project-tree.ts`):

- Round-trip fields: `description`, `notes`, `acceptance` (↔ `acceptance_criteria`),
  `parent`, `labels`, `priority`, `type` (↔ `issue_type`), `metadata` (open dict),
  `created`/`updated`/`closed`.
- **Workflow state is persisted** as a `wf:state:<state>` label plus a coarse
  `status` shadow (open/in_progress/blocked/deferred/closed); profile as a
  `wf:profile:<id>` label. Any state string is accepted and normalized against
  the profile descriptor — so beads can hold our full lifecycle.
- `PATCH /api/beats/[id]` updates: `state`, `description`, `notes`, `acceptance`,
  `labels` (+ `removeLabels`), `parent`, `profileId`, `priority`, `type`.
- Altitude is NOT stored; `classifyBeatRole` is structural (parent + hasChildren).
- No event log; only `created`/`updated`/`closed` timestamps.

## Decision

**Altitude** — store an explicit `altitude:project|initiative|task` label
(round-trips via labels). Fall back to structural `classifyBeatRole` when the
label is absent. Fixes the empty-initiative gap (a spec'd initiative with no
tasks yet would otherwise classify as a task).

**Lifecycle states** — a Do initiative carries `profileId: semiauto` (the
planning + plan_review + implementation + implementation_review human gates).
Map its states to our names:

| our term            | beads state (semiauto)     |
|---------------------|----------------------------|
| Open                | ready_for_planning         |
| Plan                | planning                   |
| Plan review (gate)  | plan_review                |
| Execution ready     | ready_for_implementation   |
| Executing           | implementation             |
| Execution review (gate) | implementation_review  |
| Done                | shipped                    |

Each `ready_for_*` queue state renders in the same board column as its action
state. The board column mapping lives in `board-columns.ts` (already loom-derived).

**Field mapping (no new store):**

| our concept                      | beads field                     |
|----------------------------------|---------------------------------|
| spec: objective / problem / solution | `description`               |
| spec: acceptance                 | `acceptance` (`acceptance_criteria`) |
| the plan document                | `metadata.plan`                 |
| status / "what's done"           | `metadata.status`               |
| knowledge note (cross-initiative)| a shared note file, not a beat  |
| breakdown                        | child task beats (`parent` edge)|
| task type (Do/Decide/…)          | `profileId` (do/decide/coordinate/followup) |

**Status updates** — the skill pack PATCHes `state` + `metadata.status`; beads
sets `updated`; `closed` is set on Done. The Foolery status page renders
`metadata.status`.

## Consequences

- Everything lives in beads; the skill pack only calls `/api/beats`. No sidecar.
- The board columns are a presentation mapping over beads states.
- "Listed" → "Open" to match beads' initial state.
- Open risk: while an initiative is "Executing" its child task beats run in
  parallel; the initiative's own state + the children's states represent this.
  A custom profile may refine the initiative-vs-task split in Phase 2.
