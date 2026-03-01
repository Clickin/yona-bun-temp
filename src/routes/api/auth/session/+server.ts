import { eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { n4user } from '../../../../../drizzle/schema';
import { getDb } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.session) {
		return json({ session: null });
	}

	const [user] = await getDb()
		.select({
			email: n4user.email,
			id: n4user.id,
			loginId: n4user.loginId,
			name: n4user.name
		})
		.from(n4user)
		.where(eq(n4user.id, locals.session.userId))
		.limit(1);

	if (!user) {
		return json({ session: null });
	}

	return json({
		session: {
			csrfToken: locals.session.csrfToken,
			expiresAt: locals.session.expiresAt.toISOString(),
			userId: locals.session.userId
		},
		user
	});
};
