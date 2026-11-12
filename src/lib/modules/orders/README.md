# orders

Orders, their items, timeline events, shipments and payments, for customers and the admin back office.

## Public API

- `index.ts`: DTOs (`Order`, `AdminOrderDetail`, `CustomerOrderDetail`, `CreateOrderInput`, …) and `ORDER_TRANSITIONS`.
- `server.ts`: `createOrdersServices({ ..., users })` returning `{ orders }`.

## Owned tables

- `orders_orders` — `user_id` and `coupon_id` are plain ids, not foreign keys.
- `orders_items` — `variant_id` and `product_id` are plain ids; the name, SKU, image and price are snapshots, so history survives product changes.
- `orders_events`, `orders_shipments`, `orders_payments` — cascade with their order; `actor_user_id` is a plain id.

## Ports

- `OrdersUserDirectory` — read-only lookup of user names and emails (and search by name or email). The module does not own user accounts, so the runtime supplies the adapter (`src/lib/server/adapters/orders-users.ts`).

## Service-to-service API

- `createOrder` — used by checkout. Inserts the order, items, a `placed` event and the payment in one transaction and returns the generated order number.
- `cancelOrder` — compensation used by checkout when a later step fails. Marks the order cancelled and its payment refunded; idempotent.

## Events

- Emits and consumes none.

## Permissions

- Admin operations (`listOrders`, `getOrder`, `updateOrder`, `createShipment`) require `admin:access`.
- `listMyOrders` and `getMyOrder` act on the calling actor's own orders; another user's order reads as not found.
- Status changes follow `ORDER_TRANSITIONS`; shipping is refused for pending, cancelled and refunded orders.

## Allowed dependencies

- `shared` only.
