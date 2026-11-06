import { NextResponse } from "next/server";
import {
  createOauthState,
  googleAuthConfigured,
  googleRedirectUri,
} from "@/server/guest-auth";

export async function GET(request: Request) {
  if (!googleAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/account?error=google_unconfigured", request.url),
    );
  }

  const { state, challenge, cookie } = await createOauthState();
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: googleRedirectUri(request),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
  response.headers.set("Set-Cookie", cookie);
  return response;
}
