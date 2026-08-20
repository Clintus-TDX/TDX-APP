import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/server";
import { jsonError } from "@/lib/server-helpers";

export const dynamic = "force-dynamic";

// GET /api/attachments/[id] — serve the file
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { id } = await params;

  const att = await db.attachment.findUnique({ where: { id } });
  if (!att) return jsonError("Not found", 404);

  try {
    // Get file data from database
    const buffer = att.fileData as Buffer;
    if (!buffer) return jsonError("File data not found", 404);

    const safeFileName = att.fileName.replace(/[\n\r"']/g, "_");
    return new Response(buffer, {
      headers: {
        "Content-Type": att.fileType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(safeFileName)}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (e: any) {
    return jsonError(`Failed to retrieve file: ${e.message}`, 500);
  }
}

// DELETE /api/attachments/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { id } = await params;

  const att = await db.attachment.findUnique({ where: { id } });
  if (!att) return jsonError("Not found", 404);

  try {
    await db.attachment.delete({ where: { id } });

    await logAudit({
      user,
      action: "DELETE_ATTACHMENT",
      entity: "Attachment",
      entityId: id,
      details: `Deleted attachment "${att.fileName}"`,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return jsonError(`Failed to delete attachment: ${e.message}`, 500);
  }
}
