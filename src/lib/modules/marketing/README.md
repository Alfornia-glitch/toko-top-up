# marketing

Coupons, gift cards and newsletter subscriptions.

## Public API

- `index.ts`: DTOs (`Coupon`, `GiftCard`, `GiftCardDetail`, `NewsletterSubscription`, …).
- `server.ts`: `createMarketingServices({ ..., usage })` returning `{ marketing }`.

## Owned tables

- `marketing_coupons`
- `marketing_gift_cards`, `marketing_gift_card_transactions` — `purchaser_user_id` and `order_id` are plain ids, not foreign keys.
- `marketing_newsletter_subscriptions` — `user_id` is a plain id, not a foreign key.

## Ports

- `CouponUsageReader` — counts redemptions of a coupon so a redeemed coupon cannot be deleted. Redemptions (`coupon_redemptions`) and `marketing_coupons.used_count` are still written by legacy checkout inside the order transaction, so the runtime supplies the adapter (`src/lib/server/adapters/coupon-usage.ts`).

## Known debt

- Legacy `cart` and `checkout` still read and update `marketing_coupons` directly through `#db/query.ts`, and `coupon_redemptions`, `carts` and `orders` keep foreign keys to it. Remove when `cart`, `checkout` and `orders` migrate and redemption moves behind this module.

## Events

- Emits and consumes none.

## Permissions

- Coupon, gift card and subscription administration requires `admin:access`.
- `listMyGiftCards`, `getMySubscription` and `setMySubscriptionStatus` act on the calling actor; `subscribe` needs no actor.
- Customer gift card views omit recipient details and the purchasing order.

## Allowed dependencies

- `shared` only.
