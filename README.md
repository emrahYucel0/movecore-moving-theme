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
- `/services/home-moving`: typed `moving.service` SSR detail page
- `/services/office-relocation`: second `moving.service` canonical route
- `/areas/north-district`: typed `moving.location` SSR detail page
- `/areas/riverside`: `moving.location` without optional hero media
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
MoveCore Moving & Logistics Theme R2.3
  -> production-quality commercial homepage composition
MoveCore Moving & Logistics Theme R2.4
  -> bounded service and location contracts with SSR inner-page templates
MoveCore Moving & Logistics Theme R2.5
  -> progressive motion and a deterministic production performance gate
```

The browser talks only to Nuxt. Nuxt server code calls fixed-purpose Core `/v1` reads. There is no generic proxy, Core package import, direct database access, Ege dependency, Admin API forwarding or mutation path.

Core remains authoritative for canonical routes, redirects, SEO projections, navigation, settings, public media and sitemap inventory. This theme remains authoritative for `site.page`, `moving.home`, `moving.service` and `moving.location` interpretation and presentation.

## Theme visual direction

The R2.1 system uses a warm mineral canvas, deep green-charcoal ink and one controlled oxide signal. Strong system sans typography, a 12-column editorial grid, structural rules, sharp geometry and large media fields establish a precise but human service character.

Theme styles live in `app/assets/css/theme.css`. Components use semantic theme classes and tokens rather than scattered color values. There are no remote fonts, animation libraries, UI frameworks, carousels, gradients or glass effects.

### R2 commercial photography direction

The current deterministic SVG fixtures are temporary composition proofs. Final photography should feel documentary and editorial: real moving crews in real homes or workplaces, natural daylight and skin tones, and clear physical context such as planning, protective packing, lifting, loading, arrival, room placement and crew coordination. Hero photography should leave a calm edge for the structural frame while keeping people, vehicle or handled objects legible through desktop and mobile crops. Assurance photography should work at a closer human scale and show careful handling rather than a posed team.

Avoid empty smiling-worker poses, isolated cardboard-box stock shots, fake hard hats, unrelated warehouse scenes, corporate handshakes, oversaturated HDR treatment, CGI surfaces and AI-looking anatomy. Final assets should preserve authored alt text, include intrinsic dimensions, and be exported at responsive web sizes before production use.

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
npm run perf:production
```

`npm run perf:production` uses the installed Chrome/Chromium executable, the real Nitro production build, and the deterministic local Core/media fixtures. Its constrained mobile profile is 390×844 at DPR 2, 4× CPU throttling, 150 ms latency, 1.6 Mbps download and 750 Kbps upload. The homepage receives one warm-up plus five measured runs; representative service and location routes receive a browser smoke measurement. This is a repeatable local regression gate, not a claim about hosted Lighthouse or PageSpeed.

## Production connection

The theme requires a compatible Core CMS Public HTTP runtime. Configure the private Core connection and public website origin:

```text
NUXT_CORE_BASE_URL=http://127.0.0.1:4000
NUXT_CORE_REQUEST_TIMEOUT_MS=5000
NUXT_CORE_PRIMARY_NAVIGATION_ID=primary
NUXT_CORE_FOOTER_NAVIGATION_ID=footer
NUXT_CORE_SITE_SETTING_NAMESPACE=moving
NUXT_CORE_SITE_SETTING_KEY=business
NUXT_PUBLIC_SITE_URL=https://public.example.com
```

`NUXT_CORE_BASE_URL` and all `NUXT_CORE_*` selectors are private server configuration. Only `NUXT_PUBLIC_SITE_URL` is intentionally browser-visible. `moving.business` is the required, public Business Identity source for the global shell. When `NUXT_CORE_FOOTER_NAVIGATION_ID` is blank, the footer reuses primary navigation.

Make `application/setting-definitions.json` available to Core and set `CORE_CMS_SETTING_DEFINITIONS_FILE` to its absolute deployment path. Include `moving` in `CORE_CMS_ADMIN_SETTING_NAMESPACES` so authorized Admin users can read and update this namespace. Core loads definitions on startup; a missing definition receives the manifest default, while an existing compatible setting keeps its customer-managed value across restarts. The included default is an example-safe placeholder and must be changed before a real launch.

Core Admin currently edits the Business Identity value as JSON. R2.7B adds the Core-backed setting, strict Moving application validation and public shell consumption; it does not add the final typed, schema-driven Business Settings Admin form.

Make `application/editor-profiles.json` available to Core and configure `CORE_CMS_EDITOR_PROFILES_FILE` with its absolute deployment path. The manifest remains application-owned and contains version 1 profiles for `site.page`, `moving.home`, `moving.service` and `moving.location`. The inherited `site.page` and `moving.home` semantics remain unchanged.

Files under `application/examples/` are static development/reference fixtures. They are not database seeds and are never written to Core automatically.

Moving action destinations use profile `text` fields deliberately. Core rc.2's `url` editor validates only HTTP(S), while these application contracts also permit internal absolute paths, `tel:` and `mailto:`. The server-side Moving parsers are the authoritative safe-href boundary.

## R2.1 scope

R2.1 adds repository identity, semantic theme tokens, navigation presentation, the asymmetric `site.page` hero, alternating editorial sections, a matching safe error page, moving-sector demo fixtures, focused hygiene tests and updated production smoke expectations.

It does not add Moving-specific content types, business settings, forms, pricing, testimonials, service/location route assumptions, multilingual behavior, motion systems, production deployment or database behavior.

## R2.2 scope

R2.2 adds exactly one Moving-specific content type: `moving.home`. Its explicit contract covers hero actions and media, operational proof, service summaries, an ordered process, care/assurance, general area links and a closing action. Core-resolved pages dispatch by published content type, so `moving.home` is not coupled to `/`; the demo simply publishes it at `/` while `/about` continues to prove `site.page` coexistence.

The R2.2 renderer is intentionally a neutral semantic proof using the existing R2.1 theme primitives. Finished homepage composition and art direction belong to R2.3. R2.2 does not add a page builder, service/location/article entities, forms, testimonials, pricing, location SEO, blog behavior, motion or new settings/navigation contracts.

## R2.4 scope

R2.4 adds exactly two bounded Moving-specific types. `moving.service` models one commercial service detail with overview, inclusions, process, related-service links and a final action. `moving.location` models one useful location detail with available-service links, operational local details, nearby-area links and a final action. Both dispatch from the Core-published content type at any canonical path and resolve optional hero media through the existing server-only public media boundary.

The nested `/services/...` and `/areas/...` URLs are deterministic demo fixtures, not product policy. Core may resolve either type at a flat or differently nested canonical path. Related-service and nearby-area destinations are bounded textual href references, not database relations or automatic graph traversal.

`moving.article` is deliberately deferred. A dedicated article type is not justified until publication date, author, taxonomy, listing, related-article and Article structured-data semantics are demonstrated. General editorial pages continue to use `site.page`; R2.4 adds no blog, geo hierarchy, bulk SEO generation, map, form, pricing, review or page-builder system.

## R2.5 performance and motion

R2.5 keeps all SSR content immediately visible and adds no runtime motion dependency. CSS transitions provide small link affordances; supported browsers progressively animate only structural handoff, process and closing rules with scroll-driven timelines. Unsupported browsers receive the complete static design, JavaScript is not required for motion, and `prefers-reduced-motion: reduce` resolves every animated detail to its final static state. Native document scrolling remains authoritative.

Production continues to use Nuxt's supported `features.noScripts` mode. The responsive menu uses the native HTML popover primitive, including keyboard invocation, Escape dismissal and light dismissal, so product navigation does not depend on hydration. Every route remains rendered by Nitro, while the development demo retains Nuxt client scripts for normal development diagnostics. Any future interaction that native primitives cannot satisfy must explicitly revisit this policy and its performance budget.

Explicit renderer lazy loading was measured and rejected: it produced negligible homepage transfer savings while adding requests and hydration work. The application therefore keeps direct imports behind its fixed, validated `site.page`, `moving.home`, `moving.service` and `moving.location` type dispatch. No CMS value becomes a component name or import path.

Current image rendering supports authored alt text, intrinsic dimensions, eager high-priority hero delivery, and async decoding; below-fold images are lazy and async. Core's public media projection can contain variants, but the frozen application content view models do not currently expose a responsive `srcset`/`sizes` composition, so R2.5 does not invent URLs or expand those contracts.

For release photography, prefer AVIF or WebP where the publication pipeline supports them, generate viewport-appropriate responsive dimensions, target no more than 150 KiB transferred for the mobile hero LCP candidate, preserve intrinsic width and height, and lazy-load below-fold media. Never send an oversized desktop original to a mobile viewport. Responsive variant composition remains a future media-boundary enhancement and must use public Core metadata rather than frontend-generated URLs.

## R2.7B business identity and shell

R2.7B makes the public `moving.business` setting the only source for header and footer identity. The application-owned parser validates company name, required phone, optional WhatsApp and email actions, optional address, bounded opening hours and bounded HTTPS social links before a typed immutable view reaches Vue. An optional logo asset is resolved through Core Public Media and must be an image; the shell uses a deliberate typographic fallback when no logo is configured.

The commercial shell adds a restrained desktop contact hierarchy, a native-popover mobile menu and a complete responsive footer. It adds no form, lead capture, typed Business Settings Admin screen, new content type, client dependency or Core vocabulary.

## Known current limitations

- Generic Core publication does not enforce these application-owned payload contracts; the server parser remains the fail-closed runtime boundary.
- Editor-profile metadata and application parsers are separate artifacts and require consistency tests to prevent drift.
- Related-service and nearby-area links are textual href references, not relational entities.
- `moving.location` is a bounded content record, not a geo database or bulk SEO system.
- Media publication and content publication remain separate Core lifecycles rather than one atomic application transaction.
- There is still no quote form, service taxonomy, article model, location hierarchy or workflow persistence.
- Demo imagery is deterministic illustration, not final commercial photography.
- The theme provides presentation only. Real published content, URLs, SEO, navigation and media still require compatible Core configuration.
