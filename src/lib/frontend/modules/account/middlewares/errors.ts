import { ApiError } from '#lib/frontend/modules/shared/http.ts';

export function isUnauthorized(cause: unknown): boolean {
	return cause instanceof ApiError && cause.status === 401;
}

export function messageFrom(cause: unknown, fallback: string): string {
	return cause instanceof Error ? cause.message : fallback;
}
