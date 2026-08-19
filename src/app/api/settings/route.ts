import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/server";
import { safeParse, jsonError, jsonOk } from "@/lib/server-helpers";
import { DEFAULT_COLUMN_ORDER, DEFAULT_REPORT_COLUMNS } from "@/lib/constants";

export const dynamic = "force-dynamic";

// GET current user's preferences
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  const u = await db.user.findUnique({ where: { id: user.id } });
  if (!u) return jsonError("Not found", 404);
  return jsonOk({
    colorTheme: u.colorTheme,
    darkMode: u.darkMode,
    columnOrder: safeParse(u.columnOrder, DEFAULT_COLUMN_ORDER),
    pageSize: u.pageSize,
    reportColumns: safeParse(u.reportColumns, DEFAULT_REPORT_COLUMNS),
    reportColumnOrder: safeParse(u.reportColumnOrder, DEFAULT_REPORT_COLUMNS),
    notifyPrefs: safeParse(u.notifyPrefs, {}),
    advancedAccounts: u.advancedAccounts,
  });
}

// PATCH update preferences (theme, dark mode, columns, etc.)
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid body");
  }

  const data: Record<string, unknown> = {};
  if (typeof body.colorTheme === "string") data.colorTheme = body.colorTheme;
  if (typeof body.darkMode === "boolean") data.darkMode = body.darkMode;
  if (typeof body.columnOrder === "object") data.columnOrder = JSON.stringify(body.columnOrder);
  if (typeof body.pageSize === "number") data.pageSize = Math.max(1, Math.min(200, body.pageSize));
  if (typeof body.reportColumns === "object") data.reportColumns = JSON.stringify(body.reportColumns);
  if (typeof body.reportColumnOrder === "object") data.reportColumnOrder = JSON.stringify(body.reportColumnOrder);
  if (typeof body.notifyPrefs === "object") data.notifyPrefs = JSON.stringify(body.notifyPrefs);
  if (typeof body.advancedAccounts === "boolean") data.advancedAccounts = body.advancedAccounts;
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.phone === "string") data.phone = body.phone.trim();
  if (typeof body.title === "string") data.title = body.title.trim();

  const updated = await db.user.update({ where: { id: user.id }, data });
  return jsonOk({
    colorTheme: updated.colorTheme,
    darkMode: updated.darkMode,
    advancedAccounts: updated.advancedAccounts,
  });
}
