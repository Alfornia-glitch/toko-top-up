import { newId } from './ids.ts';

export interface EventEnvelope<TPayload = unknown> {
	readonly eventId: string;
	readonly name: string;
	readonly occurredAt: string;
	readonly payload: TPayload;
}

export type EventHandler<TPayload = unknown> = (
	event: EventEnvelope<TPayload>
) => void | Promise<void>;

export interface EventBus {
	publish<TPayload>(event: EventEnvelope<TPayload>): Promise<void>;
	subscribe<TPayload>(name: string, handler: EventHandler<TPayload>): () => void;
	clear(): void;
}

export function createEvent<TPayload>(name: string, payload: TPayload): EventEnvelope<TPayload> {
	return {
		eventId: newId(),
		name,
		occurredAt: new Date().toISOString(),
		payload
	};
}

export function createEventBus(): EventBus {
	const handlers = new Map<string, Set<EventHandler<unknown>>>();

	return {
		async publish<TPayload>(event: EventEnvelope<TPayload>) {
			const subscribers = handlers.get(event.name);
			if (!subscribers) return;

			for (const handler of [...subscribers]) {
				try {
					await handler(event as EventEnvelope<unknown>);
				} catch (error) {
					console.error(`[events] subscriber failed for "${event.name}"`, error);
				}
			}
		},

		subscribe<TPayload>(name: string, handler: EventHandler<TPayload>) {
			const subscribers = handlers.get(name) ?? new Set<EventHandler<unknown>>();
			const stored = handler as EventHandler<unknown>;
			subscribers.add(stored);
			handlers.set(name, subscribers);

			return () => {
				subscribers.delete(stored);
				if (!subscribers.size) handlers.delete(name);
			};
		},

		clear() {
			handlers.clear();
		}
	};
}
