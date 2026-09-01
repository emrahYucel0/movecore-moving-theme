<script setup lang="ts">
import type { MovingTestimonialSection } from "~~/shared/content/moving-commercial-common";
import PublicActionLink from "../PublicActionLink.vue";

defineProps<{
  readonly section: MovingTestimonialSection;
  readonly titleId: string;
}>();
</script>

<template>
  <section class="moving-commercial-testimonials" :aria-labelledby="titleId">
    <div class="moving-commercial-testimonials__heading">
      <h2 :id="titleId" class="moving-section-title">{{ section.title }}</h2>
      <p v-if="section.intro" class="moving-section-intro">{{ section.intro }}</p>
      <PublicActionLink v-if="section.action" :action="section.action" />
    </div>
    <blockquote class="moving-testimonial moving-testimonial--featured">
      <p>{{ section.featured.quote }}</p>
      <footer>
        <strong>{{ section.featured.customerName }}</strong>
        <span v-if="section.featured.context">{{ section.featured.context }}</span>
        <span v-if="section.featured.serviceLabel">{{ section.featured.serviceLabel }}</span>
      </footer>
    </blockquote>
    <div class="moving-testimonial-support">
      <blockquote
        v-for="item in section.items"
        :key="`${item.customerName}:${item.quote}`"
        class="moving-testimonial"
      >
        <p>{{ item.quote }}</p>
        <footer>
          <strong>{{ item.customerName }}</strong>
          <span v-if="item.context">{{ item.context }}</span>
          <span v-if="item.serviceLabel">{{ item.serviceLabel }}</span>
        </footer>
      </blockquote>
    </div>
  </section>
</template>
