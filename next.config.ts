import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
