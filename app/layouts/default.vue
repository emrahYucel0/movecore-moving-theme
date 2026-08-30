<script setup lang="ts">
import PublicNavigation from "~/components/PublicNavigation.vue";

const site = await useCorePublicSite();
const brandLabel = publicBrandLabel(site.setting?.value);

function publicBrandLabel(value: unknown): string {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return "MoveCore Moving";
  }
  const name = (value as Readonly<Record<string, unknown>>)["name"];
  if (typeof name !== "string") return "MoveCore Moving";
  const trimmed = name.trim();
  return trimmed.length === 0 || trimmed.length > 80 ? "MoveCore Moving" : trimmed;
}
</script>

<template>
  <div class="theme-shell">
    <PublicNavigation
      v-if="site.navigation !== null"
      :navigation="site.navigation"
      :brand-label="brandLabel"
    />
    <slot />
  </div>
</template>
