import type { RequestHandler } from './$types';
import { requireSuperadmin } from '#lib/server/http/access.ts';
import { auditRequest } from '#lib/server/http/audit.ts';
import { themeWriteSchema } from '#lib/server/http/admin-validation.ts';
import { sanitizeTheme } from '#shared/theme.ts';
import { unwrap } from '#shared';

/** Superadmin-only: replaces the site theme (colour overrides, scheme and radius). */
export const PUT: RequestHandler = async (event) => {
	const denied = requireSuperadmin(event.locals.user);
	if (denied) return denied;

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return Response.json(
			{ error: 'Expected a JSON body', code: 'invalid_json_body' },
			{ status: 400 }
		);
	}

	const parsed = themeWriteSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid theme payload', code: 'VALIDATION_ERROR' },
			{ status: 422 }
		);
	}

	const { storefront } = event.locals.services.storefront;
	const before = unwrap(await storefront.getSiteSettings()).theme;
	const theme = sanitizeTheme(parsed.data);

	unwrap(await event.locals.services.content.content.putSettings({ theme }, event.locals.actor));

	await auditRequest(event, event.locals.user!.id, {
		action: 'settings.theme',
		entityType: 'site_settings',
		before,
		after: theme
	});

	return Response.json({ data: theme });
};
