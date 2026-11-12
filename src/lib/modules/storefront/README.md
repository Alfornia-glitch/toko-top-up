# storefront

The public shop, composed from other modules. It owns no tables.

## Public API

- `index.ts`: `SiteSettings`, `SiteShippingMethod`, `ProductReview`, `RatingBuckets`.
- `server.ts`: `createStorefrontServices({ catalog, content, customers, reviews })` returning `{ storefront }`.

## What it provides

- `getHome` — banners, announcements and testimonials (content) with categories, brands and the deal / new / featured / popular product rows (catalog).
- `listProducts`, `listCategories` — pass-through of catalog browsing.
- `getProduct` — the catalog product page plus approved reviews, rating buckets and up to 8 related products (same category or brand). 404 when the product is missing or not active.
- `getSiteSettings` — stored site settings layered over built-in defaults (contact details, social links, shipping methods, currency).
- `listWishlist`, `addToWishlist`, `removeFromWishlist` — the customer's wishlist with product cards. Adding fails with 404 unless the product is active.

## Ports

- `ProductReviewReader` — approved reviews and rating counts for a product. Reviews are not owned by a migrated module yet, so the runtime supplies the adapter (`src/lib/server/adapters/product-reviews.ts`); replace it when reviews move into `content`.

## Dependencies on other modules

- `catalog` (`browse`), `content`, `customers` services.

## Events

- Emits and consumes none.

## Permissions

- Browsing, product pages and site settings are public. Wishlist operations need an authenticated actor and act on that actor's own list.

## Allowed dependencies

- `shared` and the public entries of `catalog`, `content` and `customers`.
