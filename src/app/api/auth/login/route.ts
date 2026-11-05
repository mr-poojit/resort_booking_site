import { NextResponse } from "next/server";
import {
  allowLoginAttempt,
  createSessionToken,
  sessionCookie,
  signIn,
} from "@/server/auth";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { error: "Email or password is incorrect." },
      { status: 400 },
    );

  const forwardedFor =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${forwardedFor}:${parsed.data.email.toLowerCase()}`;
  if (!allowLoginAttempt(key)) {
    return Response.json(
      { error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 },
    );
  }

  const session = await signIn(parsed.data.email, parsed.data.password);
  if (!session)
    return Response.json(
      { error: "Email or password is incorrect." },
      { status: 401 },
    );
  const token = await createSessionToken(session);
  const response = NextResponse.json({ user: session });
  response.headers.set("Set-Cookie", sessionCookie(token));
  return response;
}
