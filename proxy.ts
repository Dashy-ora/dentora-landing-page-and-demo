import { NextResponse, type NextRequest } from "next/server";
import type { Lang } from "@/lib/types";
import { isUnknownPage, NOT_FOUND_PATH, pageRequest, type PageList } from "@/lib/known-pages";

// Unknown pages must answer a real 404: under Cache Components the page streams, so its own notFound() arrives as a 200.
// The published-page list comes from /api/site-slugs (tagged cache), because a proxy cannot cache by tag itself.
async function loadList(request: NextRequest, lang: string): Promise<PageList> {
  try {
    const response = await fetch(new URL(`/api/site-slugs/${lang}`, request.nextUrl.origin), { cache: "no-store", signal: AbortSignal.timeout(3000) });
    if (response.status !== 200) return null;
    const body = (await response.json()) as { slugs?: unknown };
    return Array.isArray(body.slugs) ? { slugs: body.slugs.filter((s): s is string => typeof s === "string") } : null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const page = pageRequest(request.nextUrl.pathname);
  if (!page) return NextResponse.next();
  // Slugs that cannot be pages are unknown without asking the backend.
  const list = page.slug === null ? null : await loadList(request, page.lang);
  if (!isUnknownPage(page, list)) return NextResponse.next();
  return notFoundResponse(request, page.lang);
}

// A rewrite keeps the destination's status (200: the page streams), so the proxy renders the styled not-found page itself
// and answers with it under a real 404.
async function notFoundResponse(request: NextRequest, lang: Lang): Promise<NextResponse> {
  const headers = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
  try {
    const rendered = await fetch(new URL(lang === "en" ? `/en${NOT_FOUND_PATH}` : NOT_FOUND_PATH, request.nextUrl.origin), { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (rendered.status === 200) return new NextResponse(await rendered.text(), { status: 404, headers });
  } catch {
    // fall through to the plain page
  }
  const text = lang === "en" ? "Page not found" : "الصفحة غير موجودة";
  return new NextResponse(`<!doctype html><html lang="${lang}" dir="${lang === "en" ? "ltr" : "rtl"}"><meta charset="utf-8"><meta name="robots" content="noindex"><title>${text}</title><h1>${text}</h1>`, { status: 404, headers });
}

export const config = {
  // Skip internals, the API, the demo app and any file with an extension up front; pageRequest() re-checks the same rules.
  matcher: ["/((?!api/|_next/|demo/app|.*\\..*).*)"],
};
