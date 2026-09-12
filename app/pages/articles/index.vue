<script setup lang="ts">
import type { MovingArticleArchivePage } from "~~/server/articles/archive";
import { articleArchiveCanonicalUrl } from "~~/shared/article-archive-seo";
import { formatMovingArticleDate } from "~~/shared/content/moving-article";

definePageMeta({ key: (route) => route.fullPath });

const route = useRoute();
const after = computed(() => typeof route.query.after === "string" ? route.query.after : undefined);
const { data: archive, error } = await useAsyncData(
  () => `moving-article-archive:${after.value ?? "first"}`,
  () => $fetch<MovingArticleArchivePage>("/api/_movecore/articles", {
    query: after.value === undefined ? undefined : { after: after.value },
  }),
  { watch: [after] },
);

if (error.value !== undefined || archive.value === undefined) {
  throw createError({ statusCode: responseStatus(error.value), statusMessage: "Article archive unavailable", fatal: true });
}
const articlePage = archive.value;

const config = useRuntimeConfig();
let canonical: string;
try {
  canonical = articleArchiveCanonicalUrl(config.public.siteUrl, after.value);
} catch {
  throw createError({ statusCode: 503, statusMessage: "Public site configuration unavailable", fatal: true });
}

useSeoMeta({
  title: "Moving articles and practical guides",
  description: "Clear field notes for preparing access, packing well and planning a considered move.",
  robots: "index,follow",
});
useHead({ link: [{ rel: "canonical", href: canonical }] });

function responseStatus(value: unknown): 400 | 500 | 502 | 503 {
  if (typeof value !== "object" || value === null) return 502;
  const record = value as Readonly<Record<string, unknown>>;
  const status = record.statusCode ?? record.status;
  return status === 400 || status === 500 || status === 502 || status === 503 ? status : 502;
}
</script>

<template>
  <main class="theme-main">
    <section class="theme-page moving-article-archive" aria-labelledby="moving-articles-title">
      <header class="moving-article-archive__hero">
        <p class="theme-eyebrow">Articles · Practical planning</p>
        <h1 id="moving-articles-title">Useful thinking before moving day.</h1>
        <p>Field notes for calmer access, clearer packing and a better handover at the other end.</p>
      </header>

      <ol v-if="articlePage.items.length > 0" class="moving-article-index">
        <li v-for="(item, index) in articlePage.items" :key="item.contentId">
          <span class="moving-article-index__number" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
          <article>
            <time :datetime="item.publishedAt">{{ formatMovingArticleDate(item.publishedAt) }}</time>
            <h2>
              <NuxtLink :to="item.canonicalPath">{{ item.title }}</NuxtLink>
            </h2>
            <p>{{ item.excerpt }}</p>
            <NuxtLink class="moving-article-index__link" :to="item.canonicalPath">
              Read article<span class="sr-only">: {{ item.title }}</span>
            </NuxtLink>
          </article>
        </li>
      </ol>

      <div v-else class="moving-article-empty">
        <p class="theme-eyebrow">The notebook is open</p>
        <h2>Practical articles are being prepared.</h2>
        <p>There are no published articles yet. In the meantime, explore the moving services or request a considered plan for your move.</p>
        <div class="moving-actions">
          <NuxtLink class="moving-action-link moving-action-link--primary" to="/services">Explore services</NuxtLink>
          <NuxtLink class="moving-action-link moving-action-link--secondary" to="/quote">Request a quote</NuxtLink>
        </div>
      </div>

      <nav v-if="articlePage.nextAfter" class="moving-article-pagination" aria-label="Article archive pagination">
        <NuxtLink :to="{ path: '/articles', query: { after: articlePage.nextAfter } }">Next articles</NuxtLink>
      </nav>
    </section>
  </main>
</template>
