import { and, eq } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
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
const daysFromNow = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

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

async function ensureUser(email: string, name: string) {
	const [existing] = await db
		.select({ id: s.user.id })
		.from(s.user)
		.where(eq(s.user.email, email))
		.limit(1);
	if (existing) return existing.id as string;

	const userId = id();
	await db.insert(s.user).values({
		id: userId,
		name,
		email,
		emailVerified: true,
		role: 'customer',
		banned: false,
		createdAt: now,
		updatedAt: now
	});
	return userId;
}

async function ensureCredentialAccount(userId: string, password: string) {
	const [existing] = await db
		.select({ id: s.account.id })
		.from(s.account)
		.where(and(eq(s.account.userId, userId), eq(s.account.providerId, 'credential')))
		.limit(1);
	if (existing) return;

	await db.insert(s.account).values({
		id: id(),
		accountId: userId,
		providerId: 'credential',
		userId,
		password: await hashPassword(password),
		createdAt: now,
		updatedAt: now
	});
}

async function ensureProductImage(productId: string, url: string, alt: string, position: number) {
	const [existing] = await db
		.select({ id: s.productImages.id })
		.from(s.productImages)
		.where(and(eq(s.productImages.productId, productId), eq(s.productImages.url, url)))
		.limit(1);
	if (existing) return existing.id as string;

	const imageId = id();
	await db.insert(s.productImages).values({
		id: imageId,
		productId,
		url,
		alt,
		position,
		createdAt: now,
		updatedAt: now
	});
	return imageId;
}

async function ensureOption(productId: string, name: string, position: number) {
	const [existing] = await db
		.select({ id: s.productOptions.id })
		.from(s.productOptions)
		.where(and(eq(s.productOptions.productId, productId), eq(s.productOptions.name, name)))
		.limit(1);
	if (existing) return existing.id as string;

	const optionId = id();
	await db.insert(s.productOptions).values({
		id: optionId,
		productId,
		name,
		position,
		createdAt: now,
		updatedAt: now
	});
	return optionId;
}

async function ensureOptionValue(
	optionId: string,
	value: string,
	position: number,
	colorHex?: string
) {
	const [existing] = await db
		.select({ id: s.productOptionValues.id })
		.from(s.productOptionValues)
		.where(
			and(eq(s.productOptionValues.optionId, optionId), eq(s.productOptionValues.value, value))
		)
		.limit(1);
	if (existing) return existing.id as string;

	const optionValueId = id();
	await db.insert(s.productOptionValues).values({
		id: optionValueId,
		optionId,
		value,
		colorHex: colorHex ?? null,
		position,
		createdAt: now,
		updatedAt: now
	});
	return optionValueId;
}

async function ensureReview(
	productId: string,
	userId: string,
	rating: number,
	title: string,
	body: string,
	helpfulCount: number,
	createdAt: Date
) {
	const [existing] = await db
		.select({ id: s.reviews.id })
		.from(s.reviews)
		.where(
			and(
				eq(s.reviews.productId, productId),
				eq(s.reviews.userId, userId),
				eq(s.reviews.title, title)
			)
		)
		.limit(1);
	if (existing) return;

	await db.insert(s.reviews).values({
		id: id(),
		productId,
		userId,
		rating,
		title,
		body,
		status: 'approved',
		helpfulCount,
		createdAt
	});
}

async function ensureOrderItem(
	orderId: string,
	skuSnapshot: string,
	data: Record<string, unknown>
) {
	const [existing] = await db
		.select({ id: s.orderItems.id })
		.from(s.orderItems)
		.where(and(eq(s.orderItems.orderId, orderId), eq(s.orderItems.skuSnapshot, skuSnapshot)))
		.limit(1);
	if (existing) return existing.id as string;

	const itemId = id();
	await db.insert(s.orderItems).values({
		id: itemId,
		orderId,
		skuSnapshot,
		...data,
		createdAt: now,
		updatedAt: now
	});
	return itemId;
}

async function ensureOrderEvent(orderId: string, type: string, message: string, createdAt: Date) {
	const [existing] = await db
		.select({ id: s.orderEvents.id })
		.from(s.orderEvents)
		.where(
			and(
				eq(s.orderEvents.orderId, orderId),
				eq(s.orderEvents.type, type),
				eq(s.orderEvents.message, message)
			)
		)
		.limit(1);
	if (existing) return;

	await db.insert(s.orderEvents).values({
		id: id(),
		orderId,
		type,
		message,
		createdAt
	});
}

async function ensurePayment(orderId: string, providerRef: string, data: Record<string, unknown>) {
	const [existing] = await db
		.select({ id: s.payments.id })
		.from(s.payments)
		.where(and(eq(s.payments.orderId, orderId), eq(s.payments.providerRef, providerRef)))
		.limit(1);
	if (existing) return;

	await db.insert(s.payments).values({
		id: id(),
		orderId,
		providerRef,
		...data,
		createdAt: now,
		updatedAt: now
	});
}

async function ensureShipment(
	orderId: string,
	trackingNumber: string,
	data: Record<string, unknown>
) {
	const [existing] = await db
		.select({ id: s.shipments.id })
		.from(s.shipments)
		.where(and(eq(s.shipments.orderId, orderId), eq(s.shipments.trackingNumber, trackingNumber)))
		.limit(1);
	if (existing) return;

	await db.insert(s.shipments).values({
		id: id(),
		orderId,
		trackingNumber,
		...data,
		createdAt: now,
		updatedAt: now
	});
}

async function ensureSupportMessage(
	ticketId: string,
	senderUserId: string,
	body: string,
	createdAt: Date
) {
	const [existing] = await db
		.select({ id: s.supportTicketMessages.id })
		.from(s.supportTicketMessages)
		.where(
			and(eq(s.supportTicketMessages.ticketId, ticketId), eq(s.supportTicketMessages.body, body))
		)
		.limit(1);
	if (existing) return;

	await db.insert(s.supportTicketMessages).values({
		id: id(),
		ticketId,
		senderUserId,
		body,
		createdAt
	});
}

async function setSetting(key: string, value: unknown) {
	const [existing] = await db
		.select({ key: s.siteSettings.key })
		.from(s.siteSettings)
		.where(eq(s.siteSettings.key, key))
		.limit(1);
	if (existing) {
		await db
			.update(s.siteSettings)
			.set({ valueJson: value, updatedAt: now })
			.where(eq(s.siteSettings.key, key));
		return;
	}
	await db.insert(s.siteSettings).values({
		key,
		valueJson: value,
		updatedBy: null,
		updatedAt: now
	});
}

async function main() {
	console.log(`Seeding ${provider} database…`);

	const brandData = [
		['Apple', 'apple'],
		['Samsung', 'samsung'],
		['Sony', 'sony'],
		['Nike', 'nike'],
		['Adidas', 'adidas'],
		['JBL', 'jbl'],
		['Zara', 'zara'],
		['H&M', 'hm'],
		['Chanel', 'chanel'],
		['Louis Vuitton', 'louis-vuitton'],
		['LG', 'lg']
	];
	const brandIds: Record<string, string> = {};
	for (const [name, slug] of brandData) {
		brandIds[slug] = await upsertBy(s.brands, 'slug', slug, {
			name,
			slug,
			logoUrl: null,
			description: `${name} products`,
			status: 'active'
		});
	}

	const categoryData: [string, string, string | null][] = [
		['Electronics', 'electronics', null],
		['Phones', 'phones', 'electronics'],
		['Audio', 'audio', 'electronics'],
		['Smart Watches', 'smart-watches', 'electronics'],
		['Fashion', 'fashion', null],
		['T-Shirts', 't-shirts', 'fashion'],
		['Accessories', 'accessories', 'fashion'],
		['Clothing', 'clothing', 'fashion'],
		['Beauty', 'beauty', null],
		['Home Decor', 'home-decor', null],
		['Kitchen Appliances', 'kitchen-appliances', null],
		['Toys & Games', 'toys-games', null]
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
			name: 'iPhone 16 Series - Back Case Cover Liquid Air',
			slug: 'shield-phone-case',
			price: 2900,
			compare: 5900,
			brand: 'apple',
			category: 'phones',
			image: '/assets/b359f.svg',
			description:
				'The Liquid Air brings a refreshing look to your new iPhone 16. Its geometric design provides protection and grip at all angles.',
			shortDescription: 'Liquid Air iPhone 16 case',
			ratingAvg: 450,
			ratingCount: 210,
			soldCount: 320,
			isFeatured: true,
			isDeal: true,
			isNewArrival: true,
			dealEndsAt: daysFromNow(1),
			variants: [
				{
					sku: 'PHONE-CASE-001-BLK',
					name: 'Black',
					stock: 24,
					optionValues: { Color: 'Black' }
				},
				{
					sku: 'PHONE-CASE-001-BLU',
					name: 'Blue',
					stock: 18,
					optionValues: { Color: 'Blue' }
				},
				{
					sku: 'PHONE-CASE-001-PNK',
					name: 'Pink',
					stock: 12,
					optionValues: { Color: 'Pink' }
				}
			]
		},
		{
			sku: 'SHIRT-002',
			name: "Women's Blue Lazy Garfield Graphic Printed Oversized T-shirt",
			slug: 'everyday-cotton-shirt',
			price: 4900,
			compare: 19900,
			brand: 'nike',
			category: 't-shirts',
			image: '/assets/3134e.svg',
			description:
				'Stay effortlessly cool and comfortable with our blue oversized t-shirt. Crafted from soft, breathable cotton.',
			shortDescription: "Women's blue oversized Garfield graphic t-shirt",
			ratingAvg: 450,
			ratingCount: 210,
			soldCount: 260,
			isFeatured: true,
			isDeal: false,
			isNewArrival: true,
			variants: [
				{ sku: 'SHIRT-002-XS', name: 'XS', stock: 6, optionValues: { Size: 'XS' } },
				{ sku: 'SHIRT-002-S', name: 'S', stock: 12, optionValues: { Size: 'S' } },
				{ sku: 'SHIRT-002-M', name: 'M', stock: 18, optionValues: { Size: 'M' } },
				{ sku: 'SHIRT-002-L', name: 'L', stock: 14, optionValues: { Size: 'L' } },
				{ sku: 'SHIRT-002-XL', name: 'XL', stock: 8, optionValues: { Size: 'XL' } }
			]
		},
		{
			sku: 'HEADPHONE-001',
			name: 'Studio Wireless Headphones',
			slug: 'studio-wireless-headphones',
			price: 12900,
			compare: 15900,
			brand: 'sony',
			category: 'audio',
			image: '/assets/078ee.svg',
			description: 'Immersive over-ear sound with active noise cancellation and all-day comfort.',
			shortDescription: 'Noise-cancelling over-ear headphones',
			ratingAvg: 470,
			ratingCount: 86,
			soldCount: 140,
			isFeatured: true,
			isDeal: true,
			isNewArrival: false,
			dealEndsAt: daysFromNow(3),
			variants: [
				{
					sku: 'HEADPHONE-001-BLK',
					name: 'Black',
					stock: 12,
					optionValues: { Color: 'Black' }
				}
			]
		},
		{
			sku: 'SPEAKER-001',
			name: 'Portable Bluetooth Speaker',
			slug: 'portable-bluetooth-speaker',
			price: 7900,
			compare: 9900,
			brand: 'jbl',
			category: 'audio',
			image: '/assets/008f3.svg',
			description: 'Punchy portable sound with a rugged, waterproof build for wherever you go.',
			shortDescription: 'Waterproof portable Bluetooth speaker',
			ratingAvg: 460,
			ratingCount: 64,
			soldCount: 95,
			isFeatured: true,
			isDeal: true,
			isNewArrival: false,
			dealEndsAt: daysFromNow(5),
			variants: [
				{
					sku: 'SPEAKER-001-BLU',
					name: 'Blue',
					stock: 9,
					optionValues: { Color: 'Blue' }
				}
			]
		},
		{
			sku: 'WATCH-001',
			name: 'Smart Fitness Watch',
			slug: 'smart-fitness-watch',
			price: 8900,
			compare: 10900,
			brand: 'samsung',
			category: 'smart-watches',
			image: '/assets/00dd0.svg',
			description: 'Track workouts, sleep and heart rate with a bright always-on display.',
			shortDescription: 'Fitness tracking smartwatch',
			ratingAvg: 440,
			ratingCount: 52,
			soldCount: 78,
			isFeatured: true,
			isDeal: false,
			isNewArrival: false,
			variants: [
				{
					sku: 'WATCH-001-BLK',
					name: 'Black',
					stock: 7,
					optionValues: { Color: 'Black' }
				}
			]
		},
		{
			sku: 'SNEAKER-001',
			name: 'Cloud Runner Sneakers',
			slug: 'cloud-runner-sneakers',
			price: 6900,
			compare: 8400,
			brand: 'adidas',
			category: 'fashion',
			image: '/assets/01f24.svg',
			description: 'Lightweight cushioned sneakers built for daily runs and casual wear.',
			shortDescription: 'Cushioned everyday running sneakers',
			ratingAvg: 460,
			ratingCount: 71,
			soldCount: 120,
			isFeatured: false,
			isDeal: false,
			isNewArrival: true,
			variants: [
				{
					sku: 'SNEAKER-001-42',
					name: 'Size 42',
					stock: 15,
					optionValues: { Size: '42' }
				}
			]
		},
		{
			sku: 'TV-001',
			name: 'Aurora 4K Smart TV',
			slug: 'aurora-4k-smart-tv',
			price: 24900,
			compare: 29900,
			brand: 'samsung',
			category: 'electronics',
			image: '/assets/02146.svg',
			description: 'A 55-inch 4K display with HDR and built-in streaming apps.',
			shortDescription: '55-inch 4K HDR smart television',
			ratingAvg: 480,
			ratingCount: 38,
			soldCount: 44,
			isFeatured: true,
			isDeal: false,
			isNewArrival: false,
			variants: [
				{
					sku: 'TV-001-55',
					name: '55 inch',
					stock: 5,
					optionValues: { Size: '55 inch' }
				}
			]
		},
		{
			sku: 'MONITOR-001',
			name: 'LG UltraGear Gaming Monitor',
			slug: 'lg-ultragear-monitor',
			price: 18900,
			compare: 22900,
			brand: 'lg',
			category: 'electronics',
			image: '/assets/02157.svg',
			description: 'Fast 27-inch QHD gaming monitor with a high refresh rate and low latency.',
			shortDescription: '27-inch QHD gaming monitor',
			ratingAvg: 470,
			ratingCount: 29,
			soldCount: 33,
			isFeatured: false,
			isDeal: true,
			isNewArrival: false,
			dealEndsAt: daysFromNow(4),
			variants: [
				{
					sku: 'MONITOR-001-27',
					name: '27 inch',
					stock: 8,
					optionValues: { Size: '27 inch' }
				}
			]
		},
		{
			sku: 'PERFUME-001',
			name: 'Chanel No.5 Eau de Parfum',
			slug: 'chanel-no5-eau-de-parfum',
			price: 11900,
			compare: 13900,
			brand: 'chanel',
			category: 'beauty',
			image: '/assets/026f8.svg',
			description: 'A timeless floral bouquet with a refined, lingering finish.',
			shortDescription: 'Classic floral eau de parfum',
			ratingAvg: 490,
			ratingCount: 118,
			soldCount: 150,
			isFeatured: true,
			isDeal: false,
			isNewArrival: false,
			variants: [
				{
					sku: 'PERFUME-001-50',
					name: '50ml',
					stock: 20,
					optionValues: { Size: '50ml' }
				}
			]
		},
		{
			sku: 'BLAZER-001',
			name: 'Zara Linen Blend Blazer',
			slug: 'zara-linen-blazer',
			price: 8900,
			compare: 11900,
			brand: 'zara',
			category: 'clothing',
			image: '/assets/050fa.svg',
			description: 'A relaxed linen-blend blazer with a clean silhouette for warm days.',
			shortDescription: 'Relaxed linen-blend blazer',
			ratingAvg: 430,
			ratingCount: 24,
			soldCount: 40,
			isFeatured: false,
			isDeal: false,
			isNewArrival: true,
			variants: [
				{
					sku: 'BLAZER-001-M',
					name: 'Medium / Beige',
					stock: 10,
					optionValues: { Size: 'M', Color: 'Beige' }
				}
			]
		},
		{
			sku: 'JEANS-001',
			name: 'H&M Relaxed Fit Jeans',
			slug: 'hm-relaxed-fit-jeans',
			price: 4900,
			compare: 6900,
			brand: 'hm',
			category: 'clothing',
			image: '/assets/0524e.svg',
			description: 'Comfort-stretch relaxed jeans with a classic five-pocket design.',
			shortDescription: 'Relaxed fit stretch jeans',
			ratingAvg: 440,
			ratingCount: 57,
			soldCount: 88,
			isFeatured: false,
			isDeal: true,
			isNewArrival: false,
			dealEndsAt: daysFromNow(6),
			variants: [
				{
					sku: 'JEANS-001-32',
					name: 'Size 32',
					stock: 16,
					optionValues: { Size: '32' }
				}
			]
		},
		{
			sku: 'WALLET-001',
			name: 'Louis Vuitton Slim Card Holder',
			slug: 'louis-vuitton-card-holder',
			price: 15900,
			compare: 17900,
			brand: 'louis-vuitton',
			category: 'accessories',
			image: '/assets/066c7.svg',
			description: 'A compact leather card holder with a slim profile and signature detailing.',
			shortDescription: 'Compact leather card holder',
			ratingAvg: 480,
			ratingCount: 21,
			soldCount: 27,
			isFeatured: true,
			isDeal: false,
			isNewArrival: false,
			variants: [
				{
					sku: 'WALLET-001-BRN',
					name: 'Brown',
					stock: 6,
					optionValues: { Color: 'Brown' }
				}
			]
		},
		{
			sku: 'DINNER-001',
			name: 'Ceramic Dinner Set',
			slug: 'ceramic-dinner-set',
			price: 5900,
			compare: 7900,
			brand: null,
			category: 'home-decor',
			image: '/assets/069aa.svg',
			description: 'A 16-piece stoneware dinner set with a soft matte glaze.',
			shortDescription: '16-piece stoneware dinner set',
			ratingAvg: 450,
			ratingCount: 34,
			soldCount: 51,
			isFeatured: false,
			isDeal: false,
			isNewArrival: true,
			variants: [
				{
					sku: 'DINNER-001-16',
					name: '16-piece',
					stock: 11,
					optionValues: { Size: '16-piece' }
				}
			]
		},
		{
			sku: 'AIRFRYER-001',
			name: 'LG XL Air Fryer',
			slug: 'lg-xl-air-fryer',
			price: 9900,
			compare: 12900,
			brand: 'lg',
			category: 'kitchen-appliances',
			image: '/assets/075d4.svg',
			description: 'A large-capacity air fryer for crispy meals with less oil.',
			shortDescription: 'Large-capacity digital air fryer',
			ratingAvg: 460,
			ratingCount: 46,
			soldCount: 62,
			isFeatured: true,
			isDeal: true,
			isNewArrival: false,
			dealEndsAt: daysFromNow(2),
			variants: [
				{
					sku: 'AIRFRYER-001-BLK',
					name: 'Black',
					stock: 13,
					optionValues: { Color: 'Black' }
				}
			]
		},
		{
			sku: 'TOY-001',
			name: 'Wooden Building Blocks',
			slug: 'wooden-building-blocks',
			price: 1800,
			compare: 2900,
			brand: null,
			category: 'toys-games',
			image: '/assets/0771c.svg',
			description: 'A 100-piece natural wooden block set for open-ended play.',
			shortDescription: '100-piece wooden building block set',
			ratingAvg: 470,
			ratingCount: 39,
			soldCount: 74,
			isFeatured: false,
			isDeal: false,
			isNewArrival: true,
			variants: [
				{
					sku: 'TOY-001-100',
					name: '100 pieces',
					stock: 30,
					optionValues: { Size: '100 pieces' }
				}
			]
		}
	];

	const productIds: Record<string, string> = {};
	const firstVariantIds: Record<string, string> = {};

	for (const product of products) {
		const productId = await upsertBy(s.products, 'slug', product.slug, {
			sku: product.sku,
			name: product.name,
			slug: product.slug,
			description: product.description,
			shortDescription: product.shortDescription,
			brandId: product.brand ? brandIds[product.brand] : null,
			categoryId: categoryIds[product.category] ?? null,
			status: 'active',
			priceCents: product.price,
			compareAtPriceCents: product.compare,
			currency: 'USD',
			ratingAvg: product.ratingAvg,
			ratingCount: product.ratingCount,
			soldCount: product.soldCount,
			isFeatured: product.isFeatured,
			isNewArrival: product.isNewArrival,
			isDeal: product.isDeal,
			dealEndsAt: product.dealEndsAt ?? null,
			shippingInfo: 'Ships in 2–4 business days.',
			returnPolicy: '30-day returns.'
		});
		productIds[product.slug] = productId;

		await ensureProductImage(productId, product.image, product.name, 0);

		for (const variant of product.variants) {
			const variantId = await upsertBy(s.productVariants, 'sku', variant.sku, {
				productId,
				sku: variant.sku,
				name: variant.name,
				priceCents: product.price,
				compareAtPriceCents: product.compare,
				stock: variant.stock,
				status: 'active',
				optionValuesJson: variant.optionValues
			});
			if (!firstVariantIds[product.slug]) firstVariantIds[product.slug] = variantId;
		}
	}

	const phoneCaseColorOptionId = await ensureOption(productIds['shield-phone-case'], 'Color', 0);
	for (const [value, position, colorHex] of [
		['Black', 0, '#111827'],
		['Blue', 1, '#2563eb'],
		['Pink', 2, '#ec4899']
	] as [string, number, string][]) {
		await ensureOptionValue(phoneCaseColorOptionId, value, position, colorHex);
	}

	const shirtSizeOptionId = await ensureOption(productIds['everyday-cotton-shirt'], 'Size', 0);
	for (const [value, position] of [
		['XS', 0],
		['S', 1],
		['M', 2],
		['L', 3],
		['XL', 4]
	] as [string, number][]) {
		await ensureOptionValue(shirtSizeOptionId, value, position);
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

	const bannerData = [
		{
			key: 'hero',
			title: 'MacBook M4 Pro',
			subtitle: 'Powerful performance. All-day battery.',
			imageUrl: '/assets/5e3ad.svg',
			ctaLabel: 'Purchase Now',
			ctaUrl: '/products/shield-phone-case',
			position: 0
		},
		{
			key: 'promo',
			title: 'Big Savings on Your Top Picks !',
			subtitle: 'Limited-time deals across every category',
			imageUrl: '/assets/5f833.svg',
			ctaLabel: 'Shop deals',
			ctaUrl: '/products?deal=true',
			position: 1
		},
		{
			key: 'cta',
			title: 'iPhone Performance in an Elegant Purple Finish.',
			subtitle: 'Discover the new iPhone 16 series.',
			imageUrl: '/assets/62017.svg',
			ctaLabel: 'Explore iPhone',
			ctaUrl: '/products/shield-phone-case',
			position: 2
		},
		{
			key: 'category',
			title: 'Shop by Category',
			subtitle: 'Find exactly what you need',
			imageUrl: '/assets/63a51.svg',
			ctaLabel: 'Browse categories',
			ctaUrl: '/categories',
			position: 3
		}
	];
	for (const banner of bannerData) {
		await upsertBy(s.banners, 'key', banner.key, {
			...banner,
			active: true
		});
	}

	await upsertBy(s.announcements, 'text' as any, 'Black Friday sale 22% off', {
		text: 'Black Friday sale 22% off',
		link: '/products',
		position: 0,
		active: true
	});
	await upsertBy(s.announcements, 'text' as any, 'Free shipping over $50', {
		text: 'Free shipping over $50',
		link: '/products',
		position: 1,
		active: true
	});

	const testimonialData = [
		['Excellent service and fast delivery.', '/assets/7af52.svg'],
		['The quality exceeded my expectations.', '/assets/7be42.svg'],
		['My favorite online store for everyday essentials.', '/assets/7c2f4.svg'],
		['Checkout was smooth and the packaging was great.', '/assets/7c830.svg'],
		['Great prices and honest product descriptions.', '/assets/7d41a.svg'],
		['Customer support helped me pick the perfect gift.', '/assets/7f047.svg']
	];
	for (const [caption, imageUrl] of testimonialData) {
		await upsertBy(s.testimonials, 'caption', caption, {
			imageUrl,
			caption,
			link: '/products',
			position: testimonialData.findIndex((row) => row[0] === caption),
			active: true
		});
	}

	await setSetting('footer.contact', {
		address1: 'Shop 009A, Level 4, Block A',
		address2: 'Demo Park, Ottawa',
		phone: '+1-613-598-6981',
		email: 'shopix@gmail.com'
	});
	await setSetting('footer.social', {
		instagram: 'https://instagram.com/shopix',
		facebook: 'https://facebook.com/shopix',
		twitter: 'https://x.com/shopix'
	});
	await setSetting('footer.downloads', {
		appStore: '#',
		googlePlay: '#'
	});
	await setSetting('checkout.shipping', [
		{
			id: 'standard',
			label: 'Standard Delivery',
			description: 'Delivered in 5–7 business days',
			priceCents: 0
		},
		{
			id: 'express',
			label: 'Express Delivery',
			description: 'Delivered in 1–2 business days',
			priceCents: 2000
		},
		{
			id: 'basic',
			label: 'Basic Delivery',
			description: 'Delivered in 3–5 business days',
			priceCents: 1000
		}
	]);
	await setSetting('store.currency', 'USD');

	const customerEmail = 'seed-customer@example.com';
	const customerId = await ensureUser(customerEmail, 'Seed Customer');
	await ensureCredentialAccount(customerId, 'Password123!');
	const reviewer1Id = await ensureUser('reviewer1@example.com', 'Maya Chen');
	const reviewer2Id = await ensureUser('reviewer2@example.com', 'Daniel Brooks');
	const reviewer3Id = await ensureUser('reviewer3@example.com', 'Sofia Ramirez');

	const phoneCaseId = productIds['shield-phone-case'];
	const shirtId = productIds['everyday-cotton-shirt'];

	const reviewData = [
		{
			productId: phoneCaseId,
			userId: customerId,
			rating: 5,
			title: 'Perfect fit and grip',
			body: 'Snaps on securely and the texture makes it easy to hold. Looks great on the blue iPhone.',
			helpfulCount: 18,
			daysAgo: 12
		},
		{
			productId: phoneCaseId,
			userId: reviewer1Id,
			rating: 5,
			title: 'Slim but protective',
			body: 'I dropped it once already and there was no damage. Still feels slim in my pocket.',
			helpfulCount: 9,
			daysAgo: 9
		},
		{
			productId: phoneCaseId,
			userId: reviewer2Id,
			rating: 4,
			title: 'Great value',
			body: 'Good protection for the price. The buttons are a little stiff at first but break in.',
			helpfulCount: 4,
			daysAgo: 7
		},
		{
			productId: phoneCaseId,
			userId: reviewer3Id,
			rating: 5,
			title: 'Looks premium',
			body: 'The matte finish resists fingerprints and the color matches the product photos.',
			helpfulCount: 6,
			daysAgo: 5
		},
		{
			productId: phoneCaseId,
			userId: customerId,
			rating: 4,
			title: 'Solid everyday case',
			body: 'Does everything I need. Wireless charging works without removing the case.',
			helpfulCount: 3,
			daysAgo: 2
		},
		{
			productId: shirtId,
			userId: reviewer2Id,
			rating: 5,
			title: 'So soft and roomy',
			body: 'The cotton is soft and the oversized fit is exactly what I wanted. Washes well too.',
			helpfulCount: 14,
			daysAgo: 10
		},
		{
			productId: shirtId,
			userId: reviewer3Id,
			rating: 4,
			title: 'Cute graphic',
			body: 'The print is clear and the blue color is lovely. It runs a touch large, which is fine.',
			helpfulCount: 7,
			daysAgo: 8
		},
		{
			productId: shirtId,
			userId: customerId,
			rating: 5,
			title: 'My new favorite tee',
			body: 'Lightweight, breathable and comfortable enough to wear all day.',
			helpfulCount: 5,
			daysAgo: 6
		},
		{
			productId: shirtId,
			userId: reviewer1Id,
			rating: 4,
			title: 'True to size',
			body: 'I ordered my usual size and the fit is relaxed without being baggy. Good quality seams.',
			helpfulCount: 3,
			daysAgo: 4
		},
		{
			productId: shirtId,
			userId: reviewer2Id,
			rating: 5,
			title: 'Love the oversized fit',
			body: 'Pairs well with jeans and leggings. Already thinking about ordering another color.',
			helpfulCount: 8,
			daysAgo: 1
		}
	];
	for (const review of reviewData) {
		await ensureReview(
			review.productId,
			review.userId,
			review.rating,
			review.title,
			review.body,
			review.helpfulCount,
			new Date(now.getTime() - review.daysAgo * 24 * 60 * 60 * 1000)
		);
	}

	const addressLine1 = '25 Union Square W';
	const [existingAddress] = await db
		.select({ id: s.addresses.id })
		.from(s.addresses)
		.where(and(eq(s.addresses.userId, customerId), eq(s.addresses.line1, addressLine1)))
		.limit(1);
	if (!existingAddress) {
		await db.insert(s.addresses).values({
			id: id(),
			userId: customerId,
			label: 'Home',
			recipientName: 'John Doe',
			phone: '123 456 0789',
			line1: addressLine1,
			line2: null,
			city: 'New York',
			region: 'NY',
			postalCode: '10003',
			country: 'USA',
			isDefaultShipping: true,
			isDefaultBilling: true,
			createdAt: now,
			updatedAt: now
		});
	}

	const paymentMethodData = [
		{ brand: 'Mastercard', last4: '7830', expMonth: 6, expYear: 2026, isDefault: true },
		{ brand: 'Visa', last4: '4962', expMonth: 10, expYear: 2026, isDefault: false }
	];
	for (const method of paymentMethodData) {
		const [existing] = await db
			.select({ id: s.paymentMethods.id })
			.from(s.paymentMethods)
			.where(and(eq(s.paymentMethods.userId, customerId), eq(s.paymentMethods.last4, method.last4)))
			.limit(1);
		if (existing) continue;

		await db.insert(s.paymentMethods).values({
			id: id(),
			userId: customerId,
			provider: 'seed',
			brand: method.brand,
			last4: method.last4,
			expMonth: method.expMonth,
			expYear: method.expYear,
			isDefault: method.isDefault,
			status: 'active',
			createdAt: now,
			updatedAt: now
		});
	}

	const shippingAddress = {
		recipientName: 'John Doe',
		phone: '123 456 0789',
		line1: addressLine1,
		line2: null,
		city: 'New York',
		region: 'NY',
		postalCode: '10003',
		country: 'USA'
	};

	const order1001Id = await upsertBy(s.orders, 'orderNumber', 'SEED-1001', {
		orderNumber: 'SEED-1001',
		userId: customerId,
		status: 'delivered',
		paymentStatus: 'paid',
		fulfillmentStatus: 'fulfilled',
		subtotalCents: 5000,
		discountCents: 500,
		shippingCents: 0,
		taxCents: 0,
		grandTotalCents: 4500,
		currency: 'USD',
		shippingAddressJson: shippingAddress,
		billingAddressJson: shippingAddress,
		placedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
	});

	const order1001ItemId = await ensureOrderItem(order1001Id, 'PHONE-CASE-001', {
		productId: phoneCaseId,
		variantId: firstVariantIds['shield-phone-case'] ?? null,
		productNameSnapshot: 'iPhone 16 Series - Back Case Cover Liquid Air',
		imageUrlSnapshot: '/assets/b359f.svg',
		quantity: 2,
		unitPriceCents: 2500,
		totalCents: 5000,
		status: 'fulfilled'
	});
	void order1001ItemId;

	await ensureOrderEvent(
		order1001Id,
		'placed',
		'Order placed',
		new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
	);
	await ensureOrderEvent(
		order1001Id,
		'paid',
		'Payment received',
		new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
	);
	await ensureOrderEvent(
		order1001Id,
		'shipped',
		'Package shipped',
		new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000)
	);
	await ensureOrderEvent(
		order1001Id,
		'delivered',
		'Package delivered',
		new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
	);
	await ensurePayment(order1001Id, 'seed_SEED-1001', {
		provider: 'seed',
		amountCents: 4500,
		status: 'succeeded',
		paidAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
	});
	await ensureShipment(order1001Id, '1Z-SEED-1001', {
		carrier: 'UPS',
		status: 'delivered',
		shippedAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
		deliveredAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
		eventsJson: [{ status: 'delivered', location: 'New York, NY' }]
	});

	const order1002Id = await upsertBy(s.orders, 'orderNumber', 'SEED-1002', {
		orderNumber: 'SEED-1002',
		userId: customerId,
		status: 'shipped',
		paymentStatus: 'paid',
		fulfillmentStatus: 'shipped',
		subtotalCents: 7800,
		discountCents: 0,
		shippingCents: 0,
		taxCents: 0,
		grandTotalCents: 7800,
		currency: 'USD',
		shippingAddressJson: shippingAddress,
		billingAddressJson: shippingAddress,
		trackingNumber: '1Z-SEED-1002',
		carrier: 'UPS',
		estimatedDeliveryAt: daysFromNow(3),
		placedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)
	});

	const order1002ShirtItemId = await ensureOrderItem(order1002Id, 'SHIRT-002-M', {
		productId: shirtId,
		variantId: firstVariantIds['everyday-cotton-shirt'] ?? null,
		productNameSnapshot: "Women's Blue Lazy Garfield Graphic Printed Oversized T-shirt",
		imageUrlSnapshot: '/assets/3134e.svg',
		quantity: 1,
		unitPriceCents: 4900,
		totalCents: 4900,
		status: 'shipped'
	});
	await ensureOrderItem(order1002Id, 'PHONE-CASE-001-BLK', {
		productId: phoneCaseId,
		variantId: firstVariantIds['shield-phone-case'] ?? null,
		productNameSnapshot: 'iPhone 16 Series - Back Case Cover Liquid Air',
		imageUrlSnapshot: '/assets/b359f.svg',
		quantity: 1,
		unitPriceCents: 2900,
		totalCents: 2900,
		status: 'shipped'
	});

	await ensureOrderEvent(
		order1002Id,
		'placed',
		'Order placed',
		new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)
	);
	await ensureOrderEvent(
		order1002Id,
		'processing',
		'Order is being prepared',
		new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
	);
	await ensureOrderEvent(
		order1002Id,
		'shipped',
		'Package shipped',
		new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
	);
	await ensurePayment(order1002Id, 'seed_SEED-1002', {
		provider: 'seed',
		amountCents: 7800,
		status: 'succeeded',
		paidAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)
	});
	await ensureShipment(order1002Id, '1Z-SEED-1002', {
		carrier: 'UPS',
		status: 'shipped',
		shippedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
		eventsJson: [{ status: 'shipped', location: 'New York, NY' }]
	});

	const [existingReturn] = await db
		.select({ id: s.returnRequests.id })
		.from(s.returnRequests)
		.where(
			and(
				eq(s.returnRequests.orderId, order1002Id),
				eq(s.returnRequests.orderItemId, order1002ShirtItemId)
			)
		)
		.limit(1);
	if (!existingReturn) {
		await db.insert(s.returnRequests).values({
			id: id(),
			orderId: order1002Id,
			orderItemId: order1002ShirtItemId,
			userId: customerId,
			type: 'return',
			reason: 'Item arrived with a loose thread',
			note: 'Would like a replacement or a refund.',
			status: 'requested',
			createdAt: now,
			updatedAt: now
		});
	}

	const ticket1001Id = await upsertBy(s.supportTickets, 'ticketNumber', 'TICKET-1001', {
		ticketNumber: 'TICKET-1001',
		userId: customerId,
		orderId: order1001Id,
		subject: 'Where is my order?',
		category: 'shipping',
		priority: 'normal',
		status: 'open'
	});
	await ensureSupportMessage(
		ticket1001Id,
		customerId,
		'Hi, my order SEED-1001 has not arrived yet. Could you check the status?',
		new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
	);
	await ensureSupportMessage(
		ticket1001Id,
		customerId,
		'Thanks, I can see the tracking is moving now. I will keep an eye on it.',
		new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
	);

	const ticket1002Id = await upsertBy(s.supportTickets, 'ticketNumber', 'TICKET-1002', {
		ticketNumber: 'TICKET-1002',
		userId: customerId,
		orderId: order1002Id,
		subject: 'Return request for T-shirt',
		category: 'returns',
		priority: 'normal',
		status: 'pending'
	});
	await ensureSupportMessage(
		ticket1002Id,
		customerId,
		'The T-shirt I received has a loose thread near the hem. Can I return or exchange it?',
		new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
	);

	await upsertBy(s.giftCards, 'code', 'GIFT-SEED-001', {
		code: 'GIFT-SEED-001',
		initialAmountCents: 5000,
		balanceCents: 5000,
		currency: 'USD',
		status: 'active',
		purchaserUserId: customerId,
		recipientEmail: customerEmail,
		message: 'Seeded gift card',
		expiresAt: daysFromNow(365)
	});

	const [newsletter] = await db
		.select({ id: s.newsletterSubscriptions.id })
		.from(s.newsletterSubscriptions)
		.where(eq(s.newsletterSubscriptions.email, customerEmail))
		.limit(1);
	if (!newsletter) {
		await db.insert(s.newsletterSubscriptions).values({
			id: id(),
			userId: customerId,
			email: customerEmail,
			status: 'subscribed',
			source: 'seed',
			createdAt: now,
			updatedAt: now
		});
	}

	console.log('Seed complete.');
}

await main();
