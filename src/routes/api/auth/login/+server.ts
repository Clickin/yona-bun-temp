import { eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { n4user } from '../../../../../drizzle/schema';
import { getDb } from '$lib/server/db';
import { appendAuthAuditLog } from '$lib/server/auth/audit';
import { verifyPassword } from '$lib/server/auth/password';
import { allowAuthRequest } from '$lib/server/auth/rate-limit';
import { getClientIp, hasValidSameOrigin, readAuthPayload } from '$lib/server/auth/request-validation';
import { createSession } from '$lib/server/auth/session';
import { setSessionCookie } from '$lib/server/auth/session-helper';

const GENERIC_LOGIN_ERROR = 'Invalid email or password';

export const POST: RequestHandler = async (event) => {
	const ipAddress = getClientIp(event.request, event.getClientAddress());
	const userAgent = event.request.headers.get('user-agent') ?? 'unknown';

	if (!hasValidSameOrigin(event.request)) {
		await appendAuthAuditLog({ action: 'login', outcome: 'denied', ip: ipAddress, userAgent });
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	if (!allowAuthRequest({ route: 'login', ip: ipAddress })) {
		await appendAuthAuditLog({ action: 'login', outcome: 'denied', ip: ipAddress, userAgent });
		return json({ error: 'Too many requests' }, { status: 429 });
	}

	const { payload, error } = await readAuthPayload(event.request);
	if (!payload) {
		await appendAuthAuditLog({ action: 'login', outcome: 'fail', ip: ipAddress, userAgent });
		return json({ error: error ?? GENERIC_LOGIN_ERROR }, { status: 400 });
	}

	try {
		const [foundUser] = await getDb()
			.select({
				email: n4user.email,
				id: n4user.id,
				loginId: n4user.loginId,
				name: n4user.name,
				password: n4user.password,
				passwordSalt: n4user.passwordSalt
			})
			.from(n4user)
			.where(eq(n4user.loginId, payload.email))
			.limit(1);

		if (!foundUser || !foundUser.password || !foundUser.passwordSalt) {
			await appendAuthAuditLog({
				action: 'login',
				outcome: 'fail',
				ip: ipAddress,
				userAgent,
				targetEmail: payload.email
			});
			return json({ error: GENERIC_LOGIN_ERROR }, { status: 401 });
		}

		const passwordMatches = await verifyPassword(payload.password, foundUser.password, foundUser.passwordSalt);
		if (!passwordMatches) {
			await appendAuthAuditLog({
				action: 'login',
				outcome: 'fail',
				ip: ipAddress,
				userAgent,
				targetEmail: payload.email
			});
			return json({ error: GENERIC_LOGIN_ERROR }, { status: 401 });
		}

		const session = await createSession({
			ipAddress,
			userAgent,
			userId: foundUser.id
		});
		setSessionCookie(event, session.token);

		await appendAuthAuditLog({
			action: 'login',
			outcome: 'success',
			ip: ipAddress,
			userAgent,
			targetEmail: payload.email
		});

		return json({
			csrfToken: session.csrfToken,
			session: {
				expiresAt: session.expiresAt.toISOString(),
				userId: session.userId
			},
			user: {
				email: foundUser.email,
				id: foundUser.id,
				loginId: foundUser.loginId,
				name: foundUser.name
			}
		});
	} catch {
		await appendAuthAuditLog({
			action: 'login',
			outcome: 'fail',
			ip: ipAddress,
			userAgent,
			targetEmail: payload.email
		});
		return json({ error: 'Failed to login' }, { status: 500 });
	}
};
