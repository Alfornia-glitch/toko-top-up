CREATE TABLE "shop"."payments_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_id" text NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop"."payments_proofs" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_id" text NOT NULL,
	"file_path" text NOT NULL,
	"file_hash" text NOT NULL,
	"uploaded_at" timestamp with time zone NOT NULL,
	"review_status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"reject_reason" text,
	"reject_note" text,
	CONSTRAINT "payments_proofs_file_hash_unique" UNIQUE("file_hash")
);
--> statement-breakpoint
CREATE TABLE "shop"."payments_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"user_id" text NOT NULL,
	"base_amount" integer NOT NULL,
	"unique_code" integer NOT NULL,
	"total_amount" integer NOT NULL,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shop"."payments_audit_log" ADD CONSTRAINT "payments_audit_log_payment_id_payments_orders_id_fk" FOREIGN KEY ("payment_id") REFERENCES "shop"."payments_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop"."payments_proofs" ADD CONSTRAINT "payments_proofs_payment_id_payments_orders_id_fk" FOREIGN KEY ("payment_id") REFERENCES "shop"."payments_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_audit_log_payment_idx" ON "shop"."payments_audit_log" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "payments_proofs_payment_idx" ON "shop"."payments_proofs" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "payments_orders_status_expires_idx" ON "shop"."payments_orders" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "payments_orders_order_idx" ON "shop"."payments_orders" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_orders_open_total_uq" ON "shop"."payments_orders" USING btree ("total_amount") WHERE status in ('pending_payment', 'awaiting_verification', 'rejected');
