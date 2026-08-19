import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAllowedCompanyEmail } from "@/lib/constants";
import { sendPasswordResetEmail } from "@/lib/email";
import { jsonError, jsonOk } from "@/lib/server-helpers";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }
  const email = (body.email || "").trim().toLowerCase();
  if (!email) return jsonError("Email is required");
  if (!isAllowedCompanyEmail(email))
    return jsonError("Only @techadox.com or @techadox.net company email addresses are allowed.");

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    // For security, respond the same — but we still return ok
    return jsonOk({ ok: true });
  }

  const resetToken = crypto.randomBytes(6).toString("hex").toUpperCase();
  // store token in settings for lookup (simple demo)
  await db.setting.upsert({
    where: { key: `reset:${user.id}` },
    update: { value: resetToken },
    create: { key: `reset:${user.id}`, value: resetToken },
  });

  await sendPasswordResetEmail(user.name, user.email, resetToken);
  return jsonOk({ ok: true });
}
