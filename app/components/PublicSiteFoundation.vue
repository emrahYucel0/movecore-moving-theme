<script setup lang="ts">
import type {
  PublicSiteMedia,
  PublicSiteSetting,
} from "~~/shared/site-composition";

const props = defineProps<{
  readonly setting: PublicSiteSetting | null;
  readonly media: PublicSiteMedia | null;
}>();

const settingJson = computed(() => props.setting === null
  ? ""
  : JSON.stringify(props.setting.value, null, 2) ?? "null");
</script>

<template>
  <aside
    v-if="setting !== null || media !== null"
    aria-label="Public foundation resources"
    class="mx-auto grid w-full max-w-4xl gap-6 px-6 pb-12 sm:grid-cols-2"
  >
    <details v-if="setting !== null" class="rounded-lg border border-slate-200 bg-white p-5">
      <summary class="cursor-pointer font-semibold">Core public setting</summary>
      <p class="mt-3 text-sm text-slate-600">
        {{ setting.namespace }}/{{ setting.key }}
      </p>
      <pre class="mt-3 overflow-x-auto rounded bg-slate-950 p-4 text-sm text-slate-100"><code>{{ settingJson }}</code></pre>
    </details>

    <section
      v-if="media !== null"
      aria-labelledby="foundation-media-title"
      class="rounded-lg border border-slate-200 bg-white p-5"
    >
      <h2 id="foundation-media-title" class="font-semibold">Core public media</h2>
      <img
        v-if="media.kind === 'image'"
        :src="media.original.publicUrl"
        :width="media.original.width"
        :height="media.original.height"
        alt=""
        class="mt-4 h-auto max-w-full"
      >
      <p v-else class="mt-3 text-sm text-slate-600">
        {{ media.kind }} · {{ media.assetId }}
      </p>
    </section>
  </aside>
</template>
