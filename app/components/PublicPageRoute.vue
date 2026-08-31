<script setup lang="ts">
import SitePageRenderer from "./content/SitePageRenderer.vue";
import MovingHomeRenderer from "./content/MovingHomeRenderer.vue";

const page = await useCorePublicPage();
if (page !== undefined) usePublicPageSeo(page);
</script>

<template>
  <SitePageRenderer v-if="page?.type === 'site.page'" :page="page.content" />
  <MovingHomeRenderer v-else-if="page?.type === 'moving.home'" :page="page.content" />
</template>
