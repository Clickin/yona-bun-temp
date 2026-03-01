import * as arctic from 'arctic';
import type { RequestHandler } from '@sveltejs/kit';
import { github } from '$lib/server/auth/oauth-providers';

const OAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60;
const OAUTH_GITHUB_SCOPES = ['read:user', 'user:email'];

function isSecureCookie(): boolean {
	return process.env.NODE_ENV === 'production';
}

export const GET: RequestHandler = async (event) => {
	const state = arctic.generateState();
	const codeVerifier = arctic.generateCodeVerifier();
	const authorizationUrl = (
		github.createAuthorizationURL as unknown as (
			state: string,
			codeVerifier: string,
			scopes: string[]
		) => URL
	)(state, codeVerifier, OAUTH_GITHUB_SCOPES);

	event.cookies.set('yona_oauth_github_state', state, {
		httpOnly: true,
		maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
		path: '/',
		sameSite: 'lax',
		secure: isSecureCookie()
	});

	event.cookies.set('yona_oauth_github_verifier', codeVerifier, {
		httpOnly: true,
		maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
		path: '/',
		sameSite: 'lax',
		secure: isSecureCookie()
	});

	return new Response(null, {
		headers: {
			location: authorizationUrl.toString()
		},
		status: 302
	});
};
