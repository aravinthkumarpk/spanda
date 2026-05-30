---
name: spanda-plan
description: >-
  Plan a Spanda Do initiative — grill its spec, propose the minimum set of
  tasks, write the plan onto the card, and move it to the Plan review gate. Use
  when an initiative is at Open and the user says "plan this", "mark it for
  planning", "break this down", or "what tasks does this need?". It front-loads
  every open question before any code is written, then leaves the human a clean
  plan to approve or reject. Runs on Superpowers (brainstorming + writing-plans)
  where installed, with an inline fallback. Cross-agent (Claude Code + Codex).
---

# spanda-plan

Turn a spec into an approved-able plan. This is the **Plan** phase of the Do
lifecycle: the agent does the thinking, the human keeps the decision. The skill
writes the plan to `metadata.plan` and moves the initiative to **Plan review**
(`plan_review`) — it never approves its own plan.

Vocabulary: `CONTEXT.md`. API + state mapping:
`../spanda-board/references/beats-api.md`.

## Primary source (ADR-0001/0002)

Drive the actual planning with **Superpowers**:

- **brainstorming** — one question at a time, front-loaded, until the spec has
  no unknowns left.
- **writing-plans** — objective · problem · recommended solution (with
  trade-offs) · breakdown · acceptance · assumptions.

If Superpowers is installed (in Claude Code, invoke its brainstorming and
writing-plans skills; in Codex, the equivalent), use it as the sub-procedure.
**Inline fallback** if it isn't: interview the spec yourself — list every
ambiguity as a question, get answers, then write the same six-part plan. Either
way the *output* is identical and the board is the only place it's stored.

## Procedure

1. **Read the spec** (`spanda-board` or directly):
   ```bash
   BASE="${FOOLERY_URL:-http://localhost:3000}"
   curl -s "$BASE/api/beats/$ID" | jq '.data | {title, description, acceptance, state}'
   ```
   Confirm it's a Do initiative at `ready_for_planning`. If a question can't be
   answered, park it in `metadata.question` rather than guessing.

2. **Grill, then write the plan** (Superpowers, or the inline interview). Keep
   the task breakdown **minimal** — create a task only when the work genuinely
   needs more than one. Each task carries its own acceptance.

3. **Create the breakdown** as child task beats (only if more than one task is
   warranted):
   ```bash
   curl -s -X POST "$BASE/api/beats" -H 'content-type: application/json' \
     -d '{"title":"<task>","parent":"'"$ID"'","acceptance":"<done-when>","profileId":"do"}'
   ```

4. **Write the plan to the card and move to the gate** (one PATCH):
   ```bash
   curl -s -X PATCH "$BASE/api/beats/$ID" -H 'content-type: application/json' \
     -d '{"state":"plan_review","metadata":{"plan":"<the six-part plan, markdown>"}}'
   ```

5. **Hand off to the human.** The Plan review gate is theirs — it's assisted by
   gstack `office-hours` (it grills the plan *with* them). Say the plan is ready
   for review; do not advance past `plan_review`.

## Why front-load the grilling

Every reference converges on the same ratio: most of the work is planning and
review, little is execution. A question surfaced now is cheap; the same gap
discovered mid-execution costs a rejected task and a redo. Spend the effort
here so Execute can run unattended under its goal.

## Verify (dry run)

After running against a test store: `GET /api/beats/$ID` shows
`state == "plan_review"` and a non-empty `metadata.plan`; any child tasks you
created appear under `?parent=$ID`. The initiative is **not** advanced past the
gate.
