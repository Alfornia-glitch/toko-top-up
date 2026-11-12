import { beforeEach, describe, expect, test } from 'vitest';
import { unwrap } from '#shared';
import type { ContentService, ReviewsService } from '#modules/content/server.ts';
import type { TestClock } from '../support/clock.ts';
import { createAdminActor, createForbiddenActor, createSuperAdminActor } from '../support/actor.ts';

export interface SeedReview {
	id: string;
	productId: string;
	userId: string;
	rating: number;
	title?: string;
	body?: string;
	status?: 'pending' | 'approved' | 'rejected';
	createdAt?: Date;
}

const START = new Date('2026-01-01T00:00:00.000Z');

export interface ContentContractContext {
	service: ContentService;
	reviews: ReviewsService;
	productNames: Map<string, string>;
	/** Inserts a review row directly; there is no customer-facing creation yet. */
	seedReview(review: SeedReview): Promise<void>;
	clock: TestClock;
	reset(): Promise<void>;
}

export function runContentContract({
	service,
	reviews,
	productNames,
	seedReview,
	clock,
	reset
}: ContentContractContext): void {
	const admin = createAdminActor('content-admin');
	const superAdmin = createSuperAdminActor('content-super');
	const forbidden = createForbiddenActor();

	beforeEach(async () => {
		await reset();
		productNames.clear();
		clock.set(START);
	});

	describe('content items contract', () => {
		test('creates, lists, updates and deletes a banner', async () => {
			const id = unwrap(
				await service.createItem(
					'banners',
					{ key: 'hero', title: 'Sale', imageUrl: '/a.png', position: 1, active: true },
					admin
				)
			);

			const listed = unwrap(await service.listItems('banners', admin));
			expect(listed).toHaveLength(1);
			expect(listed[0]).toMatchObject({ id, title: 'Sale', subtitle: null, startsAt: null });

			const updated = unwrap(
				await service.updateItem(
					'banners',
					id,
					{ title: 'Big sale', startsAt: START.toISOString() },
					admin
				)
			);
			expect(updated).toMatchObject({ id, title: 'Big sale' });

			expect(unwrap(await service.deleteItem('banners', id, admin))).toBe(id);
			expect(unwrap(await service.listItems('banners', admin))).toEqual([]);
		});

		test('reports missing items and rejects callers without admin access', async () => {
			const missing = await service.updateItem('testimonials', 'nope', { imageUrl: '/x' }, admin);
			expect(missing.ok).toBe(false);
			if (!missing.ok) expect(missing.error.status).toBe(404);

			const denied = await service.listItems('banners', forbidden);
			expect(denied.ok).toBe(false);
			if (!denied.ok) expect(denied.error.status).toBe(403);
		});

		test('public content keeps only active items inside their schedule window', async () => {
			const base = { key: 'hero', title: 'T', imageUrl: '/a.png', active: true };
			await service.createItem('banners', { ...base, title: 'live' }, admin);
			await service.createItem(
				'banners',
				{ ...base, title: 'expired', endsAt: '2025-12-31T00:00:00.000Z' },
				admin
			);
			await service.createItem('banners', { ...base, title: 'off', active: false }, admin);

			const pub = unwrap(await service.getPublicContent());
			expect(pub.banners.map((item) => item.title)).toEqual(['live']);
		});
	});

	describe('media contract', () => {
		const asset = (path: string, folder = 'products') => ({
			path,
			url: `https://cdn.test/${path}`,
			contentType: 'image/png',
			sizeBytes: 100,
			folder,
			uploadedBy: 'someone'
		});

		test('records, lists, finds, aggregates and deletes assets', async () => {
			const first = unwrap(await service.recordMedia(asset('a.png'), admin));
			unwrap(await service.recordMedia(asset('b.png', 'brands'), admin));

			const page = unwrap(
				await service.listMedia({ page: 1, pageSize: 10, folder: 'products' }, admin)
			);
			expect(page.total).toBe(1);
			expect(page.data[0]).toMatchObject({ id: first, path: 'a.png' });

			const stats = unwrap(await service.getMediaStats(admin));
			expect(stats).toMatchObject({ assets: 2, bytes: 200 });
			expect(stats.folders).toHaveLength(2);

			expect(unwrap(await service.deleteMedia(first, admin)).id).toBe(first);
			const gone = await service.findMedia(first, admin);
			expect(gone.ok).toBe(false);
		});

		test('recording an upload only needs an authenticated actor', async () => {
			expect((await service.recordMedia(asset('c.png'), forbidden)).ok).toBe(true);
			expect((await service.recordMedia(asset('d.png'), null)).ok).toBe(false);
		});
	});

	describe('settings contract', () => {
		test('upserts, lists and deletes settings; writes need super access', async () => {
			unwrap(
				await service.putSettings({ currency: 'IDR', social: { instagram: 'x' } }, superAdmin)
			);
			unwrap(await service.putSettings({ currency: 'USD' }, superAdmin));

			const rows = unwrap(await service.listSettings());
			expect(rows.map((row) => [row.key, row.valueJson])).toEqual([
				['currency', 'USD'],
				['social', { instagram: 'x' }]
			]);
			expect(rows[0]?.updatedBy).toBe('content-super');

			const denied = await service.putSettings({ currency: 'EUR' }, admin);
			expect(denied.ok).toBe(false);

			expect(unwrap(await service.deleteSetting('currency', superAdmin))).toBe('currency');
			const missing = await service.deleteSetting('currency', superAdmin);
			expect(missing.ok).toBe(false);
		});
	});

	describe('reviews contract', () => {
		test('lists reviews for moderation with product and customer details', async () => {
			productNames.set('p1', 'Widget');
			await seedReview({
				id: 'r1',
				productId: 'p1',
				userId: 'user-ada',
				rating: 5,
				title: 'Great',
				body: 'Loved it'
			});
			await seedReview({
				id: 'r2',
				productId: 'p2',
				userId: 'user-bob',
				rating: 2,
				title: 'Meh',
				status: 'approved',
				createdAt: new Date('2026-01-02T00:00:00.000Z')
			});

			const all = unwrap(await reviews.listReviews({ page: 1, pageSize: 10 }, admin));
			expect(all.total).toBe(2);
			expect(all.data.map((r) => r.id)).toEqual(['r2', 'r1']);
			expect(all.data[1]).toMatchObject({
				productName: 'Widget',
				customerName: 'Ada',
				customerEmail: 'ada@example.test'
			});
			expect(all.data[0]).toMatchObject({ productName: null, customerName: 'Bob' });

			const pick = async (query: object) =>
				unwrap(await reviews.listReviews({ page: 1, pageSize: 10, ...query }, admin)).data.map(
					(r) => r.id
				);
			expect(await pick({ status: 'approved' })).toEqual(['r2']);
			expect(await pick({ rating: 5 })).toEqual(['r1']);
			expect(await pick({ productId: 'p1' })).toEqual(['r1']);
			expect(await pick({ q: 'loved' })).toEqual(['r1']);
		});

		test('moderates a review and keeps the rest of the record', async () => {
			await seedReview({ id: 'r1', productId: 'p1', userId: 'user-ada', rating: 4, title: 'Fine' });

			const approved = unwrap(await reviews.setReviewStatus('r1', 'approved', admin));
			expect(approved).toMatchObject({ id: 'r1', status: 'approved', rating: 4, title: 'Fine' });
			expect(
				unwrap(await reviews.listReviews({ page: 1, pageSize: 10 }, admin)).data[0]?.status
			).toBe('approved');

			const missing = await reviews.setReviewStatus('nope', 'approved', admin);
			expect(missing.ok).toBe(false);
			if (!missing.ok) expect(missing.error.status).toBe(404);
		});

		test('moderation needs admin access', async () => {
			const denied = await reviews.listReviews({ page: 1, pageSize: 10 }, forbidden);
			expect(denied.ok).toBe(false);
			if (!denied.ok) expect(denied.error.status).toBe(403);
			expect((await reviews.setReviewStatus('r1', 'approved', null)).ok).toBe(false);
		});

		test('public reads show only approved reviews, newest first, with reviewer details', async () => {
			await seedReview({
				id: 'old',
				productId: 'p1',
				userId: 'user-ada',
				rating: 5,
				title: 'Old',
				status: 'approved'
			});
			await seedReview({
				id: 'new',
				productId: 'p1',
				userId: 'user-bob',
				rating: 3,
				title: 'New',
				status: 'approved',
				createdAt: new Date('2026-01-05T00:00:00.000Z')
			});
			await seedReview({ id: 'pending', productId: 'p1', userId: 'user-ada', rating: 1 });
			await seedReview({
				id: 'other',
				productId: 'p2',
				userId: 'user-ada',
				rating: 4,
				status: 'approved'
			});

			const list = unwrap(await reviews.listApprovedReviews('p1', 10));
			expect(list.map((r) => r.id)).toEqual(['new', 'old']);
			expect(list[1]).toMatchObject({ customerName: 'Ada', customerImage: '/ada.png' });
			expect(unwrap(await reviews.listApprovedReviews('p1', 1))).toHaveLength(1);

			expect(unwrap(await reviews.getRatingBuckets('p1'))).toEqual({
				'1': 0,
				'2': 0,
				'3': 1,
				'4': 0,
				'5': 1
			});
			expect(unwrap(await reviews.getRatingBuckets('empty'))).toEqual({
				'1': 0,
				'2': 0,
				'3': 0,
				'4': 0,
				'5': 0
			});
		});
	});
}
