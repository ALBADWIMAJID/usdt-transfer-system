# Multi-Company Live Smoke Checklist

Date: 2026-03-21

Purpose:
- provide the final manual live validation gate for the first safe one-company-per-user tenant rollout
- verify that bootstrap, read/write boundaries, offline behavior, and live RLS all agree in the real environment
- give a human tester a concrete step-by-step checklist and a final go/no-go decision

Important:
- this is a manual checklist for the real live environment
- do not treat this document as a feature spec or migration plan
- if a check fails, record the exact account used, org used, URL, action taken, visible app result, and any Supabase/app-console error

## Preconditions

Before starting:
- deploy the repo state that includes:
  - tenant hardening
  - Phase C current-org bootstrap
  - Phase D read-side org scoping
  - Phase E write-side org stamping
  - Phase F offline/cache/queue org namespacing
  - legacy no-`orgId` queue fail-closed quarantine
- confirm access to:
  - one provisioned test user in Org A
  - one provisioned test user in Org B
  - one signed-in-but-unprovisioned test user
  - a way to inspect Supabase logs for database/auth failures
  - browser devtools for application console and IndexedDB inspection
- run this checklist against live or a privileged production-like tenant environment, not only a local mock

Recommended test identities:
- User A = provisioned into Org A
- User B = provisioned into Org B
- User U = authenticated but not provisioned into an active org

Recommended seed data:
- at least one customer and one transfer in Org A
- at least one customer and one transfer in Org B
- one transfer in each org with no payments yet
- one transfer in Org A prepared for payment -> void -> overpayment resolution checks

## How To Record Results

For each check, mark:
- `PASS`
- `FAIL`
- `N/A`

For each failure, record:
- tester name
- timestamp
- environment URL
- account used
- org expected
- exact page URL
- exact action attempted
- visible UI result
- app console error, if any
- Supabase/auth/database log line, if any

## 1. Auth / Bootstrap States

### 1.1 Signed out

Steps:
1. Open the app in a clean browser session with no active login.
2. Visit `/dashboard`.
3. Visit `/customers`.
4. Visit `/transfers`.

Expected:
- each protected route redirects to `/login`
- no business data renders before login
- no shared workspace appears

### 1.2 Signed in and provisioned

Steps:
1. Sign in as User A.
2. Wait for bootstrap to complete.
3. Confirm the dashboard loads.
4. Navigate to customers and transfers.

Expected:
- login succeeds
- bootstrap completes without error state
- the app reaches normal operational screens for Org A
- no provisioning/error banner appears

### 1.3 Signed in but not provisioned

Steps:
1. Sign out.
2. Sign in as User U.
3. Wait for tenant bootstrap to complete.

Expected:
- the app does not enter the operational workspace
- a fail-closed provisioning/unavailable message is shown
- sign-out remains available

### 1.4 Bootstrap failure

Use one controlled method if available:
- temporarily misconfigure the environment in a staging-like run
- or induce a known failure in the profile/current-org lookup path

Steps:
1. Trigger a controlled bootstrap failure.
2. Sign in with a normally provisioned user.

Expected:
- protected screens do not render operational data
- the app shows the bootstrap failure state
- retry and sign-out controls are visible

### 1.5 Retry flow

Steps:
1. From the bootstrap error state, restore the underlying problem if possible.
2. Click retry.

Expected:
- bootstrap re-runs
- if the underlying issue is fixed, the user enters the operational workspace
- if not fixed, the app remains fail-closed

## 2. Read-Side Org Boundary Checks

### 2.1 Dashboard

Steps:
1. Sign in as User A.
2. Open `/dashboard`.
3. Note counts, recent activity, payment-related summaries, and any visible customer or transfer names.
4. Compare against known Org A seed data.

Expected:
- only Org A data appears
- no Org B customer, transfer, payment, void, or resolution evidence appears

### 2.2 Customers list

Steps:
1. While signed in as User A, open `/customers`.
2. Review the listed customers and derived portfolio totals.

Expected:
- only Org A customers appear
- no Org B customer names or totals appear

### 2.3 Transfers list

Steps:
1. While signed in as User A, open `/transfers`.
2. Review listed transfers, statuses, and customer names.

Expected:
- only Org A transfers appear
- no Org B transfer rows or related customer names appear

### 2.4 Customer detail in-org

Steps:
1. While signed in as User A, open a known Org A customer detail URL.
2. Review summary cards, transfers list, activity, and any payment-derived values.

Expected:
- the page loads normally
- child transfer/payment-derived data matches Org A only

### 2.5 Customer detail out-of-org

Steps:
1. While signed in as User A, attempt to open a known Org B customer detail URL directly.

Expected:
- the page fails closed as unavailable/not found
- no child data for that customer loads
- no partial cross-org summary leaks appear

### 2.6 Transfer detail in-org

Steps:
1. While signed in as User A, open a known Org A transfer detail URL.
2. Review customer name, payments, void state, and overpayment state.

Expected:
- the page loads normally
- all displayed data belongs to Org A

### 2.7 Transfer detail out-of-org

Steps:
1. While signed in as User A, attempt to open a known Org B transfer detail URL directly.

Expected:
- the page fails closed as unavailable/not found
- no payment or overpayment child data loads

## 3. Write-Side Org Boundary Checks

Run all of these while signed in as User A unless otherwise stated.

### 3.1 Customer create

Steps:
1. Create a new customer in Org A.
2. Refresh the customers list.
3. If possible, verify the inserted row in Supabase.

Expected:
- the customer is visible to User A
- the row is stored under Org A only
- User B does not see it in Org B

### 3.2 Customer edit

Steps:
1. Edit an Org A customer.
2. Refresh the page.

Expected:
- changes persist for Org A
- User B cannot observe the edited customer unless it is also in Org B, which it should not be

### 3.3 Customer archive

Steps:
1. Archive an Org A customer that is eligible for archive.
2. Refresh related views.

Expected:
- the archive action succeeds only for the in-org row
- resulting visibility/state remains limited to Org A

### 3.4 Customer delete

Steps:
1. Delete an Org A customer that is eligible for delete.
2. Refresh related views.

Expected:
- the delete action succeeds only for the in-org row
- no out-of-org row is affected

### 3.5 Transfer create

Steps:
1. Create a new transfer for an Org A customer.
2. Refresh the transfers list and transfer detail page.

Expected:
- the transfer is created successfully in Org A
- User B does not see it

### 3.6 Transfer edit

Steps:
1. Edit an existing Org A transfer using the current allowed workflow.
2. Refresh the transfer detail page.

Expected:
- the update applies only to the in-org row
- no cross-org row can be modified

### 3.7 Payment create

Steps:
1. Add a payment to an Org A transfer.
2. Refresh the transfer detail page and any affected list/dashboard views.

Expected:
- the payment is created successfully in Org A
- paid/remaining values update correctly for Org A only

### 3.8 Payment void

Steps:
1. Void the payment created in the previous step.
2. Refresh the transfer detail page and any affected list/dashboard views.
3. If possible, inspect the relevant rows in Supabase.

Expected:
- the void row is created under the same org as the parent payment/transfer
- the payment no longer counts as active paid value
- transfer status refreshes correctly after the void

### 3.9 Overpayment resolution

Steps:
1. Create an overpayment scenario on an Org A transfer.
2. Record an overpayment resolution.
3. Refresh the transfer detail page.

Expected:
- the resolution row is created under the same org as the parent transfer
- the overpayment status shown in the UI reflects the latest in-org resolution only

## 4. Offline / Cache / Queue Checks

These checks should use one browser profile only unless the step explicitly requires another account.

### 4.1 Same-org snapshot hydration

Steps:
1. Sign in as User A and open dashboard, customers, and transfers.
2. Go offline.
3. Reload those pages.

Expected:
- cached snapshots hydrate normally for Org A
- cached content still corresponds to Org A

### 4.2 No cross-org snapshot bleed

Steps:
1. While signed in as User A, load dashboard/customers/transfers so snapshots are populated.
2. Sign out.
3. Sign in as User B in the same browser profile.
4. Open dashboard/customers/transfers.

Expected:
- Org A cached data does not appear in Org B views
- Org B either loads its own data or shows the correct loading/offline state

### 4.3 Org-aware queued mutations

Steps:
1. Sign in as User A.
2. Go offline.
3. Queue:
   - one customer create
   - one transfer create for that customer
   - one payment create for that transfer
4. Inspect IndexedDB if needed.

Expected:
- queued records carry org context
- queue summary reflects the queued records for Org A only

### 4.4 Org-aware replay ordering

Steps:
1. With the queued records from 4.3 still present, reconnect.
2. Trigger sync.
3. Observe sync progress and final data state.

Expected:
- replay order remains customer -> transfer -> payment
- the payment does not replay before its dependent transfer is resolved
- all replayed rows land in Org A only

### 4.5 No replay of legacy no-org queue records

Steps:
1. Seed a legacy queued mutation in IndexedDB with the correct queue type but no `orgId` and no payload `org_id`.
2. Sign in as User A.
3. Trigger queue refresh/sync.

Expected:
- the legacy record is not counted in org-scoped queue summary
- the legacy record does not replay into Org A
- valid org-aware queued records still behave normally

Operational note:
- if legacy no-org queue records are discovered on a device and no longer needed, clear them locally rather than trying to replay them manually

## 5. Direct URL Checks

### 5.1 Direct out-of-org customer URL

Steps:
1. Sign in as User A.
2. Paste a known Org B customer detail URL directly into the browser.

Expected:
- unavailable/not-found behavior only
- no partial customer or child data leak

### 5.2 Direct out-of-org transfer URL

Steps:
1. Sign in as User A.
2. Paste a known Org B transfer detail URL directly into the browser.

Expected:
- unavailable/not-found behavior only
- no partial payment/overpayment leak

### 5.3 Out-of-org mutation attempt behavior

Steps:
1. While on an out-of-org URL or using a stale deep link, attempt any available mutation action if the UI exposes one.
2. If the UI is correctly fail-closed and exposes no action, record that result.

Expected:
- the UI should not offer a valid mutation path on an unavailable/out-of-org detail view
- if any request is attempted, it should fail safely rather than modifying another org's data

## 6. DB / Runtime Observation Checks

If something fails, check both the app runtime and Supabase-side evidence.

### 6.1 What to inspect

Inspect:
- browser console errors
- browser network responses for failing requests
- Supabase auth logs
- Supabase database / Postgres logs if available
- row data for affected `customers`, `transfers`, `transfer_payments`, `transfer_payment_voids`, and `transfer_overpayment_resolutions`

### 6.2 Failures that suggest RLS / tenant-boundary issues

Examples:
- a provisioned user can see or mutate another org's customer or transfer
- a direct out-of-org detail URL returns actual business data
- inserted child rows have the wrong `org_id`
- payment void or overpayment resolution rows land under a different org than the parent
- Supabase returns policy-denied or permission-denied errors for valid in-org actions that should succeed

### 6.3 Failures that suggest bootstrap / tenant-resolution issues

Examples:
- a provisioned user gets stuck in unprovisioned state
- a signed-in user reaches operational screens before bootstrap resolves
- retry does not recover after a transient bootstrap failure
- current-org mismatch errors appear for a supposedly healthy account

### 6.4 Failures that suggest cache / queue issues

Examples:
- Org A cached list data appears after signing into Org B
- queued mutations are visible under the wrong org
- payment replay runs before transfer replay resolution
- legacy no-`orgId` queued records are counted or replayed

## 7. Final Readiness Decision

Mark exactly one:

### Ready for first safe tenant rollout

Use this only if:
- all required checks above pass
- no cross-org read leak is observed
- no out-of-org mutation succeeds
- payment void and overpayment behavior match the active-payment tenant model
- offline replay remains org-safe and ordered
- no legacy no-`orgId` queue record replays into an active org

### Not ready, blocker(s) found

Use this if any required check fails.

For each blocker found, record:
- blocker title
- exact failing checklist item
- reproducible steps
- affected account/org
- observed result
- expected result
- supporting console/log evidence
- recommended smallest next fix

## Required Output To Bring Back After Testing

Bring back to the repo review:
- completed checklist with `PASS` / `FAIL` / `N/A`
- exact blocker list, if any
- screenshots only where useful
- copied error text from browser/Supabase logs
- confirmation of final verdict:
  - `Ready for first safe tenant rollout`
  - or `Not ready, blocker(s) found`
