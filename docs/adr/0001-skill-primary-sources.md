# 1. Skill primary sources — one per phase

Date: 2026-05-30
Status: Accepted

## Context

The Spanda skill packs draw on six references: Superpowers, gstack, lavra,
compound-engineering, mattpocock/skills, and goal-following (Claude `/goal`,
Codex `goals`). Borrowing from all six inside every skill produces
"Frankenstein" procedures and re-imports the exact terminology sprawl the
product is trying to avoid. We need one primary source per phase.

## Decision

One **primary** reference per phase; the rest are optional inspiration only.

| Phase / skill            | Primary source                                                                 |
|--------------------------|--------------------------------------------------------------------------------|
| Plan · `spanda-plan`     | **Superpowers** — brainstorming + writing-plans (builds the plan)              |
| Execute · `spanda-execute` | **Superpowers** — subagent + TDD + worktrees + verification; wrapped by **goal-following** (Claude `/goal`, Codex `goals`) |
| Sign-off · `spanda-signoff` | **gstack** — qa → review → ship → land-and-deploy → canary                  |
| Learn · `spanda-learn`   | **lavra** — persistent knowledge store + recall                                |
| Decide · `spanda-decide` | **Superpowers** brainstorming + **gstack** office-hours framing                |

Both human gates are **LLM-assisted human reviews** — the LLM surfaces forcing
questions / evidence; the human decides:

- **Plan review** is assisted by gstack **office-hours** (+ plan-eng-review
  architecture lock). office-hours lives at the *gate*, not inside `spanda-plan`.
- **Execution review** is assisted by the **sign-off** evidence.

## Consequences

- Active references collapse from six to **three**: Superpowers (Plan, Execute,
  Decide), gstack (Sign-off + Plan-review assist), lavra (Learn) — plus
  goal-following as the Execute wrapper.
- **mattpocock** and **compound-engineering** drop to optional inspiration
  (mattpocock `to-issues` for breakdown; compound's 80/20 planning philosophy).
- **v2:** the Decide pack gains multiple mental-model skills from our own repo
  (game-theory, probability, systems, decision, …) as additional lenses.
- Skills never mix primaries; swapping a phase's source is a one-line change here.
