<script setup lang="ts">
import type { PublicSiteNavigationItem } from "~~/shared/site-composition";

defineOptions({ name: "PublicNavigationTree" });
defineProps<{
  readonly items: readonly PublicSiteNavigationItem[];
}>();
</script>

<template>
  <ul class="space-y-2">
    <li v-for="item in items" :key="item.id">
      <NuxtLink
        v-if="item.destination.kind === 'internal'"
        :to="item.destination.path"
        class="underline-offset-4 hover:underline"
      >
        {{ item.label }}
      </NuxtLink>
      <a
        v-else
        :href="item.destination.url"
        class="underline-offset-4 hover:underline"
      >
        {{ item.label }}
      </a>
      <PublicNavigationTree
        v-if="item.children.length > 0"
        :items="item.children"
        class="mt-2 border-l border-slate-300 pl-4"
      />
    </li>
  </ul>
</template>
