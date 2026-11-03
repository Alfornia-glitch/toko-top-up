import { and, count, desc, eq, like, or } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import { CatalogError } from '#lib/server/modules/catalog/errors.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

export async function listUsers(query: {
	page: number;
	pageSize: number;
	q?: string;
	status?: string;
}) {
	const conditions = [];
	if (query.q) {
		const term = `%${query.q}%`;
		conditions.push(or(like(t.user.email, term), like(t.user.name, term)));
	}
	if (query.status) conditions.push(eq(t.user.role, query.status));
	const where = conditions.length ? and(...conditions) : undefined;
	const offset = (query.page - 1) * query.pageSize;

	const data = await queryDb
		.select({
			id: t.user.id,
			name: t.user.name,
			email: t.user.email,
			role: t.user.role,
			banned: t.user.banned,
			banReason: t.user.banReason,
			emailVerified: t.user.emailVerified,
			createdAt: t.user.createdAt
		})
		.from(t.user)
		.where(where)
		.orderBy(desc(t.user.createdAt))
		.limit(query.pageSize)
		.offset(offset);

	const [{ value: total }] = await queryDb.select({ value: count() }).from(t.user).where(where);
	return { data, page: query.page, pageSize: query.pageSize, total: Number(total ?? 0) };
}

export async function getUser(id: string) {
	const [user] = await queryDb
		.select({
			id: t.user.id,
			name: t.user.name,
			email: t.user.email,
			image: t.user.image,
			role: t.user.role,
			banned: t.user.banned,
			banReason: t.user.banReason,
			banExpires: t.user.banExpires,
			emailVerified: t.user.emailVerified,
			createdAt: t.user.createdAt,
			updatedAt: t.user.updatedAt
		})
		.from(t.user)
		.where(eq(t.user.id, id))
		.limit(1);

	if (!user) return null;

	const sessions = await queryDb
		.select({
			id: t.session.id,
			ipAddress: t.session.ipAddress,
			userAgent: t.session.userAgent,
			createdAt: t.session.createdAt,
			expiresAt: t.session.expiresAt,
			impersonatedBy: t.session.impersonatedBy
		})
		.from(t.session)
		.where(eq(t.session.userId, id))
		.orderBy(desc(t.session.createdAt));

	const [orders] = await queryDb
		.select({ value: count() })
		.from(t.orders)
		.where(eq(t.orders.userId, id));

	return { ...user, sessions, orderCount: Number(orders?.value ?? 0) };
}

export async function setRole(id: string, role: string) {
	const [user] = await queryDb
		.select({ id: t.user.id })
		.from(t.user)
		.where(eq(t.user.id, id))
		.limit(1);
	if (!user) return null;
	await queryDb.update(t.user).set({ role, updatedAt: new Date() }).where(eq(t.user.id, id));
	return { id, role };
}

export async function banUser(id: string, reason: string, expiresAt?: string | null) {
	const [user] = await queryDb
		.select({ id: t.user.id })
		.from(t.user)
		.where(eq(t.user.id, id))
		.limit(1);
	if (!user) return null;
	await queryDb.transaction(async (tx: any) => {
		await tx
			.update(t.user)
			.set({
				banned: true,
				banReason: reason,
				banExpires: expiresAt ? new Date(expiresAt) : null,
				updatedAt: new Date()
			})
			.where(eq(t.user.id, id));
		await tx.delete(t.session).where(eq(t.session.userId, id));
	});
	return { id, banned: true };
}

export async function unbanUser(id: string) {
	const [user] = await queryDb
		.select({ id: t.user.id })
		.from(t.user)
		.where(eq(t.user.id, id))
		.limit(1);
	if (!user) return null;
	await queryDb
		.update(t.user)
		.set({ banned: false, banReason: null, banExpires: null, updatedAt: new Date() })
		.where(eq(t.user.id, id));
	return { id, banned: false };
}

export async function revokeSession(userId: string, sessionId: string) {
	const [session] = await queryDb
		.select({ id: t.session.id })
		.from(t.session)
		.where(and(eq(t.session.id, sessionId), eq(t.session.userId, userId)))
		.limit(1);
	if (!session) return false;
	await queryDb.delete(t.session).where(eq(t.session.id, sessionId));
	return true;
}

export async function listAdmins() {
	return queryDb
		.select({
			id: t.user.id,
			name: t.user.name,
			email: t.user.email,
			role: t.user.role,
			banned: t.user.banned,
			createdAt: t.user.createdAt
		})
		.from(t.user)
		.where(or(eq(t.user.role, 'admin'), eq(t.user.role, 'superadmin')))
		.orderBy(desc(t.user.createdAt));
}

export async function userRoleCounts() {
	const rows = await queryDb
		.select({ role: t.user.role, value: count() })
		.from(t.user)
		.groupBy(t.user.role);
	return rows.map((row: { role: string; value: unknown }) => ({
		role: row.role,
		count: Number(row.value ?? 0)
	}));
}

export function assertNotSelf(actorId: string, targetId: string) {
	if (actorId === targetId)
		throw new CatalogError(422, 'You cannot modify your own superadmin access here');
}
