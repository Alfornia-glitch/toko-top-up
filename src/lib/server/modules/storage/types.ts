export class MediaError extends Error {
	readonly status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = 'MediaError';
		this.status = status;
	}
}

export interface UploadedMedia {
	path: string;
	url: string;
	contentType: string;
	size: number;
}

/** A backend only has to persist the bytes and return a permanent public URL. */
export interface StorageBackend {
	upload(path: string, file: File): Promise<string>;
	delete(path: string): Promise<void>;
}
