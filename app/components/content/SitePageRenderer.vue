<script setup lang="ts">
import type { SitePageViewModel } from "~~/shared/content/site-page";

defineProps<{
  readonly page: SitePageViewModel;
}>();
</script>

<template>
  <main class="mx-auto w-full max-w-5xl px-6 py-12 sm:py-16">
    <article aria-labelledby="site-page-title" class="space-y-12">
      <header class="space-y-5">
        <p
          v-if="page.eyebrow"
          class="text-sm font-semibold uppercase tracking-wider text-slate-600"
        >
          {{ page.eyebrow }}
        </p>
        <h1 id="site-page-title" class="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">
          {{ page.title }}
        </h1>
        <p v-if="page.intro" class="max-w-3xl whitespace-pre-line text-lg leading-8 text-slate-700">
          {{ page.intro }}
        </p>
        <img
          v-if="page.heroMedia"
          :src="page.heroMedia.publicUrl"
          :alt="page.heroMedia.alt"
          :width="page.heroMedia.width"
          :height="page.heroMedia.height"
          class="h-auto w-full rounded-lg object-cover"
        >
      </header>

      <div v-if="page.sections.length > 0" class="space-y-12">
        <section
          v-for="(section, index) in page.sections"
          :key="`${index}:${section.heading}`"
          class="space-y-4 border-t border-slate-200 pt-8"
        >
          <h2 class="text-2xl font-semibold tracking-tight">
            {{ section.heading }}
          </h2>
          <p v-if="section.body" class="max-w-3xl whitespace-pre-line leading-7 text-slate-700">
            {{ section.body }}
          </p>
          <img
            v-if="section.media"
            :src="section.media.publicUrl"
            :alt="section.media.alt"
            :width="section.media.width"
            :height="section.media.height"
            loading="lazy"
            class="h-auto max-w-full rounded-lg"
          >
        </section>
      </div>
    </article>
  </main>
</template>
