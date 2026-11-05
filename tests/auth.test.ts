import { beforeEach, describe, expect, it } from "vitest";
import {
  createSessionToken,
  isResponse,
  readSession,
  requireRoles,
  signIn,
} from "../src/server/auth";

describe("staff authentication and role checks", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET =
      "unit-test-session-secret-with-more-than-32-bytes";
  });

  it("signs in fake demo accounts and rejects incorrect passwords generically", async () => {
    await expect(
      signIn("reservations@company-a.example", "EstateDemo2026!"),
    ).resolves.toMatchObject({ role: "RESERVATIONS" });
    await expect(
      signIn("reservations@company-a.example", "wrong-password"),
    ).resolves.toBeNull();
    await expect(
      signIn("unknown@example.test", "wrong-password"),
    ).resolves.toBeNull();
  });

  it("accepts a signed session and keeps Reservations out of GM-only actions", async () => {
    const staff = {
      email: "reservations@company-a.example",
      name: "Reservations",
      role: "RESERVATIONS" as const,
    };
    const token = await createSessionToken(staff);
    const request = new Request("http://localhost/api/admin/audit", {
      headers: { cookie: `company_a_session=${token}` },
    });
    const session = await readSession(request);
    expect(session?.role).toBe("RESERVATIONS");
    const result = requireRoles(session, ["GM"]);
    expect(isResponse(result)).toBe(true);
    if (isResponse(result)) expect(result.status).toBe(403);
  });

  it("rejects unauthenticated admin access", () => {
    const result = requireRoles(null, ["RESERVATIONS", "GM"]);
    expect(isResponse(result)).toBe(true);
    if (isResponse(result)) expect(result.status).toBe(401);
  });
});
