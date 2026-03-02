import { beforeEach, describe, expect, it } from 'vitest';
import { allowAuthRequest, resetAuthRateLimitForTests } from './rate-limit';

describe('rate-limit', () => {
	beforeEach(() => {
		resetAuthRateLimitForTests();
	});

	it('allows up to max requests in a window and blocks the next', () => {
		const now = new Date('2030-01-01T00:00:00.000Z');
		for (let index = 0; index < 5; index += 1) {
			expect(allowAuthRequest({ route: 'login', ip: '203.0.113.1', now })).toBe(true);
		}

		expect(allowAuthRequest({ route: 'login', ip: '203.0.113.1', now })).toBe(false);
	});

	it('uses independent buckets per route and ip', () => {
		const now = new Date('2030-01-01T00:00:00.000Z');
		for (let index = 0; index < 5; index += 1) {
			expect(allowAuthRequest({ route: 'login', ip: '203.0.113.1', now })).toBe(true);
		}

		expect(allowAuthRequest({ route: 'register', ip: '203.0.113.1', now })).toBe(true);
		expect(allowAuthRequest({ route: 'login', ip: '198.51.100.10', now })).toBe(true);
	});

	it('permits requests again in the next minute window', () => {
		const windowOne = new Date('2030-01-01T00:00:00.000Z');
		const windowTwo = new Date('2030-01-01T00:01:01.000Z');

		for (let index = 0; index < 5; index += 1) {
			expect(allowAuthRequest({ route: 'login', ip: '203.0.113.1', now: windowOne })).toBe(true);
		}
		expect(allowAuthRequest({ route: 'login', ip: '203.0.113.1', now: windowOne })).toBe(false);

		expect(allowAuthRequest({ route: 'login', ip: '203.0.113.1', now: windowTwo })).toBe(true);
	});

	it('remains stable when bucket cleanup is exercised at scale', () => {
		const baseMinute = new Date('2030-01-01T00:00:00.000Z');

		for (let index = 0; index < 2050; index += 1) {
			const oldMinute = new Date(baseMinute.getTime() - (index + 2) * 60_000);
			expect(allowAuthRequest({ route: 'login', ip: `198.51.100.${index}`, now: oldMinute })).toBe(true);
		}

		const now = new Date(baseMinute.getTime() + 60_000);
		expect(allowAuthRequest({ route: 'login', ip: '203.0.113.1', now })).toBe(true);
		expect(allowAuthRequest({ route: 'login', ip: '203.0.113.1', now })).toBe(true);
	});
});
