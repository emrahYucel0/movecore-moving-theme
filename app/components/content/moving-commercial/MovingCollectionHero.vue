<script setup lang="ts">
import type { MovingCollectionHeroViewModel } from "~~/shared/content/moving-commercial-common";

defineProps<{
  readonly hero: MovingCollectionHeroViewModel;
  readonly titleId: string;
}>();
</script>

<template>
  <header
    class="moving-collection-hero"
    :class="{ 'moving-collection-hero--without-media': hero.media === undefined }"
  >
    <div class="moving-collection-hero__copy">
      <p v-if="hero.eyebrow" class="moving-kicker">{{ hero.eyebrow }}</p>
      <h1 :id="titleId" class="moving-collection-hero__title">{{ hero.title }}</h1>
      <p class="moving-collection-hero__intro">{{ hero.intro }}</p>
    </div>
    <figure v-if="hero.media" class="moving-collection-hero__media">
      <img
        :src="hero.media.publicUrl"
        :alt="hero.media.alt"
        :width="hero.media.width"
        :height="hero.media.height"
        class="moving-media-image"
        loading="eager"
        decoding="async"
        fetchpriority="high"
      >
    </figure>
  </header>
</template>
