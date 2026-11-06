import { beforeEach, describe, expect, it } from "vitest";
import { readSession } from "../src/server/auth";
import {
  clearGuestAccounts,
  createGuestSessionToken,
  loginGuest,
  readGuestSession,
  registerGuest,
  upsertGoogleGuest,
} from "../src/server/guest-auth";

describe("guest accounts", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET =
      "unit-test-session-secret-with-more-than-32-bytes";
    process.env.GUEST_AUTH_STORE = "memory";
    clearGuestAccounts();
  });

  it("creates an email account and signs in with that password", async () => {
    const created = await registerGuest({
      name: "Asha Rao",
      email: "Asha@example.com",
      password: "estate-stay",
    });
    expect(created.ok).toBe(true);
    await expect(
      loginGuest("asha@example.com", "estate-stay"),
    ).resolves.toMatchObject({
      status: "ok",
      user: { email: "asha@example.com", name: "Asha Rao", provider: "email" },
    });
    await expect(
      loginGuest("asha@example.com", "wrong-password"),
    ).resolves.toEqual({
      status: "invalid",
    });
  });

  it("rejects a second account with the same email", async () => {
    await registerGuest({
      name: "Asha Rao",
      email: "asha@example.com",
      password: "estate-stay",
    });
    const again = await registerGuest({
      name: "Asha",
      email: "asha@example.com",
      password: "another-stay",
    });
    expect(again).toEqual({ ok: false, reason: "exists" });
  });

  it("keeps a Google-only account on Google sign-in", async () => {
    const saved = await upsertGoogleGuest({
      sub: "google-subject",
      email: "asha@gmail.com",
      name: "Asha Rao",
      emailVerified: true,
    });
    expect(saved.ok).toBe(true);
    await expect(loginGuest("asha@gmail.com", "estate-stay")).resolves.toEqual({
      status: "google",
    });
    const again = await upsertGoogleGuest({
      sub: "google-subject",
      email: "asha@gmail.com",
      name: "Asha R.",
      emailVerified: true,
    });
    expect(again.ok && again.user.name).toBe("Asha R.");
  });

  it("rejects an unverified Google email", async () => {
    await expect(
      upsertGoogleGuest({
        sub: "google-subject",
        email: "asha@gmail.com",
        name: "Asha",
        emailVerified: false,
      }),
    ).resolves.toEqual({ ok: false, reason: "unverified" });
  });

  it("reads a guest session and does not treat it as staff", async () => {
    const created = await registerGuest({
      name: "Asha Rao",
      email: "asha@example.com",
      password: "estate-stay",
    });
    if (!created.ok) throw new Error("expected account");
    const token = await createGuestSessionToken(created.user);
    const request = new Request("http://localhost/account", {
      headers: { cookie: `wildfern_guest=${token}` },
    });
    await expect(readGuestSession(request)).resolves.toMatchObject({
      email: "asha@example.com",
      provider: "email",
    });
    await expect(readSession(request)).resolves.toBeNull();
  });
});
