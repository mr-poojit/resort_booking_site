import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";

export type StaffRole = "RESERVATIONS" | "SALES" | "GM";
export type StaffSession = { email: string; name: string; role: StaffRole };

const cookieName = "company_a_session";
const demoPasswordHash = bcrypt.hashSync(
  process.env.SEED_DEMO_PASSWORD ?? "EstateDemo2026!",
  10,
);
const demoStaff: Array<StaffSession & { passwordHash: string }> = [
  {
    email: "reservations@company-a.example",
    name: "Reservations Team",
    role: "RESERVATIONS",
    passwordHash: demoPasswordHash,
  },
  {
    email: "sales@company-a.example",
    name: "Sales Team",
    role: "SALES",
    passwordHash: demoPasswordHash,
  },
  {
    email: "gm@company-a.example",
    name: "General Manager",
    role: "GM",
    passwordHash: demoPasswordHash,
  },
];

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function signingKey(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === "production"
      ? ""
      : "local-only-session-key-change-before-deploy");
  if (secret.length < 32)
    throw new Error("AUTH_SECRET must contain at least 32 characters.");
  return new TextEncoder().encode(secret);
}

export async function signIn(
  email: string,
  password: string,
): Promise<StaffSession | null> {
  const user = demoStaff.find(
    (candidate) => candidate.email === email.toLowerCase(),
  );
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    return null;
  return { email: user.email, name: user.name, role: user.role };
}

export async function createSessionToken(
  session: StaffSession,
): Promise<string> {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(signingKey());
}

export async function readSession(
  request: Request,
): Promise<StaffSession | null> {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, signingKey());
    if (
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      !["RESERVATIONS", "SALES", "GM"].includes(String(payload.role))
    ) {
      return null;
    }
    return {
      email: payload.email,
      name: payload.name,
      role: payload.role as StaffRole,
    };
  } catch {
    return null;
  }
}

export function sessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${cookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${secure}`;
}

export function expiredSessionCookie(): string {
  return `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

export function allowLoginAttempt(key: string): boolean {
  const now = Date.now();
  const attempt = loginAttempts.get(key);
  if (!attempt || attempt.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60_000 });
    return true;
  }
  if (attempt.count >= 5) return false;
  attempt.count += 1;
  return true;
}

export function requireRoles(
  session: StaffSession | null,
  allowed: StaffRole[],
): Response | StaffSession {
  if (!session)
    return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!allowed.includes(session.role)) {
    return Response.json(
      { error: "You do not have access to this action." },
      { status: 403 },
    );
  }
  return session;
}

export function isResponse(value: Response | StaffSession): value is Response {
  return value instanceof Response;
}
