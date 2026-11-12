import { beforeEach, describe, expect, test } from 'vitest';
import { unwrap, type Actor } from '#shared';
import type { SupportService } from '#modules/support/server.ts';
import type { TestClock } from '../support/clock.ts';
import { createAdminActor, createForbiddenActor } from '../support/actor.ts';

const START = new Date('2026-01-01T00:00:00.000Z');

export interface SupportContractContext {
	service: SupportService;
	clock: TestClock;
	reset(): Promise<void>;
}

function customerActor(id: string): Actor {
	return createForbiddenActor(id);
}

const input = { subject: 'Where is my order?', category: 'orders', message: 'Please help' };

export function runSupportContract({ service, clock, reset }: SupportContractContext): void {
	const ada = customerActor('user-ada');
	const bob = customerActor('user-bob');
	const admin = createAdminActor('user-admin');

	beforeEach(async () => {
		await reset();
		clock.set(START);
	});

	describe('customer tickets contract', () => {
		test('creates a ticket with its first message and lists it', async () => {
			const created = unwrap(await service.createTicket({ ...input, orderId: 'order-1' }, ada));
			expect(created).toMatchObject({ status: 'open', priority: 'normal', orderId: 'order-1' });
			expect(created.messages).toHaveLength(1);
			expect(created.messages[0]).toMatchObject({ body: 'Please help', senderName: 'Ada' });
			expect(created).not.toHaveProperty('assignedAdminId');

			expect(unwrap(await service.listMyTickets(ada)).map((t) => t.id)).toEqual([created.id]);
			expect(unwrap(await service.listMyTickets(bob))).toEqual([]);
		});

		test('adds messages and bumps the ticket', async () => {
			const created = unwrap(await service.createTicket(input, ada));
			clock.set(new Date('2026-01-02T00:00:00.000Z'));
			unwrap(await service.addMyMessage(created.id, 'Any news?', ada));

			const ticket = unwrap(await service.getMyTicket(created.id, ada));
			expect(ticket.messages.map((m) => m.body)).toEqual(['Please help', 'Any news?']);
			expect(ticket.updatedAt).toEqual(new Date('2026-01-02T00:00:00.000Z'));
		});

		test("another customer's ticket reads as not found; anonymous is rejected", async () => {
			const created = unwrap(await service.createTicket(input, ada));
			for (const result of [
				await service.getMyTicket(created.id, bob),
				await service.addMyMessage(created.id, 'hi', bob)
			]) {
				expect(result.ok).toBe(false);
				if (!result.ok) expect(result.error.status).toBe(404);
			}
			const anonymous = await service.listMyTickets(null);
			expect(anonymous.ok).toBe(false);
			if (!anonymous.ok) expect(anonymous.error.status).toBe(401);
		});
	});

	describe('admin help desk contract', () => {
		test('lists with customer details and filters by status and email search', async () => {
			const first = unwrap(await service.createTicket(input, ada));
			unwrap(await service.createTicket({ ...input, subject: 'Refund' }, bob));
			unwrap(await service.updateTicket(first.id, { status: 'pending' }, admin));

			const all = unwrap(await service.listTickets({ page: 1, pageSize: 10 }, admin));
			expect(all.total).toBe(2);
			expect(all.data.find((t) => t.id === first.id)).toMatchObject({
				customerName: 'Ada',
				customerEmail: 'ada@example.test'
			});

			const pending = unwrap(
				await service.listTickets({ page: 1, pageSize: 10, status: 'pending' }, admin)
			);
			expect(pending.data.map((t) => t.id)).toEqual([first.id]);

			const byEmail = unwrap(
				await service.listTickets({ page: 1, pageSize: 10, q: 'bob@' }, admin)
			);
			expect(byEmail.data).toHaveLength(1);
			const bySubject = unwrap(
				await service.listTickets({ page: 1, pageSize: 10, q: 'Refund' }, admin)
			);
			expect(bySubject.data).toHaveLength(1);
		});

		test('updates, assigns and replies as an admin', async () => {
			const created = unwrap(await service.createTicket(input, ada));
			const updated = unwrap(
				await service.updateTicket(
					created.id,
					{ priority: 'urgent', assignedAdminId: admin.id },
					admin
				)
			);
			expect(updated).toMatchObject({ priority: 'urgent', assignedAdminId: admin.id });

			const replied = unwrap(await service.addAdminMessage(created.id, 'On it', null, admin));
			expect(replied.messages).toHaveLength(2);
			expect(replied.messages[1]).toMatchObject({ senderUserId: admin.id, body: 'On it' });
		});

		test('requires admin access and reports missing tickets', async () => {
			const denied = await service.listTickets({ page: 1, pageSize: 10 }, ada);
			expect(denied.ok).toBe(false);
			if (!denied.ok) expect(denied.error.status).toBe(403);

			const missing = await service.getTicket('nope', admin);
			expect(missing.ok).toBe(false);
			if (!missing.ok) expect(missing.error.status).toBe(404);
		});
	});
}
