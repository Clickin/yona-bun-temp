import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '../../../../routes/api/repos/[repoId]/smart-http/[...gitPath]/+server';
import { handleSmartHttpRequest } from '$lib/server/git/http-backend';

vi.mock('$lib/server/git/http-backend', () => ({
	handleSmartHttpRequest: vi.fn()
}));

describe('smart-http route delegation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 404 when git path is missing', async () => {
		const response = await GET({
			params: { repoId: '1001', gitPath: '' },
			request: new Request('http://localhost/api/repos/1001/smart-http', { method: 'GET' })
		} as Parameters<typeof GET>[0]);

		expect(response.status).toBe(404);
	});

	it('delegates GET to smart-http handler with normalized path info', async () => {
		vi.mocked(handleSmartHttpRequest).mockResolvedValue(new Response('ok', { status: 200 }));

		const request = new Request('http://localhost/api/repos/1001/smart-http/info/refs?service=git-upload-pack', {
			method: 'GET'
		});

		const response = await GET({
			params: { repoId: '1001', gitPath: 'info/refs' },
			request
		} as Parameters<typeof GET>[0]);

		expect(handleSmartHttpRequest).toHaveBeenCalledWith({
			repositoryId: '1001',
			pathInfo: '/1001/info/refs',
			request
		});
		expect(response.status).toBe(200);
	});

	it('delegates POST for receive-pack transport calls', async () => {
		vi.mocked(handleSmartHttpRequest).mockResolvedValue(new Response('ok', { status: 200 }));

		const request = new Request(
			'http://localhost/api/repos/1001/smart-http/git-receive-pack',
			{ method: 'POST', body: 'pack-data' }
		);

		const response = await POST({
			params: { repoId: '1001', gitPath: 'git-receive-pack' },
			request
		} as Parameters<typeof POST>[0]);

		expect(handleSmartHttpRequest).toHaveBeenCalledWith({
			repositoryId: '1001',
			pathInfo: '/1001/git-receive-pack',
			request
		});
		expect(response.status).toBe(200);
	});
});
