# checkout

Orchestrates turning a cart into a paid order. It owns no tables.

## Public API

- `index.ts`: `CheckoutInput`, `PlacedOrder`, `CheckoutSettings`, `ShippingMethod`.
- `server.ts`: `createCheckoutServices({ cart, catalog, customers, marketing, orders, settings })` returning `{ checkout }`.

## The flow (`placeOrder`)

1. Validate: the cart is not empty, the address belongs to the buyer, the shipping method exists, every item is still available in the requested quantity.
2. Reserve stock with `catalog.inventory.reserve` (a guarded decrement, so concurrent buyers cannot oversell).
3. Create the order, its items, a `placed` event and the payment with `orders.createOrder` (one transaction).
4. Redeem the coupon, when a discount applies, with `marketing.redeemCoupon`.
5. Mark the cart converted.

There is no cross-module transaction. Instead, a failure in step 3 releases the reserved stock, and a failure in step 4 cancels the order (`orders.cancelOrder`) and releases the stock. A crash between steps can still leave reserved stock or an uncounted redemption; the movements are recorded against the order id so they can be reconciled.

## Ports

- `CheckoutSettings` — shipping methods and the default currency come from site settings, so the runtime supplies the adapter (`src/lib/server/adapters/checkout-settings.ts`).

## Dependencies on other modules

- `cart`, `catalog` (products, inventory), `customers`, `marketing`, `orders` services.

## Events

- Emits and consumes none (inventory emits its own adjusted events).

## Allowed dependencies

- `shared` and the public entries of the modules above.
