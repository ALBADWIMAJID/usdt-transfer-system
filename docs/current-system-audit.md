# Current System Audit

Date: 2026-03-13

Scope:
- This audit is based on the repository contents only.
- It reflects the current React + Vite + Supabase codebase state.
- It does not assume any database objects beyond what the frontend selects/inserts and what the included SQL migration defines.

## 1. Current Architecture

Frontend structure:
- Single-page React app bootstrapped with Vite.
- Routing is defined in `src/App.jsx`.
- The app uses a protected shell layout:
  - `LoginPage`
  - `ProtectedRoute`
  - `AppShell`
  - business pages under the shell
- Styling is centralized in `src/index.css`, with some page-local inline style objects.

Auth flow:
- Supabase client is created in `src/lib/supabase.js` from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- `src/context/AuthProvider.jsx` loads the current session with `supabase.auth.getSession()`.
- The provider subscribes to `supabase.auth.onAuthStateChange(...)`.
- Login is email/password only through `supabase.auth.signInWithPassword(...)`.
- Logout uses `supabase.auth.signOut()`.
- Route protection is handled in `src/components/ProtectedRoute.jsx`.

Routing structure:
- `/` redirects to `/dashboard` or `/login` depending on session state.
- `/login`
- `/dashboard`
- `/customers`
- `/customers/:customerId`
- `/transfers`
- `/transfers/new`
- `/transfers/:transferId`

Supabase integration:
- There is no custom backend service layer in the repo.
- The frontend talks directly to Supabase from the browser using the anon key.
- The code assumes Supabase RLS already exists and is correct.
- Data fetching is page-local and imperative with `useEffect`.

Key pages and responsibilities:
- `src/pages/LoginPage.jsx`: sign-in form.
- `src/pages/DashboardPage.jsx`: metrics and recent transfer activity.
- `src/pages/CustomersPage.jsx`: create customer, list customers, search customers.
- `src/pages/CustomerDetailsPage.jsx`: customer summary, customer transfer list, customer-level totals.
- `src/pages/TransfersPage.jsx`: transfer list, search, status/date filters.
- `src/pages/NewTransferPage.jsx`: simplified transfer creation flow with derived legacy fields.
- `src/pages/TransferDetailsPage.jsx`: transfer summary, payment entry, balance state, print statement.

## 2. Implemented Features

Authentication:
- Implemented in `src/context/AuthProvider.jsx`, `src/context/auth-context.js`, `src/pages/LoginPage.jsx`, and `src/components/ProtectedRoute.jsx`.
- Session-aware redirect flow is implemented.

Application shell:
- Implemented in `src/components/AppShell.jsx`.
- Includes nav links to dashboard, customers, transfers, and new transfer.
- Includes signed-in user email and sign-out action.

Dashboard:
- Implemented in `src/pages/DashboardPage.jsx`.
- Fetches:
  - customer count
  - all visible transfers
  - all visible transfer payments
- Computes:
  - total transfers
  - open/partial transfer count
  - total payable RUB
  - total remaining RUB
  - overpaid transfer count
- Shows recent transfers and links to transfer details and customer details.

Customers page:
- Implemented in `src/pages/CustomersPage.jsx`.
- Supports:
  - customer creation
  - customer list rendering
  - search by name or phone
  - direct navigation to customer profile

Customer details page:
- Implemented in `src/pages/CustomerDetailsPage.jsx`.
- Loads one customer and all transfers for that customer.
- Computes customer-level totals:
  - total transfers
  - total payable RUB
  - total paid RUB
  - total remaining RUB
  - open/partial count
- Supports transfer status filtering.
- Provides direct link to create a new transfer for that customer.

Transfers list:
- Implemented in `src/pages/TransfersPage.jsx`.
- Loads transfers plus related customer names.
- Supports:
  - search by reference number or customer
  - status filter
  - created-from date filter
- Each transfer links to its independent transfer details page.

New transfer flow:
- Implemented in `src/pages/NewTransferPage.jsx`.
- Simplified operator workflow is present:
  - customer
  - amount
  - global rate
  - value before percentage
  - percentage
  - value after percentage
  - notes
- The page derives and persists legacy schema fields:
  - `usdt_amount`
  - `market_rate`
  - `client_rate`
  - `pricing_mode`
  - `commission_pct`
  - `commission_rub`
  - `gross_rub`
  - `payable_rub`
  - `status`
- After insert it reads back `id` and `reference_number` and redirects to the transfer details page.

Transfer details page:
- Implemented in `src/pages/TransferDetailsPage.jsx`.
- Loads one transfer and the related customer name.
- Loads transfer payments.
- Supports:
  - payment recording
  - balance calculation
  - overpayment visibility
  - print action via `window.print()`
- Shows:
  - transfer summary
  - payment history
  - edit-safety warning
  - print statement

Partial payments:
- Implemented in `src/pages/TransferDetailsPage.jsx`.
- Payments are inserted into `public.transfer_payments`.
- Payment history is listed newest first by `paid_at`, then `created_at`.

Payment method / bank selection:
- Implemented in `src/pages/TransferDetailsPage.jsx`.
- Current fixed options:
  - Sberbank
  - Tinkoff
  - VTB
  - Alfa Bank
  - Raiffeisen
  - Cash
  - Other bank

Overpayment support:
- Implemented in `src/pages/TransferDetailsPage.jsx` and `src/pages/DashboardPage.jsx`.
- Negative remaining balance is intentionally supported and surfaced in the UI.
- Customer-level and dashboard-level totals also account for overpayment math.

Printable transfer statement:
- Implemented in `src/pages/TransferDetailsPage.jsx`.
- Print-specific CSS is implemented in `src/index.css`.
- Statement includes:
  - transfer overview
  - pricing summary
  - payment history
  - totals

Transfer reference numbers:
- Implemented in `supabase/migrations/20260313_add_transfer_reference_numbers_and_payment_lock.sql`.
- The migration adds:
  - `public.transfers.reference_number`
  - yearly counter table
  - insert-time generator
  - backfill logic
  - uniqueness
  - format check
  - immutability trigger
- UI surfaces already display the reference number in:
  - dashboard
  - transfers list
  - customer transfer list
  - transfer details
  - printable statement

Payment-lock safety:
- Implemented in `supabase/migrations/20260313_add_transfer_reference_numbers_and_payment_lock.sql`.
- The trigger blocks updates to core transfer pricing/customer fields once related payments exist.
- The frontend currently only communicates this in the UI; no edit form exists yet.

## 3. Database State Assumptions

The frontend currently expects these tables:
- `public.customers`
- `public.transfers`
- `public.transfer_payments`

The frontend currently expects at least these customer columns:
- `id`
- `full_name`
- `phone`
- `notes`
- `created_at`

The frontend currently expects at least these transfer columns:
- `id`
- `reference_number`
- `customer_id`
- `usdt_amount`
- `market_rate`
- `client_rate`
- `pricing_mode`
- `commission_pct`
- `commission_rub`
- `gross_rub`
- `payable_rub`
- `status`
- `notes`
- `created_at`

The frontend currently expects at least these transfer payment columns:
- `id`
- `transfer_id`
- `amount_rub`
- `payment_method`
- `note`
- `paid_at`
- `created_at`

Important migration state:
- The repo only contains one SQL migration:
  - `supabase/migrations/20260313_add_transfer_reference_numbers_and_payment_lock.sql`
- That migration does not create the base `customers`, `transfers`, or `transfer_payments` tables.
- That migration also does not define RLS policies.

Important assumptions and risks:
- The app relies completely on pre-existing database tables and RLS policies that are not versioned in this repo.
- `transfer_payments.paid_at` is read and sorted, but the current payment form does not set it explicitly.
- The app assumes `created_at` exists and is populated for customers, transfers, and payments.
- The app assumes transfer IDs are already generated by the database, likely UUIDs, but no base migration confirms that.
- The frontend writes `pricing_mode: 'hybrid'` even though the visible operator workflow no longer exposes legacy pricing concepts directly.

## 4. Business Workflow Coverage

Customer management:
- Strong for MVP create/list/view.
- Not implemented for edit/delete/archive.

Transfer creation:
- Strong for a simplified create-only operator workflow.
- The page maps simplified inputs into legacy transfer fields successfully.

Transfer tracking:
- Strong for list/detail visibility.
- Each transfer has its own details page and customer linkage.

Payments:
- Strong for add/list/view of partial payments.
- Payment method and notes are supported.
- Bank/cash labeling is already present.

Overpayment:
- Clearly supported in math and UI.
- Negative balances are treated as valid and intentionally visible.

Printing:
- Implemented and reasonably structured.
- Print mode hides the surrounding shell and focuses on the statement.

Dashboard reporting:
- Solid for a lightweight operational view.
- Metrics are useful and already go beyond simple counts.

## 5. Incomplete / Weak Areas

Base database definition is missing from the repo:
- The largest structural gap is the absence of foundational schema migrations for:
  - `customers`
  - `transfers`
  - `transfer_payments`
  - RLS policies

README is not project-specific:
- `README.md` is still the stock Vite template and does not explain setup, schema, workflow, or Supabase expectations.

No test harness is present:
- There is no test script in `package.json`.
- No automated coverage exists for calculations, route protection, or data workflows.

Some backend rules are only implied:
- Payment method options are enforced only by the UI, not by any visible database constraint in the repo.
- Transfer status values are normalized in the UI, but no visible enum/check constraint exists in the repo.

Payment timestamp handling is unclear:
- The UI sorts and displays `paid_at`, but the current payment insert does not send it.
- If the database does not default `paid_at`, operator-entered payment chronology may be weak.

Edit flow is not implemented:
- The DB has a payment-lock trigger, but the app has no transfer edit page yet.
- This means part of the safety work is preparatory rather than fully exercised by the UI.

Legacy schema mapping remains visible:
- `pricing_mode`, `client_rate`, `commission_pct`, `commission_rub`, and `gross_rub` are still part of the saved model.
- The operator sees a simplified workflow, but the underlying persistence model is still more complex and legacy-shaped.

Some code quality issues remain:
- `src/pages/NewTransferPage.jsx` still contains `console.log(payload)`.
- Status badge logic and formatting helpers are duplicated across multiple pages instead of being shared.

Migration scope is mixed:
- The single migration combines transfer reference numbers and transfer payment-lock rules.
- Future database history will be easier to reason about if concerns are separated in later migrations.

Customer-facing print output may still expose internal data:
- The printable statement still includes the internal transfer ID alongside the professional reference number.
- That may or may not match the desired customer-facing policy.

## 6. Risk of Repeating Work

The following areas are already implemented and should not be rebuilt from scratch:
- Supabase email/password login flow
- protected routing and shell layout
- dashboard metrics card view
- customer creation and customer list search
- customer details page with transfer list
- transfer list with filters
- simplified new transfer form
- independent transfer details page
- partial payment recording
- bank/cash payment method selection
- overpayment and negative balance handling
- printable transfer statement
- transfer reference number generation and UI display
- database-level transfer core-field lock after payments exist

The following areas are only partially complete and should be extended carefully rather than restarted:
- dashboard reporting
- print polish
- transfer safety controls
- legacy-to-simplified transfer field mapping
- search and filtering

## 7. What Should Not Be Rebuilt

Do not rebuild:
- login/auth routing
- the customer page flow
- the customer details transfer list concept
- the transfer details page concept
- the partial payment model
- overpayment handling
- printable transfer statement capability
- transfer reference number system
- basic dashboard metrics structure

Instead:
- extend or harden what already exists
- document the schema assumptions
- fill in missing backend foundations
