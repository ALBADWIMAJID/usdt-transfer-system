# Last Change Summary

Task completed:
- Phase 1 AppShell mobile transformation (refresh pass)

Scope implemented:
- **Shell-only CSS** in `src/index.css` — stronger mobile app frame:
  - **Top bar:** safe-area-aware padding; lighter visual treatment; title-first
    (hide long per-route description + system eyebrow in the top bar on mobile)
  - **Connection badge:** compact, flatter chip in the top bar on small screens
  - **Sync banner strip:** tighter, lighter presentation when non-idle states show
  - **Page frame:** horizontal safe-area padding; bottom padding tuned for a
    **floating dock** bottom nav + home indicator
  - **Bottom nav:** inset rounded dock, improved blur/shadow, clearer active
    state, `:active` feedback
- **Layout:** `content-shell` grid rows set to `auto auto 1fr` so top bar, sync
  strip, and main stack correctly; `min-height: 0` on shell and main content
  for predictable grid behavior

Files changed:
- `src/index.css`
- `docs/code-map.md`
- `docs/implementation-log.md`
- `docs/last-change-summary.md`
- `docs/project-current-state.md`

What did NOT change:
- React shell code (`AppShell.jsx` — lives under `src/components/`, not `src/layout/`)
- Routes, navigation destinations, or label semantics
- Auth, Supabase usage, business logic
- Offline snapshots, queues, replay, sync provider behavior
- Print flow
- Page-level components (including `TransfersPage`)

Verification results:
- `npm run lint` - passed
- `npm run build` - passed
- Existing build-size warning remains (main client chunk exceeds 500 kB after minification)

Manual mobile QA suggested:
- **Notch / status bar:** top bar clears `safe-area-inset-top` in portrait and
  landscape
- **Top bar:** route title readable; no clipped menu button; connection badge
  still understandable (label-only on smallest widths where detail is hidden)
- **Sync:** trigger pending/offline/error states — banner remains readable and
  not heavier than before when idle (still hidden when idle)
- **Scroll:** long pages scroll without content trapped under the floating bottom
  nav; last lines clear above dock + home indicator
- **Bottom nav:** four destinations unchanged; active state obvious; tap targets
  feel comfortable
- **RTL:** layout and nav order still feel correct

Recommended next step:
- **Phase 2 — Unified mobile section navigation system** when explicitly requested

Suggested commit message:
- `Phase 1 AppShell mobile transformation`
