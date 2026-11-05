import { demoStore } from "@/server/demo-store";
import { allowRequest } from "@/server/rate-limit";
import { staySearchSchema } from "@/server/validation";

export async function GET(request: Request) {
  if (!allowRequest(request, "availability", 120, 60_000)) {
    return Response.json(
      { error: "Too many availability checks. Please try again shortly." },
      { status: 429 },
    );
  }
  const params = new URL(request.url).searchParams;
  const parsed = staySearchSchema.safeParse({
    checkIn: params.get("checkIn"),
    checkOut: params.get("checkOut"),
    adults: params.get("adults") ?? "2",
    children: params.get("children") ?? "0",
    promoCode: params.get("promoCode") ?? undefined,
  });
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0]?.message },
      { status: 400 },
    );

  try {
    return Response.json({
      search: parsed.data,
      categories: demoStore.getAvailability(parsed.data),
      ratePlans: demoStore.getRatePlans(),
    });
  } catch (error) {
    return Response.json({ error: messageOf(error) }, { status: 400 });
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unable to check availability.";
}
