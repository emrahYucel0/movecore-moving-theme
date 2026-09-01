import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMockCoreServer, createMockMediaServer } from "./mock-core.mjs";

const HOST = "127.0.0.1";
const PUBLIC_SITE_ORIGIN = "https://public.example.test";
const PRIMARY_ROUTE = "/";
const INNER_ROUTES = [
  "/services/home-moving",
  "/areas/north-district",
  "/areas/riverside",
];
const RUNS = readPositiveInteger("R25_PERF_RUNS", 5);
const SETTLE_MS = readPositiveInteger("R25_PERF_SETTLE_MS", 1_500);
const PROFILE = Object.freeze({
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  cpuThrottleRate: 4,
  latencyMs: 150,
  downloadBytesPerSecond: 1_600_000 / 8,
  uploadBytesPerSecond: 750_000 / 8,
});
const BUDGETS = Object.freeze({
  lcpMs: 2_500,
  cls: 0.05,
  blockingMs: 200,
  consoleErrors: 0,
  failedRequests: 0,
});
const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

class CdpClient {
  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", () => reject(new Error("Could not connect to Chrome DevTools Protocol.")), { once: true });
    });
    return new CdpClient(socket);
  }

  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Set();
    socket.addEventListener("message", (event) => this.receive(event.data));
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  waitFor(method, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Timed out waiting for CDP event ${method}.`));
      }, timeoutMs);
      const unsubscribe = this.onEvent((message) => {
        if (message.method !== method) return;
        clearTimeout(timeout);
        unsubscribe();
        resolve(message.params);
      });
    });
  }

  onEvent(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  receive(raw) {
    const message = JSON.parse(String(raw));
    if (message.id !== undefined) {
      const pending = this.pending.get(message.id);
      if (pending === undefined) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(`${message.error.message} (${message.error.code})`));
      else pending.resolve(message.result ?? {});
      return;
    }
    for (const listener of this.listeners) listener(message);
  }

  close() {
    this.socket.close();
  }
}

let mockCore;
let mockMedia;
let runtime;
let chrome;
let chromeProfileDirectory;
let runtimeOutput = "";
let chromeOutput = "";

try {
  await access(path.join(rootDirectory, ".output", "server", "index.mjs"));
  const chromePath = await findChrome();
  const mediaPort = await reservePort();
  const corePort = await reservePort();
  const runtimePort = await reservePort();
  const debuggingPort = await reservePort();
  const mediaOrigin = `http://${HOST}:${mediaPort}`;
  const coreOrigin = `http://${HOST}:${corePort}`;
  const runtimeOrigin = `http://${HOST}:${runtimePort}`;

  mockMedia = createMockMediaServer();
  mockCore = createMockCoreServer({ mediaOrigin });
  await listen(mockMedia, mediaPort);
  await listen(mockCore, corePort);

  runtime = spawn(process.execPath, [path.join(rootDirectory, ".output", "server", "index.mjs")], {
    cwd: rootDirectory,
    env: {
      ...process.env,
      NODE_ENV: "production",
      HOST,
      PORT: String(runtimePort),
      NUXT_CORE_BASE_URL: coreOrigin,
      NUXT_CORE_REQUEST_TIMEOUT_MS: "1000",
      NUXT_CORE_PRIMARY_NAVIGATION_ID: "primary",
      NUXT_CORE_FOOTER_NAVIGATION_ID: "footer",
      NUXT_CORE_SITE_SETTING_NAMESPACE: "moving",
      NUXT_CORE_SITE_SETTING_KEY: "business",
      NUXT_PUBLIC_SITE_URL: PUBLIC_SITE_ORIGIN,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  runtime.stdout.setEncoding("utf8");
  runtime.stderr.setEncoding("utf8");
  runtime.stdout.on("data", (value) => { runtimeOutput += value; });
  runtime.stderr.on("data", (value) => { runtimeOutput += value; });
  await waitForRuntime(runtime, runtimeOrigin);

  chromeProfileDirectory = await mkdtemp(path.join(os.tmpdir(), "movecore-r25-chrome-"));
  chrome = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-address=${HOST}`,
    `--remote-debugging-port=${debuggingPort}`,
    `--user-data-dir=${chromeProfileDirectory}`,
    `--window-size=${PROFILE.width},${PROFILE.height}`,
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-sync",
    "--metrics-recording-only",
    "--mute-audio",
    "--no-default-browser-check",
    "--no-first-run",
    "--password-store=basic",
    "--use-mock-keychain",
    "about:blank",
  ], {
    cwd: rootDirectory,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  chrome.stdout.setEncoding("utf8");
  chrome.stderr.setEncoding("utf8");
  chrome.stdout.on("data", (value) => { chromeOutput += value; });
  chrome.stderr.on("data", (value) => { chromeOutput += value; });
  await waitForChrome(debuggingPort);

  await measureRoute({ debuggingPort, runtimeOrigin, mediaOrigin, pathname: PRIMARY_ROUTE });
  const primaryRuns = [];
  for (let run = 0; run < RUNS; run += 1) {
    primaryRuns.push(await measureRoute({ debuggingPort, runtimeOrigin, mediaOrigin, pathname: PRIMARY_ROUTE }));
  }
  const innerRoutes = [];
  for (const pathname of INNER_ROUTES) {
    innerRoutes.push(await measureRoute({ debuggingPort, runtimeOrigin, mediaOrigin, pathname }));
  }
  const motionQa = await validateProgressiveMotion({ debuggingPort, runtimeOrigin });

  const summary = summarize(primaryRuns, innerRoutes, path.basename(chromePath), motionQa);
  printSummary(summary);
  assertBudgets(summary);
  process.stdout.write("R2.5_PERFORMANCE=PASS\n");
} catch (error) {
  const safeRuntimeOutput = sanitize(runtimeOutput);
  const safeChromeOutput = sanitize(chromeOutput);
  if (safeRuntimeOutput.length > 0) process.stderr.write(safeRuntimeOutput.slice(-4_000));
  if (safeChromeOutput.length > 0) process.stderr.write(safeChromeOutput.slice(-4_000));
  process.stderr.write("R2.5_PERFORMANCE=FAIL\n");
  throw error;
} finally {
  if (chrome !== undefined) await stopChild(chrome);
  if (runtime !== undefined) await stopChild(runtime);
  if (mockCore !== undefined) await close(mockCore);
  if (mockMedia !== undefined) await close(mockMedia);
  if (chromeProfileDirectory !== undefined) {
    await rm(chromeProfileDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}

async function validateProgressiveMotion({ debuggingPort, runtimeOrigin }) {
  const target = await createTarget(debuggingPort);
  const client = await CdpClient.connect(target.webSocketDebuggerUrl);
  try {
    await Promise.all([client.send("Page.enable"), client.send("Runtime.enable")]);
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: PROFILE.width,
      height: PROFILE.height,
      deviceScaleFactor: PROFILE.deviceScaleFactor,
      mobile: true,
    });
    await client.send("Emulation.setEmulatedMedia", {
      media: "screen",
      features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
    });
    const loaded = client.waitFor("Page.loadEventFired", 30_000);
    await client.send("Page.navigate", { url: `${runtimeOrigin}${PRIMARY_ROUTE}` });
    await loaded;
    const normal = await readMotionState(client);
    await scrollProcessAtReadingSpeed(client);
    const normalScrolled = await readMotionState(client);

    await client.send("Emulation.setEmulatedMedia", {
      media: "screen",
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    const reduced = await readMotionState(client);
    return { normal, normalScrolled, reduced };
  } finally {
    client.close();
    await closeTarget(debuggingPort, target.id);
  }
}

async function scrollProcessAtReadingSpeed(client) {
  await client.send("Runtime.evaluate", {
    expression: `new Promise((resolve) => {
      const process = document.querySelector(".moving-process");
      if (!(process instanceof HTMLElement)) return resolve(false);
      const start = scrollY;
      const destination = Math.max(0, process.offsetTop - innerHeight * 0.35);
      const startedAt = performance.now();
      const duration = 700;
      const step = (now) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        scrollTo(0, start + (destination - start) * eased);
        if (progress < 1) requestAnimationFrame(step);
        else resolve(true);
      };
      requestAnimationFrame(step);
    })`,
    awaitPromise: true,
    returnByValue: true,
  });
}

async function readMotionState(client) {
  const evaluated = await client.send("Runtime.evaluate", {
    expression: `(() => {
      const process = document.querySelector(".moving-process");
      if (!(process instanceof HTMLElement)) return null;
      const processStyle = getComputedStyle(process);
      const progressStyle = getComputedStyle(process, "::after");
      return {
        supportsViewTimeline: CSS.supports("animation-timeline: view()"),
        contentVisible: process.innerText.trim().length > 0
          && processStyle.display !== "none"
          && processStyle.visibility !== "hidden"
          && processStyle.opacity !== "0",
        progressAnimationName: progressStyle.animationName,
        progressTransform: progressStyle.transform,
      };
    })()`,
    returnByValue: true,
  });
  const value = evaluated.result?.value;
  assert.ok(value && typeof value === "object", "Progressive motion browser state was unavailable.");
  return value;
}

async function measureRoute({ debuggingPort, runtimeOrigin, mediaOrigin, pathname }) {
  const target = await createTarget(debuggingPort);
  const client = await CdpClient.connect(target.webSocketDebuggerUrl);
  const state = createMeasurementState(runtimeOrigin, mediaOrigin);
  const unsubscribe = client.onEvent((message) => collectEvent(state, message));
  try {
    await Promise.all([
      client.send("Page.enable"),
      client.send("Runtime.enable"),
      client.send("Log.enable"),
      client.send("Network.enable"),
      client.send("Performance.enable"),
    ]);
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: PROFILE.width,
      height: PROFILE.height,
      deviceScaleFactor: PROFILE.deviceScaleFactor,
      mobile: true,
    });
    await client.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    await client.send("Emulation.setCPUThrottlingRate", { rate: PROFILE.cpuThrottleRate });
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: PROFILE.latencyMs,
      downloadThroughput: PROFILE.downloadBytesPerSecond,
      uploadThroughput: PROFILE.uploadBytesPerSecond,
      connectionType: "cellular4g",
    });
    await client.send("Network.setCacheDisabled", { cacheDisabled: true });
    await client.send("Network.clearBrowserCache");
    await client.send("Page.addScriptToEvaluateOnNewDocument", { source: observerSource() });

    const loaded = client.waitFor("Page.loadEventFired", 30_000);
    await client.send("Page.navigate", { url: `${runtimeOrigin}${pathname}` });
    await loaded;
    await delay(SETTLE_MS);

    const evaluated = await client.send("Runtime.evaluate", {
      expression: measurementExpression(),
      returnByValue: true,
    });
    const value = evaluated.result?.value;
    assert.ok(value && typeof value === "object", `${pathname}: browser metrics were unavailable`);

    return {
      route: pathname,
      lcpMs: round(value.lcpMs),
      cls: round(value.cls, 4),
      fcpMs: round(value.fcpMs),
      blockingMs: round(value.blockingMs),
      longTaskCount: value.longTaskCount,
      domContentLoadedMs: round(value.domContentLoadedMs),
      loadMs: round(value.loadMs),
      requestCount: state.finishedRequests,
      transferBytes: round(state.transferBytes),
      jsBytes: round(state.bytesByType.Script ?? 0),
      cssBytes: round(state.bytesByType.Stylesheet ?? 0),
      consoleErrors: state.consoleErrors,
      failedRequests: state.failedRequests,
    };
  } finally {
    unsubscribe();
    client.close();
    await closeTarget(debuggingPort, target.id);
  }
}

function observerSource() {
  return `(() => {
    const state = { lcp: 0, cls: 0, longTasks: [] };
    Object.defineProperty(globalThis, "__movecoreR25Performance", { value: state });
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries.at(-1);
        if (last) state.lcp = last.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) state.cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) state.longTasks.push(entry.duration);
      }).observe({ type: "longtask", buffered: true });
    } catch {}
  })();`;
}

function measurementExpression() {
  return `(() => {
    const state = globalThis.__movecoreR25Performance ?? { lcp: 0, cls: 0, longTasks: [] };
    const navigation = performance.getEntriesByType("navigation")[0];
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    return {
      lcpMs: state.lcp,
      cls: state.cls,
      fcpMs: fcp?.startTime ?? 0,
      blockingMs: state.longTasks.reduce((total, duration) => total + Math.max(0, duration - 50), 0),
      longTaskCount: state.longTasks.length,
      domContentLoadedMs: navigation?.domContentLoadedEventEnd ?? 0,
      loadMs: navigation?.loadEventEnd ?? 0,
    };
  })()`;
}

function createMeasurementState(runtimeOrigin, mediaOrigin) {
  return {
    measuredOrigins: [runtimeOrigin, mediaOrigin],
    requests: new Map(),
    finishedRequests: 0,
    transferBytes: 0,
    bytesByType: {},
    consoleErrors: 0,
    failedRequests: 0,
  };
}

function collectEvent(state, message) {
  const { method, params } = message;
  if (method === "Network.requestWillBeSent") {
    state.requests.set(params.requestId, { type: params.type ?? "Other", url: params.request.url });
  } else if (method === "Network.loadingFinished") {
    const request = state.requests.get(params.requestId);
    if (request === undefined) return;
    const bytes = params.encodedDataLength ?? 0;
    state.finishedRequests += 1;
    state.transferBytes += bytes;
    state.bytesByType[request.type] = (state.bytesByType[request.type] ?? 0) + bytes;
  } else if (method === "Network.loadingFailed") {
    const request = state.requests.get(params.requestId);
    if (state.measuredOrigins.some((origin) => request?.url.startsWith(origin))) state.failedRequests += 1;
  } else if (method === "Runtime.exceptionThrown") {
    state.consoleErrors += 1;
  } else if (method === "Runtime.consoleAPICalled" && params.type === "error") {
    state.consoleErrors += 1;
  } else if (method === "Log.entryAdded" && params.entry.level === "error") {
    state.consoleErrors += 1;
  }
}

function summarize(primaryRuns, innerRoutes, browser, motionQa) {
  const metrics = [
    "lcpMs", "cls", "fcpMs", "blockingMs", "longTaskCount", "domContentLoadedMs",
    "loadMs", "requestCount", "transferBytes", "jsBytes", "cssBytes", "consoleErrors",
    "failedRequests",
  ];
  const median = Object.fromEntries(metrics.map((metric) => [metric, medianOf(primaryRuns.map((run) => run[metric]))]));
  const budgetFailures = collectBudgetFailures(median, innerRoutes, motionQa);
  return {
    status: budgetFailures.length === 0 ? "PASS" : "FAIL",
    route: PRIMARY_ROUTE,
    runs: primaryRuns.length,
    warmupRuns: 1,
    browser,
    profile: PROFILE,
    settleMs: SETTLE_MS,
    budgets: BUDGETS,
    median,
    primaryRuns,
    innerRoutes,
    motionQa,
    budgetFailures,
  };
}

function printSummary(summary) {
  const median = summary.median;
  process.stdout.write([
    `route=${summary.route}`,
    `runs=${summary.runs}`,
    `profile=${PROFILE.width}x${PROFILE.height}@${PROFILE.deviceScaleFactor}x cpu=${PROFILE.cpuThrottleRate}x latency_ms=${PROFILE.latencyMs} download_bps=${PROFILE.downloadBytesPerSecond * 8} upload_bps=${PROFILE.uploadBytesPerSecond * 8}`,
    `median_lcp_ms=${median.lcpMs}`,
    `median_cls=${median.cls}`,
    `median_fcp_ms=${median.fcpMs}`,
    `median_blocking_ms=${median.blockingMs}`,
    `median_long_tasks=${median.longTaskCount}`,
    `median_dom_content_loaded_ms=${median.domContentLoadedMs}`,
    `median_load_ms=${median.loadMs}`,
    `median_requests=${median.requestCount}`,
    `median_transfer_bytes=${median.transferBytes}`,
    `median_js_bytes=${median.jsBytes}`,
    `median_css_bytes=${median.cssBytes}`,
    `median_console_errors=${median.consoleErrors}`,
    `median_failed_requests=${median.failedRequests}`,
    `motion_normal_supported=${summary.motionQa.normal.supportsViewTimeline} motion_animation=${summary.motionQa.normal.progressAnimationName} content_visible=${summary.motionQa.normal.contentVisible}`,
    `motion_scrolled_transform=${summary.motionQa.normalScrolled.progressTransform}`,
    `motion_reduced_animation=${summary.motionQa.reduced.progressAnimationName} motion_reduced_transform=${summary.motionQa.reduced.progressTransform} content_visible=${summary.motionQa.reduced.contentVisible}`,
    ...summary.innerRoutes.map((route) => `inner_route=${route.route} lcp_ms=${route.lcpMs} cls=${route.cls} errors=${route.consoleErrors} failed_requests=${route.failedRequests}`),
    `R2.5_PERFORMANCE_JSON=${JSON.stringify(summary)}`,
  ].join("\n") + "\n");
}

function assertBudgets(summary) {
  assert.deepEqual(summary.budgetFailures, [], summary.budgetFailures.join(" "));
}

function collectBudgetFailures(median, innerRoutes, motionQa) {
  const failures = [];
  if (!(median.lcpMs > 0 && median.lcpMs <= BUDGETS.lcpMs)) failures.push(`Median LCP ${median.lcpMs}ms exceeds ${BUDGETS.lcpMs}ms.`);
  if (median.cls > BUDGETS.cls) failures.push(`Median CLS ${median.cls} exceeds ${BUDGETS.cls}.`);
  if (median.blockingMs > BUDGETS.blockingMs) failures.push(`Median blocking approximation ${median.blockingMs}ms exceeds ${BUDGETS.blockingMs}ms.`);
  if (median.consoleErrors !== BUDGETS.consoleErrors) failures.push("Browser console errors exceeded the budget.");
  if (median.failedRequests !== BUDGETS.failedRequests) failures.push("Browser requests failed during the benchmark.");
  for (const route of innerRoutes) {
    if (route.consoleErrors !== 0) failures.push(`${route.route}: browser console errors detected.`);
    if (route.failedRequests !== 0) failures.push(`${route.route}: browser request failures detected.`);
  }
  if (!motionQa.normal.contentVisible || !motionQa.reduced.contentVisible) failures.push("Process content was hidden during motion QA.");
  if (motionQa.normal.supportsViewTimeline && !motionQa.normal.progressAnimationName.startsWith("moving-sequence-progress")) {
    failures.push("Supported Chrome did not apply the process scroll-driven animation.");
  }
  if (motionQa.normal.supportsViewTimeline && motionQa.normal.progressTransform === motionQa.normalScrolled.progressTransform) {
    failures.push("Process progress transform did not respond to a paced document scroll.");
  }
  if (motionQa.reduced.progressAnimationName !== "none" || motionQa.reduced.progressTransform !== "none") {
    failures.push("Reduced-motion emulation did not resolve process motion to its static state.");
  }
  return failures;
}

async function createTarget(debuggingPort) {
  const response = await fetch(`http://${HOST}:${debuggingPort}/json/new?about:blank`, { method: "PUT" });
  assert.equal(response.status, 200, "Chrome could not create a benchmark target.");
  return response.json();
}

async function closeTarget(debuggingPort, targetId) {
  try {
    await fetch(`http://${HOST}:${debuggingPort}/json/close/${targetId}`);
  } catch {
    // Chrome cleanup remains authoritative in the outer finally block.
  }
}

async function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    process.platform === "win32" ? path.join(process.env.PROGRAMFILES ?? "", "Google", "Chrome", "Application", "chrome.exe") : undefined,
    process.platform === "win32" ? path.join(process.env["PROGRAMFILES(X86)"] ?? "", "Google", "Chrome", "Application", "chrome.exe") : undefined,
    process.platform === "win32" ? path.join(process.env.LOCALAPPDATA ?? "", "Google", "Chrome", "Application", "chrome.exe") : undefined,
    process.platform === "win32" ? path.join(process.env.PROGRAMFILES ?? "", "Microsoft", "Edge", "Application", "msedge.exe") : undefined,
    process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : undefined,
    process.platform === "linux" ? "/usr/bin/google-chrome" : undefined,
    process.platform === "linux" ? "/usr/bin/chromium" : undefined,
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next supported local browser path.
    }
  }
  throw new Error("Chrome/Chromium was not found. Set CHROME_PATH to run the deterministic performance gate.");
}

async function waitForChrome(debuggingPort) {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (chrome?.exitCode !== null) throw new Error("Chrome exited before CDP became available.");
    try {
      const response = await fetch(`http://${HOST}:${debuggingPort}/json/version`);
      if (response.ok) return;
    } catch {
      // Chrome is still starting.
    }
    await delay(100);
  }
  throw new Error("Chrome DevTools Protocol did not become ready.");
}

async function waitForRuntime(child, origin) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error("Production runtime exited before performance testing.");
    try {
      const response = await fetch(`${origin}/`, { redirect: "manual" });
      if (response.status > 0) return;
    } catch {
      // Runtime is still binding its local listener.
    }
    await delay(100);
  }
  throw new Error("Production runtime did not become ready.");
}

async function reservePort() {
  const server = createServer();
  await listen(server, 0);
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Could not allocate a local port.");
  const port = address.port;
  await close(server);
  return port;
}

async function listen(server, port) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, HOST, resolve);
  });
}

async function close(server) {
  if (!server.listening) return;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  if (process.platform === "win32" && child.pid !== undefined) {
    const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    const killed = await new Promise((resolve) => {
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

function readPositiveInteger(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer.`);
  return value;
}

function medianOf(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function sanitize(value) {
  return value
    .replace(/http:\/\/127\.0\.0\.1:[0-9]+/gu, "[local-origin]")
    .replaceAll("http://core-r25-private.invalid:9876", "[private-core-origin]");
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
