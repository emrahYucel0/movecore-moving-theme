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
- `/services`: typed `moving.services` collection page
- `/areas`: typed `moving.areas` collection page
- `/faq`: typed `moving.faq` collection page
- `/testimonials`: typed `moving.testimonials` collection page
- `/articles`: SSR Article archive backed only by Core's routable public collection
- `/articles/preparing-access-before-moving-day`: one of three typed `moving.article` demo details
- `/quote`: typed `moving.quote` page with the native quote-request form
- `/contact`: typed `moving.contact` page with Business Identity and the native contact form
- `/privacy`: replaceable reference privacy notice using `site.page`
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
MoveCore Moving & Logistics Theme R2.7B
  -> Core-backed business identity and commercial site shell
MoveCore Moving & Logistics Theme R2.8
  -> bounded commercial collections and their editor profiles
MoveCore Moving & Logistics Theme R2.9B
  -> server-authenticated quote and contact conversion into Core Submissions
MoveCore Moving & Logistics Theme R2.9D
  -> application-owned typed lead presentation in the generic Core Admin Inbox
MoveCore Moving & Logistics Theme R2.11A
  -> buyer-managed Articles with a public SSR archive and canonical detail routes
```

The browser talks only to Nuxt. Nuxt server code calls fixed-purpose Core `/v1` reads and exposes only two explicit same-origin Moving submission endpoints. There is no generic proxy, Core package import, direct database access, Ege dependency or Admin API forwarding. Browser form data is validated by the Moving application before Nuxt signs a private `POST /v1/submissions` request.

Core remains authoritative for canonical routes, redirects, SEO projections, navigation, settings, public media and sitemap inventory. This theme remains authoritative for interpreting and presenting the eleven supported types: `site.page`, `moving.home`, `moving.service`, `moving.location`, `moving.services`, `moving.areas`, `moving.faq`, `moving.testimonials`, `moving.quote`, `moving.contact` and `moving.article`.

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

`npm run perf:production` uses the installed Chrome/Chromium executable, the real Nitro production build, and the deterministic local Core/media fixtures. Its constrained mobile profile is 390 by 844 at DPR 2, 4x CPU throttling, 150 ms latency, 1.6 Mbps download and 750 Kbps upload. The homepage receives one warm-up plus five measured runs; representative collection, service, location, quote and contact routes receive a browser smoke measurement. This is a repeatable local regression gate, not a claim about hosted Lighthouse or PageSpeed.

## Production connection

The theme requires a compatible Core CMS Public HTTP runtime. Configure the private Core connection and public website origin:

```text
NUXT_CORE_BASE_URL=http://127.0.0.1:4000
NUXT_CORE_REQUEST_TIMEOUT_MS=5000
NUXT_CORE_PRIMARY_NAVIGATION_ID=primary
NUXT_CORE_FOOTER_NAVIGATION_ID=footer
NUXT_CORE_SITE_SETTING_NAMESPACE=moving
NUXT_CORE_SITE_SETTING_KEY=business
NUXT_MOVING_SUBMISSION_CLIENT_IDENTITY_SECRET=<base64url-encoded-32-byte-secret>
NUXT_CORE_SUBMISSION_UPSTREAM_SECRET=<different-base64url-encoded-32-byte-secret>
NUXT_PUBLIC_SITE_URL=https://public.example.com
```

`NUXT_CORE_BASE_URL`, the `NUXT_CORE_*` selectors and both submission secrets are private server configuration. Neither secret belongs under Nuxt `runtimeConfig.public`; only `NUXT_PUBLIC_SITE_URL` is intentionally browser-visible. The Core-side `CORE_CMS_SUBMISSION_UPSTREAM_SECRET` must decode to the same bytes as `NUXT_CORE_SUBMISSION_UPSTREAM_SECRET`. The identity secret must be independent and is used only to authenticate a first-party anonymous abuse-isolation cookie and derive the pseudonym sent to Core. `moving.business` is the required, public Business Identity source for the global shell. When `NUXT_CORE_FOOTER_NAVIGATION_ID` is blank, the footer reuses primary navigation.

Make `application/setting-definitions.json` available to Core and set `CORE_CMS_SETTING_DEFINITIONS_FILE` to its absolute deployment path. Include `moving` in `CORE_CMS_ADMIN_SETTING_NAMESPACES` so authorized Admin users can read and update this namespace. Core loads definitions on startup; a missing definition receives the manifest default, while an existing compatible setting keeps its customer-managed value across restarts. The included default is an example-safe placeholder and must be changed before a real launch.

Make `application/setting-editor-profiles.json` available to Core and set `CORE_CMS_SETTING_EDITOR_PROFILES_FILE` to its absolute deployment path. The **Business details** profile is the primary buyer-facing editor for `moving.business`; it preserves hidden `schemaVersion` and unknown safe data while exposing company, logo, contact, Article archive SEO, optional default social preview image, opening-hours and social fields. Resource-backed page SEO remains in Core's URL/SEO editor. Raw JSON remains secondary and read-only for profiled values. Existing legacy v1 values must be explicitly converted before this profile is enabled; see [`docs/business-setting-v2.md`](docs/business-setting-v2.md) for the dry conversion command.

Make `application/editor-profiles.json` available to Core and configure `CORE_CMS_EDITOR_PROFILES_FILE` with its absolute deployment path. The manifest remains application-owned and contains profiles for all eleven supported content types. The `moving.quote` and `moving.contact` profiles edit only surrounding page messaging; form labels, field semantics, validation and payload mapping remain application code. The `moving.article` profile exposes title, excerpt and bounded repeatable body sections without raw JSON.

Make `application/submission-definitions.json` and `application/submission-presentations.json` available to Core. Configure `CORE_CMS_SUBMISSION_DEFINITIONS_FILE` and `CORE_CMS_SUBMISSION_PRESENTATIONS_FILE` with their absolute deployment paths, then configure the public Moving origin in `CORE_CMS_SUBMISSION_ORIGINS`. The definitions remain authoritative for which public types Core accepts. The presentation manifest adds only application-owned labels, bounded preview paths, detail groups and enum display mappings; it does not validate creation or change stored payloads.

Make `application/sitemap-routes.json` available to Core and set `CORE_CMS_SITEMAP_ROUTES_FILE` to its absolute deployment path. It declares the application-owned `/articles` archive exactly once; resource-backed pages and Article details continue to enter the sitemap through Core URL/SEO records.

Deploy the seven application metadata manifests together when their capabilities are used:

```text
CORE_CMS_EDITOR_PROFILES_FILE=<absolute path>/application/editor-profiles.json
CORE_CMS_SETTING_DEFINITIONS_FILE=<absolute path>/application/setting-definitions.json
CORE_CMS_SETTING_EDITOR_PROFILES_FILE=<absolute path>/application/setting-editor-profiles.json
CORE_CMS_SUBMISSION_DEFINITIONS_FILE=<absolute path>/application/submission-definitions.json
CORE_CMS_SUBMISSION_PRESENTATIONS_FILE=<absolute path>/application/submission-presentations.json
CORE_CMS_ADMIN_SHELL_FILE=<absolute path>/application/admin-shell.json
CORE_CMS_SITEMAP_ROUTES_FILE=<absolute path>/application/sitemap-routes.json
```

These JSON manifests contain no credentials. Keep them separate from the private Nuxt `NUXT_MOVING_SUBMISSION_CLIENT_IDENTITY_SECRET` and `NUXT_CORE_SUBMISSION_UPSTREAM_SECRET` values. Core validates both submission manifests once at startup and fails closed if a presentation type has no corresponding definition.

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

General editorial pages continue to use `site.page`; R2.4 adds no blog, geo hierarchy, bulk SEO generation, map, form, pricing, review or page-builder system. The later R2.11A capability adds `moving.article` without changing the service/location contracts.

## R2.11A Articles

`moving.article` is a focused editorial V1 with `title`, `excerpt` and bounded body sections containing optional headings and one or more plain-text paragraphs. It intentionally has no author, taxonomy, comments, scheduling, reading-time field or unsafe HTML. Cover media is also omitted: current Core content profiles can select Media IDs, but content revision writes do not yet maintain the generic Media usage-reference lifecycle required for safe deletion protection.

`/articles` is an application-owned SSR archive. One displayed page contains at most six Articles and normally makes one `GET /v1/content?type=moving.article` request. URL-less rows can make Core return a short or empty page with `nextAfter`; the archive continues only until it has six display items, Core ends, or four collection requests have been made. It rejects repeated cursors and duplicate content/canonical identities, never scans the whole collection, and links only to each Core-projected `seo.canonicalPath`. Canonical Article detail requests continue through the existing Core path resolver and typed catch-all dispatch.

The Articles navigation item stays visible when there are no published Articles because the archive has a deliberate service-oriented empty state. Demo mode provides exactly three published Articles and real canonical URL projections; `application/examples/` remains fixture-only and does not seed a production database. Article detail URLs participate in the existing Core sitemap rules, while `application/sitemap-routes.json` contributes the fixed `/articles` archive through Core's generic application-route inventory.

## R2.5 performance and motion

R2.5 keeps all SSR content immediately visible and adds no runtime motion dependency. CSS transitions provide small link affordances; supported browsers progressively animate only structural handoff, process and closing rules with scroll-driven timelines. Unsupported browsers receive the complete static design, JavaScript is not required for motion, and `prefers-reduced-motion: reduce` resolves every animated detail to its final static state. Native document scrolling remains authoritative.

Production continues to use Nuxt's supported `features.noScripts` mode. The responsive menu uses the native HTML popover primitive, including keyboard invocation, Escape dismissal and light dismissal, so product navigation does not depend on hydration. Every route remains rendered by Nitro, while the development demo retains Nuxt client scripts for normal development diagnostics. Any future interaction that native primitives cannot satisfy must explicitly revisit this policy and its performance budget.

Explicit renderer lazy loading was measured and rejected: it produced negligible homepage transfer savings while adding requests and hydration work. The application therefore keeps direct imports behind its fixed, validated `site.page`, `moving.home`, `moving.service` and `moving.location` type dispatch. No CMS value becomes a component name or import path.

Current image rendering supports authored alt text, intrinsic dimensions, eager high-priority hero delivery, and async decoding; below-fold images are lazy and async. Core's public media projection can contain variants, but the frozen application content view models do not currently expose a responsive `srcset`/`sizes` composition, so R2.5 does not invent URLs or expand those contracts.

For release photography, prefer AVIF or WebP where the publication pipeline supports them, generate viewport-appropriate responsive dimensions, target no more than 150 KiB transferred for the mobile hero LCP candidate, preserve intrinsic width and height, and lazy-load below-fold media. Never send an oversized desktop original to a mobile viewport. Responsive variant composition remains a future media-boundary enhancement and must use public Core metadata rather than frontend-generated URLs.

## R2.7B business identity and shell

R2.7B makes the public `moving.business` setting the only source for header and footer identity. The application-owned parser validates company name, required phone, optional WhatsApp and email actions, optional address, bounded opening hours and bounded HTTPS social links before a typed immutable view reaches Vue. An optional logo asset is resolved through Core Public Media and must be an image; the shell uses a deliberate typographic fallback when no logo is configured.

The commercial shell adds a restrained desktop contact hierarchy, a native-popover mobile menu and a complete responsive footer. R2.9B builds on that shell without changing the Business Identity ownership boundary or adding Core vocabulary.

## R2.9B quote and contact conversion

R2.9B adds explicit `moving.quote` and `moving.contact` page types around two application-owned, SSR-native forms. The same-origin endpoints are `POST /api/moving/quote` and `POST /api/moving/contact`. They accept a bounded URL-encoded body, enforce configured Origin and Host, validate strict typed Moving payloads, issue authenticated HttpOnly anonymous identity cookies, derive privacy-preserving Core client pseudonyms and independently sign the exact JSON bytes sent to Core. Every rendered form carries a cryptographically random request token that becomes the Core idempotency key. Success and safe failure states use POST/Redirect/GET and work without client JavaScript.

Northline demo submission data is local-only and deterministic. The demo privacy page is reference content, not legal advice, and must be replaced for a real deployment. R2.9B does not send email, call a CRM, calculate prices, schedule moves or claim that the abuse-isolation identity eliminates spam.

## R2.9D typed lead presentation

R2.9D configures Core's generic Submission Presentation Profile capability without adding Moving vocabulary to Core. Quote rows show the customer and route; contact rows show the customer and both optional contact methods. Quote details group customer, move and additional-planning information, while contact details group customer and message information. Technical payload JSON remains a secondary Core disclosure and the generic `received`, `in_progress`, `resolved` lifecycle is unchanged.

`requestedServices` deliberately remains outside the primary typed view in presentation v1. Its persisted values are stable application enum slugs, while Core's bounded `list` kind does not support per-item value-to-label mappings. The raw secondary disclosure retains the data. Adding a generic bounded mapped-list capability, if ever justified by multiple applications, is a separate Core enhancement rather than an R2.9D payload change.

## R2.10B.1 application-aware Admin shell

Deploy all seven manifests above together to the separate Core runtime. `application/admin-shell.json` uses Core's v1 data-only shell contract; it is deployment metadata, not a Nuxt secret or a database setting. Restart Core after changing a manifest. No Core source changes are required.

The stable **MoveCore Moving / Operations workspace** identity names the application, not the editable `moving.business.companyName` or the fictional Northline demo company. Operations (Overview, Leads) comes first, followed by Content (Content, Media), Site (Navigation, Business settings, SEO & URLs), and System (Audit). All eight capabilities remain visible. Leads covers existing Quote and Contact requests, not a CRM; record labels remain exclusively in `submission-presentations.json`. Business settings is truthful because `moving.business` is the only buyer-facing Setting and now has a complete typed profile. Core continues to own routes, permissions and active-state behavior.

The application shell and submission presentation labels use English; page-owned Core copy and controls may remain Turkish. This known localization/product-polish gap is not solved by the shell profile.

## R2.10C.2A business Setting normalization

The canonical `moving.business` v2 value stores buyer-editable sources rather than derived navigation values. A displayed phone derives its safe fixed-scheme `tel:` link, an email address derives `mailto:`, and an optional `whatsappUrl` creates the runtime WhatsApp action. A top-level `primaryPhoneDial` is retained only when display and dial values genuinely differ; `whatsappLabel` remains independent optional presentation copy. Opening hours and social links remain bounded ordered source collections, while `logoAssetId` remains a Core Media identity.

`parseBusinessIdentity` is the single version boundary and continues to give every public component the unchanged runtime `BusinessIdentity` projection. It reads legacy v1 without mutation and canonical v2, while `business:convert-v2` performs a pure local conversion and writes JSON only to standard output. `application/setting-editor-profiles.json` now maps every buyer-editable v2 source to current Core fields without exposing `schemaVersion`, derived `tel:`/`mailto:` values or raw asset IDs.

Validate all seven manifests with the actual already-built, read-only Core runtime loaders (no database connection):

```powershell
$env:MOVECORE_CORE_ROOT = 'C:\Users\monster\Desktop\MOVECORE\core-cms'
node scripts/verify-core-admin-shell.mjs
```

## Known current limitations

- Generic Core publication does not enforce these application-owned payload contracts; the server parser remains the fail-closed runtime boundary.
- Editor-profile metadata and application parsers are separate artifacts and require consistency tests to prevent drift.
- Related-service and nearby-area links are textual href references, not relational entities.
- `moving.location` is a bounded content record, not a geo database or bulk SEO system.
- Media publication and content publication remain separate Core lifecycles rather than one atomic application transaction.
- The Moving Admin shell and Business Settings profile are application-aware, but page-owned Core controls remain partly Turkish; global localization remains a separate milestone.
- There is no email/CRM notification, CAPTCHA, pricing calculator, article taxonomy or location hierarchy.
- Editor Profiles are presentation metadata, not an application schema publish guard; malformed published Article payloads fail closed at the Moving parser boundary.
- Demo imagery is deterministic illustration, not final commercial photography.
- The theme provides presentation only. Real published content, URLs, SEO, navigation and media still require compatible Core configuration.
