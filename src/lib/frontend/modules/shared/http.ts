export class ApiError extends Error {
	status: number;
	details?: unknown;

	constructor(message: string, status: number, details?: unknown) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.details = details;
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
		throw new ApiError(message, response.status, body);
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
