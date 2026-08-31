<script setup lang="ts">
import type { MovingServiceViewModel } from "~~/shared/content/moving-service";
import MovingFinalAction from "./moving-home/MovingFinalAction.vue";
import PublicActionLink from "./PublicActionLink.vue";

defineProps<{
  readonly page: MovingServiceViewModel;
}>();
</script>

<template>
  <main class="theme-main">
    <article class="theme-page moving-inner moving-service" aria-labelledby="moving-service-title">
      <header class="moving-inner-hero moving-service-hero">
        <div class="moving-inner-hero__copy">
          <p v-if="page.hero.eyebrow" class="moving-kicker">{{ page.hero.eyebrow }}</p>
          <h1 id="moving-service-title" class="moving-inner-hero__title">{{ page.hero.title }}</h1>
          <p class="moving-inner-hero__intro">{{ page.hero.intro }}</p>
          <div class="moving-actions">
            <PublicActionLink :action="page.hero.primaryAction" />
          </div>
        </div>
        <figure v-if="page.hero.media" class="moving-inner-hero__media">
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

      <section class="moving-inner-section moving-service-overview" aria-labelledby="service-overview-title">
        <div class="moving-inner-section__copy">
          <h2 id="service-overview-title" class="moving-inner-section__title">{{ page.overview.title }}</h2>
          <p class="moving-inner-section__body">{{ page.overview.body }}</p>
        </div>
        <ul class="moving-brief-list" aria-label="Service overview points">
          <li v-for="point in page.overview.points" :key="point">{{ point }}</li>
        </ul>
      </section>

      <section class="moving-inner-section moving-service-included" aria-labelledby="service-included-title">
        <div class="moving-inner-heading">
          <p v-if="page.included.eyebrow" class="moving-section-label">{{ page.included.eyebrow }}</p>
          <h2 id="service-included-title" class="moving-inner-section__title">{{ page.included.title }}</h2>
          <p v-if="page.included.intro" class="moving-inner-section__intro">{{ page.included.intro }}</p>
        </div>
        <ol class="moving-ledger moving-included-list">
          <li v-for="item in page.included.items" :key="item.title">
            <h3>{{ item.title }}</h3>
            <p v-if="item.description">{{ item.description }}</p>
          </li>
        </ol>
      </section>

      <section class="moving-inner-section moving-service-process" aria-labelledby="service-process-title">
        <div class="moving-inner-heading">
          <p v-if="page.process.eyebrow" class="moving-section-label">{{ page.process.eyebrow }}</p>
          <h2 id="service-process-title" class="moving-inner-section__title">{{ page.process.title }}</h2>
          <p v-if="page.process.intro" class="moving-inner-section__intro">{{ page.process.intro }}</p>
        </div>
        <ol class="moving-inner-process">
          <li v-for="step in page.process.steps" :key="step.title">
            <h3>{{ step.title }}</h3>
            <p>{{ step.description }}</p>
          </li>
        </ol>
      </section>

      <section class="moving-inner-section moving-related-services" aria-labelledby="related-services-title">
        <div class="moving-inner-heading">
          <p v-if="page.relatedServices.eyebrow" class="moving-section-label">{{ page.relatedServices.eyebrow }}</p>
          <h2 id="related-services-title" class="moving-inner-section__title">{{ page.relatedServices.title }}</h2>
        </div>
        <ul class="moving-editorial-links">
          <li v-for="item in page.relatedServices.items" :key="`${item.href}:${item.title}`">
            <PublicActionLink :action="{ label: item.title, href: item.href }" />
            <p v-if="item.description">{{ item.description }}</p>
          </li>
        </ul>
      </section>

      <MovingFinalAction :section="page.finalAction" />
    </article>
  </main>
</template>
