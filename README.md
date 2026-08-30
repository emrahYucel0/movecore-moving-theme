# MoveCore Nuxt Starter

MoveCore Nuxt Starter is the independent Nuxt 4 SSR frontend foundation for applications that consume Core CMS through its versioned Public HTTP API.

The current milestone is **R1.3 — Core-backed public content routing**. The root and arbitrary catch-all paths now resolve published pages through Core CMS. Navigation, settings, media, and SEO composition remain R1.4 work; typed Editor Profile rendering arrives in R1.5.

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

Multilingual and i18n support is a future architectural milestone. It is intentionally not implemented in R1.3, and this foundation does not impose a locale-specific route architecture.

## Core CMS Public HTTP client

R1.2 adds a typed client under `server/core`. It uses only Core CMS `/v1` Public HTTP reads and is created lazily when server code requests it. The browser never receives the Core backend origin.

Private runtime configuration:

```text
NUXT_CORE_BASE_URL=http://127.0.0.1:3000
NUXT_CORE_REQUEST_TIMEOUT_MS=5000
```

The timeout is optional and bounded by the client. Neither value belongs under `runtimeConfig.public` or a `NUXT_PUBLIC_*` variable. The client has no database access, Core package imports, credentials, mutations, retries, or Admin integration.

## Core-backed public routes

Both `/` and the catch-all Nuxt page call one fixed-purpose internal server endpoint. That endpoint resolves the pathname with Core's page resolver; its projection already includes published content, so normal page rendering never performs a second content request. Core redirects become Nuxt `301`/`302` responses, missing pages become real `404` responses, and invalid or unavailable upstream states remain distinct `400`, `502`, or `503` failures.

The current renderer is a neutral SSR foundation view that safely displays the public content identity and escaped JSON payload. It does not interpret arbitrary HTML or assume a permanent content schema. R1.5 will replace it with typed Editor Profile renderers. The Core origin remains server-only, and R1.4 will add SEO, navigation, settings, and media composition.
