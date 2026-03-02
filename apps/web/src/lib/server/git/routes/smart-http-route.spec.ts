import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '@web/routes/api/repos/[repoId]/smart-http/[...gitPath]/+server';
import { apiApp } from '@yona/api';

vi.mock('@yona/api', () => ({
	apiApp: {
		fetch: vi.fn()
	}
}));

describe('smart-http route delegation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('forwards GET to apiApp', async () => {
		vi.mocked(apiApp.fetch).mockResolvedValue(new Response('ok', { status: 200 }));
		const request = new Request('http://localhost/api/repos/1001/smart-http/info/refs?service=git-upload-pack', {
			method: 'GET'
		});

		const response = await GET({
			params: { repoId: '1001', gitPath: 'info/refs' },
			request
		} as Parameters<typeof GET>[0]);

		expect(apiApp.fetch).toHaveBeenCalledWith(request, expect.objectContaining({ request }));
		expect(response.status).toBe(200);
	});

	it('forwards POST to apiApp', async () => {
		vi.mocked(apiApp.fetch).mockResolvedValue(new Response('ok', { status: 200 }));
		const request = new Request('http://localhost/api/repos/1001/smart-http/git-receive-pack', {
			method: 'POST',
			body: 'pack-data'
		});

		const response = await POST({
			params: { repoId: '1001', gitPath: 'git-receive-pack' },
			request
		} as Parameters<typeof POST>[0]);

		expect(apiApp.fetch).toHaveBeenCalledWith(request, expect.objectContaining({ request }));
		expect(response.status).toBe(200);
	});
});
