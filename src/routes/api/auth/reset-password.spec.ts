import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './reset-password/+server';

const mockGetDb = vi.hoisted(() => vi.fn());
const mockAppendAuthAuditLog = vi.hoisted(() => vi.fn());
const mockHashPassword = vi.hoisted(() => vi.fn());
const mockGetClientIp = vi.hoisted(() => vi.fn());
const mockDeleteAllSessionsByUserId = vi.hoisted(() => vi.fn());
const mockGenerateResetToken = vi.hoisted(() => vi.fn());
const mockReadMutationActor = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db', () => ({
	getDb: mockGetDb
}));

vi.mock('$lib/server/auth/audit', () => ({
	appendAuthAuditLog: mockAppendAuthAuditLog
}));

vi.mock('$lib/server/auth/password', () => ({
	hashPassword: mockHashPassword
}));

vi.mock('$lib/server/auth/request-validation', () => ({
	getClientIp: mockGetClientIp
}));

vi.mock('$lib/server/auth/session', () => ({
	deleteAllSessionsByUserId: mockDeleteAllSessionsByUserId
}));

vi.mock('$lib/server/auth/tokens', () => ({
	generateResetToken: mockGenerateResetToken
}));

vi.mock('$lib/server/git/auth', () => ({
	readMutationActor: mockReadMutationActor
}));

function createDbMock() {
	return {
		update: vi.fn(() => ({
			set: vi.fn(() => ({
				where: vi.fn(async () => undefined)
			}))
		}))
	};
}

function createEvent(body: Record<string, unknown>): Parameters<typeof POST>[0] {
	return {
		getClientAddress: () => '127.0.0.1',
		request: new Request('http://localhost/api/auth/reset-password', {
			body: JSON.stringify(body),
			headers: {
				'content-type': 'application/json'
			},
			method: 'POST'
		})
	} as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/auth/reset-password', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetClientIp.mockReturnValue('127.0.0.1');
		mockGetDb.mockReturnValue(createDbMock());
		mockReadMutationActor.mockReturnValue({
			canAdmin: true,
			email: 'admin@example.com',
			id: '1',
			ipAddress: '127.0.0.1',
			name: 'Admin',
			role: 'admin'
		});
		mockGenerateResetToken.mockReturnValue('new-salt');
		mockHashPassword.mockResolvedValue('new-hash');
	});

	it('returns 403 for non-admin actor', async () => {
		mockReadMutationActor.mockReturnValue({
			canAdmin: false,
			email: 'dev@example.com',
			id: '2',
			ipAddress: '127.0.0.1',
			name: 'Dev',
			role: 'user'
		});

		const response = await POST(createEvent({ newPassword: 'super-secret-password', userId: 42 }));

		expect(response.status).toBe(403);
		await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
	});

	it('resets password for admin and invalidates all user sessions', async () => {
		const response = await POST(createEvent({ newPassword: 'super-secret-password', userId: 42 }));

		expect(response.status).toBe(200);
		expect(mockHashPassword).toHaveBeenCalledWith('super-secret-password', 'new-salt');
		expect(mockDeleteAllSessionsByUserId).toHaveBeenCalledWith(42);
		await expect(response.json()).resolves.toEqual({ ok: true });
	});

	it('returns 401 when actor headers are missing', async () => {
		mockReadMutationActor.mockReturnValue(null);

		const response = await POST(createEvent({ newPassword: 'super-secret-password', userId: 42 }));

		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
	});
});
