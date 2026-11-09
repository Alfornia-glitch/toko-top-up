import type { AppError } from './errors.ts';

export type Result<T, E = AppError> =
	{ readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
	return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
	return { ok: false, error };
}

export function isOk<T, E>(
	result: Result<T, E>
): result is { readonly ok: true; readonly value: T } {
	return result.ok;
}

export function isErr<T, E>(
	result: Result<T, E>
): result is { readonly ok: false; readonly error: E } {
	return !result.ok;
}

export function mapResult<T, U, E>(result: Result<T, E>, map: (value: T) => U): Result<U, E> {
	return result.ok ? ok(map(result.value)) : err(result.error);
}

export function flatMapResult<T, U, E>(
	result: Result<T, E>,
	map: (value: T) => Result<U, E>
): Result<U, E> {
	return result.ok ? map(result.value) : err(result.error);
}

export function mapError<T, E, F>(result: Result<T, E>, map: (error: E) => F): Result<T, F> {
	return result.ok ? ok(result.value) : err(map(result.error));
}

export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
	return result.ok ? result.value : fallback;
}
