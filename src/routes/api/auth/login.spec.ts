import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './login/+server';

const mockGetDb = vi.hoisted(() => vi.fn());
const mockAppendAuthAuditLog = vi.hoisted(() => vi.fn());
const mockVerifyPassword = vi.hoisted(() => vi.fn());
const mockAllowAuthRequest = vi.hoisted(() => vi.fn());
const mockGetClientIp = vi.hoisted(() => vi.fn());
const mockHasValidSameOrigin = vi.hoisted(() => vi.fn());
const mockReadAuthPayload = vi.hoisted(() => vi.fn());
const mockCreateSession = vi.hoisted(() => vi.fn());
const mockSetSessionCookie = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db', () => ({
	getDb: mockGetDb
}));

vi.mock('$lib/server/auth/audit', () => ({
	appendAuthAuditLog: mockAppendAuthAuditLog
}));

vi.mock('$lib/server/auth/password', () => ({
	verifyPassword: mockVerifyPassword
}));

vi.mock('$lib/server/auth/rate-limit', () => ({
	allowAuthRequest: mockAllowAuthRequest
}));

vi.mock('$lib/server/auth/request-validation', () => ({
	getClientIp: mockGetClientIp,
	hasValidSameOrigin: mockHasValidSameOrigin,
	readAuthPayload: mockReadAuthPayload
}));

vi.mock('$lib/server/auth/session', () => ({
	createSession: mockCreateSession
}));

vi.mock('$lib/server/auth/session-helper', () => ({
	setSessionCookie: mockSetSessionCookie
}));

function createDbMock(selectResults: unknown[]) {
	let selectIndex = 0;

	return {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: vi.fn(() => ({
					limit: vi.fn(async () => (selectResults[selectIndex++] as unknown[]) ?? [])
				}))
			}))
		}))
	};
}

function createEvent(): Parameters<typeof POST>[0] {
	return {
		cookies: {
			set: vi.fn()
		},
		getClientAddress: () => '127.0.0.1',
		request: new Request('http://localhost/api/auth/login', { method: 'POST' })
	} as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/auth/login', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockHasValidSameOrigin.mockReturnValue(true);
		mockGetClientIp.mockReturnValue('127.0.0.1');
		mockAllowAuthRequest.mockReturnValue(true);
		mockReadAuthPayload.mockResolvedValue({
			payload: {
				email: 'user@example.com',
				password: 'super-secret-password'
			}
		});
		mockCreateSession.mockResolvedValue({
			csrfToken: 'csrf-token',
			expiresAt: new Date('2030-01-01T00:00:00.000Z'),
			token: 'session-token',
			userId: 101
		});
	});

	it('returns 401 with generic auth error when user is missing', async () => {
		mockGetDb.mockReturnValue(createDbMock([[]]));

		const response = await POST(createEvent());

		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({
			error: 'Invalid email or password'
		});
	});

	it('returns 401 with generic auth error on wrong password', async () => {
		mockGetDb.mockReturnValue(
			createDbMock([
				[
					{
						email: 'user@example.com',
						id: 101,
						loginId: 'user@example.com',
						name: 'User',
						password: 'stored-hash',
						passwordSalt: 'stored-salt'
					}
				]
			])
		);
		mockVerifyPassword.mockResolvedValue(false);

		const response = await POST(createEvent());

		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({
			error: 'Invalid email or password'
		});
	});

	it('creates session and returns csrf token for valid credentials', async () => {
		mockGetDb.mockReturnValue(
			createDbMock([
				[
					{
						email: 'user@example.com',
						id: 101,
						loginId: 'user@example.com',
						name: 'User',
						password: 'stored-hash',
						passwordSalt: 'stored-salt'
					}
				]
			])
		);
		mockVerifyPassword.mockResolvedValue(true);

		const response = await POST(createEvent());

		expect(response.status).toBe(200);
		expect(mockSetSessionCookie).toHaveBeenCalledWith(expect.anything(), 'session-token');
		await expect(response.json()).resolves.toMatchObject({
			csrfToken: 'csrf-token',
			session: { userId: 101 },
			user: { email: 'user@example.com', id: 101 }
		});
	});
});
