import type { RequestHandler } from '@sveltejs/kit';
import { forwardToApi } from '$lib/server/hono/forward-to-api';

export const GET: RequestHandler = (event) =>
	forwardToApi(
		event,
		'GET',
		`/api/repos/${event.params.repoId ?? ''}/smart-http/${event.params.gitPath ?? ''}`
	);
export const POST: RequestHandler = (event) =>
	forwardToApi(
		event,
		'POST',
		`/api/repos/${event.params.repoId ?? ''}/smart-http/${event.params.gitPath ?? ''}`
	);
