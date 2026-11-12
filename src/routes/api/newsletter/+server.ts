import type { RequestHandler } from './$types';
import { unwrap } from '#shared';
import { customerErrorResponse } from '#lib/server/http/customer-response.ts';
import { newsletterSubscribeSchema } from '#lib/server/http/customer-validation.ts';

export const POST: RequestHandler = async ({ request, locals }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
	}

	const parsed = newsletterSubscribeSchema.safeParse(body);
	if (!parsed.success)
		return Response.json(
			{ error: 'Invalid newsletter data', details: parsed.error.flatten() },
			{ status: 422 }
		);

	const email = parsed.data.email;

	try {
		unwrap(
			await locals.services.marketing.marketing.subscribe(email, locals.user?.id ?? null, 'footer')
		);

		return Response.json({ data: { email, status: 'subscribed' } }, { status: 201 });
	} catch (error) {
		return customerErrorResponse(error, 'subscribe newsletter');
	}
};
