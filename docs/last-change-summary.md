# Last Change Summary

Task completed:

- **T4.3 — High-impact control replacement & final illusion fix** (baseline + follow-up, **CSS/tokens only**):
  - **Closed `<select>`:** **`appearance: none`** + **SVG chevron** (light/dark), re-applied under **≤960px** after the
    mobile **`.field`** **`background`** shorthand.
  - **Numbers:** WebKit spinner removal + Firefox **`textfield`** appearance on **`.field`** amount/rate inputs.
  - **Autofill:** **`-webkit-autofill`** matched to **`--theme-surface-strong`** + primary text/caret (login fields).
  - **Light parity:** global **`color-scheme: light`** on native **`input` / `select` / `textarea`** (same type
    exclusions as dark **T4.1**).
  - **Operations sheet:** **`.operations-sheet-body`** top **inset** lip; **`.operations-sheet-actions`** top
    **hairline** + inset lip so the search/view-all row reads as one chrome stack with summary + list;
    **`.operations-sheet-subtitle`** on **`--theme-text-secondary`**.
  - **Follow-up:** **WebKit** **date/time/month** **`::-webkit-datetime-edit*`** interiors on theme tokens; calendar /
    clock **`::-webkit-calendar-picker-indicator`** **`cursor: pointer`** (and consolidated **`:not([data-theme])`**
    light calendar block); **`.field select`** **`option[value='']`** + **`:disabled`** → **`--theme-text-tertiary`**
    inside the native menu.

**No** business logic, routes, schema, auth, offline, or print flow changes. **No** custom select component — native
dropdowns and date/time **popovers** remain **engine-drawn**.

## Files changed

- `src/index.css`
- `docs/mobile-theme-system.md` — **§24 T4.3**
- `docs/code-map.md`
- `docs/project-current-state.md`
- `docs/implementation-log.md`
- `docs/last-change-summary.md` (this file)

## Verification

- `npm run lint` — passed
- `npm run build` — passed

## Suggested commit message

`T4.3 High-impact control replacement and final illusion fix`
