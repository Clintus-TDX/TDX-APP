import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit, jsonError, jsonOk } from "@/lib/server";
import { seedDatabase, seedDatabaseSections, ensureSystemRoles } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);

  // Allow seeding if no users exist (first-run bootstrap) or if Super Admin
  const userCount = await db.user.count();
  if (userCount > 0 && user?.role !== "Super Admin") {
    return jsonError("Only Super Admin can seed data", 403);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const sections = body.sections as Record<string, boolean> | undefined;

    // Always ensure system roles exist
    await ensureSystemRoles();

    if (sections) {
      // Section-specific seeding
      await seedDatabaseSections(sections);
      await logAudit({ user, action: "SEED", entity: "System", details: `Database seeded (sections: ${Object.keys(sections).filter(k => sections[k]).join(", ")})` });
    } else {
      // Full seed (backwards compatible)
      await seedDatabase();
      await logAudit({ user, action: "SEED", entity: "System", details: "Database seeded with demo data" });
    }
    return jsonOk({ ok: true });
  } catch (e: any) {
    return jsonError(e.message || "Seed failed");
  }
}
