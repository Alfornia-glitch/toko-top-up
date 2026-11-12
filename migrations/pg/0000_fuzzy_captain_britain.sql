CREATE SCHEMA "auth_app";
--> statement-breakpoint
CREATE SCHEMA "shop";
--> statement-breakpoint
CREATE TABLE "auth_app"."account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."customers_addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"label" text,
	"recipient_name" text NOT NULL,
	"phone" text,
	"line1" text NOT NULL,
	"line2" text,
	"city" text NOT NULL,
	"region" text,
	"postal_code" text,
	"country" text NOT NULL,
	"is_default_shipping" boolean DEFAULT false NOT NULL,
	"is_default_billing" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."content_announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"link" text,
	"position" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_user_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"before_json" jsonb,
	"after_json" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."content_banners" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"image_url" text NOT NULL,
	"mobile_image_url" text,
	"cta_label" text,
	"cta_url" text,
	"position" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."catalog_brands" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo_url" text,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_brands_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "shop"."cart_items" (
	"id" text PRIMARY KEY NOT NULL,
	"cart_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."cart_carts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"coupon_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."reporting_catalog_products" (
	"product_id" text PRIMARY KEY NOT NULL,
	"sku" text NOT NULL,
	"status" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."catalog_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" text,
	"description" text,
	"image_url" text,
	"position" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "shop"."marketing_coupon_redemptions" (
	"id" text PRIMARY KEY NOT NULL,
	"coupon_id" text NOT NULL,
	"order_id" text NOT NULL,
	"user_id" text,
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."marketing_coupons" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"value" integer NOT NULL,
	"min_subtotal_cents" integer DEFAULT 0 NOT NULL,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL,
	"applies_to_json" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "marketing_coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "shop"."marketing_gift_card_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"gift_card_id" text NOT NULL,
	"order_id" text,
	"amount_cents" integer NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."marketing_gift_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"initial_amount_cents" integer NOT NULL,
	"balance_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"recipient_name" text,
	"recipient_email" text,
	"purchaser_user_id" text,
	"order_id" text,
	"message" text,
	"delivered_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "marketing_gift_cards_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "shop"."catalog_inventory_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"variant_id" text NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"reference_type" text,
	"reference_id" text,
	"admin_user_id" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."content_media_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"url" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"folder" text NOT NULL,
	"uploaded_by" text,
	"alt" text,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "content_media_assets_path_unique" UNIQUE("path")
);
--> statement-breakpoint
CREATE TABLE "shop"."marketing_newsletter_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"email" text NOT NULL,
	"preferences_json" jsonb,
	"status" text DEFAULT 'subscribed' NOT NULL,
	"source" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "marketing_newsletter_subscriptions_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "shop"."order_events" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"type" text NOT NULL,
	"message" text,
	"actor_user_id" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text,
	"variant_id" text,
	"product_name_snapshot" text NOT NULL,
	"sku_snapshot" text NOT NULL,
	"image_url_snapshot" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"user_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"fulfillment_status" text DEFAULT 'unfulfilled' NOT NULL,
	"subtotal_cents" integer DEFAULT 0 NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"shipping_cents" integer DEFAULT 0 NOT NULL,
	"tax_cents" integer DEFAULT 0 NOT NULL,
	"grand_total_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"coupon_id" text,
	"shipping_address_json" jsonb,
	"billing_address_json" jsonb,
	"tracking_number" text,
	"carrier" text,
	"estimated_delivery_at" timestamp with time zone,
	"placed_at" timestamp with time zone NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "shop"."customers_payment_methods" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"brand" text,
	"last4" text,
	"exp_month" integer,
	"exp_year" integer,
	"is_default" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."payments" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_ref" text,
	"amount_cents" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."catalog_product_images" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"url" text NOT NULL,
	"path" text,
	"alt" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."catalog_product_option_values" (
	"id" text PRIMARY KEY NOT NULL,
	"option_id" text NOT NULL,
	"value" text NOT NULL,
	"color_hex" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."catalog_product_options" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."catalog_product_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"price_cents" integer NOT NULL,
	"compare_at_price_cents" integer,
	"stock" integer DEFAULT 0 NOT NULL,
	"weight_grams" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"option_values_json" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_product_variants_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "shop"."catalog_products" (
	"id" text PRIMARY KEY NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"short_description" text,
	"brand_id" text,
	"category_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"price_cents" integer NOT NULL,
	"compare_at_price_cents" integer,
	"currency" text DEFAULT 'USD' NOT NULL,
	"rating_avg" integer DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"sold_count" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_new_arrival" boolean DEFAULT false NOT NULL,
	"is_deal" boolean DEFAULT false NOT NULL,
	"deal_ends_at" timestamp with time zone,
	"specs_json" jsonb,
	"shipping_info" text,
	"return_policy" text,
	"created_by" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_products_sku_unique" UNIQUE("sku"),
	CONSTRAINT "catalog_products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "shop"."return_request_images" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."return_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"order_item_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"status" text DEFAULT 'requested' NOT NULL,
	"resolution" text,
	"refund_amount_cents" integer,
	"exchange_variant_id" text,
	"pickup_address_json" jsonb,
	"resolved_by" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."review_images" (
	"id" text PRIMARY KEY NOT NULL,
	"review_id" text NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"user_id" text NOT NULL,
	"order_item_id" text,
	"rating" integer NOT NULL,
	"title" text,
	"body" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_app"."session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"impersonated_by" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "shop"."shipments" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"carrier" text NOT NULL,
	"tracking_number" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"events_json" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."content_site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value_json" jsonb NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."support_ticket_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"sender_user_id" text NOT NULL,
	"body" text NOT NULL,
	"attachments_json" jsonb,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."support_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_number" text NOT NULL,
	"user_id" text NOT NULL,
	"order_id" text,
	"subject" text NOT NULL,
	"category" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"assigned_admin_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "support_tickets_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE "shop"."content_testimonials" (
	"id" text PRIMARY KEY NOT NULL,
	"image_url" text NOT NULL,
	"caption" text,
	"link" text,
	"position" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_app"."user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'customer' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth_app"."verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."customers_wishlists" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"product_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_app"."account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth_app"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."audit_log" ADD CONSTRAINT "audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "auth_app"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."cart_items" ADD CONSTRAINT "cart_items_cart_id_cart_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "shop"."cart_carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."catalog_categories" ADD CONSTRAINT "catalog_categories_parent_id_catalog_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "shop"."catalog_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."marketing_coupon_redemptions" ADD CONSTRAINT "marketing_coupon_redemptions_coupon_id_marketing_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "shop"."marketing_coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."marketing_gift_card_transactions" ADD CONSTRAINT "marketing_gift_card_transactions_gift_card_id_marketing_gift_cards_id_fk" FOREIGN KEY ("gift_card_id") REFERENCES "shop"."marketing_gift_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."catalog_inventory_movements" ADD CONSTRAINT "catalog_inventory_movements_variant_id_catalog_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "shop"."catalog_product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "shop"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."order_events" ADD CONSTRAINT "order_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "auth_app"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "shop"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."order_items" ADD CONSTRAINT "order_items_variant_id_catalog_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "shop"."catalog_product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."orders" ADD CONSTRAINT "orders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth_app"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."orders" ADD CONSTRAINT "orders_coupon_id_marketing_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "shop"."marketing_coupons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "shop"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."catalog_product_images" ADD CONSTRAINT "catalog_product_images_product_id_catalog_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "shop"."catalog_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."catalog_product_option_values" ADD CONSTRAINT "catalog_product_option_values_option_id_catalog_product_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "shop"."catalog_product_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."catalog_product_options" ADD CONSTRAINT "catalog_product_options_product_id_catalog_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "shop"."catalog_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."catalog_product_variants" ADD CONSTRAINT "catalog_product_variants_product_id_catalog_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "shop"."catalog_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."catalog_products" ADD CONSTRAINT "catalog_products_brand_id_catalog_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "shop"."catalog_brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."catalog_products" ADD CONSTRAINT "catalog_products_category_id_catalog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "shop"."catalog_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."return_request_images" ADD CONSTRAINT "return_request_images_request_id_return_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "shop"."return_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."return_requests" ADD CONSTRAINT "return_requests_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "shop"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."return_requests" ADD CONSTRAINT "return_requests_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "shop"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."return_requests" ADD CONSTRAINT "return_requests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth_app"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."return_requests" ADD CONSTRAINT "return_requests_exchange_variant_id_catalog_product_variants_id_fk" FOREIGN KEY ("exchange_variant_id") REFERENCES "shop"."catalog_product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."return_requests" ADD CONSTRAINT "return_requests_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "auth_app"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."review_images" ADD CONSTRAINT "review_images_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "shop"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."reviews" ADD CONSTRAINT "reviews_product_id_catalog_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "shop"."catalog_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."reviews" ADD CONSTRAINT "reviews_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth_app"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_app"."session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth_app"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "shop"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "shop"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "auth_app"."account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "customers_addresses_user_idx" ON "shop"."customers_addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "content_announcements_position_idx" ON "shop"."content_announcements" USING btree ("position");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "shop"."audit_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "shop"."audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "shop"."audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "content_banners_key_idx" ON "shop"."content_banners" USING btree ("key");--> statement-breakpoint
CREATE INDEX "catalog_brands_status_idx" ON "shop"."catalog_brands" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_cart_variant_idx" ON "shop"."cart_items" USING btree ("cart_id","variant_id");--> statement-breakpoint
CREATE INDEX "cart_carts_user_idx" ON "shop"."cart_carts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cart_carts_status_idx" ON "shop"."cart_carts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reporting_catalog_products_status_idx" ON "shop"."reporting_catalog_products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "catalog_categories_parent_idx" ON "shop"."catalog_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "catalog_categories_position_idx" ON "shop"."catalog_categories" USING btree ("position");--> statement-breakpoint
CREATE INDEX "marketing_coupon_redemptions_coupon_idx" ON "shop"."marketing_coupon_redemptions" USING btree ("coupon_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_coupon_redemptions_coupon_order_idx" ON "shop"."marketing_coupon_redemptions" USING btree ("coupon_id","order_id");--> statement-breakpoint
CREATE INDEX "marketing_coupons_status_idx" ON "shop"."marketing_coupons" USING btree ("status");--> statement-breakpoint
CREATE INDEX "marketing_gift_card_transactions_card_idx" ON "shop"."marketing_gift_card_transactions" USING btree ("gift_card_id");--> statement-breakpoint
CREATE INDEX "marketing_gift_cards_code_idx" ON "shop"."marketing_gift_cards" USING btree ("code");--> statement-breakpoint
CREATE INDEX "marketing_gift_cards_status_idx" ON "shop"."marketing_gift_cards" USING btree ("status");--> statement-breakpoint
CREATE INDEX "catalog_inventory_movements_variant_idx" ON "shop"."catalog_inventory_movements" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "content_media_assets_folder_idx" ON "shop"."content_media_assets" USING btree ("folder");--> statement-breakpoint
CREATE INDEX "content_media_assets_created_idx" ON "shop"."content_media_assets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "marketing_newsletter_subscriptions_status_idx" ON "shop"."marketing_newsletter_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "order_events_order_idx" ON "shop"."order_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "shop"."order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "shop"."orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "shop"."orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_placed_idx" ON "shop"."orders" USING btree ("placed_at");--> statement-breakpoint
CREATE INDEX "customers_payment_methods_user_idx" ON "shop"."customers_payment_methods" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "shop"."payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "catalog_product_images_product_idx" ON "shop"."catalog_product_images" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "catalog_product_option_values_option_idx" ON "shop"."catalog_product_option_values" USING btree ("option_id");--> statement-breakpoint
CREATE INDEX "catalog_product_options_product_idx" ON "shop"."catalog_product_options" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "catalog_product_variants_product_idx" ON "shop"."catalog_product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "catalog_products_status_idx" ON "shop"."catalog_products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "catalog_products_category_idx" ON "shop"."catalog_products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "catalog_products_brand_idx" ON "shop"."catalog_products" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "catalog_products_slug_idx" ON "shop"."catalog_products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "return_request_images_request_idx" ON "shop"."return_request_images" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "return_requests_status_idx" ON "shop"."return_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "return_requests_order_idx" ON "shop"."return_requests" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "review_images_review_idx" ON "shop"."review_images" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "reviews_product_idx" ON "shop"."reviews" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "reviews_status_idx" ON "shop"."reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "auth_app"."session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shipments_order_idx" ON "shop"."shipments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "support_ticket_messages_ticket_idx" ON "shop"."support_ticket_messages" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "shop"."support_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "support_tickets_assigned_idx" ON "shop"."support_tickets" USING btree ("assigned_admin_id");--> statement-breakpoint
CREATE INDEX "support_tickets_user_idx" ON "shop"."support_tickets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "auth_app"."verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_wishlists_user_product_idx" ON "shop"."customers_wishlists" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE INDEX "customers_wishlists_product_idx" ON "shop"."customers_wishlists" USING btree ("product_id");