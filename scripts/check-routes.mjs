// Route check against a production build (`npm run build` first): starts `next start` with NO usable backend and asserts that every
// page answers 200 with the built-in defaults, an unknown slug answers 404, forms say they could not send, and /api/revalidate answers
// 503 with no secret. Scenarios: DENTORA_API_URL unset, backend answering 503, 404 and an unusable body, and a backend that refuses connections.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(root, "node_modules", ".bin", "next");
const demoBuild = existsSync(path.join(root, "public", "demo", "app", "index.html"));

const SLUGS = ["", "pricing", "features", "features/patient-care", "features/front-desk", "features/finance", "features/growth", "features/operations", "features/reports", "contact", "demo", "about", "terms", "privacy"];
const UNKNOWN = ["nope", "features/nope", "en/nope", "en/features/nope", "a/b/c"];

let failures = 0;
const check = (ok, message) => {
  if (!ok) {
    failures += 1;
    console.error(`  FAIL ${message}`);
  }
};

function mockBackend(mode) {
  return new Promise((resolve) => {
    const server = createServer((_req, res) => {
      if (mode === "garbage") {
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ data: { unexpected: true } }));
      } else {
        res.writeHead(Number(mode)).end();
      }
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function waitFor(base) {
  for (let i = 0; i < 100; i += 1) {
    try {
      const response = await fetch(`${base}/robots.txt`);
      if (response.status === 200) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function scenario(name, apiUrl, port) {
  console.log(`scenario: ${name}`);
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(nextBin, ["start", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: root,
    env: { ...process.env, DENTORA_API_URL: apiUrl, LANDING_REVALIDATE_SECRET: "", SITE_URL: base, PORTAL_TRIAL_URL: "" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));
  try {
    check(await waitFor(base), "server did not start");
    for (const prefix of ["", "en/"]) {
      for (const slug of SLUGS) {
        const url = `${base}/${prefix}${slug}`.replace(/\/$/, "") || base;
        const response = await fetch(url.endsWith(`:${port}`) ? `${base}/${prefix}` : url);
        const html = await response.text();
        check(response.status === 200, `${prefix}${slug || "home"} -> ${response.status}`);
        check(!/Back soon|We will be back soon|سنعود قريبًا/.test(html), `${prefix}${slug || "home"} shows Back soon`);
        check(html.includes(prefix ? 'lang="en"' : 'lang="ar"'), `${prefix}${slug || "home"} wrong language`);
        check(html.includes("data-site-header") && html.includes("data-site-footer"), `${prefix}${slug || "home"} has no header or footer`);
        if (slug === "pricing") check(html.includes("data-plan-highlighted=\"true\"") && html.includes("LAUNCH20"), `${prefix}pricing lacks the default plans and offer`);
        if (slug === "demo") check(html.includes(demoBuild ? 'data-demo-state="enabled"' : 'data-demo-state="trial"'), `${prefix}demo state`);
      }
    }
    for (const slug of UNKNOWN) {
      const response = await fetch(`${base}/${slug}`);
      check(response.status === 404, `unknown /${slug} -> ${response.status}, expected 404`);
    }
    const slugs = await (await fetch(`${base}/api/site-slugs/en`)).json();
    check(Array.isArray(slugs.slugs) && slugs.slugs.includes("pricing"), "site-slugs lists the default pages");
    const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
    check(sitemap.includes(`${base}/pricing`) && sitemap.includes("features/finance"), "sitemap lacks the default pages");
    const form = await fetch(`${base}/api/forms/contact`, { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify({ language: "en", fields: { name: "A", email: "a@b.co", message: "Hi" }, company_website: "" }) });
    check(form.status === 503 || form.status === 404, `form post -> ${form.status}, expected 503 or 404`);
    check((await fetch(`${base}/api/revalidate`, { method: "POST", body: "{}" })).status === 503, "revalidate without a secret is not 503");
    if (demoBuild) check((await fetch(`${base}/demo/app`)).status === 200, "/demo/app is not 200");
    const demoSettings = await fetch(`${base}/api/v1/public/site/demo`);
    const demoBody = demoSettings.status === 200 ? await demoSettings.json() : null;
    check(demoSettings.status === 200 && demoBody?.data?.enabled === true && Array.isArray(demoBody?.data?.modules), `demo settings -> ${demoSettings.status}, expected 200 with the default settings`);
    check(demoBody?.data?.trial?.url === "/contact#trial-interest", `demo trial url -> ${demoBody?.data?.trial?.url}, expected the trial request form`);
    check(/built-in default content/.test(log), "no server-side warning was logged for the defaults");
  } finally {
    child.kill("SIGTERM");
  }
}

const servers = [];
async function backend(mode) {
  const server = await mockBackend(mode);
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}`;
}

const base = 3300 + Math.floor(Math.random() * 400);
await scenario("DENTORA_API_URL unset", "", base);
await scenario("backend answers 503", await backend("503"), base + 1);
await scenario("backend answers 404", await backend("404"), base + 2);
await scenario("backend answers an unusable body", await backend("garbage"), base + 3);
await scenario("backend refuses connections", "http://127.0.0.1:9", base + 4);
for (const server of servers) server.close();

if (failures > 0) {
  console.error(`${failures} route check(s) failed.`);
  process.exit(1);
}
console.log("All route checks passed.");
