<script setup lang="ts">
import type { MovingHomeViewModel } from "~~/shared/content/moving-home";
import MovingAssurance from "./moving-home/MovingAssurance.vue";
import MovingFinalAction from "./moving-home/MovingFinalAction.vue";
import MovingHero from "./moving-home/MovingHero.vue";
import MovingProcess from "./moving-home/MovingProcess.vue";
import MovingProof from "./moving-home/MovingProof.vue";
import MovingServiceAreas from "./moving-home/MovingServiceAreas.vue";
import MovingServices from "./moving-home/MovingServices.vue";

defineProps<{
  readonly page: MovingHomeViewModel;
}>();
</script>

<template>
  <main class="theme-main">
    <article aria-labelledby="moving-home-title" class="theme-page moving-home">
      <MovingHero :hero="page.hero" />
      <MovingProof :items="page.proof" />
      <MovingServices :section="page.services" />
      <MovingProcess :section="page.process" />
      <MovingAssurance :section="page.assurance" />
      <MovingServiceAreas :section="page.serviceAreas" />
      <MovingFinalAction :section="page.finalAction" />
    </article>
  </main>
</template>
