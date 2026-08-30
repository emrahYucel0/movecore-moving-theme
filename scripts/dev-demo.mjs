import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createMockCoreServer, createMockMediaServer } from "./mock-core.mjs";

const HOST = "127.0.0.1";
const CORE_PORT = 4010;
const MEDIA_PORT = 4011;
const NUXT_PORT = 3000;
const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nuxtEntry = path.join(rootDirectory, "node_modules", "nuxt", "bin", "nuxt.mjs");
const mockCore = createMockCoreServer({ mediaOrigin: `http://${HOST}:${MEDIA_PORT}` });
const mockMedia = createMockMediaServer();
let nuxt;
let stopping = false;
let signalExit = false;

try {
  await assertPortAvailable(NUXT_PORT, "Nuxt demo");
  await listen(mockMedia, MEDIA_PORT, "demo media");
  await listen(mockCore, CORE_PORT, "mock Core");

  nuxt = spawn(process.execPath, [
    nuxtEntry,
    "dev",
    "--no-fork",
    "--host",
    HOST,
    "--port",
    String(NUXT_PORT),
  ], {
    cwd: rootDirectory,
    env: {
      ...process.env,
      NUXT_CORE_BASE_URL: `http://${HOST}:${CORE_PORT}`,
      NUXT_CORE_REQUEST_TIMEOUT_MS: "2000",
      NUXT_CORE_PRIMARY_NAVIGATION_ID: "primary",
      NUXT_CORE_SITE_SETTING_NAMESPACE: "site",
      NUXT_CORE_SITE_SETTING_KEY: "foundation",
      NUXT_CORE_FOUNDATION_MEDIA_ID: "asset:demo-hero",
      NUXT_PUBLIC_SITE_URL: `http://${HOST}:${NUXT_PORT}`,
    },
    stdio: "inherit",
    windowsHide: true,
  });

  process.stdout.write(`\nMoveCore Moving theme demo: http://${HOST}:${NUXT_PORT}\n`);
  process.stdout.write(`Mock Core: http://${HOST}:${CORE_PORT} (local process only)\n`);
  process.stdout.write(`Demo media: http://${HOST}:${MEDIA_PORT} (local public assets)\n`);
  process.stdout.write("Press Ctrl+C to stop both processes.\n\n");

  const exitCode = await new Promise((resolve, reject) => {
    nuxt.once("error", reject);
    nuxt.once("exit", (code) => resolve(code ?? 1));
    process.once("SIGINT", () => {
      signalExit = true;
      resolve(130);
    });
    process.once("SIGTERM", () => {
      signalExit = true;
      resolve(143);
    });
  });
  await shutdown(exitCode);
  if (signalExit) process.exit(exitCode);
} catch (error) {
  await shutdown(1);
  const message = error instanceof Error ? error.message : "Unknown demo startup failure.";
  process.stderr.write(`dev:demo failed: ${message}\n`);
}

async function shutdown(exitCode) {
  if (stopping) return;
  stopping = true;
  if (nuxt !== undefined) await stopChild(nuxt);
  await close(mockCore);
  await close(mockMedia);
  process.exitCode = exitCode;
}

async function assertPortAvailable(port, label) {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", (error) => reject(portFailure(label, port, error)));
    probe.listen(port, HOST, resolve);
  });
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
}

async function listen(server, port, label) {
  await new Promise((resolve, reject) => {
    server.once("error", (error) => reject(portFailure(label, port, error)));
    server.listen(port, HOST, resolve);
  });
}

function portFailure(label, port, error) {
  const reason = error && typeof error === "object" && "code" in error ? ` (${error.code})` : "";
  return new Error(`${label} port ${HOST}:${port} is unavailable${reason}. Stop the process using it and retry.`);
}

async function close(server) {
  if (!server.listening) return;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function stopChild(child) {
  if (process.platform === "win32") {
    const terminated = await terminateWindowsTree(child.pid);
    if (!terminated && child.exitCode === null) child.kill();
    return;
  }
  if (child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  const stopped = await Promise.race([
    exited.then(() => true),
    delay(3_000).then(() => false),
  ]);
  if (!stopped && child.exitCode === null) {
    child.kill("SIGKILL");
    await exited;
  }
}

function terminateWindowsTree(pid) {
  if (pid === undefined) return Promise.resolve(false);
  return new Promise((resolve) => {
    const killer = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    killer.once("error", () => resolve(false));
    killer.once("exit", (code) => resolve(code === 0));
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
