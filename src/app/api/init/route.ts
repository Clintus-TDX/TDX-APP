import { db } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import { jsonOk } from "@/lib/server-helpers";

export const dynamic = "force-dynamic";

// Public endpoint — seeds the database if no users exist.
export async function GET() {
  const userCount = await db.user.count();
  if (userCount === 0) {
    try { await seedDatabase(); } catch { /* ignore */ }
  }
  return jsonOk({ initialized: true });
}
