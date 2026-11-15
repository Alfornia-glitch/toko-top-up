import { and, count, desc, eq, like, or } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import { UnprocessableError, unwrap, type Actor } from '#shared';
import { getRuntime } from '#lib/server/runtime.server.ts';

const { user: userTable, session: sessionTable } = tables;

type Role = typeof userTable.$inferSelect.role;

export async function listUsers(query: {
	page: number;
	pageSize: number;
	q?: string;
	status?: string;
}) {
	const conditions = [];
	if (query.q) {
		const term = `%${query.q}%`;
		conditions.push(or(like(userTable.email, term), like(userTable.name, term)));
	}
	if (query.status) conditions.push(eq(userTable.role, query.status as Role));
	const where = conditions.length ? and(...conditions) : undefined;
	const offset = (query.page - 1) * query.pageSize;

	const data = await queryDb
		.select({
			id: userTable.id,
			name: userTable.name,
			email: userTable.email,
			role: userTable.role,
			banned: userTable.banned,
			banReason: userTable.banReason,
			emailVerified: userTable.emailVerified,
			createdAt: userTable.createdAt
		})
		.from(userTable)
		.where(where)
		.orderBy(desc(userTable.createdAt))
		.limit(query.pageSize)
		.offset(offset);

	const [{ value: total }] = await queryDb.select({ value: count() }).from(userTable).where(where);
	return { data, page: query.page, pageSize: query.pageSize, total: Number(total ?? 0) };
}

export async function getUser(id: string, actor: Actor | null) {
	const [user] = await queryDb
		.select({
			id: userTable.id,
			name: userTable.name,
			email: userTable.email,
			image: userTable.image,
			role: userTable.role,
			banned: userTable.banned,
			banReason: userTable.banReason,
			banExpires: userTable.banExpires,
			emailVerified: userTable.emailVerified,
			createdAt: userTable.createdAt,
			updatedAt: userTable.updatedAt
		})
		.from(userTable)
		.where(eq(userTable.id, id))
		.limit(1);

	if (!user) return null;

	const sessionRows = await queryDb
		.select({
			id: sessionTable.id,
			ipAddress: sessionTable.ipAddress,
			userAgent: sessionTable.userAgent,
			createdAt: sessionTable.createdAt,
			expiresAt: sessionTable.expiresAt,
			impersonatedBy: sessionTable.impersonatedBy
		})
		.from(sessionTable)
		.where(eq(sessionTable.userId, id))
		.orderBy(desc(sessionTable.createdAt));

	const orderCount = unwrap(await getRuntime().services.orders.orders.getUserOrderCount(id, actor));

	return { ...user, sessions: sessionRows, orderCount };
}

export async function setRole(id: string, role: string) {
	const [user] = await queryDb
		.select({ id: userTable.id })
		.from(userTable)
		.where(eq(userTable.id, id))
		.limit(1);
	if (!user) return null;
	await queryDb
		.update(userTable)
		.set({ role: role as Role, updatedAt: new Date() })
		.where(eq(userTable.id, id));
	return { id, role };
}

export async function banUser(id: string, reason: string, expiresAt?: string | null) {
	const [user] = await queryDb
		.select({ id: userTable.id })
		.from(userTable)
		.where(eq(userTable.id, id))
		.limit(1);
	if (!user) return null;
	// Two plain statements instead of a transaction: better-sqlite3 transactions must be
	// synchronous, and a banned user is refused at sign-in even if the session
	// delete were to fail.
	await queryDb
		.update(userTable)
		.set({
			banned: true,
			banReason: reason,
			banExpires: expiresAt ? new Date(expiresAt) : null,
			updatedAt: new Date()
		})
		.where(eq(userTable.id, id));
	await queryDb.delete(sessionTable).where(eq(sessionTable.userId, id));
	return { id, banned: true };
}

export async function unbanUser(id: string) {
	const [user] = await queryDb
		.select({ id: userTable.id })
		.from(userTable)
		.where(eq(userTable.id, id))
		.limit(1);
	if (!user) return null;
	await queryDb
		.update(userTable)
		.set({ banned: false, banReason: null, banExpires: null, updatedAt: new Date() })
		.where(eq(userTable.id, id));
	return { id, banned: false };
}

export async function revokeSession(userId: string, sessionId: string) {
	const [session] = await queryDb
		.select({ id: sessionTable.id })
		.from(sessionTable)
		.where(and(eq(sessionTable.id, sessionId), eq(sessionTable.userId, userId)))
		.limit(1);
	if (!session) return false;
	await queryDb.delete(sessionTable).where(eq(sessionTable.id, sessionId));
	return true;
}

export async function listAdmins() {
	return queryDb
		.select({
			id: userTable.id,
			name: userTable.name,
			email: userTable.email,
			role: userTable.role,
			banned: userTable.banned,
			createdAt: userTable.createdAt
		})
		.from(userTable)
		.where(or(eq(userTable.role, 'admin'), eq(userTable.role, 'superadmin')))
		.orderBy(desc(userTable.createdAt));
}

export async function userRoleCounts() {
	const rows = await queryDb
		.select({ role: userTable.role, value: count() })
		.from(userTable)
		.groupBy(userTable.role);
	return rows.map((row: { role: string; value: unknown }) => ({
		role: row.role,
		count: Number(row.value ?? 0)
	}));
}

export function assertNotSelf(actorId: string, targetId: string) {
	if (actorId === targetId)
		throw new UnprocessableError('You cannot modify your own superadmin access here');
}
