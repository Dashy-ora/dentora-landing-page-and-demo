import { connection } from "next/server";
import { getNavigation } from "@/lib/data";

// The published-page list for the proxy (which cannot use "use cache" itself). It reads the navigation through the same
// tagged cache as the pages, so a signed revalidate call refreshes it too. Backend down or site off -> `slugs: null`:
// the proxy then lets the page render ("Back soon"), it never turns an outage into a 404.
export async function GET(_request: Request, context: { params: Promise<{ lang: string }> }) {
  const { lang } = await context.params;
  if (lang !== "ar" && lang !== "en") return Response.json({ slugs: null }, { status: 404, headers: { "Cache-Control": "no-store" } });
  await connection();
  const navigation = await getNavigation(lang);
  const slugs = navigation.status === "ok" ? [...new Set(navigation.data.pages.map((page) => page.slug))] : null;
  return Response.json({ slugs }, { headers: { "Cache-Control": "no-store" } });
}
