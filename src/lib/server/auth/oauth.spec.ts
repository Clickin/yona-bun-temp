import { describe, expect, it, vi } from 'vitest';
import {
	exchangeCodeForToken,
	generateOAuthState,
	generatePKCEVerifier,
	validateOAuthState,
	validatePKCEChallenge
} from './oauth';

describe('oauth utilities', () => {
	it('generates URL-safe random states', () => {
		const state = generateOAuthState();

		expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(state.length).toBeGreaterThanOrEqual(43);
	});

	it('generates 100 unique states', () => {
		const iterations = 100;
		const states = new Set<string>();

		for (let index = 0; index < iterations; index += 1) {
			states.add(generateOAuthState());
		}

		expect(states.size).toBe(iterations);
	});

	it('validates OAuth state using constant-time comparison', () => {
		const storedState = generateOAuthState();

		expect(validateOAuthState(storedState, storedState)).toBe(true);
		expect(validateOAuthState(`${storedState}x`, storedState)).toBe(false);
	});

	it('validates PKCE challenge for matching verifier/challenge pair', async () => {
		const { verifier, challenge } = await generatePKCEVerifier();

		expect(await validatePKCEChallenge(verifier, challenge)).toBe(true);
	});

	it('rejects tampered verifier and challenge pairs', async () => {
		const { verifier, challenge } = await generatePKCEVerifier();
		const replacement = challenge.endsWith('A') ? 'B' : 'A';
		const tamperedChallenge = `${challenge.slice(0, -1)}${replacement}`;

		expect(await validatePKCEChallenge(`${verifier}x`, challenge)).toBe(false);
		expect(await validatePKCEChallenge(verifier, tamperedChallenge)).toBe(false);
	});

	it('exchanges code for token and returns normalized fields', async () => {
		const fetchMock = vi.fn(async () =>
			new Response(
				JSON.stringify({
					access_token: 'access-token-123',
					expires_in: '3600',
					scope: 'openid profile email'
				}),
				{
					headers: {
						'content-type': 'application/json'
					},
					status: 200
				}
			)
		);

		vi.stubGlobal('fetch', fetchMock);
		vi.stubEnv('GITHUB_CLIENT_ID', 'github-client-id');
		vi.stubEnv('GITHUB_CLIENT_SECRET', 'github-client-secret');

		await expect(
			exchangeCodeForToken('github', 'oauth-code', 'https://app.example.com/api/auth/callback/github')
		).resolves.toEqual({
			accessToken: 'access-token-123',
			expiresIn: 3600,
			scope: 'openid profile email'
		});

		expect(fetchMock).toHaveBeenCalledWith('https://github.com/login/oauth/access_token', {
			body: expect.any(URLSearchParams),
			headers: {
				accept: 'application/json',
				'content-type': 'application/x-www-form-urlencoded'
			},
			method: 'POST'
		});
	});

	it('throws for unsupported OAuth provider', async () => {
		await expect(exchangeCodeForToken('facebook', 'oauth-code', 'https://app.example.com/callback')).rejects.toThrow(
			'Unsupported OAuth provider: facebook'
		);
	});

	it('throws when token response does not contain access token', async () => {
		const fetchMock = vi.fn(async () =>
			new Response(JSON.stringify({ expires_in: 3600, scope: 'email' }), {
				headers: {
					'content-type': 'application/json'
				},
				status: 200
			})
		);

		vi.stubGlobal('fetch', fetchMock);
		vi.stubEnv('GOOGLE_CLIENT_ID', 'google-client-id');
		vi.stubEnv('GOOGLE_CLIENT_SECRET', 'google-client-secret');

		await expect(exchangeCodeForToken('google', 'oauth-code', 'https://app.example.com/callback')).rejects.toThrow(
			'OAuth token exchange failed for google: missing access_token'
		);
	});
});
