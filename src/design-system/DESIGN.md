# DESIGN.md

> The structured token + decisions doc for **spanda**.
> Companion to `README.md` (which carries brand voice + product context).
> This file follows the *impeccable* skill's house format so any LLM tool that loads it gets the same shape on every project.

---

## Register

**product**

spanda is a working tool, not a marketing surface. Every decision below serves the operator looking at queues, dispatching agents, reviewing setlists. Design serves the product; design is not the product.

## Color strategy

**Restrained** (impeccable scale: Restrained → Committed → Full palette → Drenched).

One saturated accent (spanda lime) carries less than 10% of any surface. Everything else is tinted-toward-warm neutrals (sage canvas, near-black ink, warm grays). This is the right strategy for a control-room product: the operator looks at it for hours; the lime needs to mean something, not be wallpaper.

If you find the lime carrying more than ~10% of pixels on a given view, you have over-decorated. Strip back.

## Theme

**Light, in a 9-to-5 office, on a 27-inch monitor, at noon, with the operator focused for hours.**

That sentence forces the answer. Dark mode is not the default for spanda even though dev tools tend to go dark. The operator is reviewing structured work, not staring at code. Sage + ink reads calm in ambient daylight; black-on-near-black would fight the eye. Dark mode exists only for the terminal panel (where the operator IS reading code output).

## Palette

All values pre-computed in OKLCH for tonal math; hex stays as the wire format consumers use.

### Brand & accent

| Token | Hex | OKLCH | Use |
|---|---|---|---|
| `--color-primary` | `#9fe870` | `oklch(0.873 0.193 132.5)` | Universal CTA, brand mark eyes, active tab fill. |
| `--color-primary-active` | `#cdffad` | `oklch(0.953 0.135 135.9)` | Hover / active lift on primary. |
| `--color-primary-neutral` | `#c5edab` | `oklch(0.890 0.110 132.4)` | Neutral active fill (selected row). |
| `--color-primary-pale` | `#e2f6d5` | `oklch(0.948 0.068 132.0)` | Soft surface tint, positive badge bg. |

The lime sits at chroma 0.193, below the OKLCH gamut ceiling for sRGB green at L=0.87. It reads vivid without acid. Hover (`primary-active`) and pale (`primary-pale`) walk down chroma as lightness climbs, the curve impeccable specifies for high-lightness neutrals.

### Surface

| Token | Hex | OKLCH | Use |
|---|---|---|---|
| `--color-canvas` | `#ffffff` | `oklch(1 0 0)` | Card interiors only. The only neutral that isn't tinted; reserved for the highest-priority content surfaces. |
| `--color-canvas-soft` | `#e8ebe6` | `oklch(0.924 0.005 130)` | Page background. Tinted toward the brand hue (very faint green). |
| `--color-canvas-sage-deep` | `#d8dcd3` | `oklch(0.870 0.006 130)` | Pressed sage / divider on sage. |

> **impeccable check**: pure `#ffffff` is technically out of the "tint every neutral" rule. We keep it because the Wise-inspired contrast trick is *white-card-on-sage-canvas*; tinting the card breaks the elevation cue. The sage canvas is tinted, which carries the brand hue. This is an intentional exception, documented here so it doesn't drift.

### Ink (text)

| Token | Hex | OKLCH | Use |
|---|---|---|---|
| `--color-ink` | `#0e0f0c` | `oklch(0.143 0.006 120)` | Default text + headings. Tinted toward olive warm. Not `#000`. |
| `--color-ink-deep` | `#163300` | `oklch(0.265 0.072 130)` | Deep forest, used on positive surfaces. |
| `--color-body` | `#454745` | `oklch(0.366 0.004 150)` | Secondary body. |
| `--color-mute` | `#868685` | `oklch(0.585 0.001 100)` | Captions, placeholder, fine print. |

The ink-to-body-to-mute walk is a clean lightness staircase: 0.143 → 0.366 → 0.585. Roughly 1.5x lightness ratio between each step, well past impeccable's 1.25 minimum for hierarchy.

### Semantic

Reserved for in-product status. **Never repurpose the brand lime for "success"**, the semantic positive is a deeper, less saturated green so it doesn't compete with the CTA color.

| Token | Hex | OKLCH | Use |
|---|---|---|---|
| `--color-positive` | `#2ead4b` | `oklch(0.626 0.184 144)` | Success / shipped state. |
| `--color-positive-deep` | `#054d28` | `oklch(0.310 0.092 152)` | Pressed positive, text on positive surfaces. |
| `--color-warning` | `#ffd11a` | `oklch(0.875 0.171 92)` | Caution. |
| `--color-warning-deep` | `#b86700` | `oklch(0.555 0.143 56)` | Pressed warning. |
| `--color-warning-content` | `#4a3b1c` | `oklch(0.330 0.045 75)` | Text on warning surfaces. |
| `--color-negative` | `#d03238` | `oklch(0.575 0.198 22)` | Destructive / error. |
| `--color-negative-deep` | `#a72027` | `oklch(0.470 0.180 22)` | Pressed destructive. |
| `--color-negative-bg` | `#320707` | `oklch(0.165 0.064 25)` | Dark maroon callout background. |

### Illustrative accents

Reserved for inside cards (pricing illustrations, empty-state imagery). **Never use as a primary surface or CTA.** They exist to add color into illustrations, not the chrome.

| Token | Hex | Use |
|---|---|---|
| `--color-accent-orange` | `#ffc091` | Inside illustrations only. |
| `--color-accent-cyan` | `#38c8ff` | Inside illustrations only. |

## Typography

### Scale ratio

**~1.5** between major steps, **~1.25** between minor steps. Past impeccable's 1.25 minimum for hierarchy.

Step ratios (pixel sizes): 12 / 14 / 16 / 20 / 24 / 32 / 40 / 64 / 96 / 126.

### Faces

| Token | Family | Weight | Role |
|---|---|---|---|
| `--font-display` | Manrope | 900 | Hero, big numbers, brand moments. Substitute for proprietary Wise Sans. |
| `--font-sans` | Inter | 600 / 400 | Sub-display, section headings, body, labels. |
| `--font-mono` | IBM Plex Mono | 400 / 500 / 600 | Terminal panel, inline code, beat IDs, agent labels. |

**Roles are strict.** The display face never goes lighter than 900. The sans face never goes heavier than 600. The two-face contrast is what carries the brand's typographic voice; mixing weights blurs the signal.

### Scale tokens

| Token | px | line-height | weight | letter-spacing | family | use |
|---|---|---|---|---|---|---|
| `display-mega` | 126 | 107 | 900 | -2 | display | Marketing hero ceiling. |
| `display-xxl` | 96 | 82 | 900 | -1.5 | display | Sub-hero. |
| `display-xl` | 64 | 54 | 900 | -1 | display | Standard hero headline. |
| `display-lg` | 47 | 70.5 | 400 | -0.108 | sans | Lighter sub-display (rare). |
| `display-md` | 40 | 34 | 900 | 0 | display | Card / section headlines. |
| `display-sm` | 32 | 38.4 | 600 | -0.96 | sans | Inter-rendered section heads. |
| `display-xs` | 24 | 31.2 | 600 | -0.48 | sans | Sub-section displays. |
| `body-lg` | 20 | 30 | 400 | 0 | sans | Lead paragraphs. |
| `body-md` | 16 | 24 | 400 | 0 | sans | Default body. |
| `body-md-strong` | 16 | 24 | 600 | 0 | sans | Bold inline body. |
| `body-sm` | 14 | 20 | 400 | 0 | sans | Secondary body, table rows. |
| `body-sm-strong` | 14 | 20 | 600 | 0 | sans | Nav links, captions with weight. |
| `caption` | 12 | 16 | 400 | 0 | sans | Fine print. |
| `caption-eyebrow` | 12 | 16 | 600 | 0.08em (caps) | sans | Eyebrow labels above sections. |
| `button-md` | 16 | 24 | 600 | 0 | sans | Button label. |

### Line length

Cap body at **65–75ch**. Hero / display headlines have no cap (they earn breakage on terms).

## Spacing

4-px grid. Same rhythm across the kit: `2 · 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`.

**Vary spacing for rhythm.** Same padding on every container is monotony. The pattern:
- **Hero band**: 48px vertical, 24px horizontal.
- **Content band**: 32px vertical, 24px horizontal.
- **Card interior**: 24px (the default).
- **Compact card** (overview tiles, queue rows): 14px.
- **Form input**: 10/16 (vertical/horizontal).
- **Pill button**: 12/24.

## Radii

| Token | px | Use |
|---|---|---|
| `radius-sm` | 8 | Priority chips, inline pills. |
| `radius-md` | 12 | Form inputs, small chrome. |
| `radius-lg` | 16 | Mid-size containers, terminal tabs. |
| `radius-xl` | **24** | **Canonical button + card radius.** The friendliness cue. |
| `radius-pill` | 9999 | Status pills, tabs, badges. |

Sharp corners (`radius-none`) appear only on full-bleed bands. UI elements always carry a radius.

## Elevation

Surface contrast IS the elevation. Three levels:

| Level | Treatment | Use |
|---|---|---|
| **0 flat** | No shadow, no border. White card on sage canvas; the brightness step IS the lift. | Default cards. |
| **1 hairline** | `1px solid #0e0f0c`. Full-ink hairline. | Inputs, tertiary outline buttons, the take-a-beat card. |
| **2 floated** | `--shadow-lg` (warm-tinted, two-stop). | Popovers, modals, toasts, dropdowns ONLY. Never on inline cards. |

Shadow tokens are warm-tinted (alpha applied to ink, not black), so floated surfaces don't read as cold.

```
--shadow-md: 0 4px 12px -2px rgba(14,15,12,0.08), 0 2px 4px -1px rgba(14,15,12,0.06);
--shadow-lg: 0 12px 32px -8px rgba(14,15,12,0.14), 0 4px 12px -4px rgba(14,15,12,0.08);
```

## Motion

Three durations, one easing.

| Token | ms | Use |
|---|---|---|
| `--dur-fast` | 140 | Hover lifts, button feedback. |
| `--dur-normal` | 220 | Default transitions, tab swaps. |
| `--dur-slow` | 360 | Panel slides, large state changes. |

**Easing**: always `--ease-out` (`cubic-bezier(0.22, 0.61, 0.36, 1)`). No bounce. No elastic. No spring physics. Exponential ease-out on the way out, that's it.

**What never animates**: CSS layout properties (`width`, `height`, `top`, `left`). Only `transform`, `opacity`, `background-color`. If you can't express an animation in those three, redesign it.

**Reduced motion**: respect `prefers-reduced-motion: reduce`. Disable everything past `opacity`.

## Components

Strict subset. New components should compose from these primitives before adding new ones.

### Buttons

- **Primary**, lime fill, ink label, 24px radius, 12/24 padding.
- **Secondary**, sage fill, ink label, same geometry.
- **Tertiary**, white fill, ink label, **1px ink hairline**, same geometry. The hairline is the elevation cue.
- **Dark**, ink fill, lime label. For polarity-flipped moments (CTA on a sage band that already has a lime button elsewhere).
- **Icon-circular**, 40px square hit target, white fill, ink stroke icon, full radius.

### Cards

- **card-content**, white on sage. Default.
- **card-feature-sage**, sage on sage. Subtle grouping.
- **card-feature-green**, `primary-pale` interior. Positive / promotional moments.
- **card-feature-dark**, ink interior, lime text. Polarity flip.
- **take-a-beat-card**, white interior, ink hairline. The primary input widget (spanda's analog to Wise's currency-converter).

### Pills & badges

#### Status chip family

Seven canonical variants. Use these by semantic role; do not invent new ones.

| Variant | Background | Text | Dot? | Use |
|---|---|---|---|---|
| `good` | `--color-primary-pale` `#e2f6d5` | `--color-positive-deep` `#054d28` | yes, `#2ead4b` | Shipped, healthy, on-track. |
| `warn` | `--color-warning-pale` `#fff4cc` | `--color-warning-content` `#4a3b1c` | yes, `#ffd11a` | In-review, blocked-soft, attention. |
| `bad` | `--color-negative-bg` `#320707` | `#fff` | yes, `#d03238` | Blocked, error, regression. |
| `neutral` | `--color-canvas-sage-deep` `#d8dcd3` | `--color-ink` | yes, `#868685` | Deferred, queued, awaiting. |
| `live` | `--color-primary` `#9fe870` | `--color-ink` | yes, `#0e0f0c` | Active agent session. The *only* place lime fills a chip. |
| `outline` | transparent | `--color-ink` | **no** | Plain identifier (priority P3, generic tag). 1px ink hairline. |
| `dark` | `--color-ink` | `--color-primary` `#9fe870` | **no** | Inverted accent on light surfaces. |

**Dot convention.** Include the 7px dot prefix on `good`, `warn`, `bad`, `neutral`, `live`. Omit on `outline` and `dark` (the chip is already chromatically distinct without one).

#### Other pills

- **Priority chip**, radius-sm, mono 12px, semantic background. `P0` red, `P1` warning, `P2` neutral, `P3` outline.
- **Agent chip**, white background, ink hairline, mono 12px, radius-pill. Identity-only.

### Inputs

- **Text input**, white fill, **1px ink hairline**, radius-md, 10/16 padding.
- **Search**, radius-pill, sage fill, no border, leading icon at 14px from left edge.
- **Select**, same as text input, custom chevron at 12px from right edge.

### Navigation

- **Top tabs**, sage container pill, white inactive tabs, **lime active tab**. The lime tab is the only place the brand color appears in chrome that isn't a CTA.
- **App header**, white surface, 1px sage-canvas-deep bottom border. Houses logo + version pill + repo selector + search + utility icons.

### Surfaces

- **Hero band**, sage canvas, 48px vertical padding.
- **Content band**, white, 32px vertical padding.
- **Footer / terminal**, ink, sage text.

### Data tables

Tables sit inside a single white card (`--color-canvas`, `radius-xl`). The header row follows these rules:

- **Background: transparent.** Never a sage-soft fill. A filled header reads as a frozen / sticky pane, which signals a heavy data-grid (Excel, Airtable). spanda tables are not frozen panes; they are flat scrollable lists.
- **Bottom border: 1 px solid `rgba(14, 15, 12, 0.08)`.** A hairline, not the full ink border. This anchors the header to the rows below without making it visually heavy.
- **Typography: caption-eyebrow** (12 px / 16 px / weight 600 / uppercase / `letter-spacing: 0.08em` / `--color-mute`).
- **Padding: 12 px vertical, 18 px horizontal** (same horizontal as body rows, slightly tighter vertical).
- **Position: inside the table card**, not floating above it. Treat the header as the first row of the card, divided by hairline from the data rows.

Body rows use `body-sm` (14 px / 20 px), 14 px vertical padding, `1 px solid rgba(14, 15, 12, 0.07)` between-row hairlines. Hover state: `--color-hover-sage` `#f5f7f3` (a step lighter than the page sage; reads as a lift, not a flatten). Last row has no bottom border.

**Empty cells use `·` (middle dot)**, never `—` (em-dash is banned per `WRITING.md`). Wrap in `<span class="empty">·</span>` with `color: var(--color-mute)`.

**Layout**: use CSS Grid with `minmax(0, 1fr)` on flexible columns so long titles can ellipsis-truncate instead of forcing overflow. Never flex-row with `flex-shrink: 0` on label cells; chip widths drift across siblings and summaries stop lining up. Grid `max-content 1fr` is the right primitive for label/text row lists.

The result reads as a quiet caption row above a flat list, not a sticky frozen pane above a heavyweight data grid.

## Anti-patterns

From impeccable's bans plus spanda-specific traps. **Never ship these.**

- **Side-stripe borders.** No `border-left: 4px solid <color>` on cards or alerts. Use full borders, background tints, or leading priority chips.
- **Gradient text.** No `background-clip: text` on headlines. The display face does its own work.
- **Glassmorphism as default.** No backdrop-blur on regular cards. Reserve for translucent overlays (rare).
- **The hero-metric template.** Big number + small label + supporting stats + gradient accent. SaaS cliché. If we ever need a stat callout, build it differently.
- **Identical card grids that aren't kanbans.** Same-sized cards with icon + heading + text, repeated endlessly. *(Note: the Overview kanban IS an identical-card grid, on purpose, that's a kanban affordance, not a content-collection trope.)*
- **Modal as first thought.** Beat detail is a lightbox, yes, but it earns the modal: it's a focus surface, not a confirmation. Confirmations should be inline pills, not modals.
- **Em dashes in copy.** Use commas, colons, semicolons, parens, or periods. `--` is also banned.
- **Lime as background for lime CTA.** The CTA needs a neutral host.
- **Display face below weight 900.** No exceptions.
- **Replacing brand lime with another color "for variety."** There is one accent. There is always one accent.

## AI-slop reflex checks

From impeccable's category-reflex test:

- **First-order trap**: "agent orchestration tool → dark blue, terminal-themed, monospace everything." We reject this by going light + sage + display sans.
- **Second-order trap**: "AI tool that's not dark-blue → editorial-typographic with serif headings on cream." We reject this by going *geometric-heavy* (Manrope 900) rather than editorial-elegant.

The current direction (Wise-inspired retail-fintech aesthetic on a developer tool) is the intentional third-order move: it borrows from a category nobody else in the agent-tools space is borrowing from.

## Voice (cross-reference)

The full writing guide lives in `WRITING.md`. One-line summary for this file: **calm and direct, plain present-tense verbs, single-noun surface names, lowercase brand, no exclamation marks except in domain action names (`Take!`, `Scene!`), no emoji for affordances, no peacocks, no weasels.**

### Charts & data viz

- **Sparkline colors map to series semantics, never to brand lime.** Reserve `--color-primary` for *fills and points on the hero chart only*. For line series, use ink for the primary track, positive for affirmative trends, mute for secondary tracks. Examples in current product: cart line → ink, dispute line → positive, subscription line → mute.
- **Confidence bars**: 60 px sage track (`--color-canvas-soft`) with positive fill for strong signal, warning fill for weak signal. Bar height 6 px, radius-pill.

### Eyebrow with lime tick

The canonical section eyebrow above a content band:

- 8 px lime dot (`--color-primary`) + 8 px gap + `caption-eyebrow` (12 px / 600 / uppercase / `0.08em` tracking / `--color-mute`).
- Sits 16 px above the section title.
- Use once per section, never stacked.

### Inline code

Inline `<code>` on a white surface: `background: var(--color-canvas-soft)`, `color: var(--color-ink)`, `padding: 1px 6px`, `border-radius: var(--radius-sm)`, `font-family: var(--font-mono)`, size matches surrounding text minus 1px.

Inline code on an **ink surface** (dark cards, terminal panel): `background: rgba(255, 255, 255, 0.08)`, `color: var(--color-primary)`. The lime-on-ink is the only place a mono token reads chromatic.

Beat IDs (`maestro-927e`), agent labels (`claude-opus-4.7`), and commit hashes are also-mono but are *not* code. Render them as plain mono text without the chip background.

## Component backlog

Patterns observed across consumer surfaces that the DS does not yet enumerate. Each should land as a `preview/` card and a Components entry when next built:

| Pattern | Shape |
|---|---|
| Editorial hero band | Sage canvas band, fluid `display-section` date headline, eyebrow with lime tick, paired summary card on the right. |
| Project banner | Ink-fill pill: `01` lime numeral, Manrope 900 project name, status chip, project summary. Section divider for multi-project documents. |
| Pyramid tier card | One ink-filled headline tier + neutral tiers in a 2-col grid. Tier-eyebrow caption, Inter 600 lead, ordered list of supporting points, italic meta footer. |
| Scoreboard lane | 3-card grid; one card carries the ink hairline (the "do" lane). Bucket-pill eyebrow, mono count in h3, list rows with marker dot. |
| KPI card | 4-up grid. Manrope 900 value at 44 px, optional `→` between two values, unit at 22 px, status chip in head, delta pill in change line. *(This is the spanda-acceptable answer to the SaaS hero-metric template banned in Anti-patterns.)* |
| Progress card (positive) | `primary-pale` fill, 64 px number with `/of` denominator, percentage line, sage progress bar with positive fill, two-col breakdown. |
| Open-gaps row list | Stacked rows inside a white card; each row has 32 px circle warn-icon, headline + desc, right-aligned action chip. |
| Insights table | Wider data table with a confidence-bar cell type. |
| Floating notes widget | Ink-fill toggle pill expanding into a white hairline-bordered panel with mono line-count badge. Review-surface companion. |
| Appendix details | White card per item, chevron summary with right-floating meta caption, definition-list inside. The canonical collapsible. |

Until each of these is canonized (preview card + DS entry), document the local one-off in the consumer file's header comment so the next consumer doesn't reinvent it.

## How to extend

1. **First**: can you compose what you need from the components above? Try that.
2. **Second**: if you need a new component, propose it in a PR with a 700×<h> preview card and add it to `preview/` plus a new entry to **Components** in this file.
3. **Third**: every new token must reference an existing scale. New radii must equal an existing token. New spacing must equal an existing token. New colors must run through OKLCH and document the lightness/chroma walk.
4. **Open patterns** (above) are blessed-in-principle. If you build one, lift the preview card into `preview/` and promote the entry from backlog to Components.

If you find yourself adding tokens that don't fit those rules, you're probably designing the wrong thing.
