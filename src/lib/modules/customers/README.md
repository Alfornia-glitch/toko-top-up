# customers

Customer-owned records (addresses, wishlists) and the admin customer directory.

## Public API

- `index.ts`: DTOs (`Address`, `AddressInput`, `WishlistEntry`, `CustomerSummary`, `CustomerDetail`, …).
- `server.ts`: `createCustomersServices({ ..., directory })` returning `{ customers }`.

## Owned tables

- `customers_addresses` — `user_id` is a plain user id, not a foreign key.
- `customers_wishlists` — `user_id` and `product_id` are plain ids, not foreign keys. Wishlist reads skip products that no longer exist.

## Ports

- `CustomerDirectory` — read-only view of user accounts and order history. The module does not own those tables, so the runtime supplies the adapter (`src/lib/server/adapters/customer-directory.ts`).

## Events

- Emits and consumes none.

## Permissions

- Address and wishlist operations act on the calling actor's own records and need only an authenticated actor.
- The directory (`listCustomers`, `getCustomer`) requires `admin:access`.
- Adding to a wishlist does not check that the product exists or is active; the caller (`account/wishlist.ts`) does.

## Allowed dependencies

- `shared` only.
