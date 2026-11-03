import { Database } from 'bun:sqlite';
import { SQL } from 'bun';

const VALID_ROLES = ['customer', 'admin', 'superadmin'] as const;
type Role = (typeof VALID_ROLES)[number];

const [email, role] = process.argv.slice(2);

if (!email || !role) {
	console.error('Usage: bun scripts/grant-role.ts <email> <role>');
	process.exit(1);
}

if (!(VALID_ROLES as readonly string[]).includes(role)) {
	console.error(`Invalid role "${role}". Expected one of: ${VALID_ROLES.join(', ')}`);
	process.exit(1);
}

const provider = process.env.DB_PROVIDER;

if (provider === 'postgres') {
	const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

	if (!url) {
		throw new Error('DIRECT_URL or DATABASE_URL is required when DB_PROVIDER=postgres');
	}

	const sql = new SQL(url, { prepare: !isTransactionPooler(url) });

	try {
		const rows = await sql`
			UPDATE auth_app."user"
			SET role = ${role as Role}
			WHERE email = ${email}
			RETURNING id, email, role
		`;

		report(rows);
	} finally {
		await sql.close();
	}
} else if (provider === 'sqlite') {
	const path = process.env.SQLITE_PATH || './data/ecommerce.sqlite';
	const sqlite = new Database(path);

	try {
		const rows = sqlite
			.query('UPDATE user SET role = ? WHERE email = ? RETURNING id, email, role')
			.all(role, email);

		report(rows);
	} finally {
		sqlite.close();
	}
} else {
	throw new Error('DB_PROVIDER must be "sqlite" or "postgres"');
}

function report(rows: unknown[]): void {
	if (!rows.length) {
		console.error(`No user found with email ${email}`);
		process.exit(1);
	}

	console.log(`Updated ${email} to role "${role}"`);
}

function isTransactionPooler(url: string): boolean {
	if (/[?&]pgbouncer=true\b/.test(url)) return true;

	try {
		return new URL(url).port === '6543';
	} catch {
		return /:6543(?:[/?]|$)/.test(url);
	}
}
