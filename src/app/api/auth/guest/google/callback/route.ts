import { NextResponse } from "next/server";
import {
  createGuestSessionToken,
  expiredOauthCookie,
  googleRedirectUri,
  guestSessionCookie,
  readOauthState,
  upsertGoogleGuest,
  verifyGoogleIdToken,
} from "@/server/guest-auth";

function fail(request: Request, code: string) {
  const response = NextResponse.redirect(
    new URL(`/account?error=${code}`, request.url),
  );
  response.headers.set("Set-Cookie", expiredOauthCookie());
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("error")) return fail(request, "google_denied");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauth = await readOauthState(request);
  if (!code || !state || !oauth || oauth.state !== state) {
    return fail(request, "google_failed");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail(request, "google_unconfigured");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleRedirectUri(request),
      grant_type: "authorization_code",
      code_verifier: oauth.verifier,
    }),
  });
  if (!tokenResponse.ok) return fail(request, "google_failed");

  const tokens = (await tokenResponse.json()) as { id_token?: string };
  if (!tokens.id_token) return fail(request, "google_failed");

  const profile = await verifyGoogleIdToken(tokens.id_token);
  if (!profile) return fail(request, "google_failed");

  const saved = await upsertGoogleGuest(profile);
  if (!saved.ok) {
    return fail(
      request,
      saved.reason === "unverified" ? "email_unverified" : "google_failed",
    );
  }

  const session = await createGuestSessionToken(saved.user);
  const response = NextResponse.redirect(new URL("/account", request.url));
  response.headers.append("Set-Cookie", guestSessionCookie(session));
  response.headers.append("Set-Cookie", expiredOauthCookie());
  return response;
}
