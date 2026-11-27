export type ErrorCode =
	| 'VALIDATION_ERROR'
	| 'UNPROCESSABLE'
	| 'NOT_FOUND'
	| 'CONFLICT'
	| 'UNAUTHORIZED'
	| 'FORBIDDEN'
	| 'RATE_LIMITED'
	| 'INFRASTRUCTURE_ERROR'
	| 'UNEXPECTED_ERROR';

export const ERROR_STATUS = {
	VALIDATION_ERROR: 400,
	UNPROCESSABLE: 422,
	NOT_FOUND: 404,
	CONFLICT: 409,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	RATE_LIMITED: 429,
	INFRASTRUCTURE_ERROR: 502,
	UNEXPECTED_ERROR: 500
} as const satisfies Record<ErrorCode, number>;

/** Values interpolated into a translated error message (`{name}` placeholders). */
export type ErrorParams = Record<string, string | number>;

export interface AppErrorOptions {
	cause?: unknown;
	details?: Record<string, unknown>;
	/**
	 * Specific, stable error identifier in snake_case (e.g. `cart_empty`). The client translates it
	 * with the `errors_<messageKey>` message. Without it the coarse `code` is used.
	 */
	messageKey?: string;
	/** Interpolation values for the translated message. */
	params?: ErrorParams;
}

export class AppError extends Error {
	readonly code: ErrorCode;
	readonly status: number;
	readonly details: Record<string, unknown> | undefined;
	readonly messageKey: string | undefined;
	readonly params: ErrorParams | undefined;

	constructor(code: ErrorCode, message: string, options: AppErrorOptions = {}) {
		super(message, options.cause === undefined ? undefined : { cause: options.cause });
		this.name = 'AppError';
		this.code = code;
		this.status = ERROR_STATUS[code];
		this.details = options.details;
		this.messageKey = options.messageKey;
		this.params = options.params;
	}
}

export class ValidationError extends AppError {
	constructor(message = 'Validation failed', options: AppErrorOptions = {}) {
		super('VALIDATION_ERROR', message, options);
		this.name = 'ValidationError';
	}
}

export class UnprocessableError extends AppError {
	constructor(message = 'Unprocessable request', options: AppErrorOptions = {}) {
		super('UNPROCESSABLE', message, options);
		this.name = 'UnprocessableError';
	}
}

export class NotFoundError extends AppError {
	constructor(message = 'Resource not found', options: AppErrorOptions = {}) {
		super('NOT_FOUND', message, options);
		this.name = 'NotFoundError';
	}
}

export class ConflictError extends AppError {
	constructor(message = 'Resource conflict', options: AppErrorOptions = {}) {
		super('CONFLICT', message, options);
		this.name = 'ConflictError';
	}
}

export class UnauthorizedError extends AppError {
	constructor(message = 'Authentication required', options: AppErrorOptions = {}) {
		super('UNAUTHORIZED', message, options);
		this.name = 'UnauthorizedError';
	}
}

export class ForbiddenError extends AppError {
	constructor(message = 'Access denied', options: AppErrorOptions = {}) {
		super('FORBIDDEN', message, options);
		this.name = 'ForbiddenError';
	}
}

export class RateLimitedError extends AppError {
	constructor(message = 'Too many requests', options: AppErrorOptions = {}) {
		super('RATE_LIMITED', message, options);
		this.name = 'RateLimitedError';
	}
}

export class InfrastructureError extends AppError {
	constructor(message = 'Infrastructure failure', options: AppErrorOptions = {}) {
		super('INFRASTRUCTURE_ERROR', message, options);
		this.name = 'InfrastructureError';
	}
}

export function isAppError(error: unknown): error is AppError {
	return error instanceof AppError;
}

export function toAppError(error: unknown): AppError {
	if (isAppError(error)) return error;
	if (error instanceof Error) {
		return new AppError('UNEXPECTED_ERROR', error.message, { cause: error });
	}
	return new AppError('UNEXPECTED_ERROR', 'Unexpected error', { cause: error });
}

export interface ErrorBody {
	/** Server-side message, English. Kept for clients that do not translate. */
	error: string;
	/** Machine code: the specific `messageKey` when set, otherwise the coarse ErrorCode. */
	code: string;
	params?: ErrorParams;
}

/** JSON body for every API error response: `{ error, code, params? }`. */
export function errorBody(
	error: {
		message: string;
		code?: string;
		messageKey?: string | undefined;
		params?: ErrorParams | undefined;
	},
	fallbackCode = 'UNEXPECTED_ERROR'
): ErrorBody {
	const body: ErrorBody = {
		error: error.message,
		code: error.messageKey ?? error.code ?? fallbackCode
	};
	if (error.params) body.params = error.params;
	return body;
}
