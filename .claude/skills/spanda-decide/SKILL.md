---
name: spanda-decide
description: >-
  Drive a Spanda Decide initiative from open question to closed call —
  brainstorm the options, make the decision, communicate it, and close the
  card. Use when an initiative's task type is Decide and the user says "decide
  this", "help me make this call", "what are the options?", "weigh these
  choices", or "close out this decision". This is the decide pack (distinct from
  the do pack's plan→execute→sign-off→learn). Runs on Superpowers brainstorming
  with gstack office-hours framing where installed; inline fallback. Cross-agent
  (Claude Code + Codex).
---

# spanda-decide

The whole lifecycle for a **Decide** initiative: **brainstorm → decide →
communicate → close**. Unlike a Do initiative there's no worktree, no TDD, no
two gates — the output is a *decision*, recorded on the card, and the human
owns the call. The skill structures the thinking and writes the record.

Vocabulary: `CONTEXT.md` (task type **Decide**). API + the decide profile's
states: `../spanda-board/references/beats-api.md` (the `decide` profile runs
`waiting → deciding → decided → executed`/`dropped`).

## Primary source (ADR-0001/0002)

- **Superpowers brainstorming** — generate and pressure-test options one at a
  time, surfacing assumptions before converging.
- **gstack office-hours framing** — forcing questions that sharpen the call
  ("what would have to be true?", "what's the reversible vs irreversible part?").

Invoke where installed; **inline fallback**: lay out the options yourself with
explicit trade-offs, then apply the same forcing questions before deciding.
(v2 will add the repo's mental-model skills — game-theory, probability,
systems, decision — as extra lenses.)

## Procedure

```bash
BASE="${FOOLERY_URL:-http://127.0.0.1:3210}"
REPO="${REPO:-$(curl -s "$BASE/api/registry" | jq -r '.data[0].path')}"
```

1. **Read the context** (`spanda-board`): the initiative's `description` is the
   decision brief; `acceptance` is what a good decision must satisfy. Move it to
   `deciding` when you start:
   `curl -s -X PATCH "$BASE/api/beats/$ID?_repo=$REPO" -d '{"state":"deciding"}' -H 'content-type: application/json'`
2. **Brainstorm options** (Superpowers, or inline) — each with its trade-offs.
3. **Decide** — make the call with the human, applying the forcing questions.
   Record the decision and its rationale, and move to `decided`:
   ```bash
   curl -s -X PATCH "$BASE/api/beats/$ID?_repo=$REPO" -H 'content-type: application/json' \
     -d '{"state":"decided","metadata":{"status":"DECISION: <call>\nWHY: <rationale>\nOPTIONS WEIGHED: <list>"}}'
   ```
4. **Communicate** — share the decision with whoever it affects (the channel is
   the human's; spell out who needs to hear it). Note where it was communicated.
5. **Close** — once acted on, move to its terminal state (`executed`, or
   `dropped` if the decision was to do nothing):
   ```bash
   curl -s -X PATCH "$BASE/api/beats/$ID?_repo=$REPO" -H 'content-type: application/json' \
     -d '{"state":"executed"}'
   ```

## Why record the rationale, not just the verdict

A decision without its "why" gets relitigated the next time the question comes
up. Writing OPTIONS WEIGHED + WHY onto the card turns the decision into reusable
context — and `spanda-learn` can later lift it into the cross-initiative
knowledge note.

## Verify (dry run)

Against a test store: the Decide initiative walks `deciding → decided` with a
`metadata.status` carrying DECISION / WHY / OPTIONS WEIGHED, and lands in a
terminal state (`executed` / `dropped`) only once the human confirms.
