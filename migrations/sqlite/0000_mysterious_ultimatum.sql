CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `customers_addresses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`label` text,
	`recipient_name` text NOT NULL,
	`phone` text,
	`line1` text NOT NULL,
	`line2` text,
	`city` text NOT NULL,
	`region` text,
	`postal_code` text,
	`country` text NOT NULL,
	`is_default_shipping` integer DEFAULT false NOT NULL,
	`is_default_billing` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `customers_addresses_user_idx` ON `customers_addresses` (`user_id`);--> statement-breakpoint
CREATE TABLE `content_announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`link` text,
	`position` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `content_announcements_position_idx` ON `content_announcements` (`position`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`before_json` text,
	`after_json` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_log_actor_idx` ON `audit_log` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `audit_log_entity_idx` ON `audit_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_log_created_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `content_banners` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`title` text NOT NULL,
	`subtitle` text,
	`image_url` text NOT NULL,
	`mobile_image_url` text,
	`cta_label` text,
	`cta_url` text,
	`position` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `content_banners_key_idx` ON `content_banners` (`key`);--> statement-breakpoint
CREATE TABLE `catalog_brands` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`logo_url` text,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_brands_slug_unique` ON `catalog_brands` (`slug`);--> statement-breakpoint
CREATE INDEX `catalog_brands_status_idx` ON `catalog_brands` (`status`);--> statement-breakpoint
CREATE TABLE `cart_items` (
	`id` text PRIMARY KEY NOT NULL,
	`cart_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `catalog_product_variants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cart_items_cart_variant_idx` ON `cart_items` (`cart_id`,`variant_id`);--> statement-breakpoint
CREATE TABLE `carts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`coupon_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`coupon_id`) REFERENCES `marketing_coupons`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `carts_user_idx` ON `carts` (`user_id`);--> statement-breakpoint
CREATE INDEX `carts_status_idx` ON `carts` (`status`);--> statement-breakpoint
CREATE TABLE `reporting_catalog_products` (
	`product_id` text PRIMARY KEY NOT NULL,
	`sku` text NOT NULL,
	`status` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reporting_catalog_products_status_idx` ON `reporting_catalog_products` (`status`);--> statement-breakpoint
CREATE TABLE `catalog_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`parent_id` text,
	`description` text,
	`image_url` text,
	`position` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `catalog_categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_categories_slug_unique` ON `catalog_categories` (`slug`);--> statement-breakpoint
CREATE INDEX `catalog_categories_parent_idx` ON `catalog_categories` (`parent_id`);--> statement-breakpoint
CREATE INDEX `catalog_categories_position_idx` ON `catalog_categories` (`position`);--> statement-breakpoint
CREATE TABLE `coupon_redemptions` (
	`id` text PRIMARY KEY NOT NULL,
	`coupon_id` text NOT NULL,
	`order_id` text NOT NULL,
	`user_id` text,
	`amount_cents` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`coupon_id`) REFERENCES `marketing_coupons`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `coupon_redemptions_coupon_idx` ON `coupon_redemptions` (`coupon_id`);--> statement-breakpoint
CREATE TABLE `marketing_coupons` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`type` text NOT NULL,
	`value` integer NOT NULL,
	`min_subtotal_cents` integer DEFAULT 0 NOT NULL,
	`max_uses` integer,
	`used_count` integer DEFAULT 0 NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`applies_to_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `marketing_coupons_code_unique` ON `marketing_coupons` (`code`);--> statement-breakpoint
CREATE INDEX `marketing_coupons_status_idx` ON `marketing_coupons` (`status`);--> statement-breakpoint
CREATE TABLE `marketing_gift_card_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`gift_card_id` text NOT NULL,
	`order_id` text,
	`amount_cents` integer NOT NULL,
	`type` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`gift_card_id`) REFERENCES `marketing_gift_cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `marketing_gift_card_transactions_card_idx` ON `marketing_gift_card_transactions` (`gift_card_id`);--> statement-breakpoint
CREATE TABLE `marketing_gift_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`initial_amount_cents` integer NOT NULL,
	`balance_cents` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`recipient_name` text,
	`recipient_email` text,
	`purchaser_user_id` text,
	`order_id` text,
	`message` text,
	`delivered_at` integer,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `marketing_gift_cards_code_unique` ON `marketing_gift_cards` (`code`);--> statement-breakpoint
CREATE INDEX `marketing_gift_cards_code_idx` ON `marketing_gift_cards` (`code`);--> statement-breakpoint
CREATE INDEX `marketing_gift_cards_status_idx` ON `marketing_gift_cards` (`status`);--> statement-breakpoint
CREATE TABLE `catalog_inventory_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`variant_id` text NOT NULL,
	`delta` integer NOT NULL,
	`reason` text NOT NULL,
	`reference_type` text,
	`reference_id` text,
	`admin_user_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `catalog_product_variants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `catalog_inventory_movements_variant_idx` ON `catalog_inventory_movements` (`variant_id`);--> statement-breakpoint
CREATE TABLE `content_media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`path` text NOT NULL,
	`url` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`folder` text NOT NULL,
	`uploaded_by` text,
	`alt` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_media_assets_path_unique` ON `content_media_assets` (`path`);--> statement-breakpoint
CREATE INDEX `content_media_assets_folder_idx` ON `content_media_assets` (`folder`);--> statement-breakpoint
CREATE INDEX `content_media_assets_created_idx` ON `content_media_assets` (`created_at`);--> statement-breakpoint
CREATE TABLE `marketing_newsletter_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`preferences_json` text,
	`status` text DEFAULT 'subscribed' NOT NULL,
	`source` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `marketing_newsletter_subscriptions_email_unique` ON `marketing_newsletter_subscriptions` (`email`);--> statement-breakpoint
CREATE INDEX `marketing_newsletter_subscriptions_status_idx` ON `marketing_newsletter_subscriptions` (`status`);--> statement-breakpoint
CREATE TABLE `order_events` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`type` text NOT NULL,
	`message` text,
	`actor_user_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `order_events_order_idx` ON `order_events` (`order_id`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text,
	`variant_id` text,
	`product_name_snapshot` text NOT NULL,
	`sku_snapshot` text NOT NULL,
	`image_url_snapshot` text,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`total_cents` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `catalog_product_variants`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_number` text NOT NULL,
	`user_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`fulfillment_status` text DEFAULT 'unfulfilled' NOT NULL,
	`subtotal_cents` integer DEFAULT 0 NOT NULL,
	`discount_cents` integer DEFAULT 0 NOT NULL,
	`shipping_cents` integer DEFAULT 0 NOT NULL,
	`tax_cents` integer DEFAULT 0 NOT NULL,
	`grand_total_cents` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`coupon_id` text,
	`shipping_address_json` text,
	`billing_address_json` text,
	`tracking_number` text,
	`carrier` text,
	`estimated_delivery_at` integer,
	`placed_at` integer NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`coupon_id`) REFERENCES `marketing_coupons`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_number_unique` ON `orders` (`order_number`);--> statement-breakpoint
CREATE INDEX `orders_user_idx` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `orders_placed_idx` ON `orders` (`placed_at`);--> statement-breakpoint
CREATE TABLE `payment_methods` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`brand` text,
	`last4` text,
	`exp_month` integer,
	`exp_year` integer,
	`is_default` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `payment_methods_user_idx` ON `payment_methods` (`user_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_ref` text,
	`amount_cents` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`paid_at` integer,
	`failure_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `payments_order_idx` ON `payments` (`order_id`);--> statement-breakpoint
CREATE TABLE `catalog_product_images` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`url` text NOT NULL,
	`path` text,
	`alt` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `catalog_products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `catalog_product_images_product_idx` ON `catalog_product_images` (`product_id`);--> statement-breakpoint
CREATE TABLE `catalog_product_option_values` (
	`id` text PRIMARY KEY NOT NULL,
	`option_id` text NOT NULL,
	`value` text NOT NULL,
	`color_hex` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`option_id`) REFERENCES `catalog_product_options`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `catalog_product_option_values_option_idx` ON `catalog_product_option_values` (`option_id`);--> statement-breakpoint
CREATE TABLE `catalog_product_options` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `catalog_products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `catalog_product_options_product_idx` ON `catalog_product_options` (`product_id`);--> statement-breakpoint
CREATE TABLE `catalog_product_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`price_cents` integer NOT NULL,
	`compare_at_price_cents` integer,
	`stock` integer DEFAULT 0 NOT NULL,
	`weight_grams` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`option_values_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `catalog_products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_product_variants_sku_unique` ON `catalog_product_variants` (`sku`);--> statement-breakpoint
CREATE INDEX `catalog_product_variants_product_idx` ON `catalog_product_variants` (`product_id`);--> statement-breakpoint
CREATE TABLE `catalog_products` (
	`id` text PRIMARY KEY NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`short_description` text,
	`brand_id` text,
	`category_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`price_cents` integer NOT NULL,
	`compare_at_price_cents` integer,
	`currency` text DEFAULT 'USD' NOT NULL,
	`rating_avg` integer DEFAULT 0 NOT NULL,
	`rating_count` integer DEFAULT 0 NOT NULL,
	`sold_count` integer DEFAULT 0 NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`is_new_arrival` integer DEFAULT false NOT NULL,
	`is_deal` integer DEFAULT false NOT NULL,
	`deal_ends_at` integer,
	`specs_json` text,
	`shipping_info` text,
	`return_policy` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`brand_id`) REFERENCES `catalog_brands`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`category_id`) REFERENCES `catalog_categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_products_sku_unique` ON `catalog_products` (`sku`);--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_products_slug_unique` ON `catalog_products` (`slug`);--> statement-breakpoint
CREATE INDEX `catalog_products_status_idx` ON `catalog_products` (`status`);--> statement-breakpoint
CREATE INDEX `catalog_products_category_idx` ON `catalog_products` (`category_id`);--> statement-breakpoint
CREATE INDEX `catalog_products_brand_idx` ON `catalog_products` (`brand_id`);--> statement-breakpoint
CREATE INDEX `catalog_products_slug_idx` ON `catalog_products` (`slug`);--> statement-breakpoint
CREATE TABLE `return_request_images` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`url` text NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `return_requests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `return_request_images_request_idx` ON `return_request_images` (`request_id`);--> statement-breakpoint
CREATE TABLE `return_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`order_item_id` text NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`reason` text NOT NULL,
	`note` text,
	`status` text DEFAULT 'requested' NOT NULL,
	`resolution` text,
	`refund_amount_cents` integer,
	`exchange_variant_id` text,
	`pickup_address_json` text,
	`resolved_by` text,
	`resolved_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exchange_variant_id`) REFERENCES `catalog_product_variants`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`resolved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `return_requests_status_idx` ON `return_requests` (`status`);--> statement-breakpoint
CREATE INDEX `return_requests_order_idx` ON `return_requests` (`order_id`);--> statement-breakpoint
CREATE TABLE `review_images` (
	`id` text PRIMARY KEY NOT NULL,
	`review_id` text NOT NULL,
	`url` text NOT NULL,
	FOREIGN KEY (`review_id`) REFERENCES `reviews`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `review_images_review_idx` ON `review_images` (`review_id`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`user_id` text NOT NULL,
	`order_item_id` text,
	`rating` integer NOT NULL,
	`title` text,
	`body` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`helpful_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `catalog_products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reviews_product_idx` ON `reviews` (`product_id`);--> statement-breakpoint
CREATE INDEX `reviews_status_idx` ON `reviews` (`status`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`impersonated_by` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `shipments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`carrier` text NOT NULL,
	`tracking_number` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`shipped_at` integer,
	`delivered_at` integer,
	`events_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `shipments_order_idx` ON `shipments` (`order_id`);--> statement-breakpoint
CREATE TABLE `content_site_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value_json` text NOT NULL,
	`updated_by` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `support_ticket_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_id` text NOT NULL,
	`sender_user_id` text NOT NULL,
	`body` text NOT NULL,
	`attachments_json` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `support_ticket_messages_ticket_idx` ON `support_ticket_messages` (`ticket_id`);--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_number` text NOT NULL,
	`user_id` text NOT NULL,
	`order_id` text,
	`subject` text NOT NULL,
	`category` text NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`assigned_admin_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `support_tickets_ticket_number_unique` ON `support_tickets` (`ticket_number`);--> statement-breakpoint
CREATE INDEX `support_tickets_status_idx` ON `support_tickets` (`status`);--> statement-breakpoint
CREATE INDEX `support_tickets_assigned_idx` ON `support_tickets` (`assigned_admin_id`);--> statement-breakpoint
CREATE INDEX `support_tickets_user_idx` ON `support_tickets` (`user_id`);--> statement-breakpoint
CREATE TABLE `content_testimonials` (
	`id` text PRIMARY KEY NOT NULL,
	`image_url` text NOT NULL,
	`caption` text,
	`link` text,
	`position` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`role` text DEFAULT 'customer' NOT NULL,
	`banned` integer DEFAULT false NOT NULL,
	`ban_reason` text,
	`ban_expires` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `customers_wishlists` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`product_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_wishlists_user_product_idx` ON `customers_wishlists` (`user_id`,`product_id`);--> statement-breakpoint
CREATE INDEX `customers_wishlists_product_idx` ON `customers_wishlists` (`product_id`);