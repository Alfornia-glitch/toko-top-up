// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Actor } from '#shared';
import type { auth } from '#lib/server/modules/auth/index.ts';
import type { RuntimeServices } from '#lib/server/runtime.server.ts';

type Session = typeof auth.$Infer.Session;

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			requestId: string;
			session: Session['session'] | null;
			user: Session['user'] | null;
			actor: Actor | null;
			services: RuntimeServices;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
