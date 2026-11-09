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
}

export function createEvent<TPayload>(name: string, payload: TPayload): EventEnvelope<TPayload> {
	return {
		eventId: newId(),
		name,
		occurredAt: new Date().toISOString(),
		payload
	};
}
