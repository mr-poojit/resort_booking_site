# Technical Design Notes

## Architecture

Next.js App Router 16, strict TypeScript, Tailwind CSS 4, Prisma/PostgreSQL schema, Vitest, and Playwright. Pages are in `src/app`; UI is in `src/components`; pure pricing, date, classifier, auth, and demo-store behavior is in `src/server`. Route handlers validate request data with Zod.

**Important persistence boundary:** `prisma/schema.prisma` and `prisma/seed.ts` define and seed the intended PostgreSQL model, but booking, rate, promo, enquiry, and session demo routes currently use process memory. The app is interactive for local demonstration, not production durable. A restart resets reservations, rates, sample inbox state, and admin changes. The next engineering step before deployment is replacing `DemoStore` calls with PostgreSQL transactions and verifying the migration under a running Postgres service.

## Data model

The Prisma schema contains staff roles, room categories, rate plans, daily rates, per-night allotments, tax rules, holds and hold-night snapshots, bookings and booking-night snapshots, idempotent mock payments, promos, enquiries, AI results, drafts, assignment events, audit events, and export runs. The schema declares unique booking refs, hold idempotency keys, payment provider refs, and one row per category/plan/date. A production migration must add and verify the database check constraint `sold + held <= allotment`; current concurrency tests exercise the in-memory demo guard, not PostgreSQL locking behavior.

Money is stored in integer paise. Nightly GST slab selection is based on the pre-promo tariff; GST is charged after the room discount. The 5%/18% rule is configurable in `TaxRule` and is an assumption to confirm with the client's CA.

## Flows

- Booking: search returns website inventory only; Step 2 creates a 15-minute hold across all nights under a single serialized critical section; Step 3 simulates success/failure/pending. Success moves held units to sold, duplicate payment calls return the same booking, expired holds release units, and a late success refunds if stock was reallocated.
- Pricing: the server ignores client totals, computes room charges, promo, per-night GST, and total; live holds keep their price snapshot after rate edits.
- Staff: signed HTTP-only SameSite=Lax session, fake role accounts, rate/allotment/blackout editor, booking cancellation/CSV, GM-only promo and audit views.
- Enquiries: web form or authenticated simulated email/WhatsApp/phone/social intake, contact masking before optional hosted classification, deterministic rules fallback, date/guest/budget extraction, owner routing, unsorted review, rerouting, editable draft, guarded simulated send.

## AI

The default `RulesClassifier` is deterministic and has no API dependency. `LlmClassifier` accepts an OpenAI-compatible chat-completions endpoint with a JSON response, masks phone/email before sending, has no tools, validates the response with Zod, and times out after 10 seconds. Missing configuration, invalid output, or provider errors fall back to rules. Complaint keyword matches override other categories and route to the GM. Low-confidence/ambiguous items stay unsorted; medium-confidence items show “Check category”. Drafts are never sent automatically. Room quotes come from the server rate/allotment result and invented currency figures are rejected.

The checked-in evaluation set is small and authored for the brief; its 100% score is not a general accuracy claim. See [ai-evaluation.md](ai-evaluation.md).

## UI decisions

Warm white background, estate green, copper action accent, Fraunces display face, and system sans-serif body. The booking steps are Stay, Details, and Pay. Forms are labeled, focus-visible, mobile layouts avoid horizontal overflow, and server loading/error/empty states are included in the main workflows. Current artwork is a locally hosted illustrative SVG placeholder, not an actual resort photo; client photography is required before launch.

## Assumptions

- Fake rates, allotment, demo bookings, promo codes, demo credentials, and example enquiries are synthetic.
- Demo allotments of 4/4/2/1 are deliberately below each category's demo capacity; production allotments must be set by the reservations team.
- Online sales close at 12:00 IST on check-in day; dates and consent rules follow the supplied prompt assumptions.
- Flexible cancellation policy and tax slab assumptions require client/CA confirmation.
- In-memory rate limiting is suitable only for this single-process demo; production needs a shared limiter.
- No real email, WhatsApp, card gateway, PMS, external LLM, or production reservation write is performed unless the optional LLM variables are explicitly configured.

## Cut and next steps

- Connect every handler to PostgreSQL transactions, add the sold+held database check, and run concurrency/late-payment/cancellation tests against a real test database.
- Replace fake demo sign-in with database-backed password lookup and persistent session/revocation controls; add CSRF/origin protection and persistent rate limiting.
- Add real unit-level extraction confidence/source spans, configurable routing thresholds, staff-visible working-hours SLA alerts, and a provider integration test.
- Replace placeholder imagery with approved, optimized property photos; measure Lighthouse on a slow/mobile profile.
- Confirm tax, cancellation, privacy retention/deletion/export policy and public deployment environment before launch.
