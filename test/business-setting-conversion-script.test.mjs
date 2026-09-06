import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execute = promisify(execFile);
const directories = [];
const script = path.resolve("scripts/convert-business-setting-v2.mjs");

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("Moving business Setting conversion command", () => {
  it("reads a local legacy value and prints canonical v2 without writing another file", async () => {
    const directory = await temporaryDirectory();
    const input = path.join(directory, "business-v1.json");
    await writeFile(input, JSON.stringify({
      companyName: "Example Moving",
      primaryPhone: { display: "Customer care", href: "tel:+12025550100" },
      email: { display: "hello@example.test", href: "mailto:hello@example.test" },
    }));
    const { stdout } = await execute(process.execPath, [script, input], { cwd: process.cwd() });
    expect(JSON.parse(stdout)).toEqual({
      schemaVersion: 2,
      companyName: "Example Moving",
      primaryPhone: "Customer care",
      primaryPhoneDial: "+12025550100",
      email: "hello@example.test",
      openingHours: [],
      socialLinks: [],
    });
  });

  it("fails closed with a value-free message for malformed legacy input", async () => {
    const directory = await temporaryDirectory();
    const input = path.join(directory, "private-value.json");
    await writeFile(input, JSON.stringify({ companyName: "Sensitive Company" }));
    await expect(execute(process.execPath, [script, input], { cwd: process.cwd() }))
      .rejects.toMatchObject({ stderr: expect.not.stringContaining("Sensitive Company") });
  });
});

async function temporaryDirectory() {
  const directory = await mkdtemp(path.join(tmpdir(), "movecore-business-v2-"));
  directories.push(directory);
  return directory;
}
