# content

Storefront CMS: banners, announcements, testimonials, media asset records, site settings and product reviews.

## Public API

- `index.ts`: DTOs (`ContentItem`, `ContentKind`, `MediaAsset`, `SiteSetting`, …).
- `server.ts`: `createContentServices({ ..., directory })` returning `{ content, reviews }`.

## Owned tables

- `content_banners`, `content_announcements`, `content_testimonials`
- `content_media_assets` — `uploaded_by` is a plain user id, not a foreign key.
- `content_site_settings` — `updated_by` is a plain user id, not a foreign key.
- `content_reviews`, `content_review_images` — `product_id` and `user_id` are plain ids, not foreign keys; images cascade with their review.

## Ports

- `ReviewDirectory` — read-only lookup of reviewer accounts and product names. The module owns neither, so the runtime supplies the adapter (`src/lib/server/adapters/review-directory.ts`, which uses the catalog `getProductNames`).

## Events

- Emits and consumes none.

## Permissions

- Item, media and stats operations require `admin:access`; recording an upload only requires an actor.
- Review moderation (`listReviews`, `setReviewStatus`) requires `admin:access`; `listApprovedReviews` and `getRatingBuckets` are public and show approved reviews only.
- Settings writes require `super:access`; reading settings and public content needs no actor.

## Not yet

- There is no customer-facing way to submit a review; rows are created by seeding.

## Allowed dependencies

- `shared` only. The uploaded file itself lives in `src/lib/server/platform/storage`; callers delete the file, then the row.
