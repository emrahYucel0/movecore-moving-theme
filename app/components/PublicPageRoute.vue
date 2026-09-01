<script setup lang="ts">
import SitePageRenderer from "./content/SitePageRenderer.vue";
import MovingHomeRenderer from "./content/MovingHomeRenderer.vue";
import MovingServiceRenderer from "./content/MovingServiceRenderer.vue";
import MovingLocationRenderer from "./content/MovingLocationRenderer.vue";
import MovingServicesRenderer from "./content/MovingServicesRenderer.vue";
import MovingAreasRenderer from "./content/MovingAreasRenderer.vue";
import MovingFaqRenderer from "./content/MovingFaqRenderer.vue";
import MovingTestimonialsRenderer from "./content/MovingTestimonialsRenderer.vue";

const page = await useCorePublicPage();
if (page !== undefined) usePublicPageSeo(page);
</script>

<template>
  <SitePageRenderer v-if="page?.type === 'site.page'" :page="page.content" />
  <MovingHomeRenderer v-else-if="page?.type === 'moving.home'" :page="page.content" />
  <MovingServiceRenderer v-else-if="page?.type === 'moving.service'" :page="page.content" />
  <MovingLocationRenderer v-else-if="page?.type === 'moving.location'" :page="page.content" />
  <MovingServicesRenderer v-else-if="page?.type === 'moving.services'" :page="page.content" />
  <MovingAreasRenderer v-else-if="page?.type === 'moving.areas'" :page="page.content" />
  <MovingFaqRenderer v-else-if="page?.type === 'moving.faq'" :page="page.content" />
  <MovingTestimonialsRenderer v-else-if="page?.type === 'moving.testimonials'" :page="page.content" />
</template>
