import type { SupportUserDirectory } from '#modules/support/server.ts';

const USERS = new Map([
	['user-ada', { name: 'Ada', email: 'ada@example.test' }],
	['user-bob', { name: 'Bob', email: 'bob@example.test' }],
	['user-admin', { name: 'Admin', email: 'admin@example.test' }]
]);

/** In-memory stand-in for the runtime's user adapter. */
export function createFakeSupportUsers(): SupportUserDirectory {
	return {
		async findUsers(ids) {
			return new Map(ids.flatMap((id) => (USERS.has(id) ? [[id, USERS.get(id)!] as const] : [])));
		},
		async findUserIdsByEmail(term) {
			return [...USERS].filter(([, user]) => user.email.includes(term)).map(([id]) => id);
		}
	};
}
