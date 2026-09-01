<script setup lang="ts">
import type { MovingServicesViewModel } from "~~/shared/content/moving-services";
import MovingFinalAction from "./moving-home/MovingFinalAction.vue";
import MovingCollectionHero from "./moving-commercial/MovingCollectionHero.vue";
import PublicActionLink from "./PublicActionLink.vue";

defineProps<{ readonly page: MovingServicesViewModel }>();
</script>

<template>
  <main class="theme-main">
    <article class="theme-page moving-collection moving-services-index" aria-labelledby="moving-services-page-title">
      <MovingCollectionHero :hero="page.hero" title-id="moving-services-page-title" />

      <section class="moving-collection-section moving-services-portfolio" aria-labelledby="services-portfolio-title">
        <div class="moving-collection-heading">
          <h2 id="services-portfolio-title" class="moving-section-title">{{ page.portfolio.title }}</h2>
          <p v-if="page.portfolio.intro" class="moving-section-intro">{{ page.portfolio.intro }}</p>
        </div>
        <ol class="moving-portfolio-list">
          <li v-for="service in page.portfolio.items" :key="service.href">
            <div class="moving-portfolio-list__copy">
              <h3><PublicActionLink :action="{ label: service.title, href: service.href }" /></h3>
              <p>{{ service.description }}</p>
            </div>
            <img
              v-if="service.media"
              :src="service.media.publicUrl"
              :alt="service.media.alt"
              :width="service.media.width"
              :height="service.media.height"
              class="moving-portfolio-list__media"
              loading="lazy"
              decoding="async"
            >
          </li>
        </ol>
      </section>

      <section class="moving-collection-section moving-collection-context" aria-labelledby="services-context-title">
        <div>
          <h2 id="services-context-title" class="moving-section-title">{{ page.context.title }}</h2>
          <p class="moving-collection-context__body">{{ page.context.body }}</p>
        </div>
        <ul class="moving-collection-points">
          <li v-for="point in page.context.points" :key="point">{{ point }}</li>
        </ul>
      </section>

      <MovingFinalAction :section="page.finalAction" />
    </article>
  </main>
</template>
