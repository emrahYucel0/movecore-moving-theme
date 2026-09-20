import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PrismaMariaDb } from "../../core-cms/node_modules/@prisma/adapter-mariadb/dist/index.mjs";
import { createAuthenticatedPrincipal } from "../../core-cms/packages/access/dist/index.js";
import {
  AdminContentService,
  createAdminCommandContext,
} from "../../core-cms/packages/admin-application/dist/index.js";
import { ContentService } from "../../core-cms/packages/content/dist/index.js";
import {
  parseMysqlUrl,
  PrismaMysqlContentStore,
  PrismaMysqlReliableAdminMutations,
  requireRehearsalDatabaseConfig,
} from "../../core-cms/packages/adapter-prisma-mysql/dist/index.js";
import { PrismaClient } from "../../core-cms/packages/adapter-prisma-mysql/dist/generated/prisma/client.js";
import { loadContentCollections } from "../../core-cms/apps/runtime/dist/content-collections.js";
import {
  createRuntimeContentPublicationGuard,
  loadContentEditorProfiles,
} from "../../core-cms/apps/runtime/dist/editor-profiles.js";

const database = requireRehearsalDatabaseConfig(process.env);
const runId = `${Date.now()}-${process.pid}`;
const now = "2026-09-20T10:00:00.000Z";
const profiles = await loadContentEditorProfiles(applicationPath("editor-profiles"));
const collections = await loadContentCollections(applicationPath("content-collections"));
const guard = createRuntimeContentPublicationGuard(profiles);
const store = await PrismaMysqlContentStore.connect({ databaseUrl: database.databaseUrl });
let auditSequence = 0;
const reliable = await PrismaMysqlReliableAdminMutations.connect({
  databaseUrl: database.databaseUrl,
  clock: { now: () => now },
  contentClock: { now: () => now },
  contentPublicationGuard: guard,
  auditEventIds: { generate: () => `r215b2:${runId}:${++auditSequence}` },
});

try {
  const content = new ContentService(store, guard, { now: () => now });
  const admin = new AdminContentService(
    content,
    { record: async () => undefined },
    reliable,
    profiles,
    undefined,
    collections,
  );
  const principal = createAuthenticatedPrincipal({
    actor: { kind: "human", id: `actor:r215b2:${runId}` },
    permissions: ["content.read", "content.edit", "content.publish"],
  });
  const context = createAdminCommandContext(principal);
  const singletonIds = [
    "homepage", "services-page", "areas-page", "faq", "testimonials", "quote-page", "contact-page",
  ];
  for (const collectionId of singletonIds) {
    assert.deepEqual(await admin.resolveSingleton(context, collectionId), { state: "ABSENT" });
  }

  const homepagePayload = await fixture("moving-home.json");
  const homepage = await admin.createSingleton(context, "homepage", {
    revisionId: `revision:r215b2:home:${runId}`,
    payload: homepagePayload,
  });
  assert.equal(homepage.contentId, "moving:home");
  assert.equal(homepage.type, "moving.home");
  assert.equal(homepage.publishedRevisionId, undefined);
  const homepageReady = await admin.resolveSingleton(context, "homepage");
  assert.equal(homepageReady.state, "READY");
  if (homepageReady.state === "READY") assert.equal(homepageReady.content.contentId, "moving:home");

  const repeatable = [
    ["site.page", "site-page-detail.json", "A clear plan for the work between homes."],
    ["moving.service", "moving-service.json", "A room-by-room plan for moving home."],
    ["moving.location", "moving-location.json", "Moving support shaped around practical local access."],
    ["moving.article", "moving-article-access.json", "How to prepare access before moving day"],
  ];
  const created = [];
  for (const [type, fixtureName, displayTitle] of repeatable) {
    const record = await admin.createAllocated(context, {
      type,
      revisionId: `revision:r215b2:${type}:${runId}`,
      payload: await fixture(fixtureName),
    });
    assert.match(record.contentId, /^content:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
    assert.equal(record.type, type);
    assert.equal(record.publishedRevisionId, undefined);
    const inventory = await admin.list(context, { limit: 25, type });
    assert.equal(inventory.items.find(({ contentId }) => contentId === record.contentId)?.displayTitle, displayTitle);
    created.push(record);
  }
  const all = await admin.list(context, { limit: 25 });
  for (const record of [homepage, ...created]) {
    assert.ok(all.items.some(({ contentId }) => contentId === record.contentId));
  }

  const article = created.find(({ type }) => type === "moving.article");
  assert.ok(article !== undefined);
  await admin.publish(context, { contentId: homepage.contentId, revisionId: homepage.latestRevision.id });
  await admin.publish(context, { contentId: article.contentId, revisionId: article.latestRevision.id });
  assert.equal((await content.getPublished(homepage.contentId))?.revisionId, homepage.latestRevision.id);
  assert.equal((await content.getPublished(article.contentId))?.revisionId, article.latestRevision.id);

  const testimonials = await admin.createSingleton(context, "testimonials", {
    revisionId: `revision:r215b2:testimonials:${runId}`,
    payload: await fixture("moving-testimonials.json"),
  });
  await admin.archive(context, testimonials.contentId);
  assert.deepEqual(await admin.resolveSingleton(context, "testimonials"), { state: "ARCHIVED" });

  const persistedIds = [homepage.contentId, testimonials.contentId, ...created.map(({ contentId }) => contentId)];
  assert.equal(await countUrlResources(persistedIds), 0);
  process.stdout.write(`${JSON.stringify({
    status: "passed",
    coreContentCollectionsVersion: collections.version,
    singletonInitialStates: Object.fromEntries(singletonIds.map((id) => [id, "ABSENT"])),
    homepage: { contentId: homepage.contentId, type: homepage.type, stateAfterCreate: "READY", publishedExplicitly: true },
    repeatable: created.map(({ contentId, type }) => ({ contentId, type })),
    allInventoryCount: all.items.length,
    automaticUrlAssignments: 0,
    archivedSingletonState: "ARCHIVED",
  })}\n`);
} finally {
  await reliable.disconnect();
  await store.disconnect();
}

function applicationPath(name) {
  return new URL(`../application/${name}.json`, import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/u, (value) => value.slice(1));
}

async function fixture(name) {
  return JSON.parse(await readFile(new URL(`../application/examples/${name}`, import.meta.url), "utf8"));
}

async function countUrlResources(contentIds) {
  const connection = parseMysqlUrl(database.databaseUrl);
  const client = new PrismaClient({ adapter: new PrismaMariaDb({
    host: connection.host,
    port: connection.port,
    user: connection.user,
    password: connection.password,
    database: connection.databaseName,
    connectionLimit: 2,
    timezone: "Z",
    charset: "utf8mb4",
  }) });
  try {
    await client.$connect();
    return await client.urlResource.count({ where: { resourceId: { in: contentIds } } });
  } finally {
    await client.$disconnect();
  }
}
