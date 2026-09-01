<script setup lang="ts">
import type { PublicBusinessIdentity } from "~~/shared/site-composition";

withDefaults(defineProps<{
  readonly business: PublicBusinessIdentity;
  readonly placement?: "header" | "footer";
}>(), { placement: "header" });
</script>

<template>
  <NuxtLink
    :aria-label="`${business.companyName} home`"
    class="theme-brand"
    :class="`theme-brand--${placement}`"
    to="/"
  >
    <img
      v-if="business.logo"
      :src="business.logo.publicUrl"
      :alt="business.logo.alt"
      :width="business.logo.width"
      :height="business.logo.height"
      class="theme-brand__logo"
      :loading="placement === 'footer' ? 'lazy' : 'eager'"
      decoding="async"
    >
    <span v-if="business.logo === undefined" class="theme-brand__label">
      {{ business.companyName }}
    </span>
  </NuxtLink>
</template>
