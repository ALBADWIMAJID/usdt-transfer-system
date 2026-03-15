# Deployment Readiness Checklist

Purpose:
- Track production hosting requirements for the current React + Vite + Supabase
  deployment
- Make launch assumptions explicit before real device rollout

Status fields:
- `Pass`
- `Fail`
- `Blocked`
- `Not Run`

| Item | Requirement / Check | Expected Result | Status | Notes |
| --- | --- | --- | --- | --- |
| HTTPS enabled | Production deployment must use HTTPS for service worker and reliable PWA behavior | Site is served via HTTPS without mixed-content errors | Not Run |  |
| SPA rewrite fallback | Host must rewrite unknown app routes to `index.html` | Deep links like `/transfers/123` open correctly on refresh | Not Run |  |
| Correct Vite base path | If app is deployed under a subpath, Vite `base` must match deployment path | Built asset URLs, manifest, and service worker scope resolve correctly | Not Run |  |
| Service worker served correctly | `sw.js` must be reachable at the built scope | Browser can fetch/register service worker successfully | Not Run |  |
| Manifest served correctly | `manifest.webmanifest` must be reachable and valid | Browser fetches manifest without 404 or MIME issues | Not Run |  |
| Offline fallback served correctly | `offline.html` must be reachable | Shell fallback can load when navigation fails offline | Not Run |  |
| Public icons available | PNG install icons and favicon assets must exist in the deployed build | Icon URLs return 200 and render | Not Run |  |
| Supabase env configured | Production environment variables must be set correctly | Auth and live reads/writes work when online | Not Run |  |
| Auth domain/session behavior | Auth redirect/session behavior must match deployment origin | Login persists correctly across reloads/backgrounding | Not Run |  |
| IndexedDB allowed | Browser storage must not be blocked by host/browser policy | Offline snapshots and local queue can persist | Not Run |  |
| Snapshot-backed offline fallback | Supported cached read pages, including the dashboard, must exit loading deterministically when offline | Approved pages show cached data or explicit offline/no-snapshot state instead of hanging on loading | Not Run |  |
| Dashboard drill-down offline fallback | Dashboard snapshot saved locally before going offline | Dashboard drill-down sheets can open from cached snapshot inputs or fail with a clear offline/no-snapshot state | Not Run |  |
| Queue replay after reconnect | Pending local customer/transfer/payment items can replay when network returns | Replay results are visible and trustworthy | Not Run |  |
| Print flow unchanged | Transfer print statement must still work in production | Print view excludes local-only unsynced records | Not Run |  |

## Launch Notes

- Placeholder PNG icons are now present, but final production artwork is still
  recommended before release.
- Non-root deployment is safer than before because manifest and service-worker
  paths are now base-aware, but a matching Vite `base` setting is still
  required.
- This checklist does not replace manual iPhone execution; use it together with
  [iphone-qa-checklist.md](./iphone-qa-checklist.md).
