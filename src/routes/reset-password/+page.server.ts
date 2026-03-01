import type { ServerLoad } from '@sveltejs/kit';
import { ensureAnonymousCsrfToken } from '$lib/server/auth/csrf';

export const load: ServerLoad = ({ cookies }) => {
	return {
		csrfToken: ensureAnonymousCsrfToken({ cookies })
	};
};
