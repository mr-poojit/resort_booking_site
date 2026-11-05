import { isResponse, readSession, requireRoles } from "@/server/auth";
import { demoStore } from "@/server/demo-store";
import { z } from "zod";

export async function GET(request: Request) {
  const auth = requireRoles(await readSession(request), ["RESERVATIONS", "GM"]);
  if (isResponse(auth)) return auth;
  return Response.json({ bookings: demoStore.listBookings() });
}

export async function PATCH(request: Request) {
  const auth = requireRoles(await readSession(request), ["RESERVATIONS", "GM"]);
  if (isResponse(auth)) return auth;
  const parsed = z
    .object({ ref: z.string().min(1).max(30), action: z.literal("cancel") })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: "Booking action is not valid." },
      { status: 400 },
    );
  try {
    return Response.json({
      booking: await demoStore.cancelBooking(parsed.data.ref),
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Cancellation failed.",
      },
      { status: 404 },
    );
  }
}
