// A demo file that does not exist (an old script name after a redeploy, a typo) must answer a plain 404, never the site's HTML
// page: a browser that asked for a script and got HTML fails with a confusing MIME error instead of a clear "not found".
export function GET() {
  return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
