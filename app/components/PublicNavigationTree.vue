<script setup lang="ts">
import type { PublicSiteNavigationItem } from "~~/shared/site-composition";

defineOptions({ name: "PublicNavigationTree" });
defineProps<{
  readonly items: readonly PublicSiteNavigationItem[];
  readonly depth: number;
  readonly autofocusFirst?: boolean;
}>();
</script>

<template>
  <ul
    class="theme-nav-list"
    :class="{ 'theme-nav-list--nested': depth > 0 }"
    :data-depth="depth"
  >
    <li v-for="(item, index) in items" :key="item.id" class="theme-nav-item">
      <NuxtLink
        v-if="item.destination.kind === 'internal'"
        :to="item.destination.path"
        class="theme-nav-link"
        :autofocus="autofocusFirst === true && depth === 0 && index === 0"
      >
        {{ item.label }}
      </NuxtLink>
      <a
        v-else
        :href="item.destination.url"
        class="theme-nav-link"
        :autofocus="autofocusFirst === true && depth === 0 && index === 0"
      >
        {{ item.label }}
      </a>
      <PublicNavigationTree
        v-if="item.children.length > 0"
        :items="item.children"
        :depth="depth + 1"
        :autofocus-first="false"
      />
    </li>
  </ul>
</template>
