export type Role = 'customer' | 'admin' | 'superadmin';

export type Permission =
	| 'admin:access'
	| 'super:access'
	| 'catalog:read'
	| 'catalog:write'
	| 'catalog:inventory:read'
	| 'catalog:inventory:write';

export interface Actor {
	readonly id: string;
	readonly role: Role;
	readonly permissions: ReadonlySet<Permission>;
}
