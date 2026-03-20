# Last Change Summary

Task completed:

- **T4.1 — Dark surface fix + typography & density normalization:** calmer, less black-heavy **dark** stacks;
  **native-ish** control theming where engines allow; **unified metric typography** via **`--type-value-emphasis-*`**;
  **denser** phone cards, forms, lists, and tabs while keeping **touch targets**.

**No** business logic, routes, schema, auth, offline, or print flow changes.

## Scope implemented

- **Dark `:root`:** lifted **`--theme-bg-app`**, body gradient, **`--theme-surface-*`**, borders, elevated/page-shell/chrome
  plates, list row fill, **lite KPI** gradients; **`accent-color: var(--brand-primary)`**; **complete `--type-*` set** for
  dark (fixes missing-token **`var()`** fallthrough).
- **Global dark rules:** **`color-scheme: dark`** on **`.field`** inputs and common text-like **`input` / `select` /
  `textarea`**; **`select option`** uses **`--theme-surface-strong`** + **`--theme-text-primary`** (limited by browser).
- **≤960px dark:** **`--theme-mobile-control-fill: var(--theme-surface-strong)`** (solid); brighter **`--mobile-canvas-*`**
  and **`--mobile-surface-*`** content stack.
- **≤960px typography:** **`--type-value-emphasis-size`** overrides at **960 / 720 / 540px** (light + dark).
- **Shared components:** **`.stat-value`**, **`.dashboard-snapshot-value`**, **`.operations-sheet-total strong`**,
  **`.customers-portfolio-summary .stat-value`** → token-based sizes; operations sheet totals use **`calc(var(--type-value-emphasis-size) * …)`**
  on narrow widths.
- **≤960px density:** tighter **page cards**, **record/info** cards, **form-grid** / **field** rhythm, **textarea**
  min-height, **section tabs**, **status banner**, queue/portfolio **groups**, **record lists**, **Dashboard Lite KPI**
  padding.

## Files changed

- `src/index.css`
- `docs/mobile-theme-system.md` — §9 mobile type note, **§22 T4.1**
- `docs/code-map.md` — `index.css` bullet (T4.1)
- `docs/implementation-log.md`
- `docs/last-change-summary.md` (this file)
- `docs/project-current-state.md`

## Verification

- `npm run lint` — passed
- `npm run build` — passed

## Suggested commit message

`T4.1 Dark surface fix and typography density normalization`
