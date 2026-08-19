import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission, logAudit } from "@/lib/server";
import { jsonError, jsonOk, safeParse } from "@/lib/server-helpers";

export const dynamic = "force-dynamic";

// POST /api/workorders/[id]/notes — append a note
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "edit_workorder")) return jsonError("Unauthorized", 401);
  const { id } = await params;

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid body");
  }
  const text = (body.text || "").trim();
  if (!text) return jsonError("Note text is required");

  const wo = await db.workOrder.findUnique({ where: { id } });
  if (!wo) return jsonError("Not found", 404);

  const notes: any[] = safeParse(wo.notes, []);
  const note = {
    id: Date.now().toString(),
    text,
    author: user.name,
    timestamp: new Date().toISOString(),
  };
  notes.push(note);

  await db.workOrder.update({
    where: { id },
    data: { notes: JSON.stringify(notes), dateModified: new Date() },
  });

  await logAudit({
    user,
    action: "ADD_NOTE",
    entity: "WorkOrder",
    entityId: id,
    details: `Added note to ${wo.ticketId}`,
  });

  return jsonOk({ notes });
}
