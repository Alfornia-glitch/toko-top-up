import type { Actor, Permission } from '#shared';

const ADMIN_PERMISSIONS = [
	'admin:access',
	'catalog:read',
	'catalog:write',
	'catalog:inventory:read',
	'catalog:inventory:write'
] as const satisfies readonly Permission[];

export const ADMIN_PERMISSIONS_LIST: readonly Permission[] = ADMIN_PERMISSIONS;

export function createAdminActor(id: string): Actor {
	return {
		id,
		role: 'admin',
		permissions: new Set(ADMIN_PERMISSIONS)
	};
}

export function createForbiddenActor(id = 'forbidden-actor'): Actor {
	return {
		id,
		role: 'customer',
		permissions: new Set()
	};
}
