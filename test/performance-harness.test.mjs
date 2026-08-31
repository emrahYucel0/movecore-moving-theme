import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("R2.5 production performance harness", () => {
  it("wires a dependency-free Chrome/CDP production benchmark", async () => {
    const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
    const source = await readFile(new URL("../scripts/performance-smoke.mjs", import.meta.url), "utf8");

    expect(packageJson.scripts["perf:production"]).toBe("node scripts/performance-smoke.mjs");
    expect(source).toContain('createMockCoreServer, createMockMediaServer');
    expect(source).toContain('"Emulation.setCPUThrottlingRate"');
    expect(source).toContain('"Network.emulateNetworkConditions"');
    expect(source).toContain('"Page.addScriptToEvaluateOnNewDocument"');
    expect(source).toContain('"Emulation.setEmulatedMedia"');
    expect(source).toContain('"prefers-reduced-motion"');
    expect(source).toContain("largest-contentful-paint");
    expect(source).toContain("layout-shift");
    expect(source).toContain("longtask");
    expect(source).toContain("R2.5_PERFORMANCE=PASS");
    expect(source).not.toMatch(/puppeteer|playwright|lighthouse\/cli/iu);
  });
});
