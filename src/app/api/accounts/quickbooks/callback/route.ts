import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { exchangeCodeForToken, getCompanyInfo } from "@/lib/quickbooks";

export const dynamic = "force-dynamic";

// GET — OAuth callback: exchange code for tokens and save connection
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const code = sp.get("code");
  const state = sp.get("state");
  const realmId = sp.get("realmId") || sp.get("realm_id");
  const error = sp.get("error");

  if (error) {
    // Redirect back with error
    return new Response(null, {
      status: 302,
      headers: { Location: `/?qb_error=${encodeURIComponent(error)}` },
    });
  }

  if (!code) {
    return new Response(null, {
      status: 302,
      headers: { Location: `/?qb_error=no_code` },
    });
  }

  try {
    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForToken(code);
    const effectiveRealmId = realmId || tokens.x_realm_id;

    // Fetch company info from QuickBooks
    let companyName = "QuickBooks Account";
    try {
      const info = await getCompanyInfo(tokens.access_token, effectiveRealmId);
      companyName = (info.CompanyName as string) || (info.LegalName as string) || "QuickBooks Account";
    } catch {
      // Company info fetch failed — use default name
    }

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Save or update connection in database
    await db.quickBooksConnection.deleteMany();
    await db.quickBooksConnection.create({
      data: {
        realmId: effectiveRealmId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        accountName: companyName,
        connected: true,
        connectedAt: new Date(),
        expiresAt,
      },
    });

    // Log the sync
    await db.quickBooksSyncLog.create({
      data: {
        syncType: "connection",
        direction: "pull",
        entityType: "Connection",
        status: "success",
        summary: `Connected to ${companyName} (Realm: ${effectiveRealmId})`,
      },
    });

    // Redirect to app with success
    return new Response(null, {
      status: 302,
      headers: { Location: `/?qb_connected=1&realm=${effectiveRealmId}&company=${encodeURIComponent(companyName)}` },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(null, {
      status: 302,
      headers: { Location: `/?qb_error=${encodeURIComponent(msg)}` },
    });
  }
}
