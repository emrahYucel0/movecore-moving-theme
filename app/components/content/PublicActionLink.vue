<script setup lang="ts">
import type { ActionLink } from "~~/shared/content/moving-common";

const props = defineProps<{
  readonly action: ActionLink;
}>();

const internal = computed(() => props.action.href.startsWith("/"));
</script>

<template>
  <NuxtLink v-if="internal" :to="action.href" class="moving-action-link">
    {{ action.label }}
  </NuxtLink>
  <a v-else :href="action.href" class="moving-action-link">
    {{ action.label }}
  </a>
</template>
