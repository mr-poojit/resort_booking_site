import { isResponse, readSession, requireRoles } from "@/server/auth";
import { classifyWithFallback } from "@/server/classifier";
import { demoStore } from "@/server/demo-store";
import { allowRequest } from "@/server/rate-limit";
import { eventEnquirySchema } from "@/server/validation";

export async function GET(request: Request) {
  const auth = requireRoles(await readSession(request), [
    "RESERVATIONS",
    "SALES",
    "GM",
  ]);
  if (isResponse(auth)) return auth;
  return Response.json({ enquiries: demoStore.getEnquiries() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = eventEnquirySchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  if (parsed.data.source === "WEB_FORM") {
    if (!allowRequest(request, "enquiries", 10, 10 * 60_000)) {
      return Response.json(
        { error: "Too many enquiries. Please try again shortly." },
        { status: 429 },
      );
    }
  } else {
    const auth = requireRoles(await readSession(request), [
      "RESERVATIONS",
      "SALES",
      "GM",
    ]);
    if (isResponse(auth)) return auth;
  }
  const { consentAccepted, ...input } = parsed.data;
  void consentAccepted;
  const classification = await classifyWithFallback(input.rawText);
  return Response.json(
    { enquiry: demoStore.createEnquiry(input, classification) },
    { status: 201 },
  );
}
