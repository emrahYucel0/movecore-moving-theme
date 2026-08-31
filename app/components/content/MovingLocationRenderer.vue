<script setup lang="ts">
import type { MovingLocationViewModel } from "~~/shared/content/moving-location";
import MovingFinalAction from "./moving-home/MovingFinalAction.vue";
import PublicActionLink from "./PublicActionLink.vue";

defineProps<{
  readonly page: MovingLocationViewModel;
}>();
</script>

<template>
  <main class="theme-main">
    <article class="theme-page moving-inner moving-location" aria-labelledby="moving-location-title">
      <header
        class="moving-inner-hero moving-location-hero"
        :class="{ 'moving-location-hero--without-media': page.hero.media === undefined }"
      >
        <div class="moving-inner-hero__copy">
          <p v-if="page.hero.eyebrow" class="moving-kicker">{{ page.hero.eyebrow }}</p>
          <h1 id="moving-location-title" class="moving-inner-hero__title">{{ page.hero.title }}</h1>
          <p class="moving-inner-hero__intro">{{ page.hero.intro }}</p>
        </div>
        <figure v-if="page.hero.media" class="moving-inner-hero__media moving-location-hero__media">
          <img
            :src="page.hero.media.publicUrl"
            :alt="page.hero.media.alt"
            :width="page.hero.media.width"
            :height="page.hero.media.height"
            class="moving-media-image"
            loading="eager"
            decoding="async"
            fetchpriority="high"
          >
        </figure>
      </header>

      <section class="moving-inner-section moving-location-overview" aria-labelledby="location-overview-title">
        <div class="moving-inner-section__copy">
          <h2 id="location-overview-title" class="moving-inner-section__title">{{ page.overview.title }}</h2>
          <p class="moving-inner-section__body">{{ page.overview.body }}</p>
        </div>
        <ul class="moving-brief-list" aria-label="Location planning highlights">
          <li v-for="highlight in page.overview.highlights" :key="highlight">{{ highlight }}</li>
        </ul>
      </section>

      <section class="moving-inner-section moving-location-services" aria-labelledby="location-services-title">
        <div class="moving-inner-heading">
          <p v-if="page.services.eyebrow" class="moving-section-label">{{ page.services.eyebrow }}</p>
          <h2 id="location-services-title" class="moving-inner-section__title">{{ page.services.title }}</h2>
          <p v-if="page.services.intro" class="moving-inner-section__intro">{{ page.services.intro }}</p>
        </div>
        <ul class="moving-editorial-links moving-location-service-links">
          <li v-for="item in page.services.items" :key="`${item.href}:${item.title}`">
            <PublicActionLink :action="{ label: item.title, href: item.href }" />
            <p v-if="item.description">{{ item.description }}</p>
          </li>
        </ul>
      </section>

      <section class="moving-inner-section moving-local-details" aria-labelledby="local-details-title">
        <div class="moving-local-details__heading">
          <p v-if="page.localDetails.eyebrow" class="moving-section-label">{{ page.localDetails.eyebrow }}</p>
          <h2 id="local-details-title" class="moving-inner-section__title">{{ page.localDetails.title }}</h2>
          <p class="moving-inner-section__body">{{ page.localDetails.body }}</p>
        </div>
        <ol class="moving-local-detail-list">
          <li v-for="item in page.localDetails.items" :key="item.title">
            <h3>{{ item.title }}</h3>
            <p>{{ item.description }}</p>
          </li>
        </ol>
      </section>

      <section class="moving-inner-section moving-nearby-areas" aria-labelledby="nearby-areas-title">
        <div class="moving-inner-heading">
          <p v-if="page.nearbyAreas.eyebrow" class="moving-section-label">{{ page.nearbyAreas.eyebrow }}</p>
          <h2 id="nearby-areas-title" class="moving-inner-section__title">{{ page.nearbyAreas.title }}</h2>
        </div>
        <ul class="moving-nearby-list">
          <li v-for="item in page.nearbyAreas.items" :key="`${item.href}:${item.label}`">
            <PublicActionLink :action="item" />
          </li>
        </ul>
      </section>

      <MovingFinalAction :section="page.finalAction" />
    </article>
  </main>
</template>
