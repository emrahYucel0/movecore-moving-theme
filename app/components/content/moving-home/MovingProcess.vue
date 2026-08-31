<script setup lang="ts">
import type { MovingProcessSection } from "~~/shared/content/moving-home";

defineProps<{
  readonly section: MovingProcessSection;
}>();
</script>

<template>
  <section class="moving-home__section moving-process-section" aria-labelledby="moving-process-title">
    <div class="moving-section-heading moving-process-section__heading">
      <p v-if="section.eyebrow" class="moving-section-label">
        {{ section.eyebrow }}
      </p>
      <h2 id="moving-process-title" class="moving-section-title">
        {{ section.title }}
      </h2>
      <p v-if="section.intro" class="moving-section-intro">
        {{ section.intro }}
      </p>
    </div>
    <ol class="moving-process">
      <li v-for="step in section.steps" :key="step.title">
        <h3>{{ step.title }}</h3>
        <p>{{ step.description }}</p>
      </li>
    </ol>
  </section>
</template>
