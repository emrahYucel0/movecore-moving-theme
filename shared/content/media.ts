export interface ContentMediaReference {
  readonly assetId: string;
  readonly alt: string;
}

export interface ContentImage {
  readonly assetId: string;
  readonly alt: string;
  readonly publicUrl: string;
  readonly width?: number;
  readonly height?: number;
}

export function projectContentMediaReference(
  source: Readonly<Record<string, unknown>>,
  requiredString: (value: unknown, maximum?: number) => string,
): ContentMediaReference {
  return Object.freeze({
    assetId: requiredString(source["assetId"]),
    alt: requiredString(source["alt"], 200),
  });
}
