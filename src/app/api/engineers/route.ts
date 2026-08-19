import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission, logAudit, jsonError, jsonOk } from "@/lib/server";

export const dynamic = "force-dynamic";

// GET — list engineers
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  const engineers = await db.fieldEngineer.findMany({ orderBy: { name: "asc" } });
  return jsonOk({ engineers });
}

// POST — create engineer
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "create_workorder")) return jsonError("Forbidden", 403);
  let body: { name?: string; email?: string; phone?: string; specialization?: string };
  try { body = await req.json(); } catch { return jsonError("Invalid body"); }
  if (!body.name || !body.name.trim()) return jsonError("Engineer name is required");

  const existing = await db.fieldEngineer.findFirst({ where: { name: body.name.trim() } });
  if (existing) return jsonOk({ engineer: existing });

  const engineer = await db.fieldEngineer.create({
    data: {
      name: body.name.trim(),
      email: body.email || null,
      phone: body.phone || null,
      specialization: body.specialization || null,
    },
  });
  await logAudit({ user, action: "CREATE", entity: "FieldEngineer", entityId: engineer.id, details: `Created engineer: ${engineer.name}` });
  return jsonOk({ engineer });
}
