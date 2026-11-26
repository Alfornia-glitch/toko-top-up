CREATE TABLE `payments_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_id` text NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`payment_id`) REFERENCES `payments_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `payments_audit_log_payment_idx` ON `payments_audit_log` (`payment_id`);--> statement-breakpoint
CREATE TABLE `payments_proofs` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_id` text NOT NULL,
	`file_path` text NOT NULL,
	`file_hash` text NOT NULL,
	`uploaded_at` integer NOT NULL,
	`review_status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by` text,
	`reviewed_at` integer,
	`reject_reason` text,
	`reject_note` text,
	FOREIGN KEY (`payment_id`) REFERENCES `payments_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_proofs_file_hash_unique` ON `payments_proofs` (`file_hash`);--> statement-breakpoint
CREATE INDEX `payments_proofs_payment_idx` ON `payments_proofs` (`payment_id`);--> statement-breakpoint
CREATE TABLE `payments_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`user_id` text NOT NULL,
	`base_amount` integer NOT NULL,
	`unique_code` integer NOT NULL,
	`total_amount` integer NOT NULL,
	`status` text DEFAULT 'pending_payment' NOT NULL,
	`expires_at` integer NOT NULL,
	`paid_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `payments_orders_status_expires_idx` ON `payments_orders` (`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `payments_orders_order_idx` ON `payments_orders` (`order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payments_orders_open_total_uq` ON `payments_orders` (`total_amount`) WHERE status in ('pending_payment', 'awaiting_verification', 'rejected');