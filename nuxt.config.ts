import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2026-08-30",
  ssr: true,
  devtools: { enabled: false },
  runtimeConfig: {
    coreBaseUrl: "",
    coreRequestTimeoutMs: 5_000,
    corePrimaryNavigationId: "",
    coreSiteSettingNamespace: "",
    coreSiteSettingKey: "",
    coreFoundationMediaId: "",
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
