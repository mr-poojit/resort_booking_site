import { demoStore } from "@/server/demo-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ ref: string }> },
) {
  const { ref } = await context.params;
  const booking = demoStore.getBooking(ref);
  if (!booking)
    return Response.json({ error: "Booking not found." }, { status: 404 });
  return Response.json({ booking });
}
