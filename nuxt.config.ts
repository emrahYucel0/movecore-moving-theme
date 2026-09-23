import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2026-08-30",
  ssr: true,
  app: {
    head: {
      htmlAttrs: { lang: "en" },
      link: [
        // The display face is only discoverable after theme.css parses, which
        // costs a whole extra round trip on a slow connection and delays first
        // paint. Preloading the Latin subset lets it travel with the stylesheet.
        // Latin Extended stays unpreloaded: pages that need it are the
        // exception, and it would otherwise be paid for on every page.
        {
          rel: "preload",
          as: "font",
          type: "font/woff2",
          href: "/fonts/archivo-narrow-latin.woff2",
          crossorigin: "anonymous",
        },
      ],
    },
  },
  devtools: { enabled: false },
  features: { noScripts: "production" },
  runtimeConfig: {
    coreBaseUrl: "",
    coreRequestTimeoutMs: 5_000,
    corePrimaryNavigationId: "",
    coreFooterNavigationId: "",
    coreSiteSettingNamespace: "",
    coreSiteSettingKey: "",
    movingSubmissionClientIdentitySecret: "",
    coreSubmissionUpstreamSecret: "",
    public: {
      siteUrl: "",
    },
  },
  css: ["~/assets/css/main.css", "~/assets/css/theme.css"],
  typescript: {
    strict: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
