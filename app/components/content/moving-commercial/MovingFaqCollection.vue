<script setup lang="ts">
import type { MovingFaqSection } from "~~/shared/content/moving-commercial-common";
import PublicActionLink from "../PublicActionLink.vue";

defineProps<{
  readonly section: MovingFaqSection;
  readonly titleId: string;
}>();
</script>

<template>
  <section class="moving-commercial-faq" :aria-labelledby="titleId">
    <div class="moving-commercial-faq__heading">
      <h2 :id="titleId" class="moving-section-title">{{ section.title }}</h2>
      <p v-if="section.intro" class="moving-section-intro">{{ section.intro }}</p>
      <PublicActionLink v-if="section.action" :action="section.action" />
    </div>
    <ol class="moving-faq-list">
      <li v-for="item in section.items" :key="item.question">
        <article>
          <h3>{{ item.question }}</h3>
          <p>{{ item.answer }}</p>
        </article>
      </li>
    </ol>
  </section>
</template>
