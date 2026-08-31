<script setup lang="ts">
import type { MovingHomeViewModel } from "~~/shared/content/moving-home";
import PublicActionLink from "./PublicActionLink.vue";

defineProps<{
  readonly page: MovingHomeViewModel;
}>();
</script>

<template>
  <main class="theme-main">
    <article aria-labelledby="moving-home-title" class="theme-page moving-home">
      <header class="theme-hero theme-hero--with-media moving-home__hero">
        <div class="theme-hero__copy">
          <p v-if="page.hero.eyebrow" class="theme-eyebrow">
            {{ page.hero.eyebrow }}
          </p>
          <h1 id="moving-home-title" class="theme-title">
            {{ page.hero.title }}
          </h1>
          <p class="theme-intro">
            {{ page.hero.intro }}
          </p>
          <div class="moving-actions" aria-label="Homepage actions">
            <PublicActionLink :action="page.hero.primaryAction" />
            <PublicActionLink
              v-if="page.hero.secondaryAction"
              :action="page.hero.secondaryAction"
            />
          </div>
        </div>
        <figure class="theme-hero__media">
          <img
            :src="page.hero.media.publicUrl"
            :alt="page.hero.media.alt"
            :width="page.hero.media.width"
            :height="page.hero.media.height"
            class="theme-media-image"
            decoding="async"
            fetchpriority="high"
          >
        </figure>
      </header>

      <ul class="moving-proof" aria-label="Service proof">
        <li v-for="item in page.proof" :key="`${item.value}:${item.label}`">
          <strong>{{ item.value }}</strong>
          <span>{{ item.label }}</span>
        </li>
      </ul>

      <section class="moving-home__section" aria-labelledby="moving-services-title">
        <p v-if="page.services.eyebrow" class="theme-eyebrow">
          {{ page.services.eyebrow }}
        </p>
        <h2 id="moving-services-title" class="theme-section__title">
          {{ page.services.title }}
        </h2>
        <p v-if="page.services.intro" class="theme-section__body">
          {{ page.services.intro }}
        </p>
        <ul class="moving-summary-list">
          <li v-for="service in page.services.items" :key="`${service.href}:${service.title}`">
            <h3><PublicActionLink :action="{ label: service.title, href: service.href }" /></h3>
            <p>{{ service.description }}</p>
          </li>
        </ul>
      </section>

      <section class="moving-home__section" aria-labelledby="moving-process-title">
        <p v-if="page.process.eyebrow" class="theme-eyebrow">
          {{ page.process.eyebrow }}
        </p>
        <h2 id="moving-process-title" class="theme-section__title">
          {{ page.process.title }}
        </h2>
        <p v-if="page.process.intro" class="theme-section__body">
          {{ page.process.intro }}
        </p>
        <ol class="moving-process">
          <li v-for="step in page.process.steps" :key="step.title">
            <h3>{{ step.title }}</h3>
            <p>{{ step.description }}</p>
          </li>
        </ol>
      </section>

      <section class="moving-home__section moving-assurance" aria-labelledby="moving-assurance-title">
        <div>
          <p v-if="page.assurance.eyebrow" class="theme-eyebrow">
            {{ page.assurance.eyebrow }}
          </p>
          <h2 id="moving-assurance-title" class="theme-section__title">
            {{ page.assurance.title }}
          </h2>
          <p class="theme-section__body">
            {{ page.assurance.body }}
          </p>
          <ul class="moving-point-list">
            <li v-for="point in page.assurance.points" :key="point">
              {{ point }}
            </li>
          </ul>
        </div>
        <figure v-if="page.assurance.media" class="theme-section__media">
          <img
            :src="page.assurance.media.publicUrl"
            :alt="page.assurance.media.alt"
            :width="page.assurance.media.width"
            :height="page.assurance.media.height"
            class="theme-media-image"
            loading="lazy"
            decoding="async"
          >
        </figure>
      </section>

      <section class="moving-home__section" aria-labelledby="moving-areas-title">
        <p v-if="page.serviceAreas.eyebrow" class="theme-eyebrow">
          {{ page.serviceAreas.eyebrow }}
        </p>
        <h2 id="moving-areas-title" class="theme-section__title">
          {{ page.serviceAreas.title }}
        </h2>
        <p v-if="page.serviceAreas.intro" class="theme-section__body">
          {{ page.serviceAreas.intro }}
        </p>
        <ul class="moving-area-list">
          <li v-for="area in page.serviceAreas.areas" :key="`${area.href}:${area.label}`">
            <PublicActionLink :action="area" />
          </li>
        </ul>
      </section>

      <section class="moving-home__section moving-final-action" aria-labelledby="moving-final-action-title">
        <p v-if="page.finalAction.eyebrow" class="theme-eyebrow">
          {{ page.finalAction.eyebrow }}
        </p>
        <h2 id="moving-final-action-title" class="theme-section__title">
          {{ page.finalAction.title }}
        </h2>
        <p v-if="page.finalAction.body" class="theme-section__body">
          {{ page.finalAction.body }}
        </p>
        <div class="moving-actions" aria-label="Final actions">
          <PublicActionLink :action="page.finalAction.primaryAction" />
          <PublicActionLink
            v-if="page.finalAction.secondaryAction"
            :action="page.finalAction.secondaryAction"
          />
        </div>
      </section>
    </article>
  </main>
</template>
