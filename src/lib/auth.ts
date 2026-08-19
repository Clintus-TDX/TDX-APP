// Server-only auth functions (human-built).
// Do NOT import in client components — use auth-types.ts for shared types/helpers.
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "./db";

const SESSION_SECRET =
  process.env.SESSION_SECRET || "techadox-field-coordinator-portal-secret-2024";
const SESSION_COOKIE = "techadox_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

export function createSessionToken(userId: string): string {
  const expiry = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = `${userId}.${expiry}`;
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): { userId: string; expiry: number } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiryStr, sig] = parts;
  const payload = `${userId}.${expiryStr}`;
  const expectedSig = sign(payload);
  if (sig !== expectedSig) return null;
  const expiry = parseInt(expiryStr, 10);
  if (Number.isNaN(expiry) || expiry < Math.floor(Date.now() / 1000)) return null;
  return { userId, expiry };
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS } = await import("./constants");
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    const verified = verifySessionToken(token);
    if (!verified) return null;
    const user = await db.user.findUnique({ where: { id: verified.userId } });
    if (!user || user.status !== "Active") return null;

    let permissions: Record<string, boolean> = {};
    if (DEFAULT_ROLE_PERMISSIONS[user.role]) {
      permissions = { ...DEFAULT_ROLE_PERMISSIONS[user.role] };
    } else {
      const customRole = await db.role.findUnique({ where: { name: user.role } });
      if (customRole) {
        try { permissions = JSON.parse(customRole.permissions || "{}"); } catch { permissions = {}; }
      }
    }
    if (user.role === "Super Admin") {
      permissions = PERMISSIONS.reduce((a, p) => ({ ...a, [p.key]: true }), {});
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      colorTheme: user.colorTheme,
      darkMode: user.darkMode,
      advancedAccounts: user.advancedAccounts,
      columnOrder: user.columnOrder,
      pageSize: user.pageSize,
      reportColumns: user.reportColumns,
      reportColumnOrder: user.reportColumnOrder,
      permissions,
    };
  } catch {
    return null;
  }
}
