<script setup lang="ts">
import type { MovingFaqViewModel } from "~~/shared/content/moving-faq";
import MovingFinalAction from "./moving-home/MovingFinalAction.vue";
import MovingCollectionHero from "./moving-commercial/MovingCollectionHero.vue";

defineProps<{ readonly page: MovingFaqViewModel }>();
</script>

<template>
  <main class="theme-main">
    <article class="theme-page moving-collection moving-faq-page" aria-labelledby="moving-faq-page-title">
      <MovingCollectionHero :hero="page.hero" title-id="moving-faq-page-title" />
      <section class="moving-collection-section moving-faq-page__questions" aria-labelledby="moving-faq-list-title">
        <h2 id="moving-faq-list-title" class="moving-section-title">Questions and practical answers</h2>
        <ol class="moving-faq-list">
          <li v-for="item in page.items" :key="item.question">
            <article>
              <h3>{{ item.question }}</h3>
              <p>{{ item.answer }}</p>
            </article>
          </li>
        </ol>
      </section>
      <MovingFinalAction :section="page.finalAction" />
    </article>
  </main>
</template>
