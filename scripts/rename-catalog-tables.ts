import { Database } from 'bun:sqlite';
import { SQL } from 'bun';

const TABLES: Array<[string, string]> = [
	['brands', 'catalog_brands'],
	['categories', 'catalog_categories'],
	['products', 'catalog_products'],
	['product_images', 'catalog_product_images'],
	['product_options', 'catalog_product_options'],
	['product_option_values', 'catalog_product_option_values'],
	['product_variants', 'catalog_product_variants'],
	['inventory_movements', 'catalog_inventory_movements'],
	['banners', 'content_banners'],
	['announcements', 'content_announcements'],
	['testimonials', 'content_testimonials'],
	['media_assets', 'content_media_assets'],
	['site_settings', 'content_site_settings'],
	['addresses', 'customers_addresses'],
	['wishlists', 'customers_wishlists'],
	['payment_methods', 'customers_payment_methods'],
	['coupons', 'marketing_coupons'],
	['gift_cards', 'marketing_gift_cards'],
	['gift_card_transactions', 'marketing_gift_card_transactions'],
	['newsletter_subscriptions', 'marketing_newsletter_subscriptions'],
	['coupon_redemptions', 'marketing_coupon_redemptions'],
	['carts', 'cart_carts']
];

const INDEXES: Array<[string, string]> = [
	['brands_status_idx', 'catalog_brands_status_idx'],
	['categories_parent_idx', 'catalog_categories_parent_idx'],
	['categories_position_idx', 'catalog_categories_position_idx'],
	['products_status_idx', 'catalog_products_status_idx'],
	['products_category_idx', 'catalog_products_category_idx'],
	['products_brand_idx', 'catalog_products_brand_idx'],
	['products_slug_idx', 'catalog_products_slug_idx'],
	['product_images_product_idx', 'catalog_product_images_product_idx'],
	['product_options_product_idx', 'catalog_product_options_product_idx'],
	['product_option_values_option_idx', 'catalog_product_option_values_option_idx'],
	['product_variants_product_idx', 'catalog_product_variants_product_idx'],
	['inventory_movements_variant_idx', 'catalog_inventory_movements_variant_idx'],
	['banners_key_idx', 'content_banners_key_idx'],
	['announcements_position_idx', 'content_announcements_position_idx'],
	['media_assets_folder_idx', 'content_media_assets_folder_idx'],
	['media_assets_created_idx', 'content_media_assets_created_idx'],
	['addresses_user_idx', 'customers_addresses_user_idx'],
	['wishlists_user_product_idx', 'customers_wishlists_user_product_idx'],
	['wishlists_product_idx', 'customers_wishlists_product_idx'],
	['payment_methods_user_idx', 'customers_payment_methods_user_idx'],
	['coupons_status_idx', 'marketing_coupons_status_idx'],
	['gift_cards_code_idx', 'marketing_gift_cards_code_idx'],
	['gift_cards_status_idx', 'marketing_gift_cards_status_idx'],
	['gift_card_transactions_card_idx', 'marketing_gift_card_transactions_card_idx'],
	['newsletter_subscriptions_status_idx', 'marketing_newsletter_subscriptions_status_idx'],
	['coupon_redemptions_coupon_idx', 'marketing_coupon_redemptions_coupon_idx'],
	['carts_user_idx', 'cart_carts_user_idx'],
	['carts_status_idx', 'cart_carts_status_idx']
];

const provider = process.env.DB_PROVIDER;

if (provider !== 'postgres' && provider !== 'sqlite') {
	throw new Error('DB_PROVIDER must be "sqlite" or "postgres"');
}

if (provider === 'sqlite') {
	renameSqlite(process.env.SQLITE_PATH || './data/ecommerce.sqlite');
} else {
	await renamePostgres();
}

function renameSqlite(file: string): void {
	const db = new Database(file);

	try {
		db.run('PRAGMA foreign_keys = ON');
		db.run('BEGIN');

		for (const [from, to] of TABLES) {
			if (hasSqliteTable(db, from) && !hasSqliteTable(db, to)) {
				db.run(`ALTER TABLE "${from}" RENAME TO "${to}"`);
				console.log(`renamed ${from} -> ${to}`);
			}
		}

		db.run('COMMIT');
	} catch (error) {
		db.run('ROLLBACK');
		throw error;
	} finally {
		db.close();
	}
}

function hasSqliteTable(db: Database, name: string): boolean {
	const row = db
		.query("SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = ?")
		.get(name);
	return row !== null;
}

async function renamePostgres(): Promise<void> {
	const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
	if (!url) throw new Error('DIRECT_URL or DATABASE_URL is required when DB_PROVIDER=postgres');
	const sql = new SQL(url, { prepare: false });

	try {
		await sql.begin(async (tx) => {
			for (const [from, to] of TABLES) {
				const [row] = await tx`
					SELECT to_regclass(${`shop.${from}`})::text AS source,
					       to_regclass(${`shop.${to}`})::text AS target
				`;
				if (row?.source && !row?.target) {
					await tx.unsafe(`ALTER TABLE shop."${from}" RENAME TO "${to}"`);
					console.log(`renamed ${from} -> ${to}`);
				}
			}

			for (const [from, to] of INDEXES) {
				const [row] = await tx`
					SELECT to_regclass(${`shop.${from}`})::text AS source,
					       to_regclass(${`shop.${to}`})::text AS target
				`;
				if (row?.source && !row?.target) {
					await tx.unsafe(`ALTER INDEX shop."${from}" RENAME TO "${to}"`);
					console.log(`renamed index ${from} -> ${to}`);
				}
			}
		});
	} finally {
		await sql.close();
	}
}
