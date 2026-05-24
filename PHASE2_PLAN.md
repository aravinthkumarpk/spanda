# Phase 2 — execution plan (TDD)

> Comprehensive TDD plan for the 9 follow-up items raised after the design-system + reskin work landed. Snapshot table on top, brainstorms for the open items (#1 workflows, #6 vocabulary), then per-item TDD breakdown.

**Repo state when authored:** `spanda/design-system` branch @ `45ba3d45`. Foundation + globals.css token swap + execution.html reskin + ship-spanda.sh + design-preview diff verifier all green and live.

**Source audits (numbers backing the plan):**

- **Off-palette Tailwind utilities** across the entire codebase: **11 occurrences in 2-3 files** (zinc/stone neutrals + sky/green/amber/emerald focus rings on diagnostics cards). Surface area is tiny.
- **Inline hex literals** in `src/components/` + `src/app/`: **17 total**, of which 4 are legacy warm-paper `#f4efe6` (must die), 6 are spanda-palette canonicals (fine), 3 are pearl-gradient stops inside the spanda mark SVG (fine), 1 is `#222` (investigate), rest are neutrals on white/black.
- **User-facing vocabulary strings** (`"Take!" / "Scene!" / "Beat" / "Setlist" / "ReTakes"`): **17 occurrences across maybe 8 files**. Small enough that a simple rename + a thin label-translation layer is genuinely cheap.

---

## Snapshot table

Priority legend: **P0** = blocks daily-driver use, ship this week. **P1** = within 2 weeks. **P2** = nice-to-have, schedule when calendar opens.

| # | Pri | Item | Approach (recommended) | Test-first file | Impl files (estimate) | Effort |
|---|---|---|---|---|---|---|
| 0 | P0 | Design-system compliance — kill the remaining off-palette utilities + inline `#f4efe6` hex | Replace `zinc-* / stone-* / amber-* / emerald-* / sky-* / green-* ` with `paper-* / clay-* / moss-* / lake-* / ochre-*`. Replace `#f4efe6` → `var(--color-canvas-soft)`. Add lint rule that fails on off-palette utilities going forward. | `src/app/__tests__/no-off-palette-utilities.test.ts` (grep src/ for the regex, assert zero matches in changed files) | 3-4 component files: `beats-sync-diagnostics-card.tsx`, `scope-refinement-diagnostics-card.tsx`, ~2 others surfaced by audit | **S** ~50 LOC + ~40 LOC test |
| 1 | P0 | Per-category workflow profiles (no more "Call with Khilan" in Plan Review / Impl / Ship Review) | **Brainstorm below.** Recommend **option D**: ship 4 profiles — `code` (existing autopilot), `coord` (scheduled→done), `followup` (waiting→escalated→done), `decision` (deciding→decided). Label-based routing per ROADMAP item 1.3. | `src/lib/__tests__/workflows-spanda-profiles.test.ts` (catalog has all 4 + routing tests) | `src/lib/workflows.ts` (BUILTIN_PROFILE_CATALOG + customStates), `src/lib/workflows-runtime.ts` (resolveProfileForBeat), `src/lib/profile-defaults.ts` | **M** ~200 LOC + ~120 LOC tests |
| 2 | P0 | Label filter (`work:ic` / `work:coord` / `work:followup` / `work:decision`) | Checkbox group in filter-bar; URL state in Zustand store; OR semantics across labels | `src/components/__tests__/filter-bar-labels.test.tsx` | `src/components/filter-bar.tsx`, `src/stores/filter-store.ts` | **S** ~80 LOC + ~60 LOC tests |
| 3 | P0 | "Today" view — HTML-based, date-driven | New `/today` route. Server component reads bd via existing adapter, filters: due-today + P0/P1 ready + in-progress. Renders with the spanda design-system tokens (cards on sage, no lifecycle columns). Daily HTML link points here. | `src/app/today/__tests__/page.test.tsx` (pure `getTodayBeats(fixture)` filter logic) + `src/app/today/__tests__/render.test.tsx` (snapshot of rendered HTML class set) | new `src/app/today/page.tsx`, `src/components/today-list.tsx`, update `~/personal-os/.claude/skills/daily-dashboard-synth/SKILL.md` template | **M** ~180 LOC + ~100 LOC tests |
| 4 | P0 | Quick capture — in-place modal, no shell-out | Modal POSTs to `/api/beats` with the same acceptance-criteria lint the bash wrapper enforces. Global `/` shortcut (but not when an input is focused). Edit-in-place too: click bead title → contenteditable → blur saves via `PATCH /api/beats/:id`. | `src/components/__tests__/quick-capture-modal.test.tsx` (form behavior, lint, ESC, focus trap) + `src/components/__tests__/inline-edit.test.tsx` (click, edit, save, esc revert) | new `src/components/quick-capture-modal.tsx`, `src/components/inline-edit-field.tsx`, register shortcut in `src/app/layout.tsx` | **M** ~160 LOC + ~120 LOC tests |
| 6 | P0 | Vocabulary — Beat/Take/Scene/Setlist/ReTakes is foreign | **Brainstorm below.** Recommend **option B**: ship a label-translation layer (`src/lib/ui-vocab.ts`) with a "plain" mode default (`Beat→Task`, `Take→Run`, `Scene→Plan`, `Setlist→Plan board`, `ReTakes→Review`). Keep internal type names + APIs + ROADMAP doc on the musical metaphor (it's a recognizable domain for the curious). | `src/lib/__tests__/ui-vocab.test.ts` (plain mode maps all 17 strings; verbose mode keeps originals) + `src/components/__tests__/ui-strings-no-direct-vocab.test.tsx` (lint-style: no JSX uses raw "Take!" / "Beat" — must go through `useVocab()`) | new `src/lib/ui-vocab.ts`, `src/hooks/use-vocab.ts`; ~8 component files swap inline strings for `useVocab().take`, etc. | **S** ~70 LOC + ~100 LOC tests, +~25 LOC across components |
| 8 | P0 | Stale beads — configure `stale_grooming` pool + visual badge | Wire claude (or a tiny "stale-checker" profile) into `~/.config/foolery/settings.toml` `[pools.stale_grooming]`. Add age badge in beat row using existing `updated_at`. | `src/components/__tests__/stale-badge.test.tsx` (>7d shows "stale Nd"; ≤7d none; closed none) | `src/components/beat-table-columns.tsx` (badge cell); `~/.config/foolery/settings.toml` (config) | **S** ~30 LOC + ~40 LOC tests + 5 LOC config |
| **—** | **P1** | **Telegram intake + Take-complete notify** | Hermes-side webhook handler creates beads via `bd create --no-lint --labels work:capture`; Spanda fires fetch on terminal-complete. | `~/.hermes/webhooks/__tests__/telegram-intake.test.py` (signature + idempotency) + Spanda `src/hooks/__tests__/use-terminal-stream-notify.test.ts` | new `~/.hermes/webhooks/telegram-intake.py` + `src/hooks/use-terminal-stream.ts` | **M** ~150 LOC across both repos |
| **—** | **P2** | **Onboarding `spanda init` CLI** | Bash CLI that writes settings.toml + claude pool + personal-os repo to a fresh Foolery install in one command. | `scripts/__manual_tests__/spanda-init.test.sh` (dry-run produces TOML that passes `foolery config validate`; idempotent) | `scripts/spanda-init.sh` | **S** ~80 LOC bash + ~40 LOC test |

**Total Phase 2 estimate: ~1000 LOC of new code + ~700 LOC of tests across 7 P0 items + 2 P1/P2.** Realistic: 2-3 focused days. Each P0 item ships independently (item-level rollback safe via the ship-spanda.sh backup pattern).

---

## Brainstorm 1 — workflow profiles (item #1)

The fork already supports custom `BuiltinProfileConfig` with `customStates`. Question: which set of profiles is the right one?

### Option A — minimum split (2 profiles beyond default)

`code` (existing autopilot) + `coord` + `followup`. Three total.

Pros: covers 95% of corpus (IC vs coord vs chase). Simplest mental model.
Cons: doesn't differentiate "decision pending" beads from coord beads — both go through `scheduled → done`, but a decision has a different texture (you wait for someone to decide, then act).

### Option B — fine-grained (8-10 profiles)

`code-review`, `doc-review`, `meeting`, `chase`, `decision`, `read`, `write`, `purchase`, `personal`, etc.

Pros: every bead category has its perfect lifecycle.
Cons: too many profiles to mentally track. The settings UI would have 8+ profile dropdowns. Most categories collapse into 3-4 in practice. **Reject as overkill.**

### Option C — domain-driven (per Aravinth's MISSION.md goals)

`g0-personal`, `g1-agent-studio`, `g2-compass`, `g3-side-projects`. Each goal area has its own workflow.

Pros: matches your existing mission framing.
Cons: confuses what a workflow is for (it's about *how work flows*, not *what work is about*). G1 work can be code (autopilot fits) or coord (autopilot doesn't fit). **Reject — wrong axis.**

### Option D — moderate split (4 profiles) — **RECOMMENDED**

| Profile | States | When to use | Owner |
|---|---|---|---|
| `code` (rename `autopilot_no_planning`) | `ready_for_implementation → implementation → ready_for_implementation_review → implementation_review → shipped / abandoned / deferred` | IC work an agent can do (write a doc, edit a file, run a script, fix a bug) | agent |
| `coord` | `scheduled → done / cancelled` | Meetings, calls, alignment sessions you'll attend | human |
| `followup` | `waiting → nudged → escalated → done / closed` | Chasing someone external for a decision/output | human (with optional nudge agent later) |
| `decision` | `deciding → decided → executed / dropped` | A choice YOU need to make before work can move (vendor pick, hire decision, strategic call) | human |

**Why this split:** each profile has 2-4 columns max → board stays scannable; `decision` vs `coord` vs `followup` are textures of human work that need different next-action verbs (decide vs attend vs ping). The default `code` profile keeps the existing IC workflow unchanged so nothing breaks for agent-dispatchable beads.

**Routing:** label `work:code` / `work:coord` / `work:followup` / `work:decision`. No label = `code` by default (backwards compat with the existing 50 beads). Two `work:` labels = fail-loudly per CLAUDE.md.

**Action verbs per profile** (for #8 row-action work):

| Profile | Verb at non-terminal state | Verb at terminal-eligible state |
|---|---|---|
| code | `Run agent` (was "Take!") | `Ship` (was "Promote") |
| coord | `Mark scheduled` / `Reschedule` | `Mark done` / `Cancel` |
| followup | `Mark nudged` / `Escalate` | `Mark done` / `Close` |
| decision | `Mark deciding` | `Record decision` / `Drop` |

---

## Brainstorm 2 — vocabulary (item #6)

The core question: keep the musical-stage metaphor (Beat/Take/Scene/Setlist) because DESIGN.md says it's "intentional and distinctive", OR make the UI accessible to any knowledge worker?

**The user has decided in favor of accessibility.** The remaining question is HOW.

### Option A — full rename across the codebase

Touch every internal symbol: `Beat` → `Task`, `useBeats` → `useTasks`, `BeatRow` → `TaskRow`, `/api/beats` → `/api/tasks`, etc.

Pros: maximally consistent.
Cons: ~500-1000 LOC of churn across hundreds of files. Every upstream Foolery rebase becomes a mess. Breaks the API contract `/api/beats` (callers and Hermes intake would need updating). **Reject — fork-tax trap warned about in the CEO review.**

### Option B — UI-only label-translation layer — **RECOMMENDED**

Single source of truth at `src/lib/ui-vocab.ts`:

```ts
// Two registered vocabularies. "plain" is the default per the goal.
// "verbose" preserves the original musical metaphor for anyone who
// wants to opt in (curious folks, internal demos, the README).
export const VOCAB = {
  plain: {
    beat: "task", beats: "tasks", Beat: "Task", Beats: "Tasks",
    take: "run", "Take!": "Run", take_imperative: "Run it",
    scene: "plan", "Scene!": "Plan it",
    setlist: "plan board", Setlist: "Plan board",
    retake: "review", retakes: "reviews", ReTakes: "Reviews",
    escalations: "blockers", Escalations: "Blockers",
    capsule: "context", Capsule: "Context",
  },
  verbose: {
    // identity map — keeps the musical names
    beat: "beat", Beat: "Beat", ...
  },
};

export const DEFAULT_VOCAB: keyof typeof VOCAB = "plain";
```

Components consume via `useVocab()` hook (returns the active vocab object based on `localStorage.spanda_vocab` or default). All 17 user-facing string occurrences swap from literal `"Take!"` to `vocab["Take!"]`. **Internal types, API routes, file names stay on the musical names** — that means zero upstream Foolery diff, zero API churn.

Pros:
- ~70 LOC of new code + small per-component edits
- Reversible (toggle to verbose in 1 click)
- Doesn't fight the upstream codebase
- Opens the door to multi-language later (any vocab is a swap-in dictionary)

Cons:
- Two vocabularies to keep in sync (the test catches drift)
- Power users who see the source might find the internal/external mismatch confusing — mitigated by a comment block at the top of `ui-vocab.ts` explaining the choice

### Option C — glossary tooltips, no rename

Keep "Take!" / "Scene!" labels but add a `?` tooltip explaining ("Take = run this task with an agent").

Pros: zero structural change.
Cons: doesn't actually fix the problem. New users still have to learn jargon BEFORE they can act. **Reject — fails the "any knowledge worker" bar.**

### Option D — settings toggle, "plain" is opt-in

Same as B but user has to flip a switch to get plain mode.

Pros: respects existing users (us) who already learned the vocab.
Cons: discovery problem — new users won't find the switch. **Reject — defaults matter.**

**Recommendation: Option B with `plain` as the default.** Internal/API names unchanged. ROADMAP.md keeps the musical metaphor for context. A "verbose" mode is one localStorage toggle away for the brave.

---

## Per-item TDD breakdown

### #0 — Design-system compliance lint (P0)

**Pain.** A handful of components still use off-palette Tailwind utilities (`bg-amber-50`, `text-emerald-600`, `border-zinc-300`) and inline hex codes (`#f4efe6` — legacy warm-paper that the token swap missed because it's literal). Goal: zero off-palette utilities, zero hardcoded non-spanda hex codes in components.

**Test first.** `src/app/__tests__/no-off-palette-utilities.test.ts`:

```ts
// Hermetic. Reads src/ files as text, asserts the off-palette regex
// matches zero times. Allowlist for design-system/reference/** (kept
// for visual reference, not part of the app).
describe("no off-palette Tailwind utilities in app source", () => {
  it("zero (bg|text|border|ring)-(amber|emerald|sky|red|blue|green|...)-N", () => {
    const files = walk("src/components", "src/app").filter(notAllowlisted);
    const offenders: string[] = [];
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      const matches = text.matchAll(OFF_PALETTE_REGEX);
      for (const m of matches) offenders.push(`${f}: ${m[0]}`);
    }
    expect(offenders).toEqual([]);
  });

  it("zero inline hex codes outside the spanda palette + #fff/#000", () => {
    // walks files, extracts /['"]#[0-9a-fA-F]{3,8}['"]/, filters against
    // the spanda hex allowlist
    // expect zero offenders
  });
});
```

Then implement: replace each offender by hand. The audit surfaced ~11 utility occurrences in 2-4 files; ~4 inline `#f4efe6` calls. **Total: a 30-minute mechanical pass.**

**Ship gate.** Test green; `bun run lint && test && tsc && build` green; ship runtime; spot-check the two diagnostics cards visually.

---

### #1 — Workflow profiles (P0)

**Pain.** Every bead lands in autopilot's 15-state lifecycle. "Call with Khilan" sits between Plan Review and Shipment columns. Nonsensical.

**Test first.** `src/lib/__tests__/workflows-spanda-profiles.test.ts`:

```ts
describe("BUILTIN_PROFILE_CATALOG: spanda profile set", () => {
  it("includes 'code' (renamed autopilot_no_planning)", () => { ... });
  it("includes 'coord' with states scheduled→done", () => { ... });
  it("includes 'followup' with waiting→nudged→escalated→done", () => { ... });
  it("includes 'decision' with deciding→decided→executed/dropped", () => { ... });
  it("descriptorFromProfileConfig respects customStates for each", () => { ... });
});

describe("resolveProfileForBeat: label-based routing", () => {
  it("work:code → code", () => { ... });
  it("work:coord → coord", () => { ... });
  it("work:followup → followup", () => { ... });
  it("work:decision → decision", () => { ... });
  it("no work: label → code (default)", () => { ... });
  it("two work: labels → FOOLERY DISPATCH FAILURE", () => { ... });
});
```

**Impl.** `src/lib/workflows.ts` (extend `BuiltinProfileConfig` with `customStates / customTerminal / customInitial`; teach `buildStates()` to honor them; add 3 new entries). `src/lib/workflows-runtime.ts` (new `resolveProfileForBeat`). `src/lib/profile-defaults.ts` (wire routing in).

**Ship gate.** All tests green. Create 4 throwaway beads (one per work-type label), refresh app, confirm each shows in its own column set with no orphan columns.

---

### #2 — Label filter (P0)

**Pain.** Can't isolate `work:ic` from `work:coord` in the UI.

**Test first.** `src/components/__tests__/filter-bar-labels.test.tsx`:

```ts
describe("FilterBar: label filtering", () => {
  it("renders one checkbox per unique label in the current beat set", () => { ... });
  it("selecting work:code filters out coord and followup beats", () => { ... });
  it("selecting two labels uses OR semantics", () => { ... });
  it("URL state persists across navigation", () => { ... });
  it("clearing all checkboxes restores the full list", () => { ... });
});
```

**Impl.** `src/components/filter-bar.tsx` (checkbox group); `src/stores/filter-store.ts` (Zustand state); URL sync via `useSearchParams`.

---

### #3 — Today view (P0)

**Pain.** No date-based slice. Mornings need a bookmarkable URL.

**Test first.** Two test files:

`src/app/today/__tests__/page.test.tsx` (pure logic):

```ts
describe("getTodayBeats: filter logic", () => {
  it("includes beats due today", () => { ... });
  it("includes P0/P1 beats with status=ready (regardless of due)", () => { ... });
  it("includes in_progress beats", () => { ... });
  it("excludes beats due tomorrow or later", () => { ... });
  it("excludes closed beats", () => { ... });
  it("sorts by priority then due-date", () => { ... });
});
```

`src/app/today/__tests__/render.test.tsx` (storybook+vitest snapshot):

```ts
describe("TodayPage rendering", () => {
  it("renders sage canvas (no lifecycle columns)", () => { ... });
  it("renders one card per filtered beat", () => { ... });
  it("renders empty state when no beats today", () => { ... });
  it("groups by work-type label (code / coord / followup / decision)", () => { ... });
});
```

**Impl.** New `src/app/today/page.tsx` (server component reading bd via backend port); `src/components/today-list.tsx` (card-grid using the spanda design-system tokens — sage canvas, white cards, no lifecycle columns). Update `~/personal-os/.claude/skills/daily-dashboard-synth/SKILL.md` so the daily HTML link points at `/today`.

---

### #4 — Quick capture + inline edit (P0)

**Pain.** Must shell out to `bd create` to add a bead; must `bd update` to edit. Breaks flow.

**Test first.** Two files:

`src/components/__tests__/quick-capture-modal.test.tsx`:

```ts
describe("QuickCaptureModal", () => {
  it("opens on '/' keypress when no input is focused", () => { ... });
  it("does NOT open on '/' when typing in an input", () => { ... });
  it("submits POST /api/beats with the form data", () => { ... });
  it("validates acceptance criteria inline; rejects missing", () => { ... });
  it("ESC closes; click outside closes; focus-trap on tab", () => { ... });
});
```

`src/components/__tests__/inline-edit.test.tsx`:

```ts
describe("InlineEditField", () => {
  it("renders as plain text by default", () => { ... });
  it("becomes contenteditable on click", () => { ... });
  it("saves on blur via PATCH /api/beats/:id", () => { ... });
  it("reverts on ESC", () => { ... });
});
```

**Impl.** New `src/components/quick-capture-modal.tsx` (Radix Dialog primitive); new `src/components/inline-edit-field.tsx`; register the `/` shortcut in `src/app/layout.tsx`.

---

### #6 — Vocabulary translation (P0)

**Pain.** Beat / Take / Scene / Setlist / ReTakes are foreign to non-developers.

**Test first.** `src/lib/__tests__/ui-vocab.test.ts`:

```ts
describe("ui-vocab", () => {
  it("plain mode maps Take! → Run", () => { ... });
  it("plain mode maps Beat → Task and Beats → Tasks", () => { ... });
  it("plain mode maps Setlist → Plan board", () => { ... });
  it("verbose mode preserves all originals", () => { ... });
  it("missing key falls back to the input string (fail-soft)", () => { ... });
});

describe("ui-vocab snapshot", () => {
  it("plain vocab has the exact set of 17 keys", () => {
    // protects against drift; if a new internal name lands, this test
    // fails until you add it to the vocab too
  });
});
```

`src/components/__tests__/ui-strings-no-direct-vocab.test.tsx` (architectural test):

```ts
describe("no JSX uses raw musical vocab", () => {
  it("zero literal 'Take!' / 'Scene!' / 'Beat' / 'Setlist' / 'ReTakes' in src/components/*.tsx", () => {
    // grep src/components/ for the regex; allowlist src/lib/ui-vocab.ts
    // expect zero offenders
  });
});
```

**Impl.** New `src/lib/ui-vocab.ts` + `src/hooks/use-vocab.ts`. Swap ~17 inline strings across ~8 components to call `useVocab()`.

---

### #8 — Stale beads (P0)

**Pain.** w9o has been in_progress since Feb. Nothing flags it. Stale grooming pool is empty.

**Test first.** `src/components/__tests__/stale-badge.test.tsx`:

```ts
describe("StaleBadge", () => {
  it("renders 'stale Nd' when updated_at > 7 days ago", () => { ... });
  it("renders nothing when updated_at < 7 days ago", () => { ... });
  it("renders nothing on closed beads regardless of age", () => { ... });
  it("uses --color-warning-pale background and --color-warning-content text", () => { ... });
});
```

**Impl.** Badge cell in `src/components/beat-table-columns.tsx`. Settings change to `~/.config/foolery/settings.toml`: `[pools.stale_grooming]` populated with claude. (Pool config is one-time, not in the fork — script it via `spanda init` later.)

---

### P1 — Telegram intake + Take-complete notify

Cross-repo. Hermes-side adds `~/.hermes/webhooks/telegram-intake.py` that creates beads via `bd create --no-lint --labels work:capture`. Spanda-side adds a hook to `src/hooks/use-terminal-stream.ts` that fires `fetch` on terminal complete to a Hermes endpoint that DMs Telegram.

Tests on both sides (signature validation, idempotency, fail-soft when webhook URL absent — notification is opt-in so this is the rare NOT-fail-loudly case).

### P2 — Onboarding `spanda init`

Bash CLI. `scripts/spanda-init.sh --target $HOME/.config/foolery/settings.toml` writes a template TOML with claude pool + personal-os repo + default profile. Manual test in `scripts/__manual_tests__/spanda-init.test.sh` confirms dry-run produces valid TOML.

---

## Branch + commit strategy

Each item ships as its own commit on `spanda/design-system` (the branch we're already on). Per the TDD discipline locked in ROADMAP.md:

1. Write the failing test (red).
2. Implement the smallest change (green).
3. Refactor with the test as net.
4. Run `bun run lint && test && tsc --noEmit && build` — all four green.
5. Commit (test + impl together, descriptive message).
6. Run `bash scripts/ship-spanda.sh` if it's a runtime-affecting change.

After each P0 item lands, refresh `https://foolery.onyourdevice.ai` and walk the user surface to spot any visual regression. If clean, move to the next item.

## Phase 2 ship gate

All seven P0 items shipped, full suite green, app live with:
- coord/followup/decision beads rendering with their own column sets
- label-checkbox filter working in filter-bar
- `/today` route loads and reflects the day's actionable set
- Press `/` anywhere opens quick-capture; click a title → inline edit
- No "Take!" / "Scene!" / "Beat" labels visible — all read "Run" / "Plan it" / "Task"
- Beads not updated in 7+ days show a "stale Nd" badge
- Diagnostics cards render in spanda palette (no zinc/stone/amber leakage)

P1 and P2 follow after the P0 set proves itself for a week of real use.

## What to do RIGHT NOW

1. **Approve the brainstorm picks** (Option D for #1, Option B for #6) or push back on them.
2. I start item #0 (DS compliance lint) — smallest, lowest risk, sets up the test pattern.
3. Then #1 (workflow profiles) — the biggest semantic unlock.
4. Items #2, #3, #4, #6, #8 in priority order, each one shipped before the next starts.

If you want to re-order, say so. Otherwise I begin with #0.
