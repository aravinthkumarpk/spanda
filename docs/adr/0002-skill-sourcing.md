# 2. Skill sourcing — thin wrappers over installed references

Date: 2026-05-30
Status: Accepted

## Context

ADR-0001 picks one primary reference per phase. We still must decide HOW our
`spanda-*` skills obtain that capability: vendor the reference skill files,
reimplement the procedure ourselves, or wrap installed references.

## Decision

**Hybrid.** Each `spanda-*` skill is a THIN procedure that:

1. speaks our vocabulary (`CONTEXT.md`) and is the only thing the user sees;
2. reads/writes the board exclusively over the REST API (carries no state);
3. INVOKES the primary reference skill as a sub-procedure where installed
   (gstack is installed locally; Superpowers / goal-following are cross-agent);
4. falls back to an inline procedure if the reference is absent.

Examples:

- `spanda-signoff` → calls gstack `/qa`, `/review`, `/canary`; writes the
  evidence to the card via the API.
- `spanda-plan` → calls Superpowers brainstorming + writing-plans; writes the
  plan to the card.
- Plan review gate → calls gstack `office-hours` to assist the human review.

## Consequences

- Our surface stays clean and minimal; the references supply battle-tested depth.
- No copied vocabulary or structure; nothing but `spanda-*` names reach the user.
- A reference can be swapped or upgraded without touching the board (skills are
  thin and on-API).
- Cross-agent: the same thin skills work in Claude Code and Codex; only the
  invoked sub-procedure differs by what is installed.
- Risk: depends on references being installed; the inline fallback bounds that.
