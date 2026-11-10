import type { Actor, Permission, Role } from '#shared';

const ADMIN_PERMISSIONS = [
	'admin:access',
	'catalog:read',
	'catalog:write',
	'catalog:inventory:read',
	'catalog:inventory:write'
] as const satisfies readonly Permission[];

const SUPERADMIN_PERMISSIONS = [
	'super:access',
	...ADMIN_PERMISSIONS
] as const satisfies readonly Permission[];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
	customer: [],
	admin: ADMIN_PERMISSIONS,
	superadmin: SUPERADMIN_PERMISSIONS
};

export interface ActorUser {
	readonly id: string;
	readonly role?: string | null;
}

export function actorFromUser(user: ActorUser | null | undefined): Actor | null {
	if (!user) return null;

	const role: Role = user.role === 'admin' || user.role === 'superadmin' ? user.role : 'customer';

	return {
		id: user.id,
		role,
		permissions: new Set(ROLE_PERMISSIONS[role])
	};
}

export function adminPermissionForPath(pathname: string): Permission | null {
	if (pathname === '/admin/super' || pathname.startsWith('/admin/super/')) return 'super:access';
	if (pathname === '/api/admin/super' || pathname.startsWith('/api/admin/super/')) {
		return 'super:access';
	}
	if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin:access';
	if (pathname === '/api/admin' || pathname.startsWith('/api/admin/')) return 'admin:access';
	return null;
}
