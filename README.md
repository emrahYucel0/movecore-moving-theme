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

- `/`: typed `moving.home` SSR homepage exercising every R2.2 content branch
- `/about`: unchanged typed `site.page` SSR page
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
MoveCore Moving & Logistics Theme R2.2
  -> moving.home content architecture and type dispatch
```

The browser talks only to Nuxt. Nuxt server code calls fixed-purpose Core `/v1` reads. There is no generic proxy, Core package import, direct database access, Ege dependency, Admin API forwarding or mutation path.

Core remains authoritative for canonical routes, redirects, SEO projections, navigation, settings, public media and sitemap inventory. This theme remains authoritative for `site.page` and `moving.home` interpretation and presentation.

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

Make `application/editor-profiles.json` available to Core and configure `CORE_CMS_EDITOR_PROFILES_FILE` with its absolute deployment path. The manifest remains application-owned, keeps the inherited `site.page` semantics unchanged, and adds the version 1 `moving.home` profile.

Files under `application/examples/` are static development/reference fixtures. They are not database seeds and are never written to Core automatically.

`moving.home` action destinations use profile `text` fields deliberately. Core rc.2's `url` editor validates only HTTP(S), while this application contract also permits internal absolute paths, `tel:` and `mailto:`. The server-side Moving parser is the authoritative safe-href boundary.

## R2.1 scope

R2.1 adds repository identity, semantic theme tokens, navigation presentation, the asymmetric `site.page` hero, alternating editorial sections, a matching safe error page, moving-sector demo fixtures, focused hygiene tests and updated production smoke expectations.

It does not add Moving-specific content types, business settings, forms, pricing, testimonials, service/location route assumptions, multilingual behavior, motion systems, production deployment or database behavior.

## R2.2 scope

R2.2 adds exactly one Moving-specific content type: `moving.home`. Its explicit contract covers hero actions and media, operational proof, service summaries, an ordered process, care/assurance, general area links and a closing action. Core-resolved pages dispatch by published content type, so `moving.home` is not coupled to `/`; the demo simply publishes it at `/` while `/about` continues to prove `site.page` coexistence.

The R2.2 renderer is intentionally a neutral semantic proof using the existing R2.1 theme primitives. Finished homepage composition and art direction belong to R2.3. R2.2 does not add a page builder, service/location/article entities, forms, testimonials, pricing, location SEO, blog behavior, motion or new settings/navigation contracts.

## Known current limitations

- Application content dispatch is intentionally limited to `site.page` and `moving.home`.
- Homepage service and area entries are summaries/links, not canonical service or location entities.
- There is still no quote form, service taxonomy, location model or workflow persistence.
- Demo imagery is deterministic illustration, not final commercial photography.
- The `moving.home` renderer proves contract structure; R2.3 owns finished homepage composition.
- The theme provides presentation only. Real published content, URLs, SEO, navigation and media still require compatible Core configuration.
