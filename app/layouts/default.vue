<script setup lang="ts">
import PublicNavigation from "~/components/PublicNavigation.vue";

const site = await useCorePublicSite();
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-950">
    <PublicNavigation v-if="site.navigation !== null" :navigation="site.navigation" />
    <slot />
  </div>
</template>
