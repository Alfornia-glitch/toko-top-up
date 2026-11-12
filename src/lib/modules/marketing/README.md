# marketing

Coupons, gift cards and newsletter subscriptions.

## Public API

- `index.ts`: DTOs (`Coupon`, `GiftCard`, `GiftCardDetail`, `NewsletterSubscription`, …).
- `server.ts`: `createMarketingServices({ db, provider })` returning `{ marketing }`.

## Owned tables

- `marketing_coupons`
- `marketing_coupon_redemptions` — `order_id` and `user_id` are plain ids; unique per (coupon, order).
- `marketing_gift_cards`, `marketing_gift_card_transactions` — `purchaser_user_id` and `order_id` are plain ids, not foreign keys.
- `marketing_newsletter_subscriptions` — `user_id` is a plain id, not a foreign key.

## Service-to-service API

- `getCouponById`, `getCouponByCode`, `validateCouponForCart` and `redeemCoupon` need no actor; they are called by cart and checkout. `redeemCoupon` is idempotent per (coupon, order) and returns a 409 when `maxUses` is already reached.
- `discountFor` and `isCouponApplicable` are pure helpers exported from `index.ts`.

## Events

- Emits and consumes none.

## Permissions

- Coupon, gift card and subscription administration requires `admin:access`.
- `listMyGiftCards`, `getMySubscription` and `setMySubscriptionStatus` act on the calling actor; `subscribe` needs no actor.
- Customer gift card views omit recipient details and the purchasing order.

## Allowed dependencies

- `shared` only.
