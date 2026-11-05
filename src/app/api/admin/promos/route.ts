import { isResponse, readSession, requireRoles } from "@/server/auth";
import { demoStore } from "@/server/demo-store";
import { promoCreateSchema, promoStatusSchema } from "@/server/validation";

export async function GET(request: Request) {
  const auth = requireRoles(await readSession(request), ["GM"]);
  if (isResponse(auth)) return auth;
  return Response.json({ promos: demoStore.getPromos() });
}

export async function POST(request: Request) {
  const auth = requireRoles(await readSession(request), ["GM"]);
  if (isResponse(auth)) return auth;
  const parsed = promoCreateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  try {
    return Response.json(
      { promos: demoStore.createPromo(parsed.data) },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Promo could not be created.",
      },
      { status: 409 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = requireRoles(await readSession(request), ["GM"]);
  if (isResponse(auth)) return auth;
  const parsed = promoStatusSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  try {
    return Response.json({
      promos: demoStore.updatePromo(parsed.data.code, parsed.data.active),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Promo could not be updated.",
      },
      { status: 404 },
    );
  }
}
