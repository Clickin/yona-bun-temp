import type { RequestHandler } from '@sveltejs/kit';
import { forwardToApi } from '$lib/server/hono/forward-to-api';

export const GET: RequestHandler = (event) =>
	forwardToApi(event, 'GET', '/api/auth/session');
