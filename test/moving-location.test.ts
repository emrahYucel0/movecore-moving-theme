import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  MovingLocationContractError,
  MOVING_LOCATION_LIMITS,
  parseMovingLocationPayload,
} from "../shared/content/moving-location";

describe("moving.location application contract", () => {
  it("parses the complete reference fixture into a deeply immutable model", async () => {
    const payload: unknown = JSON.parse(await readFile(
      new URL("../application/examples/moving-location.json", import.meta.url), "utf8",
    ));
    const location = parseMovingLocationPayload(payload);
    expect(location.hero.title).toBe("Moving support shaped around practical local access.");
    expect(location.overview.highlights).toHaveLength(3);
    expect(location.services.items).toHaveLength(2);
    expect(location.localDetails.items).toHaveLength(4);
    expect(location.nearbyAreas.items).toHaveLength(2);
    for (const value of [
      location, location.hero, location.hero.media, location.overview,
      location.overview.highlights, location.services, location.services.items,
      location.localDetails, location.localDetails.items, location.nearbyAreas,
      location.nearbyAreas.items, location.finalAction,
    ]) expect(Object.isFrozen(value)).toBe(true);
  });

  it.each(["hero", "overview", "services", "localDetails", "nearbyAreas", "finalAction"])(
    "rejects a missing root branch: %s",
    (key) => {
      const payload = record(completePayload());
      delete payload[key];
      expect(() => parseMovingLocationPayload(payload)).toThrow(MovingLocationContractError);
    },
  );

  it.each([
    [undefined], [""], ["  "], [false], ["x".repeat(MOVING_LOCATION_LIMITS.heroTitle + 1)],
  ])("rejects invalid hero titles %#", (value) => {
    const payload = completePayload();
    const hero = record(payload.hero);
    if (value === undefined) delete hero["title"];
    else hero["title"] = value;
    expect(() => parseMovingLocationPayload(payload)).toThrow(MovingLocationContractError);
  });

  it.each([null, 42, "x".repeat(MOVING_LOCATION_LIMITS.heroIntro + 1)])(
    "rejects invalid hero introductions %#",
    (value) => {
      const payload = completePayload();
      record(payload.hero)["intro"] = value;
      expect(() => parseMovingLocationPayload(payload)).toThrow(MovingLocationContractError);
    },
  );

  it.each([null, { alt: "Missing asset" }, { assetId: "asset:hero" }])(
    "rejects malformed optional location media %#",
    (value) => {
      const payload = completePayload();
      record(payload.hero)["media"] = value;
      expect(() => parseMovingLocationPayload(payload)).toThrow(MovingLocationContractError);
    },
  );

  it.each([
    ["highlights", (payload: ReturnType<typeof completePayload>, count: number) => {
      payload.overview.highlights = highlights(count);
    }, 1, 7],
    ["service links", (payload: ReturnType<typeof completePayload>, count: number) => {
      payload.services.items = services(count);
    }, 1, 9],
    ["local details", (payload: ReturnType<typeof completePayload>, count: number) => {
      payload.localDetails.items = details(count);
    }, 1, 7],
    ["nearby areas", (payload: ReturnType<typeof completePayload>, count: number) => {
      payload.nearbyAreas.items = nearby(count);
    }, 1, 9],
  ] as const)("enforces %s cardinality", (_label, mutate, below, above) => {
    for (const count of [below, above]) {
      const payload = completePayload();
      mutate(payload, count);
      expect(() => parseMovingLocationPayload(payload)).toThrow(MovingLocationContractError);
    }
  });

  it("rejects unsafe service and nearby-area destinations", () => {
    const service = completePayload();
    service.services.items[0]!.href = "javascript:alert(1)";
    expect(() => parseMovingLocationPayload(service)).toThrow(MovingLocationContractError);

    const nearbyArea = completePayload();
    nearbyArea.nearbyAreas.items[0]!.href = "//attacker.test";
    expect(() => parseMovingLocationPayload(nearbyArea)).toThrow(MovingLocationContractError);
  });

  it("rejects malformed nested items", () => {
    const payload = completePayload();
    payload.localDetails.items[0] = { title: "Missing description" } as unknown as (typeof payload.localDetails.items)[number];
    expect(() => parseMovingLocationPayload(payload)).toThrow(MovingLocationContractError);
  });

  it("ignores unknown fields without projecting them", () => {
    const payload = completePayload();
    record(payload)["future"] = true;
    record(payload.localDetails)["future"] = "ignored";
    const location = parseMovingLocationPayload(payload);
    expect(record(location)["future"]).toBeUndefined();
    expect(record(location.localDetails)["future"]).toBeUndefined();
  });

  it("rejects inherited, symbol-bearing, and accessor objects without invoking accessors", () => {
    const inherited = Object.create({ inherited: true }) as Record<string, unknown>;
    Object.assign(inherited, completePayload());
    expect(() => parseMovingLocationPayload(inherited)).toThrow(MovingLocationContractError);

    const symbolPayload = record(completePayload()) as Record<PropertyKey, unknown>;
    symbolPayload[Symbol("future")] = true;
    expect(() => parseMovingLocationPayload(symbolPayload)).toThrow(MovingLocationContractError);

    let invoked = false;
    const accessor = record(completePayload());
    Object.defineProperty(accessor, "future", { get: () => { invoked = true; return true; } });
    expect(() => parseMovingLocationPayload(accessor)).toThrow(MovingLocationContractError);
    expect(invoked).toBe(false);
  });

  it("rejects sparse and accessor-backed arrays without invoking accessors", () => {
    const sparse = completePayload();
    sparse.overview.highlights = new Array(2) as typeof sparse.overview.highlights;
    expect(() => parseMovingLocationPayload(sparse)).toThrow(MovingLocationContractError);

    let invoked = false;
    const accessor = completePayload();
    Object.defineProperty(accessor.nearbyAreas.items, "0", {
      get: () => { invoked = true; return nearby(1)[0]; },
    });
    expect(() => parseMovingLocationPayload(accessor)).toThrow(MovingLocationContractError);
    expect(invoked).toBe(false);
  });

  it("accepts absent optional hero media and preserves authored text", () => {
    const payload = completePayload();
    delete record(payload.hero)["media"];
    payload.hero.title = "  Authored location title  ";
    payload.localDetails.body = "Line one\nLine two";
    const location = parseMovingLocationPayload(payload);
    expect(location.hero.media).toBeUndefined();
    expect(location.hero.title).toBe("  Authored location title  ");
    expect(location.localDetails.body).toBe("Line one\nLine two");
  });
});

function completePayload() {
  return {
    hero: {
      eyebrow: "North District", title: "Moving in North District",
      intro: "Useful local planning.", media: { assetId: "asset:hero", alt: "Local move" },
    },
    overview: { title: "Overview", body: "Local overview.", highlights: highlights(2) },
    services: { title: "Services", intro: "Available support.", items: services(2) },
    localDetails: { title: "Details", body: "Operational details.", items: details(2) },
    nearbyAreas: { title: "Nearby", items: nearby(2) },
    finalAction: {
      title: "Plan the move", body: "Share the addresses.",
      primaryAction: { label: "Plan", href: "/about" },
      secondaryAction: { label: "Call", href: "tel:+15550101010" },
    },
  };
}

function highlights(count: number) {
  return Array.from({ length: count }, (_, index) => ({ text: `Highlight ${index}` }));
}

function services(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    title: `Service ${index}`, description: `Service description ${index}`, href: "/about",
  }));
}

function details(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    title: `Detail ${index}`, description: `Detail description ${index}`,
  }));
}

function nearby(count: number) {
  return Array.from({ length: count }, (_, index) => ({ label: `Area ${index}`, href: "/about" }));
}

function record(value: object): Record<string, unknown> {
  return value as Record<string, unknown>;
}
