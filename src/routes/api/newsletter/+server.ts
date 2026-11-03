import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import { customerErrorResponse } from '#lib/server/modules/customer/http.ts';
import { newsletterSubscribeSchema } from '#lib/server/modules/customer/validation.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

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
	const userId = locals.user?.id ?? null;

	try {
		const [existing] = await queryDb
			.select()
			.from(t.newsletterSubscriptions)
			.where(eq(t.newsletterSubscriptions.email, email))
			.limit(1);

		if (existing) {
			await queryDb
				.update(t.newsletterSubscriptions)
				.set({
					status: 'subscribed',
					userId: userId ?? existing.userId ?? null,
					updatedAt: new Date()
				})
				.where(eq(t.newsletterSubscriptions.id, existing.id));
		} else {
			const now = new Date();
			await queryDb.insert(t.newsletterSubscriptions).values({
				id: crypto.randomUUID(),
				email,
				userId,
				status: 'subscribed',
				source: 'footer',
				createdAt: now,
				updatedAt: now
			});
		}

		return Response.json({ data: { email, status: 'subscribed' } }, { status: 201 });
	} catch (error) {
		return customerErrorResponse(error, 'subscribe newsletter');
	}
};
