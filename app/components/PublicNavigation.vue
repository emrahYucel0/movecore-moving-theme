<script setup lang="ts">
import type { PublicSiteNavigation } from "~~/shared/site-composition";
import PublicNavigationTree from "./PublicNavigationTree.vue";

defineProps<{
  readonly navigation: PublicSiteNavigation;
  readonly brandLabel: string;
}>();
</script>

<template>
  <header class="theme-header">
    <div class="theme-header__inner">
      <NuxtLink :aria-label="`${brandLabel} home`" class="theme-brand" to="/">
        <span aria-hidden="true" class="theme-brand__mark" />
        <span class="theme-brand__label">{{ brandLabel }}</span>
      </NuxtLink>
      <nav aria-label="Primary navigation" class="theme-navigation">
        <PublicNavigationTree :items="navigation.items" :depth="0" />
      </nav>
    </div>
  </header>
</template>
