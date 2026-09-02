<script setup lang="ts">
const props = defineProps<{
  readonly kind: "quote" | "contact";
  readonly submitted: boolean;
  readonly status?: string;
}>();

const errorMessage = computed(() => {
  if (props.status === "invalid") {
    return "Please review the form and provide the required details before sending it again.";
  }
  if (props.status === "rate-limited") {
    return "Too many requests have been sent. Please wait a moment before trying again.";
  }
  if (props.status === "unavailable") {
    return "The request could not be sent right now. Please try again later or use the direct contact details.";
  }
  return undefined;
});
</script>

<template>
  <section
    v-if="submitted"
    class="moving-form-notice moving-form-notice--success"
    role="status"
    aria-labelledby="moving-submission-success-title"
  >
    <p class="moving-section-label">Request received</p>
    <h2 id="moving-submission-success-title">
      {{ kind === "quote" ? "Your moving details have been sent." : "Your message has been sent." }}
    </h2>
    <p>
      The team can now review your request and follow up using the contact details you provided.
    </p>
    <NuxtLink to="/">Return to the homepage</NuxtLink>
  </section>
  <div v-else-if="errorMessage" class="moving-form-notice moving-form-notice--error" role="alert">
    <strong>We could not send the request.</strong>
    <p>{{ errorMessage }}</p>
  </div>
</template>
