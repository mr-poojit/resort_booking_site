import { expect, test } from "@playwright/test";

test("guest can search, hold a stay, pay in test mode, and reach confirmation", async ({
  page,
}) => {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `e2e-${Date.now()}-${Math.random()}`,
  });
  await page.goto("/");

  const stayOffset = 7 + Math.floor(Math.random() * 100);
  const checkIn = new Date(Date.now() + stayOffset * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const checkOut = new Date(Date.now() + (stayOffset + 2) * 86_400_000)
    .toISOString()
    .slice(0, 10);
  await page.getByLabel("Check-in").fill(checkIn);
  await page.getByLabel("Check-out").fill(checkOut);
  await page.getByRole("button", { name: "Check availability" }).click();

  await expect(
    page.getByRole("heading", { name: "Find your stay" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Choose rate" }).first().click();
  await page.getByRole("button", { name: "Continue to guest details" }).click();
  await page.getByLabel("Full name").fill("Demo Guest");
  await page.getByLabel("Email").fill("guest@example.test");
  await page.getByLabel("Phone").fill("+919000000000");
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole("button", { name: "Hold room and continue" }).click();

  await expect(
    page.getByRole("heading", { name: "Test payment" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pay successfully" }).click();
  await expect(
    page.getByRole("heading", { name: "Thank you, Demo Guest." }),
  ).toBeVisible();
  await expect(page.getByText(/^RSV-/)).toBeVisible();
});

test("admin APIs require a session and enforce role boundaries", async ({
  request,
}) => {
  const loginHeaders = {
    "x-forwarded-for": `192.0.2.${1 + Math.floor(Math.random() * 250)}`,
  };
  const anonymousRates = await request.get("/api/admin/rates");
  expect(anonymousRates.status()).toBe(401);
  expect(
    (
      await request.post("/api/enquiries", {
        data: {
          source: "EMAIL",
          rawText: "A forwarded message from a guest asking for a villa",
        },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/enquiries", {
        data: { source: "WEB_FORM", rawText: "A guest asks about event dates" },
      })
    ).status(),
  ).toBe(400);

  const salesLogin = await request.post("/api/auth/login", {
    headers: loginHeaders,
    data: { email: "sales@company-a.example", password: "EstateDemo2026!" },
  });
  expect(salesLogin.ok()).toBeTruthy();
  expect((await request.get("/api/enquiries")).status()).toBe(200);
  const simulatedMessage = await request.post("/api/enquiries", {
    data: {
      source: "EMAIL",
      rawText: "Forwarded: a team of 24 wants a corporate offsite.",
    },
  });
  expect(simulatedMessage.status()).toBe(201);
  expect((await simulatedMessage.json()).enquiry.owner).toBe("Sales");
  expect((await request.get("/api/admin/rates")).status()).toBe(403);
  expect((await request.get("/api/admin/promos")).status()).toBe(403);

  await request.delete("/api/auth/session");
  const reservationsLogin = await request.post("/api/auth/login", {
    headers: loginHeaders,
    data: {
      email: "reservations@company-a.example",
      password: "EstateDemo2026!",
    },
  });
  expect(reservationsLogin.ok()).toBeTruthy();
  expect((await request.get("/api/admin/rates")).status()).toBe(200);
  expect((await request.get("/api/admin/promos")).status()).toBe(403);

  const adminOffset = 30 + Math.floor(Math.random() * 100);
  const checkIn = new Date(Date.now() + adminOffset * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const checkOut = new Date(Date.now() + (adminOffset + 1) * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const holdClient = {
    "x-forwarded-for": `e2e-admin-${Date.now()}-${Math.random()}`,
  };
  const holdResponse = await request.post("/api/holds", {
    headers: holdClient,
    data: {
      checkIn,
      checkOut,
      adults: 2,
      children: 0,
      categorySlug: "estate-room",
      ratePlanCode: "FLEX",
      guestName: "Admin Test Guest",
      email: "admin-test@example.test",
      phone: "+919000000001",
      foreignNational: false,
      consentAccepted: true,
      idempotencyKey: `admin-test-${Date.now()}`,
    },
  });
  expect(holdResponse.status()).toBe(201);

  const belowHeld = await request.patch("/api/admin/rates", {
    data: { categorySlug: "estate-room", date: checkIn, allotment: 0 },
  });
  expect(belowHeld.status()).toBe(409);

  const rateUpdate = await request.patch("/api/admin/rates", {
    data: {
      categorySlug: "estate-room",
      date: checkIn,
      allotment: 3,
      flexRatePaise: 900_000,
    },
  });
  expect(rateUpdate.ok()).toBeTruthy();
  const publicAvailability = await request.get(
    `/api/availability?checkIn=${checkIn}&checkOut=${checkOut}&adults=2&children=0`,
  );
  const availability = await publicAvailability.json();
  const estateRoom = availability.categories.find(
    (category: { slug: string }) => category.slug === "estate-room",
  );
  expect(estateRoom.freeUnits).toBe(2);
  expect(estateRoom.plans[0].price.totalPaise).toBe(1_062_000);

  const blackout = await request.patch("/api/admin/rates", {
    data: { categorySlug: "estate-room", date: checkIn, blackout: true },
  });
  expect(blackout.ok()).toBeTruthy();
  const blackedOutAvailability = await request.get(
    `/api/availability?checkIn=${checkIn}&checkOut=${checkOut}&adults=2&children=0`,
  );
  const blockedCategory = (await blackedOutAvailability.json()).categories.find(
    (category: { slug: string }) => category.slug === "estate-room",
  );
  expect(blockedCategory.available).toBe(false);

  await request.delete("/api/auth/session");
  const gmLogin = await request.post("/api/auth/login", {
    headers: loginHeaders,
    data: { email: "gm@company-a.example", password: "EstateDemo2026!" },
  });
  expect(gmLogin.ok()).toBeTruthy();
  const promo = await request.post("/api/admin/promos", {
    data: {
      code: `E2E${Date.now()}`,
      kind: "PERCENT",
      value: 5,
      startsAt: checkIn,
      endsAt: checkOut,
      minimumNights: 1,
    },
  });
  expect(promo.status()).toBe(201);
  const audit = await request.get("/api/admin/audit");
  expect(audit.status()).toBe(200);
  expect(
    (await audit.json()).entries.some(
      (entry: { action: string }) => entry.action === "PROMO_CREATED",
    ),
  ).toBe(true);
});
