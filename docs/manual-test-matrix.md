# Manual Test Matrix

Purpose:
- Consolidated matrix for browser, offline/PWA, queue replay, and deployment
  verification
- Complements the iPhone checklist with a broader reviewer-friendly snapshot

Status fields:
- `Pass`
- `Fail`
- `Blocked`
- `Not Run`

| Area | Scenario | Preconditions | Expected Result | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Browser shell | Fresh online load | Valid deployment and env vars | App loads and routes normally | Not Run |  |
| PWA shell | Service worker registration | Production build over HTTPS | Service worker registers without breaking the app | Not Run |  |
| PWA shell | Manifest / install metadata | Built app deployed | Manifest resolves and install metadata is visible | Not Run |  |
| Offline read | Cached dashboard/customers/transfers/details | Relevant supported screen visited online first | Offline snapshot fallback works with clear locally-saved messaging and does not remain stuck on `جار التحميل...` | Not Run |  |
| Offline read | TransferDetails partial snapshot restore | `TransferDetailsPage` visited online first, then reopened later while only part of the local snapshot is available | Transfer details still render, payment-history absence is explicit, and confirmed paid/remaining totals are not faked as zero | Not Run |  |
| Offline read | Dashboard drill-down sheet from cached snapshot | `DashboardPage` visited online first and dashboard snapshot saved locally | Offline dashboard drill-down opens from cached snapshot data or shows an explicit offline/no-snapshot state | Not Run |  |
| Offline read | No snapshot available | Go offline before first visit to a supported snapshot-backed screen | Safe missing-data message is shown and loading exits deterministically | Not Run |  |
| Offline read | New Transfer cached customer options | Customer options cached online first, then network offline | Customer selector uses local snapshot or shows explicit no-snapshot/offline requirement state | Not Run |  |
| Offline mutation | Offline customer creation | Customers page open, network offline | Local customer is queued and clearly marked local-only | Not Run |  |
| Offline mutation | Offline payment capture | Transfer details available, network offline | Local payment is queued and clearly marked local-only | Not Run |  |
| Offline mutation | Offline transfer capture | Customer options cached, network offline | Local transfer is queued with local-only reference | Not Run |  |
| Replay | Customer replay | Pending local customer exists, network restored | Customer syncs or remains visible with explicit failure state | Not Run |  |
| Replay | Transfer replay | Pending transfer exists, network restored | Transfer syncs or remains visible with explicit failure state | Not Run |  |
| Replay | Payment replay | Pending payment exists, network restored | Payment syncs or remains visible with explicit failure/blocked state | Not Run |  |
| Replay | Dependency-aware ordering | Mixed pending transfer/payment scenario | Transfer replays before dependent payment; payment is not sent prematurely | Not Run |  |
| Deployment | Deep-link refresh | SPA host rewrite configured | Direct route refresh resolves to app shell | Not Run |  |
| Deployment | Non-root base path | Vite `base` and host path configured intentionally | Manifest, service worker, and icons resolve correctly | Not Run |  |
| iPhone | Safari browser mode | Physical iPhone | App is readable and functional in Safari | Not Run |  |
| iPhone | Add to Home Screen mode | Physical iPhone and HTTPS | App launches from Home Screen with expected icon and shell behavior | Not Run |  |

## Reviewer Notes

- This matrix should be updated with actual outcomes during staging/production
  verification.
- Do not mark iPhone rows as `Pass` unless they were executed on a physical
  device.
