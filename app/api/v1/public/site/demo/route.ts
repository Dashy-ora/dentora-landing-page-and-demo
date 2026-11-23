import { connection } from "next/server";
import { getDemo } from "@/lib/data";

// The portal demo build served at /demo/app asks its own origin for `GET /api/v1/public/site/demo` at start-up. Answer it here
// with the same fallback order as the pages (live API, last good copy, built-in defaults), in the backend's exact shape, so the
// settings published from the dashboard (modules shown, clinic name, welcome, trial button) reach the demo even with no backend.
export async function GET() {
  await connection();
  const demo = await getDemo();
  if (demo.status !== "ok") {
    return Response.json({ message: "Demo settings are not available." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ data: demo.data }, { headers: { "Cache-Control": "public, max-age=60" } });
}
