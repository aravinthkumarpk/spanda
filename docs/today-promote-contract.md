# `/today` promote — the `data-promotable` contract

Spanda's `/today` inlines your daily-review HTML and injects a **"→ make it
work"** button on lines your pipeline marks as promotable. Clicking it opens the
shared task form (`BeatForm`) pre-filled from the line's data attributes; on
confirm it creates a real task in the registered work repo (`personal-os`) via
`POST /api/beats`.

Spanda does **not** parse your prose. It only acts on elements that carry the
markers below. No marker → no button (intentional: nothing is guessed).

> Why attributes and not the line text: `/today` renders the daily via
> `dangerouslySetInnerHTML`, which does **not** run the daily's `<script>`s, so
> a React island reads these attributes after render. The structured attributes
> also survive title edits and let the pipeline encode bucket/project/acceptance
> that prose can't.

## Emit this per promotable line

```html
<li data-promotable
    data-promote-key="2026-05-30:agent-studio:cart-pass-rate"
    data-promote-title="Cart pass-rate fix to ≥95% live"
    data-promote-bucket="do"
    data-promote-project="agent-studio"
    data-promote-acceptance="Pass rate ≥95% on prod for 72h, no regressions"
    data-promote-person="">
  Cart quality fix · pass rate 70→95% live by EOD
</li>
```

Any element type works (`<li>`, `<p>`, `<tr>`…); only the attributes matter.

## Attributes

| Attribute | Required | Meaning |
|---|---|---|
| `data-promotable` | **yes** | Marks the element. Presence alone enables the button. |
| `data-promote-key` | **yes** | **Stable**, unique-within-a-daily id for this line. Drives dedup: the created task stores `today-key:<key>`, and the line shows "→ promoted" on later visits if a task with that key exists. Must stay identical across regenerations of the same daily for the same item (e.g. `<date>:<section>:<slug>`). |
| `data-promote-title` | **yes** | The task title (clean, not the decorated prose). |
| `data-promote-bucket` | **yes** | One of `do` \| `coordinate` \| `followup` \| `decide`. Picks the lifecycle/profile. |
| `data-promote-project` | no | A `project:*` value (e.g. `agent-studio`) → the created task is labelled `project:agent-studio` and (once the hierarchy exists) parented under that project's root. Omit/`unsorted` → no project. |
| `data-promote-acceptance` | for `do` | Acceptance criteria → the task's native `acceptance_criteria`. `do` tasks **require** non-empty acceptance; if you omit it, the form opens with the field empty and blocks submit until filled. |
| `data-promote-person` | for `coordinate`/`followup` | The person → `with:<person>` (coordinate) or `chasing:<person>` (followup). Required for those buckets. |

## What Spanda writes on create

- Title ← `data-promote-title` (editable before write)
- `acceptance_criteria` ← `data-promote-acceptance`
- Labels: `work:<bucket>`, `source:today-<YYYY-MM-DD>` (the daily's date),
  `today-key:<data-promote-key>`, plus `project:<…>` / `with:<…>` / `chasing:<…>`
  when supplied.
- Repo: the single registered work repo (`personal-os`).

Nothing is created silently — the form always opens for confirm/edit first
(spec Q6: edit-before-write).

## Dedup / "→ promoted"

On load, the island fetches tasks carrying `source:today-<date>` and builds the
set of `today-key:*` already present. A marked line whose `data-promote-key` is
in that set renders "→ promoted" instead of the button. This is robust to title
edits because it keys on `data-promote-key`, not the title text.

## Minimal example (bucket `do`, no project)

```html
<li data-promotable
    data-promote-key="2026-05-30:today:handoff-runbook"
    data-promote-title="Hand off Mumbai demo runbook to Khilan"
    data-promote-bucket="coordinate"
    data-promote-person="khilan">
  Event · Hand off Mumbai demo runbook to Khilan by EOD
</li>
```
