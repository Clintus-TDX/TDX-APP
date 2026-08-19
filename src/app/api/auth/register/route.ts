import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, createSessionToken, setSessionCookie, getCurrentUser } from "@/lib/server";
import { isAllowedCompanyEmail } from "@/lib/constants";
import { sendWelcomeEmail } from "@/lib/email";
import { jsonError, jsonOk } from "@/lib/server-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { name?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }
  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (!name || !email || !password) return jsonError("Name, email, and password are required");
  if (!isAllowedCompanyEmail(email))
    return jsonError("Only @techadox.com or @techadox.net company email addresses are allowed.");
  if (password.length < 8) return jsonError("Password must be at least 8 characters");

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return jsonError("An account with this email already exists");

  const user = await db.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      role: "Dispatcher",
      status: "Active",
      colorTheme: "teal",
      darkMode: false,
      columnOrder: "[]",
      pageSize: 10,
      reportColumns: "[]",
      reportColumnOrder: "[]",
      notifyPrefs: "{}",
    },
  });

  // Trigger welcome email
  await sendWelcomeEmail(name, email);

  const token = createSessionToken(user.id);
  await setSessionCookie(token);

  const me = await getCurrentUser();
  return jsonOk({ user: me });
}
