import { db } from "@/lib/db";
import { getCurrentUser, hasPermission, jsonError, jsonOk } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!hasPermission(user, "view_accounts")) return jsonError("Forbidden", 403);

  const logs = await db.quickBooksSyncLog.findMany({
    orderBy: { syncedAt: "desc" },
    take: 50,
  });

  return jsonOk({ logs });
}
