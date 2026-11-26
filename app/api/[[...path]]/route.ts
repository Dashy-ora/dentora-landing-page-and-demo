// Any /api path no handler claims (/api, /api/forms, /api/zz-1, ...) is a plain 404. Without this it would fall through to the
// Arabic catch-all page, which the proxy skips for /api, and every unique path would cost a backend page read. The real handlers
// (/api/forms/[form], /api/revalidate, /api/site-slugs/[lang], /api/v1/public/site/demo, /api/demo-missing) are more specific and win.
function notFound(): Response {
  return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}

export const GET = notFound;
export const HEAD = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
export const OPTIONS = notFound;
