# MoveCore Moving & Logistics Theme

A commercial-theme foundation for moving and logistics public sites. It is built on the frozen MoveCore Nuxt Starter R1 lineage and renders published content from the versioned Core CMS Public HTTP API through Nuxt 4 SSR.

## Requirements

- Node.js 24 LTS (`>=24.11.0 <25`)
- npm 11

## Quick visual demo

The demo is explicit, deterministic and local-only. It starts a mock Core service on `127.0.0.1:4010`, lightweight local SVG media on `127.0.0.1:4011`, and Nuxt on `127.0.0.1:3000`.

```bash
npm install
npm run dev:demo
```

Open `http://127.0.0.1:3000`. Press Ctrl+C once to stop all three processes.

Demo routes:

- `/` and `/about`: themed, typed `site.page` SSR pages
- `/old`: permanent `301` redirect to `/about`
- `/temporary`: temporary `302` redirect to `/about`
- `/missing`: safe `404` presentation
- `/sitemap.xml`: absolute public sitemap

Northline Moving is a fictional demo brand. Demo media is representative and intentionally lightweight. Final commercial photography belongs to a later R2 visual-content asset task, not R2.1 architecture.

## Architecture lineage

```text
Core CMS v1.0.0-rc.2
  -> versioned Public HTTP reads
MoveCore Nuxt Starter R1 at 131c25d
  -> inherited SSR and application boundaries
MoveCore Moving & Logistics Theme R2.1
  -> moving-sector presentation and demo identity
```

The browser talks only to Nuxt. Nuxt server code calls fixed-purpose Core `/v1` reads. There is no generic proxy, Core package import, direct database access, Ege dependency, Admin API forwarding or mutation path.

Core remains authoritative for canonical routes, redirects, SEO projections, navigation, settings, public media and sitemap inventory. This theme remains authoritative for `site.page` interpretation and presentation.

## Theme visual direction

The R2.1 system uses a warm mineral canvas, deep green-charcoal ink and one controlled oxide signal. Strong system sans typography, a 12-column editorial grid, structural rules, sharp geometry and large media fields establish a precise but human service character.

Theme styles live in `app/assets/css/theme.css`. Components use semantic theme classes and tokens rather than scattered color values. There are no remote fonts, animation libraries, UI frameworks, carousels, gradients or glass effects.

## Development

For the offline visual workflow, use `npm run dev:demo`. For a compatible real Core CMS development instance, create `.env` from `.env.example`, configure the private Core origin and optional selectors, then run:

```bash
npm run dev
```

Useful validation:

```bash
npm test
npm run typecheck
npm run build
npm run verify
npm run smoke:production
```

## Production connection

The theme requires a compatible Core CMS Public HTTP runtime. Configure the private Core connection and public website origin:

```text
NUXT_CORE_BASE_URL=http://127.0.0.1:4000
NUXT_CORE_REQUEST_TIMEOUT_MS=5000
NUXT_CORE_PRIMARY_NAVIGATION_ID=primary
NUXT_CORE_SITE_SETTING_NAMESPACE=site
NUXT_CORE_SITE_SETTING_KEY=foundation
NUXT_CORE_FOUNDATION_MEDIA_ID=foundation-image
NUXT_PUBLIC_SITE_URL=https://public.example.com
```

`NUXT_CORE_BASE_URL` and all `NUXT_CORE_*` selectors are private server configuration. Only `NUXT_PUBLIC_SITE_URL` is intentionally browser-visible. The optional generic site foundation setting may expose a short `name` string for the replaceable navigation brand label.

Make `application/editor-profiles.json` available to Core and configure `CORE_CMS_EDITOR_PROFILES_FILE` with its absolute deployment path. The manifest remains application-owned and keeps the inherited `site.page` semantics unchanged.

## R2.1 scope

R2.1 adds repository identity, semantic theme tokens, navigation presentation, the asymmetric `site.page` hero, alternating editorial sections, a matching safe error page, moving-sector demo fixtures, focused hygiene tests and updated production smoke expectations.

It does not add Moving-specific content types, business settings, forms, pricing, testimonials, service/location route assumptions, multilingual behavior, motion systems, production deployment or database behavior.

## Known current limitations

- The only application content type is still `site.page`.
- The unchanged contract has no CTA, service taxonomy, location model or workflow fields.
- Demo imagery is deterministic illustration, not final commercial photography.
- The theme provides presentation only. Real published content, URLs, SEO, navigation and media still require compatible Core configuration.
- R2.2 owns the first Moving-specific content contract expansion.
