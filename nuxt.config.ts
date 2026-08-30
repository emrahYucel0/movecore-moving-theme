import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2026-08-30",
  ssr: true,
  css: ["~/assets/css/main.css"],
  typescript: {
    strict: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
