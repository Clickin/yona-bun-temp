import { generateResetToken } from './tokens';

const ANONYMOUS_CSRF_COOKIE_NAME = 'yona_csrf_token';
const ANONYMOUS_CSRF_MAX_AGE_SECONDS = 60 * 60 * 12;

function constantTimeEqual(left: string, right: string): boolean {
	if (left.length !== right.length) {
		return false;
	}

	let mismatch = 0;

	for (let index = 0; index < left.length; index += 1) {
		mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
	}

	return mismatch === 0;
}

export function generateCsrfToken(): string {
	return generateResetToken();
}

export function getAnonymousCsrfCookieName(): string {
	return ANONYMOUS_CSRF_COOKIE_NAME;
}

export function ensureAnonymousCsrfToken(event: {
	cookies: {
		get(name: string): string | undefined;
		set(name: string, value: string, options: { httpOnly: boolean; maxAge: number; path: string; sameSite: 'lax'; secure: boolean }): void;
	};
}): string {
	const existingToken = event.cookies.get(ANONYMOUS_CSRF_COOKIE_NAME);
	if (existingToken && existingToken.length > 0) {
		return existingToken;
	}

	const csrfToken = generateCsrfToken();
	event.cookies.set(ANONYMOUS_CSRF_COOKIE_NAME, csrfToken, {
		httpOnly: false,
		maxAge: ANONYMOUS_CSRF_MAX_AGE_SECONDS,
		path: '/',
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production'
	});

	return csrfToken;
}

export function readRequestCsrfToken(request: Request): string {
	const token = request.headers.get('x-csrf-token');
	return token?.trim() ?? '';
}

export function validateCsrfToken(token: string, session: { csrfToken: string }): boolean {
	if (!token || !session.csrfToken) {
		return false;
	}

	return constantTimeEqual(token, session.csrfToken);
}
