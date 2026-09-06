import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMockCoreServer } from "./mock-core.mjs";

const HOST = "127.0.0.1";
const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shared = {
  companyName: "Contract Moving",
  logoAssetId: "asset:demo-logo",
  address: "100 Example Avenue",
  openingHours: [{ label: "Monday to Friday", value: "08:00 to 18:00" }],
  socialLinks: [{ label: "Instagram", href: "https://example.test/moving" }],
};
const legacy = {
  ...shared,
  primaryPhone: { display: "+1 202-555-0147", href: "tel:+12025550147" },
  whatsapp: { label: "Message on WhatsApp", href: "https://wa.me/12025550147" },
  email: { display: "hello@example.test", href: "mailto:hello@example.test" },
};
const canonical = {
  schemaVersion: 2,
  ...shared,
  primaryPhone: "+1 202-555-0147",
  whatsappUrl: "https://wa.me/12025550147",
  whatsappLabel: "Message on WhatsApp",
  email: "hello@example.test",
};

const legacyResult = await render(legacy);
const canonicalResult = await render(canonical);
assert.deepEqual(canonicalResult.business, legacyResult.business);
for (const evidence of [
  "Contract Moving",
  "+1 202-555-0147",
  'href="tel:+12025550147"',
  "Message on WhatsApp",
  'href="https://wa.me/12025550147"',
  "hello@example.test",
  'href="mailto:hello@example.test"',
  "100 Example Avenue",
  "Monday to Friday",
  "Instagram",
]) {
  assert.ok(legacyResult.html.includes(evidence), `Legacy SSR evidence missing: ${evidence}`);
  assert.ok(canonicalResult.html.includes(evidence), `Canonical SSR evidence missing: ${evidence}`);
}
process.stdout.write("MOVING_BUSINESS_CONTRACT_SSR=PASS\n");

async function render(businessIdentity) {
  const secret = randomBytes(32).toString("base64url");
  const mockCore = createMockCoreServer({
    mediaOrigin: "https://cdn.example.test",
    upstreamSecret: secret,
    businessIdentity,
  });
  let runtime;
  try {
    const corePort = await listen(mockCore);
    const runtimePort = await reservePort();
    const runtimeOrigin = `http://${HOST}:${runtimePort}`;
    runtime = spawn(process.execPath, [path.join(rootDirectory, ".output", "server", "index.mjs")], {
      cwd: rootDirectory,
      env: {
        ...process.env,
        NODE_ENV: "production",
        HOST,
        PORT: String(runtimePort),
        NUXT_CORE_BASE_URL: `http://${HOST}:${corePort}`,
        NUXT_CORE_REQUEST_TIMEOUT_MS: "1000",
        NUXT_CORE_PRIMARY_NAVIGATION_ID: "primary",
        NUXT_CORE_FOOTER_NAVIGATION_ID: "footer",
        NUXT_CORE_SITE_SETTING_NAMESPACE: "moving",
        NUXT_CORE_SITE_SETTING_KEY: "business",
        NUXT_MOVING_SUBMISSION_CLIENT_IDENTITY_SECRET: randomBytes(32).toString("base64url"),
        NUXT_CORE_SUBMISSION_UPSTREAM_SECRET: secret,
        NUXT_PUBLIC_SITE_URL: runtimeOrigin,
      },
      stdio: "ignore",
      windowsHide: true,
    });
    await waitForRuntime(runtimeOrigin);
    const [page, site] = await Promise.all([
      fetch(`${runtimeOrigin}/`),
      fetch(`${runtimeOrigin}/api/_movecore/site`),
    ]);
    assert.equal(page.status, 200);
    assert.equal(site.status, 200);
    return { html: await page.text(), business: (await site.json()).business };
  } finally {
    if (runtime !== undefined) await stopChild(runtime);
    await close(mockCore);
  }
}

async function waitForRuntime(origin) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${origin}/`, { signal: AbortSignal.timeout(1_000) });
      if (response.status > 0) return;
    } catch { /* startup */ }
    await delay(125);
  }
  throw new Error("Moving runtime did not become ready for business contract smoke.");
}

async function listen(server) {
  const port = await reservePort();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, HOST, resolve);
  });
  return port;
}

async function reservePort() {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, HOST, resolve);
  });
  const address = probe.address();
  if (address === null || typeof address === "string") throw new Error("Could not reserve a local port.");
  await close(probe);
  return address.port;
}

async function close(server) {
  if (!server.listening) return;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  if (process.platform === "win32" && child.pid !== undefined) {
    const killed = await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
      killer.once("error", () => resolve(false));
      killer.once("exit", (code) => resolve(code === 0));
    });
    if (killed || child.exitCode !== null) return;
  }
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  const stopped = await Promise.race([exited.then(() => true), delay(3_000).then(() => false)]);
  if (!stopped && child.exitCode === null) {
    child.kill("SIGKILL");
    await exited;
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
