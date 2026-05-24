# WRITING.md

The canonical writing guide for spanda. Read this before producing **any** prose: UI strings, button labels, empty states, toasts, marketing copy, slides, docs, release notes.

---

## The three rules

If you remember nothing else:

1. **Be specific.** Numbers, dates, units, names. Never vague.
2. **Be direct.** Active voice. Subject does verb. Cut every adverb.
3. **Be honest.** No peacocks, no weasels. The reader can tell when you are puffing.

The rest of this file is those three rules, expanded.

---

## 1. Be specific

### Absolute dates, not relative

Documents outlive you. "Next week" means nothing in six months.

| ❌ | ✅ |
|---|---|
| The deadline is next week. | The deadline is Friday 25 July 2020, 5 pm UTC. |
| Today, spanda raised funding. | On 1 October 2024, spanda raised €2.4M from Earlybird. |
| Recently shipped. | Shipped on 12 March 2026. |

### Absolute references, not "the new X"

Name the thing. Don't rely on the reader knowing what "the latest release" or "the new view" means.

| ❌ | ✅ |
|---|---|
| We moved to the new office. | The people team moved into the rue d'Hauteville office in March 2018. |
| The current default agent. | claude-opus-4.7 (set in profile `autopilot`). |
| The new dashboard. | The Setlist view (introduced in v0.13.0). |

### Correct units

A number without a unit is a guess.

| ❌ | ✅ |
|---|---|
| Air-condition is set to 23°. | Air-condition is set to 23°C. |
| spanda raised 35 million. | spanda raised €35M. |
| Set the timeout to 30. | Set the timeout to 30s. |
| The radius is 24. | The radius is 24 px. |

### Sources for every number

Numbers without sources are unreviewable. Cite the source or cut the number.

| ❌ | ✅ |
|---|---|
| Slack messages increased 25% during lockdown. | Slack reported a 25% increase in messages sent between February and March 2020 ([Slack blog, 2020-03-25](https://slack.com/blog/news/remote-work-in-an-age-of-covid-19)). |
| Most developers prefer dark mode. | 78% of respondents to the 2024 Stack Overflow developer survey reported using a dark IDE theme. |

### Named actors, not passive constructions

Every sentence needs a subject doing something. Passive voice hides the actor.

| ❌ | ✅ |
|---|---|
| The decision was reached. | The product team decided on 14 March. |
| Mistakes were made. | Engineering shipped a regression in v0.13.2 (rolled back 6 hours later). |
| The bug has been fixed. | Sara fixed the bug in PR #4127. |
| It is believed that… | The 2024 survey shows… |

### No false agency

Inanimate things don't act. Decisions don't emerge. Cultures don't shift. Name the human.

| ❌ | ✅ |
|---|---|
| The decision emerges from the data. | The team decided after reviewing the data. |
| The culture shifts toward async. | Engineering switched to async stand-ups in Q3. |
| The data tells us… | The 2024 survey shows… |
| A complaint becomes a fix. | The on-call engineer fixed it that morning. |

### Data over conclusions

Give the data. Let the reader draw the conclusion. Often the same word count.

| ❌ (28 words) | ✅ (28 words) |
|---|---|
| All customers were impacted by a major issue during this event. We lost a lot of money. Hopefully we fixed the main problem quickly. | 10,400 customers couldn't complete a purchase for 2h 13m due to a server failure introduced by a code change, costing an estimated $50,000 (±4%). |

---

## 2. Be direct

### Kill adverbs

Every -ly word, every hedge, every intensifier. If a sentence is true without the adverb, cut it.

**Banlist:**

> really, just, literally, genuinely, honestly, simply, actually, deeply, truly, fundamentally, inherently, inevitably, interestingly, importantly, crucially, essentially, effectively, naturally, generally, usually, typically, completely, entirely, absolutely, totally, definitely, certainly, clearly, obviously, frankly, intentionally, exactly, precisely, automatically, specifically, basically

### Kill filler verbs

Padding around the real verb. Cut to the verb.

| ❌ | ✅ |
|---|---|
| Valentin was able to successfully unblock the situation. | Valentin unblocked it. |
| The system has the ability to process… | The system processes… |
| In order to achieve this goal… | To achieve this… |
| Due to the fact that it was raining… | Because it was raining… |
| At this point in time… | Now. |
| It is important to note that the data shows… | The data shows… |
| For the purpose of testing… | To test… |

### Kill throat-clearing openers

Cut the runway. State the point.

> "Here's the thing:", "Here's what I find interesting:", "The truth is,", "Let me be clear:", "I'm going to be honest:", "The real X is", "It turns out", "Make no mistake", "At its core", "In today's landscape"

### Kill binary contrasts

The "not X. It's Y." formula is a tic. State Y.

| ❌ | ✅ |
|---|---|
| spanda isn't just a task tracker. It's a control room. | spanda is a control room for multi-agent work. |
| The problem isn't speed. It's reliability. | Reliability is the problem. |
| It feels like X. It's actually Y. | Y. |

### Kill Wh- sentence starters

"What makes this hard is…" → name the constraint. Restructure.

| ❌ | ✅ |
|---|---|
| What we found surprising was… | The 30% latency drop surprised us. |
| Why this matters: | (Cut. Make the point.) |
| How spanda handles dispatch is… | spanda dispatches by… |

### Kill signposting and meta-commentary

Don't announce what the prose is about to do. Just do it.

> "Let's dive in", "Let's explore", "Here's what you need to know", "Without further ado", "In this section we'll", "Let me walk you through", "The rest of this essay…"

### Vary rhythm

Three sentences in a row at the same length is metronomic. Mix it up. Short. Then a longer one that takes its time. Short again.

---

## 3. Be honest

### No peacock words

Promotion without specifics. Says "this is good" without showing why.

**Banlist:**

> outstanding, best-in-class, world-class, most innovative, cutting-edge, state-of-the-art, well-crafted, beautiful, elegant, powerful, intuitive, seamless, delightful, magical, revolutionary, game-changing, groundbreaking, pioneering, unmatched, unparalleled, premium, exclusive, vibrant, breathtaking, nestled, stunning, robust, transformative

| ❌ | ✅ |
|---|---|
| spanda detects fraud using the most innovative ML techniques. | spanda detects fraud using a random-forest regressor on transaction-graph features. |
| A beautiful, intuitive interface. | The interface follows the Wise system: lime CTA on sage canvas, 24 px button radius, sentence-case labels. |
| World-class agent orchestration. | Manages up to 47 concurrent agent sessions per host (16-vCPU, July 2024). |

### No weasel words

The illusion of a specific claim without making one. Vague quantifiers, vague attributions.

**Banlist:**

> some, many, often, usually, typically, generally, mostly, sometimes, most, several, a few, various, certain, numerous, multiple, considerable, significant, substantial, leading, top, major, minor, recent, modern, advanced, sophisticated, experts, observers, sources, "it's been said", "it is widely believed"

| ❌ | ✅ |
|---|---|
| We often had this bug, many users were impacted. It's urgent to fix. | This bug occurred 3 times in July 2020, impacting 301 users across 12 companies. |
| Experts believe spanda will reshape how teams ship. | In a 2024 review, *The Pragmatic Engineer* called spanda "the first multi-agent control room I'd give my team". |

### No lazy extremes (as rhetoric)

"Every / always / never / everyone / nobody / everywhere" used to sound authoritative are false authority. Use specifics.

| ❌ | ✅ |
|---|---|
| Most beats are ready. | 9 of the 14 beats are ready. |
| spanda runs everywhere. | spanda runs on Linux and macOS. |
| Everyone wants this feature. | 47 of 52 surveyed operators (Q1 2026) requested it. |

**Exception:** normative rules (`Never use a sharp corner on a UI element`) keep "never" because they are constraints, not factual claims about the world.

### No chatbot artifacts

Text meant as chatbot correspondence has no place in product copy.

> "I hope this helps", "Let me know", "Of course!", "Certainly!", "You're absolutely right", "Great question!", "Happy to help"

### No knowledge-cutoff hedges

Don't paste AI disclaimers into prose. Either find the source or cut the claim.

> "As of my last training update…", "While specific details are limited…", "Based on available information…", "It could be argued that…", "It might be the case that…"

### No generic positive conclusions

"The future looks bright" is empty. Replace with a specific fact, or cut.

| ❌ | ✅ |
|---|---|
| The future looks bright for spanda. | spanda plans to ship the multi-tenant beta in Q3 2026. |
| Exciting times ahead. | (Cut.) |

### No AI-tic vocabulary

These appear far more in post-2023 AI text than in human prose. Never use:

> testament, pivotal, stands as, serves as, marks a, signature, evolving landscape, focal point, in the heart of, delve, leverage, garner, tapestry, interplay, intricate, crucial, additionally, furthermore, moreover, alignment, holistic, showcasing, ensuring, enabling, fostering, reflecting, symbolizing, contributing to, cultivating, encompassing, highlighting, underscoring, emphasizing

### No copula avoidance

Use **is** and **has**. Stop substituting "serves as", "stands as", "features", "boasts".

| ❌ | ✅ |
|---|---|
| Gallery 825 serves as LAAA's exhibition space. | Gallery 825 is LAAA's exhibition space. |
| The dashboard boasts three views. | The dashboard has three views. |

---

## Structural bans

These are flat-out forbidden. No exceptions outside reference tables and the banlists themselves.

| Ban | Why |
|---|---|
| **Em-dashes** (`—`, `--`) | AI tic. Use commas, periods, parens, or colons. |
| **Curly quotes** (`“ ” ‘ ’`) | AI tic. Use straight quotes (`"` `'`). |
| **Emojis for UI affordances** | Iconography is Lucide. (One exception: agent provider marks, see `README.md`.) |
| **Rule-of-three padding** | "Innovation, inspiration, and insights" is filler. If you have two items, write two. If you have four, write four. |
| **False ranges** | "From boilerplate to refactors" is fake. Use ranges only when X and Y sit on a real scale. |
| **Inline-header lists in body prose** | A bullet starting with `**Performance:**` followed by a sentence about performance is AI-format. Convert to prose. *(Reference tables where bold-then-description IS the right affordance are fine, like the tables in this document.)* |
| **Title Case in headings** | Use sentence case. "Strategic negotiations" not "Strategic Negotiations". |
| **Dramatic fragmentation** | "X. That's it. That's the thing." reads as performative simplicity. Write complete sentences. |
| **First-person `we` / `our` in product copy** | The product addresses the operator, not "our users". Use second-person `you`. |

---

## Punctuation conventions

### The spanda separator: `·`

Use the middle dot as the inline separator. It does the work em-dashes used to do.

- Between metadata fragments: `23h ago · hetzner-blocker · claude-opus-4.7`.
- Between row labels and content in dense chrome: `Profile · Owner`, `Lease · k1f3`.
- As an empty-cell placeholder in data tables: `·` instead of `—`.
- Between status pill segments: `Ready · Plan review`.

Reserve commas for prose, colons for label/description in markup (`**Label:** description`, not `**Label** — description`).

### Inline-header lists: colon not em-dash

If you write `**Label** — description` you have a banned em-dash and an inline-header list. Pick one:

| ✅ | Why |
|---|---|
| `**Label:** description.` | Reference table format. |
| `Label. Description.` | Prose. |
| `Label, description.` | Looser prose. |

### Editorial cadence (report headings)

Daily-review / weekly-review / retro surfaces use sentence-case headings with a **trailing period**: `Vault deltas.`, `Today.`, `Tomorrow & the week.`. The period is editorial cadence; it signals "this is a beat in a longer arc". Use this only on editorial documents, not in UI chrome.

---

## Canonical status vocabulary

When labelling state in UI chrome, pick from this list. Don't invent new verbs.

| Status | Use |
|---|---|
| `Tracking` | Active observation, no action needed. |
| `Healthy` | Green-light, no concerns. |
| `In progress` | Work happening now. |
| `Iterating` | Multiple short cycles in flight. |
| `Behind` | Off-schedule by a known amount. |
| `Blocked` | Dependency or external constraint preventing progress. |
| `Ready` | Available for the next workflow step. |
| `Shipped` | Delivered to its final destination. |
| `Deferred` | Intentionally postponed. |
| `Closed` | Out of scope or won't-do. |

These are present-tense and imperative-adjacent. Avoid past-progressive ("was being reviewed") or noun forms ("under review") in chrome; reserve those for prose.

---

## spanda tone summary

spanda writes like someone who knows the system and respects your time:

- Plain present-tense verbs.
- Single-noun surface names (*Setlist*, *Queues*, *Active*).
- Lowercase brand: `spanda`. Never `Spanda`, never `SPANDA`.
- No exclamation marks except in domain action names (`Take!`, `Scene!`).
- Domain vocabulary is load-bearing: *beats, waves, setlists, takes, retakes, scenes, capsules*. Use it as-is. Don't blunt it back to "tasks" or "phases". The codebase [TAXONOMY.md](https://github.com/aravinthkumarpk/spanda/blob/main/TAXONOMY.md) is the glossary.
- First-person `I` is allowed in long-form (essays, retros). Avoid in UI copy.
- Second-person `you` for operator-facing instructions.

---

## The final audit

Before delivering any non-trivial prose:

1. Read it aloud. Does it sound like a person?
2. Run the prompt on your own draft:
   > "What makes the below so obviously AI-generated?"
3. Answer with the remaining tells.
4. Revise once more.

This catches the second-order slop that the first pass misses.

---

## Examples

### A button label

| ❌ | ✅ |
|---|---|
| Get Started Today | Take a beat |
| Submit | Stage |
| Click here to learn more about pricing | Pricing |
| 🚀 Launch | Run |

### An empty state

| ❌ | ✅ |
|---|---|
| **No beats yet!** Don't worry, you can easily get started by clicking the button below to create your first beat. We're here to help you ship faster than ever! 🚀 | No beats in this queue. Press `n` to capture one. |

### A toast

| ❌ | ✅ |
|---|---|
| The beat was successfully closed by the system. | Closed `maestro-927e`. |
| Awesome! Your changes have been saved. | Saved. |
| Something went wrong. Please try again later. | Couldn't reach the lease service. Retry in 5s. |

### A release note

| ❌ | ✅ |
|---|---|
| We're excited to introduce powerful new improvements to the Setlist view! | Setlist v0.14.8 (2026-05-12): wave columns now collapse on Cmd+1–4. Fixes 3 reported regressions. |

### A landing-hero headline

| ❌ | ✅ |
|---|---|
| The world's most innovative AI agent orchestration platform | Capture work. Dispatch agents. Ship. |

---

## Marketing copy: one small exception

Public marketing pages get one peacock pass because they need to attract attention. Even there, prefer specifics. The Wise homepage doesn't say "world-class transfers". It says "Send money for 0.41%".

---

## Sources

This guide fuses three existing rulebooks:

- **Amazon writing principles** ([Raphael Moutard, 2021](https://medium.com/@raphmoutard/writing-the-amazon-way-c54fd05fb3b8)) — absolute dates, absolute references, units, no jargon, no weasel words, sources, no peacocks, data-driven, concise.
- **stop-slop** ([hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop)) — kill adverbs, active voice, no Wh- starters, no false agency, no binary contrasts, vary rhythm.
- **humanizer** ([blader/humanizer](https://github.com/blader/humanizer)) — AI-vocabulary banlist, no em-dashes, no curly quotes, no chatbot artifacts, the final-audit prompt.

The credit lives here so the prose above stays free of "as Amazon says…" / "per stop-slop…" interruptions. Apply the rules; the lineage is footnotes.
