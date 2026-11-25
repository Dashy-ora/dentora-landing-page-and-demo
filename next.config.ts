import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Whether the portal demo build is present, decided when the site is built (see lib/demo-build.ts): on Vercel, public/ is
  // served from the CDN and is not readable from the server functions at request time.
  env: {
    DENTORA_DEMO_BUILD: existsSync(path.join(process.cwd(), "public", "demo", "app", "index.html")) ? "1" : "0",
  },
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The clinic-portal demo build is static files in public/demo/app (see `npm run sync:demo`). A deep link such as
  // /demo/app/patients has no file, so it serves the app shell and the SPA router takes over. Paths with a dot (assets) are
  // never rewritten, so a missing script stays a 404 instead of becoming HTML.
  async rewrites() {
    return {
      // afterFiles: real files in public/ win, and this runs before the /[[...slug]] catch-all pages would claim the URL.
      afterFiles: [
        { source: "/demo/app", destination: "/demo/app/index.html" },
        // A path with a dot that matched no file is a missing asset: a real 404, not the catch-all page's HTML.
        { source: "/demo/app/:path(.*\\..*)", destination: "/api/demo-missing" },
        { source: "/demo/app/:path([^.]*)", destination: "/demo/app/index.html" },
      ],
    };
  },
  async headers() {
    return [
      {
        source: "/demo/app/index.html",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
