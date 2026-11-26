export class ApiError extends Error {
	status: number;
	details?: unknown;
	/** Machine code from the response body (`NOT_FOUND`, `cart_empty`, ...). */
	code?: string;
	params?: Record<string, string | number>;

	constructor(
		message: string,
		status: number,
		details?: unknown,
		extra: { code?: string; params?: Record<string, string | number> } = {}
	) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.details = details;
		if (extra.code) this.code = extra.code;
		if (extra.params) this.params = extra.params;
	}
}

function readMessage(body: unknown, key: 'error' | 'message'): string | null {
	if (typeof body !== 'object' || body === null) return null;

	const value = (body as Record<string, unknown>)[key];
	return typeof value === 'string' && value.length > 0 ? value : null;
}

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
	const response = await fetch(input, init);
	const text = await response.text();

	let body: unknown = null;
	if (text.length > 0) {
		try {
			body = JSON.parse(text);
		} catch {
			body = text;
		}
	}

	if (!response.ok) {
		const message = readMessage(body, 'error') ?? readMessage(body, 'message') ?? 'Request failed';
		const record =
			typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
		const code =
			typeof record.code === 'string'
				? record.code
				: message === 'Request failed'
					? 'request_failed'
					: undefined;
		const params =
			typeof record.params === 'object' && record.params !== null
				? (record.params as Record<string, string | number>)
				: undefined;
		throw new ApiError(message, response.status, body, { code, params });
	}

	return body as T;
}

const jsonHeaders = { 'content-type': 'application/json' };

export const api = {
	get<T>(url: string): Promise<T> {
		return apiFetch<T>(url, { method: 'GET' });
	},

	post<T>(url: string, body?: unknown): Promise<T> {
		return apiFetch<T>(url, {
			method: 'POST',
			headers: jsonHeaders,
			body: body === undefined ? undefined : JSON.stringify(body)
		});
	},

	patch<T>(url: string, body?: unknown): Promise<T> {
		return apiFetch<T>(url, {
			method: 'PATCH',
			headers: jsonHeaders,
			body: body === undefined ? undefined : JSON.stringify(body)
		});
	},

	delete<T>(url: string): Promise<T> {
		return apiFetch<T>(url, { method: 'DELETE' });
	}
};

export function unwrap<T>(payload: { data: T }): T {
	return payload.data;
}
