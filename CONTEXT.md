# CONTEXT — Spanda glossary

The canonical vocabulary for the Spanda Agent Task Board. **Terms only — no
implementation.** When a term here appears in code, UI, or a skill, it means
exactly this and nothing else. Overloads we have deliberately killed are noted
under *Not*.

This is the single source of truth for language. The references (Superpowers,
gstack, lavra, compound-engineering, mattpocock, goal-following) shape what our
skills *do*, never what things are *called*.

## Altitudes

- **Project** — a grouping of initiatives. No spec, no lifecycle. A folder.
- **Initiative** — the unit of work you own. Carries the one **spec** and the
  one **status page**, and runs the lifecycle. Both gates belong to it.
- **Task** — an execution sub-unit beneath an initiative. **No spec.**
  Emergent: created only when an initiative's work needs more than one. Shows as
  a row on the initiative's status page.

## Task types  (an initiative is exactly one type)

- **Do** — work whose output is an artifact (code, doc, script) an agent can
  produce. Only Do runs the full lifecycle.
  *Not a lifecycle step, and never a synonym for "execute". Do is a TYPE.*
- **Decide** — a choice to make. Flow: brainstorm → decide → communicate → close.
- **Coordinate** — alignment with people (meetings, calls).
- **Follow-up** — chasing someone for an outcome.

## Lifecycle  (a Do initiative)

- **Open** — exists with a spec; not yet started. (Was "Listed". Maps to beads'
  initial state; see ADR-0003.)
- **Plan** — you mark the initiative; the agent front-loads every question
  (grills the spec) and proposes the minimum set of tasks.
- **Plan review** — the FIRST gate. You approve or reject the plan.
  *Not gstack `review` (that is code/PR review). A gate is a human decision.*
- **Execution ready** — plan approved; tasks exist and are queued; nothing runs.
- **Start** — your single act that releases the batch to run.
- **Executing** — agents execute the tasks, in parallel where dependencies
  allow. *"Execute" is the PHASE verb; the task TYPE is "Do".*
- **Execution review** — the SECOND gate. When all tasks finish you review the
  produced output in one sitting and approve (→ Done) or reject.
- **Done** — Execution review approved, shipped, and canary-verified.

## Shipping

- **Worktree** — the isolated branch/checkout where a task executes. Keeps
  in-flight work off main until approval.
- **Commit** — the unit of executed work. Each task produces its own commit(s)
  on its worktree branch; *nothing lands on main until Execution review
  approval.* A rejected task's commit is dropped and redone before merge.
- **Ship** — merging an approved initiative's branch to main (keeping the
  per-task commits in history) and deploying. Triggered by your Execution
  review approval, never before. *No PR by default* (repo rule) — a
  commit-on-a-branch that your approval merges.

## Gates & sign-off

- **Gate** — a point where a human decides. Exactly two: Plan review, Execution
  review. Both are **LLM-assisted human reviews**.
- **Review** — reserved for a human gate. *No skill is ever named "review".*
  A gate is an **LLM-assisted human review**: an LLM surfaces forcing questions
  and evidence to sharpen the decision, but the human decides. **Plan review**
  is assisted by office-hours forcing questions (+ architecture lock);
  **Execution review** is assisted by the sign-off evidence. The agent
  *assists*; the human *gives* the gate.
- **Sign-off** — the evidence package (e2e / QA / health) an agent assembles to
  support an Execution review. The skill prepares it; the human gives the gate.

## Surfaces

- **Board** — the current stack: one view of every initiative across all types,
  arranged by lifecycle. What you drive from.
- **Today** — the change feed: what moved/changed, to help you prioritise what
  to pull onto the board.
- **Status page** — the one page per initiative (rendered in Foolery) showing
  live progress, "what's done", and any pending question.

## Spec, goal, skills

- **Spec** — the editable definition of an initiative: objective, problem,
  recommended solution, breakdown, acceptance, assumptions. Lives at the
  initiative. Nothing below the initiative has a spec.
- **Goal** — an initiative's acceptance criteria expressed as a completion
  condition an agent runs under; it cannot stop until the goal holds.
- **Skill** — a thin, cross-agent procedure (Claude Code + Codex) that drives
  the board over the REST API. Carries no state.
- **Skill pack** — a named set of skills. Two exist: the **do pack**
  (plan, execute, sign-off, learn) and the **decide pack**
  (brainstorm → decide → communicate → close).
- **Learn** — after Execution review, capturing an initiative's decisions,
  patterns, and deviations into a shared knowledge note so the next Plan starts
  already aware. The `spanda-learn` skill.
- **Knowledge note** — the shared, growing record `spanda-learn` writes to and
  Plan reads first. *Not the spec (which defines one initiative); the knowledge
  note is cross-initiative memory.*
