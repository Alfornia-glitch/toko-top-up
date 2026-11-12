import { systemClock, type Clock } from '#shared';
import type { PostgresDb, SqliteDb } from '#db/core.ts';
import { createCustomerService, type CustomerService } from './application/customer-service.ts';
import type { CustomerDirectory } from './domain/customers.ts';
import { createPostgresCustomerRepository } from './infra/pg/customer-repository.ts';
import { createSqliteCustomerRepository } from './infra/sqlite/customer-repository.ts';

export interface CustomersServices {
	readonly customers: CustomerService;
}

type CustomersServiceOptions =
	| { provider: 'postgres'; db: PostgresDb; directory: CustomerDirectory; clock?: Clock }
	| { provider: 'sqlite'; db: SqliteDb; directory: CustomerDirectory; clock?: Clock };

export function createCustomersServices(options: CustomersServiceOptions): CustomersServices {
	const clock = options.clock ?? systemClock;
	const repository =
		options.provider === 'postgres'
			? createPostgresCustomerRepository(options.db)
			: createSqliteCustomerRepository(options.db);

	return { customers: createCustomerService(repository, options.directory, clock) };
}
