# Recommended Roadmap

## High Priority

1. Capture the missing base Supabase schema and RLS in versioned migrations.
- Add the authoritative definitions for:
  - `public.customers`
  - `public.transfers`
  - `public.transfer_payments`
  - required indexes
  - foreign keys
  - defaults
  - RLS policies
- This is the highest-priority gap because the frontend already assumes these objects exist, but the repo cannot recreate them safely.

2. Normalize backend business rules that the UI already depends on.
- Standardize transfer statuses.
- Decide how `paid_at` should work.
- Decide whether payment methods should stay hard-coded or become a database-backed controlled list.

3. Replace missing project documentation.
- Replace the stock Vite README with project-specific setup and workflow documentation.
- Keep `docs/current-system-audit.md` as the working memory baseline.

## Medium Priority

1. Add edit workflows carefully.
- If transfer editing is needed, add it on top of the existing payment-lock trigger instead of redesigning transfer pages.
- Consider customer edit support as well.

2. Consolidate duplicated UI/business helpers.
- Shared helpers for:
  - status badge mapping
  - number/date formatting
  - balance calculations

3. Tighten operator quality-of-life details.
- Remove leftover debug logging.
- Add manual refresh where useful.
- Improve empty/error states only where operational value is clear.

## Later / Optional

1. Reporting and export improvements.
- Extended dashboard breakdowns
- date-range reporting
- printable/exportable summaries

2. Configurable payment method management.
- Move payment methods from a hard-coded frontend list to managed configuration if operations require it.

3. Print/branding refinement.
- Keep the current statement structure.
- Improve polish only after schema and workflow stability are settled.

## Best Immediate Next Step

Create the authoritative base Supabase schema and RLS migration history.

Why this is the best next step:
- It removes the biggest source of uncertainty in the project.
- It prevents future prompts from rebuilding or guessing existing database behavior.
- It gives every already-implemented screen a reliable backend contract.

What should not be touched yet:
- Do not redesign the UI.
- Do not rebuild transfer references, payments, print flows, or dashboard cards.
- Do not replace the simplified new transfer workflow until the schema baseline is documented.
