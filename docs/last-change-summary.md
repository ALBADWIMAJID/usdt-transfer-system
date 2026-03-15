# Last Change Summary

Task completed:
- Phase 11 controlled offline customer creation support

Scope implemented:
- Added a persistent customer queue for `customer_create` mutations only
- Added offline customer save on `CustomersPage`
- Added customer replay support for:
  - reconnect-triggered sync of pending customer items
  - manual retry/sync from `CustomersPage`
- Added pending/failed local customer visibility on `CustomersPage`
- Extended shared sync messaging so customer queue items appear in the global
  sync state alongside transfers and payments

Files changed:
- `src/lib/offline/mutationIds.js`
- `src/lib/offline/customerQueue.js`
- `src/lib/offline/replayCustomers.js`
- `src/hooks/usePendingCustomers.js`
- `src/context/SyncProvider.jsx`
- `src/hooks/useReplayQueue.js`
- `src/components/ui/SyncStatusBanner.jsx`
- `src/components/ui/PendingMutationNotice.jsx`
- `src/components/customers/CustomersFormSection.jsx`
- `src/pages/CustomersPage.jsx`
- `docs/offline-pwa-execution-plan.md`
- `docs/project-current-state.md`
- `docs/implementation-log.md`
- `docs/code-map.md`
- `docs/last-change-summary.md`
- `docs/iphone-qa-checklist.md`
- `docs/manual-test-matrix.md`
- `docs/deployment-readiness-checklist.md`

What did NOT change:
- Business logic
- Database schema
- Supabase tables/contracts
- Routes/navigation
- Print flow
- Offline customer edit/delete
- Offline transfer edit/delete
- Offline payment edit/delete
- Broader conflict handling

Verification results:
- `npm run lint` - passed
- `npm run build` - passed
- Preview HTTP smoke - passed (`PREVIEW_ROOT_STATUS=200`,
  `PREVIEW_CUSTOMERS_STATUS=200`)

Known limitations:
- Real iPhone retesting is still required and was not performed from this
  environment
- Customer duplicate matching is conservative and is strongest when phone is
  present; no broad fuzzy duplicate resolution exists
- Offline-created local customers remain separate from confirmed customer files
  until sync succeeds and live customer data is refreshed
- Offline-created local customers are not yet valid for new offline transfer
  creation before sync
- Build still shows the existing chunk-size warning above 500 kB

Recommended next step:
- Re-run the staging/iPhone customer queue scenarios: offline save, reconnect
  replay, failed retry, and post-sync live customer refresh behavior
