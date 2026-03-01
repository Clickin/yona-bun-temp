import { eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { n4user, userCredential } from '../../../../../drizzle/schema';
import { getDb } from '$lib/server/db';
import { appendAuthAuditLog } from '$lib/server/auth/audit';
import { hashPassword } from '$lib/server/auth/password';
import { allowAuthRequest } from '$lib/server/auth/rate-limit';
import { getClientIp, hasValidSameOrigin, readAuthPayload } from '$lib/server/auth/request-validation';
import { createSession } from '$lib/server/auth/session';
import { setSessionCookie } from '$lib/server/auth/session-helper';
import { generateResetToken } from '$lib/server/auth/tokens';

const GENERIC_REGISTER_ERROR = 'Unable to register with the provided credentials';

export const POST: RequestHandler = async (event) => {
	const ipAddress = getClientIp(event.request, event.getClientAddress());
	const userAgent = event.request.headers.get('user-agent') ?? 'unknown';

	if (!hasValidSameOrigin(event.request)) {
		await appendAuthAuditLog({ action: 'register', outcome: 'denied', ip: ipAddress, userAgent });
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	if (!allowAuthRequest({ route: 'register', ip: ipAddress })) {
		await appendAuthAuditLog({ action: 'register', outcome: 'denied', ip: ipAddress, userAgent });
		return json({ error: 'Too many requests' }, { status: 429 });
	}

	const { payload, error } = await readAuthPayload(event.request);
	if (!payload) {
		await appendAuthAuditLog({
			action: 'register',
			outcome: 'fail',
			ip: ipAddress,
			userAgent
		});
		return json({ error: error ?? 'Invalid request payload' }, { status: 400 });
	}

	const displayName = payload.name ?? payload.email.split('@')[0] ?? payload.email;

	try {
		const db = getDb();
		const [existingUser] = await db
			.select({ id: n4user.id })
			.from(n4user)
			.where(eq(n4user.loginId, payload.email))
			.limit(1);

		if (existingUser) {
			await appendAuthAuditLog({
				action: 'register',
				outcome: 'fail',
				ip: ipAddress,
				userAgent,
				targetEmail: payload.email
			});
			return json({ error: GENERIC_REGISTER_ERROR }, { status: 409 });
		}

		const passwordSalt = generateResetToken();
		const passwordHash = await hashPassword(payload.password, passwordSalt);
		const createdDate = new Date();

		await db.insert(n4user).values({
			createdDate,
			email: payload.email,
			isGuest: false,
			loginId: payload.email,
			name: displayName,
			password: passwordHash,
			passwordSalt
		});

		const [createdUser] = await db
			.select({
				email: n4user.email,
				id: n4user.id,
				loginId: n4user.loginId,
				name: n4user.name
			})
			.from(n4user)
			.where(eq(n4user.loginId, payload.email))
			.limit(1);

		if (!createdUser) {
			throw new Error('Failed to load newly created user');
		}

		await db.insert(userCredential).values({
			active: true,
			email: payload.email,
			emailValidated: false,
			loginId: payload.email,
			name: displayName,
			userId: createdUser.id
		});

		const session = await createSession({
			ipAddress,
			userAgent,
			userId: createdUser.id
		});
		setSessionCookie(event, session.token);

		await appendAuthAuditLog({
			action: 'register',
			outcome: 'success',
			ip: ipAddress,
			userAgent,
			targetEmail: payload.email
		});

		return json(
			{
				csrfToken: session.csrfToken,
				session: {
					expiresAt: session.expiresAt.toISOString(),
					userId: session.userId
				},
				user: createdUser
			},
			{ status: 201 }
		);
	} catch (routeError) {
		const isDuplicate = routeError instanceof Error && /duplicate|unique|uq_/i.test(routeError.message);

		await appendAuthAuditLog({
			action: 'register',
			outcome: 'fail',
			ip: ipAddress,
			userAgent,
			targetEmail: payload.email
		});

		if (isDuplicate) {
			return json({ error: GENERIC_REGISTER_ERROR }, { status: 409 });
		}

		return json({ error: 'Failed to register user' }, { status: 500 });
	}
};
