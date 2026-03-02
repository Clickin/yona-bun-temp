import type { RequestHandler } from '@sveltejs/kit';
import { forwardToApi } from '$lib/server/hono/forward-to-api';

export const POST: RequestHandler = (event) =>
	forwardToApi(event, 'POST', `/api/repos/${event.params.repoId ?? ''}/inline-edit`);
