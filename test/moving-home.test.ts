import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  isSafeActionHref,
  MovingHomeContractError,
  MOVING_HOME_LIMITS,
  parseMovingHomePayload,
} from "../shared/content/moving-home";

describe("moving.home application contract", () => {
  it("parses the complete reference fixture into a deeply immutable model", async () => {
    const input: unknown = JSON.parse(await readFile(
      new URL("../application/examples/moving-home.json", import.meta.url),
      "utf8",
    ));
    const page = parseMovingHomePayload(input);

    expect(page.hero.title).toBe("Moving handled with care, from door to door.");
    expect(page.proof).toHaveLength(3);
    expect(page.services.items).toHaveLength(4);
    expect(page.process.steps.map((step) => step.title)).toEqual(["Plan", "Prepare", "Move", "Place"]);
    expect(page.assurance.points).toEqual([
      "Clear arrival windows", "Room-by-room handling", "Protective packing", "Direct handoff",
    ]);
    expect(page.serviceAreas.areas).toHaveLength(4);
    for (const value of [
      page,
      page.hero,
      page.hero.media,
      page.hero.primaryAction,
      page.proof,
      page.proof[0],
      page.services,
      page.services.items,
      page.services.items[0],
      page.process,
      page.process.steps,
      page.assurance,
      page.assurance.points,
      page.serviceAreas,
      page.finalAction,
    ]) expect(Object.isFrozen(value)).toBe(true);
  });

  it("accepts omitted optional copy, secondary actions, and assurance media", () => {
    const input = completePayload();
    delete input.hero.eyebrow;
    delete input.hero.secondaryAction;
    delete input.services.eyebrow;
    delete input.services.intro;
    delete input.process.intro;
    delete input.assurance.media;
    delete input.serviceAreas.intro;
    delete input.finalAction.body;
    delete input.finalAction.secondaryAction;

    const page = parseMovingHomePayload(input);
    expect(page.hero.eyebrow).toBeUndefined();
    expect(page.hero.secondaryAction).toBeUndefined();
    expect(page.assurance.media).toBeUndefined();
    expect(page.finalAction.secondaryAction).toBeUndefined();
  });

  it.each(["hero", "proof", "services", "process", "assurance", "serviceAreas", "finalAction"])(
    "rejects a missing required root branch: %s",
    (key) => {
      const input = completePayload() as unknown as Record<string, unknown>;
      delete input[key];
      expect(() => parseMovingHomePayload(input)).toThrow(MovingHomeContractError);
    },
  );

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["blank", " \n "],
    ["wrong type", 42],
    ["too long", "t".repeat(MOVING_HOME_LIMITS.title + 1)],
  ])("rejects a hero title that is %s", (_case, title) => {
    const input = completePayload();
    if (title === undefined) delete input.hero.title;
    else input.hero.title = title as string;
    expect(() => parseMovingHomePayload(input)).toThrow(MovingHomeContractError);
  });

  it.each([
    [false],
    ["i".repeat(MOVING_HOME_LIMITS.intro + 1)],
    [""],
  ])("rejects invalid required hero introduction %#", (intro) => {
    const input = completePayload();
    input.hero.intro = intro as string;
    expect(() => parseMovingHomePayload(input)).toThrow(MovingHomeContractError);
  });

  it.each([
    [null],
    [{ alt: "Context" }],
    [{ assetId: "asset:hero" }],
    [{ assetId: " ", alt: "Context" }],
    [{ assetId: "asset:hero", alt: "a".repeat(201) }],
  ])("rejects invalid required hero media %#", (media) => {
    const input = completePayload();
    input.hero.media = media as typeof input.hero.media;
    expect(() => parseMovingHomePayload(input)).toThrow(MovingHomeContractError);
  });

  it.each([
    "/",
    "/about?source=home#plan",
    "http://example.test/moving",
    "https://example.test/moving",
    "tel:+15550101010",
    "mailto:hello@example.test",
  ])("accepts the safe action destination %s without rewriting it", (href) => {
    const input = completePayload();
    input.hero.primaryAction.href = href;
    expect(parseMovingHomePayload(input).hero.primaryAction.href).toBe(href);
    expect(isSafeActionHref(href)).toBe(true);
  });

  it.each([
    "//attacker.test/path",
    "javascript:alert(1)",
    "data:text/html,bad",
    "vbscript:msgbox(1)",
    "ftp://example.test/file",
    "https://user:pass@example.test",
    "tel:",
    "mailto:",
    " /about",
    "/\\attacker.test",
    "https://example.test/has space",
  ])("rejects the unsafe action destination %s", (href) => {
    const input = completePayload();
    input.hero.primaryAction.href = href;
    expect(() => parseMovingHomePayload(input)).toThrow(MovingHomeContractError);
    expect(isSafeActionHref(href)).toBe(false);
  });

  it.each([
    ["missing label", { href: "/about" }],
    ["blank label", { label: " ", href: "/about" }],
    ["long label", { label: "l".repeat(MOVING_HOME_LIMITS.actionLabel + 1), href: "/about" }],
    ["missing href", { label: "Plan" }],
  ])("rejects an invalid action: %s", (_case, action) => {
    const input = completePayload();
    input.hero.primaryAction = action as typeof input.hero.primaryAction;
    expect(() => parseMovingHomePayload(input)).toThrow(MovingHomeContractError);
  });

  it("enforces proof cardinality and item bounds", () => {
    expect(parseMovingHomePayload(withProof(2)).proof).toHaveLength(2);
    expect(parseMovingHomePayload(withProof(6)).proof).toHaveLength(6);
    expect(() => parseMovingHomePayload(withProof(1))).toThrow(MovingHomeContractError);
    expect(() => parseMovingHomePayload(withProof(7))).toThrow(MovingHomeContractError);
    const input = completePayload();
    input.proof[0]!.value = "v".repeat(MOVING_HOME_LIMITS.proofValue + 1);
    expect(() => parseMovingHomePayload(input)).toThrow(MovingHomeContractError);
  });

  it("enforces service cardinality, fields, and safe destinations", () => {
    expect(parseMovingHomePayload(withServices(3)).services.items).toHaveLength(3);
    expect(parseMovingHomePayload(withServices(8)).services.items).toHaveLength(8);
    expect(() => parseMovingHomePayload(withServices(2))).toThrow(MovingHomeContractError);
    expect(() => parseMovingHomePayload(withServices(9))).toThrow(MovingHomeContractError);
    const input = completePayload();
    input.services.items[0]!.description = "d".repeat(MOVING_HOME_LIMITS.itemDescription + 1);
    expect(() => parseMovingHomePayload(input)).toThrow(MovingHomeContractError);
    input.services.items[0]!.description = "Valid";
    input.services.items[0]!.href = "javascript:bad";
    expect(() => parseMovingHomePayload(input)).toThrow(MovingHomeContractError);
  });

  it("enforces ordered process cardinality and fields without adding stored numbers", () => {
    expect(parseMovingHomePayload(withSteps(3)).process.steps).toHaveLength(3);
    expect(parseMovingHomePayload(withSteps(6)).process.steps).toHaveLength(6);
    expect(() => parseMovingHomePayload(withSteps(2))).toThrow(MovingHomeContractError);
    expect(() => parseMovingHomePayload(withSteps(7))).toThrow(MovingHomeContractError);
    const page = parseMovingHomePayload(completePayload());
    expect(Object.keys(page.process.steps[0]!)).toEqual(["title", "description"]);
  });

  it("enforces assurance point cardinality and projects repeater records to strings", () => {
    expect(parseMovingHomePayload(withPoints(2)).assurance.points).toHaveLength(2);
    expect(parseMovingHomePayload(withPoints(6)).assurance.points).toHaveLength(6);
    expect(() => parseMovingHomePayload(withPoints(1))).toThrow(MovingHomeContractError);
    expect(() => parseMovingHomePayload(withPoints(7))).toThrow(MovingHomeContractError);
    const input = completePayload();
    input.assurance.points[0]!.text = "p".repeat(MOVING_HOME_LIMITS.assurancePoint + 1);
    expect(() => parseMovingHomePayload(input)).toThrow(MovingHomeContractError);
  });

  it("enforces service-area cardinality, labels, and destinations", () => {
    expect(parseMovingHomePayload(withAreas(3)).serviceAreas.areas).toHaveLength(3);
    expect(parseMovingHomePayload(withAreas(12)).serviceAreas.areas).toHaveLength(12);
    expect(() => parseMovingHomePayload(withAreas(2))).toThrow(MovingHomeContractError);
    expect(() => parseMovingHomePayload(withAreas(13))).toThrow(MovingHomeContractError);
    const input = completePayload();
    input.serviceAreas.areas[0]!.href = "data:text/html,bad";
    expect(() => parseMovingHomePayload(input)).toThrow(MovingHomeContractError);
  });

  it("ignores unknown and constructor-like keys without prototype mutation", () => {
    const input = completePayload() as unknown as Record<string, unknown>;
    input["unknown"] = { render: "never" };
    input["constructor"] = { prototype: { polluted: true } };
    Object.defineProperty(input, "__proto__", {
      enumerable: true,
      configurable: true,
      value: { polluted: true },
    });
    (input["hero"] as Record<string, unknown>)["future"] = true;

    const page = parseMovingHomePayload(input);
    expect(Object.keys(page)).toEqual([
      "hero", "proof", "services", "process", "assurance", "serviceAreas", "finalAction",
    ]);
    expect(Object.prototype.hasOwnProperty.call(page, "__proto__")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, "polluted")).toBe(false);
  });

  it("rejects non-plain objects, symbols, and accessors without invoking code", () => {
    const inherited = Object.create({ inherited: true }) as Record<string, unknown>;
    Object.assign(inherited, completePayload());
    expect(() => parseMovingHomePayload(inherited)).toThrow(MovingHomeContractError);

    const symbolInput = completePayload() as unknown as Record<PropertyKey, unknown>;
    symbolInput[Symbol("future")] = true;
    expect(() => parseMovingHomePayload(symbolInput)).toThrow(MovingHomeContractError);

    let invoked = false;
    const accessorInput = completePayload() as unknown as Record<string, unknown>;
    Object.defineProperty(accessorInput, "future", {
      enumerable: false,
      get: () => { invoked = true; return "never"; },
    });
    expect(() => parseMovingHomePayload(accessorInput)).toThrow(MovingHomeContractError);
    expect(invoked).toBe(false);
  });

  it("rejects sparse and accessor-backed arrays without invoking accessors", () => {
    const sparseInput = completePayload();
    sparseInput.proof = new Array(2) as typeof sparseInput.proof;
    expect(() => parseMovingHomePayload(sparseInput)).toThrow(MovingHomeContractError);

    let invoked = false;
    const accessorInput = completePayload();
    Object.defineProperty(accessorInput.proof, "0", {
      enumerable: true,
      get: () => { invoked = true; return { value: "Never", label: "Never" }; },
    });
    expect(() => parseMovingHomePayload(accessorInput)).toThrow(MovingHomeContractError);
    expect(invoked).toBe(false);
  });

  it("preserves authored whitespace while using trim only for required-empty checks", () => {
    const input = completePayload();
    input.hero.title = "  Authored title  ";
    input.assurance.body = "Line one\nLine two";
    const page = parseMovingHomePayload(input);
    expect(page.hero.title).toBe("  Authored title  ");
    expect(page.assurance.body).toBe("Line one\nLine two");
  });
});

function completePayload() {
  return {
    hero: {
      eyebrow: "Moving",
      title: "A clear move",
      intro: "A clear introduction.",
      media: { assetId: "asset:hero", alt: "Moving truck" },
      primaryAction: { label: "Plan", href: "/about" },
      secondaryAction: { label: "Call", href: "tel:+15550101010" },
    },
    proof: proofItems(2),
    services: {
      eyebrow: "Services",
      title: "Moving services",
      intro: "Choose the support you need.",
      items: serviceItems(3),
    },
    process: {
      eyebrow: "Process",
      title: "How moving works",
      intro: "A clear sequence.",
      steps: stepItems(3),
    },
    assurance: {
      eyebrow: "Care",
      title: "Care at each stage",
      body: "A careful handling process.",
      media: { assetId: "asset:assurance", alt: "Careful handoff" },
      points: pointItems(2),
    },
    serviceAreas: {
      eyebrow: "Areas",
      title: "Demo service areas",
      intro: "General demo labels.",
      areas: areaItems(3),
    },
    finalAction: {
      eyebrow: "Ready",
      title: "Start planning",
      body: "Tell us about the move.",
      primaryAction: { label: "Plan", href: "/about" },
      secondaryAction: { label: "Email", href: "mailto:hello@example.test" },
    },
  };
}

function withProof(count: number) {
  return { ...completePayload(), proof: proofItems(count) };
}

function withServices(count: number) {
  const input = completePayload();
  input.services.items = serviceItems(count);
  return input;
}

function withSteps(count: number) {
  const input = completePayload();
  input.process.steps = stepItems(count);
  return input;
}

function withPoints(count: number) {
  const input = completePayload();
  input.assurance.points = pointItems(count);
  return input;
}

function withAreas(count: number) {
  const input = completePayload();
  input.serviceAreas.areas = areaItems(count);
  return input;
}

function proofItems(count: number) {
  return Array.from({ length: count }, (_, index) => ({ value: `Value ${index}`, label: `Label ${index}` }));
}

function serviceItems(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    title: `Service ${index}`,
    description: `Service description ${index}`,
    href: "/about",
  }));
}

function stepItems(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    title: `Step ${index}`,
    description: `Step description ${index}`,
  }));
}

function pointItems(count: number) {
  return Array.from({ length: count }, (_, index) => ({ text: `Point ${index}` }));
}

function areaItems(count: number) {
  return Array.from({ length: count }, (_, index) => ({ label: `Area ${index}`, href: "/about" }));
}
