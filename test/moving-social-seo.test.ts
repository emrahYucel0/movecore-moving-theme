import { describe, expect, it } from "vitest";
import {
  businessStructuredData,
  composeMovingSocialMetadata,
  safeAbsoluteHttpUrl,
  serializeJsonLd,
} from "../shared/moving-social-seo";
import type { PublicBusinessIdentity, PublicSiteSeo } from "../shared/site-composition";

const business: PublicBusinessIdentity = {
  companyName: "Example Moving",
  primaryPhone: { display: "+1 202-555-0100", href: "tel:+12025550100" },
  email: { display: "hello@example.test", href: "mailto:hello@example.test" },
  address: "100 Example Avenue",
  openingHours: [{ label: "Monday to Friday", value: "08:00 to 18:00" }],
  socialLinks: [
    { label: "Instagram", href: "https://social.example.test/example" },
    { label: "Invalid", href: "https://user:secret@example.test/private" },
  ],
};

describe("Moving social metadata", () => {
  it("reuses one final SEO presentation and switches card type only for an explicit image", () => {
    expect(composeMovingSocialMetadata({
      title: "Final title",
      description: "Final description.",
      canonicalUrl: "https://public.example.test/articles?after=cursor",
      siteName: "Example Moving",
    })).toEqual({
      ogTitle: "Final title",
      ogDescription: "Final description.",
      ogUrl: "https://public.example.test/articles?after=cursor",
      ogType: "website",
      ogSiteName: "Example Moving",
      twitterCard: "summary",
      twitterTitle: "Final title",
      twitterDescription: "Final description.",
    });

    expect(composeMovingSocialMetadata({
      title: "Final title",
      canonicalUrl: "https://public.example.test/",
      siteName: "Example Moving",
      defaultSocialImageUrl: "https://cdn.example.test/social.jpg",
    })).toMatchObject({
      ogImage: "https://cdn.example.test/social.jpg",
      twitterCard: "summary_large_image",
      twitterImage: "https://cdn.example.test/social.jpg",
    });
  });

  it("projects one conservative stable LocalBusiness identity without guessing hours", () => {
    const seo: PublicSiteSeo = {
      articleArchiveTitle: "Articles",
      articleArchiveDescription: "Description.",
      businessLogoUrl: "https://cdn.example.test/logo.svg",
    };
    expect(businessStructuredData("https://public.example.test", business, seo)).toEqual({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": "https://public.example.test/#business",
      name: "Example Moving",
      url: "https://public.example.test/",
      telephone: "+1 202-555-0100",
      email: "hello@example.test",
      address: "100 Example Avenue",
      logo: "https://cdn.example.test/logo.svg",
      sameAs: ["https://social.example.test/example"],
    });
    expect(businessStructuredData("https://public.example.test/", business, seo))
      .not.toHaveProperty("openingHours");
  });

  it("serializes buyer strings without permitting script termination", () => {
    const hostile = {
      ...business,
      companyName: '</script><script>alert("x")</script> & <Moving>',
      address: 'A "quoted" & <angled> address',
    };
    const source = businessStructuredData("https://public.example.test", hostile, {
      articleArchiveTitle: "Articles",
      articleArchiveDescription: "Description.",
    });
    const serialized = serializeJsonLd(source);
    expect(serialized).not.toContain("</script>");
    expect(serialized).not.toContain("<script>");
    expect(serialized).not.toContain("&");
    expect(JSON.parse(serialized)).toEqual(source);
  });

  it("accepts only absolute credential-free HTTP(S) public URLs", () => {
    expect(safeAbsoluteHttpUrl("https://cdn.example.test/social.jpg"))
      .toBe("https://cdn.example.test/social.jpg");
    for (const unsafe of ["/relative.jpg", "javascript:alert(1)", "https://u:p@example.test/a"])
      expect(safeAbsoluteHttpUrl(unsafe)).toBeUndefined();
  });
});
