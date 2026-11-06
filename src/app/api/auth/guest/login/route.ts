import { NextResponse } from "next/server";
import { allowLoginAttempt } from "@/server/auth";
import {
  createGuestSessionToken,
  guestSessionCookie,
  loginAttemptKey,
  loginGuest,
} from "@/server/guest-auth";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Email or password is incorrect." },
      { status: 400 },
    );
  }

  if (
    !allowLoginAttempt(
      loginAttemptKey(request, "guest-login", parsed.data.email),
    )
  ) {
    return Response.json(
      { error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 },
    );
  }

  const result = await loginGuest(parsed.data.email, parsed.data.password);
  if (result.status === "google") {
    return Response.json(
      { error: "This email is set up with Google. Continue with Google." },
      { status: 401 },
    );
  }
  if (result.status !== "ok") {
    return Response.json(
      { error: "Email or password is incorrect." },
      { status: 401 },
    );
  }

  const token = await createGuestSessionToken(result.user);
  const response = NextResponse.json({ user: result.user });
  response.headers.set("Set-Cookie", guestSessionCookie(token));
  return response;
}
