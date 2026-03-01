import type { RequestHandler } from '@sveltejs/kit';
import { authApp } from '$lib/server/hono/auth-app';

export const POST: RequestHandler = (event) => authApp.fetch(event.request, { event });
