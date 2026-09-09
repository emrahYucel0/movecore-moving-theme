import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createAuthenticatedPrincipal } from "../../core-cms/packages/access/dist/index.js";
import { AdminHttpHandler, SessionCsrfProtector } from "../../core-cms/packages/adapter-admin-http/dist/index.js";
import { PublicHttpHandler } from "../../core-cms/packages/adapter-public-http/dist/index.js";
import { AdminContentService, CoreAdminAuditSink } from "../../core-cms/packages/admin-application/dist/index.js";
import { AuditRecorder } from "../../core-cms/packages/audit/dist/index.js";
import { ContentService } from "../../core-cms/packages/content/dist/index.js";
import { PublicContentService } from "../../core-cms/packages/public-application/dist/index.js";
import {
  PrismaMysqlAuditDelivery,
  PrismaMysqlAuditStore,
  PrismaMysqlContentStore,
  PrismaMysqlReliableAdminMutations,
  requireRehearsalDatabaseConfig,
} from "../../core-cms/packages/adapter-prisma-mysql/dist/index.js";
import {
  createRuntimeContentPublicationGuard,
  loadContentEditorProfiles,
} from "../../core-cms/apps/runtime/dist/editor-profiles.js";

const database = requireRehearsalDatabaseConfig(process.env);
const runId = `${Date.now()}-${process.pid}`;
const now = "2026-09-09T10:00:00.000Z";
const origin = "https://admin.example.test";
const sessionToken = "M".repeat(43);
const csrfSecret = Buffer.alloc(32, 61);
const csrfToken = new SessionCsrfProtector(csrfSecret).issue(sessionToken);
const manifestPath = fileURLToPath(new URL("../application/editor-profiles.json", import.meta.url));

const profiles = await loadContentEditorProfiles(manifestPath);
const guard = createRuntimeContentPublicationGuard(profiles);
const contentStore = await PrismaMysqlContentStore.connect({ databaseUrl: database.databaseUrl });
const auditStore = await PrismaMysqlAuditStore.connect({ databaseUrl: database.databaseUrl });
let durableSequence = 0;
let failureSequence = 0;
const reliable = await PrismaMysqlReliableAdminMutations.connect({
  databaseUrl: database.databaseUrl,
  clock: { now: () => now },
  contentClock: { now: () => now },
  contentPublicationGuard: guard,
  auditEventIds: { generate: () => `r212f:durable:${runId}:${++durableSequence}` },
});
const delivery = await PrismaMysqlAuditDelivery.connect({
  databaseUrl: database.databaseUrl,
  now: () => now,
});

try {
  const content = new ContentService(contentStore, guard, { now: () => now });
  const audit = new CoreAdminAuditSink(
    new AuditRecorder(auditStore, { now: () => now }),
    { generate: () => `r212f:failure:${runId}:${++failureSequence}` },
  );
  const admin = adminHandler(new AdminContentService(content, audit, reliable));
  const publicHttp = publicHandler(new PublicContentService(contentStore));

  const matrix = [
    ["site.page", "site-page-detail.json", (value) => { delete value.title; }],
    ["moving.home", "moving-home.json", duplicateHomeFeatured, correctHome],
    ["moving.service", "moving-service.json", (value) => { value.overview.points = []; }],
    ["moving.location", "moving-location.json", (value) => { value.services.items = []; }],
    ["moving.services", "moving-services.json", duplicateHref("portfolio")],
    ["moving.areas", "moving-areas.json", duplicateHref("coverage")],
    ["moving.faq", "moving-faq.json", duplicateFaq],
    ["moving.testimonials", "moving-testimonials.json", duplicateFeatured],
    ["moving.quote", "moving-quote.json", addUnknownRoot, correctQuote],
    ["moving.contact", "moving-contact.json", addUnknownNestedContact, correctContact],
  ];

  for (const [type, fixtureName, invalidate, correct] of matrix) {
    const valid = await fixture(fixtureName);
    const contentId = id(`lifecycle:${type}`);
    await expectStatus(adminRequest(admin, "/content", {
      contentId,
      type,
      revisionId: `${contentId}:r1`,
      payload: valid,
    }), 201);
    await expectStatus(publish(admin, contentId, `${contentId}:r1`), 200);
    assert.equal((await publicRead(publicHttp, contentId)).data.revisionId, `${contentId}:r1`);

    const invalid = structuredClone(valid);
    invalidate(invalid);
    await expectStatus(adminRequest(admin, `/content/${encodeURIComponent(contentId)}/revisions`, {
      revisionId: `${contentId}:r2`,
      expectedLatestRevisionId: `${contentId}:r1`,
      payload: invalid,
    }), 201);
    assert.deepEqual((await content.getRevision(`${contentId}:r2`)).payload, invalid);
    await expectGenericRejection(publish(admin, contentId, `${contentId}:r2`));
    assert.equal((await publicRead(publicHttp, contentId)).data.revisionId, `${contentId}:r1`);

    const corrected = structuredClone(valid);
    if (correct === undefined) corrected.integrityRoundTrip = "corrected-r3";
    else correct(corrected);
    await expectStatus(adminRequest(admin, `/content/${encodeURIComponent(contentId)}/revisions`, {
      revisionId: `${contentId}:r3`,
      expectedLatestRevisionId: `${contentId}:r2`,
      payload: corrected,
    }), 201);
    await expectStatus(publish(admin, contentId, `${contentId}:r3`), 200);
    assert.equal((await publicRead(publicHttp, contentId)).data.revisionId, `${contentId}:r3`);
  }

  const homeWithoutProof = await fixture("moving-home.json");
  delete homeWithoutProof.customerProof;
  const noProofContentId = id("home-without-customer-proof");
  await expectStatus(adminRequest(admin, "/content", {
    contentId: noProofContentId,
    type: "moving.home",
    revisionId: `${noProofContentId}:r1`,
    payload: homeWithoutProof,
  }), 201);
  await expectStatus(publish(admin, noProofContentId, `${noProofContentId}:r1`), 200);
  assert.equal((await publicRead(publicHttp, noProofContentId)).data.revisionId, `${noProofContentId}:r1`);

  const firstInvalid = [
    ["moving.services", "moving-services.json", duplicateHref("portfolio")],
    ["moving.testimonials", "moving-testimonials.json", duplicateFeatured],
    ["moving.testimonials", "moving-testimonials.json", duplicateTestimonialItems],
    ["moving.service", "moving-service.json", unsafeServiceLink],
    ["moving.home", "moving-home.json", duplicateHomeFeatured],
    ["moving.quote", "moving-quote.json", addUnknownRoot],
  ];
  for (const [index, [type, fixtureName, invalidate]] of firstInvalid.entries()) {
    const invalid = await fixture(fixtureName);
    invalidate(invalid);
    const contentId = id(`first-invalid:${type}:${index}`);
    await expectStatus(adminRequest(admin, "/content", {
      contentId,
      type,
      revisionId: `${contentId}:r1`,
      payload: invalid,
    }), 201);
    await expectGenericRejection(publish(admin, contentId, `${contentId}:r1`));
    assert.equal((await publicHttp.handle(new Request(
      `http://core.test/v1/content/${encodeURIComponent(contentId)}`,
    ))).status, 404);
  }

  await delivery.processPendingAuditIntents(100);
  for (const [type] of matrix) {
    const contentId = id(`lifecycle:${type}`);
    const events = await auditStore.query({
      limit: 20,
      target: { type: "content", id: contentId },
      action: "content.publish",
    });
    assert.deepEqual(events.map((event) => event.outcome).sort(), ["failed", "success", "success"]);
  }
  const noProofEvents = await auditStore.query({
    limit: 20,
    target: { type: "content", id: noProofContentId },
    action: "content.publish",
  });
  assert.deepEqual(noProofEvents.map((event) => event.outcome), ["success"]);
  for (const [index, [type]] of firstInvalid.entries()) {
    const contentId = id(`first-invalid:${type}:${index}`);
    const events = await auditStore.query({
      limit: 20,
      target: { type: "content", id: contentId },
      action: "content.publish",
    });
    assert.deepEqual(events.map((event) => event.outcome), ["failed"]);
  }
  process.stdout.write(`R2.12F MySQL publication matrix PASS (${matrix.length} lifecycle profiles)\n`);
} finally {
  await delivery.disconnect();
  await reliable.disconnect();
  await auditStore.disconnect();
  await contentStore.disconnect();
}

function duplicateHref(section) {
  return (value) => { value[section].items[1].href = value[section].items[0].href; };
}

function duplicateFaq(value) {
  value.items[1].question = ` ${value.items[0].question.toUpperCase()} `;
}

function duplicateFeatured(value) {
  value.items[0].customerName = ` ${value.featured.customerName.toUpperCase()} `;
  value.items[0].quote = ` ${value.featured.quote.toUpperCase()} `;
}

function duplicateTestimonialItems(value) {
  value.items[1] = structuredClone(value.items[0]);
}

function duplicateHomeFeatured(value) {
  value.customerProof.items[0].customerName = ` ${value.customerProof.featured.customerName.toUpperCase()} `;
  value.customerProof.items[0].quote = ` ${value.customerProof.featured.quote.toUpperCase()} `;
}

function addUnknownRoot(value) {
  value.futureRoot = { preserved: true };
}

function addUnknownNestedContact(value) {
  value.directContact.futureNested = "preserved";
}

function correctHome(value) {
  value.hero.title = `${value.hero.title} — corrected`;
}

function correctQuote(value) {
  value.title = `${value.title} — corrected`;
}

function correctContact(value) {
  value.title = `${value.title} — corrected`;
}

function unsafeServiceLink(value) {
  value.relatedServices.items[0].href = "javascript:alert(1)";
}

async function fixture(name) {
  return JSON.parse(await readFile(new URL(`../application/examples/${name}`, import.meta.url), "utf8"));
}

function id(suffix) {
  return `r212f:${suffix}:${runId}`;
}

function adminHandler(content) {
  const principal = createAuthenticatedPrincipal({
    actor: { kind: "human", id: `actor:r212f:${runId}` },
    permissions: ["content.read", "content.edit", "content.publish"],
  });
  return new AdminHttpHandler({
    authentication: {
      login: async () => { throw new Error("not called"); },
      logout: async () => undefined,
      resolveSession: async () => ({ accountId: `account:r212f:${runId}`, principal }),
    },
    content,
    settings: { update: async () => { throw new Error("not called"); } },
  }, {
    allowedOrigins: [origin],
    csrfSecret,
    cookie: { environment: "production", name: "__Host-core_admin" },
  });
}

function adminRequest(handler, path, body) {
  return handler.handle(new Request(`https://cms.example.test/admin/api/v1${path}`, {
    method: "POST",
    headers: {
      origin,
      cookie: `__Host-core_admin=${sessionToken}`,
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify(body),
  }));
}

function publish(handler, contentId, revisionId) {
  return adminRequest(handler, `/content/${encodeURIComponent(contentId)}/publish`, { revisionId });
}

async function expectStatus(responsePromise, expected) {
  assert.equal((await responsePromise).status, expected);
}

async function expectGenericRejection(responsePromise) {
  const response = await responsePromise;
  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), {
    error: { code: "validation_failed", message: "The operation was rejected." },
  });
}

function publicHandler(content) {
  return new PublicHttpHandler({
    content,
    pages: { resolvePath: async () => ({ kind: "not-found" }) },
    settings: { get: async () => ({ kind: "not-found" }) },
    navigation: { get: async () => ({ kind: "not-found" }) },
    sitemap: { list: async () => ({ kind: "success", items: [] }) },
    media: { getById: async () => ({ kind: "not-found" }) },
  });
}

async function publicRead(handler, contentId) {
  const response = await handler.handle(new Request(
    `http://core.test/v1/content/${encodeURIComponent(contentId)}`,
  ));
  assert.equal(response.status, 200);
  return response.json();
}
