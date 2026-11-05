import { isResponse, readSession, requireRoles } from "@/server/auth";
import { demoStore } from "@/server/demo-store";

export async function GET(request: Request) {
  const auth = requireRoles(await readSession(request), ["GM"]);
  if (isResponse(auth)) return auth;
  return Response.json({ entries: demoStore.getAuditLogs() });
}
