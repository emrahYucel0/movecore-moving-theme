import type { CorePublicClient } from "../core/client";
import type { PublicMediaObjectProjection, PublicMediaProjection } from "../core/contracts";
import {
  BusinessIdentityContractError,
  parseBusinessIdentity,
  type BusinessIdentity,
} from "../../shared/business-identity";
import type {
  BusinessLogo,
  PublicBusinessIdentity,
  PublicSiteComposition,
} from "../../shared/site-composition";

export interface PublicSiteSelectors {
  readonly navigationId?: string;
  readonly footerNavigationId?: string;
  readonly settingNamespace?: string;
  readonly settingKey?: string;
}

export type PublicSiteClient = Pick<
  CorePublicClient,
  "getNavigation" | "getSetting" | "getMedia"
>;

export type PublicSiteCompositionErrorKind = "configuration" | "application-data";

export class PublicSiteCompositionError extends Error {
  public readonly kind: PublicSiteCompositionErrorKind;

  public constructor(kind: PublicSiteCompositionErrorKind) {
    super(kind === "configuration"
      ? "The public site composition is not configured."
      : "The public site composition data is invalid.");
    this.name = "PublicSiteCompositionError";
    this.kind = kind;
  }
}

export async function loadPublicSiteComposition(
  selectors: PublicSiteSelectors,
  createClient: () => PublicSiteClient,
): Promise<PublicSiteComposition> {
  const navigationId = requiredSelector(selectors.navigationId);
  const footerNavigationId = optionalSelector(selectors.footerNavigationId);
  const settingNamespace = requiredSelector(selectors.settingNamespace);
  const settingKey = requiredSelector(selectors.settingKey);
  const client = createClient();

  const [navigation, footerNavigationResult, setting] = await Promise.all([
    client.getNavigation(navigationId),
    footerNavigationId === undefined || footerNavigationId === navigationId
      ? Promise.resolve(undefined)
      : client.getNavigation(footerNavigationId),
    client.getSetting(settingNamespace, settingKey),
  ]);
  if (navigation === null || navigation.id !== navigationId || setting === null ||
    setting.namespace !== settingNamespace || setting.key !== settingKey) {
    throw applicationDataError();
  }
  if (footerNavigationId !== undefined && footerNavigationId !== navigationId &&
    (footerNavigationResult === null || footerNavigationResult?.id !== footerNavigationId)) {
    throw applicationDataError();
  }

  let identity: BusinessIdentity;
  try {
    identity = parseBusinessIdentity(setting.value);
  } catch (error: unknown) {
    if (error instanceof BusinessIdentityContractError) throw applicationDataError();
    throw error;
  }

  const logo = identity.logoAssetId === undefined
    ? undefined
    : await resolveLogo(identity, client);
  return Object.freeze({
    business: businessView(identity, logo),
    navigation,
    footerNavigation: footerNavigationResult ?? navigation,
  });
}

async function resolveLogo(
  identity: BusinessIdentity,
  client: PublicSiteClient,
): Promise<BusinessLogo> {
  const assetId = identity.logoAssetId;
  if (assetId === undefined) throw applicationDataError();
  const media = await client.getMedia(assetId);
  if (media === null || media.kind !== "image" || media.assetId !== assetId) {
    throw applicationDataError();
  }
  return logoView(identity.companyName, media);
}

function logoView(companyName: string, media: PublicMediaProjection): BusinessLogo {
  return Object.freeze({
    assetId: media.assetId,
    publicUrl: media.original.publicUrl,
    alt: `${companyName} logo`,
    ...imageDimensions(media.original),
  });
}

function imageDimensions(
  original: PublicMediaObjectProjection,
): Readonly<{ readonly width?: number; readonly height?: number }> {
  return original.width === undefined || original.height === undefined
    ? Object.freeze({})
    : Object.freeze({ width: original.width, height: original.height });
}

function businessView(identity: BusinessIdentity, logo: BusinessLogo | undefined): PublicBusinessIdentity {
  return Object.freeze({
    companyName: identity.companyName,
    ...(logo === undefined ? {} : { logo }),
    primaryPhone: identity.primaryPhone,
    ...(identity.whatsapp === undefined ? {} : { whatsapp: identity.whatsapp }),
    ...(identity.email === undefined ? {} : { email: identity.email }),
    ...(identity.address === undefined ? {} : { address: identity.address }),
    openingHours: identity.openingHours,
    socialLinks: identity.socialLinks,
  });
}

function requiredSelector(value: string | undefined): string {
  const selector = optionalSelector(value);
  if (selector === undefined) throw new PublicSiteCompositionError("configuration");
  return selector;
}

function optionalSelector(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}

function applicationDataError(): PublicSiteCompositionError {
  return new PublicSiteCompositionError("application-data");
}
