import type { ReviewDirectory } from '#modules/content/server.ts';

const USERS = new Map([
	['user-ada', { name: 'Ada', email: 'ada@example.test', image: '/ada.png' }],
	['user-bob', { name: 'Bob', email: 'bob@example.test', image: null }],
	['user-reviewer', { name: 'Reviewer', email: 'reviewer@example.test', image: null }]
]);

export interface FakeReviewDirectory extends ReviewDirectory {
	/** Product names the directory knows about, set by the test. */
	productNames: Map<string, string>;
}

/** In-memory stand-in for the runtime's user and product lookups. */
export function createFakeReviewDirectory(): FakeReviewDirectory {
	const productNames = new Map<string, string>();
	return {
		productNames,
		async findUsers(ids) {
			return new Map(ids.flatMap((id) => (USERS.has(id) ? [[id, USERS.get(id)!] as const] : [])));
		},
		async findProductNames(ids) {
			return new Map(
				ids.flatMap((id) => (productNames.has(id) ? [[id, productNames.get(id)!] as const] : []))
			);
		}
	};
}
