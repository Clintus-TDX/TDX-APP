import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission, logAudit, jsonError, jsonOk } from "@/lib/server";

export const dynamic = "force-dynamic";

// PUT /api/roles/[id] — update role permissions
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "manage_roles")) return jsonError("Unauthorized", 401);
  const { id } = await params;
  let body: { name?: string; description?: string; permissions?: Record<string, boolean> };
  try { body = await req.json(); } catch { return jsonError("Invalid body"); }
  const existing = await db.role.findUnique({ where: { id } });
  if (!existing) return jsonError("Not found", 404);
  if (existing.isSystem && existing.name === "Super Admin") return jsonError("Cannot modify Super Admin role");

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.permissions !== undefined) data.permissions = JSON.stringify(body.permissions);

  const updated = await db.role.update({ where: { id }, data });
  await logAudit({ user, action: "UPDATE", entity: "Role", entityId: id, details: `Updated role ${existing.name}` });
  return jsonOk({ role: updated });
}

// DELETE /api/roles/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "manage_roles")) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const existing = await db.role.findUnique({ where: { id } });
  if (!existing) return jsonError("Not found", 404);
  if (existing.isSystem) return jsonError("Cannot delete system roles");
  await db.role.delete({ where: { id } });
  await logAudit({ user, action: "DELETE", entity: "Role", entityId: id, details: `Deleted role ${existing.name}` });
  return jsonOk({ ok: true });
}
