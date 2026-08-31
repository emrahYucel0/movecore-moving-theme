import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  MovingServiceContractError,
  MOVING_SERVICE_LIMITS,
  parseMovingServicePayload,
} from "../shared/content/moving-service";

describe("moving.service application contract", () => {
  it("parses the complete reference fixture into a deeply immutable model", async () => {
    const payload: unknown = JSON.parse(await readFile(
      new URL("../application/examples/moving-service.json", import.meta.url), "utf8",
    ));
    const service = parseMovingServicePayload(payload);
    expect(service.hero.title).toBe("A room-by-room plan for moving home.");
    expect(service.overview.points).toHaveLength(3);
    expect(service.included.items).toHaveLength(4);
    expect(service.process.steps).toHaveLength(4);
    expect(service.relatedServices.items).toHaveLength(2);
    for (const value of [
      service, service.hero, service.hero.media, service.hero.primaryAction,
      service.overview, service.overview.points, service.included, service.included.items,
      service.process, service.process.steps, service.relatedServices,
      service.relatedServices.items, service.finalAction,
    ]) expect(Object.isFrozen(value)).toBe(true);
  });

  it.each(["hero", "overview", "included", "process", "relatedServices", "finalAction"])(
    "rejects a missing root branch: %s",
    (key) => {
      const payload = record(completePayload());
      delete payload[key];
      expect(() => parseMovingServicePayload(payload)).toThrow(MovingServiceContractError);
    },
  );

  it.each([
    ["missing", undefined], ["empty", ""], ["blank", "  "], ["wrong type", 42],
    ["oversized", "x".repeat(MOVING_SERVICE_LIMITS.title + 1)],
  ])("rejects a hero title that is %s", (_case, value) => {
    const payload = completePayload();
    const hero = record(payload.hero);
    if (value === undefined) delete hero["title"];
    else hero["title"] = value;
    expect(() => parseMovingServicePayload(payload)).toThrow(MovingServiceContractError);
  });

  it.each([null, false, "x".repeat(MOVING_SERVICE_LIMITS.heroIntro + 1)])(
    "rejects invalid required hero introduction %#",
    (value) => {
      const payload = completePayload();
      record(payload.hero)["intro"] = value;
      expect(() => parseMovingServicePayload(payload)).toThrow(MovingServiceContractError);
    },
  );

  it.each([
    null,
    { alt: "Missing asset" },
    { assetId: "asset:hero" },
    { assetId: "asset:hero", alt: "x".repeat(201) },
  ])("rejects malformed optional media %#", (media) => {
    const payload = completePayload();
    record(payload.hero)["media"] = media;
    expect(() => parseMovingServicePayload(payload)).toThrow(MovingServiceContractError);
  });

  it.each(["javascript:alert(1)", "//attacker.test", "https://user:pass@example.test", "/bad path", "data:text/plain,x"])(
    "rejects unsafe service action href %s",
    (href) => {
      const payload = completePayload();
      record(payload.hero.primaryAction)["href"] = href;
      expect(() => parseMovingServicePayload(payload)).toThrow(MovingServiceContractError);
    },
  );

  it.each([
    ["overview points", (payload: ReturnType<typeof completePayload>, count: number) => {
      payload.overview.points = points(count);
    }, 1, 7],
    ["included items", (payload: ReturnType<typeof completePayload>, count: number) => {
      payload.included.items = included(count);
    }, 2, 9],
    ["process steps", (payload: ReturnType<typeof completePayload>, count: number) => {
      payload.process.steps = steps(count);
    }, 2, 7],
    ["related services", (payload: ReturnType<typeof completePayload>, count: number) => {
      payload.relatedServices.items = related(count);
    }, 1, 7],
  ] as const)("enforces %s cardinality", (_label, mutate, below, above) => {
    for (const count of [below, above]) {
      const payload = completePayload();
      mutate(payload, count);
      expect(() => parseMovingServicePayload(payload)).toThrow(MovingServiceContractError);
    }
  });

  it("rejects malformed nested items and invalid related destinations", () => {
    const malformed = completePayload();
    malformed.included.items[0] = null as unknown as (typeof malformed.included.items)[number];
    expect(() => parseMovingServicePayload(malformed)).toThrow(MovingServiceContractError);

    const unsafe = completePayload();
    unsafe.relatedServices.items[0]!.href = "vbscript:unsafe";
    expect(() => parseMovingServicePayload(unsafe)).toThrow(MovingServiceContractError);
  });

  it("ignores unknown keys without copying them into the result", () => {
    const payload = completePayload();
    record(payload)["future"] = { executable: false };
    record(payload.hero)["future"] = "ignored";
    const service = parseMovingServicePayload(payload);
    expect(record(service)["future"]).toBeUndefined();
    expect(record(service.hero)["future"]).toBeUndefined();
  });

  it("rejects inherited, symbol-bearing, and accessor objects without invoking accessors", () => {
    const inherited = Object.create({ inherited: true }) as Record<string, unknown>;
    Object.assign(inherited, completePayload());
    expect(() => parseMovingServicePayload(inherited)).toThrow(MovingServiceContractError);

    const symbolPayload = record(completePayload()) as Record<PropertyKey, unknown>;
    symbolPayload[Symbol("future")] = true;
    expect(() => parseMovingServicePayload(symbolPayload)).toThrow(MovingServiceContractError);

    let invoked = false;
    const accessor = record(completePayload());
    Object.defineProperty(accessor, "future", { get: () => { invoked = true; return true; } });
    expect(() => parseMovingServicePayload(accessor)).toThrow(MovingServiceContractError);
    expect(invoked).toBe(false);
  });

  it("rejects sparse and accessor-backed arrays without invoking accessors", () => {
    const sparse = completePayload();
    sparse.included.items = new Array(3) as typeof sparse.included.items;
    expect(() => parseMovingServicePayload(sparse)).toThrow(MovingServiceContractError);

    let invoked = false;
    const accessor = completePayload();
    Object.defineProperty(accessor.process.steps, "0", {
      get: () => { invoked = true; return steps(1)[0]; },
    });
    expect(() => parseMovingServicePayload(accessor)).toThrow(MovingServiceContractError);
    expect(invoked).toBe(false);
  });

  it("preserves authored text while trimming only for required-empty validation", () => {
    const payload = completePayload();
    payload.hero.title = "  Authored service title  ";
    payload.overview.body = "Line one\nLine two";
    const service = parseMovingServicePayload(payload);
    expect(service.hero.title).toBe("  Authored service title  ");
    expect(service.overview.body).toBe("Line one\nLine two");
  });
});

function completePayload() {
  return {
    hero: {
      eyebrow: "Service",
      title: "Home moving",
      intro: "A clear home move.",
      media: { assetId: "asset:hero", alt: "Prepared moving truck" },
      primaryAction: { label: "Plan", href: "/about" },
    },
    overview: { title: "Overview", body: "Useful overview.", points: points(2) },
    included: { title: "Included", intro: "Service scope.", items: included(3) },
    process: { title: "Process", intro: "Clear sequence.", steps: steps(3) },
    relatedServices: { title: "Related", items: related(2) },
    finalAction: {
      title: "Start planning",
      body: "Share the move.",
      primaryAction: { label: "Plan", href: "/about" },
      secondaryAction: { label: "Call", href: "tel:+15550101010" },
    },
  };
}

function points(count: number) {
  return Array.from({ length: count }, (_, index) => ({ text: `Point ${index}` }));
}

function included(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    title: `Included ${index}`, description: `Included description ${index}`,
  }));
}

function steps(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    title: `Action ${index}`, description: `Action description ${index}`,
  }));
}

function related(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    title: `Related ${index}`, description: `Related description ${index}`, href: "/about",
  }));
}

function record(value: object): Record<string, unknown> {
  return value as Record<string, unknown>;
}
