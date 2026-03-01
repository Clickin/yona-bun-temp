import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './logout/+server';

const mockAppendAuthAuditLog = vi.hoisted(() => vi.fn());
const mockGetClientIp = vi.hoisted(() => vi.fn());
const mockDeleteSessionByToken = vi.hoisted(() => vi.fn());
const mockGetSessionCookieName = vi.hoisted(() => vi.fn());
const mockDeleteSessionCookie = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/auth/audit', () => ({
	appendAuthAuditLog: mockAppendAuthAuditLog
}));

vi.mock('$lib/server/auth/request-validation', () => ({
	getClientIp: mockGetClientIp
}));

vi.mock('$lib/server/auth/session', () => ({
	deleteSessionByToken: mockDeleteSessionByToken,
	getSessionCookieName: mockGetSessionCookieName
}));

vi.mock('$lib/server/auth/session-helper', () => ({
	deleteSessionCookie: mockDeleteSessionCookie
}));

function createEvent(token: string | undefined): Parameters<typeof POST>[0] {
	return {
		cookies: {
			get: vi.fn(() => token)
		},
		getClientAddress: () => '127.0.0.1',
		request: new Request('http://localhost/api/auth/logout', { method: 'POST' })
	} as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/auth/logout', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetClientIp.mockReturnValue('127.0.0.1');
		mockGetSessionCookieName.mockReturnValue('yona_session');
	});

	it('returns 200 when session cookie is absent', async () => {
		const response = await POST(createEvent(undefined));

		expect(response.status).toBe(200);
		expect(mockDeleteSessionByToken).not.toHaveBeenCalled();
		expect(mockDeleteSessionCookie).not.toHaveBeenCalled();
		await expect(response.json()).resolves.toEqual({ ok: true });
	});

	it('deletes session row and clears cookie when session cookie exists', async () => {
		const response = await POST(createEvent('session-token'));

		expect(response.status).toBe(200);
		expect(mockDeleteSessionByToken).toHaveBeenCalledWith('session-token');
		expect(mockDeleteSessionCookie).toHaveBeenCalledWith(expect.anything());
		await expect(response.json()).resolves.toEqual({ ok: true });
	});
});
