# spanda Design System

> **spanda**, Sanskrit for *vibration, pulse, the eternally-alive spark*.
> The keyboard-first control room for multi-agent software work, dressed in a calm Scandinavian-magazine voice.

This folder is a portable design system for **spanda**, the multi-agent orchestration UI sourced from the `aravinthkumarpk/spanda` codebase (internally known as **Foolery**). The visual language is **heavily inspired by Wise**: lime-green CTA, sage-tinted canvas, near-black ink, generous pill-rounded geometry, and a two-face display stack (Manrope at weight 900 in place of Wise's proprietary *Wise Sans*, paired with Inter for sub-display and body).

---

## What is spanda?

spanda sits *above* individual git repositories and gives a single operator surface for agent-driven software work. The product takes loose intent, breaks it into **beats** (units of work), stages them into dependency-aware **waves**, **dispatches** an agent CLI (Claude, Codex, Copilot, Gemini, OpenCode) to take each beat, and routes finished work through review lanes.

Core surfaces:

| Surface | What it is |
|---|---|
| **Setlist** | Wave-and-step Gantt-style execution plan. The view that defines the product. |
| **Overview** | Portfolio-wide kanban: every repo's beats by workflow state. |
| **Queues** | The default list view. Ready beats, filterable, keyboard-bulk-editable. |
| **Active** | Beats with a live agent session attached. |
| **Escalations** | Approval gates and human-action queue. |
| **ReTakes** | Review lane for shipped beats, agents inspect what changed. |
| **History** | Past agent sessions with full conversation logs. |
| **Diagnostics** | Runtime perf + lease health. |
| **Terminal panel** | The persistent docked xterm.js panel streaming agent stdout. |

Read [TAXONOMY.md](https://github.com/aravinthkumarpk/spanda/blob/main/TAXONOMY.md) in the source repo for the full vocabulary (*Beats / Knots / Beads / Waves / Scenes / Takes / Capsules / Leases / Profiles*), it's the single best primer on what each screen is for.

---

## Sources

This design system was built from:

- **GitHub:** [`aravinthkumarpk/spanda`](https://github.com/aravinthkumarpk/spanda), the live Next.js 16 / React 19 / Tailwind 4 codebase. Component source-of-truth lives in `src/components/`. The shadcn UI primitives are at `src/components/ui/`.
- **Docs:** the repo's `README.md`, `TAXONOMY.md`, and `ARCHITECTURE.md`. Explore those for the deeper conceptual model.
- **Reference screenshots:** `reference/screenshots/` (Overview, Queues, Setlist, Hot Keys). Captured from the running app, useful as a layout reference but **note**: those screenshots show the codebase's current *earth-tone* palette (clay / paper / ink / moss), not the Wise-inspired palette this design system specifies. **This design system overrides the existing palette on purpose.**

**To go deeper:** browse the source repo and look at `src/components/queue-table.tsx`, `src/components/setlist-view.tsx`, `src/components/beat-state-overview-matrix.tsx`, and `src/components/app-header.tsx` for the canonical component shapes.

---

## Index

| Path | What it is |
|---|---|
| `README.md` | This file. Brand context + visual + content + iconography fundamentals. |
| `DESIGN.md` | Structured tokens + design decisions (impeccable house format). Single source of truth for OKLCH, scale ratios, anti-patterns. Read this before coding. |
| `WRITING.md` | The writing guide for spanda copy. Amazon-style + stop-slop + humanizer fused into one rulebook. Read this before producing any prose. |
| `SKILL.md` | Agent-skill manifest. Lets Claude Code load this whole folder as a portable skill. |
| `colors_and_type.css` | Single source of truth for color, type, spacing, radii, motion tokens. |
| `assets/` | spanda wordmark / mark / icon SVGs. |
| `reference/` | Original screenshots from the live app (earth-tone palette, for layout reference only). |
| `preview/` | Small HTML specimen cards used by the Design System tab. |
| `ui_kits/spanda/` | High-fidelity React/JSX recreation of the spanda product surfaces. |
| `ui_kits/spanda/index.html` | Interactive click-thru prototype showing Overview → Queues → Setlist → Beat detail. |

---

## Visual Foundations

### Palette philosophy

The brand reads more like a calm Scandinavian magazine than a developer tool. Three colors carry the identity:

1. **Lime green `#9fe870`**, the only accent in the system. Every primary action, the mark, the active-tab fill, the "Take!" pill, all the same green. **There is no second accent.** Don't introduce one. If you want emphasis, use the green or shift to ink-black; never invent another hue.
2. **Sage canvas `#e8ebe6`**, the page background. White cards sit on top of it and the contrast IS the elevation. Never use a hard shadow where a sage-to-white surface transition would do.
3. **Near-black ink `#0e0f0c`**, used for text, hairline borders, the dark hero. It has a hint of olive warmth (it is not pure `#000`); pure black reads cold next to the sage.

Semantic colors (positive green, warning yellow, negative red) are reserved for **in-product status only**, never repurpose `#9fe870` Wise green as a "success" indicator because it IS the brand CTA. The semantic positive `#2ead4b` is a deeper, less-saturated green precisely so it doesn't compete.

### Typography

Two faces, strictly separated:

- **Display**, Manrope at weight 900 (substituting Wise's proprietary *Wise Sans*). Reserved for hero headlines, big numbers, the wordmark. Scales: 126 / 96 / 64 / 40 px. Never lighter than 900 on a display line.
- **Sub-display + body**, Inter at weight 600 for section headings, weight 400 for body and form labels.
- **Terminal / code**, IBM Plex Mono, used in the docked terminal panel and inline code spans only.

The contrast between the heavy proprietary display and neutral Inter is what carries the brand's typographic voice. Don't substitute a system sans for either role.

### Layout

- **Spacing** is a 4-px grid: `2 · 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`.
- **Container** centres at ~1200 px on desktop.
- **Section padding** uses `48 px` top/bottom for marketing bands; in-product views use `24 px` interior card padding.
- **Hero layout** is split: heavy headline left, primary input widget (in spanda's case, the *Take a Beat* / quick-add card) right. Stacks on mobile.

### Backgrounds & imagery

The brand uses backgrounds *minimally*. There are **no gradients**, no full-bleed photography on marketing surfaces, no decorative textures. The only backgrounds are:

- `canvas-soft` sage (page)
- `canvas` white (cards)
- `ink` near-black (the polarity-flipped hero / footer / terminal panel)
- `primary-pale` `#e2f6d5` (badge backgrounds, positive surfaces)

If imagery appears at all, it's product mockups inside cards (e.g. a screenshot of the Setlist view rendered inside a sage-card surrogate). No stock photography, no hand-drawn illustrations.

### Borders, shadows, elevation

- **Hairline borders** are `1 px solid #0e0f0c`, full ink, no opacity. Used on inputs, tertiary outline buttons, and the *currency-converter-style* primary widget. The hairline is sharp and intentional.
- **Soft borders** for in-product list separators use `rgba(14,15,12, 0.10)` at 1 px.
- **Shadows are rare** on the marketing surface, surface contrast carries elevation. In-product (popovers, toasts, modals, dropdowns), use the warm-tinted `--shadow-md` / `--shadow-lg` tokens.

### Hover / press states

- **Primary green button**, hover lightens to `#cdffad` (`--color-primary-active`). No size change, no shadow lift.
- **Secondary sage button**, hover shifts the sage one step deeper to `--color-canvas-sage-deep` `#d8dcd3`.
- **Tertiary outline button**, hover fills the white interior with `--color-canvas-soft` sage.
- **Press states** never use scale-shrink. They darken the fill by one step.
- **Icon buttons**, hover lifts opacity from 0.85 → 1.0. No background change.

### Animation

The brand is *quiet*. Three durations only: `140 ms` (instant feedback), `220 ms` (default transitions), `360 ms` (panel slides, large state changes). Easing is almost always `ease-out` (`cubic-bezier(0.22, 0.61, 0.36, 1)`). No bounces. No springs. No long fades. Respect `prefers-reduced-motion` and disable everything past basic opacity.

### Corner radii

The 24 px radius is the friendliness cue.

| Token | Value | Use |
|---|---|---|
| `radius-sm` | `8 px` | Small inline pills (priority tags, ID chips). |
| `radius-md` | `12 px` | Form inputs, small chrome. |
| `radius-lg` | `16 px` | Mid-size containers. |
| `radius-xl` | **`24 px`** | **Canonical button and card radius.** Generous. Non-negotiable on CTAs. |
| `radius-pill` | `9999 px` | Status pills, badges. |

The `24 px` pill-rectangle on buttons and cards is the friendliness cue. Sharp corners are *never* used on UI elements. If something looks too friendly, scale it up, but don't sharpen the corner.

### Cards

Cards are universally `radius-xl` (24 px), pill-rounded. Two flavors:

- **`card-content`**, white interior, sits on sage canvas. No border, no shadow. The most common card.
- **`card-feature-sage`**, sage tint on sage canvas (used for grouping). Subtle.
- **`card-feature-green`**, `primary-pale` `#e2f6d5` interior. Used to flag the positive / promotional moments.
- **`card-feature-dark`**, `ink` `#0e0f0c` interior with lime-green text. Used for polarity-flipped promotional cards.
- **`currency-converter-card`** (called `take-a-beat-card` in spanda), white card with a `1 px solid #0e0f0c` hairline border. The primary input widget on the hero.

---

## Content Fundamentals

### Voice

spanda speaks like someone who knows the system and respects your time. The voice is:

- **Direct, never breathy.** "Take a beat." "Run a scene." Not "Let's go on a journey together."
- **Plain present-tense verbs.** "Stage", "dispatch", "rollback", "settle". No "kickstart", "leverage", "unlock".
- **You-addressed.** Marketing copy talks to the operator: "*See what's queued, what's active, what's done.*" Never "we" or "our users".
- **No exclamation marks** except where they're part of an action name (e.g. **Take!**, **Scene!**, these are domain verbs from the codebase taxonomy).
- **Lowercase for the brand.** "spanda" is lowercase everywhere. Never `Spanda` mid-sentence; never `SPANDA`.

### Specific patterns from the source

- Surface names are single nouns: **Setlist**, **Queues**, **Active**, **ReTakes**, **History**.
- Action verbs are imperatives ending with `!`: **Take!** (start single-beat session), **Scene!** (start multi-beat orchestration), **Close**, **Rollback**.
- Domain vocabulary is musical / theatrical: *beats, waves, setlists, takes, retakes, scenes, capsules*. **Use it.** Don't blunt it back into "tasks", "phases", "sessions". The naming is intentional and distinctive.
- Status copy is plain English: "Ready for planning", "Ready for implementation review", "Shipped". Never "🟢 Planning Phase Initiated".

### Casing

- **Sentence case** for headings, buttons, and labels. Not Title Case.
  - ✅ "Ready for planning"
  - ❌ "Ready For Planning" (this appears in screenshots but is incorrect per the spec, fix in product)
- **ALL CAPS** is reserved for tiny eyebrow labels in tables ("PRIORITY", "STATE", "ACTION") and Wave headers ("WAVE 1", "WAVE 2"). Use `letter-spacing: 0.08em` and the caption type size.
- **Code identifiers** (beat IDs like `maestro-927e`, agent labels like `claude-opus-4.7`) stay in monospace at their literal casing.

### Emoji

spanda **does not use emoji** for UI affordances. Iconography is handled by the Lucide icon set (see ICONOGRAPHY below). The one exception: agent CLI labels may render the agent's provider mark (Claude, GPT, Gemini, Copilot, OpenCode) inline, those use the provider's official wordmark glyph, not an emoji.

### Tone examples

- ✅ "Capture work, break it down, dispatch agents, review what they did."
- ✅ "Stop crashing on AWS." (Wave 1 title, concise and concrete)
- ✅ "VERIFY: First automated Tue-Sat production run completes end-to-end" (beat title, imperative + specific)
- ❌ "Empower your team to ship faster with AI 🚀"
- ❌ "Discover the magic of multi-agent orchestration"

---

## Iconography

spanda uses the **[Lucide](https://lucide.dev)** icon set throughout, same set the underlying codebase pulls in via `lucide-react` (see `package.json`). All icons in the screenshots (Setlist, Overview, Queues, Active, ReTakes, History, Diagnostics, Add, bell, settings, etc.) are Lucide.

**Rules:**

- **Stroke icons only.** Lucide is a 24×24 stroke set with `stroke-width: 2`. Don't mix in filled icon families (e.g. Heroicons solid, Phosphor fill).
- **Match icon stroke to text weight.** Body text at weight 600 pairs with `stroke-width: 2`; lighter body weight pairs with `stroke-width: 1.75`.
- **Color = currentColor.** Icons inherit the surrounding text color. Don't hard-code icon colors, let `--fg-default` / `--fg-muted` carry through.
- **Sizing** snaps to the type scale: 14 px / 16 px / 20 px / 24 px. Icon size = adjacent text size, never larger.
- **Icon-only buttons** must include an `aria-label`. Hit target is 40 px square minimum, even though the visual icon is smaller.

**Loading.** For HTML mocks, link Lucide from CDN (no local font/sprite needed):

```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<i data-lucide="play" class="size-4"></i>
<script>lucide.createIcons();</script>
```

**Emoji and Unicode glyphs** are not used for status, navigation, or affordances. If you find yourself reaching for "✅" or "🔥" or "→", use the equivalent Lucide icon (`check`, `flame`, `arrow-right`).

**The spanda mark** itself (`assets/spanda_mark.svg`) is a *two-dot pearl*: a dark pearl body with two lime-green observing "eyes" and a soft green aura. It reads as a calm, attentive presence, the eternally-alive observer that spanda's name evokes. The mark has four roles:

| Asset | Use |
|---|---|
| `spanda_mark.svg` | Primary mark, pearl with gradient + aura. Use on light surfaces. |
| `spanda_mark_flat.svg` | Flat version, no gradients. Favicons, mono-color contexts, dense grids. |
| `spanda_mark_light.svg` | Inverted (light pearl, ink eyes). Use on dark surfaces. |
| `spanda_icon.svg` | 32 px rounded-square app icon. |
| `spanda_lockup.svg` | Mark + wordmark lockup. Use anywhere both are needed (app bar, hero). |
| `spanda_wordmark.svg` | Wordmark only, "spanda" in Manrope 900. No embedded glyph; the eyes live in the mark, not the type. |

---

## Do's and Don'ts

### Do
- Reserve `#9fe870` for every primary CTA. The lime-green pill is what users click.
- Set hero headlines in Manrope 900 at 64 px+ scales. Never lighter.
- Use `24 px` for buttons and cards. The generous radius is what makes the system read friendly.
- Cycle surfaces sage → white → sage. Surface contrast IS elevation.
- Use the full semantic palette for in-product status (positive green / warning yellow / negative red).
- Keep agent names monospace and literal (`claude-opus-4.7`, not "Claude Opus").

### Don't
- Don't introduce a second brand accent. Lime green is the only identity color.
- Don't render hero copy in weight 700 or lighter.
- Don't render CTAs as sharp rectangles.
- Don't pair green CTA with a green background.
- Don't replace Manrope 900 with a generic geometric sans for hero typography.
- Don't repurpose the brand lime as a "success" indicator, `#2ead4b` is the success green.
- Don't add emoji for UI affordances.

---

## Font substitutions, please verify

**Wise Sans is proprietary.** This design system uses **Manrope at weight 900** as the closest open-source substitute (geometric, heavy, available on Google Fonts). Manrope reads slightly more humanist than the original Wise Sans, and the cap-height geometry is a touch narrower.

> **🟡 Ask the user:** if you have access to the proprietary spanda display face (or licensed Wise Sans, or a custom display face you'd like me to use instead), drop the `.woff2` files into `assets/fonts/` and tell me the family name, I'll swap the `--font-display` token to point at it.

Inter is open-source and matches the spec.

---

## How to use this design system

If you're a designer or agent building for spanda:

1. **Always** import `colors_and_type.css` first. Every token your design references should resolve through CSS custom properties from that file.
2. **Reference the UI kit** at `ui_kits/spanda/index.html` before building any new view, the existing components cover ~90% of cases.
3. **Read TAXONOMY.md in the source repo** before naming anything new. Don't invent words that already exist in the domain.
4. **When in doubt, copy.** The visual vocabulary is finite and intentional. Lifting an existing pattern is better than inventing.
