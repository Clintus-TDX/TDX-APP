import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission, logAudit, jsonError, jsonOk } from "@/lib/server";
import bcrypt from "bcryptjs"; // <-- Updated import

export const dynamic = "force-dynamic";

// GET /api/users/[id] — get single user
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "manage_users")) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const found = await db.user.findUnique({ 
    where: { id }, 
    select: { id: true, email: true, name: true, role: true, status: true, phone: true, title: true, createdAt: true } 
  });
  if (!found) return jsonError("Not found", 404);
  return jsonOk({ user: found });
}

// PUT /api/users/[id] — edit user
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "manage_users")) return jsonError("Unauthorized", 401);
  
  const { id } = await params;
  
  let body: Record<string, unknown>;
  try { 
    body = await req.json(); 
  } catch { 
    return jsonError("Invalid body"); 
  }

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) return jsonError("Not found", 404);

  const data: Record<string, unknown> = {};
  
  // Standard fields mapped from your previous setup
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.role === "string") data.role = body.role;
  if (typeof body.status === "string") data.status = body.status;
  if (typeof body.phone === "string") data.phone = body.phone;
  if (typeof body.title === "string") data.title = body.title;

  let auditDetails = `Updated user ${existing.email}`;

  // Handle Password Reset Logic exclusively for Super Admins
  if (typeof body.newPassword === "string" && body.newPassword.trim() !== "") {
    if (user.role !== "Super Admin") {
      return jsonError("Forbidden: Only Super Admins can reset user passwords directly.", 403);
    }
    const saltRounds = 10;
    data.passwordHash = await bcrypt.hash(body.newPassword, saltRounds);
    auditDetails += ` (Password manually reset by Super Admin)`;
  }

  const updated = await db.user.update({ where: { id }, data });
  
  // Log the action to the audit board
  await logAudit({ 
    user, 
    action: "UPDATE", 
    entity: "User", 
    entityId: id, 
    details: auditDetails 
  });
  
  // Strip the password hash before sending the user object back to the client
  const { passwordHash, ...safeUpdated } = updated as any;

  return jsonOk({ user: safeUpdated });
}

// DELETE /api/users/[id] — soft delete (deactivate)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "manage_users")) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) return jsonError("Not found", 404);
  if (existing.id === user.id) return jsonError("Cannot deactivate yourself");

  await db.user.update({ where: { id }, data: { status: "Inactive" } });
  await logAudit({ user, action: "DEACTIVATE", entity: "User", entityId: id, details: `Deactivated user ${existing.email}` });
  return jsonOk({ ok: true });
}