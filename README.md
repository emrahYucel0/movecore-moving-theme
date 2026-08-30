# MoveCore Nuxt Starter

MoveCore Nuxt Starter is the independent Nuxt 4 SSR frontend foundation for applications that will consume Core CMS through its versioned Public HTTP API.

The current milestone is **R1.1 — foundation only**. It proves the Nuxt application, default layout, server rendering, strict TypeScript configuration, and Tailwind CSS 4 integration. Core CMS communication, dynamic content routes, navigation, settings, media, SEO, and editor profiles belong to later R1 milestones.

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

Future communication with Core CMS occurs only through the versioned Public HTTP boundary. `NUXT_CORE_BASE_URL` is reserved in `.env.example` for the future server-only client and must never be exposed through `runtimeConfig.public`.

Multilingual and i18n support is a future architectural milestone. It is intentionally not implemented in R1.1, and this foundation does not impose a locale-specific route architecture.
