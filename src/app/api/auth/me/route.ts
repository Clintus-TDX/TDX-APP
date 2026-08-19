import { getCurrentUser } from "@/lib/server";
import { jsonError, jsonOk } from "@/lib/server-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  return jsonOk({ user });
}
