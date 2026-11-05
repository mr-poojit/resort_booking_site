import { demoStore } from "@/server/demo-store";
import { allowRequest } from "@/server/rate-limit";
import { holdSchema } from "@/server/validation";

export async function POST(request: Request) {
  if (!allowRequest(request, "holds", 10, 10 * 60_000)) {
    return Response.json(
      { error: "Too many booking attempts. Please try again shortly." },
      { status: 429 },
    );
  }
  const body = await request.json().catch(() => null);
  const parsed = holdSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Booking details are not valid.",
      },
      { status: 400 },
    );
  }

  try {
    const hold = await demoStore.createHold(parsed.data);
    return Response.json({ hold }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to reserve these dates.";
    return Response.json({ error: message }, { status: 409 });
  }
}
