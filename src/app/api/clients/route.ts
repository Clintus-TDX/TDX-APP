import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission, logAudit, jsonError, jsonOk } from "@/lib/server";

export const dynamic = "force-dynamic";

// GET — list clients
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  const clients = await db.client.findMany({ orderBy: { name: "asc" } });
  return jsonOk({ clients });
}

// POST — create client
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "create_workorder")) return jsonError("Forbidden", 403);
  let body: { name?: string; address?: string; contactName?: string; contactEmail?: string; contactPhone?: string };
  try { body = await req.json(); } catch { return jsonError("Invalid body"); }
  if (!body.name || !body.name.trim()) return jsonError("Client name is required");

  const existing = await db.client.findFirst({ where: { name: body.name.trim() } });
  if (existing) return jsonOk({ client: existing });

  const client = await db.client.create({
    data: {
      name: body.name.trim(),
      address: body.address || null,
      contactName: body.contactName || null,
      contactEmail: body.contactEmail || null,
      contactPhone: body.contactPhone || null,
    },
  });
  await logAudit({ user, action: "CREATE", entity: "Client", entityId: client.id, details: `Created client: ${client.name}` });
  return jsonOk({ client });
}
