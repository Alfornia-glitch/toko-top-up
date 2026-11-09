// @vitest-environment node
import { describe, expect, test } from 'vitest';

import {
	DEFAULT_PAGE_SIZE,
	MAX_PAGE_SIZE,
	NotFoundError,
	ValidationError,
	createEvent,
	createPage,
	err,
	flatMapResult,
	isAppError,
	isErr,
	isOk,
	mapError,
	mapResult,
	newId,
	normalizePageRequest,
	ok,
	systemClock,
	toAppError,
	unwrapOr
} from '#shared/index.ts';
import type { Result } from '#shared/index.ts';

describe('result', () => {
	test('builds and narrows success and failure values', () => {
		const success = ok(2);
		const failure = err(new ValidationError('invalid'));

		expect(isOk(success)).toBe(true);
		expect(isErr(success)).toBe(false);
		expect(isErr(failure)).toBe(true);
	});

	test('maps values and errors independently', () => {
		expect(mapResult(ok(2), (value) => value * 2)).toEqual(ok(4));
		expect(mapError(err(new ValidationError('nope')), (error) => error.code)).toEqual(
			err('VALIDATION_ERROR')
		);
	});

	test('chains results and falls back', () => {
		const failure: Result<number, ValidationError> = err(new ValidationError('invalid'));
		expect(flatMapResult(ok(2), (value) => ok(value + 1))).toEqual(ok(3));
		expect(unwrapOr(failure, 7)).toBe(7);
		expect(unwrapOr(ok(3), 7)).toBe(3);
	});
});

describe('errors', () => {
	test('maps known codes to status and preserves details', () => {
		const error = new NotFoundError('missing', { details: { id: '1' } });
		expect(error.status).toBe(404);
		expect(error.code).toBe('NOT_FOUND');
		expect(error.details).toEqual({ id: '1' });
	});

	test('recognizes and normalizes unknown errors', () => {
		expect(isAppError(new ValidationError())).toBe(true);
		expect(isAppError('nope')).toBe(false);
		expect(toAppError(new Error('boom')).code).toBe('UNEXPECTED_ERROR');
		expect(toAppError('boom').message).toBe('Unexpected error');
	});
});

describe('ids, events, clock and pagination', () => {
	test('generates unique ids and timestamped events', () => {
		expect(newId()).not.toBe(newId());
		const event = createEvent('order.created', { orderId: '1' });
		expect(event.name).toBe('order.created');
		expect(event.eventId).toHaveLength(36);
		expect(Number.isNaN(Date.parse(event.occurredAt))).toBe(false);
	});

	test('uses a replaceable clock', () => {
		const fixed = new Date('2026-01-01T00:00:00.000Z');
		expect(systemClock.now()).toBeInstanceOf(Date);
		expect({ now: () => fixed }.now()).toBe(fixed);
	});

	test('normalizes page requests and builds pages', () => {
		expect(normalizePageRequest()).toEqual({ limit: DEFAULT_PAGE_SIZE, offset: 0 });
		expect(normalizePageRequest({ limit: 0, offset: -5 })).toEqual({ limit: 1, offset: 0 });
		expect(normalizePageRequest({ limit: 1_000, offset: 10 })).toEqual({
			limit: MAX_PAGE_SIZE,
			offset: 10
		});
		const page = createPage(['a'], 1, { limit: 10, offset: 0 });
		expect(page).toEqual({ items: ['a'], total: 1, limit: 10, offset: 0 });
	});
});
