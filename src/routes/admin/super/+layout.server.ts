import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { isSuperadminRole } from '#lib/server/modules/admin/access.ts';

export const load: LayoutServerLoad = ({ locals, url }) => {
	if (!locals.user) {
		const redirectTo = `${url.pathname}${url.search}`;
		redirect(303, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	if (!isSuperadminRole(locals.user.role)) {
		error(403, 'Forbidden');
	}

	return {
		superadmin: {
			id: locals.user.id,
			role: locals.user.role
		}
	};
};
