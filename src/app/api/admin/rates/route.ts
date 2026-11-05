import { isResponse, readSession, requireRoles } from "@/server/auth";
import { demoStore } from "@/server/demo-store";
import { updateDaySchema } from "@/server/validation";

export async function GET(request: Request) {
  const auth = requireRoles(await readSession(request), ["RESERVATIONS", "GM"]);
  if (isResponse(auth)) return auth;
  const params = new URL(request.url).searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const start = params.get("start") ?? today;
  const endDate = new Date(`${start}T00:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 14);
  const end = params.get("end") ?? endDate.toISOString().slice(0, 10);
  try {
    return Response.json({
      calendar: demoStore.getCalendar(start, end),
      categories: demoStore.getCategories(),
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Calendar unavailable.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = requireRoles(await readSession(request), ["RESERVATIONS", "GM"]);
  if (isResponse(auth)) return auth;
  const body = await request.json().catch(() => null);
  const parsed = updateDaySchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  try {
    return Response.json({ day: await demoStore.updateDay(parsed.data) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Rate update failed." },
      { status: 409 },
    );
  }
}
