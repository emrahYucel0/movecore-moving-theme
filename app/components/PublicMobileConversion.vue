<script setup lang="ts">
import type { PublicBusinessIdentity } from "~~/shared/site-composition";

defineProps<{
  readonly business: PublicBusinessIdentity;
}>();
</script>

<template>
  <nav class="theme-mobile-conversion" aria-label="Contact the moving team">
    <a
      class="theme-mobile-conversion__action theme-mobile-conversion__action--call"
      :href="business.primaryPhone.href"
    >
      <span>Call</span>
      <strong>{{ business.primaryPhone.display }}</strong>
    </a>
    <NuxtLink
      class="theme-mobile-conversion__action theme-mobile-conversion__action--quote"
      to="/quote"
    >
      <span>Plan a move</span>
      <strong>Get a quote</strong>
    </NuxtLink>
  </nav>
</template>
