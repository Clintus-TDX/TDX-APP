import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission, logAudit, jsonError, jsonOk } from "@/lib/server";

export const dynamic = "force-dynamic";

// GET /api/roles — list all roles
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "manage_roles")) return jsonError("Unauthorized", 401);
  const roles = await db.role.findMany({ orderBy: { createdAt: "asc" } });
  return jsonOk({ roles });
}

// POST /api/roles — create role
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "manage_roles")) return jsonError("Unauthorized", 401);
  let body: { name?: string; description?: string; permissions?: Record<string, boolean> };
  try { body = await req.json(); } catch { return jsonError("Invalid body"); }
  if (!body.name) return jsonError("Role name is required");
  const existing = await db.role.findUnique({ where: { name: body.name } });
  if (existing) return jsonError("Role already exists");
  const role = await db.role.create({
    data: { name: body.name, description: body.description || "", permissions: JSON.stringify(body.permissions || {}), isSystem: false },
  });
  await logAudit({ user, action: "CREATE", entity: "Role", entityId: role.id, details: `Created role ${body.name}` });
  return jsonOk({ role });
}
