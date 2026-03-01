import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { readMutationActor } from '$lib/server/git/auth';
import { provisionRepository } from '$lib/server/git/provision';

export const POST: RequestHandler = async ({ params, request }) => {
	const actor = readMutationActor(request.headers);
	if (!actor) {
		return json({ error: 'Unauthorized: missing actor headers' }, { status: 401 });
	}

	if (!actor.canAdmin) {
		return json({ error: 'Forbidden: admin role required' }, { status: 403 });
	}

	const repoId = params.repoId;
	if (!repoId) {
		return json({ error: 'Missing repository id' }, { status: 400 });
	}

	try {
		const result = await provisionRepository(repoId);
		return json(result, { status: result.created ? 201 : 200 });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to provision repository';
		if (message.includes('Invalid repository id')) {
			return json({ error: message }, { status: 400 });
		}

		return json({ error: message }, { status: 500 });
	}
};
