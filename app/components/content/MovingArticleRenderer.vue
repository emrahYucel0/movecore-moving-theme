<script setup lang="ts">
import {
  formatMovingArticleDate,
  type MovingArticleViewModel,
} from "~~/shared/content/moving-article";

const props = defineProps<{ readonly page: MovingArticleViewModel }>();
const publishedDate = formatMovingArticleDate(props.page.publishedAt);
</script>

<template>
  <main class="theme-main">
    <article class="theme-page moving-article-detail" aria-labelledby="moving-article-title">
      <header class="moving-article-hero">
        <div class="moving-article-hero__index" aria-hidden="true">Field note</div>
        <div class="moving-article-hero__copy">
          <NuxtLink class="moving-article-back" to="/articles">All articles</NuxtLink>
          <h1 id="moving-article-title">{{ page.title }}</h1>
          <p class="moving-article-deck">{{ page.excerpt }}</p>
          <time :datetime="page.publishedAt">{{ publishedDate }}</time>
        </div>
      </header>

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
    </article>
  </main>
</template>
