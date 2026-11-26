export type AppRole = 'customer' | 'admin' | 'superadmin';

export const ADMIN_ROLES: AppRole[] = ['admin', 'superadmin'];

export function isAdminRole(role: string | null | undefined): boolean {
	return role === 'admin' || role === 'superadmin';
}

export function requireAdmin(user: { role?: string | null } | null | undefined): Response | null {
	if (!user) {
		return Response.json(
			{ error: 'Authentication required', code: 'UNAUTHORIZED' },
			{ status: 401 }
		);
	}

	if (!isAdminRole(user.role)) {
		return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
	}

	return null;
}

export function requireSuperadmin(
	user: { role?: string | null } | null | undefined
): Response | null {
	if (!user) {
		return Response.json(
			{ error: 'Authentication required', code: 'UNAUTHORIZED' },
			{ status: 401 }
		);
	}

	if (!isSuperadminRole(user.role)) {
		return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
	}

	return null;
}

export function isSuperadminRole(role: string | null | undefined): boolean {
	return role === 'superadmin';
}

export function adminScope(pathname: string): 'admin' | 'super' | null {
	if (pathname === '/admin/super' || pathname.startsWith('/admin/super/')) return 'super';
	if (pathname === '/api/admin/super' || pathname.startsWith('/api/admin/super/')) return 'super';
	if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin';
	if (pathname.startsWith('/api/admin')) return 'admin';
	return null;
}
