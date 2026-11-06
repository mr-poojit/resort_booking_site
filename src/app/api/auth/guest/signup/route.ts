import { NextResponse } from "next/server";
import { allowLoginAttempt } from "@/server/auth";
import {
  createGuestSessionToken,
  guestSessionCookie,
  loginAttemptKey,
  registerGuest,
} from "@/server/guest-auth";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(200),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error:
          "Enter your name, a valid email, and a password of at least 8 characters.",
      },
      { status: 400 },
    );
  }

  if (
    !allowLoginAttempt(
      loginAttemptKey(request, "guest-signup", parsed.data.email),
    )
  ) {
    return Response.json(
      { error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 },
    );
  }

  const result = await registerGuest(parsed.data);
  if (!result.ok) {
    return Response.json(
      { error: "An account with this email already exists. Sign in instead." },
      { status: 409 },
    );
  }

  const token = await createGuestSessionToken(result.user);
  const response = NextResponse.json({ user: result.user });
  response.headers.set("Set-Cookie", guestSessionCookie(token));
  return response;
}
