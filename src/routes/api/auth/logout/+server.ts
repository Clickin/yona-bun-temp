import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { appendAuthAuditLog } from '$lib/server/auth/audit';
import { getClientIp } from '$lib/server/auth/request-validation';
import { deleteSessionByToken, getSessionCookieName } from '$lib/server/auth/session';
import { deleteSessionCookie } from '$lib/server/auth/session-helper';

export const POST: RequestHandler = async (event) => {
	const ipAddress = getClientIp(event.request, event.getClientAddress());
	const userAgent = event.request.headers.get('user-agent') ?? 'unknown';
	const token = event.cookies.get(getSessionCookieName());

	if (!token) {
		await appendAuthAuditLog({ action: 'logout', outcome: 'success', ip: ipAddress, userAgent });
		return json({ ok: true });
	}

	try {
		await deleteSessionByToken(token);
		deleteSessionCookie(event);
		await appendAuthAuditLog({ action: 'logout', outcome: 'success', ip: ipAddress, userAgent });
		return json({ ok: true });
	} catch {
		await appendAuthAuditLog({ action: 'logout', outcome: 'fail', ip: ipAddress, userAgent });
		return json({ error: 'Failed to logout' }, { status: 500 });
	}
};
