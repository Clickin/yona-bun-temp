import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { readMutationActor } from '$lib/server/git/auth';
import { ensureYonaDataDirectories, getRepositoryRoot } from '$lib/server/git/config';
import { resolveRepositoryPath } from '$lib/server/git/executable';
import { AuthorizationError, ConflictError, performInlineEditMutation } from '$lib/server/git/mutation';

interface InlineEditRequestBody {
	branch?: string;
	filePath?: string;
	content?: string;
	message?: string;
	baseOid?: string;
}

function validateInlineEditBody(body: InlineEditRequestBody): string | null {
	if (!body.branch || !body.filePath || body.content === undefined || !body.message) {
		return 'branch, filePath, content, and message are required';
	}

	if (body.message.trim().length === 0) {
		return 'message cannot be empty';
	}

	return null;
}

export const POST: RequestHandler = async ({ params, request }) => {
	const actor = readMutationActor(request.headers);
	if (!actor) {
		return json({ error: 'Unauthorized: missing actor headers' }, { status: 401 });
	}

	const repoId = params.repoId;
	if (!repoId) {
		return json({ error: 'Missing repository id' }, { status: 400 });
	}

	let body: InlineEditRequestBody;
	try {
		body = (await request.json()) as InlineEditRequestBody;
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const validationError = validateInlineEditBody(body);
	if (validationError) {
		return json({ error: validationError }, { status: 400 });
	}

	await ensureYonaDataDirectories();

	try {
		const repoPath = resolveRepositoryPath(getRepositoryRoot(), repoId);
		const result = await performInlineEditMutation({
			repositoryId: repoId,
			repoPath,
			branch: body.branch ?? '',
			filePath: body.filePath ?? '',
			content: body.content ?? '',
			message: body.message ?? '',
			baseOid: body.baseOid,
			actor,
			requestId: request.headers.get('x-request-id') ?? undefined
		});

		return json({
			requestId: result.requestId,
			repositoryId: repoId,
			branch: body.branch,
			filePath: body.filePath,
			commit: result.commit
		});
	} catch (error) {
		if (error instanceof AuthorizationError) {
			return json({ error: error.message }, { status: 403 });
		}

		if (error instanceof ConflictError) {
			return json(
				{
					error: 'Conflict: branch moved since baseOid',
					expectedOid: error.expectedOid,
					actualOid: error.actualOid
				},
				{ status: 409 }
			);
		}

		const message = error instanceof Error ? error.message : 'Failed to perform inline edit';
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
