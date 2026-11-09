if (!process.env.TEST_DATABASE_URL) {
	console.error('TEST_DATABASE_URL must point at a disposable Postgres database for test:pg');
	process.exit(1);
}
