# USDT Transfer Management System

Professional operator workspace for managing customers, transfer records,
payments, overpayments, and printable transfer statements with React, Vite, and
Supabase.

## Overview

This repository contains the current frontend application plus supporting
Supabase migrations and operational documentation for the USDT transfer system.
The product is no longer a simple MVP: the current repo includes tenant-aware
bootstrap/scoping, payment-correction workflows, offline queues, and a
mobile/PWA-oriented operator UI.

## Authoritative Status

Use these docs in this order when you want the real current state:

- `docs/current-release-status.md` - concise source of truth for current release
  status and blockers
- `docs/project-current-state.md` - detailed implementation baseline and feature
  inventory
- `docs/multi-company-rollout-readiness.md` - rollout gate for the first safe
  tenant-aware release

## Current Implemented Features

- Supabase authentication with protected routes and tenant bootstrap
- Current-org scoped dashboard, customers, transfers, and detail screens
- Customer create flow plus online edit/archive/delete
- Transfer create flow plus safe online edit rules before/after confirmed
  payments
- Payment capture, payment void, replacement-payment correction, and
  overpayment-resolution workflows
- Transfer reference numbers such as `TR-2026-0001`
- Printable transfer statement with browser-native print flow
- PWA shell foundation with service worker registration in production
- Snapshot-backed offline reads for approved pages
- Org-aware offline customer/transfer/payment creation queues with replay
- Polished Arabic RTL desktop/mobile UI with light/dark/auto theme preference

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

Note:
- there is currently no `npm test` script or automated test suite in this repo

## Current Release Blockers

- The first safe tenant-aware rollout is still blocked by live smoke validation
  in a privileged environment
- Deployment readiness checks are still mostly `Not Run`
- Physical iPhone / Safari / Home Screen validation is still `Not Run`
- The repository migration history is still incomplete relative to the live
  Supabase project
- The simplified transfer UI still persists into a legacy transfer-schema shape

## Related Repository Docs

- `docs/current-release-status.md`
- `docs/project-current-state.md`
- `docs/current-system-audit.md`
- `docs/multi-company-rollout-readiness.md`
- `docs/multi-company-live-smoke-checklist.md`
- `docs/deployment-readiness-checklist.md`
- `docs/iphone-qa-checklist.md`
- `docs/open-questions.md`
