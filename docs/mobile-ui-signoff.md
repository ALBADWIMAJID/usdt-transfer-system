# Mobile UI / Theme Final Sign-off

Date: `2026-03-20`

Scope: final QA + sign-off after **T4.3**. This pass stayed within **CSS/docs only**. No business logic, routes, auth, schema, print flow, or offline behavior changed.

## Verification Context

- **Docs reviewed:** `docs/mobile-theme-system.md`, `docs/project-current-state.md`, `docs/code-map.md`, `docs/implementation-log.md`, `docs/last-change-summary.md`, `docs/usdt-mobile-app-like-ui-plan.md`
- **Code reviewed:** `src/index.css`, `src/App.jsx`, `index.html`, `src/components/AppShell.jsx`, and the shared/mobile screen components for Dashboard, Customers, CustomerDetails, Transfers, TransferDetails, NewTransfer, drawer/menu, top bar, bottom nav, section tabs, forms, fields, selects, date inputs, banners, grouped rows, cards, and sheet surfaces
- **Runtime smoke:** local Vite dev server + Playwright **WebKit** screenshots on `/login` using **`iPhone 12`** emulation in **light** and **dark**
- **Constraint:** protected data screens require an authenticated operator session, so live signed-in walkthroughs were not possible from this environment; those routes were verified by code-level QA against the current shared mobile/theme system and page selectors

## QA Status

| Area | Status | Notes |
| --- | --- | --- |
| Light mode visual QA | **Pass** | Shell, form, banner, and control surfaces remain coherent; runtime mobile smoke confirmed the light theme still renders cleanly. |
| Dark mode visual QA | **Pass** | Dark-mode theme selector contrast bug fixed; dark surface/readability stack remains consistent with the current token system. |
| Screen-by-screen consistency QA | **Pass** | Dashboard, Customers, CustomerDetails, Transfers, TransferDetails, and NewTransfer were reviewed against shared chrome/spacing/section/form patterns; no redesign-level regressions found. |
| Control QA | **Pass** | Shared fields/selects/date inputs/readonly states remain in one family; final pass tightened theme-selector readability and mobile action target sizing. |
| Safe-area and sticky UI QA | **Pass** | Mobile drawer and operations sheet now have explicit safe-area clearance; sticky submit areas and bottom-nav/page-content clearance remain intact. |
| Status / operational-state QA | **Pass** | Offline snapshot notices, sync banners, pending/failed/blocked/local states still use clear semantic presentation; no operational clarity was reduced. |
| Lint | **Pass** | `npm run lint` |
| Build | **Pass** | `npm run build` |

## Issues Fixed In This Phase

1. **Dark-mode theme selector contrast**
   - `src/index.css`
   - The active segment in `ThemePreferenceControl` was too low-contrast in dark mode. Added a dark-specific active treatment so the selected label stays readable.

2. **Mobile touch-target inconsistency on compact header actions**
   - `src/index.css`
   - Shared page-hero action buttons and dashboard-lite inline action buttons could render below the intended phone touch target. They now honor the mobile touch-target token.

3. **Drawer / sheet safe-area clearance**
   - `src/index.css`
   - The mobile drawer and operations drill-down sheet now use explicit safe-area-aware offsets/padding so bottom/top edges are less cramped on devices with larger insets.

## Intentionally Deferred Limitations

- **Physical iPhone Safari / Home Screen sign-off** was not run from this environment.
- **Authenticated live walkthrough of protected routes** still requires a valid operator session; this pass verified those screens by code review rather than live signed-in screenshots.
- Native browser-painted **select dropdowns** and **date/time pickers** remain engine-drawn by design.

## Completion Statement

**Complete for the mobile UI/theme scope:** **Yes**, for repository/browser sign-off.

The mobile UI/theme work is considered complete in code: light mode, dark mode, shared chrome, screen consistency, control family, and safe-area/sticky behavior all pass this final QA scope. Manual physical-device validation remains an external follow-up, not a new code phase.
