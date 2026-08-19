import { NextRequest } from "next/server";
import { getCurrentUser, logAudit, jsonError, jsonOk } from "@/lib/server";
import { clearWorkOrderData } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "Super Admin") return jsonError("Only Super Admin can clear data", 403);
  try {
    const body = await req.json().catch(() => ({}));
    const sections = body.sections as Record<string, boolean> | undefined;
    await clearWorkOrderData(sections);
    const detail = sections
      ? `Cleared data (sections: ${Object.keys(sections).filter(k => sections[k]).join(", ")})`
      : "Cleared all work order data";
    await logAudit({ user, action: "CLEAR_DATA", entity: "System", details: detail });
    return jsonOk({ ok: true });
  } catch (e: any) {
    return jsonError(e.message || "Clear failed");
  }
}
