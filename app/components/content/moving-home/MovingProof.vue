<script setup lang="ts">
import type { MovingProofItem } from "~~/shared/content/moving-home";

defineProps<{
  readonly items: readonly MovingProofItem[];
}>();
</script>

<template>
  <section class="moving-proof" aria-label="Service proof">
    <ul class="moving-proof__list">
      <li v-for="item in items" :key="`${item.value}:${item.label}`">
        <strong>{{ item.value }}</strong>
        <span>{{ item.label }}</span>
      </li>
    </ul>
  </section>
</template>
