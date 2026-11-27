import { errorBody, isAppError } from '#shared';

export function requireUser(user: { id: string } | null | undefined): Response | null {
	if (!user)
		return Response.json(
			{ error: 'Authentication required', code: 'UNAUTHORIZED' },
			{ status: 401 }
		);
	return null;
}

export function customerErrorResponse(error: unknown, context: string): Response {
	if (isAppError(error)) {
		return Response.json(errorBody(error), { status: error.status });
	}
	console.error(`[api/customer] ${context} failed`, error);
	return Response.json(
		{ error: 'Unexpected server error', code: 'UNEXPECTED_ERROR' },
		{ status: 500 }
	);
}
