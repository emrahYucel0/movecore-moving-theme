<script setup lang="ts">
import type {
  PublicBusinessIdentity,
  PublicSiteNavigation,
} from "~~/shared/site-composition";
import PublicBusinessBrand from "./PublicBusinessBrand.vue";
import PublicNavigationTree from "./PublicNavigationTree.vue";

defineProps<{
  readonly navigation: PublicSiteNavigation;
  readonly business: PublicBusinessIdentity;
}>();
</script>

<template>
  <header class="theme-header">
    <div class="theme-header__inner">
      <PublicBusinessBrand :business="business" />

      <div class="theme-header__desktop">
        <nav aria-label="Primary navigation" class="theme-navigation">
          <PublicNavigationTree :items="navigation.items" :depth="0" />
        </nav>
        <a class="theme-header__phone" :href="business.primaryPhone.href">
          <span>Call</span>
          {{ business.primaryPhone.display }}
        </a>
      </div>

      <button
        type="button"
        class="theme-menu-trigger"
        aria-label="Open navigation"
        aria-controls="theme-mobile-menu"
        popovertarget="theme-mobile-menu"
        popovertargetaction="toggle"
      >
        <span aria-hidden="true" class="theme-menu-trigger__lines">
          <span />
          <span />
        </span>
        <span>Menu</span>
      </button>

      <div id="theme-mobile-menu" class="theme-mobile-menu" popover="auto">
        <div class="theme-mobile-menu__inner">
          <div class="theme-mobile-menu__heading">
            <PublicBusinessBrand :business="business" placement="footer" />
            <button
              type="button"
              class="theme-mobile-menu__close"
              aria-label="Close navigation"
              popovertarget="theme-mobile-menu"
              popovertargetaction="hide"
            >
              <span>Close</span>
              <span aria-hidden="true" class="theme-mobile-menu__close-mark">
                <span />
                <span />
              </span>
            </button>
          </div>
          <nav aria-label="Mobile navigation" class="theme-mobile-navigation">
            <PublicNavigationTree
              :items="navigation.items"
              :depth="0"
              :autofocus-first="true"
            />
          </nav>
          <section class="theme-mobile-menu__contact" aria-label="Contact the moving team">
            <p>Speak with the moving team</p>
            <div class="theme-mobile-menu__contact-actions">
              <a :href="business.primaryPhone.href">
                <span>Call</span>
                <strong>{{ business.primaryPhone.display }}</strong>
              </a>
              <a v-if="business.whatsapp" :href="business.whatsapp.href">
                <span>WhatsApp</span>
                <strong>{{ business.whatsapp.label }}</strong>
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  </header>
</template>
