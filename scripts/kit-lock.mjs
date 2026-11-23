// Re-pins the UI kit checksums after an intentional re-sync from the clinic portal:
//   node scripts/kit-lock.mjs [portal dir]
// The drift test (tests/kit-drift.test.ts) fails whenever the copied kit files stop matching this lock or the portal's files.
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const portal = path.resolve(root, process.argv[2] ?? process.env.PORTAL_DIR ?? "../.worktrees/clinic-portal-p4");
const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");

async function tree(dir, base = dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await tree(full, base)));
    else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out.sort();
}

const files = {};
for (const file of ["app/styles/tokens.css", "app/styles/kit.css"]) files[file] = sha(await readFile(path.join(root, file)));
for (const file of await tree(path.join(root, "public/fonts"))) files[`public/fonts/${file}`] = sha(await readFile(path.join(root, "public/fonts", file)));
let commit = "unknown";
try {
  commit = execFileSync("git", ["-C", portal, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
} catch {}
const lock = { source: "clinic-portal src/styles + public/fonts + src/index.css", portalCommit: commit, indexCss: sha(await readFile(path.join(portal, "src/index.css"))), files };
await writeFile(path.join(root, "ui-kit.lock.json"), `${JSON.stringify(lock, null, 2)}\n`);
console.log(`Pinned ${Object.keys(files).length} kit files from portal ${commit}.`);
