<script setup lang="ts">
import type { MovingContactPage } from "~~/shared/content/moving-conversion";
import MovingSubmissionNotice from "./moving-conversion/MovingSubmissionNotice.vue";

defineProps<{
  readonly page: MovingContactPage;
  readonly requestToken: string;
}>();

const route = useRoute();
const site = await useCorePublicSite();
const submitted = route.query.submitted === "1";
const status = typeof route.query.status === "string" ? route.query.status : undefined;
</script>

<template>
  <main class="theme-main">
    <article class="theme-page moving-conversion moving-contact" aria-labelledby="moving-contact-title">
      <header class="moving-conversion__hero">
        <div class="moving-conversion__heading">
          <p v-if="page.eyebrow" class="moving-kicker">{{ page.eyebrow }}</p>
          <h1 id="moving-contact-title">{{ page.title }}</h1>
          <p>{{ page.intro }}</p>
        </div>
      </header>

      <div class="moving-conversion__layout moving-contact__layout">
        <aside class="moving-contact__details" aria-labelledby="moving-contact-details-title">
          <div>
            <h2 id="moving-contact-details-title">{{ page.directContact.title }}</h2>
            <p>{{ page.directContact.intro }}</p>
          </div>
          <dl>
            <div>
              <dt>Telephone</dt>
              <dd><a :href="site.business.primaryPhone.href">{{ site.business.primaryPhone.display }}</a></dd>
            </div>
            <div v-if="site.business.whatsapp">
              <dt>WhatsApp</dt>
              <dd><a :href="site.business.whatsapp.href">{{ site.business.whatsapp.label }}</a></dd>
            </div>
            <div v-if="site.business.email">
              <dt>Email</dt>
              <dd><a :href="site.business.email.href">{{ site.business.email.display }}</a></dd>
            </div>
            <div v-if="site.business.address">
              <dt>Address</dt>
              <dd><address>{{ site.business.address }}</address></dd>
            </div>
          </dl>
          <section v-if="site.business.openingHours.length > 0" class="moving-contact__hours">
            <h2>Opening hours</h2>
            <dl>
              <div v-for="hours in site.business.openingHours" :key="hours.label">
                <dt>{{ hours.label }}</dt>
                <dd>{{ hours.value }}</dd>
              </div>
            </dl>
          </section>
          <NuxtLink class="moving-contact__quote-link" to="/quote">Planning a move? Request a quote</NuxtLink>
        </aside>

        <section class="moving-form-region">
          <MovingSubmissionNotice kind="contact" :submitted="submitted" :status="status" />
          <form
            v-if="!submitted"
            class="moving-form moving-form--contact"
            action="/api/moving/contact"
            method="post"
            enctype="application/x-www-form-urlencoded"
          >
            <input type="hidden" name="requestToken" :value="requestToken">
            <div class="moving-form__introduction">
              <p class="moving-section-label">General enquiry</p>
              <h2 id="moving-contact-form-title">{{ page.formIntroduction.title }}</h2>
              <p>{{ page.formIntroduction.intro }}</p>
            </div>

            <div class="moving-form__grid">
              <div class="moving-field moving-field--wide">
                <label for="contact-name">Name <span aria-hidden="true">*</span></label>
                <input id="contact-name" name="name" type="text" autocomplete="name" maxlength="120" required>
              </div>
              <div class="moving-field">
                <label for="contact-phone">Phone</label>
                <input id="contact-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="48" aria-describedby="contact-method-help">
              </div>
              <div class="moving-field">
                <label for="contact-email">Email</label>
                <input id="contact-email" name="email" type="email" autocomplete="email" maxlength="254" aria-describedby="contact-method-help">
              </div>
              <p id="contact-method-help" class="moving-form__helper moving-field--wide">Provide at least one contact method: phone or email.</p>
              <div class="moving-field moving-field--wide">
                <label for="contact-subject">Subject <span class="moving-field__optional">Optional</span></label>
                <input id="contact-subject" name="subject" type="text" maxlength="160">
              </div>
              <div class="moving-field moving-field--wide">
                <label for="contact-message">Message <span aria-hidden="true">*</span></label>
                <textarea id="contact-message" name="message" rows="8" maxlength="2000" required></textarea>
              </div>
            </div>

            <label class="moving-privacy-field">
              <input type="checkbox" name="privacyAcknowledged" value="true" required>
              <span>I have read the <NuxtLink to="/privacy">privacy notice</NuxtLink> and understand that the information I provide will be used to respond to this request.</span>
            </label>

            <button class="moving-form__submit" type="submit">Send message</button>
          </form>
        </section>
      </div>
    </article>
  </main>
</template>
