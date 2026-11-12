# content

Storefront CMS: banners, announcements, testimonials, media asset records and site settings.

## Public API

- `index.ts`: DTOs (`ContentItem`, `ContentKind`, `MediaAsset`, `SiteSetting`, …).
- `server.ts`: `createContentServices()` returning `{ content }`.

## Owned tables

- `content_banners`, `content_announcements`, `content_testimonials`
- `content_media_assets` — `uploaded_by` is a plain user id, not a foreign key.
- `content_site_settings` — `updated_by` is a plain user id, not a foreign key.

## Events

- Emits and consumes none.

## Permissions

- Item, media and stats operations require `admin:access`; recording an upload only requires an actor.
- Settings writes require `super:access`; reading settings and public content needs no actor.

## Allowed dependencies

- `shared` only. The uploaded file itself lives in `src/lib/server/modules/storage`; callers delete the file, then the row.
