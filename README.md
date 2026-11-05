# Company A Direct Booking

A local demo of direct room booking and enquiry routing for Company A, a coffee-estate resort in Chikkamagaluru, Karnataka. It includes a guest search and booking flow, mock payment outcomes, an authenticated staff console, daily rate/allotment editing, promo codes, a shared enquiry inbox, and CSV export.

## Run locally

Requirements: Node.js 22 LTS, npm, and Docker Compose.

```bash
npm install
Copy-Item .env.example .env
docker compose up -d postgres
```

Set `DATABASE_URL` in `.env` to `postgresql://resort:local-dev-only@localhost:5432/resort_booking?schema=public`. Then initialize the PostgreSQL schema and demo rows:

```bash
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Open http://localhost:3000. The Prisma schema and repeatable seed are available, but the currently running booking/admin demo APIs use an in-memory store; booking changes reset when the server restarts and are not written to PostgreSQL. Do not deploy this demo for real guests until the API repository is switched to transactional PostgreSQL persistence.

## Demo accounts

Open `/admin` and use password `EstateDemo2026!` with one of these fake accounts:

- `reservations@company-a.example` can change rates/allotment, view bookings, cancel, export, and triage enquiries.
- `sales@company-a.example` can work the enquiry inbox.
- `gm@company-a.example` has Reservations access plus promos and the audit view.

Set `SEED_DEMO_PASSWORD` to change the shared local demo password. These accounts must not be used in a real deployment.

## Main routes

- `/` home and date/guest search
- `/stays` availability, rate plans, and tax-inclusive totals
- `/stays/[slug]` stay details and date-specific prices
- `/book` three-step Stay / Details / Pay flow
- `/confirmation/[ref]` payment result and booking reference
- `/events` structured wedding/offsite enquiry form
- `/privacy` data-minimisation and consent notice
- `/admin` staff sign-in, rates/allotment, bookings/CSV, promo codes, audit, and inbox

Payments, message delivery, and outside reservation systems are simulated. No card data is collected. Public pages use replaceable illustrative SVG art, not property photography.

## Scripts

| Command                             | Purpose                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------- |
| `npm run dev`                       | Start the local app                                                        |
| `npm run build`                     | Create a production build                                                  |
| `npm test`                          | Run unit and domain tests                                                  |
| `npm run test:e2e`                  | Run browser booking and role tests                                         |
| `npm run lint`                      | Run ESLint                                                                 |
| `npm run type-check`                | Run the TypeScript checker                                                 |
| `npm run db:migrate -- --name init` | Create/apply the initial Prisma migration                                  |
| `npm run db:seed`                   | Seed fake staff, categories, rates, promos, sample enquiries, and bookings |
| `npm run eval:ai`                   | Run the 24-case deterministic router evaluation                            |

See [deployment.md](deployment.md) for environment names, demo limits, and production prerequisites. See [docs/tdd-notes.md](docs/tdd-notes.md) for design decisions and assumptions.
