# Last Change Summary

Task completed:
- Phase 8 iPhone QA pass and deployment readiness hardening

Scope implemented:
- Reviewed the current PWA shell and deployment-sensitive files
- Hardened manifest URLs so install metadata is relative/base-safe
- Added PNG placeholder icons for iPhone/Home Screen and general install flows
- Hardened service worker registration and scope handling around Vite base path
- Hardened service worker precache/fallback logic to resolve assets relative to
  the worker scope
- Updated the offline fallback page to reopen the cached shell relative to the
  current app scope
- Added formal in-repo QA/deployment artifacts:
  - `docs/iphone-qa-checklist.md`
  - `docs/deployment-readiness-checklist.md`
  - `docs/manual-test-matrix.md`
- Updated persistent repository docs to reflect current readiness and remaining
  manual validation work

Files changed:
- `public/manifest.webmanifest`
- `public/sw.js`
- `public/offline.html`
- `public/icons/apple-touch-icon-180.png`
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/icons/icon-maskable-512.png`
- `src/pwa/registerServiceWorker.js`
- `index.html`
- `docs/offline-pwa-execution-plan.md`
- `docs/project-current-state.md`
- `docs/implementation-log.md`
- `docs/code-map.md`
- `docs/last-change-summary.md`
- `docs/iphone-qa-checklist.md`
- `docs/deployment-readiness-checklist.md`
- `docs/manual-test-matrix.md`

What did NOT change:
- Business logic
- Database schema
- Supabase tables/contracts
- Routes/navigation
- Print flow
- Offline customer creation
- New offline mutation types
- Broader conflict handling

Verification results:
- `npm run lint` - passed
- `npm run build` - passed
- Local dev HTTP smoke - passed (`DEV_STATUS=200`)
- Preview HTTP smoke - passed (`PREVIEW_STATUS=200`)

Known limitations:
- Real iPhone validation is still required and was not performed from this
  environment
- Placeholder PNG icons are ready for testing but should still be replaced with
  final production artwork
- Non-root deployment is safer than before, but it still requires matching
  Vite `base` configuration and host SPA rewrite rules
- Build still shows the existing chunk-size warning above 500 kB

Recommended next step:
- Execute the new iPhone QA and deployment readiness checklists against a real
  staging/production deployment before launch sign-off
