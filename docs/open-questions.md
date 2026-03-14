# Open Questions

These are the important questions still not answered by the repository alone.

1. What is the authoritative base Supabase schema?
- The repo does not include the original migrations for `customers`, `transfers`, `transfer_payments`, or RLS.
- Future work should not guess these definitions.

2. What are the canonical transfer statuses?
- The UI currently handles both `partial` and `partially_paid`, and both `cancelled` and `canceled`.
- The system should standardize these values before more features depend on them.

3. Should `paid_at` be operator-entered, database-defaulted, or derived from `created_at`?
- The current UI reads and sorts by `paid_at`, but does not submit it on insert.

4. Should internal transfer IDs appear on customer-facing printed statements?
- The professional reference number already exists.
- The current printable statement still includes the internal transfer ID.

5. Is the current legacy transfer schema still the intended long-term data model?
- The new transfer UI is simplified, but persistence still writes legacy fields such as `pricing_mode`, `client_rate`, `commission_pct`, `commission_rub`, and `gross_rub`.

