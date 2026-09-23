<script setup lang="ts">
import type { MovingServiceAreasSection } from "~~/shared/content/moving-home";
import PublicActionLink from "../PublicActionLink.vue";

defineProps<{
  readonly section: MovingServiceAreasSection;
}>();
</script>

<template>
  <section class="moving-home__section moving-service-areas" aria-labelledby="moving-areas-title">
    <div class="moving-service-areas__heading">
      <p v-if="section.eyebrow" class="moving-section-label">
        {{ section.eyebrow }}
      </p>
      <h2 id="moving-areas-title" class="moving-section-title">
        {{ section.title }}
      </h2>
    </div>
    <p v-if="section.intro" class="moving-service-areas__note">
      {{ section.intro }}
    </p>
    <ul class="moving-area-list">
      <li v-for="area in section.areas" :key="`${area.href}:${area.label}`">
        <PublicActionLink :action="area" />
      </li>
    </ul>
  </section>
</template>
