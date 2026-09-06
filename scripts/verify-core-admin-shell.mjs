import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";

const movingRoot = path.resolve(import.meta.dirname, "..");

// Integration verification only: no Core start module, store, connection or bootstrap is imported.
export async function verifyCoreAdminShell(coreRoot) {
  if (!coreRoot || !path.isAbsolute(coreRoot) || path.parse(coreRoot).root === coreRoot) {
    throw new Error("MOVECORE_CORE_ROOT must identify the absolute, already-built Core repository directory.");
  }
  const runtime = (name) => import(pathToFileURL(path.join(coreRoot, "apps/runtime/dist", `${name}.js`)).href);
  const [{ parseCoreRuntimeConfig }, { loadAdminShellProjection }, { loadContentEditorProfiles },
    { loadSettingDefinitions }, { loadSubmissionDefinitions }, { loadSubmissionPresentations }] = await Promise.all([
    runtime("config"), runtime("admin-shell"), runtime("editor-profiles"),
    runtime("setting-definitions"), runtime("submission-definitions"), runtime("submission-presentations"),
  ]);
  const manifest = (name) => path.join(movingRoot, "application", `${name}.json`);
  // Parse an isolated configuration rather than inheriting any local/production environment.
  // This reserved invalid hostname is never connected to; only the five pure loaders run.
  const config = parseCoreRuntimeConfig({
    CORE_CMS_ENV: "development",
    CORE_CMS_DATABASE_URL: "mysql://fixture:fixture@database.invalid/never_connected",
    CORE_CMS_PUBLIC_ORIGIN: "http://127.0.0.1:3000",
    CORE_CMS_ADMIN_ORIGINS: "http://127.0.0.1:3000",
    CORE_CMS_NAMESPACE_ID: "moving-shell-verification",
    CORE_CMS_MEDIA_ROOT: path.join(movingRoot, ".unused-verification-media"),
    CORE_CMS_ADMIN_DIST: path.join(coreRoot, "apps/admin/dist"),
    CORE_CMS_ADMIN_SETTING_NAMESPACES: "moving",
    CORE_CMS_CSRF_SECRET: randomBytes(32).toString("base64url"),
    CORE_CMS_THROTTLE_SECRET: randomBytes(32).toString("base64url"),
    CORE_CMS_EDITOR_PROFILES_FILE: manifest("editor-profiles"),
    CORE_CMS_SETTING_DEFINITIONS_FILE: manifest("setting-definitions"),
    CORE_CMS_SUBMISSION_DEFINITIONS_FILE: manifest("submission-definitions"),
    CORE_CMS_SUBMISSION_PRESENTATIONS_FILE: manifest("submission-presentations"),
    CORE_CMS_ADMIN_SHELL_FILE: manifest("admin-shell"),
  });
  const adminShell = await loadAdminShellProjection(config.adminShellFile);
  const editorProfiles = await loadContentEditorProfiles(config.editorProfilesFile);
  const settingDefinitions = await loadSettingDefinitions(config.settingDefinitionsFile);
  const submissionDefinitions = await loadSubmissionDefinitions(config.submissionDefinitionsFile);
  const submissionPresentations = await loadSubmissionPresentations(config.submissionPresentationsFile, submissionDefinitions);
  assert.deepEqual(adminShell.application, { name: "MoveCore Moving", descriptor: "Operations workspace" });
  assert.deepEqual(adminShell.navigation.map(({ id, label, group, visible }) => [id, label, group, visible]), [
    ["overview", "Overview", "operations", true], ["submissions", "Leads", "operations", true],
    ["content", "Content", "content", true], ["media", "Media", "content", true],
    ["navigation", "Navigation", "site", true], ["settings", "Settings", "site", true],
    ["url-seo", "SEO & URLs", "site", true], ["audit", "Audit", "system", true],
  ]);
  assert.equal(editorProfiles.length, 10);
  assert.ok(settingDefinitions.some(({ namespace, key }) => namespace === "moving" && key === "business"));
  for (const records of [submissionDefinitions, submissionPresentations]) {
    assert.deepEqual(records.map(({ type }) => type).sort(), ["moving.contact-request", "moving.quote-request"]);
  }
  return { adminShell, editorProfiles, settingDefinitions, submissionDefinitions, submissionPresentations };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const result = await verifyCoreAdminShell(process.env.MOVECORE_CORE_ROOT?.trim());
  process.stdout.write(`${JSON.stringify({
    status: "passed", application: result.adminShell.application,
    manifests: 5, editorProfiles: result.editorProfiles.length,
    settingDefinitions: result.settingDefinitions.length,
    submissionDefinitions: result.submissionDefinitions.length,
    submissionPresentations: result.submissionPresentations.length,
    capabilities: result.adminShell.navigation.length, databaseConnections: 0,
  })}\n`);
}
