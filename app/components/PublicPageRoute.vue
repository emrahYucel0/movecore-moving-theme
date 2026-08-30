<script setup lang="ts">
import SitePageRenderer from "./content/SitePageRenderer.vue";

const page = await useCorePublicPage();
if (page !== undefined) usePublicPageSeo(page);
</script>

<template>
  <SitePageRenderer v-if="page" :page="page.content" />
</template>
