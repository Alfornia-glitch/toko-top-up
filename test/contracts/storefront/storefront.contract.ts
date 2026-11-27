import { beforeEach, describe, expect, test } from 'vitest';
import { unwrap, type Actor } from '#shared';
import type { ProductWriteInput } from '#modules/catalog/index.ts';
import type { CatalogServices } from '#modules/catalog/server.ts';
import type { ContentService } from '#modules/content/server.ts';
import type { CustomersServices } from '#modules/customers/server.ts';
import type { StorefrontService } from '#modules/storefront/server.ts';
import type { TestClock } from '../support/clock.ts';
import { createAdminActor, createForbiddenActor, createSuperAdminActor } from '../support/actor.ts';

const START = new Date('2026-01-01T00:00:00.000Z');

export interface StorefrontContractContext {
	storefront: StorefrontService;
	catalog: CatalogServices;
	content: ContentService;
	customers: CustomersServices['customers'];
	clock: TestClock;
	reset(): Promise<void>;
	/** Inserts a review row directly; there is no customer-facing creation yet. */
	seedReview(review: {
		id: string;
		productId: string;
		userId: string;
		rating: number;
		title: string;
		status: 'pending' | 'approved' | 'rejected';
	}): Promise<void>;
	createActor(): Promise<string>;
	createBrand(name?: string): Promise<string>;
	createCategory(name?: string): Promise<string>;
}

export function runStorefrontContract(context: StorefrontContractContext): void {
	const { storefront, catalog, content, customers, clock, reset } = context;
	const ada: Actor = createForbiddenActor('user-ada');
	const superAdmin = createSuperAdminActor('storefront-super');
	let admin = createAdminActor('pending');

	beforeEach(async () => {
		await reset();
		clock.set(START);
		admin = createAdminActor(await context.createActor());
	});

	let counter = 0;
	async function product(overrides: Partial<ProductWriteInput> = {}): Promise<string> {
		counter += 1;
		const created = await catalog.products.create(
			{
				sku: `SKU-${counter}`,
				name: `Product ${counter}`,
				status: 'active',
				price: 1000,
				variants: [{ sku: `SKU-${counter}-V`, name: 'Default', price: 1000, stock: 5 }],
				...overrides
			},
			admin
		);
		return unwrap(created).id;
	}

	async function names(query: Parameters<StorefrontService['listProducts']>[0] = {}) {
		return unwrap(await storefront.listProducts(query)).data.map((row) => row.name);
	}

	describe('browsing products', () => {
		test('lists only active products with image, stock and pagination', async () => {
			await product({
				name: 'Alpha',
				images: [
					{ url: '/a.png', position: 1 },
					{ url: '/first.png', position: 0 }
				]
			});
			await product({ name: 'Draft', status: 'draft' });
			await product({ name: 'Archived', status: 'archived' });
			await product({ name: 'Beta' });

			const all = unwrap(await storefront.listProducts({ sort: 'newest' }));
			expect(all.total).toBe(2);
			const alpha = all.data.find((row) => row.name === 'Alpha');
			expect(alpha).toMatchObject({ imageUrl: '/first.png', stock: 5, brandName: null });

			const page = unwrap(
				await storefront.listProducts({ page: 2, pageSize: 1, sort: 'price_asc' })
			);
			expect(page).toMatchObject({ page: 2, pageSize: 1, total: 2 });
			expect(page.data).toHaveLength(1);
			expect(unwrap(await storefront.listProducts({ pageSize: 500 })).pageSize).toBe(60);
		});

		test('sorts and filters by price, rating, search, brand, category and flags', async () => {
			const brandId = await context.createBrand('Acme');
			const categoryId = await context.createCategory('Phones');
			await product({ name: 'Cheap', price: 500, variants: [] });
			await product({
				name: 'Mid',
				price: 1500,
				brandId,
				categoryId,
				isFeatured: true,
				variants: []
			});
			await product({
				name: 'Dear',
				price: 9000,
				brandId,
				isDeal: true,
				isNewArrival: true,
				compareAtPrice: 12000,
				variants: []
			});

			expect(await names({ sort: 'price_asc' })).toEqual(['Cheap', 'Mid', 'Dear']);
			expect(await names({ sort: 'price_desc' })).toEqual(['Dear', 'Mid', 'Cheap']);
			expect(await names({ minPrice: 1000, maxPrice: 2000 })).toEqual(['Mid']);
			expect(await names({ brandId, sort: 'price_asc' })).toEqual(['Mid', 'Dear']);
			expect(await names({ categoryId })).toEqual(['Mid']);
			expect(await names({ featured: true })).toEqual(['Mid']);
			expect(await names({ deal: true })).toEqual(['Dear']);
			expect(await names({ newArrival: true })).toEqual(['Dear']);
			expect(await names({ q: 'chea' })).toEqual(['Cheap']);
			expect(await names({ minRating: 3 })).toEqual([]);
		});

		test('filters by colour and stock in memory and reports facets', async () => {
			const brandId = await context.createBrand('Acme');
			await product({
				name: 'Red phone',
				brandId,
				price: 2000,
				compareAtPrice: 2500,
				variants: [
					{
						sku: 'R-1',
						name: 'Red',
						price: 2000,
						stock: 3,
						optionValuesJson: { Color: 'red' }
					}
				]
			});
			await product({
				name: 'Blue phone',
				price: 3000,
				variants: [
					{
						sku: 'B-1',
						name: 'Blue',
						price: 3000,
						stock: 0,
						optionValuesJson: { colour: 'blue' }
					}
				]
			});

			expect(await names({ color: 'RED' })).toEqual(['Red phone']);
			expect(await names({ inStock: true })).toEqual(['Red phone']);
			expect(await names({ color: 'blue', inStock: true })).toEqual([]);

			const { facets } = unwrap(await storefront.listProducts());
			expect(facets.colors).toEqual(['Blue', 'Red']);
			expect(facets.price).toEqual({ min: 2000, max: 3000 });
			expect(facets.discounts).toEqual([20]);
			expect(facets.brands.map((b) => b.name)).toEqual(['Acme']);
		});
	});

	describe('product pages', () => {
		test('shows an active product with images, options, active variants, reviews and related products', async () => {
			const categoryId = await context.createCategory('Phones');
			const brandId = await context.createBrand('Acme');
			const main = await product({
				name: 'Main',
				slug: 'main',
				categoryId,
				brandId,
				images: [{ url: '/main.png', position: 0 }],
				options: [{ name: 'Color', position: 0, values: [{ value: 'Red', position: 0 }] }],
				variants: [
					{ sku: 'M-1', name: 'Active', price: 1000, stock: 2 },
					{ sku: 'M-2', name: 'Hidden', price: 900, stock: 2, status: 'inactive' }
				]
			});
			await context.seedReview({
				id: 'review-ok',
				productId: main,
				userId: 'user-reviewer',
				rating: 4,
				title: 'Great',
				status: 'approved'
			});
			await context.seedReview({
				id: 'review-pending',
				productId: main,
				userId: 'user-reviewer',
				rating: 1,
				title: 'Waiting',
				status: 'pending'
			});
			await product({ name: 'Same category', categoryId, variants: [] });
			await product({ name: 'Same brand', brandId, variants: [] });
			await product({ name: 'Both', categoryId, brandId, variants: [] });
			await product({ name: 'Unrelated', variants: [] });
			await product({ name: 'Draft sibling', categoryId, status: 'draft', variants: [] });

			const page = unwrap(await storefront.getProduct('main'));
			expect(page).toMatchObject({
				id: main,
				name: 'Main',
				brandName: 'Acme',
				categoryName: 'Phones'
			});
			expect(page.images.map((i) => i.url)).toEqual(['/main.png']);
			expect(page.options[0]).toMatchObject({ name: 'Color' });
			expect(page.options[0]?.values.map((v) => v.value)).toEqual(['Red']);
			expect(page.variants.map((v) => v.name)).toEqual(['Active']);
			expect(page.reviews).toEqual([
				expect.objectContaining({ title: 'Great', customerName: 'Reviewer' })
			]);
			expect(page.ratingBuckets).toEqual({ '1': 0, '2': 0, '3': 0, '4': 1, '5': 0 });

			const related = page.related.map((row) => row.name).sort();
			expect(related).toEqual(['Both', 'Same brand', 'Same category']);
		});

		test('unknown, draft and archived products are not found', async () => {
			await product({ name: 'Hidden', slug: 'hidden', status: 'draft' });
			for (const slug of ['hidden', 'nope']) {
				const result = await storefront.getProduct(slug);
				expect(result.ok).toBe(false);
				if (!result.ok)
					expect(result.error).toMatchObject({ status: 404, message: 'Product not found' });
			}
		});
	});

	describe('categories and home', () => {
		test('lists active categories with product counts', async () => {
			const phones = await context.createCategory('Phones');
			await context.createCategory('Empty');
			await product({ categoryId: phones, variants: [] });
			await product({ categoryId: phones, variants: [] });
			await product({ categoryId: phones, status: 'draft', variants: [] });

			const categories = unwrap(await storefront.listCategories());
			expect(categories.find((c) => c.id === phones)?.productCount).toBe(2);
			expect(categories.find((c) => c.name === 'Empty')?.productCount).toBe(0);
		});

		test('home combines content with product rows', async () => {
			unwrap(
				await content.createItem(
					'banners',
					{ key: 'hero', title: 'Sale', imageUrl: '/b.png', active: true },
					admin
				)
			);
			unwrap(
				await content.createItem(
					'announcements',
					{ text: 'Old', active: true, endsAt: '2025-12-31T00:00:00.000Z' },
					admin
				)
			);
			await product({
				name: 'Hot',
				isFeatured: true,
				isDeal: true,
				isNewArrival: true,
				variants: []
			});

			const home = unwrap(await storefront.getHome());
			expect(home.banners.map((b) => b.title)).toEqual(['Sale']);
			expect(home.announcements).toEqual([]);
			for (const row of [home.deals, home.newArrivals, home.featured, home.popular]) {
				expect(row.map((p) => p.name)).toEqual(['Hot']);
			}
		});
	});

	describe('site settings', () => {
		test('layers stored settings over the defaults', async () => {
			const defaults = unwrap(await storefront.getSiteSettings());
			expect(defaults.currency).toBe('IDR');
			expect(defaults.shipping.map((m) => m.id)).toEqual(['standard', 'express', 'basic']);

			unwrap(
				await content.putSettings(
					{ currency: 'IDR', contact: { phone: '123' }, shipping: [{ id: 'one', price: 1 }] },
					superAdmin
				)
			);
			const stored = unwrap(await storefront.getSiteSettings());
			expect(stored.currency).toBe('IDR');
			expect(stored.contact).toMatchObject({ phone: '123', email: 'shopix@gmail.com' });
			expect(stored.shipping).toEqual([{ id: 'one', price: 1 }]);
		});

		test('storefront layout defaults to regular and accepts only known layouts', async () => {
			const defaults = unwrap(await storefront.getSiteSettings());
			expect(defaults.storefrontLayout).toBe('regular');

			unwrap(await content.putSettings({ storefrontLayout: 'topup' }, superAdmin));
			expect(unwrap(await storefront.getSiteSettings()).storefrontLayout).toBe('topup');

			unwrap(await content.putSettings({ storefrontLayout: 'bogus' }, superAdmin));
			expect(unwrap(await storefront.getSiteSettings()).storefrontLayout).toBe('regular');
		});

		test('store name and logo fall back to defaults when stored values are invalid', async () => {
			const defaults = unwrap(await storefront.getSiteSettings());
			expect(defaults.storeName).toBe('Shopix');
			expect(defaults.logoUrl).toBeNull();

			unwrap(
				await content.putSettings(
					{ storeName: '  Toko Saya  ', logoUrl: 'https://cdn.example.com/store/logo.png' },
					superAdmin
				)
			);
			const saved = unwrap(await storefront.getSiteSettings());
			expect(saved.storeName).toBe('Toko Saya');
			expect(saved.logoUrl).toBe('https://cdn.example.com/store/logo.png');

			unwrap(
				await content.putSettings({ storeName: '   ', logoUrl: 'javascript:alert(1)' }, superAdmin)
			);
			// Invalid stored values resolve to the defaults; the write endpoint rejects them up front.
			const afterInvalid = unwrap(await storefront.getSiteSettings());
			expect(afterInvalid.storeName).toBe('Shopix');
			expect(afterInvalid.logoUrl).toBeNull();

			unwrap(await content.putSettings({ logoUrl: '' }, superAdmin));
			expect(unwrap(await storefront.getSiteSettings()).logoUrl).toBeNull();
		});
	});

	describe('wishlist', () => {
		test('adds active products idempotently, lists newest first and removes', async () => {
			const first = await product({ name: 'First', variants: [] });
			const second = await product({ name: 'Second', variants: [] });

			unwrap(await storefront.addToWishlist(first, ada));
			unwrap(await storefront.addToWishlist(first, ada));
			clock.set(new Date('2026-01-02T00:00:00.000Z'));
			unwrap(await storefront.addToWishlist(second, ada));

			const list = unwrap(await storefront.listWishlist(ada));
			expect(list.map((p) => p.name)).toEqual(['Second', 'First']);
			expect(list[0]?.wishlistedAt).toEqual(new Date('2026-01-02T00:00:00.000Z'));

			unwrap(await storefront.removeFromWishlist(first, ada));
			expect(unwrap(await storefront.listWishlist(ada)).map((p) => p.name)).toEqual(['Second']);
			const again = await storefront.removeFromWishlist(first, ada);
			expect(again.ok).toBe(false);
		});

		test('refuses products that are not active and hides ones that stopped being active', async () => {
			const draft = await product({ status: 'draft', variants: [] });
			const refused = await storefront.addToWishlist(draft, ada);
			expect(refused.ok).toBe(false);
			if (!refused.ok) expect(refused.error.status).toBe(404);

			const live = await product({ name: 'Live', variants: [] });
			unwrap(await storefront.addToWishlist(live, ada));
			unwrap(await catalog.products.setStatus(live, 'archived', admin));
			expect(unwrap(await storefront.listWishlist(ada))).toEqual([]);

			expect((await storefront.listWishlist(null)).ok).toBe(false);
			expect((await customers.listWishlist(ada)).ok).toBe(true);
		});
	});
}
