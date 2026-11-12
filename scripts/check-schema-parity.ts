import { getTableColumns, getTableName, is } from 'drizzle-orm';
import { Table } from 'drizzle-orm';
import * as pg from '../src/lib/server/db/schema.pg.ts';
import * as sqlite from '../src/lib/server/db/schema.sqlite.ts';

type TableShape = { name: string; columns: string[] };

function tablesOf(schema: Record<string, unknown>): Map<string, TableShape> {
	const tables = new Map<string, TableShape>();

	for (const value of Object.values(schema)) {
		if (!is(value, Table)) continue;
		const name = getTableName(value);
		const columns = Object.keys(getTableColumns(value)).sort();
		tables.set(name, { name, columns });
	}

	return tables;
}

const postgres = tablesOf(pg as Record<string, unknown>);
const sqliteTables = tablesOf(sqlite as Record<string, unknown>);
const problems: string[] = [];

for (const [name, table] of postgres) {
	const other = sqliteTables.get(name);
	if (!other) {
		problems.push(`postgres table "${name}" is missing from sqlite`);
		continue;
	}

	const missing = table.columns.filter((column) => !other.columns.includes(column));
	const extra = other.columns.filter((column) => !table.columns.includes(column));
	if (missing.length)
		problems.push(`sqlite table "${name}" is missing columns: ${missing.join(', ')}`);
	if (extra.length) problems.push(`sqlite table "${name}" has extra columns: ${extra.join(', ')}`);
}

for (const name of sqliteTables.keys()) {
	if (!postgres.has(name)) problems.push(`sqlite table "${name}" is missing from postgres`);
}

if (problems.length) {
	for (const problem of problems) console.error(`✖ ${problem}`);
	console.error(`\nx ${problems.length} schema parity problem(s).`);
	process.exit(1);
}

console.log(`✔ schema parity ok (${postgres.size} tables)`);
