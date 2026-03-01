import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './reset-password/+server';

const mockGetDb = vi.hoisted(() => vi.fn());
const mockAppendAuthAuditLog = vi.hoisted(() => vi.fn());
const mockHashPassword = vi.hoisted(() => vi.fn());
const mockGetClientIp = vi.hoisted(() => vi.fn());
const mockDeleteAllSessionsByUserId = vi.hoisted(() => vi.fn());
const mockGenerateResetToken = vi.hoisted(() => vi.fn());
const mockReadRequestCsrfToken = vi.hoisted(() => vi.fn());
const mockValidateCsrfToken = vi.hoisted(() => vi.fn());
const mockResolveEmailProvider = vi.hoisted(() => vi.fn());
const mockSendResetPasswordNotification = vi.hoisted(() => vi.fn());
const MockEmailNotConfiguredError = vi.hoisted(
	() =>
		class EmailNotConfiguredError extends Error {
			public readonly code = 'EMAIL_NOT_CONFIGURED';
		}
);
const MockEmailProviderNotImplementedError = vi.hoisted(
	() =>
		class EmailProviderNotImplementedError extends Error {
			public readonly code = 'EMAIL_PROVIDER_NOT_IMPLEMENTED';
		}
);

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

vi.mock('$lib/server/auth/csrf', () => ({
	readRequestCsrfToken: mockReadRequestCsrfToken,
	validateCsrfToken: mockValidateCsrfToken
}));

vi.mock('$lib/server/email', () => ({
	EmailNotConfiguredError: MockEmailNotConfiguredError,
	EmailProviderNotImplementedError: MockEmailProviderNotImplementedError,
	resolveEmailProvider: mockResolveEmailProvider
}));

function createDbMock() {
	const selectLimit = vi.fn(async () => [{ email: 'target@example.com', loginId: 'target@example.com' }]);
	const selectWhere = vi.fn(() => ({
		limit: selectLimit
	}));
	const selectFrom = vi.fn(() => ({
		where: selectWhere
	}));
	const select = vi.fn(() => ({
		from: selectFrom
	}));

	return {
		select,
		update: vi.fn(() => ({
			set: vi.fn(() => ({
				where: vi.fn(async () => undefined)
			}))
		}))
	};
}

function createEvent(
	body: Record<string, unknown>,
	options?: { headers?: Record<string, string>; sessionUserId?: number }
): Parameters<typeof POST>[0] {
	const session =
		typeof options?.sessionUserId === 'number'
			? {
				csrfToken: 'csrf-token',
				expiresAt: new Date('2030-01-01T00:00:00.000Z'),
				token: 'session-token',
				userId: options.sessionUserId
			}
			: undefined;

	return {
		getClientAddress: () => '127.0.0.1',
		locals: {
			session
		},
		request: new Request('http://localhost/api/auth/reset-password', {
			body: JSON.stringify(body),
			headers: {
				'content-type': 'application/json',
				...(options?.headers ?? {})
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
		process.env.YONA_ADMIN_USER_IDS = '1';
		process.env.NODE_ENV = 'development';
		mockGenerateResetToken.mockReturnValue('new-salt');
		mockHashPassword.mockResolvedValue('new-hash');
		mockReadRequestCsrfToken.mockReturnValue('csrf-token');
		mockValidateCsrfToken.mockReturnValue(true);
		mockResolveEmailProvider.mockReturnValue({
			sendResetPasswordNotification: mockSendResetPasswordNotification
		});
		mockSendResetPasswordNotification.mockResolvedValue(undefined);
	});

	it('returns 403 when csrf token is missing from authenticated reset request', async () => {
		mockReadRequestCsrfToken.mockReturnValue('');
		mockValidateCsrfToken.mockReturnValue(false);

		const response = await POST(
			createEvent({ newPassword: 'super-secret-password', userId: 42 }, { sessionUserId: 1 })
		);

		expect(response.status).toBe(403);
		await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
	});

	it('returns 403 for authenticated non-admin session', async () => {
		const response = await POST(
			createEvent({ newPassword: 'super-secret-password', userId: 42 }, { sessionUserId: 2 })
		);

		expect(response.status).toBe(403);
		await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
	});

	it('ignores spoofed admin headers when session user is not allowlisted', async () => {
		const response = await POST(
			createEvent(
				{ newPassword: 'super-secret-password', userId: 42 },
				{
					headers: {
						'x-yona-can-admin': 'true',
						'x-yona-role': 'admin',
						'x-yona-user-email': 'admin@example.com',
						'x-yona-user-id': '999',
						'x-yona-user-name': 'Spoofed Admin'
					},
					sessionUserId: 2
				}
			)
		);

		expect(response.status).toBe(403);
		await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
	});

	it('resets password for admin and invalidates all user sessions', async () => {
		const response = await POST(
			createEvent({ newPassword: 'super-secret-password', userId: 42 }, { sessionUserId: 1 })
		);

		expect(response.status).toBe(200);
		expect(mockHashPassword).toHaveBeenCalledWith('super-secret-password', 'new-salt');
		expect(mockDeleteAllSessionsByUserId).toHaveBeenCalledWith(42);
		expect(mockSendResetPasswordNotification).toHaveBeenCalledTimes(1);
		expect(mockSendResetPasswordNotification).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'target@example.com'
			})
		);
		await expect(response.json()).resolves.toEqual({ ok: true });
	});

	it('returns 503 when SMTP is not configured in non-development environment', async () => {
		process.env.NODE_ENV = 'production';
		mockSendResetPasswordNotification.mockRejectedValue(
			new MockEmailNotConfiguredError('SMTP is not configured. Email sending is unavailable.')
		);

		const response = await POST(
			createEvent({ newPassword: 'super-secret-password', userId: 42 }, { sessionUserId: 1 })
		);

		expect(response.status).toBe(503);
		await expect(response.json()).resolves.toEqual({ error: 'Email provider is not configured' });
	});

	it('returns 503 when SMTP provider implementation is missing in production', async () => {
		process.env.NODE_ENV = 'production';
		mockSendResetPasswordNotification.mockRejectedValue(new MockEmailProviderNotImplementedError());

		const response = await POST(
			createEvent({ newPassword: 'super-secret-password', userId: 42 }, { sessionUserId: 1 })
		);

		expect(response.status).toBe(503);
		await expect(response.json()).resolves.toEqual({ error: 'Email provider is not configured' });
	});

	it('returns 401 when session is missing', async () => {
		const response = await POST(createEvent({ newPassword: 'super-secret-password', userId: 42 }));

		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
	});
});
