<script setup lang="ts">
import type { PublicSiteNavigation } from "~~/shared/site-composition";
import PublicNavigationTree from "./PublicNavigationTree.vue";

defineProps<{
  readonly navigation: PublicSiteNavigation;
}>();
</script>

<template>
  <nav aria-label="Primary navigation" class="mx-auto w-full max-w-4xl px-6 py-6">
    <PublicNavigationTree :items="navigation.items" />
  </nav>
</template>
