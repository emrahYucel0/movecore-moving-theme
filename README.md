# MoveCore Nuxt Starter

A production-oriented Nuxt 4 SSR starter for public applications backed by the versioned Core CMS Public HTTP API. The starter owns rendering and the `site.page` application contract; Core owns published content, routing, SEO, navigation, settings, media projections, and sitemap inventory.

## Requirements

- Node.js 24 LTS (`>=24.11.0 <25`)
- npm 11

## Five-minute offline demo

The demo is explicit and local-only. It starts a deterministic mock Core on `127.0.0.1:4010`, tiny public demo media on `127.0.0.1:4011`, and Nuxt dev on `127.0.0.1:3000`; it needs no database, Docker, Core checkout, network, or production service.

```bash
npm install
npm run dev:demo
```

Open `http://127.0.0.1:3000`. Press Ctrl+C once to stop every demo process. Startup fails clearly if any fixed demo port is already occupied.

Demo routes:

- `/` and `/about`: typed `site.page` SSR pages with navigation and public media
- `/old`: permanent `301` redirect to `/about`
- `/temporary`: temporary `302` redirect to `/about`
- `/missing`: safe `404` page
- `/sitemap.xml`: absolute public sitemap

Demo content is a fixture, not a seed. The command never starts implicitly from `npm run dev` or a production build.

## Connect a real Core CMS

Create `.env` from `.env.example`, provide a reachable Core Public HTTP origin, and start normal development:

```bash
npm run dev
```

The real-Core setup is:

1. Start/configure Core CMS `v1.0.0-rc.2`.
2. Copy, mount, or otherwise make `application/editor-profiles.json` available on Core's filesystem.
3. Set Core's `CORE_CMS_EDITOR_PROFILES_FILE` to that absolute path and restart Core.
4. Configure the starter's private Core base URL and optional composition selectors.
5. Configure the starter's public site URL.
6. Run `npm run dev`.

```text
NUXT_CORE_BASE_URL=http://127.0.0.1:4000
NUXT_CORE_REQUEST_TIMEOUT_MS=5000
NUXT_CORE_PRIMARY_NAVIGATION_ID=primary
NUXT_CORE_SITE_SETTING_NAMESPACE=site
NUXT_CORE_SITE_SETTING_KEY=foundation
NUXT_CORE_FOUNDATION_MEDIA_ID=foundation-image
NUXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
```

`NUXT_CORE_BASE_URL` and every `NUXT_CORE_*` selector are private server configuration. Blank optional selectors disable that composition read. `NUXT_PUBLIC_SITE_URL` is intentionally public and supplies the absolute canonical/sitemap origin; it must not point to the private Core backend.

## Application-owned Editor Profile

The only supported application content type is `site.page`. Its versioned Editor Profile lives at `application/editor-profiles.json` and is validated against the same fields consumed by the SSR parser.

Core must be able to read that file at runtime. Mount the starter directory into the Core host/container, or copy the versioned manifest into a deployment-owned configuration directory, then give Core an absolute path:

```text
CORE_CMS_EDITOR_PROFILES_FILE=C:\absolute\path\to\application\editor-profiles.json
```

For a container this can be a mounted path such as `/app-config/editor-profiles.json`. Restart Core after changing the manifest. If the file is absent, not mounted, unreadable, or not configured, the structured profile will not be available in Admin. Do not copy application semantics into Core source code.

## Authoring and publishing flow

1. Make the starter manifest available to Core and configure `CORE_CMS_EDITOR_PROFILES_FILE`.
2. Restart Core and confirm Admin exposes the Site Page editor for `site.page`.
3. Create content with the structured fields defined by the profile.
4. Select public image assets for media fields; Core stores asset references, not presentation markup.
5. Publish the content revision.
6. Associate its content resource with a canonical URL and independent SEO metadata in Core.
7. Publish/configure the primary navigation and any optional site setting/media selectors.
8. Request the route in Nuxt; the server resolves, validates, composes media, and renders semantic HTML.

Files under `application/examples` are documentation and parser fixtures only. They are not database seeds, are not written to Core, and are not loaded by the demo as business data.

## Runtime architecture

The browser talks only to Nuxt. Nuxt server code calls fixed Core `/v1` Public HTTP reads; there is no generic proxy, Prisma/MySQL access, Core package import, Ege dependency, Admin API, credential forwarding, mutation, or retry loop.

Nuxt does not own or impose the CMS URL structure. Core's URL resolver owns canonical paths, so `/about`, `/services/example`, `/example`, or `/tr/example` can all work when the application configures them. Public routing remains Core-owned:

- `/` and the catch-all page resolve a normalized path through Core.
- Published page projections include content and independent SEO metadata.
- Core `301`/`302` decisions remain redirects; missing pages remain `404`.
- Malformed local application content is `500`, invalid Core protocol is `502`, and unavailable Core is `503`.
- The public error page preserves safe status codes, exposes no upstream details, and provides a home recovery action.

The fixed `/api/_movecore/site` endpoint retains Navigation, Setting, and foundation Media composition without rendering transport/debug JSON in the public shell. Internal navigation uses Nuxt links; external destinations use normal anchors.

## Content, SEO, media, and sitemap boundaries

Core Content intentionally accepts application-defined opaque JSON and generic publication does not enforce the `site.page` schema. Editor Profiles improve structured authoring but do not make application payload interpretation a Core responsibility. The starter validates the payload during public composition; unknown fields are ignored, while unsupported types and invalid required fields fail closed. This is an application-contract validation limitation and a future hardening opportunity, not a security vulnerability.

The visible heading comes from `site.page.title`; SEO title, description, canonical path, index, and follow come from Core's separate page SEO projection. Do not duplicate SEO fields inside `site.page`. `NUXT_PUBLIC_SITE_URL` supplies the public origin. `/sitemap.xml` reads all paginated Core sitemap entries, escapes XML, and rejects repeating cursors.

Core Media owns the asset projection, public URL, and dimensions; `site.page` owns usage-specific alt text. Public image references are deduplicated and resolved server-side through Core Public HTTP, then narrowed before they reach rendering. Core media creation and content publication are separate operations; authoring across those resources is not an atomic transaction, so applications must not assume that it is.

## Validation

Run the portable release gate on Windows, macOS, or Linux:

```bash
npm run verify
```

It runs tests, Nuxt type checking, and a production build in order. Additional production-runtime smoke coverage uses the same shared mock Core as the demo:

```bash
npm run smoke:production
npm audit --omit=dev
npm audit
```

## Current limits

- Exactly one application profile: `site.page`
- No multilingual/i18n route architecture
- No theme system or visual page builder
- No application-specific R2 content types
- No direct database, Core Admin, production deployment, or migration behavior

R2 can add application-owned profiles and renderers without changing the Public HTTP boundary established here.
