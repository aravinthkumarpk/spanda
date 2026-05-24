---
name: spanda-design
description: Use this skill to generate well-branded interfaces and assets for spanda, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file at the root of this skill, then **read `DESIGN.md`** for the structured token reference (colors with OKLCH, scale ratios, motion, components, anti-patterns), and **read `WRITING.md`** for the writing rules every word of spanda copy must follow (Amazon-style data-driven prose + stop-slop discipline + humanizer banlist). Then explore the other available files (`colors_and_type.css`, the `preview/` cards, the `ui_kits/spanda/` recreation, the `assets/`).

**What spanda is.** A keyboard-first multi-agent control room for software work. Operators stage *beats* (units of work), arrange them into dependency-aware *waves* (a *setlist*), and *dispatch* agent CLIs (Claude, Codex, Copilot, Gemini, OpenCode) to take each beat. The product domain is musical / theatrical: *beats, waves, setlists, takes, retakes, scenes, capsules*. Lean into that vocabulary.

**Visual language, heavily Wise-inspired.**
- Single brand accent: lime green `#9fe870`. Don't introduce a second.
- Sage canvas `#e8ebe6` as the page background, white `#ffffff` cards on top, surface contrast IS the elevation.
- Near-black ink `#0e0f0c` with a hint of olive warmth for text + hairlines.
- Type: **Manrope at weight 900** for display (substitute for the proprietary Wise Sans), **Inter** at 600/400 for sub-display and body, **IBM Plex Mono** for terminal output only.
- Geometry: `24 px` radius on every button and card. The pill geometry is non-negotiable.
- Spacing on a 4-px grid: `2 · 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`.

**Brand mark.** The two-dot pearl, a dark pearl body with two lime-green observing "eyes". It evokes spanda's meaning (the eternally-alive, pulsating presence) and reads as a calm AI/agent observer. See `assets/spanda_mark.svg`, `spanda_mark_flat.svg`, `spanda_icon.svg`, `spanda_lockup.svg`. The wordmark is "spanda" in Manrope 900, clean type, no embedded glyph (the eyes live in the mark, not in the type).

**If creating visual artifacts (slides, mocks, throwaway prototypes):**
- Copy `colors_and_type.css` out and `<link>` it from your HTML, every token your design references should resolve through CSS custom properties from it.
- Copy any `assets/*.svg` you need into your output folder. Don't reference across folders.
- Reference the UI kit at `ui_kits/spanda/` for the canonical recreations of: app header, queues table, setlist wave grid, overview kanban, beat detail, take-a-beat card, terminal panel.
- Use **Lucide** icons throughout (CDN: `https://unpkg.com/lucide@latest/dist/umd/lucide.min.js`). Stroke-width 2, sized to match adjacent text. Never use emoji for UI affordances.

**If working on production code in the live spanda repo (`aravinthkumarpk/spanda`):**
- The codebase ships with an earth-tone palette (clay / paper / ink / moss); this design system overrides that with the Wise-inspired direction on purpose. Confirm with the user before applying.
- shadcn primitives at `src/components/ui/` should keep their structural API; only the CSS variables in `src/app/globals.css` change.
- The full token mapping lives in `colors_and_type.css` here, port it into the `@theme` block.

**If the user invokes this skill without other guidance**, ask them what they want to build or design, ask focused questions (audience, surface, fidelity, breadth), and act as an expert designer who outputs HTML artifacts *or* production code depending on the need. Default to one round of clarifying questions before building.

**Don't:**
- Don't introduce a second brand accent.
- Don't render hero copy in weight 700 or lighter.
- Don't render CTAs as sharp rectangles.
- Don't pair the green CTA with a green background.
- Don't repurpose `#9fe870` as a "success" indicator, `#2ead4b` is the success green.
- Don't use emoji for UI affordances.
- Don't replace the spanda product vocabulary (beats / waves / setlist / takes) with generic words ("tasks", "phases", "sessions"). The naming is intentional.

---

## Writing rules (every word you produce for spanda)

**Read `WRITING.md` before producing any prose.** It is the canonical writing guide and fuses three rulebooks:

- **Amazon house style**: absolute dates, absolute references, correct units, no jargon, no weasel words, sources for every number, no peacock words, data-driven, concise.
- **Stop-slop**: active voice, named actor, no adverbs, no Wh- starters, no binary contrasts, no false agency.
- **Humanizer**: AI vocabulary banlist (delve, vibrant, testament, showcase, leverage, etc.), no em-dashes, no curly quotes, no chatbot artifacts.

The three-rule summary:

1. **Be specific.** Numbers, dates, units, names. Never vague.
2. **Be direct.** Active voice. Subject does verb. Cut every adverb.
3. **Be honest.** No peacocks, no weasels.

Before delivering any non-trivial prose, run the audit:

> "What makes the below so obviously AI-generated?"

Answer with the remaining tells, then revise once more.

---

**Source.** This skill is built from the `aravinthkumarpk/spanda` codebase. For deeper context, read its `TAXONOMY.md` (the canonical glossary) and `ARCHITECTURE.md`.
