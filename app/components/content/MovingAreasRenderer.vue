<script setup lang="ts">
import type { MovingAreasViewModel } from "~~/shared/content/moving-areas";
import MovingFinalAction from "./moving-home/MovingFinalAction.vue";
import MovingCollectionHero from "./moving-commercial/MovingCollectionHero.vue";
import PublicActionLink from "./PublicActionLink.vue";

defineProps<{ readonly page: MovingAreasViewModel }>();
</script>

<template>
  <main class="theme-main">
    <article class="theme-page moving-collection moving-areas-index" aria-labelledby="moving-areas-page-title">
      <MovingCollectionHero :hero="page.hero" title-id="moving-areas-page-title" />

      <section class="moving-collection-section moving-area-coverage" aria-labelledby="area-coverage-title">
        <div class="moving-collection-heading">
          <h2 id="area-coverage-title" class="moving-section-title">{{ page.coverage.title }}</h2>
          <p class="moving-section-intro">{{ page.coverage.body }}</p>
        </div>
        <ol class="moving-area-directory">
          <li v-for="area in page.coverage.items" :key="area.href">
            <h3><PublicActionLink :action="{ label: area.title, href: area.href }" /></h3>
            <p>{{ area.description }}</p>
          </li>
        </ol>
      </section>

      <section class="moving-collection-section moving-area-planning" aria-labelledby="area-planning-title">
        <div class="moving-area-planning__copy">
          <h2 id="area-planning-title" class="moving-section-title">{{ page.planning.title }}</h2>
          <p>{{ page.planning.body }}</p>
        </div>
        <ul class="moving-collection-points">
          <li v-for="point in page.planning.points" :key="point">{{ point }}</li>
        </ul>
      </section>

      <MovingFinalAction :section="page.finalAction" />
    </article>
  </main>
</template>
