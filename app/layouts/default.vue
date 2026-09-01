<script setup lang="ts">
import PublicNavigation from "~/components/PublicNavigation.vue";
import PublicFooter from "~/components/PublicFooter.vue";

const site = await useCorePublicSite();
</script>

<template>
  <div class="theme-shell">
    <PublicNavigation
      :navigation="site.navigation"
      :business="site.business"
    />
    <slot />
    <PublicFooter
      :navigation="site.footerNavigation"
      :business="site.business"
    />
  </div>
</template>
