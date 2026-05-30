---
name: spanda-learn
description: >-
  Capture what an initiative taught you into the shared Spanda knowledge note —
  the decisions made, patterns that worked, and deviations from the plan — so
  the next Plan starts already aware. Use after Execution review approval (the
  initiative is Done), or whenever the user says "capture the learnings",
  "write this up", "what did we learn?", or "update the knowledge note". It
  writes cross-initiative memory, not the spec of any one initiative. Runs on
  lavra (persistent knowledge store) where installed; inline fallback to a
  shared markdown note. Cross-agent (Claude Code + Codex).
---

# spanda-learn

Close the compound-engineering loop. After an initiative ships, the most
valuable artifact isn't the code — it's what the next initiative shouldn't have
to rediscover. This skill harvests that and parks it where **spanda-plan reads
it first**.

Vocabulary: `CONTEXT.md` (**Learn**, **Knowledge note**). API:
`../spanda-board/references/beats-api.md`.

## Primary source (ADR-0001/0002)

Use **lavra** — a persistent knowledge store with recall — as the backing
memory where installed: recall what's already known about this area, then
append the new decisions/patterns/deviations so future recall surfaces them.

**Inline fallback** if lavra isn't present: keep a single shared markdown file
(default `docs/knowledge-note.md` in the repo) and append a dated section. The
note is *shared and cross-initiative* — it is **not** an initiative's spec and
never lives on a single card's `description`.

## What to capture (and what not to)

Capture the things that change how the *next* plan is written:

- **Decisions** — the call made and the *why*, especially trade-offs taken.
- **Patterns** — an approach that worked and is worth repeating.
- **Deviations** — where execution diverged from the plan, and what forced it.

Skip blow-by-blow narration and anything already obvious from the code or git
history — that's noise the next planner will skim past.

## Procedure

1. **Read the finished initiative** (`spanda-board`): its spec, plan
   (`metadata.plan`), final status (`metadata.status`), and the tasks' outcomes.
2. **Recall** prior knowledge for this area (lavra recall, or read the existing
   note) so you extend rather than duplicate.
3. **Write** the three buckets above into the knowledge note (lavra append, or
   append a dated section to the shared markdown file).
4. **Leave a pointer on the card** (optional but handy) so the initiative links
   to what it taught:
   ```bash
   BASE="${FOOLERY_URL:-http://localhost:3000}"
   curl -s -X PATCH "$BASE/api/beats/$ID" -H 'content-type: application/json' \
     -d '{"metadata":{"learned":"<one-line summary + where the note lives>"}}'
   ```

## Why a shared note, not per-card notes

A spec defines one initiative; the knowledge note is memory *across*
initiatives. Keeping it in one place is what lets the next Plan "start smarter"
instead of relearning the same lesson. Per-card notes fragment that memory and
no planner reads them all.

## Verify (dry run)

After running: the knowledge note (lavra entry or the shared markdown file) has
a new dated section with Decisions / Patterns / Deviations for this initiative,
and `spanda-plan` reading that note would surface them.
