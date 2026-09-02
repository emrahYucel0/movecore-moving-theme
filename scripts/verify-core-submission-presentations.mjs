import { access } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const movingRoot = path.resolve(import.meta.dirname, "..");
const coreRoot = requiredAbsoluteDirectory("MOVECORE_CORE_ROOT");
const definitionsPath = path.join(movingRoot, "application", "submission-definitions.json");
const presentationsPath = path.join(movingRoot, "application", "submission-presentations.json");
const definitionLoaderPath = path.join(coreRoot, "apps", "runtime", "dist", "submission-definitions.js");
const presentationLoaderPath = path.join(coreRoot, "apps", "runtime", "dist", "submission-presentations.js");

for (const requiredPath of [definitionsPath, presentationsPath, definitionLoaderPath, presentationLoaderPath]) {
  await access(requiredPath);
}

const { loadSubmissionDefinitions } = await import(pathToFileURL(definitionLoaderPath).href);
const { loadSubmissionPresentations } = await import(pathToFileURL(presentationLoaderPath).href);
const definitions = await loadSubmissionDefinitions(definitionsPath);
const presentations = await loadSubmissionPresentations(presentationsPath, definitions);

if (definitions.length !== 2 || presentations.length !== 2) {
  throw new Error("Moving submission manifest integration is incomplete.");
}

process.stdout.write(`${JSON.stringify({
  status: "passed",
  definitionTypes: definitions.map(({ type }) => type),
  presentationTypes: presentations.map(({ type }) => type),
})}\n`);

function requiredAbsoluteDirectory(name) {
  const value = process.env[name]?.trim();
  if (value === undefined || value.length === 0 || !path.isAbsolute(value) || path.parse(value).root === value) {
    throw new Error(`${name} must identify the absolute Core repository directory.`);
  }
  return path.resolve(value);
}
