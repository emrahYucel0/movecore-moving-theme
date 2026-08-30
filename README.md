# MoveCore Nuxt Starter

MoveCore Nuxt Starter is the independent Nuxt 4 SSR frontend foundation for applications that consume Core CMS through its versioned Public HTTP API.

The current milestone is **R1.5B — starter-owned structured page rendering**. Root and catch-all pages resolve through Core CMS, while the starter validates and renders its own `site.page` content contract. Core page SEO still drives document metadata, and `/sitemap.xml` still renders Core's paginated public sitemap.

## Requirements

- Node.js 24 LTS (`>=24.11.0 <25`)
- npm 11

## Local development

```bash
npm install
npm run dev
```

Type-check the application:

```bash
npm run typecheck
```

Create and preview a production build:

```bash
npm run build
npm run preview
```

## Architecture boundary

This repository is a frontend consumer. It **must not**:

- access Prisma or MySQL directly;
- import Core persistence adapters;
- import Core domain packages as an integration shortcut;
- access Ege models or its database;
- contain Core Admin functionality.

Communication with Core CMS occurs only through the versioned Public HTTP boundary. The server-only client reads `NUXT_CORE_BASE_URL`; it must never be exposed through `runtimeConfig.public`.

Multilingual and i18n support is a future architectural milestone. It is intentionally not implemented in R1.4, and this foundation does not impose a locale-specific route architecture.

## Core CMS Public HTTP client

R1.2 adds a typed client under `server/core`. It uses only Core CMS `/v1` Public HTTP reads and is created lazily when server code requests it. The browser never receives the Core backend origin.

Private runtime configuration:

```text
NUXT_CORE_BASE_URL=http://127.0.0.1:3000
NUXT_CORE_REQUEST_TIMEOUT_MS=5000
NUXT_CORE_PRIMARY_NAVIGATION_ID=primary
NUXT_CORE_SITE_SETTING_NAMESPACE=site
NUXT_CORE_SITE_SETTING_KEY=foundation
NUXT_CORE_FOUNDATION_MEDIA_ID=foundation-image
```

The timeout is optional and bounded by the client. All selectors are optional; blank selectors disable that foundation resource without a Core request. These private values never belong under `runtimeConfig.public` or a `NUXT_PUBLIC_*` variable. The client has no database access, Core package imports, credentials, mutations, retries, or Admin integration.

## Core-backed public routes

Both `/` and the catch-all Nuxt page call one fixed-purpose internal server endpoint. That endpoint resolves the pathname with Core's page resolver; its projection already includes published content, so normal page rendering never performs a second content request. Core redirects become Nuxt `301`/`302` responses, missing pages become real `404` responses, and invalid or unavailable upstream states remain distinct `400`, `502`, or `503` failures.

The public renderer supports the starter-owned `site.page` contract. The fixed-purpose page endpoint validates the published payload, resolves deduplicated media references server-side, and sends a narrow render-facing view model to semantic SSR. Unsupported content types, malformed application content, missing media, and non-image assets used in image slots fail locally without exposing raw payloads.

## Application-owned Editor Profile

The versioned Admin Editor Profile manifest is committed at
`application/editor-profiles.json`. A Core deployment may load it with an
absolute path outside Core's repository:

```text
CORE_CMS_EDITOR_PROFILES_FILE=<absolute-path-to-starter>\application\editor-profiles.json
```

The starter owns the `site.page` meaning and payload interpretation. Core only
validates the generic profile structure and exposes it to Admin; Core remains
unaware of the profile's application semantics. Core must be restarted after a
manifest change.

The authoring flow is deliberately small:

1. Core loads the starter manifest and exposes the structured Site Page editor.
2. An editor creates and publishes content with type `site.page`.
3. URL/SEO associates that content resource with a canonical path.
4. Nuxt resolves the path through Core Public HTTP.
5. The starter validates the `site.page` payload and ignores unknown fields.
6. Referenced public images are resolved once per distinct asset ID.
7. Nuxt renders semantic SSR HTML while Core SEO remains independent metadata.

Sector-neutral payloads under `application/examples` are documentation and test
fixtures only. They are not database seeds and are never written to Core.

## Public site composition

R1.4 adds one fixed-purpose internal site endpoint for the configured Navigation, public Setting, and foundation Media projections. It is not a generic Core proxy. Internal navigation uses Nuxt links, external destinations remain normal public anchors, setting JSON is escaped, and an image projection may render its Core-provided public asset URL. A public media URL is intentionally browser-visible and is distinct from the private Core backend origin.

Absolute canonical and sitemap URLs require the validated public origin:

```text
NUXT_PUBLIC_SITE_URL=https://example.com
```

Missing or invalid site-origin configuration fails page SEO and sitemap requests with a sanitized `503`; the production build itself does not require it. Core-provided title, description, index/follow choices, and canonical path drive page metadata independently from the visible `site.page` title. `/sitemap.xml` follows every Core `nextAfter` cursor, escapes XML, and rejects repeating pagination cursors. The optional R1.4 setting and foundation-media proof remains intact for later R1.6 onboarding cleanup.
