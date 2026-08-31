<script setup lang="ts">
import type { MovingActionSection } from "~~/shared/content/moving-common";
import PublicActionLink from "../PublicActionLink.vue";

defineProps<{
  readonly section: MovingActionSection;
}>();
</script>

<template>
  <section class="moving-final-action" aria-labelledby="moving-final-action-title">
    <div class="moving-final-action__copy">
      <p v-if="section.eyebrow" class="moving-final-action__label">
        {{ section.eyebrow }}
      </p>
      <h2 id="moving-final-action-title" class="moving-final-action__title">
        {{ section.title }}
      </h2>
      <p v-if="section.body" class="moving-final-action__body">
        {{ section.body }}
      </p>
    </div>
    <div class="moving-actions moving-final-action__actions" aria-label="Final actions">
      <PublicActionLink :action="section.primaryAction" />
      <PublicActionLink
        v-if="section.secondaryAction"
        :action="section.secondaryAction"
      />
    </div>
  </section>
</template>
