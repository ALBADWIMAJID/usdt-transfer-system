# Mobile QA — Phase 10 final record

**Plan reference:** `docs/usdt-mobile-app-like-ui-plan.md` §20 (Phase 10 — iPhone QA and docs finalization).

**Relationship to `docs/iphone-qa-checklist.md`:**  
That file remains the **detailed manual matrix** for operators testing on a **physical iPhone**.  
This document is the **Phase 10 project record**: scenarios, static verification, optional device follow-up, and issues.

---

## Environment note (automation vs device)

| Environment | What was done |
| --- | --- |
| **This repo / CI** | `npm run lint`, `npm run build`; static review of `index.html`, `src/index.css` (safe areas, sticky CTAs, bottom nav, banners, reduced motion); small **preventive** CSS/meta tweaks for keyboard scroll-into-view (see below). |
| **Physical iPhone (Safari + Home Screen)** | **Required** for final sign-off. Use `docs/iphone-qa-checklist.md` and copy row statuses into the tables below when executed. |

**Status legend**

| Status | Meaning |
| --- | --- |
| **Pass (static)** | Verified via code/config review in repo; no blocker found. |
| **Pass (device)** | Confirmed on real iPhone during a manual run. |
| **Not run (device)** | Awaiting physical device; no failure implied. |
| **Fail** | Regression found; fix or defer with reason. |

---

## Required scenarios (plan §20)

### 1) Safari browser mode (mobile viewport)

| Check | Status | Notes |
| --- | --- | --- |
| Shell: top bar, drawer trigger, connection badge, sync strip | **Pass (static)** | `AppShell.jsx` + mobile `index.css` tokens; RTL `app-shell` block ≤960px. |
| Bottom nav + labels + `aria-label` | **Pass (static)** | Phase 9: full label on `NavLink`; floating bar + `env(safe-area-inset-bottom)`. |
| Drawer open/close, backdrop | **Pass (static)** | Transform + backdrop; `prefers-reduced-motion` shortens transition. |
| Main scroll, no horizontal bleed | **Not run (device)** | Confirm on device. |
| `viewport-fit=cover` | **Pass (static)** | `index.html` + Phase 10: `interactive-widget=resizes-content` for keyboard/viewport behavior where supported. |

### 2) Add to Home Screen (standalone)

| Check | Status | Notes |
| --- | --- | --- |
| Manifest + apple meta | **Pass (static)** | `index.html` + `manifest.webmanifest`. |
| Theme / status bar feel | **Not run (device)** | `theme-color`, `apple-mobile-web-app-status-bar-style`. |
| Spacing under status bar / home indicator | **Pass (static)** | `env(safe-area-inset-*)` on topbar, page-content, bottom-nav. |

### 3) Open / close repeatedly

| Check | Status | Notes |
| --- | --- | --- |
| No cumulative layout break | **Not run (device)** | SPA: typical remount is stable; verify on device. |

### 4) Background / resume

| Check | Status | Notes |
| --- | --- | --- |
| Layout/state presentation | **Not run (device)** | No logic changes in Phase 10; UI should match pre-resume. |

### 5) Offline reopen after prior online visit

| Check | Status | Notes |
| --- | --- | --- |
| Snapshot pages show data or explicit empty/offline copy | **Pass (static)** | Snapshot flows unchanged; `OfflineSnapshotNotice`, partial states preserved in page code. |
| Freshness / warnings still visible | **Pass (static)** | Banners use semantic tokens (Phase 9); not visually flattened vs. meaning. |

### 6) Network switching

| Check | Status | Notes |
| --- | --- | --- |
| Connection badge + sync banner readable, not duplicated | **Pass (static)** | `ConnectionBadge`, `SyncStatusBanner`, Phase 9 sync strip tokens. |

### 7) Keyboard open / close (forms)

| **Surface** | Status | Notes |
| --- | --- | --- |
| `NewTransferPage` | **Pass (static)** | Sticky submit `bottom: calc(5.5rem + safe-area)`; Phase 10: `scroll-padding-bottom` on `html` + `scroll-margin-bottom` on `.field:focus-within` to reduce overlap with bottom nav when focusing inputs. |
| `TransferDetailsPage` payment form | **Pass (static)** | Same sticky + scroll affordances. |
| `CustomersPage` create form | **Pass (static)** | Full-width primary CTA; shared field focus margin. |
| iOS Safari actual overlap | **Not run (device)** | `interactive-widget=resizes-content` helps on supporting engines; iOS version-dependent. |

### 8) Long list scrolling

| **Area** | Status | Notes |
| --- | --- | --- |
| Transfers / Customers / Customer details / Transfer details / Dashboard lists | **Pass (static)** | `page-content` bottom padding `calc(5.75rem + safe-area)`; grouped lists use hairlines; no code change to list data. |
| Last items not hidden behind tab bar | **Not run (device)** | Padding designed for ~5.75rem clearance; confirm on device. |

### 9) Sticky bars + safe areas

| Check | Status | Notes |
| --- | --- | --- |
| Section nav sticky offset | **Pass (static)** | `app-section-nav-shell` top offsets in mobile blocks. |
| Sticky payment / new-transfer submit vs bottom nav | **Pass (static)** | `bottom: calc(5.5rem + safe-area)` aligned with tab bar height rhythm. |

### 10) Bottom nav + home indicator

| Check | Status | Notes |
| --- | --- | --- |
| Bar inset from home indicator | **Pass (static)** | `max(0.5rem, env(safe-area-inset-bottom))` on container. |
| Content not crowded | **Pass (static)** | Page bottom padding matches tab clearance. |

### 11) Pending / sync / local snapshot visibility

| Check | Status | Notes |
| --- | --- | --- |
| Pending mutations, offline chips, inline warnings | **Pass (static)** | Components unchanged; Phase 8/9 kept banner contrast and operational colors. |

---

## Issues found

| ID | Description | Resolution |
| --- | --- | --- |
| P10-1 | Focused form fields may scroll under floating tab bar when browser scrolls input into view | **Fixed:** `html` `scroll-padding-bottom` + `.field:focus-within` `scroll-margin-bottom` (≤960px); viewport `interactive-widget=resizes-content`. |
| — | No other regressions identified in static review | — |

## Deferred (intentional)

| Item | Reason |
| --- | --- |
| Full physical iPhone sign-off | Requires operator + HTTPS deployment + real device; tracked in `iphone-qa-checklist.md`. |
| Drawer focus trap / `aria-hidden` on open | Out of scope for Phase 10 micro-polish; optional future a11y pass. |
| Dynamic `visualViewport` JS for keyboard | Avoids new logic; CSS/meta-only mitigation first. |

---

## Mobile transformation completeness

- **Phases 0–9** are implemented in code and documented.
- **Phase 10** in this environment: **docs finalized**, **static QA complete**, **one preventive keyboard/safe-area polish** applied.
- **Product “complete” for this phase** once a stakeholder runs **`iphone-qa-checklist.md`** on a real device and marks critical rows **Pass (device)**.

---

## Sign-off (fill on device pass)

- Device: _________________  
- iOS: _________________  
- Mode: ☐ Safari ☐ Home Screen  
- Deploy URL: _________________  
- Tester / date: _________________  
