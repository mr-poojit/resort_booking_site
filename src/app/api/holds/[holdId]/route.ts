import { demoStore } from "@/server/demo-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ holdId: string }> },
) {
  const { holdId } = await context.params;
  const hold = demoStore.getHold(holdId);
  if (!hold)
    return Response.json(
      { error: "Checkout could not be found." },
      { status: 404 },
    );
  return Response.json({ hold });
}
