// @vitest-environment node
import { describe, expect, test, vi } from 'vitest';
import { createEvent, createEventBus } from '#shared';

describe('event bus', () => {
	test('delivers plain events to subscribers', async () => {
		const bus = createEventBus();
		const received: string[] = [];

		bus.subscribe<{ id: string }>('order.placed', (event) => {
			received.push(event.payload.id);
		});

		await bus.publish(createEvent('order.placed', { id: 'order-1' }));

		expect(received).toEqual(['order-1']);
	});

	test('isolates a failing subscriber from the others', async () => {
		const bus = createEventBus();
		const received: string[] = [];
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

		bus.subscribe('order.placed', () => {
			throw new Error('subscriber failed');
		});
		bus.subscribe('order.placed', () => {
			received.push('ok');
		});

		await bus.publish(createEvent('order.placed', { id: 'order-1' }));

		expect(received).toEqual(['ok']);
		expect(consoleError).toHaveBeenCalled();
		consoleError.mockRestore();
	});

	test('unsubscribe and clear remove handlers', async () => {
		const bus = createEventBus();
		let count = 0;
		const unsubscribe = bus.subscribe('order.placed', () => {
			count += 1;
		});

		await bus.publish(createEvent('order.placed', {}));
		unsubscribe();
		await bus.publish(createEvent('order.placed', {}));
		bus.subscribe('order.placed', () => {
			count += 1;
		});
		bus.clear();
		await bus.publish(createEvent('order.placed', {}));

		expect(count).toBe(1);
	});
});
