import type { Handle, RequestEvent } from '@sveltejs/kit';
import { deleteSessionByToken, getSessionByToken, getSessionCookieName, getSessionCookieOptions } from './session';

export interface SessionLocals {
	csrfToken: string;
	expiresAt: Date;
	token: string;
	userId: number;
}

function clearSessionCookie(event: RequestEvent): void {
	event.cookies.delete(getSessionCookieName(), { path: '/' });
}

export function setSessionCookie(event: RequestEvent, token: string): void {
	event.cookies.set(getSessionCookieName(), token, getSessionCookieOptions());
}

export function deleteSessionCookie(event: RequestEvent): void {
	clearSessionCookie(event);
}

export const handleSession: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(getSessionCookieName());

	if (!token) {
		event.locals.session = undefined;
		return resolve(event);
	}

	const session = await getSessionByToken(token);
	if (!session) {
		await deleteSessionByToken(token);
		clearSessionCookie(event);
		event.locals.session = undefined;
		return resolve(event);
	}

	event.locals.session = {
		csrfToken: session.csrfToken,
		expiresAt: session.expiresAt,
		token,
		userId: session.userId
	};

	return resolve(event);
};
