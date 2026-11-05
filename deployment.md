# Deployment and Local Setup

## Local demo

Requirements: Node.js 22 LTS, npm, and Docker Compose.

1. Install packages with `npm install`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` to `postgresql://resort:local-dev-only@localhost:5432/resort_booking?schema=public`.
3. Start Postgres with `docker compose up -d postgres`.
4. Create the initial schema with `npx prisma migrate dev --name init`.
5. Seed fake accounts and sample rows with `npm run db:seed`.
6. Start the website with `npm run dev`, then visit `http://localhost:3000`.
7. Run checks with `npm run lint`, `npm run type-check`, `npm test`, `npm run test:e2e`, and `npm run eval:ai`.

The local demo currently uses a process-memory store for API behavior. The Prisma schema and seed are included, but route handlers do not persist bookings or staff changes to PostgreSQL yet. Restarting the process resets the booking/admin/inbox state. Keep this as a local review demo; it is not ready for Vercel or real guest traffic.

## Demo staff accounts

All accounts use the local-only fake password `EstateDemo2026!`; set `SEED_DEMO_PASSWORD` before seeding to change it.

- `reservations@company-a.example`: rates, allotments, blackouts, bookings, export, inbox.
- `sales@company-a.example`: inbox and enquiry routing.
- `gm@company-a.example`: Reservations permissions plus promo codes and audit log.

These are synthetic reviewer accounts, not client staff identities. Do not deploy the default password.

## Environment variable names

`.env.example` contains names only. Never commit `.env` or paste secret values into source control.

- `DATABASE_URL`: local or hosted PostgreSQL connection.
- `SEED_DEMO_PASSWORD`: optional local seed password for fake staff.
- `AUTH_SECRET`: signing key for the staff session cookie; use a random value of at least 32 characters.
- `LLM_PROVIDER`: optional provider selector; unset keeps deterministic rules classification.
- `LLM_API_URL`: optional OpenAI-compatible chat-completions endpoint.
- `LLM_MODEL`: hosted model identifier.
- `LLM_API_KEY`: hosted model credential; contact details are masked before the request.
- `PAYMENT_WEBHOOK_SECRET`: reserved for a future signed mock/hosted payment webhook.
- `INTERNAL_SWEEP_SECRET`: reserved for a future hold-expiry sweeper route.

## Production deployment status

A production deployment is intentionally not documented as ready. Before enabling Vercel/Neon or accepting real bookings, implement PostgreSQL-backed service methods with transactional per-night conditional updates, install and test the database `CHECK (sold + held <= allotment)` constraint, persist payments and idempotency records, replace fake authentication with database-backed users, and add durable rate limiting and operational monitoring. Then run the concurrency suite against a real Postgres test database and complete the DPDP retention/export/delete policy with the client.
