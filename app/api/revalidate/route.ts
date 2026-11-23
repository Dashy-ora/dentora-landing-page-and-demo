import { revalidateTag } from "next/cache";
import { parseRefreshBody, verifySignature } from "@/lib/revalidate";

// Signed refresh call from the backend (W61 RevalidateLandingSite). POST only; verifies HMAC-SHA256 over "<timestamp>.<raw body>".
export async function POST(request: Request) {
  const body = await request.text();
  const verdict = verifySignature({
    secret: process.env.LANDING_REVALIDATE_SECRET,
    timestamp: request.headers.get("x-dentora-timestamp"),
    signature: request.headers.get("x-dentora-signature"),
    body,
    nowSeconds: Math.floor(Date.now() / 1000),
  });
  if (verdict === "not_configured") return Response.json({ error: "not_configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  if (verdict !== "ok") return Response.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const refresh = parseRefreshBody(body);
  if (!refresh) return Response.json({ error: "invalid" }, { status: 422, headers: { "Cache-Control": "no-store" } });
  // A publish or unpublish must show at once, so stale content is not served while the refresh runs.
  revalidateTag(refresh.area, { expire: 0 });
  return Response.json({ revalidated: true, area: refresh.area }, { headers: { "Cache-Control": "no-store" } });
}
