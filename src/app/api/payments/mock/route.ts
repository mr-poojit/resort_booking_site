import { demoStore } from "@/server/demo-store";
import { z } from "zod";

const paymentSchema = z.object({
  holdId: z.string().min(1).max(100),
  outcome: z.enum(["success", "failure", "pending"]),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { error: "Payment request is not valid." },
      { status: 400 },
    );

  try {
    return Response.json(
      await demoStore.pay(parsed.data.holdId, parsed.data.outcome),
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Payment could not be processed.";
    return Response.json({ error: message }, { status: 409 });
  }
}
