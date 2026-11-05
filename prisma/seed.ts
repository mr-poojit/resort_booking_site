import bcrypt from "bcryptjs";
import { Prisma, PrismaClient, UserRole } from "@prisma/client";
import { calculatePrice, dateOnly } from "../src/server/core";
import { demoStore, ratePlans, roomCategories } from "../src/server/demo-store";

const prisma = new PrismaClient();
const DAY_MS = 86_400_000;

async function seed() {
  const password = process.env.SEED_DEMO_PASSWORD ?? "EstateDemo2026!";
  const passwordHash = await bcrypt.hash(password, 10);
  const staff = [
    {
      email: "reservations@company-a.example",
      name: "Reservations Team",
      role: UserRole.RESERVATIONS,
    },
    {
      email: "sales@company-a.example",
      name: "Sales Team",
      role: UserRole.SALES,
    },
    {
      email: "gm@company-a.example",
      name: "General Manager",
      role: UserRole.GM,
    },
  ];
  const users = new Map<string, string>();

  for (const member of staff) {
    const user = await prisma.user.upsert({
      where: { email: member.email },
      update: {
        name: member.name,
        role: member.role,
        passwordHash,
        active: true,
      },
      create: { ...member, passwordHash },
    });
    users.set(member.role, user.id);
  }

  const categories = new Map<string, string>();
  for (const category of roomCategories) {
    const room = await prisma.roomCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        totalUnits: category.totalUnits,
        maxGuests: category.maxGuests,
        imagePath: category.imagePath,
        published: true,
      },
      create: {
        slug: category.slug,
        name: category.name,
        description: category.description,
        totalUnits: category.totalUnits,
        maxGuests: category.maxGuests,
        imagePath: category.imagePath,
      },
    });
    categories.set(category.slug, room.id);
  }

  const plans = new Map<string, string>();
  for (const plan of ratePlans) {
    const ratePlan = await prisma.ratePlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        cancellationText:
          plan.code === "FLEX"
            ? "Free cancellation until 7 days before check-in."
            : "Non-refundable. Charged in full when you book.",
        refundable: plan.code === "FLEX",
      },
      create: {
        code: plan.code,
        name: plan.name,
        description: plan.description,
        cancellationText:
          plan.code === "FLEX"
            ? "Free cancellation until 7 days before check-in."
            : "Non-refundable. Charged in full when you book.",
        refundable: plan.code === "FLEX",
      },
    });
    plans.set(plan.code, ratePlan.id);
  }

  const start = new Date(`${dateOnly(new Date())}T00:00:00.000Z`);
  const dailyRates: Prisma.DailyRateCreateManyInput[] = [];
  const allotments: Prisma.AllotmentDayCreateManyInput[] = [];
  const allotmentByCategory = [4, 4, 2, 1];

  for (let offset = 0; offset < 120; offset += 1) {
    const date = new Date(start.getTime() + offset * DAY_MS);
    const weekday = date.getUTCDay();
    const weekendMultiplier = weekday === 5 || weekday === 6 ? 1.15 : 1;

    roomCategories.forEach((category, index) => {
      const roomCategoryId = categories.get(category.slug)!;
      allotments.push({
        roomCategoryId,
        date,
        allotment: allotmentByCategory[index],
      });
      ratePlans.forEach((plan) => {
        const planMultiplier = plan.code === "NONREF" ? 0.9 : 1;
        dailyRates.push({
          roomCategoryId,
          ratePlanId: plans.get(plan.code)!,
          date,
          amountPaise: Math.round(
            category.basePaise * weekendMultiplier * planMultiplier,
          ),
        });
      });
    });
  }

  await prisma.dailyRate.createMany({ data: dailyRates, skipDuplicates: true });
  await prisma.allotmentDay.createMany({
    data: allotments,
    skipDuplicates: true,
  });

  await prisma.taxRule.upsert({
    where: { effectiveFrom: new Date("2026-01-01T00:00:00.000Z") },
    update: {
      thresholdPaise: 750_000,
      atOrBelowRateBps: 500,
      aboveRateBps: 1_800,
    },
    create: {
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      thresholdPaise: 750_000,
      atOrBelowRateBps: 500,
      aboveRateBps: 1_800,
    },
  });

  const promos = [
    { code: "ESTATE10", kind: "PERCENT" as const, value: 10, minimumNights: 2 },
    {
      code: "WEEKDAY500",
      kind: "FLAT" as const,
      value: 50_000,
      minimumNights: 1,
    },
    { code: "VILLA15", kind: "PERCENT" as const, value: 15, minimumNights: 3 },
  ];
  for (const promo of promos) {
    await prisma.promoCode.upsert({
      where: { code: promo.code },
      update: {},
      create: {
        ...promo,
        startsAt: new Date("2026-01-01T00:00:00.000Z"),
        endsAt: new Date("2028-12-31T00:00:00.000Z"),
      },
    });
  }

  for (const enquiry of demoStore.getEnquiries()) {
    const ownerRole =
      enquiry.owner === "GM"
        ? UserRole.GM
        : enquiry.owner === "Sales"
          ? UserRole.SALES
          : UserRole.RESERVATIONS;
    const ownerId = users.get(ownerRole);
    await prisma.enquiry.upsert({
      where: { ref: enquiry.ref },
      update: {},
      create: {
        ref: enquiry.ref,
        source: enquiry.source,
        rawText: enquiry.rawText,
        name: enquiry.name,
        email: enquiry.email,
        phone: enquiry.phone,
        status: enquiry.status,
        category: enquiry.classification.category,
        confidence: enquiry.classification.confidence,
        extracted: enquiry.fields as Prisma.InputJsonValue,
        ownerId,
        complaintAlert: enquiry.classification.complaintAlert,
        aiResult: {
          create: {
            category: enquiry.classification.category,
            confidence: enquiry.classification.confidence,
            fields: enquiry.fields as Prisma.InputJsonValue,
            modelVersion: "rules-v1",
          },
        },
        ...(enquiry.draft
          ? { draft: { create: { body: enquiry.draft, flags: [] } } }
          : {}),
      },
    });
  }

  for (const [index, categorySlug] of [
    "estate-room",
    "garden-room",
    "estate-villa",
  ].entries()) {
    const date = new Date(start.getTime() + (14 + index * 7) * DAY_MS);
    const dateString = dateOnly(date);
    const ratePlanId = plans.get("FLEX")!;
    const roomCategoryId = categories.get(categorySlug)!;
    const tariff = await prisma.dailyRate.findUniqueOrThrow({
      where: {
        roomCategoryId_ratePlanId_date: { roomCategoryId, ratePlanId, date },
      },
    });
    const price = calculatePrice([
      { date: dateString, tariffPaise: tariff.amountPaise },
    ]);
    const nightlySnapshot = price.nights.map(
      ({
        date: nightDate,
        tariffPaise,
        discountPaise,
        gstPaise,
        totalPaise,
      }) => ({
        date: new Date(`${nightDate}T00:00:00.000Z`),
        tariffPaise,
        discountPaise,
        gstPaise,
        totalPaise,
      }),
    );
    const ref = `RSV-SEED0${index + 1}`;
    const holdKey = `seed-hold-${index + 1}`;
    const existingBooking = await prisma.booking.findUnique({ where: { ref } });
    const hold = await prisma.hold.upsert({
      where: { idempotencyKey: holdKey },
      update: {},
      create: {
        idempotencyKey: holdKey,
        roomCategoryId,
        ratePlanCode: "FLEX",
        checkIn: date,
        checkOut: new Date(date.getTime() + DAY_MS),
        adults: 2,
        guestName: `Sample Guest ${index + 1}`,
        email: `guest${index + 1}@example.test`,
        phone: `+91900000000${index + 1}`,
        expiresAt: new Date(Date.now() + DAY_MS),
        status: "CONFIRMED",
        totalPaise: price.totalPaise,
        priceSnapshot: price as unknown as Prisma.InputJsonValue,
        nights: { create: nightlySnapshot },
      },
    });
    await prisma.booking.upsert({
      where: { ref },
      update: {},
      create: {
        ref,
        holdId: hold.id,
        roomCategoryId,
        status: "PAID",
        guestName: `Sample Guest ${index + 1}`,
        email: `guest${index + 1}@example.test`,
        phone: `+91900000000${index + 1}`,
        adults: 2,
        consentVersion: "booking-consent-v1",
        consentAt: new Date(),
        checkIn: date,
        checkOut: new Date(date.getTime() + DAY_MS),
        totalPaise: price.totalPaise,
        nights: { create: nightlySnapshot },
      },
    });
    await prisma.payment.upsert({
      where: { providerRef: `seed-payment-${index + 1}` },
      update: {},
      create: {
        holdId: hold.id,
        providerRef: `seed-payment-${index + 1}`,
        idempotencyKey: `seed-payment-key-${index + 1}`,
        status: "SUCCEEDED",
        amountPaise: price.totalPaise,
        confirmedAt: new Date(),
      },
    });
    if (!existingBooking) {
      await prisma.allotmentDay.update({
        where: { roomCategoryId_date: { roomCategoryId, date } },
        data: { sold: { increment: 1 } },
      });
    }
  }

  console.info(
    `Seeded ${roomCategories.length} categories, ${dailyRates.length} daily rates, ${demoStore.getEnquiries().length} enquiries, and 3 sample bookings.`,
  );
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
