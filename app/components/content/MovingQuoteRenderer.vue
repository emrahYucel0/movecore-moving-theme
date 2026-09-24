<script setup lang="ts">
import type { MovingQuotePage } from "~~/shared/content/moving-conversion";
import MovingSubmissionNotice from "./moving-conversion/MovingSubmissionNotice.vue";

defineProps<{
  readonly page: MovingQuotePage;
  readonly requestToken: string;
}>();

const route = useRoute();
const submitted = route.query.submitted === "1";
const status = typeof route.query.status === "string" ? route.query.status : undefined;
</script>

<template>
  <main class="theme-main">
    <article class="theme-page moving-conversion moving-quote" aria-labelledby="moving-quote-title">
      <header class="moving-conversion__hero">
        <div class="moving-conversion__heading">
          <p v-if="page.eyebrow" class="moving-kicker">{{ page.eyebrow }}</p>
          <h1 id="moving-quote-title">{{ page.title }}</h1>
          <p>{{ page.intro }}</p>
        </div>
        <section class="moving-conversion__record" aria-labelledby="moving-quote-guidance-title">
          <h2 id="moving-quote-guidance-title">{{ page.reassurance.title }}</h2>
          <ul>
            <li v-for="point in page.reassurance.points" :key="point">{{ point }}</li>
          </ul>
        </section>
      </header>

      <div class="moving-conversion__layout">
        <aside v-if="page.planning" class="moving-quote__guidance">
          <section class="moving-quote__planning">
            <h2>{{ page.planning.title }}</h2>
            <p>{{ page.planning.body }}</p>
          </section>
        </aside>

        <section class="moving-form-region">
          <MovingSubmissionNotice kind="quote" :submitted="submitted" :status="status" />
          <form
            v-if="!submitted"
            class="moving-form"
            action="/api/moving/quote"
            method="post"
            enctype="application/x-www-form-urlencoded"
          >
            <input type="hidden" name="requestToken" :value="requestToken">
            <div class="moving-form__introduction">
              <p class="moving-section-label">Quote request</p>
              <h2 id="moving-quote-form-title">Share the useful details.</h2>
              <p>Required fields are marked with <span aria-hidden="true">*</span><span class="sr-only">an asterisk</span>.</p>
            </div>

            <fieldset>
              <legend>Your details</legend>
              <div class="moving-form__grid">
                <div class="moving-field">
                  <label for="quote-name">Name <span aria-hidden="true">*</span></label>
                  <input id="quote-name" name="name" type="text" autocomplete="name" maxlength="120" required>
                </div>
                <div class="moving-field">
                  <label for="quote-phone">Primary phone <span aria-hidden="true">*</span></label>
                  <input id="quote-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="48" required>
                </div>
                <div class="moving-field moving-field--wide">
                  <label for="quote-email">Email <span class="moving-field__optional">Optional</span></label>
                  <input id="quote-email" name="email" type="email" autocomplete="email" maxlength="254">
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend>Your move</legend>
              <div class="moving-form__grid">
                <div class="moving-field">
                  <label for="quote-origin">Moving from <span aria-hidden="true">*</span></label>
                  <input id="quote-origin" name="origin" type="text" autocomplete="off" maxlength="240" required>
                </div>
                <div class="moving-field">
                  <label for="quote-destination">Moving to <span aria-hidden="true">*</span></label>
                  <input id="quote-destination" name="destination" type="text" autocomplete="off" maxlength="240" required>
                </div>
                <div class="moving-field">
                  <label for="quote-move-type">Move type <span aria-hidden="true">*</span></label>
                  <select id="quote-move-type" name="moveType" required>
                    <option value="">Choose a move type</option>
                    <option value="home">Home move</option>
                    <option value="office">Office relocation</option>
                    <option value="small-move">Small move</option>
                    <option value="other">Another kind of move</option>
                  </select>
                </div>
                <div class="moving-field">
                  <label for="quote-date">Preferred move date <span class="moving-field__optional">Optional</span></label>
                  <input id="quote-date" name="preferredDate" type="date" autocomplete="off">
                </div>
                <div class="moving-field moving-field--wide">
                  <label for="quote-property-size">Property size <span class="moving-field__optional">Optional</span></label>
                  <select id="quote-property-size" name="propertySize">
                    <option value="">Not settled yet</option>
                    <option value="studio-one-bedroom">Studio or one bedroom</option>
                    <option value="two-three-bedrooms">Two or three bedrooms</option>
                    <option value="four-plus-bedrooms">Four or more bedrooms</option>
                    <option value="small-office">Small office</option>
                    <option value="large-office">Large office</option>
                    <option value="other">Another property size</option>
                  </select>
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend>Additional planning</legend>
              <fieldset class="moving-checkbox-group">
                <legend>Support you may need <span class="moving-field__optional">Optional</span></legend>
                <div class="moving-checkbox-grid">
                  <label><input type="checkbox" name="requestedServices" value="packing"> Packing support</label>
                  <label><input type="checkbox" name="requestedServices" value="furniture-disassembly"> Furniture disassembly</label>
                  <label><input type="checkbox" name="requestedServices" value="storage"> Storage</label>
                  <label><input type="checkbox" name="requestedServices" value="special-handling"> Special handling</label>
                </div>
              </fieldset>
              <div class="moving-field">
                <label for="quote-message">Additional notes <span class="moving-field__optional">Optional</span></label>
                <textarea id="quote-message" name="message" rows="6" maxlength="2000"></textarea>
              </div>
            </fieldset>

            <label class="moving-privacy-field">
              <input type="checkbox" name="privacyAcknowledged" value="true" required>
              <span>I have read the <NuxtLink to="/privacy">privacy notice</NuxtLink> and understand that the information I provide will be used to respond to this request.</span>
            </label>

            <button class="moving-form__submit" type="submit">Send quote request</button>
            <p class="moving-form__footnote">Sending this request does not create a booking or guarantee a final price.</p>
          </form>
        </section>
      </div>
    </article>
  </main>
</template>
