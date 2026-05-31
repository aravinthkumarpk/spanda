# Beats REST API — the board contract (ADR-0003)

The single source of truth for the whole skill pack. Every `spanda-*` skill
reads and writes the board **only** through these endpoints. No sidecar store,
no second copy of state.

Base URL: `${FOOLERY_URL:-http://localhost:3000}` — the dev server is `:3000`,
the **installed runtime is `:3210`** (set `FOOLERY_URL=http://127.0.0.1:3210`
to drive the live app).

**Every call needs a repo.** A bare call returns `500 repo_path_missing`. Pass
`_repo=<path>` (a registered work repo) on every request — or `scope=all` for a
read across all registered repos. Discover the path once:

```bash
REPO=$(curl -s "$FOOLERY_URL/api/registry" | jq -r '.data[0].path')
curl -s "$FOOLERY_URL/api/beats?state=all&_repo=$REPO" | jq '.data[]'
```

## Endpoints

### `GET /api/beats`
List/filter beats. Response: `{ "data": Beat[], "_degraded"?: boolean }`.
Useful query params (compose with `&`):

| param | meaning |
|-------|---------|
| `state` | a workflow state, or `all` for no state filter |
| `profileId` | `do` / `decide` / `coordinate` / `followup` (the task type) |
| `parent` | only children of this beat (the task breakdown) |
| `label` | a single label, e.g. `altitude:initiative` |
| `priority` | 0–4 |
| `requiresHumanAction` | `true` surfaces items sitting at a human gate |
| `q` | free-text search |
| `_repo` | repo path (multi-repo mode) |

### `GET /api/beats/:id`
One beat. Response: `{ "data": Beat, "cached": boolean }`.

### `POST /api/beats`
Create a beat. Body (JSON): `title` (required), `description`, `acceptance`,
`type`, `priority`, `labels[]`, `parent`, `profileId`, `invariants[]`. A task
breakdown is just child beats with `parent` set. Response: `{ "data": Beat }`.

### `PATCH /api/beats/:id`
The one mutation the pack needs. Body (JSON), all optional:
`state`, `description`, `acceptance`, `notes`, `title`, `type`, `profileId`,
`priority`, `parent`, `labels[]`, `removeLabels[]`, **`metadata`**.
`metadata` is shallow-merged, so writing `{"metadata":{"status":"…"}}` never
clobbers an existing `metadata.plan`. Response: `{ "ok": true }`.

## Field mapping (our concept → beads field)

| our concept | beads field |
|-------------|-------------|
| altitude (project/initiative/task) | label `altitude:*`, else structural |
| task type (Do/Decide/Coordinate/Follow-up) | `profileId` (do/decide/coordinate/followup) |
| spec — objective / problem / solution | `description` |
| spec — acceptance | `acceptance` |
| the plan document | `metadata.plan` |
| status / "what's done" | `metadata.status` |
| a pending question for the human | `metadata.question` |
| breakdown | child task beats (`parent` edge) |

## Lifecycle ↔ beads state (a Do initiative carries `profileId: do`*)

| our term | beads state | board column |
|----------|-------------|--------------|
| Open | `ready_for_planning` | To do |
| Plan | `planning` | Doing |
| Plan review (gate) | `plan_review` (rests at `ready_for_plan_review`) | Review |
| Execution ready | `ready_for_implementation` | To do |
| Executing | `implementation` | Doing |
| Sign-off (agent) | `sign_off` | Doing |
| Execution review (gate) | `implementation_review` (rests at `ready_for_implementation_review`) | Review |
| Done | `shipped` | Done |

\* ADR-0004: the spanda **`do`** profile is the canonical human-gated Do
lifecycle — planning + an agent `sign_off` step + two human gates
(`plan_review`, `implementation_review`). `semiauto` is the equivalent
human-gated SDLC profile on knots-style backends. Either way, **never** test a
state by string prefix — ask the API for the beat and act on the returned
`state`. State classification is loom-derived (see repo `CLAUDE.md`).

## The two human gates

`plan_review` and `implementation_review` are **gates**: a human approves or
rejects. A skill prepares the decision (a plan, or sign-off evidence) and moves
the initiative *to* the gate — it never moves it *through* the gate. Filter
`GET /api/beats?state=all&requiresHumanAction=true` to see what's waiting.
