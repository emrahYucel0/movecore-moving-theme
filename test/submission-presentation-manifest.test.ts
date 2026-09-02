import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  MOVING_MOVE_TYPES,
  MOVING_PROPERTY_SIZES,
  MOVING_REQUESTED_SERVICES,
  parseMovingContactRequest,
  parseMovingQuoteRequest,
} from "../shared/submissions/moving-submissions";

const ALLOWED_KINDS = new Set(["text", "multiline", "email", "phone", "date", "boolean", "list", "enum"]);

interface Field {
  readonly label: string;
  readonly path: string;
  readonly kind: string;
  readonly options?: readonly Readonly<{ readonly value: string; readonly label: string }>[];
}
interface Profile {
  readonly type: string;
  readonly label: string;
  readonly singularLabel: string;
  readonly preview: readonly Field[];
  readonly groups: readonly Readonly<{ readonly label: string; readonly fields: readonly Field[] }>[];
}

describe("R2.9D Moving Submission Presentation manifest", () => {
  it("defines exactly the intended quote and contact operator presentation", async () => {
    const profiles = await presentationProfiles();
    expect(profiles.map(normalizedProfile)).toEqual([
      {
        type: "moving.quote-request", label: "Quote requests", singularLabel: "Quote request",
        preview: [
          ["Customer", "customer.name", "text"],
          ["Moving from", "move.origin", "text"],
          ["Moving to", "move.destination", "text"],
        ],
        groups: [
          ["Customer", [
            ["Name", "customer.name", "text"],
            ["Phone", "customer.phone", "phone"],
            ["Email", "customer.email", "email"],
          ]],
          ["Move", [
            ["Moving from", "move.origin", "text"],
            ["Moving to", "move.destination", "text"],
            ["Move type", "move.moveType", "enum"],
            ["Preferred date", "move.preferredDate", "date"],
            ["Property size", "move.propertySize", "enum"],
          ]],
          ["Additional planning", [["Additional notes", "message", "multiline"]]],
        ],
      },
      {
        type: "moving.contact-request", label: "Contact requests", singularLabel: "Contact request",
        preview: [
          ["Customer", "name", "text"],
          ["Phone", "phone", "phone"],
          ["Email", "email", "email"],
        ],
        groups: [
          ["Customer", [
            ["Name", "name", "text"],
            ["Phone", "phone", "phone"],
            ["Email", "email", "email"],
          ]],
          ["Message", [
            ["Subject", "subject", "text"],
            ["Message", "message", "multiline"],
          ]],
        ],
      },
    ]);
    expect(new Set(profiles.map(({ type }) => type)).size).toBe(2);
    for (const profile of profiles) {
      expect(profile.preview.length).toBeLessThanOrEqual(3);
      expect(Object.keys(profile).sort()).toEqual(["groups", "label", "preview", "singularLabel", "type"]);
      for (const field of fields(profile)) {
        expect(ALLOWED_KINDS.has(field.kind)).toBe(true);
        expect(field.path).not.toBe("schemaVersion");
        expect(field.path).not.toBe("privacyAcknowledged");
        expect(Object.keys(field).sort()).toEqual(
          field.kind === "enum" ? ["kind", "label", "options", "path"] : ["kind", "label", "path"],
        );
      }
    }
  });

  it("matches the authoritative enabled Submission Definition types", async () => {
    const definitions = JSON.parse(await source("../application/submission-definitions.json")) as {
      readonly version: number;
      readonly submissions: readonly Readonly<{ readonly type: string; readonly enabled: boolean }>[];
    };
    const profiles = await presentationProfiles();
    expect(definitions.version).toBe(1);
    expect(definitions.submissions.every(({ enabled }) => enabled)).toBe(true);
    expect(profiles.map(({ type }) => type).sort()).toEqual(
      definitions.submissions.map(({ type }) => type).sort(),
    );
  });

  it("represents minimal and complete valid quote payloads without invalid fields", async () => {
    const quote = (await presentationProfiles()).find(({ type }) => type === "moving.quote-request")!;
    const minimal = parseMovingQuoteRequest({
      name: "Taylor Brooks", phone: "+1 202 555 0142", origin: "North District",
      destination: "Riverside", moveType: "small-move", privacyAcknowledged: "true",
    });
    expect(projectStates(quote, minimal)).not.toContain("invalid");
    expect(projectStates(quote, minimal).filter((state) => state === "absent")).toHaveLength(4);

    const complete = parseMovingQuoteRequest({
      name: "Jamie Rivera", phone: "+1 (202) 555-0199", email: "jamie@example.test",
      origin: "12 Example Street", destination: "84 Sample Avenue", preferredDate: "2026-10-12",
      moveType: "home", propertySize: "two-three-bedrooms",
      requestedServices: ["packing", "special-handling"],
      message: "A lift is available at the destination.", privacyAcknowledged: "true",
    });
    expect(projectStates(quote, complete)).toEqual(fields(quote).map(() => "present"));
  });

  it("keeps phone-only, email-only, and complete contact payloads usable", async () => {
    const contact = (await presentationProfiles()).find(({ type }) => type === "moving.contact-request")!;
    const phoneOnly = parseMovingContactRequest({
      name: "Morgan Lee", phone: "+44 20 7946 0958", message: "Please call after 14:00.",
      privacyAcknowledged: "true",
    });
    const emailOnly = parseMovingContactRequest({
      name: "Alex Morgan", email: "alex@example.test", message: "Please reply by email.",
      privacyAcknowledged: "true",
    });
    const complete = parseMovingContactRequest({
      name: "Casey Walker", phone: "+1 202 555 0175", email: "casey@example.test",
      subject: "Access question", message: "Can your team work with a timed loading bay?",
      privacyAcknowledged: "true",
    });
    for (const payload of [phoneOnly, emailOnly, complete]) {
      expect(projectStates(contact, payload)).not.toContain("invalid");
    }
    expect(projectStates(contact, phoneOnly).filter((state) => state === "absent")).toHaveLength(3);
    expect(projectStates(contact, emailOnly).filter((state) => state === "absent")).toHaveLength(3);
    expect(projectStates(contact, complete)).toEqual(fields(contact).map(() => "present"));
  });

  it("maps every current scalar enum value and no unknown value", async () => {
    const quote = (await presentationProfiles()).find(({ type }) => type === "moving.quote-request")!;
    expect(enumValues(quote, "move.moveType")).toEqual([...MOVING_MOVE_TYPES]);
    expect(enumValues(quote, "move.propertySize")).toEqual([...MOVING_PROPERTY_SIZES]);
  });

  it("keeps technical requested-service slugs out of the primary typed view", async () => {
    const quote = (await presentationProfiles()).find(({ type }) => type === "moving.quote-request")!;
    expect(fields(quote).map(({ path }) => path)).not.toContain("requestedServices");
    expect(MOVING_REQUESTED_SERVICES).toContain("furniture-disassembly");
    expect(MOVING_REQUESTED_SERVICES).toContain("special-handling");
  });
});

function normalizedProfile(profile: Profile) {
  return {
    type: profile.type, label: profile.label, singularLabel: profile.singularLabel,
    preview: profile.preview.map(fieldTuple),
    groups: profile.groups.map((group) => [group.label, group.fields.map(fieldTuple)]),
  };
}

function fieldTuple(field: Field): readonly [string, string, string] {
  return [field.label, field.path, field.kind];
}

function fields(profile: Profile): readonly Field[] {
  return [...profile.preview, ...profile.groups.flatMap(({ fields: groupFields }) => groupFields)];
}

function enumValues(profile: Profile, path: string): readonly string[] {
  return fields(profile).find((field) => field.path === path)?.options?.map(({ value }) => value) ?? [];
}

function projectStates(profile: Profile, payload: object): readonly ("present" | "absent" | "invalid")[] {
  return fields(profile).map((field) => {
    const extracted = ownValue(payload, field.path);
    if (extracted.state !== "present") return extracted.state;
    if (field.kind === "list") {
      return Array.isArray(extracted.value) && extracted.value.every((item) => typeof item === "string")
        ? "present" : "invalid";
    }
    if (field.kind === "boolean") return typeof extracted.value === "boolean" ? "present" : "invalid";
    if (typeof extracted.value !== "string") return "invalid";
    if (field.kind === "enum") {
      return field.options?.some(({ value }) => value === extracted.value) === true ? "present" : "invalid";
    }
    if (field.kind === "date") return /^\d{4}-\d{2}-\d{2}$/u.test(extracted.value) ? "present" : "invalid";
    return "present";
  });
}

function ownValue(sourceValue: object, fieldPath: string):
  | Readonly<{ readonly state: "present"; readonly value: unknown }>
  | Readonly<{ readonly state: "absent" | "invalid" }> {
  let current: unknown = sourceValue;
  for (const segment of fieldPath.split(".")) {
    if (typeof current !== "object" || current === null || Array.isArray(current)) return { state: "invalid" };
    const descriptor = Object.getOwnPropertyDescriptor(current, segment);
    if (descriptor === undefined) return { state: "absent" };
    if (!("value" in descriptor)) return { state: "invalid" };
    current = descriptor.value;
  }
  return { state: "present", value: current };
}

async function presentationProfiles(): Promise<readonly Profile[]> {
  const manifest = JSON.parse(await source("../application/submission-presentations.json")) as {
    readonly version: number;
    readonly presentations: readonly Profile[];
  };
  expect(manifest.version).toBe(1);
  expect(Object.keys(manifest).sort()).toEqual(["presentations", "version"]);
  return manifest.presentations;
}

function source(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}
