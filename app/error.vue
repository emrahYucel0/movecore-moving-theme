<script setup lang="ts">
import type { NuxtError } from "#app";

const props = defineProps<{
  readonly error: NuxtError;
}>();

const statusCode = computed(() => publicStatus(props.error.statusCode));
const presentation = computed(() => errorPresentation(statusCode.value));

function returnHome(): void {
  clearError({ redirect: "/" });
}

function publicStatus(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 400 && value <= 599
    ? value
    : 500;
}

function errorPresentation(status: number): Readonly<{ readonly title: string; readonly detail: string }> {
  if (status === 404) {
    return { title: "Page not found", detail: "The requested page could not be found." };
  }
  if (status === 502) {
    return { title: "Upstream response unavailable", detail: "This page cannot be displayed right now." };
  }
  if (status === 503) {
    return { title: "Service temporarily unavailable", detail: "Please try again in a little while." };
  }
  if (status === 400) {
    return { title: "Invalid request", detail: "The requested page could not be displayed." };
  }
  return { title: "Page unavailable", detail: "This page cannot be displayed right now." };
}
</script>

<template>
  <main class="theme-error">
    <section
      role="alert"
      aria-labelledby="public-error-title"
      class="theme-error__panel"
    >
      <p class="theme-error__code">
        Error {{ statusCode }}
      </p>
      <h1 id="public-error-title" class="theme-error__title">
        {{ presentation.title }}
      </h1>
      <p class="theme-error__detail">
        {{ presentation.detail }}
      </p>
      <button
        type="button"
        class="theme-error__action"
        @click="returnHome"
      >
        Return to home
      </button>
    </section>
  </main>
</template>
