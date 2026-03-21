# Multi-Company Target Architecture

Date: 2026-03-21

Purpose:
- Lock the recommended first-release tenant model for this repo before executable implementation begins.
- Define the tenant contract the repo should eventually match after authoritative live-baseline alignment.

Important:
- This document is an implementation reference, not executable schema.
- If live exported definitions differ in naming or shape, live remains authoritative and this spec should be aligned deliberately.

## Locked First-Release Shape

Recommended first release:
- one company per user in product behavior
- no company switcher yet
- existing current-company data migrates into one default organization
- current screens, routes, Arabic RTL behavior, and mobile/PWA workflows remain operationally familiar

Why this release shape is locked:
- it minimizes product and offline-risk while still delivering real tenant isolation
- it matches the current repo better than a day-one multi-org switcher
- it keeps the frontend close to its current operational flow while moving isolation into schema, membership, and RLS

## Tenant Root Model

Recommended tenant root:
- `organizations`

Recommended user-to-tenant model:
- `user_profiles` for operator profile/bootstrap metadata
- membership-capable organization linking from the start

Recommended first-release behavior:
- a user effectively belongs to one active organization only
- the data model should still support future multi-membership safely

## Recommended Core Tables

### `organizations`
Purpose:
- tenant root for all company-scoped operational data

Expected role in the app:
- identifies the company whose workspace the operator is currently using
- can later hold org display settings or branding metadata if the product needs it

### `user_profiles`
Purpose:
- profile/bootstrap table linked to the authenticated user

Expected responsibilities:
- identify the operator row corresponding to `auth.users`
- support active/default organization bootstrap
- support future operator metadata and role presentation

### Membership representation
Recommended direction:
- use an explicit membership-capable model even if the first release provisions one company per user

Acceptable first-release behavior:
- exactly one active membership per operator
- no visible org switcher

Why membership-capable now:
- it avoids painting the repo into a corner if multi-company admin behavior is added later
- it keeps the organization model clean even when product behavior is single-company-per-user initially

## Active Organization Concept

The app should have a server-resolved current organization.

Recommended direction:
- use `current_org_id()` or equivalent server helper as the security boundary
- do not make local storage, URL params, or a client-only React variable the main tenant boundary

First-release active-org behavior:
- the user has one effective active org
- that org may be resolved from:
  - a sole active membership
  - or a profile field such as `active_organization_id`
- the app shell should bootstrap that context after login before loading business pages

Deferred explicitly:
- visible company switcher
- browsing multiple company workspaces in one session
- cross-company admin UI

## Target Org Placement On Operational Tables

The repo should eventually align to company-scoped operational rows.

Operational tables that must carry `organization_id` or the aligned live name `org_id`:
- `customers`
- `transfers`
- `transfer_payments`
- `transfer_payment_voids`
- `transfer_overpayment_resolutions`

Additional tenant-related operational metadata already indicated live and expected to matter:
- `created_by`
- `updated_at`
- `is_active` on customers if live keeps using it operationally
- `fx_quote_id` on transfers if live keeps using it operationally

## Parent/Child Org-Consistency Rules

These are required target invariants:

### Customer -> Transfer
- `transfers.organization_id` must match the linked customer's organization

### Transfer -> Payment
- `transfer_payments.organization_id` must match the parent transfer's organization

### Transfer/Payment -> Payment Void
- `transfer_payment_voids.organization_id` must match the parent payment's organization
- `transfer_payment_voids.organization_id` must also match the parent transfer's organization

### Transfer -> Overpayment Resolution
- `transfer_overpayment_resolutions.organization_id` must match the parent transfer's organization

Implementation intent:
- enforce these rules in the database through constraints, defaults, triggers, or equivalent live-aligned mechanisms
- do not rely on frontend discipline alone

## Global vs Tenant-Scoped Objects

### Tenant-scoped
- `customers`
- `transfers`
- `transfer_payments`
- `transfer_payment_voids`
- `transfer_overpayment_resolutions`
- any operational views that expose business rows per company

### Likely global
- `organizations`
- `user_profiles`
- membership representation tables
- `transfer_reference_counters` unless live proves reference numbering is org-scoped

### Requires live confirmation
- `transfer_balances`
- `fx_quotes`
- `audit_logs`

## Expected Auth And Bootstrap Contract

Future tenant bootstrap should work like this:
1. load Supabase session
2. resolve profile and membership/current-org context
3. confirm one active organization for the operator
4. only then render protected operational pages

Failure states that must be handled explicitly:
- signed in but no profile
- signed in but no membership
- signed in but current organization cannot be resolved

First-release UX expectation:
- these conditions fail closed with a provisioning or access message
- they do not fall back to a shared workspace

## Expected Read/Write Scoping Contract

### Reads
- business data must be scoped by current organization through RLS
- client-side query shaping may later add explicit org filters where useful, but that is defense-in-depth only

### Writes
- business writes must be stamped to the current organization server-side or derived from parent records
- the frontend must not rely on privileged roles or service-role access

### Detail routes
- a route like `/customers/:customerId` or `/transfers/:transferId` must behave as:
  - visible if the row belongs to the current organization and the user is allowed to access it
  - not found / unavailable otherwise

## First-Release Non-Goals

Not part of the locked first release:
- company switcher
- tenant-aware branding customization in the UI
- cross-company dashboards
- service-role-backed frontend shortcuts
- broad schema redesign unrelated to tenant isolation

## Architecture Conclusion

The repo should target:
- tenant root via `organizations`
- operator bootstrap via `user_profiles`
- membership-capable org linking from the start
- org-scoped business rows across all operational tables
- server-resolved current organization
- one-company-per-user product behavior for the first release

That is the safest shape for this codebase before any executable tenant implementation begins.
