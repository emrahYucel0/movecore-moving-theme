<script setup lang="ts">
import PublicPageFoundation from "./PublicPageFoundation.vue";

const page = await useCorePublicPage();
</script>

<template>
  <PublicPageFoundation v-if="page" :page="page" />
</template>
