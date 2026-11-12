import { beforeEach, describe, expect, test } from 'vitest';
import { unwrap } from '#shared';
import type { AuditService } from '#modules/audit/server.ts';
import type { TestClock } from '../support/clock.ts';
import { createAdminActor, createSuperAdminActor } from '../support/actor.ts';

const START = new Date('2026-04-01T00:00:00.000Z');
const DAY = 86_400_000;

export interface AuditContractContext {
	service: AuditService;
	clock: TestClock;
	reset(): Promise<void>;
}

export function runAuditContract({ service, clock, reset }: AuditContractContext): void {
	const superAdmin = createSuperAdminActor('audit-super');
	const admin = createAdminActor('audit-admin');

	beforeEach(async () => {
		await reset();
		clock.set(START);
	});

	describe('recording', () => {
		test('stores the entry with the actor, request details and before/after state', async () => {
			unwrap(
				await service.record({
					actorUserId: 'user-admin',
					action: 'coupon.update',
					entityType: 'coupon',
					entityId: 'c1',
					before: { value: 10 },
					after: { value: 15 },
					ipAddress: '10.0.0.1',
					userAgent: 'vitest'
				})
			);

			const { data, total } = unwrap(await service.list({ page: 1, pageSize: 10 }, superAdmin));
			expect(total).toBe(1);
			expect(data[0]).toMatchObject({
				actorUserId: 'user-admin',
				action: 'coupon.update',
				entityType: 'coupon',
				entityId: 'c1',
				beforeJson: { value: 10 },
				afterJson: { value: 15 },
				ipAddress: '10.0.0.1',
				userAgent: 'vitest',
				createdAt: START
			});
		});

		test('optional fields default to null and no actor is needed to record', async () => {
			unwrap(await service.record({ action: 'system.boot', entityType: 'system' }));

			const [entry] = unwrap(await service.list({ page: 1, pageSize: 10 }, superAdmin)).data;
			expect(entry).toMatchObject({
				actorUserId: null,
				entityId: null,
				beforeJson: null,
				afterJson: null,
				ipAddress: null,
				userAgent: null
			});
		});
	});

	describe('reading', () => {
		test('lists newest first, filters by action text and entity type, and paginates', async () => {
			for (const [offset, action, entityType] of [
				[3, 'coupon.create', 'coupon'],
				[2, 'order.update', 'order'],
				[1, 'coupon.delete', 'coupon']
			] as const) {
				clock.set(new Date(START.getTime() + offset * 1000));
				unwrap(await service.record({ action, entityType }));
			}

			const all = unwrap(await service.list({ page: 1, pageSize: 10 }, superAdmin));
			expect(all.data.map((e) => e.action)).toEqual([
				'coupon.create',
				'order.update',
				'coupon.delete'
			]);

			const byText = unwrap(await service.list({ page: 1, pageSize: 10, q: 'coupon' }, superAdmin));
			expect(byText.total).toBe(2);
			const byType = unwrap(
				await service.list({ page: 1, pageSize: 10, status: 'order' }, superAdmin)
			);
			expect(byType.data.map((e) => e.action)).toEqual(['order.update']);

			const page = unwrap(await service.list({ page: 2, pageSize: 2 }, superAdmin));
			expect(page).toMatchObject({ page: 2, pageSize: 2, total: 3 });
			expect(page.data).toHaveLength(1);
		});

		test('counts entries', async () => {
			unwrap(await service.record({ action: 'a', entityType: 'x' }));
			unwrap(await service.record({ action: 'b', entityType: 'x' }));
			expect(unwrap(await service.count(superAdmin))).toBe(2);
		});
	});

	describe('retention', () => {
		test('purges entries older than the cutoff and keeps recent ones', async () => {
			for (const daysAgo of [200, 91, 89, 1]) {
				clock.set(new Date(START.getTime() - daysAgo * DAY));
				unwrap(await service.record({ action: `age.${daysAgo}`, entityType: 'x' }));
			}
			clock.set(START);

			expect(unwrap(await service.purgeOld(superAdmin))).toBe(2);
			expect(
				unwrap(await service.list({ page: 1, pageSize: 10 }, superAdmin)).data.map((e) => e.action)
			).toEqual(['age.1', 'age.89']);

			expect(unwrap(await service.purgeOld(superAdmin, 30))).toBe(1);
			expect(unwrap(await service.count(superAdmin))).toBe(1);
		});
	});

	test('reading and purging need superadmin access', async () => {
		for (const result of [
			await service.list({ page: 1, pageSize: 10 }, admin),
			await service.count(admin),
			await service.purgeOld(admin),
			await service.purgeOld(null)
		]) {
			expect(result.ok).toBe(false);
			if (!result.ok) expect([401, 403]).toContain(result.error.status);
		}
	});
}
