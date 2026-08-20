import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission, logAudit, jsonError, jsonOk } from "@/lib/server";
import { getAllowedExtensions, ATTACHMENT_LIMITS } from "@/lib/constants";

export const dynamic = "force-dynamic";

// POST /api/attachments — upload file(s)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  // Fixed permission check to match edit panel capabilities
  if (!user || !hasPermission(user, "edit_workorder")) return jsonError("Unauthorized", 401);

  const formData = await req.formData();
  const workOrderId = formData.get("workOrderId") as string;
  if (!workOrderId) return jsonError("workOrderId is required");

  const files: File[] = [];
  for (const [, value] of formData.entries()) {
    if (value instanceof File && value.name) {
      files.push(value);
    }
  }

  if (files.length === 0) return jsonError("No files provided");

  const allowed = getAllowedExtensions();
  const existingCount = await db.attachment.count({ where: { workOrderId } });
  const maxFiles = ATTACHMENT_LIMITS.maxFiles - existingCount;

  if (files.length > maxFiles) {
    return jsonError(`Maximum ${ATTACHMENT_LIMITS.maxFiles} files per work order. You can upload ${maxFiles} more.`);
  }

  const results: { id: string; fileName: string; fileType: string; fileSize: number; order: number }[] = [];

  for (const file of files) {
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowed.includes(ext)) {
      return jsonError(`File type "${ext}" not allowed. Supported: ${allowed.join(", ")}`);
    }
    if (file.size > ATTACHMENT_LIMITS.maxFileSizeMB * 1024 * 1024) {
      return jsonError(`File "${file.name}" exceeds ${ATTACHMENT_LIMITS.maxFileSizeMB}MB limit.`);
    }
  }

  // Store files as binary blobs in database
  for (const file of files) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      const order = existingCount + results.length;

      const attachment = await db.attachment.create({
        data: {
          workOrderId,
          fileName: file.name,
          fileType: file.type || ext,
          fileSize: file.size,
          filePath: `blob:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          fileData: buffer, // Store binary data directly in database
          order,
        },
      });

      results.push({
        id: attachment.id,
        fileName: attachment.fileName,
        fileType: attachment.fileType,
        fileSize: attachment.fileSize,
        order: attachment.order,
      });
    } catch (e: any) {
      return jsonError(`Failed to save file: ${e.message}`);
    }
  }

  await logAudit({
    user,
    action: "UPLOAD_ATTACHMENT",
    entity: "WorkOrder",
    entityId: workOrderId,
    details: `Uploaded ${results.length} file(s) to work order`,
  });

  return jsonOk({ attachments: results });
}
