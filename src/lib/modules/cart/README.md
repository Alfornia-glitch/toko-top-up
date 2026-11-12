# cart

Shopping carts for guests and signed-in customers.

## Public API

- `index.ts`: DTOs (`Cart`, `CartItem`, `CartCoupon`).
- `server.ts`: `createCartServices({ ..., catalog, marketing })` returning `{ cart }`.

## Owned tables

- `cart_carts` — `user_id` and `coupon_id` are plain ids, not foreign keys.
- `cart_items` — `variant_id` is a plain id. Items whose variant no longer exists are dropped from the cart view.

## Dependencies on other modules

- `catalog`: `products.getVariantSnapshots` for prices, stock, names and images.
- `marketing`: `getCouponById`, `validateCouponForCart` and the pure `discountFor` / `isCouponApplicable`.

## Behaviour notes

- Carts are addressed by id (the `cart_id` cookie); there is no actor. The route layer owns the cookie, the module owns finding, creating and merging carts (`resolveCart`).
- Signing in merges the guest cart into the user's active cart in one transaction, clamping quantities to stock.
- Cart item prices are the price at the time the item was added; checkout re-reads current prices.

## Events

- Emits and consumes none.

## Allowed dependencies

- `shared`, `catalog` and `marketing` public entries.
