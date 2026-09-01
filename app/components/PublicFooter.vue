<script setup lang="ts">
import type {
  PublicBusinessIdentity,
  PublicSiteNavigation,
} from "~~/shared/site-composition";
import PublicBusinessBrand from "./PublicBusinessBrand.vue";
import PublicNavigationTree from "./PublicNavigationTree.vue";

const props = defineProps<{
  readonly navigation: PublicSiteNavigation;
  readonly business: PublicBusinessIdentity;
}>();

const currentYear = new Date().getUTCFullYear();
const hasDirectDetails = computed(() =>
  props.business.whatsapp !== undefined ||
  props.business.email !== undefined ||
  props.business.address !== undefined);
</script>

<template>
  <footer id="site-footer" class="theme-footer">
    <div class="theme-footer__inner">
      <div class="theme-footer__identity">
        <PublicBusinessBrand :business="business" placement="footer" />
        <a class="theme-footer__primary-phone" :href="business.primaryPhone.href">
          {{ business.primaryPhone.display }}
        </a>
      </div>

      <section v-if="hasDirectDetails" class="theme-footer__section" aria-labelledby="footer-contact-title">
        <h2 id="footer-contact-title">Contact</h2>
        <ul class="theme-footer__contact-list">
          <li v-if="business.whatsapp">
            <a :href="business.whatsapp.href">{{ business.whatsapp.label }}</a>
          </li>
          <li v-if="business.email">
            <a :href="business.email.href">{{ business.email.display }}</a>
          </li>
          <li v-if="business.address">
            <address>{{ business.address }}</address>
          </li>
        </ul>
      </section>

      <section v-if="business.openingHours.length > 0" class="theme-footer__section" aria-labelledby="footer-hours-title">
        <h2 id="footer-hours-title">Opening hours</h2>
        <dl class="theme-footer__hours">
          <div v-for="hours in business.openingHours" :key="hours.label">
            <dt>{{ hours.label }}</dt>
            <dd>{{ hours.value }}</dd>
          </div>
        </dl>
      </section>

      <nav aria-label="Footer navigation" class="theme-footer__section theme-footer__navigation">
        <h2>Explore</h2>
        <PublicNavigationTree :items="navigation.items" :depth="0" />
      </nav>

      <section v-if="business.socialLinks.length > 0" class="theme-footer__section theme-footer__social" aria-labelledby="footer-social-title">
        <h2 id="footer-social-title">Follow</h2>
        <ul>
          <li v-for="link in business.socialLinks" :key="link.href">
            <a :href="link.href" target="_blank" rel="noopener noreferrer">
              {{ link.label }}
            </a>
          </li>
        </ul>
      </section>

      <p class="theme-footer__copyright">
        © {{ currentYear }} {{ business.companyName }}. All rights reserved.
      </p>
    </div>
  </footer>
</template>
