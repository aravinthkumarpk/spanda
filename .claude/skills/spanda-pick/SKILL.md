---
name: spanda-pick
description: >-
  Choose the next thing to work on the Spanda board, honoring the two human
  gates and task dependencies. Use when you (or the user) ask "what should I
  work on next?", "what's ready?", "pick the next initiative/task", or at the
  start of a work session before planning or executing. It distinguishes work
  an agent may take (Open, Execution ready) from work that is blocked or parked
  at a gate waiting on the human — so you never barge through a Plan review or
  Execution review. Cross-agent (Claude Code + Codex), read-only over the API.
---

# spanda-pick

Decide what to do next without crossing a human gate. This is a thin reasoning
step over the board — it reads, ranks, and recommends; it does not move
anything. Pair it with `spanda-board` (to inspect) and then `spanda-plan` /
`spanda-execute` / `spanda-decide` (to act).

Vocabulary and the full state list are in `CONTEXT.md` and
`../spanda-board/references/beats-api.md`.

## The rule the pick must respect

The lifecycle has exactly two **gates** — **Plan review** and **Execution
review** — where a *human* decides. An agent's job is to bring work *up to* a
gate and stop. So:

- **Pickable by an agent:** an initiative at **Open** (ready to Plan), at
  **Execution ready** (the human has approved the plan and pressed Start), or a
  task at **Executing** that has no unmet dependency.
- **Not pickable — surface for the human instead:** anything sitting at
  `plan_review` / `implementation_review` (or their `ready_for_*_review` rests).
  Report these as "waiting on you", never auto-advance them.
- **Skip:** blocked tasks (an open `blocks` dependency) and terminal beats
  (`shipped`, and the Decide/Coordinate/Follow-up terminals).

## Procedure

```bash
BASE="${FOOLERY_URL:-http://localhost:3000}"
# 1. What's waiting on the human (report, don't touch):
curl -s "$BASE/api/beats?state=all&requiresHumanAction=true" \
  | jq '.data[] | {id, title, state}'
# 2. Agent-claimable work, highest priority first (lower number = higher):
curl -s "$BASE/api/beats?state=all&requiresHumanAction=false" \
  | jq 'reduce .data[] as $b ([]; . + [$b])
        | sort_by(.priority) | .[] | {id, title, state, priority, profileId}'
```

Then reason in plain words:

1. If anything is at a gate, lead with "X is waiting on your review" and stop
   there unless the user asks for more.
2. Otherwise recommend the single highest-priority pickable item, name the next
   action it implies (Plan it → `spanda-plan`; Start/execute → `spanda-execute`;
   a Decide initiative → `spanda-decide`), and say why it beat the alternatives.

## Why one recommendation, not a list

The board already shows the full stack. The value here is a *decision* — the
one next move and the reason — so the human can say "yes, go" and hand it to the
acting skill. A ranked dump just re-renders the board.

## Verify (dry run)

Against a test store, step 1 returns only beats whose state is a human gate, and
step 2 returns the rest sorted by priority. No `PATCH`/`POST` is issued.
