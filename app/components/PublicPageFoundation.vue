<script setup lang="ts">
import type { PageRouteResult } from "~~/shared/page-route";

type PublicPage = Extract<PageRouteResult, { readonly kind: "page" }>[
  "page"
];

const props = defineProps<{
  readonly page: PublicPage;
}>();

const payloadJson = computed(() => JSON.stringify(props.page.content.payload, null, 2) ?? "null");
</script>

<template>
  <main class="mx-auto w-full max-w-4xl px-6 py-16">
    <article aria-labelledby="page-title" class="space-y-8">
      <header class="space-y-3">
        <p class="text-sm font-semibold uppercase tracking-wider text-slate-600">
          Core CMS public content
        </p>
        <h1 id="page-title" class="text-4xl font-bold tracking-tight">
          Core CMS content
        </h1>
        <p class="max-w-2xl leading-7 text-slate-700">
          This neutral foundation view proves that a published Core page reached Nuxt SSR.
        </p>
      </header>

      <dl class="grid gap-5 rounded-lg border border-slate-200 bg-white p-6 sm:grid-cols-3">
        <div>
          <dt class="text-sm font-medium text-slate-600">Content type</dt>
          <dd class="mt-1 break-words font-mono text-sm">{{ page.content.type }}</dd>
        </div>
        <div>
          <dt class="text-sm font-medium text-slate-600">Content ID</dt>
          <dd class="mt-1 break-words font-mono text-sm">{{ page.content.contentId }}</dd>
        </div>
        <div>
          <dt class="text-sm font-medium text-slate-600">Published</dt>
          <dd class="mt-1 break-words text-sm">
            <time :datetime="page.content.publishedAt">{{ page.content.publishedAt }}</time>
          </dd>
        </div>
      </dl>

      <section aria-labelledby="payload-title" class="space-y-3">
        <h2 id="payload-title" class="text-xl font-semibold">Public JSON payload</h2>
        <pre class="overflow-x-auto rounded-lg bg-slate-950 p-6 text-sm leading-6 text-slate-100"><code>{{ payloadJson }}</code></pre>
      </section>
    </article>
  </main>
</template>
