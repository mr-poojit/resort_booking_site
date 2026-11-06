import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
import { sessionSigningKey } from "./auth";

export type GuestProvider = "email" | "google";

export type GuestProfile = {
  id: string;
  email: string;
  name: string;
  provider: GuestProvider;
};

type GuestRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  googleSub: string | null;
};

const guestCookieName = "wildfern_guest";
const oauthCookieName = "wildfern_oauth";
const memoryAccounts = new Map<string, GuestRecord>();
const googleCerts = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

function memoryStore(): boolean {
  return (
    process.env.VITEST === "true" || process.env.GUEST_AUTH_STORE === "memory"
  );
}

function storePath(): string {
  return path.join(process.cwd(), "data", "guest-accounts.json");
}

function loadAccounts(): GuestRecord[] {
  if (memoryStore()) return [...memoryAccounts.values()];
  try {
    const parsed = JSON.parse(readFileSync(storePath(), "utf8")) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error("Guest account store is invalid.");
    }
    return parsed as GuestRecord[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

function saveAccounts(accounts: GuestRecord[]) {
  if (memoryStore()) {
    memoryAccounts.clear();
    for (const account of accounts) memoryAccounts.set(account.email, account);
    return;
  }
  const file = storePath();
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(accounts, null, 2));
}

export const DEMO_GUEST_EMAIL = "guest@wildfern.example";

export function demoGuestPassword(): string {
  return process.env.SEED_DEMO_PASSWORD ?? "EstateDemo2026!";
}

export async function ensureDemoGuest(): Promise<{
  email: string;
  password: string;
}> {
  const email = DEMO_GUEST_EMAIL;
  const password = demoGuestPassword();
  if (process.env.VITEST === "true") return { email, password };
  if (!loadAccounts().some((account) => account.email === email)) {
    await registerGuest({ name: "Demo Guest", email, password });
  }
  return { email, password };
}

export function clearGuestAccounts() {
  memoryAccounts.clear();
  if (!memoryStore()) saveAccounts([]);
}

export function googleAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
}

export function appOrigin(request: Request): string {
  const configured = process.env.APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  return new URL(request.url).origin;
}

export function googleRedirectUri(request: Request): string {
  const configured = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (configured) return configured;
  return `${appOrigin(request)}/api/auth/guest/google/callback`;
}

function publicProfile(
  account: GuestRecord,
  provider: GuestProvider,
): GuestProfile {
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    provider,
  };
}

export async function registerGuest(input: {
  name: string;
  email: string;
  password: string;
}): Promise<
  { ok: true; user: GuestProfile } | { ok: false; reason: "exists" }
> {
  const email = input.email.toLowerCase();
  const accounts = loadAccounts();
  if (accounts.some((account) => account.email === email)) {
    return { ok: false, reason: "exists" };
  }
  const account: GuestRecord = {
    id: randomUUID(),
    email,
    name: input.name.trim(),
    passwordHash: await bcrypt.hash(input.password, 10),
    googleSub: null,
  };
  accounts.push(account);
  saveAccounts(accounts);
  return { ok: true, user: publicProfile(account, "email") };
}

export async function loginGuest(
  email: string,
  password: string,
): Promise<
  | { status: "ok"; user: GuestProfile }
  | { status: "invalid" }
  | { status: "google" }
> {
  const account = loadAccounts().find(
    (candidate) => candidate.email === email.toLowerCase(),
  );
  if (!account) return { status: "invalid" };
  if (!account.passwordHash) return { status: "google" };
  if (!(await bcrypt.compare(password, account.passwordHash))) {
    return { status: "invalid" };
  }
  return { status: "ok", user: publicProfile(account, "email") };
}

export async function upsertGoogleGuest(profile: {
  sub: string;
  email: string;
  name: string;
  emailVerified: boolean;
}): Promise<
  | { ok: true; user: GuestProfile }
  | { ok: false; reason: "unverified" | "conflict" }
> {
  if (!profile.emailVerified || !profile.email) {
    return { ok: false, reason: "unverified" };
  }
  const email = profile.email.toLowerCase();
  const accounts = loadAccounts();
  const bySub = accounts.find((account) => account.googleSub === profile.sub);
  const byEmail = accounts.find((account) => account.email === email);

  if (bySub && byEmail && bySub.id !== byEmail.id) {
    return { ok: false, reason: "conflict" };
  }

  const existing = byEmail ?? bySub;
  if (existing) {
    if (existing.googleSub && existing.googleSub !== profile.sub) {
      return { ok: false, reason: "conflict" };
    }
    existing.googleSub = profile.sub;
    existing.email = email;
    if (profile.name.trim()) existing.name = profile.name.trim();
    saveAccounts(accounts);
    return { ok: true, user: publicProfile(existing, "google") };
  }

  const account: GuestRecord = {
    id: randomUUID(),
    email,
    name: profile.name.trim() || "Guest",
    passwordHash: null,
    googleSub: profile.sub,
  };
  accounts.push(account);
  saveAccounts(accounts);
  return { ok: true, user: publicProfile(account, "google") };
}

export async function createGuestSessionToken(
  user: GuestProfile,
): Promise<string> {
  return new SignJWT({
    typ: "guest",
    email: user.email,
    name: user.name,
    provider: user.provider,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(sessionSigningKey());
}

function readCookie(request: Request, name: string): string | null {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  return token ?? null;
}

export async function readGuestSession(
  request: Request,
): Promise<GuestProfile | null> {
  const token = readCookie(request, guestCookieName);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSigningKey());
    if (
      payload.typ !== "guest" ||
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      (payload.provider !== "email" && payload.provider !== "google")
    ) {
      return null;
    }
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      provider: payload.provider,
    };
  } catch {
    return null;
  }
}

function cookieSuffix(): string {
  return process.env.NODE_ENV === "production" ? "; Secure" : "";
}

export function guestSessionCookie(token: string): string {
  return `${guestCookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${cookieSuffix()}`;
}

export function expiredGuestCookie(): string {
  return `${guestCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${cookieSuffix()}`;
}

export async function createOauthState(): Promise<{
  state: string;
  cookie: string;
  challenge: string;
}> {
  const state = randomBytes(16).toString("hex");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const token = await new SignJWT({ typ: "oauth", state, verifier })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(sessionSigningKey());
  return {
    state,
    challenge,
    cookie: `${oauthCookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600${cookieSuffix()}`,
  };
}

export function expiredOauthCookie(): string {
  return `${oauthCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${cookieSuffix()}`;
}

export async function readOauthState(
  request: Request,
): Promise<{ state: string; verifier: string } | null> {
  const token = readCookie(request, oauthCookieName);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSigningKey());
    if (
      payload.typ !== "oauth" ||
      typeof payload.state !== "string" ||
      typeof payload.verifier !== "string"
    ) {
      return null;
    }
    return { state: payload.state, verifier: payload.verifier };
  } catch {
    return null;
  }
}

export async function verifyGoogleIdToken(idToken: string): Promise<{
  sub: string;
  email: string;
  name: string;
  emailVerified: boolean;
} | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return null;
  try {
    const { payload } = await jwtVerify(idToken, googleCerts, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: clientId,
    });
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      return null;
    }
    const name =
      typeof payload.name === "string" && payload.name.trim()
        ? payload.name
        : payload.email.split("@")[0] || "Guest";
    return {
      sub: payload.sub,
      email: payload.email,
      name,
      emailVerified: payload.email_verified === true,
    };
  } catch {
    return null;
  }
}

export function loginAttemptKey(
  request: Request,
  action: string,
  email: string,
): string {
  const forwardedFor =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return `${action}:${forwardedFor}:${email.toLowerCase()}`;
}
