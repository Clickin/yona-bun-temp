import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './google/+server';

const mockValidateAuthorizationCode = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/auth/oauth-providers', () => ({
	google: {
		validateAuthorizationCode: mockValidateAuthorizationCode
	}
}));

describe('GET /api/auth/callback/google', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal('fetch', vi.fn());
	});

	it('returns 400 and clears OAuth cookies when state mismatches', async () => {
		const event = {
			cookies: {
				delete: vi.fn(),
				get: (name: string) => {
					if (name === 'yona_oauth_google_state') {
						return 'google-state-123';
					}

					if (name === 'yona_oauth_google_verifier') {
						return 'google-verifier-abc';
					}

					return undefined;
				}
			},
			getClientAddress: () => '127.0.0.1',
			request: new Request('http://localhost/api/auth/callback/google?code=test-code&state=wrong-state')
		} as unknown as Parameters<typeof GET>[0];

		const response = await GET(event);

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({ error: 'Invalid OAuth callback' });
		expect(event.cookies.delete).toHaveBeenCalledWith('yona_oauth_google_state', { path: '/' });
		expect(event.cookies.delete).toHaveBeenCalledWith('yona_oauth_google_verifier', { path: '/' });
		expect(mockValidateAuthorizationCode).not.toHaveBeenCalled();
		expect(globalThis.fetch).not.toHaveBeenCalled();
	});
});
