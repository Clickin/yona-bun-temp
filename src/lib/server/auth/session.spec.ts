import { describe, expect, it } from 'vitest';
import { getSessionCookieOptions, hashSessionToken } from './session';

describe('session helpers', () => {
	it('hashes session tokens as URL-safe values', async () => {
		const rawToken = 'session-token-for-testing';
		const hashed = await hashSessionToken(rawToken);

		expect(hashed).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(hashed).not.toBe(rawToken);
		expect(await hashSessionToken(rawToken)).toBe(hashed);
	});

	it('resolves cookie options from env-like inputs', () => {
		expect(getSessionCookieOptions({ cookieSecure: 'false', maxAge: '120', nodeEnv: 'production' })).toEqual({
			httpOnly: true,
			maxAge: 120,
			path: '/',
			sameSite: 'lax',
			secure: false
		});

		expect(getSessionCookieOptions({ cookieSecure: undefined, maxAge: 'abc', nodeEnv: 'production' })).toMatchObject({
			httpOnly: true,
			path: '/',
			sameSite: 'lax',
			secure: true
		});
	});
});
