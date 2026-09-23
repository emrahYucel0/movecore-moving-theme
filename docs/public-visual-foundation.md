# Public visual foundation

Six decisions the public theme now holds to. They exist so photography, type
and motion can be changed later without rediscovering why the system is shaped
this way.

## Display typography

The display role is **Archivo Narrow**, self-hosted from `public/fonts/`.

- Designer: Omnibus-Type.
- Licence: SIL Open Font License 1.1, copied verbatim to
  `public/fonts/OFL.txt`. It permits redistribution and self-hosting,
  including inside a sold product, provided the licence travels with the files
  and the family is not renamed.
- Upstream: <https://github.com/Omnibus-Type/ArchivoNarrow>.
- Two files, one variable axis (`wght` 400–700), split into the `latin` and
  `latin-ext` subsets by `unicode-range`. A Latin-only page fetches one file;
  a Turkish page fetches both and gets correct `Ğ ğ İ ı Ş ş` rather than
  fallback glyphs.
- The files sit at a stable public path rather than a fingerprinted one so the
  document can preload the Latin subset. Discovered only after `theme.css`
  parses, the face costs an extra round trip on a slow connection: measured on
  the repository's throttled profile it moved median LCP from 2348ms to 2580ms,
  past the 2500ms budget. With the preload it returns to the baseline. Latin
  Extended is deliberately not preloaded, since pages needing it are the
  exception.

The previous stack led with Arial Narrow, which ships with Windows and macOS
and **not** with Linux or Android. On those devices the condensed art direction
silently became a normal-width grotesque. The self-hosted face is now the
production path; the remaining families in `--theme-font-display` exist only to
cover a failed font load and are not what the design depends on.

Archivo Narrow tops out at `wght 700`, which is the weight Arial Narrow Bold
was already rendering. Every display rule reads `var(--theme-display-weight)`
so the declared weight cannot drift above what the face can produce.

## Media role contracts

Public images are content-owned: they resolve from the Core media catalogue by
`assetId`, so the theme never knows an image's real proportions. Each role
declares the shape it presents in, and the primitive crops whatever arrives:

| Role | Token | Ratio |
| --- | --- | --- |
| Home hero | `--theme-media-ratio-hero` | 4:3 |
| Service | `--theme-media-ratio-service` | 3:2 |
| Area | `--theme-media-ratio-area` | 16:9 |
| Article cover | `--theme-media-ratio-article` | 2:1 |

`.moving-media-image` reserves the ratio before the file arrives, fills it with
`object-fit: cover`, and paints a quiet product surface underneath so a slow
image reads as reserved space. Nothing measures anything in JavaScript, and the
`width`/`height` attributes stay on every `<img>`, so photography cannot shift
the layout.

A role ratio is the same at every viewport. A contract that changes per
breakpoint is not a contract.

`moving.article` currently carries no media field, so the article cover role is
declared but not yet consumed. Adding that field is a content-schema decision,
not a theme one.

## Content-owned media

No production photography lives in this repository, and none should. Images
belong to the Core media catalogue and reach the theme through published
content. The theme owns presentation: ratio, crop, priority and fallback.

## Missing media

Media is optional on most roles, so absence is a normal state rather than a
failure. When content carries no image the figure is not rendered at all and the
copy claims the freed columns — a type-and-rule composition in the product's own
language. There is no placeholder box, no broken-image icon, no collapsed band
and no invented stock image.

Media that is declared but fails to resolve in Core is a different case: the
page fails closed at the server parser, which is deliberate and unchanged.

## Zero radius

This product has no rounded, filled blocks. It is one of the things that keeps
the site from reading as a template, so it is an invariant rather than a habit:
`--theme-radius: 0` is declared wherever a user-agent default would otherwise
round something — form controls, buttons and the mobile conversion rail.

## Progressive motion

Motion is CSS only. There is no animation library and the production build
ships no client JavaScript.

The rule: **the default state of every animated element is its finished,
readable state.** Motion only ever begins from an animated state inside the
`@supports (animation-timeline: view())` gate, nested inside
`prefers-reduced-motion: no-preference`. Everything animated is a `::before` or
`::after` decoration; content is never animated and never hidden.

That means a browser without scroll-linked timelines (today Safari and Firefox)
and a reader who asked for reduced motion both get the complete composition,
statically. Static and complete is the correct degradation; identical animation
everywhere is not a goal.

## Mobile conversion chrome

Below `67.9375rem` the header drops its CALL block, which used to take the phone
number off the screen on the devices most likely to dial it. A fixed bottom rail
carries **Call** and **Get a quote** instead.

- HTML and CSS only; no script, no scroll listener.
- The phone comes from the same business projection the header and footer use;
  the quote link points at the site's existing `/quote` route. Neither is
  configured separately.
- The footer reserves the rail's height, so nothing is ever covered, including a
  form's submit button.
- It respects `safe-area-inset-bottom`, has 44px-plus targets and square corners.
- It hides itself while the navigation drawer is open, so only one phone control
  is ever on screen.
