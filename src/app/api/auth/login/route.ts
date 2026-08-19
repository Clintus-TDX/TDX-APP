import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSessionToken, setSessionCookie, getCurrentUser } from "@/lib/server";
import { jsonError, jsonOk } from "@/lib/server-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  if (!email || !password) return jsonError("Email and password are required");

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return jsonError("Invalid email or password");
  if (user.status !== "Active") return jsonError("Account is inactive. Contact your administrator.");

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return jsonError("Invalid email or password");

  const token = createSessionToken(user.id);
  await setSessionCookie(token);

  const me = await getCurrentUser();
  return jsonOk({ user: me });
}
