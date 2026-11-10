import { DATABASE_URL, DB_PROVIDER, SQLITE_PATH, STORAGE_PROVIDER } from '$app/env/private';
import { resolveConfig, type AppConfig } from './config.ts';

export { resolveConfig } from './config.ts';
export type { AppConfig, ConfigValues, DatabaseConfig } from './config.ts';

export function loadConfig(): AppConfig {
	return resolveConfig({
		DB_PROVIDER,
		STORAGE_PROVIDER,
		SQLITE_PATH,
		DATABASE_URL
	});
}
