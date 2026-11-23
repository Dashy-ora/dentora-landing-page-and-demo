// Copies the clinic portal's demo build (`npm run build:demo` there -> dist-demo/) into public/demo/app, which the landing site
// serves at /demo/app (deep links fall back to index.html, see next.config.ts). Run it BEFORE `next build` and before every deploy.
import { cp, mkdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function fromEnvFile(name) {
  for (const file of [".env.local", ".env"]) {
    try {
      const match = new RegExp(`^${name}=(.*)$`, "m").exec(await readFile(path.join(root, file), "utf8"));
      if (match?.[1]?.trim()) return match[1].trim();
    } catch {}
  }
  return undefined;
}

const configured = process.env.PORTAL_DEMO_DIST ?? (await fromEnvFile("PORTAL_DEMO_DIST")) ?? "../.worktrees/clinic-portal-p4/dist-demo";
const source = path.resolve(root, configured);
const target = path.join(root, "public", "demo", "app");

const info = await stat(source).catch(() => null);
if (!info?.isDirectory()) {
  console.error(`Demo build not found at ${source}.\nRun \`npm run build:demo\` in the clinic portal first, or set PORTAL_DEMO_DIST.`);
  process.exit(1);
}
if (!(await stat(path.join(source, "index.html")).catch(() => null))) {
  console.error(`${source} has no index.html: it is not a portal demo build.`);
  process.exit(1);
}
const index = await readFile(path.join(source, "index.html"), "utf8");
if (!index.includes("/demo/app/")) {
  console.error("This build was not made with `npm run build:demo` (its base path is not /demo/app/). Rebuild the portal demo and try again.");
  process.exit(1);
}

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
console.log(`Synced ${source} -> ${path.relative(root, target)}`);
