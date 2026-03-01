import { eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { n4user } from '../../../../../drizzle/schema';
import { getDb } from '$lib/server/db';
import { appendAuthAuditLog } from '$lib/server/auth/audit';
import { hashPassword } from '$lib/server/auth/password';
import { getClientIp } from '$lib/server/auth/request-validation';
import { deleteAllSessionsByUserId } from '$lib/server/auth/session';
import { generateResetToken } from '$lib/server/auth/tokens';
import { readMutationActor } from '$lib/server/git/auth';

const RESET_PASSWORD_WINDOW_MS = 60 * 60 * 1000;
const RESET_PASSWORD_MAX_PER_WINDOW = 3;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

const resetPasswordBuckets = new Map<string, number>();

function getWindowHour(now: Date): number {
	return Math.floor(now.getTime() / RESET_PASSWORD_WINDOW_MS);
}

function cleanupResetPasswordBuckets(currentWindowHour: number): void {
	if (resetPasswordBuckets.size <= 2_000) {
		return;
	}

	for (const key of resetPasswordBuckets.keys()) {
		const parts = key.split(':');
		const windowHour = Number.parseInt(parts[parts.length - 1] ?? '', 10);
		if (!Number.isFinite(windowHour) || windowHour < currentWindowHour - 1) {
			resetPasswordBuckets.delete(key);
		}
	}
}

function allowResetPasswordRequest(ip: string, now = new Date()): boolean {
	const currentWindowHour = getWindowHour(now);
	cleanupResetPasswordBuckets(currentWindowHour);

	const key = `${ip}:${currentWindowHour}`;
	const count = resetPasswordBuckets.get(key) ?? 0;
	if (count >= RESET_PASSWORD_MAX_PER_WINDOW) {
		return false;
	}

	resetPasswordBuckets.set(key, count + 1);
	return true;
}

function isValidPassword(value: unknown): value is string {
	return (
		typeof value === 'string' && value.length >= MIN_PASSWORD_LENGTH && value.length <= MAX_PASSWORD_LENGTH
	);
}

function isValidUserId(value: unknown): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export const POST: RequestHandler = async (event) => {
	const ipAddress = getClientIp(event.request, event.getClientAddress());
	const userAgent = event.request.headers.get('user-agent') ?? 'unknown';
	const actor = readMutationActor(event.request.headers);

	if (!actor) {
		await appendAuthAuditLog({ action: 'reset-password', outcome: 'denied', ip: ipAddress, userAgent });
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!actor.canAdmin) {
		await appendAuthAuditLog({ action: 'reset-password', outcome: 'denied', ip: ipAddress, userAgent });
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	if (!allowResetPasswordRequest(ipAddress)) {
		await appendAuthAuditLog({ action: 'reset-password', outcome: 'denied', ip: ipAddress, userAgent });
		return json({ error: 'Too many requests' }, { status: 429 });
	}

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		await appendAuthAuditLog({ action: 'reset-password', outcome: 'fail', ip: ipAddress, userAgent });
		return json({ error: 'Invalid request payload' }, { status: 400 });
	}

	const userId = (body as { userId?: unknown })?.userId;
	const newPassword = (body as { newPassword?: unknown })?.newPassword;
	if (!isValidUserId(userId) || !isValidPassword(newPassword)) {
		await appendAuthAuditLog({ action: 'reset-password', outcome: 'fail', ip: ipAddress, userAgent });
		return json({ error: 'Invalid request payload' }, { status: 400 });
	}

	try {
		const passwordSalt = generateResetToken();
		const passwordHash = await hashPassword(newPassword, passwordSalt);

		await getDb()
			.update(n4user)
			.set({
				password: passwordHash,
				passwordSalt
			})
			.where(eq(n4user.id, userId));

		await deleteAllSessionsByUserId(userId);
		await appendAuthAuditLog({
			action: 'reset-password',
			outcome: 'success',
			ip: ipAddress,
			targetUserId: userId,
			userAgent
		});

		return json({ ok: true });
	} catch {
		await appendAuthAuditLog({
			action: 'reset-password',
			outcome: 'fail',
			ip: ipAddress,
			targetUserId: userId,
			userAgent
		});
		return json({ error: 'Failed to reset password' }, { status: 500 });
	}
};
