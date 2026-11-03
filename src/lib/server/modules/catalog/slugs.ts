import { and, eq, ne } from 'drizzle-orm';
import { queryDb } from '#db/query.ts';

export function slugify(value: string): string {
	return value
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 180);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function uniqueSlug(
	table: any,
	column: any,
	value: string,
	excludeId?: string
): Promise<string> {
	const base = slugify(value) || 'item';
	let candidate = base;
	let counter = 1;

	while (true) {
		const where = excludeId
			? and(eq(column, candidate), ne(table.id, excludeId))
			: eq(column, candidate);

		const [existing] = await queryDb.select({ id: table.id }).from(table).where(where).limit(1);

		if (!existing) return candidate;

		counter += 1;
		candidate = `${base}-${counter}`;
	}
}
