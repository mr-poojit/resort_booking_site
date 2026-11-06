import {
  Document,
  ExternalHyperlink,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const githubUrl = "https://github.com/mr-poojit/resort_booking_site";
const children: Paragraph[] = [];

function title(text: string) {
  children.push(
    new Paragraph({
      children: [new TextRun({ text, bold: true, size: 38, color: "2F4A3A" })],
      spacing: { after: 160 },
    }),
  );
}

function subtitle(text: string) {
  children.push(
    new Paragraph({
      children: [new TextRun({ text, size: 24, color: "75816D" })],
      spacing: { after: 280 },
    }),
  );
}

function heading(text: string) {
  children.push(
    new Paragraph({
      text,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 260, after: 120 },
    }),
  );
}

function subheading(text: string) {
  children.push(
    new Paragraph({
      text,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 180, after: 80 },
    }),
  );
}

function paragraph(text: string) {
  children.push(new Paragraph({ text, spacing: { after: 120, line: 280 } }));
}

function bullet(text: string) {
  children.push(
    new Paragraph({
      text,
      bullet: { level: 0 },
      spacing: { after: 80, line: 260 },
    }),
  );
}

function linkLine(label: string, url: string) {
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `${label}: `, bold: true }),
        new ExternalHyperlink({
          link: url,
          children: [new TextRun({ text: url, style: "Hyperlink" })],
        }),
      ],
      spacing: { after: 100 },
    }),
  );
}

title("Wildfern Estate");
subtitle("Technical Design Document · Local demo · 5 November 2026");
linkLine("GitHub repository", githubUrl);
paragraph(
  "Live app: Not deployed. The working demo runs locally; no public demo URL was provided or verified.",
);
paragraph(
  "Working-name note: Wildfern Estate is a proposed demo brand for Company A, not a confirmed change to the client's legal or trading name.",
);

heading("1. Product Context");
paragraph(
  "Company A is described in the brief as a coffee-estate resort in Chikkamagaluru, Karnataka, with 64 rooms, 12 villas, and lawns for weddings and offsites. The brief identifies agency commissions, a brochure website, fragmented event enquiries, and spreadsheet-based rates as the current problems.",
);
paragraph(
  "The stated success goals are to grow direct room-night share from 12% to 20% in 12 months, bring median first reply under 30 minutes during working hours, and have zero website overbookings. These are target outcomes, not measured results from this demo.",
);
paragraph(
  "The brief's ₹1.05 crore annual opportunity is a scenario estimate based on explicitly stated assumptions, including 62% occupancy, ₹9,500 average tariff, 20% agency commission, and enquiry-loss estimates. It is not independently verified client performance data.",
);

heading("2. Architecture and Rationale");
paragraph(
  "The application uses Next.js App Router 16 and TypeScript for public screens and server route handlers; Tailwind CSS 4 for the responsive interface; Zod for request validation; Prisma with PostgreSQL schema/seed support; Vitest for domain tests; and Playwright for browser workflows. This keeps the demo structure close to the requested stack and makes the pure pricing/classification logic independently testable.",
);
paragraph(
  "Pages are under src/app, shared visual components under src/components, and non-React domain/auth logic under src/server. Route handlers use the Web Request/Response API documented by the installed Next.js version.",
);
paragraph(
  "Important boundary: route handlers currently call a process-memory DemoStore rather than Prisma. Its single-process lock supports deterministic local demonstrations and concurrency tests, but it does not provide cross-process or restart-safe inventory guarantees. PostgreSQL transactions and a database sold-plus-held constraint are required before production use.",
);

heading("3. Data Model");
paragraph(
  "The Prisma schema defines User and roles; RoomCategory; RatePlan; DailyRate; AllotmentDay; TaxRule; Hold and HoldNight; Booking and BookingNight; Payment; PromoCode; Enquiry; AiResult; Draft; AssignmentEvent; AuditLog; and ExportRun.",
);
paragraph(
  "Money is represented in integer paise. Stay dates are date-only values. Unique keys cover booking references, hold idempotency keys, payment provider references, category/rate-plan/date rates, per-night allotments, and booking/hold nights. The schema is valid, but the required database CHECK (sold + held <= allotment) has not yet been added or exercised in PostgreSQL.",
);
paragraph(
  "The demo seeds four categories totalling 64 room keys and 12 villa keys, two rate plans, 120 days of sample rates, reduced website allotments, tax rules, three promos, fake staff, enquiries, and sample bookings. The seed has not been run here because Docker/PostgreSQL was unavailable.",
);

heading("4. Main Flows");
subheading("Guest booking");
paragraph(
  "Guests select dates and party size, view each category's availability and both tax-inclusive rate plans, then complete Stay, Details, and Pay. At Details, the server recomputes price and takes a 15-minute hold for every night. A live hold retains its rate snapshot. The mock gateway offers success, failure, and pending outcomes; success converts held inventory to sold and returns a booking reference. Duplicate payment calls return the existing booking. Expired holds release units; a late success is refunded if another guest has taken the stock. These behaviors are validated against the in-memory implementation, not a real database transaction.",
);
subheading("Staff operations");
paragraph(
  "Staff sign in with fake demo accounts and receive a signed, HTTP-only, SameSite=Lax session. Reservations can edit rates, website allotments, and blackouts, view/cancel bookings, and download a daily CSV. The GM can additionally create/pause promos and inspect the demo audit log. API routes enforce role checks; E2E tests cover anonymous, Sales, Reservations, and GM access.",
);
subheading("Enquiries and events");
paragraph(
  "The structured wedding/offsite form requires consent and submits into the shared inbox. Staff can simulate email, WhatsApp, phone, and social messages. Enquiries are classified, have available guest/date/budget fields extracted, route to Reservations/Sales/GM, can be re-routed with a reason, and receive a human-reviewed reply draft. Send is simulated and never automatic. A price guard rejects non-system quotes.",
);

heading("5. AI and Failure Handling");
paragraph(
  "RulesClassifier is deterministic and works without credentials. It classifies room, wedding, corporate offsite, complaint, or unsure messages; complaint keyword matches override other categories and route to the GM. Low-confidence or ambiguous cases enter Unsorted; medium-confidence cases are marked Check category.",
);
paragraph(
  "When the LLM environment variables are set, the rules classifier and the OpenAI-compatible LlmClassifier run at the same time. The model masks email addresses and phone numbers, sends no tools, requests JSON, validates output with Zod, and has a 10-second timeout. Missing configuration, timeout, invalid JSON, or provider error keeps the rules result. Disagreement or an unsure result stays unsorted for a person. Complaint keywords still override the model. Draft prices come from the server rate/allotment lookup and are not sent without a staff action. The staff inbox polls so a guest enquiry appears while that console is open.",
);
paragraph(
  "The checked-in evaluation contains 24 hand-labeled examples and reports 100% accuracy and 100% complaint alert recall on that authored set. This small, self-authored result is a smoke test, not a real-world model quality claim.",
);

heading("6. UI and Design Decisions");
paragraph(
  "The visual system uses a warm off-white background, estate green, a restrained copper accent, Fraunces display headings, and system sans-serif body text. The 6–8-screen goal is served by home/search, stay listing, stay detail, three-step booking, confirmation, events, privacy, and a consolidated staff console.",
);
paragraph(
  "Date and guest search leads directly into live availability. Rate options show tax-inclusive totals and cancellation terms before checkout. The staff console is compact and task-focused, with rates/allotment, booking/export, inbox, GM promos, and audit views. Inputs have labels and focus styles; the inbox and forms reflow for mobile widths.",
);
paragraph(
  "Wildfern Estate is a working brand concept. The room, villa, event, and hero photographs are locally served Unsplash stock images, not Company A property photographs. Their sources and replacement note are in docs/image-sources.md.",
);

heading("7. Assumptions and Constraints");
bullet(
  "ASSUMPTION (from brief): flexible cancellation is free until 7 days before check-in; the non-refundable plan charges in full.",
);
bullet(
  "ASSUMPTION (from brief): online sales close at 12:00 IST on check-in day and past dates cannot be booked.",
);
bullet(
  "ASSUMPTION (from brief): GST slabs are 5% up to ₹7,500 and 18% above it, selected on pre-promo tariff; this requires CA confirmation.",
);
bullet(
  "ASSUMPTION (demo): sample rates, 4/4/2/1 allotments, promo codes, bookings, example guest data, and login accounts are synthetic.",
);
bullet(
  "ASSUMPTION (demo): the brand name and all stock imagery are provisional and require owner/client approval.",
);
bullet(
  "Known implementation limit: booking, session, rates, audit, and inbox state are in process memory and reset on restart. The current zero-overbooking tests exercise a single process only.",
);
bullet(
  "Privacy limit: the demo avoids online passport/ID capture and records booking consent version/time, but persistent retention/deletion/export operations and a production DPDP policy remain to be implemented.",
);

heading("8. What Was Cut and Next Steps");
bullet(
  "Replace DemoStore operations with PostgreSQL-backed service methods and conditional per-night updates inside one transaction; add and test CHECK (sold + held <= allotment).",
);
bullet(
  "Run migration, seed, concurrency, late-payment, cancellation, and idempotency tests against a real Postgres test database.",
);
bullet(
  "Replace fake demo auth with database-backed users, revocation controls, durable rate limiting, and production CSRF/origin protection.",
);
bullet(
  "Confirm GST/cancellation rules, brand name, image usage, DPDP retention/deletion, and export fields with the client and relevant advisers.",
);
bullet(
  "Replace stock photos with approved property images; measure performance on a slow mobile connection.",
);
bullet(
  "Deploy only after persistence, secrets, operational monitoring, and security review are complete. No live app is currently deployed.",
);

const document = new Document({
  creator: "Wildfern Estate demo project",
  title: "Wildfern Estate Technical Design Document",
  description:
    "Architecture, flows, AI, UI decisions, assumptions, and next steps.",
  sections: [
    {
      properties: {
        page: {
          margin: { top: 720, right: 900, bottom: 720, left: 900 },
        },
      },
      children,
    },
  ],
});

async function main() {
  const outputPath = join(process.cwd(), "docs", "technical-design.docx");
  await writeFile(outputPath, await Packer.toBuffer(document));
  console.info(`Wrote ${outputPath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
