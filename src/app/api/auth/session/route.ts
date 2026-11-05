import { readSession } from "@/server/auth";

export async function GET(request: Request) {
  const session = await readSession(request);
  return Response.json({ user: session });
}

export async function DELETE() {
  return new Response(null, {
    status: 204,
    headers: {
      "Set-Cookie":
        "company_a_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
    },
  });
}
