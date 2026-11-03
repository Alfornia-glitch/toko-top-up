import { eq } from 'drizzle-orm';
import { createPostgresDb, createSqliteDb } from '#lib/server/db/core.ts';
import * as postgres from '#lib/server/db/schema/postgres/index.ts';
import * as sqlite from '#lib/server/db/schema/sqlite/index.ts';

const provider = process.env.DB_PROVIDER;
const schema = provider === 'postgres' ? postgres : sqlite;

if (provider !== 'postgres' && provider !== 'sqlite') {
	throw new Error('DB_PROVIDER must be "sqlite" or "postgres"');
}

const db =
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(
		provider === 'postgres'
			? createPostgresDb(process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '').db
			: createSqliteDb(process.env.SQLITE_PATH || './data/ecommerce.sqlite').db
	) as any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const s = schema as any;
const now = new Date();
const id = () => crypto.randomUUID();

async function upsertBy(table: any, key: string, value: unknown, data: Record<string, unknown>) {
	const [existing] = await db.select().from(table).where(eq(table[key], value)).limit(1);
	if (existing) {
		await db
			.update(table)
			.set({ ...data, updatedAt: now })
			.where(eq(table.id, existing.id));
		return existing.id as string;
	}
	const rowId = id();
	await db.insert(table).values({ id: rowId, ...data, createdAt: now, updatedAt: now });
	return rowId;
}

async function main() {
	console.log(`Seeding ${provider} database…`);

	const brandData = [
		['Apple', 'apple'],
		['Samsung', 'samsung'],
		['Sony', 'sony'],
		['Nike', 'nike'],
		['Adidas', 'adidas'],
		['JBL', 'jbl']
	];
	const brandIds: Record<string, string> = {};
	for (const [name, slug] of brandData) {
		brandIds[slug] = await upsertBy(s.brands, 'slug', slug, {
			name,
			slug,
			description: `${name} products`,
			status: 'active'
		});
	}

	const categoryData = [
		['Electronics', 'electronics', null],
		['Phones', 'phones', 'electronics'],
		['Audio', 'audio', 'electronics'],
		['Fashion', 'fashion', null],
		['T-Shirts', 't-shirts', 'fashion'],
		['Accessories', 'accessories', 'fashion']
	];
	const categoryIds: Record<string, string> = {};
	for (const [name, slug, parentSlug] of categoryData) {
		categoryIds[slug] = await upsertBy(s.categories, 'slug', slug, {
			name,
			slug,
			parentId: parentSlug ? categoryIds[parentSlug] : null,
			description: `${name} collection`,
			position: categoryData.findIndex((row) => row[1] === slug),
			status: 'active'
		});
	}

	const products = [
		{
			sku: 'PHONE-CASE-001',
			name: 'Shield Phone Case',
			slug: 'shield-phone-case',
			price: 2499,
			compare: 3499,
			brand: 'apple',
			category: 'phones',
			image: '/assets/31341.png',
			variant: { sku: 'PHONE-CASE-001-BLK', name: 'Black', color: 'Black', stock: 24 }
		},
		{
			sku: 'SHIRT-001',
			name: 'Everyday Cotton Shirt',
			slug: 'everyday-cotton-shirt',
			price: 3999,
			compare: 4999,
			brand: 'nike',
			category: 't-shirts',
			image: '/assets/d94d6.png',
			variant: { sku: 'SHIRT-001-M', name: 'Medium / White', color: 'White', stock: 18 }
		},
		{
			sku: 'HEADPHONE-001',
			name: 'Studio Wireless Headphones',
			slug: 'studio-wireless-headphones',
			price: 12999,
			compare: 15999,
			brand: 'sony',
			category: 'audio',
			image: '/assets/31c86.png',
			variant: { sku: 'HEADPHONE-001-BLK', name: 'Black', color: 'Black', stock: 12 }
		},
		{
			sku: 'SPEAKER-001',
			name: 'Portable Bluetooth Speaker',
			slug: 'portable-bluetooth-speaker',
			price: 7999,
			compare: 9999,
			brand: 'jbl',
			category: 'audio',
			image: '/assets/078ee.svg',
			variant: { sku: 'SPEAKER-001-BLU', name: 'Blue', color: 'Blue', stock: 9 }
		},
		{
			sku: 'WATCH-001',
			name: 'Smart Fitness Watch',
			slug: 'smart-fitness-watch',
			price: 8999,
			compare: 10999,
			brand: 'samsung',
			category: 'electronics',
			image: '/assets/10534.png',
			variant: { sku: 'WATCH-001-BLK', name: 'Black', color: 'Black', stock: 7 }
		},
		{
			sku: 'SNEAKER-001',
			name: 'Cloud Runner Sneakers',
			slug: 'cloud-runner-sneakers',
			price: 6999,
			compare: 8499,
			brand: 'adidas',
			category: 'fashion',
			image: '/assets/74c73.png',
			variant: { sku: 'SNEAKER-001-42', name: 'Size 42', color: 'Grey', stock: 15 }
		}
	];

	for (const product of products) {
		const [existing] = await db
			.select({ id: s.products.id })
			.from(s.products)
			.where(eq(s.products.sku, product.sku))
			.limit(1);

		if (existing) continue;

		const productId = id();
		await db.insert(s.products).values({
			id: productId,
			sku: product.sku,
			name: product.name,
			slug: product.slug,
			description: `Seeded ${product.name}.`,
			shortDescription: `A quality ${product.name.toLowerCase()} from our catalog.`,
			brandId: brandIds[product.brand],
			categoryId: categoryIds[product.category],
			status: 'active',
			priceCents: product.price,
			compareAtPriceCents: product.compare,
			currency: 'USD',
			ratingAvg: 450,
			ratingCount: 12,
			soldCount: 40,
			isFeatured: true,
			isNewArrival: true,
			isDeal: true,
			shippingInfo: 'Ships in 2–4 business days.',
			returnPolicy: '30-day returns.',
			createdAt: now,
			updatedAt: now
		});

		await db.insert(s.productImages).values({
			id: id(),
			productId,
			url: product.image,
			alt: product.name,
			position: 0,
			createdAt: now,
			updatedAt: now
		});

		await db.insert(s.productVariants).values({
			id: id(),
			productId,
			sku: product.variant.sku,
			name: product.variant.name,
			priceCents: product.price,
			compareAtPriceCents: product.compare,
			stock: product.variant.stock,
			status: 'active',
			optionValuesJson: { Color: product.variant.color },
			createdAt: now,
			updatedAt: now
		});
	}

	await upsertBy(s.coupons, 'code', 'WELCOME10', {
		code: 'WELCOME10',
		type: 'percentage',
		value: 10,
		minSubtotalCents: 5000,
		status: 'active',
		usedCount: 0
	});
	await upsertBy(s.coupons, 'code', 'FREESHIP', {
		code: 'FREESHIP',
		type: 'fixed',
		value: 500,
		minSubtotalCents: 3000,
		status: 'active',
		usedCount: 0
	});

	await upsertBy(s.banners, 'title', 'Season Sale', {
		key: 'hero',
		title: 'Season Sale',
		subtitle: 'Up to 40% off selected products',
		imageUrl: '/assets/5bfd3.png',
		ctaLabel: 'Shop now',
		ctaUrl: '/products',
		position: 0,
		active: true
	});
	await upsertBy(s.announcements, 'text' as any, 'Free shipping over $50', {
		text: 'Free shipping over $50',
		link: '/products',
		position: 0,
		active: true
	}).catch(async () => {
		const [existing] = await db.select({ id: s.announcements.id }).from(s.announcements).limit(1);
		if (!existing) {
			await db.insert(s.announcements).values({
				id: id(),
				text: 'Free shipping over $50',
				link: '/products',
				position: 0,
				active: true,
				createdAt: now,
				updatedAt: now
			});
		}
	});

	await upsertBy(s.testimonials, 'caption', 'Excellent service and fast delivery.', {
		imageUrl: '/assets/0af77.png',
		caption: 'Excellent service and fast delivery.',
		position: 0,
		active: true
	});

	const customerEmail = 'seed-customer@example.com';
	let [customer] = await db
		.select({ id: s.user.id })
		.from(s.user)
		.where(eq(s.user.email, customerEmail))
		.limit(1);

	if (!customer) {
		customer = { id: id() };
		await db.insert(s.user).values({
			id: customer.id,
			name: 'Seed Customer',
			email: customerEmail,
			emailVerified: true,
			role: 'customer',
			banned: false,
			createdAt: now,
			updatedAt: now
		});
	}

	const [order] = await db
		.select({ id: s.orders.id })
		.from(s.orders)
		.where(eq(s.orders.orderNumber, 'SEED-1001'))
		.limit(1);

	if (!order) {
		const orderId = id();
		const itemId = id();
		await db.insert(s.orders).values({
			id: orderId,
			orderNumber: 'SEED-1001',
			userId: customer.id,
			status: 'paid',
			paymentStatus: 'paid',
			fulfillmentStatus: 'fulfilled',
			subtotalCents: 5000,
			discountCents: 500,
			shippingCents: 0,
			taxCents: 0,
			grandTotalCents: 4500,
			currency: 'USD',
			placedAt: now,
			createdAt: now,
			updatedAt: now
		});
		await db.insert(s.orderItems).values({
			id: itemId,
			orderId,
			productNameSnapshot: 'Shield Phone Case',
			skuSnapshot: 'PHONE-CASE-001',
			quantity: 2,
			unitPriceCents: 2500,
			totalCents: 5000,
			status: 'fulfilled',
			createdAt: now,
			updatedAt: now
		});
		await db.insert(s.orderEvents).values({
			id: id(),
			orderId,
			type: 'seeded',
			message: 'Seed order created',
			createdAt: now
		});
	}

	await upsertBy(s.supportTickets, 'ticketNumber', 'TICKET-1001', {
		ticketNumber: 'TICKET-1001',
		userId: customer.id,
		subject: 'Where is my order?',
		category: 'shipping',
		priority: 'normal',
		status: 'open'
	}).catch(() => undefined);

	await upsertBy(s.giftCards, 'code', 'GIFT-SEED-001', {
		code: 'GIFT-SEED-001',
		initialAmountCents: 5000,
		balanceCents: 5000,
		currency: 'USD',
		status: 'active',
		message: 'Seeded gift card'
	});

	const [newsletter] = await db
		.select({ id: s.newsletterSubscriptions.id })
		.from(s.newsletterSubscriptions)
		.where(eq(s.newsletterSubscriptions.email, 'newsletter@example.com'))
		.limit(1);
	if (!newsletter) {
		await db.insert(s.newsletterSubscriptions).values({
			id: id(),
			email: 'newsletter@example.com',
			status: 'subscribed',
			source: 'seed',
			createdAt: now,
			updatedAt: now
		});
	}

	console.log('Seed complete.');
}

await main();
