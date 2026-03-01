import type { RequestHandler } from '@sveltejs/kit';
import { authApp } from '$lib/server/hono/auth-app';

export const GET: RequestHandler = (event) =>
	authApp.fetch(event.request ?? new Request('http://localhost/api/auth/github'), { event });
