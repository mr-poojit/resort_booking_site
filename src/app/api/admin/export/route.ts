import { isResponse, readSession, requireRoles } from "@/server/auth";
import { demoStore } from "@/server/demo-store";
import { z } from "zod";

export async function GET(request: Request) {
  const auth = requireRoles(await readSession(request), ["RESERVATIONS", "GM"]);
  if (isResponse(auth)) return auth;
  const parsed = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .safeParse(new URL(request.url).searchParams.get("date"));
  if (!parsed.success)
    return Response.json(
      { error: "Choose a valid check-in date." },
      { status: 400 },
    );
  return new Response(demoStore.getCsv(parsed.data), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookings-${parsed.data}.csv"`,
    },
  });
}
