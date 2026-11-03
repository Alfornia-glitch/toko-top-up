import { StorageClient } from '@supabase/storage-js';
import { ALLOWED_TYPES, MAX_BYTES } from '#lib/server/modules/storage/rules.ts';

const provider = process.env.STORAGE_PROVIDER;

if (provider !== 'supabase') {
	console.log(`STORAGE_PROVIDER=${provider ?? 'unset'}; no Supabase bucket to create.`);
	process.exit(0);
}

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET;

if (!url || !secretKey || !bucket) {
	throw new Error(
		'SUPABASE_URL, SUPABASE_SECRET_KEY and SUPABASE_STORAGE_BUCKET are required when STORAGE_PROVIDER=supabase'
	);
}

const storage = new StorageClient(`${url.replace(/\/$/, '')}/storage/v1`, {
	apikey: secretKey,
	Authorization: `Bearer ${secretKey}`
});

const config = {
	public: true,
	fileSizeLimit: MAX_BYTES,
	allowedMimeTypes: ALLOWED_TYPES
};

const existing = await storage.getBucket(bucket);

if (existing.error) {
	const code = 'code' in existing.error ? existing.error.code : undefined;

	if (code !== 'NoSuchBucket') {
		throw new Error(`Could not read bucket "${bucket}": ${existing.error.message}`);
	}

	const { error } = await storage.createBucket(bucket, config);

	if (error) throw new Error(`Could not create bucket "${bucket}": ${error.message}`);

	console.log(
		`Created public bucket "${bucket}" (${MAX_BYTES / (1024 * 1024)} MiB, ${ALLOWED_TYPES.join(', ')})`
	);
} else {
	const { error } = await storage.updateBucket(bucket, config);

	if (error) throw new Error(`Could not update bucket "${bucket}": ${error.message}`);

	console.log(`Bucket "${bucket}" already exists; public access and upload limits are set.`);
}
