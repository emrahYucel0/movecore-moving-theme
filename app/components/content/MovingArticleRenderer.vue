<script setup lang="ts">
import {
  formatMovingArticleDate,
  type MovingArticleViewModel,
} from "~~/shared/content/moving-article";
import type { MovingActionSection } from "~~/shared/content/moving-common";
import MovingFinalAction from "./moving-home/MovingFinalAction.vue";

const props = defineProps<{ readonly page: MovingArticleViewModel }>();
const publishedDate = formatMovingArticleDate(props.page.publishedAt);

/**
 * Articles were the only page type that ended by dropping the reader into the
 * footer. This is the site's own closing slab with its own public routes; it
 * carries no claim the content does not already make.
 */
const articleAction: MovingActionSection = Object.freeze({
  eyebrow: "Planning a move",
  title: "Talk it through before moving day.",
  primaryAction: Object.freeze({ label: "Request a quote", href: "/quote" }),
  secondaryAction: Object.freeze({ label: "Contact the team", href: "/contact" }),
});
</script>

<template>
  <main class="theme-main">
    <article
      class="theme-page moving-article-detail"
      :class="{ 'moving-article-detail--with-cover': page.coverMedia }"
      aria-labelledby="moving-article-title"
    >
      <header class="moving-article-hero">
        <div class="moving-article-hero__index" aria-hidden="true">Field note</div>
        <div class="moving-article-hero__copy">
          <NuxtLink class="moving-article-back" to="/articles">All articles</NuxtLink>
          <h1 id="moving-article-title">{{ page.title }}</h1>
          <p class="moving-article-deck">{{ page.excerpt }}</p>
          <time :datetime="page.publishedAt">{{ publishedDate }}</time>
        </div>
      </header>

      <figure v-if="page.coverMedia" class="moving-article-cover">
        <img
          :src="page.coverMedia.publicUrl"
          :alt="page.coverMedia.alt"
          :width="page.coverMedia.width"
          :height="page.coverMedia.height"
          class="moving-media-image moving-media-image--article"
          loading="lazy"
          decoding="async"
        >
      </figure>

      <div class="moving-article-body">
        <section
          v-for="(section, sectionIndex) in page.body"
          :key="`${sectionIndex}:${section.heading ?? 'section'}`"
          class="moving-article-section"
        >
          <h2 v-if="section.heading">{{ section.heading }}</h2>
          <div class="moving-article-prose">
            <p
              v-for="(paragraph, paragraphIndex) in section.paragraphs"
              :key="`${paragraphIndex}:${paragraph.text}`"
            >
              {{ paragraph.text }}
            </p>
          </div>
        </section>
      </div>

      <footer class="moving-article-footer">
        <span>More practical planning notes</span>
        <NuxtLink to="/articles">Return to all articles</NuxtLink>
      </footer>

      <MovingFinalAction :section="articleAction" />
    </article>
  </main>
</template>
