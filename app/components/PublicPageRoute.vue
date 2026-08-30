<script setup lang="ts">
import PublicPageFoundation from "./PublicPageFoundation.vue";

const page = await useCorePublicPage();
if (page !== undefined) usePublicPageSeo(page);
</script>

<template>
  <PublicPageFoundation v-if="page" :page="page" />
</template>
