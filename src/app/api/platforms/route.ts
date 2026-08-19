import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission, logAudit, jsonError, jsonOk } from "@/lib/server";

export const dynamic = "force-dynamic";

// GET — list platforms
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  const platforms = await db.jobPlatform.findMany({ orderBy: { name: "asc" } });
  return jsonOk({ platforms });
}

// POST — create platform
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "create_workorder")) return jsonError("Forbidden", 403);
  let body: { name?: string };
  try { body = await req.json(); } catch { return jsonError("Invalid body"); }
  if (!body.name || !body.name.trim()) return jsonError("Platform name is required");

  const existing = await db.jobPlatform.findFirst({ where: { name: body.name.trim() } });
  if (existing) return jsonOk({ platform: existing });

  const platform = await db.jobPlatform.create({
    data: { name: body.name.trim() },
  });
  await logAudit({ user, action: "CREATE", entity: "JobPlatform", entityId: platform.id, details: `Created platform: ${platform.name}` });
  return jsonOk({ platform });
}
