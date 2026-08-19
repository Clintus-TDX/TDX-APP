import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/server";
import { jsonError } from "@/lib/server-helpers";
import { readFile, unlink } from "fs/promises";
import path from "path";

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

  // Prevent path traversal: resolve and verify the path stays within storage/attachments
  const baseDir = path.resolve(process.cwd(), "storage", "attachments");
  const filePath = path.resolve(baseDir, att.filePath);
  if (!filePath.startsWith(baseDir)) {
    return jsonError("Invalid file path", 400);
  }
  try {
    const buffer = await readFile(filePath);
    const safeFileName = att.fileName.replace(/[\n\r"']/g, "_");
    return new Response(buffer, {
      headers: {
        "Content-Type": att.fileType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(safeFileName)}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return jsonError("File not found on disk", 404);
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

  // delete from disk
  try {
    const baseDir = path.resolve(process.cwd(), "storage", "attachments");
    const filePath = path.resolve(baseDir, att.filePath);
    if (filePath.startsWith(baseDir)) {
      await unlink(filePath);
    }
  } catch { /* ignore */ }

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
}
