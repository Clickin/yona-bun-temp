import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './session/+server';

const mockGetDb = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db', () => ({
	getDb: mockGetDb
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

describe('GET /api/auth/session', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns null session for unauthenticated requests', async () => {
		const response = await GET({ locals: {} } as Parameters<typeof GET>[0]);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ session: null });
	});

	it('returns session and user for authenticated requests', async () => {
		mockGetDb.mockReturnValue(
			createDbMock([[{ email: 'user@example.com', id: 101, loginId: 'user@example.com', name: 'User' }]])
		);

		const response = await GET({
			locals: {
				session: {
					csrfToken: 'csrf-token',
					expiresAt: new Date('2030-01-01T00:00:00.000Z'),
					token: 'session-token',
					userId: 101
				}
			}
		} as Parameters<typeof GET>[0]);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toMatchObject({
			session: {
				csrfToken: 'csrf-token',
				userId: 101
			},
			user: {
				email: 'user@example.com',
				id: 101,
				loginId: 'user@example.com',
				name: 'User'
			}
		});
	});
});
