import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  MovingAreasContractError,
  MOVING_AREAS_LIMITS,
  parseMovingAreasPayload,
} from "../shared/content/moving-areas";
import {
  MovingFaqContractError,
  MOVING_FAQ_LIMITS,
  parseMovingFaqPayload,
} from "../shared/content/moving-faq";
import {
  MovingServicesContractError,
  MOVING_SERVICES_LIMITS,
  parseMovingServicesPayload,
} from "../shared/content/moving-services";
import {
  MovingTestimonialsContractError,
  MOVING_TESTIMONIALS_LIMITS,
  parseMovingTestimonialsPayload,
} from "../shared/content/moving-testimonials";

describe("moving.services application contract", () => {
  it("parses complete and minimal valid payloads into immutable projections", async () => {
    const payload = await fixture("moving-services.json");
    const complete = parseMovingServicesPayload(payload);
    expect(complete.portfolio.items).toHaveLength(2);
    expect(complete.portfolio.items[0]?.media?.assetId).toBe("asset:demo-section");
    expectDeeplyFrozen([
      complete, complete.hero, complete.hero.media, complete.portfolio,
      complete.portfolio.items, complete.portfolio.items[0], complete.context,
      complete.context.points, complete.finalAction,
    ]);

    delete branch(payload, "hero")["eyebrow"];
    delete branch(payload, "hero")["media"];
    delete branch(payload, "portfolio")["intro"];
    for (const item of array(branch(payload, "portfolio"), "items")) delete record(item as object)["media"];
    delete branch(payload, "finalAction")["body"];
    delete branch(payload, "finalAction")["secondaryAction"];
    const minimal = parseMovingServicesPayload(payload);
    expect(minimal.hero.media).toBeUndefined();
    expect(minimal.portfolio.intro).toBeUndefined();
    expect(minimal.portfolio.items.every((item) => item.media === undefined)).toBe(true);
  });

  it.each(["hero", "portfolio", "context", "finalAction"])("rejects missing %s", async (key) => {
    const payload = await fixture("moving-services.json");
    delete payload[key];
    expect(() => parseMovingServicesPayload(payload)).toThrow(MovingServicesContractError);
  });

  it("enforces strings, item bounds, unique destinations, and safe links", async () => {
    const title = await fixture("moving-services.json");
    branch(title, "hero")["title"] = "x".repeat(MOVING_SERVICES_LIMITS.title + 1);
    expect(() => parseMovingServicesPayload(title)).toThrow(MovingServicesContractError);

    for (const count of [MOVING_SERVICES_LIMITS.servicesMinimum - 1, MOVING_SERVICES_LIMITS.servicesMaximum + 1]) {
      const payload = await fixture("moving-services.json");
      branch(payload, "portfolio")["items"] = serviceItems(count);
      expect(() => parseMovingServicesPayload(payload)).toThrow(MovingServicesContractError);
    }

    const duplicate = await fixture("moving-services.json");
    const entries = array(branch(duplicate, "portfolio"), "items");
    record(entries[1] as object)["href"] = record(entries[0] as object)["href"];
    expect(() => parseMovingServicesPayload(duplicate)).toThrow(MovingServicesContractError);

    const unsafe = await fixture("moving-services.json");
    record(array(branch(unsafe, "portfolio"), "items")[0] as object)["href"] = "javascript:alert(1)";
    expect(() => parseMovingServicesPayload(unsafe)).toThrow(MovingServicesContractError);
  });

  it("rejects sparse arrays, inherited objects, symbols and accessors without invoking them", async () => {
    const sparse = await fixture("moving-services.json");
    branch(sparse, "portfolio")["items"] = new Array(2);
    expect(() => parseMovingServicesPayload(sparse)).toThrow(MovingServicesContractError);
    await expectHostileRoot("moving-services.json", parseMovingServicesPayload, MovingServicesContractError);
  });
});

describe("moving.areas application contract", () => {
  it("parses complete and minimal valid payloads into immutable projections", async () => {
    const payload = await fixture("moving-areas.json");
    const complete = parseMovingAreasPayload(payload);
    expect(complete.coverage.items.map((item) => item.href)).toEqual([
      "/areas/north-district", "/areas/riverside",
    ]);
    expectDeeplyFrozen([
      complete, complete.hero, complete.coverage, complete.coverage.items,
      complete.coverage.items[0], complete.planning, complete.planning.points, complete.finalAction,
    ]);

    delete branch(payload, "hero")["eyebrow"];
    delete branch(payload, "finalAction")["body"];
    delete branch(payload, "finalAction")["secondaryAction"];
    const minimal = parseMovingAreasPayload(payload);
    expect(minimal.hero.eyebrow).toBeUndefined();
    expect(minimal.finalAction.secondaryAction).toBeUndefined();
  });

  it.each(["hero", "coverage", "planning", "finalAction"])("rejects missing %s", async (key) => {
    const payload = await fixture("moving-areas.json");
    delete payload[key];
    expect(() => parseMovingAreasPayload(payload)).toThrow(MovingAreasContractError);
  });

  it("enforces bounds, string limits, unique safe destinations, and valid items", async () => {
    for (const count of [MOVING_AREAS_LIMITS.areasMinimum - 1, MOVING_AREAS_LIMITS.areasMaximum + 1]) {
      const payload = await fixture("moving-areas.json");
      branch(payload, "coverage")["items"] = areaItems(count);
      expect(() => parseMovingAreasPayload(payload)).toThrow(MovingAreasContractError);
    }
    const oversized = await fixture("moving-areas.json");
    record(array(branch(oversized, "coverage"), "items")[0] as object)["description"] = "x".repeat(MOVING_AREAS_LIMITS.itemDescription + 1);
    expect(() => parseMovingAreasPayload(oversized)).toThrow(MovingAreasContractError);

    const duplicate = await fixture("moving-areas.json");
    const entries = array(branch(duplicate, "coverage"), "items");
    record(entries[1] as object)["href"] = record(entries[0] as object)["href"];
    expect(() => parseMovingAreasPayload(duplicate)).toThrow(MovingAreasContractError);

    const unsafe = await fixture("moving-areas.json");
    record(array(branch(unsafe, "coverage"), "items")[0] as object)["href"] = "//attacker.test";
    expect(() => parseMovingAreasPayload(unsafe)).toThrow(MovingAreasContractError);
  });

  it("rejects sparse arrays and hostile root objects", async () => {
    const sparse = await fixture("moving-areas.json");
    branch(sparse, "coverage")["items"] = new Array(2);
    expect(() => parseMovingAreasPayload(sparse)).toThrow(MovingAreasContractError);
    await expectHostileRoot("moving-areas.json", parseMovingAreasPayload, MovingAreasContractError);
  });
});

describe("moving.faq application contract", () => {
  it("parses a complete payload and an optional-media-free minimal payload immutably", async () => {
    const payload = await fixture("moving-faq.json");
    const complete = parseMovingFaqPayload(payload);
    expect(complete.items).toHaveLength(6);
    expectDeeplyFrozen([complete, complete.hero, complete.items, complete.items[0], complete.finalAction]);
    delete branch(payload, "hero")["eyebrow"];
    delete branch(payload, "finalAction")["body"];
    delete branch(payload, "finalAction")["secondaryAction"];
    expect(parseMovingFaqPayload(payload).hero.media).toBeUndefined();
  });

  it.each(["hero", "items", "finalAction"])("rejects missing %s", async (key) => {
    const payload = await fixture("moving-faq.json");
    delete payload[key];
    expect(() => parseMovingFaqPayload(payload)).toThrow(MovingFaqContractError);
  });

  it("enforces bounds, text limits, distinct questions, and safe actions", async () => {
    for (const count of [MOVING_FAQ_LIMITS.itemsMinimum - 1, MOVING_FAQ_LIMITS.itemsMaximum + 1]) {
      const payload = await fixture("moving-faq.json");
      payload["items"] = faqItems(count);
      expect(() => parseMovingFaqPayload(payload)).toThrow(MovingFaqContractError);
    }
    const oversized = await fixture("moving-faq.json");
    record(array(oversized, "items")[0] as object)["answer"] = "x".repeat(MOVING_FAQ_LIMITS.answer + 1);
    expect(() => parseMovingFaqPayload(oversized)).toThrow(MovingFaqContractError);

    const duplicate = await fixture("moving-faq.json");
    const questions = array(duplicate, "items");
    record(questions[1] as object)["question"] = String(record(questions[0] as object)["question"]).toUpperCase();
    expect(() => parseMovingFaqPayload(duplicate)).toThrow(MovingFaqContractError);

    const unsafe = await fixture("moving-faq.json");
    record(branch(unsafe, "finalAction")["primaryAction"] as object)["href"] = "data:text/html,bad";
    expect(() => parseMovingFaqPayload(unsafe)).toThrow(MovingFaqContractError);
  });

  it("rejects sparse arrays and hostile root objects", async () => {
    const sparse = await fixture("moving-faq.json");
    sparse["items"] = new Array(3);
    expect(() => parseMovingFaqPayload(sparse)).toThrow(MovingFaqContractError);
    await expectHostileRoot("moving-faq.json", parseMovingFaqPayload, MovingFaqContractError);
  });
});

describe("moving.testimonials application contract", () => {
  it("parses complete and minimal defensible customer proof immutably", async () => {
    const payload = await fixture("moving-testimonials.json");
    const complete = parseMovingTestimonialsPayload(payload);
    expect(complete.items).toHaveLength(3);
    expectDeeplyFrozen([
      complete, complete.hero, complete.featured, complete.items, complete.items[0], complete.finalAction,
    ]);
    delete branch(payload, "hero")["eyebrow"];
    delete branch(payload, "featured")["context"];
    delete branch(payload, "featured")["serviceLabel"];
    delete branch(payload, "finalAction")["body"];
    delete branch(payload, "finalAction")["secondaryAction"];
    const minimal = parseMovingTestimonialsPayload(payload);
    expect(minimal.featured.context).toBeUndefined();
    expect(minimal.featured.serviceLabel).toBeUndefined();
  });

  it.each(["hero", "featured", "items", "finalAction"])("rejects missing %s", async (key) => {
    const payload = await fixture("moving-testimonials.json");
    delete payload[key];
    expect(() => parseMovingTestimonialsPayload(payload)).toThrow(MovingTestimonialsContractError);
  });

  it("enforces bounds, text limits, uniqueness, and safe actions", async () => {
    for (const count of [MOVING_TESTIMONIALS_LIMITS.itemsMinimum - 1, MOVING_TESTIMONIALS_LIMITS.itemsMaximum + 1]) {
      const payload = await fixture("moving-testimonials.json");
      payload["items"] = testimonialItems(count);
      expect(() => parseMovingTestimonialsPayload(payload)).toThrow(MovingTestimonialsContractError);
    }
    const oversized = await fixture("moving-testimonials.json");
    branch(oversized, "featured")["quote"] = "x".repeat(MOVING_TESTIMONIALS_LIMITS.quote + 1);
    expect(() => parseMovingTestimonialsPayload(oversized)).toThrow(MovingTestimonialsContractError);

    const duplicate = await fixture("moving-testimonials.json");
    array(duplicate, "items")[0] = structuredClone(duplicate["featured"]);
    expect(() => parseMovingTestimonialsPayload(duplicate)).toThrow(MovingTestimonialsContractError);

    const unsafe = await fixture("moving-testimonials.json");
    record(branch(unsafe, "finalAction")["primaryAction"] as object)["href"] = "vbscript:bad";
    expect(() => parseMovingTestimonialsPayload(unsafe)).toThrow(MovingTestimonialsContractError);
  });

  it("rejects sparse arrays and hostile root objects", async () => {
    const sparse = await fixture("moving-testimonials.json");
    sparse["items"] = new Array(2);
    expect(() => parseMovingTestimonialsPayload(sparse)).toThrow(MovingTestimonialsContractError);
    await expectHostileRoot(
      "moving-testimonials.json", parseMovingTestimonialsPayload, MovingTestimonialsContractError,
    );
  });
});

async function expectHostileRoot(
  name: string,
  parse: (value: unknown) => unknown,
  ErrorType: new () => Error,
): Promise<void> {
  const source = await fixture(name);
  const inherited = Object.create({ inherited: true }) as Record<string, unknown>;
  Object.assign(inherited, source);
  expect(() => parse(inherited)).toThrow(ErrorType);

  const symbols = await fixture(name) as Record<PropertyKey, unknown>;
  symbols[Symbol("future")] = true;
  expect(() => parse(symbols)).toThrow(ErrorType);

  let invoked = false;
  const accessor = await fixture(name);
  Object.defineProperty(accessor, "future", { get: () => { invoked = true; return true; } });
  expect(() => parse(accessor)).toThrow(ErrorType);
  expect(invoked).toBe(false);
}

async function fixture(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(new URL(`../application/examples/${name}`, import.meta.url), "utf8")) as Record<string, unknown>;
}

function serviceItems(count: number): readonly Record<string, unknown>[] {
  return Array.from({ length: count }, (_, index) => ({
    title: `Service ${index}`, description: `Description ${index}`, href: `/services/${index}`,
  }));
}

function areaItems(count: number): readonly Record<string, unknown>[] {
  return Array.from({ length: count }, (_, index) => ({
    title: `Area ${index}`, description: `Context ${index}`, href: `/areas/${index}`,
  }));
}

function faqItems(count: number): readonly Record<string, unknown>[] {
  return Array.from({ length: count }, (_, index) => ({
    question: `Question ${index}?`, answer: `Answer ${index}.`,
  }));
}

function testimonialItems(count: number): readonly Record<string, unknown>[] {
  return Array.from({ length: count }, (_, index) => ({
    quote: `Customer experience ${index}.`, customerName: `Household ${index}`,
  }));
}

function array(source: unknown, key: string): unknown[] {
  return record(source as object)[key] as unknown[];
}

function record(value: object): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function branch(source: Record<string, unknown>, key: string): Record<string, unknown> {
  return record(source[key] as object);
}

function expectDeeplyFrozen(values: readonly unknown[]): void {
  for (const value of values) expect(Object.isFrozen(value)).toBe(true);
}
