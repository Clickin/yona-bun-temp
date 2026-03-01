import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../../../../routes/api/repos/[repoId]/bootstrap/+server';
import { readMutationActor } from '$lib/server/git/auth';
import { provisionRepository } from '$lib/server/git/provision';

vi.mock('$lib/server/git/auth', () => ({
	readMutationActor: vi.fn()
}));

vi.mock('$lib/server/git/provision', () => ({
	provisionRepository: vi.fn()
}));

describe('POST /api/repos/[repoId]/bootstrap', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 401 when actor headers are missing', async () => {
		vi.mocked(readMutationActor).mockReturnValue(null);

		const response = await POST({
			params: { repoId: '1001' },
			request: new Request('http://localhost/api/repos/1001/bootstrap', { method: 'POST' })
		} as Parameters<typeof POST>[0]);

		expect(response.status).toBe(401);
	});

	it('returns 403 when actor is not admin', async () => {
		vi.mocked(readMutationActor).mockReturnValue({
			id: 'u-1',
			name: 'Editor',
			email: 'editor@example.com',
			role: 'maintainer',
			canDirectWrite: true,
			canAdmin: false,
			ipAddress: '127.0.0.1'
		});

		const response = await POST({
			params: { repoId: '1001' },
			request: new Request('http://localhost/api/repos/1001/bootstrap', { method: 'POST' })
		} as Parameters<typeof POST>[0]);

		expect(response.status).toBe(403);
	});

	it('returns 201 when repository is newly created', async () => {
		vi.mocked(readMutationActor).mockReturnValue({
			id: 'admin-1',
			name: 'Admin',
			email: 'admin@example.com',
			role: 'admin',
			canDirectWrite: true,
			canAdmin: true,
			ipAddress: '127.0.0.1'
		});

		vi.mocked(provisionRepository).mockResolvedValue({
			repositoryId: '1001',
			repositoryPath: '/yona-data/repo/1001',
			created: true
		});

		const response = await POST({
			params: { repoId: '1001' },
			request: new Request('http://localhost/api/repos/1001/bootstrap', { method: 'POST' })
		} as Parameters<typeof POST>[0]);

		expect(response.status).toBe(201);
		expect(provisionRepository).toHaveBeenCalledWith('1001');
	});
});
