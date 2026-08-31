<script setup lang="ts">
import type { MovingAssuranceViewModel } from "~~/shared/content/moving-home";

defineProps<{
  readonly section: MovingAssuranceViewModel;
}>();
</script>

<template>
  <section class="moving-home__section moving-assurance" aria-labelledby="moving-assurance-title">
    <div class="moving-assurance__copy">
      <p v-if="section.eyebrow" class="moving-kicker">
        {{ section.eyebrow }}
      </p>
      <h2 id="moving-assurance-title" class="moving-section-title">
        {{ section.title }}
      </h2>
      <p class="moving-section-intro">
        {{ section.body }}
      </p>
      <ul class="moving-point-list">
        <li v-for="point in section.points" :key="point">
          {{ point }}
        </li>
      </ul>
    </div>
    <figure v-if="section.media" class="moving-assurance__media">
      <img
        :src="section.media.publicUrl"
        :alt="section.media.alt"
        :width="section.media.width"
        :height="section.media.height"
        class="moving-media-image"
        loading="lazy"
        decoding="async"
      >
    </figure>
  </section>
</template>
