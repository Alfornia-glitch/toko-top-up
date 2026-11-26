-- Divides every stored money value by 100 (cents -> whole rupiah).
--
-- Run AFTER `pnpm run db:push` has renamed the columns (price_cents -> price, etc.),
-- and after a backup:
--   cp data/ecommerce.sqlite data/ecommerce.before-divide.sqlite
--   sqlite3 data/ecommerce.sqlite < scripts/sql/divide-amounts-by-100.sqlite.sql
--
-- Safe to re-run: the marker row below makes a second run fail before any UPDATE.
-- `.bail on` stops at the first error, so the open transaction is never committed.
.bail on

BEGIN TRANSACTION;

-- Marker table. Not in the drizzle schema, so push may ask whether to drop it: answer no.
CREATE TABLE IF NOT EXISTS data_migrations (
	name TEXT PRIMARY KEY,
	applied_at INTEGER NOT NULL DEFAULT (unixepoch())
);
INSERT INTO data_migrations (name) VALUES ('divide-amounts-by-100');

UPDATE cart_items SET unit_price = CAST(ROUND(unit_price / 100.0) AS INTEGER);

UPDATE catalog_products
SET price = CAST(ROUND(price / 100.0) AS INTEGER),
    compare_at_price = CAST(ROUND(compare_at_price / 100.0) AS INTEGER);

UPDATE catalog_product_variants
SET price = CAST(ROUND(price / 100.0) AS INTEGER),
    compare_at_price = CAST(ROUND(compare_at_price / 100.0) AS INTEGER);

-- `value` is a percentage for type 'percentage' (unchanged) and an amount for 'fixed'.
UPDATE marketing_coupons
SET min_subtotal = CAST(ROUND(min_subtotal / 100.0) AS INTEGER),
    value = CASE WHEN type = 'fixed' THEN CAST(ROUND(value / 100.0) AS INTEGER) ELSE value END;

UPDATE marketing_gift_cards
SET initial_amount = CAST(ROUND(initial_amount / 100.0) AS INTEGER),
    balance = CAST(ROUND(balance / 100.0) AS INTEGER);

UPDATE marketing_gift_card_transactions SET amount = CAST(ROUND(amount / 100.0) AS INTEGER);

UPDATE marketing_coupon_redemptions SET amount = CAST(ROUND(amount / 100.0) AS INTEGER);

UPDATE orders_orders
SET subtotal = CAST(ROUND(subtotal / 100.0) AS INTEGER),
    discount = CAST(ROUND(discount / 100.0) AS INTEGER),
    shipping = CAST(ROUND(shipping / 100.0) AS INTEGER),
    tax = CAST(ROUND(tax / 100.0) AS INTEGER),
    grand_total = CAST(ROUND(grand_total / 100.0) AS INTEGER);

UPDATE orders_items
SET unit_price = CAST(ROUND(unit_price / 100.0) AS INTEGER),
    total = CAST(ROUND(total / 100.0) AS INTEGER);

UPDATE orders_payments SET amount = CAST(ROUND(amount / 100.0) AS INTEGER);

UPDATE orders_returns SET refund_amount = CAST(ROUND(refund_amount / 100.0) AS INTEGER);

-- QRIS: total_amount = base_amount + unique code (1-999). Only the base was in
-- cents, so scale it and keep the code. Both SET expressions read the old values.
UPDATE payments_orders
SET total_amount = CAST(ROUND(base_amount / 100.0) AS INTEGER) + (total_amount - base_amount),
    base_amount = CAST(ROUND(base_amount / 100.0) AS INTEGER);

COMMIT;
