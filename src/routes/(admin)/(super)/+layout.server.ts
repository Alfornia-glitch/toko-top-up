import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { hasPermission } from '#shared';

export const load: LayoutServerLoad = ({ locals, url }) => {
	if (!locals.user) {
		const redirectTo = `${url.pathname}${url.search}`;
		redirect(303, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	if (!locals.actor || !hasPermission(locals.actor, 'super:access')) {
		error(403, 'Forbidden');
	}

	return {
		superadmin: {
			id: locals.user.id,
			role: locals.actor.role
		}
	};
};
