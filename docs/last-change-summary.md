# Last Change Summary

Task completed:
- **T1 — Global header compression pass** (post–Phase 10 mobile follow-up): shared compact **app-bar** treatment
  for **`PageHeader` / `.page-hero`** on phone widths; **no** logic, routes, offline, or page content redesigns.

Scope implemented:
- **`PageHeader.jsx`:** description paragraphs use class **`page-hero-description`** so mobile CSS can hide long
  intro copy without hiding **`support-text`** / freshness children
- **`src/index.css` (≤960px):** new **`--mobile-page-hero-*`** tokens (padding, radius, action row spacing);
  **`.page-hero`** split from generic **`.page-card`** padding — tighter card, **`h1`** via **`--type-page-title-*`**
  and **`--theme-text-primary`** (dark-mode QA); compact **`.eyebrow`**; hide **`.page-hero-description`**;
  **`page-actions`** grid (primary full-width row first); **`.page-content`** top inset **0.38rem**;
  **`shell-status-strip`** sync banner margins slightly reduced
- **720px / 540px:** further **`--type-page-title-size`** and **`--mobile-page-hero-*`** tightening; **`.page-hero`**
  no longer forced to generic **`.page-card`** padding in those breakpoints
- **Dashboard Mobile Lite** header aligned to the same token rhythm (fallbacks when vars unset)
- **Per-page:** transfers — eyebrow hidden only; customers — eyebrow hidden, single-column actions, lighter
  count meta well; new transfer — redundant eyebrow hidden; customer details — keep “back” full-width rule;
  transfer details hero fully shared (duplicate rules removed)
- **540px:** removed **`p:last-of-type`** hero rule that could hide the wrong **`p`** when description was absent

Files changed:
- `src/components/ui/PageHeader.jsx`
- `src/index.css`
- `docs/mobile-theme-system.md`
- `docs/code-map.md`
- `docs/project-current-state.md`
- `docs/implementation-log.md`
- `docs/last-change-summary.md`

What did NOT change:
- Data flow, Supabase, auth, print, snapshots, queues, replay, routes, navigation contracts, visible theme toggle

New tokens:
- **`--mobile-page-hero-padding-y`**, **`--mobile-page-hero-padding-x`**, **`--mobile-page-hero-radius`**,
  **`--mobile-page-hero-actions-margin-top`**, **`--mobile-page-hero-actions-gap`** — documented in
  **`docs/mobile-theme-system.md`** §16

Dark-mode readiness:
- Hero titles use semantic **`--theme-text-primary`**; eyebrows use **`--theme-text-secondary`**

Remaining outliers (before **T2**):
- Desktop **`PageHeader`** still uses the older large hero styling (by design this pass was mobile-first)
- Topbar column layout at **≤720px** still stacks heavily; future pass could refine without touching routes
- Optional: drawer focus trap / **`aria-hidden`** (deferred from Phase 10)

Verification:
- `npm run lint` — passed
- `npm run build` — passed

Suggested commit message:
- `T1 Global header compression pass`
