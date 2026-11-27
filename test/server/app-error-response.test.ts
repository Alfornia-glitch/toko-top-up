// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { ConflictError, NotFoundError } from '#shared';
import { answerAppError } from '#lib/server/http/app-error-response.ts';

function event(path: string, appError?: NotFoundError | ConflictError) {
	return { url: new URL(`http://localhost${path}`), locals: { appError, requestId: 'req-1' } };
}

const serverError = () => new Response('Internal Error', { status: 500 });

describe('answerAppError', () => {
	test('turns the 500 for a thrown AppError on an API route into its own status', async () => {
		const response = answerAppError(
			serverError(),
			event('/api/storefront/products/x', new NotFoundError('Product not found'))
		);

		expect(response.status).toBe(404);
		expect(response.headers.get('x-request-id')).toBe('req-1');
		expect(await response.json()).toEqual({ error: 'Product not found', code: 'NOT_FOUND' });
	});

	test('keeps the status and message of other AppErrors', async () => {
		const response = answerAppError(
			serverError(),
			event('/api/checkout', new ConflictError('Your cart is empty'))
		);

		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({ error: 'Your cart is empty', code: 'CONFLICT' });
	});

	test('sends the specific message key and params when the error carries them', async () => {
		const response = answerAppError(
			serverError(),
			event(
				'/api/checkout',
				new ConflictError('Your cart is empty', {
					messageKey: 'cart_empty',
					params: { count: 0 }
				})
			)
		);

		expect(await response.json()).toEqual({
			error: 'Your cart is empty',
			code: 'cart_empty',
			params: { count: 0 }
		});
	});

	test('leaves everything else alone', () => {
		const ok = new Response('fine', { status: 200 });
		expect(answerAppError(ok, event('/api/x', new NotFoundError()))).toBe(ok);

		const unexpected = serverError();
		expect(answerAppError(unexpected, event('/api/x'))).toBe(unexpected);

		const page = serverError();
		expect(answerAppError(page, event('/products', new NotFoundError()))).toBe(page);
	});
});
