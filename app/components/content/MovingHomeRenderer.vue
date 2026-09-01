<script setup lang="ts">
import type { MovingHomeViewModel } from "~~/shared/content/moving-home";
import MovingAssurance from "./moving-home/MovingAssurance.vue";
import MovingFinalAction from "./moving-home/MovingFinalAction.vue";
import MovingHero from "./moving-home/MovingHero.vue";
import MovingProcess from "./moving-home/MovingProcess.vue";
import MovingProof from "./moving-home/MovingProof.vue";
import MovingServiceAreas from "./moving-home/MovingServiceAreas.vue";
import MovingServices from "./moving-home/MovingServices.vue";
import MovingFaqCollection from "./moving-commercial/MovingFaqCollection.vue";
import MovingTestimonialCollection from "./moving-commercial/MovingTestimonialCollection.vue";

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
      <MovingTestimonialCollection
        v-if="page.customerProof"
        :section="page.customerProof"
        title-id="moving-home-customer-proof-title"
      />
      <MovingServiceAreas :section="page.serviceAreas" />
      <MovingFaqCollection
        v-if="page.frequentQuestions"
        :section="page.frequentQuestions"
        title-id="moving-home-faq-title"
      />
      <MovingFinalAction :section="page.finalAction" />
    </article>
  </main>
</template>
