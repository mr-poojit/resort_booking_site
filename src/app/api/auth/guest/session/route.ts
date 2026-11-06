import { expiredGuestCookie, readGuestSession } from "@/server/guest-auth";

export async function GET(request: Request) {
  const user = await readGuestSession(request);
  return Response.json({ user });
}

export async function DELETE() {
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": expiredGuestCookie() },
  });
}
