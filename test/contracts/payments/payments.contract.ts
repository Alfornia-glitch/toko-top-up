import { beforeEach, describe, expect, test } from 'vitest';
import { unwrap, type Actor } from '#shared';
import type { PaymentsService } from '#modules/payments/server.ts';
import type { TestClock } from '../support/clock.ts';
import { createAdminActor, createForbiddenActor } from '../support/actor.ts';
import type { createFakeOrders } from './fake-orders.ts';

const START = new Date('2026-01-01T00:00:00.000Z');

export interface PaymentsContractContext {
	service: PaymentsService;
	orders: ReturnType<typeof createFakeOrders>;
	clock: TestClock;
	expired: string[];
	reset(): Promise<void>;
}

const alice: Actor = { ...createForbiddenActor('alice') };
const bob: Actor = { ...createForbiddenActor('bob') };
const admin = createAdminActor('admin-1');

/** Distinct valid image bytes per seed (PNG signature + chunks; the content only needs to differ). */
function png(seed: number, extra: Uint8Array[] = []): Uint8Array {
	const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
	const chunk = (type: string, data: number[]) => {
		const out = [
			0,
			0,
			0,
			data.length,
			...[...type].map((c) => c.charCodeAt(0)),
			...data,
			0,
			0,
			0,
			0
		];
		return out;
	};
	const bytes = [
		...sig,
		...chunk('IHDR', [0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]),
		...chunk('IDAT', [seed, seed >> 8])
	];
	for (const e of extra) bytes.push(...e);
	return Uint8Array.from([...bytes, ...chunk('IEND', [])]);
}

function file(bytes: Uint8Array, name = 'proof.png') {
	return { name, size: bytes.length, bytes };
}

export function runPaymentsContract(ctx: PaymentsContractContext) {
	const { service, orders, clock } = ctx;
	let seq = 0;

	function newOrder(userId = 'alice', total = 150_000) {
		const id = `order-${++seq}`;
		return orders.add({ id, userId, grandTotalCents: total });
	}

	beforeEach(async () => {
		await ctx.reset();
		clock.set(START);
		ctx.expired.length = 0;
		orders.markPaidCalls.length = 0;
	});

	describe('payments: creation and unique amount', () => {
		test('total = base + unique code, computed server side', async () => {
			const order = newOrder();
			const payment = unwrap(await service.createPayment(order.id, alice));
			expect(payment.baseAmount).toBe(150_000);
			expect(payment.uniqueCode).toBeGreaterThanOrEqual(1);
			expect(payment.uniqueCode).toBeLessThanOrEqual(999);
			expect(payment.totalAmount).toBe(150_000 + payment.uniqueCode);
			expect(payment.expiresAt.getTime()).toBe(START.getTime() + 30 * 60_000);
		});

		test('open orders never share a total (collision is retried)', async () => {
			const totals = new Set<number>();
			for (let i = 0; i < 40; i++) {
				const payment = unwrap(await service.createPayment(newOrder('alice').id, alice));
				totals.add(payment.totalAmount);
			}
			expect(totals.size).toBe(40);
		});

		test('creating twice for one order returns the same payment', async () => {
			const order = newOrder();
			const a = unwrap(await service.createPayment(order.id, alice));
			const b = unwrap(await service.createPayment(order.id, alice));
			expect(b.id).toBe(a.id);
		});

		test("cannot create a payment for someone else's order", async () => {
			const order = newOrder('alice');
			const result = await service.createPayment(order.id, bob);
			expect(result.ok).toBe(false);
		});
	});

	describe('payments: proof upload', () => {
		test('valid proof moves the payment to awaiting_verification', async () => {
			const payment = unwrap(await service.createPayment(newOrder().id, alice));
			const updated = unwrap(await service.uploadProof(payment.id, file(png(1)), alice));
			expect(updated.status).toBe('awaiting_verification');
		});

		test('upload after expiry is blocked', async () => {
			const payment = unwrap(await service.createPayment(newOrder().id, alice));
			clock.set(new Date(START.getTime() + 31 * 60_000));
			const result = await service.uploadProof(payment.id, file(png(2)), alice);
			expect(result.ok).toBe(false);
		});

		test('duplicate image is rejected with a clear message', async () => {
			const first = unwrap(await service.createPayment(newOrder().id, alice));
			const second = unwrap(await service.createPayment(newOrder().id, alice));
			unwrap(await service.uploadProof(first.id, file(png(3)), alice));
			const result = await service.uploadProof(second.id, file(png(3)), alice);
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.error.message).toMatch(/already been submitted/);
		});

		test('rejects non-images, spoofed extensions and oversized files', async () => {
			const payment = unwrap(await service.createPayment(newOrder().id, alice));
			const text = new TextEncoder().encode('<?php echo 1; ?>');
			const spoofed = await service.uploadProof(payment.id, file(text, 'proof.png'), alice);
			expect(spoofed.ok).toBe(false);

			const gif = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0]);
			expect((await service.uploadProof(payment.id, file(gif, 'a.jpg'), alice)).ok).toBe(false);

			const big = new Uint8Array(5 * 1024 * 1024 + 1);
			big.set(png(4));
			expect((await service.uploadProof(payment.id, file(big), alice)).ok).toBe(false);
		});

		test('EXIF/text metadata is stripped from stored proofs', async () => {
			const payment = unwrap(await service.createPayment(newOrder().id, alice));
			const text = Uint8Array.from([
				0,
				0,
				0,
				4,
				...[...'tEXt'].map((c) => c.charCodeAt(0)),
				0x61,
				0x62,
				0x63,
				0x64,
				0,
				0,
				0,
				0
			]);
			const dirty = png(5);
			// Insert a tEXt chunk after the 8-byte signature.
			const withText = Uint8Array.from([...dirty.slice(0, 8), ...text, ...dirty.slice(8)]);
			unwrap(await service.uploadProof(payment.id, file(withText), alice));
			const stored = unwrap(await service.readProof(payment.id, null, alice));
			expect(new TextDecoder('latin1').decode(stored.bytes)).not.toContain('tEXt');
		});

		test('uploads are rate limited per payment', async () => {
			const payment = unwrap(await service.createPayment(newOrder().id, alice));
			for (let i = 0; i < 5; i++) {
				const result = await service.uploadProof(payment.id, file(png(100 + i)), alice);
				expect(result.ok).toBe(true);
				if (i < 4) {
					// Bounce back to rejected so re-upload is allowed.
					unwrap(await service.reject(payment.id, { reason: 'unreadable' }, admin));
				}
			}
			const sixth = await service.uploadProof(payment.id, file(png(200)), alice);
			expect(sixth.ok).toBe(false);
		});
	});

	describe('payments: authorization', () => {
		test('only the owner can read a payment or its proof', async () => {
			const payment = unwrap(await service.createPayment(newOrder('alice').id, alice));
			unwrap(await service.uploadProof(payment.id, file(png(6)), alice));
			expect((await service.getMyPayment(payment.id, bob)).ok).toBe(false);
			expect((await service.readProof(payment.id, null, bob)).ok).toBe(false);
			expect((await service.uploadProof(payment.id, file(png(7)), bob)).ok).toBe(false);
			expect((await service.readProof(payment.id, null, admin)).ok).toBe(true);
		});

		test('non-admins cannot use the review queue or decisions', async () => {
			const payment = unwrap(await service.createPayment(newOrder().id, alice));
			unwrap(await service.uploadProof(payment.id, file(png(8)), alice));
			expect((await service.listQueue({ page: 1, pageSize: 10 }, alice)).ok).toBe(false);
			expect((await service.getAdminDetail(payment.id, alice)).ok).toBe(false);
			expect((await service.approve(payment.id, alice)).ok).toBe(false);
			expect((await service.reject(payment.id, { reason: 'other' }, alice)).ok).toBe(false);
			expect((await service.approve(payment.id, null)).ok).toBe(false);
		});
	});

	describe('payments: review', () => {
		test('queue lists awaiting payments oldest first with admin detail', async () => {
			const first = unwrap(await service.createPayment(newOrder().id, alice));
			clock.set(new Date(START.getTime() + 1000));
			const second = unwrap(await service.createPayment(newOrder().id, alice));
			unwrap(await service.uploadProof(second.id, file(png(9)), alice));
			unwrap(await service.uploadProof(first.id, file(png(10)), alice));

			const queue = unwrap(
				await service.listQueue({ status: 'awaiting_verification', page: 1, pageSize: 10 }, admin)
			);
			expect(queue.data.map((row) => row.id)).toEqual([first.id, second.id]);

			const detail = unwrap(await service.getAdminDetail(first.id, admin));
			expect(detail.proofs).toHaveLength(1);
			expect(detail.audit.map((entry) => entry.action)).toEqual(['created', 'proof_uploaded']);
		});

		test('approve is atomic and idempotent (no double fulfilment effect)', async () => {
			const order = newOrder();
			const payment = unwrap(await service.createPayment(order.id, alice));
			unwrap(await service.uploadProof(payment.id, file(png(11)), alice));

			const approved = unwrap(await service.approve(payment.id, admin));
			expect(approved.status).toBe('paid');
			expect(approved.paidAt).not.toBeNull();
			expect(orders.get(order.id)?.status).toBe('paid');

			const again = unwrap(await service.approve(payment.id, admin));
			expect(again.status).toBe('paid');

			const detail = unwrap(await service.getAdminDetail(payment.id, admin));
			expect(detail.audit.filter((entry) => entry.action === 'approved')).toHaveLength(1);
			expect(detail.proofs[0]?.reviewStatus).toBe('approved');
		});

		test('reject needs a listed reason, notifies, then re-upload and approve works', async () => {
			const order = newOrder();
			const payment = unwrap(await service.createPayment(order.id, alice));
			unwrap(await service.uploadProof(payment.id, file(png(12)), alice));

			expect((await service.reject(payment.id, { reason: 'because' }, admin)).ok).toBe(false);

			const rejected = unwrap(
				await service.reject(payment.id, { reason: 'wrong_amount', note: 'Paid 100k' }, admin)
			);
			expect(rejected.status).toBe('rejected');
			expect(rejected.rejectReason).toBe('wrong_amount');
			expect(orders.get(order.id)?.notes.join(' ')).toMatch(/rejected/);

			const reuploaded = unwrap(await service.uploadProof(payment.id, file(png(13)), alice));
			expect(reuploaded.status).toBe('awaiting_verification');

			const paid = unwrap(await service.approve(payment.id, admin));
			expect(paid.status).toBe('paid');
		});

		test('cannot approve or reject a payment that has no proof awaiting review', async () => {
			const payment = unwrap(await service.createPayment(newOrder().id, alice));
			expect((await service.approve(payment.id, admin)).ok).toBe(false);
			expect((await service.reject(payment.id, { reason: 'other' }, admin)).ok).toBe(false);
		});

		test('gateway extension point marks paid through the same path', async () => {
			const order = newOrder();
			const payment = unwrap(await service.createPayment(order.id, alice));
			unwrap(await service.uploadProof(payment.id, file(png(14)), alice));
			const paid = unwrap(await service.markPaid(payment.id, null));
			expect(paid.status).toBe('paid');
			expect(orders.get(order.id)?.status).toBe('paid');
		});
	});

	describe('payments: expiry', () => {
		test('lapsed payments expire lazily on read and free their amount', async () => {
			const order = newOrder();
			const payment = unwrap(await service.createPayment(order.id, alice));
			clock.set(new Date(START.getTime() + 31 * 60_000));
			const view = unwrap(await service.getMyPayment(payment.id, alice));
			expect(view.status).toBe('expired');
			expect(ctx.expired).toEqual([order.id]);
		});

		test('expireDue sweeps unpaid payments but not awaiting ones', async () => {
			const a = unwrap(await service.createPayment(newOrder().id, alice));
			const b = unwrap(await service.createPayment(newOrder().id, alice));
			unwrap(await service.uploadProof(b.id, file(png(15)), alice));
			clock.set(new Date(START.getTime() + 31 * 60_000));
			expect(unwrap(await service.expireDue()).expired).toBe(1);
			expect(unwrap(await service.getMyPayment(a.id, alice)).status).toBe('expired');
			expect(unwrap(await service.getMyPayment(b.id, alice)).status).toBe('awaiting_verification');
		});
	});
}
