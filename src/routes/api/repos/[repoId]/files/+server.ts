import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { ensureYonaDataDirectories, getRepositoryRoot } from '$lib/server/git/config';
import { resolveRepositoryPath } from '$lib/server/git/executable';
import { readRepositoryFile } from '$lib/server/git/mutation';

export const GET: RequestHandler = async ({ params, url }) => {
	const repoId = params.repoId;
	const branch = url.searchParams.get('branch')?.trim();
	const filePath = url.searchParams.get('path')?.trim();

	if (!repoId || !branch || !filePath) {
		return json(
			{ error: 'repoId, branch, and path query parameters are required' },
			{ status: 400 }
		);
	}

	await ensureYonaDataDirectories();

	try {
		const repoPath = resolveRepositoryPath(getRepositoryRoot(), repoId);
		const result = await readRepositoryFile({ repoPath, branch, filePath });

		return json({
			repositoryId: repoId,
			branch,
			filePath,
			baseOid: result.oid,
			content: result.content
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to read file';
		if (
			message.includes('Invalid repository id') ||
			message.includes('Invalid file path') ||
			message.includes('Repository path escapes root')
		) {
			return json({ error: message }, { status: 400 });
		}

		if (message.includes('ENOENT') || message.includes('not found')) {
			return json({ error: message }, { status: 404 });
		}

		return json({ error: message }, { status: 500 });
	}
};
