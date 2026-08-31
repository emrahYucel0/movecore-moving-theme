<script setup lang="ts">
import type { MovingServicesSection } from "~~/shared/content/moving-home";
import PublicActionLink from "../PublicActionLink.vue";

defineProps<{
  readonly section: MovingServicesSection;
}>();
</script>

<template>
  <section class="moving-home__section moving-services" aria-labelledby="moving-services-title">
    <div class="moving-section-heading moving-services__heading">
      <p v-if="section.eyebrow" class="moving-section-label">
        {{ section.eyebrow }}
      </p>
      <h2 id="moving-services-title" class="moving-section-title">
        {{ section.title }}
      </h2>
      <p v-if="section.intro" class="moving-section-intro">
        {{ section.intro }}
      </p>
    </div>
    <ul class="moving-service-index">
      <li v-for="service in section.items" :key="`${service.href}:${service.title}`">
        <h3>
          <PublicActionLink :action="{ label: service.title, href: service.href }" />
        </h3>
        <p>{{ service.description }}</p>
      </li>
    </ul>
  </section>
</template>
