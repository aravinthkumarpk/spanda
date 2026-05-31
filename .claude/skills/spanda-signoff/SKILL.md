---
name: spanda-signoff
description: >-
  Assemble the evidence package for a Spanda Execution review — run QA, code
  review, and a post-deploy canary, then write the results to the card so the
  human can give the gate with confidence. Use when an initiative reaches
  Execution review (implementation_review) and the user says "sign off",
  "is this ready to ship?", "prepare the review", or "QA this". It produces
  evidence, not a verdict — every acceptance criterion verified before Done.
  Runs on gstack (qa → review → canary) where installed; inline fallback.
  Cross-agent (Claude Code + Codex).
---

# spanda-signoff

Turn "the agent says it's done" into evidence a human can act on. This skill
backs the **Execution review** gate: it gathers proof that every acceptance
criterion holds, writes that proof to the card, and leaves the decision to the
human. It is **not** named "review" and it never approves — a gate is a human
review (see `CONTEXT.md`).

API + state mapping: `../spanda-board/references/beats-api.md`.

## Primary source (ADR-0001/0002)

Drive the evidence with **gstack**, in order:

- **qa** — systematically exercise the app, fix bugs atomically, re-verify;
  produces before/after health scores.
- **review** — catch what passes CI but blows up in prod (SQL safety, LLM
  trust-boundary violations, conditional side-effects).
- **ship + land-and-deploy** — tests + coverage audit, then the deploy path.
- **canary** — post-deploy watch for console errors / perf regressions against
  a pre-deploy baseline.

Also usable: lavra `/test-browser` and the repo's `quality-fe-agent`
(browser-scout / e2e orchestrator) for real browser e2e.

Invoke gstack where installed; **inline fallback** if not: run the repo's four
gates (`bun run lint && bunx tsc --noEmit && bun run test && bun run build`),
walk each acceptance criterion by hand, and note any console/perf regressions
you can observe. The shape of the evidence is the same.

## Procedure

1. **Read** the initiative's acceptance and its tasks' status
   (`spanda-board`). The acceptance criteria are the checklist.
2. **Gather evidence** — gstack qa → review → canary (or the inline fallback).
   Tie each result back to a specific acceptance criterion.
   Run this while the initiative is in the agent **`sign_off`** state (ADR-0004),
   which `spanda-execute` set when the work finished.
3. **Write the evidence and advance to the gate** so the status page shows it
   and the initiative lands in the human Execution-review queue:
   ```bash
   BASE="${FOOLERY_URL:-http://127.0.0.1:3210}"
   REPO="${REPO:-$(curl -s "$BASE/api/registry" | jq -r '.data[0].path')}"
   curl -s -X PATCH "$BASE/api/beats/$ID?_repo=$REPO" -H 'content-type: application/json' \
     -d '{"state":"ready_for_implementation_review","metadata":{"status":"SIGN-OFF\n- AC1: <pass + evidence>\n- AC2: …\n- canary: <green/red>"}}'
   ```
   This rests at the gate (`requiresHumanAction`). Do **not** set `shipped` — the
   human gives the gate.
4. **Hand to the human:** "Sign-off ready — every acceptance criterion has
   evidence on the card. Your call." It now shows in the **Review** queue; the
   human clicks **Approve** (→ ship) or **Reject** (with a note → redo). If
   something fails, say so plainly and point at the failing criterion.

## Why evidence, not a verdict

The Execution review is a vibe-check only if you let it be. An evidence-based
sign-off lifted from gstack's ship discipline turns the gate into a glance:
the human reads the per-criterion proof and decides in one sitting. The agent's
honesty about a *failing* criterion is the most valuable part — surface it.

## Verify (dry run)

Against a test store: after running, `metadata.status` carries a per-criterion
evidence block and `state` is `ready_for_implementation_review`. The skill
issues no state advance to `shipped`.
