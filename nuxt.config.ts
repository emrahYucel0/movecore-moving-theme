import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2026-08-30",
  ssr: true,
  devtools: { enabled: false },
  features: { noScripts: "production" },
  runtimeConfig: {
    coreBaseUrl: "",
    coreRequestTimeoutMs: 5_000,
    corePrimaryNavigationId: "",
    coreFooterNavigationId: "",
    coreSiteSettingNamespace: "",
    coreSiteSettingKey: "",
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
