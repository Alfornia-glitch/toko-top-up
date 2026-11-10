export type DatabaseConfig =
	| { readonly provider: 'postgres'; readonly url: string }
	| { readonly provider: 'sqlite'; readonly path: string };

export interface AppConfig {
	readonly database: DatabaseConfig;
	readonly storage: { readonly provider: 'supabase' | 'rustfs' };
}

export interface ConfigValues {
	readonly DB_PROVIDER: 'sqlite' | 'postgres';
	readonly STORAGE_PROVIDER: 'supabase' | 'rustfs';
	readonly SQLITE_PATH: string;
	readonly DATABASE_URL: string | undefined;
}

export function resolveConfig(values: ConfigValues): AppConfig {
	if (values.DB_PROVIDER === 'postgres') {
		if (!values.DATABASE_URL) {
			throw new Error('DATABASE_URL must be set when DB_PROVIDER=postgres');
		}

		return {
			database: { provider: 'postgres', url: values.DATABASE_URL },
			storage: { provider: values.STORAGE_PROVIDER }
		};
	}

	if (values.STORAGE_PROVIDER === 'supabase') {
		throw new Error('STORAGE_PROVIDER=supabase is not supported with DB_PROVIDER=sqlite');
	}

	return {
		database: { provider: 'sqlite', path: values.SQLITE_PATH },
		storage: { provider: values.STORAGE_PROVIDER }
	};
}
