import type { Actor, Permission } from './actor.ts';
import { ForbiddenError, UnauthorizedError } from './errors.ts';

export function assertActor(actor: Actor | null | undefined): Actor {
	if (!actor) throw new UnauthorizedError('Authentication required');
	return actor;
}

export function hasPermission(actor: Actor | null | undefined, permission: Permission): boolean {
	return actor?.permissions.has(permission) ?? false;
}

export function assertPermission(actor: Actor | null | undefined, permission: Permission): Actor {
	const current = assertActor(actor);

	if (!current.permissions.has(permission)) {
		throw new ForbiddenError('Forbidden');
	}

	return current;
}
