// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { actorFromUser, adminPermissionForPath } from '#lib/server/actor.server.ts';

describe('actorFromUser', () => {
	test('returns null without a user', () => {
		expect(actorFromUser(null)).toBeNull();
		expect(actorFromUser(undefined)).toBeNull();
	});

	test('maps unknown roles to customer without permissions', () => {
		const actor = actorFromUser({ id: 'user-1', role: 'unknown' });

		expect(actor).toMatchObject({ id: 'user-1', role: 'customer' });
		expect(actor?.permissions.size).toBe(0);
	});

	test('grants admins the catalog and admin permissions', () => {
		const actor = actorFromUser({ id: 'admin-1', role: 'admin' });

		expect(actor?.permissions.has('admin:access')).toBe(true);
		expect(actor?.permissions.has('catalog:read')).toBe(true);
		expect(actor?.permissions.has('catalog:write')).toBe(true);
		expect(actor?.permissions.has('catalog:inventory:read')).toBe(true);
		expect(actor?.permissions.has('catalog:inventory:write')).toBe(true);
		expect(actor?.permissions.has('super:access')).toBe(false);
	});

	test('grants superadmins all admin permissions plus super access', () => {
		const actor = actorFromUser({ id: 'super-1', role: 'superadmin' });

		expect(actor?.permissions.has('super:access')).toBe(true);
		expect(actor?.permissions.has('admin:access')).toBe(true);
		expect(actor?.permissions.has('catalog:write')).toBe(true);
	});
});

describe('adminPermissionForPath', () => {
	test('requires admin access for admin paths', () => {
		expect(adminPermissionForPath('/admin')).toBe('admin:access');
		expect(adminPermissionForPath('/admin/products')).toBe('admin:access');
		expect(adminPermissionForPath('/api/admin/products')).toBe('admin:access');
	});

	test('requires super access for super paths', () => {
		expect(adminPermissionForPath('/admin/super')).toBe('super:access');
		expect(adminPermissionForPath('/admin/super/users')).toBe('super:access');
		expect(adminPermissionForPath('/api/admin/super/users')).toBe('super:access');
	});

	test('returns null outside admin paths', () => {
		expect(adminPermissionForPath('/products')).toBeNull();
		expect(adminPermissionForPath('/api/cart')).toBeNull();
		expect(adminPermissionForPath('/administrator')).toBeNull();
	});
});
