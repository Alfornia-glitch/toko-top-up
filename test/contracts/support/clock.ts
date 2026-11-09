import type { Clock } from '#shared';

export interface TestClock extends Clock {
	set(value: Date): void;
}

export function createTestClock(initial: Date): TestClock {
	let current = initial;

	return {
		now: () => current,
		set: (value) => {
			current = value;
		}
	};
}
