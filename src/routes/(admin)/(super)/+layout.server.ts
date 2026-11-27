import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { hasPermission } from '#shared';
import { m } from '#lib/paraglide/messages.js';

export const load: LayoutServerLoad = ({ locals, url }) => {
	if (!locals.user) {
		const redirectTo = `${url.pathname}${url.search}`;
		redirect(303, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	if (!locals.actor || !hasPermission(locals.actor, 'super:access')) {
		error(403, m.errors_forbidden());
	}

	return {
		superadmin: {
			id: locals.user.id,
			role: locals.actor.role
		}
	};
};
