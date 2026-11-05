import { isResponse, readSession, requireRoles } from "@/server/auth";
import { demoStore } from "@/server/demo-store";
import { z } from "zod";

const updateSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("reroute"),
    owner: z.enum(["Reservations", "Sales", "GM"]),
    reason: z.string().trim().min(3).max(500),
  }),
  z.object({
    action: z.literal("categorize"),
    category: z.enum([
      "ROOM_BOOKING",
      "WEDDING",
      "CORPORATE_OFFSITE",
      "COMPLAINT",
    ]),
  }),
  z.object({
    action: z.literal("send"),
    body: z.string().trim().min(5).max(5000),
  }),
]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ ref: string }> },
) {
  const auth = requireRoles(await readSession(request), [
    "RESERVATIONS",
    "SALES",
    "GM",
  ]);
  if (isResponse(auth)) return auth;
  const { ref } = await context.params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  try {
    const enquiry =
      parsed.data.action === "reroute"
        ? demoStore.rerouteEnquiry(ref, parsed.data.owner, parsed.data.reason)
        : parsed.data.action === "categorize"
          ? demoStore.categorizeEnquiry(ref, parsed.data.category)
          : demoStore.sendDraft(ref, parsed.data.body);
    return Response.json({ enquiry });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Enquiry update failed.",
      },
      { status: 409 },
    );
  }
}
