import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, jsonError, jsonOk } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const body = await req.json();
    const { columnOrder, pageSize } = body;

    const updateData: Record<string, any> = {};
    if (typeof columnOrder === "string") updateData.columnOrder = columnOrder;
    if (typeof pageSize === "number") updateData.pageSize = pageSize;

    // Updates the persistent columnOrder field in the User schema
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return jsonOk({ user: updatedUser });
  } catch (error: any) {
    return jsonError(error.message || "Failed to update preferences", 500);
  }
}