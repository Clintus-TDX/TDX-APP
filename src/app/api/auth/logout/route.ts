import { clearSessionCookie } from "@/lib/server";
import { jsonOk } from "@/lib/server-helpers";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearSessionCookie();
  return jsonOk({ ok: true });
}
