import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../../../../routes/api/repos/[repoId]/files/+server';
import { readRepositoryFile } from '$lib/server/git/mutation';
import { ensureYonaDataDirectories, getRepositoryRoot } from '$lib/server/git/config';
import { resolveRepositoryPath } from '$lib/server/git/executable';

vi.mock('$lib/server/git/config', () => ({
	ensureYonaDataDirectories: vi.fn(),
	getRepositoryRoot: vi.fn(() => '/repo-root')
}));

vi.mock('$lib/server/git/executable', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/git/executable')>(
		'$lib/server/git/executable'
	);

	return {
		...actual,
		resolveRepositoryPath: vi.fn(() => '/repo-root/1001')
	};
});

vi.mock('$lib/server/git/mutation', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/git/mutation')>('$lib/server/git/mutation');

	return {
		...actual,
		readRepositoryFile: vi.fn()
	};
});

describe('GET /api/repos/[repoId]/files', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 400 when required query parameters are missing', async () => {
		const response = await GET({
			params: { repoId: '1001' },
			url: new URL('http://localhost/api/repos/1001/files')
		} as Parameters<typeof GET>[0]);

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({
			error: 'repoId, branch, and path query parameters are required'
		});
	});

	it('returns repository file payload on success', async () => {
		vi.mocked(readRepositoryFile).mockResolvedValue({
			oid: 'abc123',
			content: 'hello\n'
		});

		const response = await GET({
			params: { repoId: '1001' },
			url: new URL('http://localhost/api/repos/1001/files?branch=main&path=README.md')
		} as Parameters<typeof GET>[0]);

		expect(ensureYonaDataDirectories).toHaveBeenCalledTimes(1);
		expect(getRepositoryRoot).toHaveBeenCalledTimes(1);
		expect(resolveRepositoryPath).toHaveBeenCalledWith('/repo-root', '1001');
		expect(readRepositoryFile).toHaveBeenCalledWith({
			repoPath: '/repo-root/1001',
			branch: 'main',
			filePath: 'README.md'
		});

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			repositoryId: '1001',
			branch: 'main',
			filePath: 'README.md',
			baseOid: 'abc123',
			content: 'hello\n'
		});
	});

	it('maps invalid path/repo errors to 400', async () => {
		vi.mocked(readRepositoryFile).mockRejectedValue(new Error('Invalid file path: ../x'));

		const response = await GET({
			params: { repoId: '1001' },
			url: new URL('http://localhost/api/repos/1001/files?branch=main&path=../x')
		} as Parameters<typeof GET>[0]);

		expect(response.status).toBe(400);
	});

	it('maps missing resources to 404', async () => {
		vi.mocked(readRepositoryFile).mockRejectedValue(new Error('not found'));

		const response = await GET({
			params: { repoId: '1001' },
			url: new URL('http://localhost/api/repos/1001/files?branch=main&path=README.md')
		} as Parameters<typeof GET>[0]);

		expect(response.status).toBe(404);
	});
});
