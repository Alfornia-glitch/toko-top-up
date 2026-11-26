-- Divides every stored money value by 100 (cents -> whole rupiah).
--
-- Run AFTER `pnpm run db:push` has renamed the columns (price_cents -> price, etc.),
-- and after a backup:
--   pg_dump "$DIRECT_URL" > backup-before-divide.sql
--   psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f scripts/sql/divide-amounts-by-100.postgres.sql
--
-- Safe to re-run: the marker row below makes a second run fail before any UPDATE.
-- Everything is one transaction, so a failure rolls back the marker too.
\set ON_ERROR_STOP on

BEGIN;

-- Marker table lives in `public`, outside the `shop` schema drizzle manages.
CREATE TABLE IF NOT EXISTS public.data_migrations (
	name text PRIMARY KEY,
	applied_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.data_migrations (name) VALUES ('divide-amounts-by-100');

UPDATE shop.cart_items SET unit_price = ROUND(unit_price / 100.0)::integer;

UPDATE shop.catalog_products
SET price = ROUND(price / 100.0)::integer,
    compare_at_price = ROUND(compare_at_price / 100.0)::integer;

UPDATE shop.catalog_product_variants
SET price = ROUND(price / 100.0)::integer,
    compare_at_price = ROUND(compare_at_price / 100.0)::integer;

-- `value` is a percentage for type 'percentage' (unchanged) and an amount for 'fixed'.
UPDATE shop.marketing_coupons
SET min_subtotal = ROUND(min_subtotal / 100.0)::integer,
    value = CASE WHEN type = 'fixed' THEN ROUND(value / 100.0)::integer ELSE value END;

UPDATE shop.marketing_gift_cards
SET initial_amount = ROUND(initial_amount / 100.0)::integer,
    balance = ROUND(balance / 100.0)::integer;

UPDATE shop.marketing_gift_card_transactions SET amount = ROUND(amount / 100.0)::integer;

UPDATE shop.marketing_coupon_redemptions SET amount = ROUND(amount / 100.0)::integer;

UPDATE shop.orders_orders
SET subtotal = ROUND(subtotal / 100.0)::integer,
    discount = ROUND(discount / 100.0)::integer,
    shipping = ROUND(shipping / 100.0)::integer,
    tax = ROUND(tax / 100.0)::integer,
    grand_total = ROUND(grand_total / 100.0)::integer;

UPDATE shop.orders_items
SET unit_price = ROUND(unit_price / 100.0)::integer,
    total = ROUND(total / 100.0)::integer;

UPDATE shop.orders_payments SET amount = ROUND(amount / 100.0)::integer;

UPDATE shop.orders_returns SET refund_amount = ROUND(refund_amount / 100.0)::integer;

-- QRIS: total_amount = base_amount + unique code (1-999). Only the base was in
-- cents, so scale it and keep the code. Both SET expressions read the old values.
UPDATE shop.payments_orders
SET total_amount = ROUND(base_amount / 100.0)::integer + (total_amount - base_amount),
    base_amount = ROUND(base_amount / 100.0)::integer;

COMMIT;
