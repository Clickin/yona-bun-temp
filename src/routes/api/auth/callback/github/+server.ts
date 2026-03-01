import type { RequestHandler } from '@sveltejs/kit';
import { authApp } from '$lib/server/hono/auth-app';

export const GET: RequestHandler = (event) => authApp.fetch(event.request, { event });
