# Last Change Summary

Task completed:

- **Safe customer archive / delete workflow**:
  - added customer archive state support with `is_archived` and `archived_at`
  - hard delete is now limited to customers with no linked transfers
  - customers with linked transfers are archived instead of hard-deleted
  - archived customers remain available in historical details but are removed from active new-transfer selection
  - customer lifecycle mutations stay online-only; no offline archive/delete queue was introduced

## Files changed

- `src/pages/CustomerDetailsPage.jsx`
- `src/pages/CustomersPage.jsx`
- `src/components/customers/CustomerRecordCard.jsx`
- `src/pages/NewTransferPage.jsx`
- `src/lib/offline/customerSnapshots.js`
- `src/index.css`
- `supabase/migrations/20260320_add_customer_archive_state.sql`
- `supabase/baselines/current_app_contract_snapshot.sql`
- `docs/implementation-log.md`
- `docs/last-change-summary.md` (this file)

## Verification

- `npm run lint` - passed
- `npm run build` - passed

Build still reports the existing chunk-size warning only.
