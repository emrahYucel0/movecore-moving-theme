<script setup lang="ts">
import type { MovingHomeHeroViewModel } from "~~/shared/content/moving-home";
import PublicActionLink from "../PublicActionLink.vue";

defineProps<{
  readonly hero: MovingHomeHeroViewModel;
}>();
</script>

<template>
  <header class="moving-hero">
    <div class="moving-hero__copy">
      <p v-if="hero.eyebrow" class="moving-kicker">
        {{ hero.eyebrow }}
      </p>
      <h1 id="moving-home-title" class="moving-hero__title">
        {{ hero.title }}
      </h1>
      <p class="moving-hero__intro">
        {{ hero.intro }}
      </p>
      <div class="moving-actions" aria-label="Homepage actions">
        <PublicActionLink :action="hero.primaryAction" />
        <PublicActionLink
          v-if="hero.secondaryAction"
          :action="hero.secondaryAction"
        />
      </div>
    </div>
    <figure class="moving-hero__media">
      <img
        :src="hero.media.publicUrl"
        :alt="hero.media.alt"
        :width="hero.media.width"
        :height="hero.media.height"
        class="moving-media-image"
        decoding="async"
        fetchpriority="high"
      >
    </figure>
  </header>
</template>
