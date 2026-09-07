# Moving business Setting v2

`moving.business` remains the single public Setting identity. Its canonical persisted value is buyer-editable source data:

```json
{
  "schemaVersion": 2,
  "companyName": "Example Moving Company",
  "logoAssetId": "asset:company-logo",
  "primaryPhone": "+1 202-555-0100",
  "whatsappUrl": "https://wa.me/12025550100",
  "whatsappLabel": "Message on WhatsApp",
  "email": "hello@example.test",
  "address": "100 Example Avenue",
  "openingHours": [
    { "label": "Monday to Friday", "value": "08:00 to 18:00" }
  ],
  "socialLinks": [
    { "label": "Instagram", "href": "https://example.test/instagram" }
  ]
}
```

`companyName` and `primaryPhone` are required. Every other scalar is optional; `openingHours` and `socialLinks` normalize to empty arrays when absent. `primaryPhoneDial` is an optional advanced source value used only when the actual dial target differs from the displayed phone. `schemaVersion` is application metadata and must not be buyer-editable.

The persisted model is not the public component model. `parseBusinessIdentity` reads legacy v1 or canonical v2 and returns the stable runtime `BusinessIdentity`: it derives the fixed `tel:` scheme, derives `mailto:` from the email address, and creates the optional WhatsApp action only when `whatsappUrl` exists. Header, footer and contact components remain version-unaware.

Legacy v1 values remain readable without mutation, but the typed form intentionally targets canonical v2 only. For an existing installation, export only the current `moving.business` JSON value to a local file, then run:

```powershell
npm run business:convert-v2 -- C:\safe\local\business-setting-v1.json
```

The command validates the input and prints canonical v2 JSON to standard output; it never connects to Core or writes a database. Review the output, update the value through an authorized controlled workflow, verify it, then enable `application/setting-editor-profiles.json`. An unconverted v1 value opens Core's non-destructive incompatible-data recovery state; the typed form never repairs or overwrites it automatically.

## Current Core editor compatibility

| Persisted property | Core field kind | Requirement |
|---|---|---|
| `companyName` | `text` | required |
| `logoAssetId` | `media`, image only | optional |
| `primaryPhone` | `phone` | required |
| `primaryPhoneDial` | `phone` | optional advanced override |
| `whatsappUrl` | `url` | optional |
| `whatsappLabel` | `text` | optional |
| `email` | `email` | optional |
| `address` | `multiline` | optional |
| `openingHours` | `repeater` of required `label`/`value` text fields, maximum 14 | optional/empty |
| `socialLinks` | `repeater` of required `label` text and `href` URL fields, maximum 8 | optional/empty |

All optional values are top-level scalars. There is no optional nested-object lifecycle and no schema or Core migration. Fresh installations receive v2 directly from `application/setting-definitions.json` and can load the typed form immediately.

## Typed Business Settings integration

Configure Core with both application-owned manifests:

```text
CORE_CMS_SETTING_DEFINITIONS_FILE=<absolute path>/application/setting-definitions.json
CORE_CMS_SETTING_EDITOR_PROFILES_FILE=<absolute path>/application/setting-editor-profiles.json
```

The **Business details** form groups company identity, contact information, opening hours and social profiles. It never exposes `schemaVersion`, raw Media IDs, `tel:` or `mailto:` values. Core's complete-value copy-on-write editor preserves `schemaVersion` and unknown safe siblings, keeps repeater order, enforces optimistic concurrency, and applies its existing Settings and Media permissions. Selecting, changing or clearing the logo uses the existing image-only Media picker and Core's reliable media-usage lifecycle.
