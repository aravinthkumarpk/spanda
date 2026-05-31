---
name: spanda-board
description: >-
  List and read the Spanda board — initiatives and their tasks, lifecycle
  state, spec, plan, and live status — straight from the beads store over the
  Foolery REST API. Use this whenever you need to see what's on the board,
  inspect one initiative's context before planning or executing it, check which
  initiatives are waiting at a human gate, or answer "what's the state of X?".
  Reach for it before spanda-pick / spanda-plan / spanda-execute so you act on
  real board data, not assumptions. Works identically in Claude Code and Codex.
---

# spanda-board

Read-only window onto the Spanda Agent Task Board. The board **is** beads
(`.beats/issues.jsonl`) exposed through Foolery's REST API — this skill never
keeps its own copy of anything. Everything it shows is a live `GET`.

Speak the Spanda vocabulary (see the repo's `CONTEXT.md`): **Project →
Initiative → Task**; an initiative is one of four **task types** (Do / Decide /
Coordinate / Follow-up); a **Do** initiative runs the lifecycle **Open → Plan →
Plan review → Execution ready → Executing → Execution review → Done**.

## When to use it

- "Show me the board" / "what initiatives are open?"
- Before planning or executing: pull one initiative's full context.
- "What's waiting on me?" — surface the two human gates.

## The contract

You only need the read endpoints. Full request/response shapes, the
state↔column mapping, and the field mapping live in
`references/beats-api.md` — read it once if anything below is unclear.

Base URL: `${FOOLERY_URL:-http://127.0.0.1:3210}`. All work goes through
`/api/beats`; there is no second store. Every `/api/beats` call must include
`_repo=$REPO` (or `scope=all` for read-only cross-repo lists).

## List the board

```bash
BASE="${FOOLERY_URL:-http://127.0.0.1:3210}"
REPO="${REPO:-$(curl -s "$BASE/api/registry" | jq -r '.data[0].path')}"
# Everything (the board groups it by lifecycle column itself):
curl -s "$BASE/api/beats?state=all&_repo=$REPO" | jq '.data[] | {id, title, state, profileId, labels}'
# Just what's waiting at a human gate (Plan review / Execution review):
curl -s "$BASE/api/beats?state=all&requiresHumanAction=true&_repo=$REPO" | jq '.data[] | {id, title, state}'
```

Altitude (project / initiative / task) is read from an `altitude:*` label and
otherwise inferred structurally — filter initiatives with
`select(.labels | index("altitude:initiative"))` when you only want the units
that carry a spec.

## Read one initiative's context

```bash
curl -s "$BASE/api/beats/$ID?_repo=$REPO" | jq '.data | {
  title, state, profileId,
  spec: .description, acceptance,           # the spec
  plan: .metadata.plan,                      # written by spanda-plan
  status: .metadata.status,                  # written by spanda-execute
  question: .metadata.question               # a pending question, if any
}'
# Its task breakdown (child beats):
curl -s "$BASE/api/beats?parent=$ID&_repo=$REPO" | jq '.data[] | {id, title, state}'
```

## Why read-first

Every other skill in the pack mutates the board with a single `PATCH`. If you
act without reading current state you risk re-planning a planned initiative or
re-running a finished task. A `GET` is cheap; a wrong write is not. Lead with
this skill, then hand off to `spanda-pick`, `spanda-plan`, `spanda-execute`,
`spanda-signoff`, `spanda-learn`, or `spanda-decide`.

## Verify (dry run)

Against a test beads store, `GET /api/beats?state=all&_repo=$REPO` returns
`{ "data": [...] }` and a single-id `GET` with `_repo` returns the
spec/plan/status fields above. No write is ever issued by this skill — that's
the whole guarantee.
