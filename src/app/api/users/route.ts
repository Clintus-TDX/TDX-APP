import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission, logAudit, jsonError, jsonOk, hashPassword } from "@/lib/server";
import { sendWelcomeEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// GET /api/users — list all users
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "manage_users")) return jsonError("Unauthorized", 401);
  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true, email: true, name: true, role: true, status: true,
      phone: true, title: true, colorTheme: true, darkMode: true,
      advancedAccounts: true, createdAt: true, updatedAt: true,
    },
  });
  return jsonOk({ users });
}

// POST /api/users — add user
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "manage_users")) return jsonError("Unauthorized", 401);
  let body: { name?: string; email?: string; role?: string; password?: string };
  try { body = await req.json(); } catch { return jsonError("Invalid body"); }
  const { name, email, role, password } = body;
  if (!name || !email) return jsonError("Name and email required");
  const pw = password || "Techadox2024!";
  const u = await db.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      role: role || "Dispatcher",
      passwordHash: await hashPassword(pw),
      status: "Active",
    },
  });
  await sendWelcomeEmail(name, email.toLowerCase());
  await logAudit({ user, action: "CREATE", entity: "User", entityId: u.id, details: `Created user ${email}` });
  return jsonOk({ user: u });
}
