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
  <main class="grid min-h-dvh place-items-center bg-slate-50 px-6 py-16 text-slate-950">
    <section
      role="alert"
      aria-labelledby="public-error-title"
      class="w-full max-w-xl space-y-5 rounded-lg border border-slate-200 bg-white p-8"
    >
      <p class="text-sm font-semibold text-slate-600">
        Error {{ statusCode }}
      </p>
      <h1 id="public-error-title" class="text-3xl font-bold tracking-tight">
        {{ presentation.title }}
      </h1>
      <p class="leading-7 text-slate-700">
        {{ presentation.detail }}
      </p>
      <button
        type="button"
        class="min-h-11 cursor-pointer rounded-md bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 active:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        @click="returnHome"
      >
        Return to home
      </button>
    </section>
  </main>
</template>
