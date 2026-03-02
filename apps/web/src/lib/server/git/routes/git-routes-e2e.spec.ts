import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runGit } from '@yona/infra';
import { POST as BOOTSTRAP_POST } from '@web/routes/api/repos/[repoId]/bootstrap/+server';
import { GET as FILES_GET } from '@web/routes/api/repos/[repoId]/files/+server';
import { POST as INLINE_EDIT_POST } from '@web/routes/api/repos/[repoId]/inline-edit/+server';
import {
	GET as SMART_HTTP_GET,
	POST as SMART_HTTP_POST
} from '@web/routes/api/repos/[repoId]/smart-http/[...gitPath]/+server';

interface BootstrapResponsePayload {
	repositoryId: string;
	repositoryPath: string;
	created: boolean;
}

interface FileResponsePayload {
	repositoryId: string;
	branch: string;
	filePath: string;
	baseOid: string;
	content: string;
}

interface InlineEditResponsePayload {
	requestId: string;
	repositoryId: string;
	branch: string;
	filePath: string;
	commit: {
		refName: string;
		oldOid: string;
		newOid: string;
		treeOid: string;
		blobOid: string;
	};
}

function actorHeaders(role: string): HeadersInit {
	return {
		'x-yona-user-id': `${role}-user`,
		'x-yona-user-name': `${role} user`,
		'x-yona-user-email': `${role}@example.com`,
		'x-yona-role': role,
		'x-forwarded-for': '127.0.0.1'
	};
}

async function bootstrapRepository(repoId: string): Promise<BootstrapResponsePayload> {
	const response = await BOOTSTRAP_POST({
		params: { repoId },
		request: new Request(`http://localhost/api/repos/${repoId}/bootstrap`, {
			method: 'POST',
			headers: actorHeaders('admin')
		})
	} as Parameters<typeof BOOTSTRAP_POST>[0]);

	expect(response.status).toBe(201);
	return (await response.json()) as BootstrapResponsePayload;
}

async function seedRepositoryBranches(bareRepoPath: string): Promise<void> {
	const workPath = await mkdtemp(`${tmpdir()}${sep}yona-git-e2e-seed-`);

	try {
		await runGit(['init'], { cwd: workPath });
		await runGit(['config', 'user.name', 'Seed User'], { cwd: workPath });
		await runGit(['config', 'user.email', 'seed@example.com'], { cwd: workPath });

		const readmePath = join(workPath, 'README.md');
		await writeFile(readmePath, 'hello from main\n', 'utf-8');
		await runGit(['add', 'README.md'], { cwd: workPath });
		await runGit(['commit', '-m', 'seed main branch'], { cwd: workPath });
		await runGit(['branch', '-M', 'main'], { cwd: workPath });
		await runGit(['remote', 'add', 'origin', bareRepoPath], { cwd: workPath });
		await runGit(['push', '-u', 'origin', 'main'], { cwd: workPath });

		await runGit(['checkout', '-b', 'feature'], { cwd: workPath });
		await writeFile(readmePath, 'hello from feature\n', 'utf-8');
		await runGit(['add', 'README.md'], { cwd: workPath });
		await runGit(['commit', '-m', 'seed feature branch'], { cwd: workPath });
		await runGit(['push', '-u', 'origin', 'feature'], { cwd: workPath });
	} finally {
		await rm(workPath, { recursive: true, force: true });
	}
}

async function readRepositoryFile(repoId: string, branch: string): Promise<FileResponsePayload> {
	const response = await FILES_GET({
		params: { repoId },
		url: new URL(`http://localhost/api/repos/${repoId}/files?branch=${branch}&path=README.md`)
	} as Parameters<typeof FILES_GET>[0]);

	expect(response.status).toBe(200);
	return (await response.json()) as FileResponsePayload;
}

function makeInlineEditRequest(repoId: string, headers: HeadersInit, payload: Record<string, string>): Request {
	return new Request(`http://localhost/api/repos/${repoId}/inline-edit`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			...headers
		},
		body: JSON.stringify(payload)
	});
}

describe.sequential('git routes e2e flow', () => {
	afterEach(async () => {
		const yonaData = process.env.YONA_DATA;
		vi.unstubAllEnvs();
		if (yonaData) {
			await rm(yonaData, { recursive: true, force: true });
		}
	});

	it('supports bootstrap -> file read -> inline edit success -> stale conflict', async () => {
		const yonaData = await mkdtemp(`${tmpdir()}${sep}yona-data-inline-e2e-`);
		vi.stubEnv('YONA_DATA', yonaData);

		const repoId = 'repo-inline-e2e';
		const bootstrapPayload = await bootstrapRepository(repoId);
		await seedRepositoryBranches(bootstrapPayload.repositoryPath);

		const beforeEdit = await readRepositoryFile(repoId, 'main');

		const editResponse = await INLINE_EDIT_POST({
			params: { repoId },
			request: makeInlineEditRequest(repoId, actorHeaders('maintainer'), {
				branch: 'main',
				filePath: 'README.md',
				content: 'edited via inline api\n',
				message: 'apply inline edit',
				baseOid: beforeEdit.baseOid
			})
		} as Parameters<typeof INLINE_EDIT_POST>[0]);

		expect(editResponse.status).toBe(200);
		const editPayload = (await editResponse.json()) as InlineEditResponsePayload;
		expect(editPayload.commit.oldOid).toBe(beforeEdit.baseOid);

		const afterEdit = await readRepositoryFile(repoId, 'main');
		expect(afterEdit.content).toBe('edited via inline api\n');
		expect(afterEdit.baseOid).toBe(editPayload.commit.newOid);

		const staleResponse = await INLINE_EDIT_POST({
			params: { repoId },
			request: makeInlineEditRequest(repoId, actorHeaders('maintainer'), {
				branch: 'main',
				filePath: 'README.md',
				content: 'stale write\n',
				message: 'stale update',
				baseOid: beforeEdit.baseOid
			})
		} as Parameters<typeof INLINE_EDIT_POST>[0]);

		expect(staleResponse.status).toBe(409);
		await expect(staleResponse.json()).resolves.toMatchObject({
			error: 'Conflict: branch moved since baseOid',
			expectedOid: beforeEdit.baseOid,
			actualOid: afterEdit.baseOid
		});
	});

	it('enforces branch policy and smart-http receive-pack auth checks', async () => {
		const yonaData = await mkdtemp(`${tmpdir()}${sep}yona-data-smart-http-e2e-`);
		vi.stubEnv('YONA_DATA', yonaData);

		const repoId = 'repo-smart-http-e2e';
		const bootstrapPayload = await bootstrapRepository(repoId);
		await seedRepositoryBranches(bootstrapPayload.repositoryPath);

		const featureBefore = await readRepositoryFile(repoId, 'feature');

		const developerFeatureEdit = await INLINE_EDIT_POST({
			params: { repoId },
			request: makeInlineEditRequest(repoId, actorHeaders('developer'), {
				branch: 'feature',
				filePath: 'README.md',
				content: 'developer edit on feature\n',
				message: 'developer edit',
				baseOid: featureBefore.baseOid
			})
		} as Parameters<typeof INLINE_EDIT_POST>[0]);

		expect(developerFeatureEdit.status).toBe(200);

		const developerMainEdit = await INLINE_EDIT_POST({
			params: { repoId },
			request: makeInlineEditRequest(repoId, actorHeaders('developer'), {
				branch: 'main',
				filePath: 'README.md',
				content: 'developer edit on main\n',
				message: 'should fail'
			})
		} as Parameters<typeof INLINE_EDIT_POST>[0]);

		expect(developerMainEdit.status).toBe(403);

		const uploadPackRefs = await SMART_HTTP_GET({
			params: { repoId, gitPath: 'info/refs' },
			request: new Request(
				`http://localhost/api/repos/${repoId}/smart-http/info/refs?service=git-upload-pack`,
				{ method: 'GET' }
			)
		} as Parameters<typeof SMART_HTTP_GET>[0]);

		expect(uploadPackRefs.status).toBe(200);
		expect(uploadPackRefs.headers.get('content-type')).toContain('application/x-git-upload-pack-advertisement');
		await expect(uploadPackRefs.text()).resolves.toContain('git-upload-pack');

		const deniedReceivePackRefs = await SMART_HTTP_GET({
			params: { repoId, gitPath: 'info/refs' },
			request: new Request(
				`http://localhost/api/repos/${repoId}/smart-http/info/refs?service=git-receive-pack`,
				{ method: 'GET' }
			)
		} as Parameters<typeof SMART_HTTP_GET>[0]);

		expect(deniedReceivePackRefs.status).toBe(403);

		const allowedReceivePackRefs = await SMART_HTTP_GET({
			params: { repoId, gitPath: 'info/refs' },
			request: new Request(
				`http://localhost/api/repos/${repoId}/smart-http/info/refs?service=git-receive-pack`,
				{ method: 'GET', headers: actorHeaders('maintainer') }
			)
		} as Parameters<typeof SMART_HTTP_GET>[0]);

		expect(allowedReceivePackRefs.status).toBe(200);
		expect(allowedReceivePackRefs.headers.get('content-type')).toContain(
			'application/x-git-receive-pack-advertisement'
		);
		await expect(allowedReceivePackRefs.text()).resolves.toContain('git-receive-pack');

		const deniedReceivePackPost = await SMART_HTTP_POST({
			params: { repoId, gitPath: 'git-receive-pack' },
			request: new Request(`http://localhost/api/repos/${repoId}/smart-http/git-receive-pack`, {
				method: 'POST'
			})
		} as Parameters<typeof SMART_HTTP_POST>[0]);

		expect(deniedReceivePackPost.status).toBe(403);
	});
});
