export {
	AppError,
	ConflictError,
	ERROR_STATUS,
	ForbiddenError,
	InfrastructureError,
	NotFoundError,
	RateLimitedError,
	UnauthorizedError,
	UnprocessableError,
	ValidationError,
	isAppError,
	toAppError
} from './errors.ts';
export type { AppErrorOptions, ErrorCode } from './errors.ts';

export { assertActor, assertPermission, hasPermission } from './authz.ts';
export type { Actor, Permission, Role } from './actor.ts';

export { err, flatMapResult, isErr, isOk, mapError, mapResult, ok, unwrapOr } from './result.ts';
export type { Result } from './result.ts';

export { newId } from './ids.ts';

export { slugify } from './slug.ts';

export { createEvent, createEventBus } from './events.ts';
export type { EventBus, EventEnvelope, EventHandler } from './events.ts';

export { systemClock } from './clock.ts';
export type { Clock } from './clock.ts';

export {
	DEFAULT_PAGE_SIZE,
	MAX_PAGE_SIZE,
	createPage,
	normalizePageRequest
} from './pagination.ts';
export type { Page, PageRequest } from './pagination.ts';
