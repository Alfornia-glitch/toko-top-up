export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PageRequest {
	readonly limit: number;
	readonly offset: number;
}

export interface Page<T> {
	readonly items: readonly T[];
	readonly total: number;
	readonly limit: number;
	readonly offset: number;
}

export function normalizePageRequest(input: { limit?: number; offset?: number } = {}): PageRequest {
	const limit = Math.min(Math.max(Math.trunc(input.limit ?? DEFAULT_PAGE_SIZE), 1), MAX_PAGE_SIZE);
	const offset = Math.max(Math.trunc(input.offset ?? 0), 0);
	return { limit, offset };
}

export function createPage<T>(items: readonly T[], total: number, request: PageRequest): Page<T> {
	return {
		items,
		total,
		limit: request.limit,
		offset: request.offset
	};
}
