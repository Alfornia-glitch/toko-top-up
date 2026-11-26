export class MediaError extends Error {
	readonly status: number;
	/** Stable identifier the client translates with `errors_<messageKey>`. */
	readonly messageKey: string | undefined;
	readonly params: Record<string, string | number> | undefined;

	constructor(
		status: number,
		message: string,
		options: { messageKey?: string; params?: Record<string, string | number> } = {}
	) {
		super(message);
		this.name = 'MediaError';
		this.status = status;
		this.messageKey = options.messageKey;
		this.params = options.params;
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
