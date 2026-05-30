---
name: spanda-execute
description: >-
  Execute an approved Spanda Do initiative — run each task in an isolated
  worktree under a goal-following loop with TDD, commit per task, write live
  progress back to the card, and move the initiative to Execution review when
  all tasks are done. Use after Plan review approval, when the initiative is at
  Execution ready and the user says "start", "go", "execute", "run the tasks",
  or "build it". The acceptance criteria are the goal: the agent can't stop
  until they hold. Runs on Superpowers (subagents + TDD + worktrees) wrapped by
  goal-following; inline fallback. Cross-agent (Claude Code + Codex).
---

# spanda-execute

The **Executing** phase. The human has approved the plan and pressed **Start**
(the initiative is at `ready_for_implementation` / `implementation`); now the
agent does the work in small verified increments and reports progress to the
board, so the human watches **status in Foolery, never by tailing the chat**.

Vocabulary: `CONTEXT.md`. API + state mapping:
`../spanda-board/references/beats-api.md`.

## Primary source (ADR-0001/0002)

- **Superpowers** — subagent-driven development + RED-GREEN-REFACTOR TDD in a
  **worktree** + verification-before-completion.
- **goal-following** — wrap each task in a goal loop (Claude Code `/goal`
  Stop-hook; Codex `goals=true`) where **the task's acceptance criteria are the
  completion condition**. This is what makes "best-guess and keep going,
  interrupt only when genuinely stuck" automatic rather than hoped-for — the
  loop can't exit until acceptance holds.

Invoke these where installed; **inline fallback**: create the worktree by hand,
write the failing test first, make it pass, refactor, and re-check acceptance
yourself before moving on.

## Per-task loop

For each child task (or the initiative itself if it has no breakdown):

1. **Isolate** — a dedicated git worktree + short-lived branch (repo policy:
   `bun install --frozen-lockfile` in the fresh worktree before any gate).
2. **TDD under the goal** — test → red → green → refactor, goal = the task's
   `acceptance`. Keep working until the four quality gates are green:
   `bun run lint && bunx tsc --noEmit && bun run test && bun run build`.
3. **Commit** the task's work on its branch (nothing lands on main until
   Execution review approval — no PR by default, per repo policy).
4. **Report progress to the card** (this is what the status page renders):
   ```bash
   BASE="${FOOLERY_URL:-http://localhost:3000}"
   curl -s -X PATCH "$BASE/api/beats/$TASK_ID" -H 'content-type: application/json' \
     -d '{"state":"implementation","metadata":{"status":"<what is done so far>"}}'
   ```
   If you hit something only the human can decide, write it to
   `metadata.question` and keep going on independent work rather than blocking.

## When all tasks are done

Roll the initiative up to the Execution review gate and summarize what shipped:

```bash
curl -s -X PATCH "$BASE/api/beats/$ID" -H 'content-type: application/json' \
  -d '{"state":"implementation_review","metadata":{"status":"all tasks complete — <summary>"}}'
```

Then run **spanda-signoff** to assemble the evidence the human needs, and stop.
Execution review is a human gate — do not mark the initiative `shipped`.

## Why status goes on the card, not in the chat

The whole point of the board is that the human steers without reading the
agent's transcript. `metadata.status` is the live "what's done"; the status
page reads exactly that field. Two granularities, one board: the human sees
minimal tasks, the agent works in small verified increments underneath.

## Verify (dry run)

Against a test store with an approved initiative: each task ends `shipped`-ready
on its branch with a `metadata.status`, and the initiative ends at
`implementation_review` — not `shipped`. The four gates pass before any commit.
