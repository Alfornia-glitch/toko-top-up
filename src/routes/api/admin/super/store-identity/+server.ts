import type { RequestHandler } from './$types';
import { requireSuperadmin } from '#lib/server/http/access.ts';
import { auditRequest } from '#lib/server/http/audit.ts';
import { storeIdentityWriteSchema } from '#lib/server/http/admin-validation.ts';
import {
	STORE_LOGO_FOLDER,
	STORE_LOGO_MAX_BYTES,
	STORE_LOGO_TYPES
} from '#modules/storefront/index.ts';
import { unwrap } from '#shared';

/**
 * Superadmin-only: sets the store name and logo. The logo is referenced by the media id returned
 * from `/api/upload` (folder `store`), so the server checks its type and size before storing the URL.
 */
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

	const parsed = storeIdentityWriteSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid store identity payload', code: 'store_name_invalid' },
			{ status: 422 }
		);
	}

	const { storeName, logoMediaId } = parsed.data;
	const values: Record<string, unknown> = { storeName };

	if (logoMediaId === null) {
		// The settings column is NOT NULL JSON, so "no logo" is stored as an empty string.
		values.logoUrl = '';
	} else if (logoMediaId !== undefined) {
		const { content } = event.locals.services.content;
		const asset = unwrap(await content.findMedia(logoMediaId, event.locals.actor));
		const isLogo =
			asset.folder === STORE_LOGO_FOLDER &&
			(STORE_LOGO_TYPES as readonly string[]).includes(asset.contentType) &&
			asset.sizeBytes <= STORE_LOGO_MAX_BYTES;

		if (!isLogo) {
			return Response.json(
				{
					error: 'The logo must be a PNG, JPEG, WebP, AVIF or GIF image of at most 2 MiB',
					code: 'store_logo_invalid'
				},
				{ status: 422 }
			);
		}

		values.logoUrl = asset.url;
	}

	unwrap(await event.locals.services.content.content.putSettings(values, event.locals.actor));

	const settings = unwrap(await event.locals.services.storefront.storefront.getSiteSettings());
	await auditRequest(event, event.locals.user!.id, {
		action: 'settings.store_identity',
		entityType: 'site_settings',
		after: { storeName: settings.storeName, logoUrl: settings.logoUrl }
	});

	return Response.json({
		data: { storeName: settings.storeName, logoUrl: settings.logoUrl }
	});
};
