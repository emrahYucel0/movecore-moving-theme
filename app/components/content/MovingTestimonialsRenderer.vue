<script setup lang="ts">
import type { MovingTestimonialsViewModel } from "~~/shared/content/moving-testimonials";
import MovingFinalAction from "./moving-home/MovingFinalAction.vue";
import MovingCollectionHero from "./moving-commercial/MovingCollectionHero.vue";

defineProps<{ readonly page: MovingTestimonialsViewModel }>();
</script>

<template>
  <main class="theme-main">
    <article class="theme-page moving-collection moving-testimonials-page" aria-labelledby="moving-testimonials-page-title">
      <MovingCollectionHero :hero="page.hero" title-id="moving-testimonials-page-title" />
      <section class="moving-collection-section moving-testimonials-showcase" aria-labelledby="testimonials-showcase-title">
        <h2 id="testimonials-showcase-title" class="moving-section-title">Moving experiences in their own words</h2>
        <blockquote class="moving-testimonial moving-testimonial--featured">
          <p>{{ page.featured.quote }}</p>
          <footer>
            <strong>{{ page.featured.customerName }}</strong>
            <span v-if="page.featured.context">{{ page.featured.context }}</span>
            <span v-if="page.featured.serviceLabel">{{ page.featured.serviceLabel }}</span>
          </footer>
        </blockquote>
        <div class="moving-testimonial-support">
          <blockquote v-for="item in page.items" :key="`${item.customerName}:${item.quote}`" class="moving-testimonial">
            <p>{{ item.quote }}</p>
            <footer>
              <strong>{{ item.customerName }}</strong>
              <span v-if="item.context">{{ item.context }}</span>
              <span v-if="item.serviceLabel">{{ item.serviceLabel }}</span>
            </footer>
          </blockquote>
        </div>
      </section>
      <MovingFinalAction :section="page.finalAction" />
    </article>
  </main>
</template>
