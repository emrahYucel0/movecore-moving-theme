<script setup lang="ts">
import type { SitePageViewModel } from "~~/shared/content/site-page";

defineProps<{
  readonly page: SitePageViewModel;
}>();
</script>

<template>
  <main class="theme-main">
    <article aria-labelledby="site-page-title" class="theme-page">
      <header class="theme-hero" :class="{ 'theme-hero--with-media': page.heroMedia }">
        <div class="theme-hero__copy">
        <p
          v-if="page.eyebrow"
          class="theme-eyebrow"
        >
          {{ page.eyebrow }}
        </p>
        <h1 id="site-page-title" class="theme-title">
          {{ page.title }}
        </h1>
        <p v-if="page.intro" class="theme-intro">
          {{ page.intro }}
        </p>
        </div>
        <figure v-if="page.heroMedia" class="theme-hero__media">
        <img
          :src="page.heroMedia.publicUrl"
          :alt="page.heroMedia.alt"
          :width="page.heroMedia.width"
          :height="page.heroMedia.height"
          class="theme-media-image"
          decoding="async"
          fetchpriority="high"
        >
        </figure>
      </header>

      <div v-if="page.sections.length > 0" class="theme-sections">
        <section
          v-for="(section, index) in page.sections"
          :key="`${index}:${section.heading}`"
          class="theme-section"
          :class="{
            'theme-section--with-media': section.media,
            'theme-section--reverse': index % 2 === 1,
          }"
        >
          <div class="theme-section__copy">
            <h2 class="theme-section__title">
              {{ section.heading }}
            </h2>
            <p v-if="section.body" class="theme-section__body">
              {{ section.body }}
            </p>
          </div>
          <figure v-if="section.media" class="theme-section__media">
          <img
            :src="section.media.publicUrl"
            :alt="section.media.alt"
            :width="section.media.width"
            :height="section.media.height"
            loading="lazy"
            decoding="async"
            class="theme-media-image"
          >
          </figure>
        </section>
      </div>
    </article>
  </main>
</template>
