# USDT Transfer Management System

Professional operator workspace for managing customers, transfer records, partial payments, and printable transfer statements with React, Vite, and Supabase.

## Overview

This project is a frontend-heavy transfer and settlement system used by operators to:

- create and manage customer profiles
- create transfer records with a simplified settlement workflow
- track partial payments by bank or cash method
- allow overpayment and surface negative remaining balances clearly
- print transfer statements for operational or customer communication
- work with professional transfer reference numbers such as `TR-2026-0001`

The current UI is already functional and intentionally avoids a heavy design system. The focus is operational clarity, safe workflow continuity, and compatibility with the existing Supabase-backed data model.

## Current Implemented Features

- Supabase authentication with protected routes
- Dashboard with live customer, transfer, remaining-balance, and overpayment metrics
- Customer directory with create flow and search
- Customer details page with transfer history and customer-level totals
- Transfers list with search and filters
- Simplified new transfer workflow:
  - customer
  - amount
  - global rate
  - value before percentage
  - percentage
  - value after percentage
  - notes
- Transfer details page with:
  - professional transfer reference number display
  - payment history
  - balance calculation
  - overpayment visibility
  - payment lock messaging after payments exist
- Partial payment recording with bank or cash method selection
- Printable transfer statement using browser-native print flow

## Frontend Notes

- Visible status labels are standardized in the UI while preserving backend-compatible status values.
- Transfer reference numbers are displayed across the transfers list, transfer details, customer transfer history, and print statement.
- Print polish is handled with `@media print` and `@page` rules only. No print library is used.

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Run lint:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

## Current Limitations

- The repository migration history is incomplete relative to the live Supabase project.
- The frontend still maps part of the simplified transfer workflow onto legacy transfer-schema fields.
- Edit and delete workflows are intentionally limited.
- There is no automated test suite yet.
- Some backend behavior, tenant scoping, and RLS source-of-truth still depend on live database alignment work.

## Database Alignment Status

Live schema alignment, `db pull`, and authoritative backend migration repair are intentionally deferred until reliable VPN and Supabase CLI access are available. Existing baseline and audit materials live under [`docs/`](./docs) and [`supabase/baselines/`](./supabase/baselines).

## Related Repository Docs

- `docs/current-system-audit.md`
- `docs/supabase-schema-baseline.md`
- `docs/supabase-rls-baseline.md`
- `docs/migration-state-assessment.md`
- `docs/live-vs-repo-comparison.md`
