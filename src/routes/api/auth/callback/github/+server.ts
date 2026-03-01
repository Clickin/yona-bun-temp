import { and, eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { linkedAccount, n4user, userCredential } from '../../../../../../drizzle/schema';
import { getDb } from '$lib/server/db';
import { github } from '$lib/server/auth/oauth-providers';
import { createSession } from '$lib/server/auth/session';
import { setSessionCookie } from '$lib/server/auth/session-helper';

const GITHUB_PROVIDER_KEY = 'github';

interface GitHubProfile {
	avatar_url?: string;
	id?: number;
	login?: string;
	name?: string;
}

interface GitHubEmail {
	email?: string;
	primary?: boolean;
	verified?: boolean;
}

function clearOauthCookies(event: Parameters<RequestHandler>[0]): void {
	event.cookies.delete('yona_oauth_github_state', { path: '/' });
	event.cookies.delete('yona_oauth_github_verifier', { path: '/' });
}

function getAccessToken(tokens: unknown): string | null {
	if (typeof tokens !== 'object' || tokens === null) {
		return null;
	}

	const accessor = (tokens as { accessToken?: () => string }).accessToken;
	if (typeof accessor === 'function') {
		const token = accessor();
		return typeof token === 'string' && token.length > 0 ? token : null;
	}

	const rawToken = (tokens as { accessToken?: unknown }).accessToken;
	if (typeof rawToken === 'string' && rawToken.length > 0) {
		return rawToken;
	}

	return null;
}

async function fetchGitHubUser(accessToken: string): Promise<{ email: string; profile: GitHubProfile } | null> {
	const profileResponse = await fetch('https://api.github.com/user', {
		headers: {
			authorization: `Bearer ${accessToken}`,
			accept: 'application/vnd.github+json'
		}
	});

	if (!profileResponse.ok) {
		return null;
	}

	const profile = (await profileResponse.json()) as GitHubProfile;
	const emailsResponse = await fetch('https://api.github.com/user/emails', {
		headers: {
			authorization: `Bearer ${accessToken}`,
			accept: 'application/vnd.github+json'
		}
	});

	if (!emailsResponse.ok) {
		return null;
	}

	const emails = (await emailsResponse.json()) as GitHubEmail[];
	const selectedEmail =
		emails.find((entry) => entry.primary === true && entry.verified === true)?.email ??
		emails.find((entry) => entry.verified === true)?.email ??
		emails[0]?.email;

	if (!selectedEmail) {
		return null;
	}

	return {
		email: selectedEmail,
		profile
	};
}

async function findOrCreateCredential(userId: number, email: string, name: string): Promise<number> {
	const db = getDb();
	const [existingCredential] = await db
		.select({ id: userCredential.id })
		.from(userCredential)
		.where(eq(userCredential.userId, userId))
		.limit(1);

	if (existingCredential) {
		return existingCredential.id;
	}

	await db.insert(userCredential).values({
		active: true,
		email,
		emailValidated: true,
		loginId: email,
		name,
		userId
	});

	const [createdCredential] = await db
		.select({ id: userCredential.id })
		.from(userCredential)
		.where(eq(userCredential.userId, userId))
		.limit(1);

	if (!createdCredential) {
		throw new Error('Failed to create user credential');
	}

	return createdCredential.id;
}

async function findOrCreateUser(email: string, displayName: string): Promise<number> {
	const db = getDb();
	const [existingUser] = await db
		.select({ id: n4user.id })
		.from(n4user)
		.where(eq(n4user.loginId, email))
		.limit(1);

	if (existingUser) {
		return existingUser.id;
	}

	await db.insert(n4user).values({
		createdDate: new Date(),
		email,
		isGuest: false,
		loginId: email,
		name: displayName
	});

	const [createdUser] = await db
		.select({ id: n4user.id })
		.from(n4user)
		.where(eq(n4user.loginId, email))
		.limit(1);

	if (!createdUser) {
		throw new Error('Failed to create user');
	}

	return createdUser.id;
}

export const GET: RequestHandler = async (event) => {
	const state = event.url.searchParams.get('state');
	const code = event.url.searchParams.get('code');
	const storedState = event.cookies.get('yona_oauth_github_state');
	const codeVerifier = event.cookies.get('yona_oauth_github_verifier');

	if (!state || !code || !storedState || !codeVerifier || state !== storedState) {
		clearOauthCookies(event);
		return json({ error: 'Invalid OAuth callback' }, { status: 400 });
	}

	try {
		const tokens = await (
			github.validateAuthorizationCode as unknown as (authorizationCode: string, codeVerifier: string) => unknown
		)(code, codeVerifier);
		const accessToken = getAccessToken(tokens);

		if (!accessToken) {
			clearOauthCookies(event);
			return json({ error: 'Failed to exchange OAuth code' }, { status: 400 });
		}

		const githubUser = await fetchGitHubUser(accessToken);
		if (!githubUser || !githubUser.profile.id) {
			clearOauthCookies(event);
			return json({ error: 'Failed to load GitHub user' }, { status: 400 });
		}

		const providerUserId = String(githubUser.profile.id);
		const displayName = githubUser.profile.name ?? githubUser.profile.login ?? githubUser.email;
		const avatarUrl = githubUser.profile.avatar_url ?? null;

		const db = getDb();
		const [existingLinkedAccount] = await db
			.select({
				id: linkedAccount.id,
				userCredentialId: linkedAccount.userCredentialId
			})
			.from(linkedAccount)
			.where(
				and(
					eq(linkedAccount.providerKey, GITHUB_PROVIDER_KEY),
					eq(linkedAccount.providerUserId, providerUserId)
				)
			)
			.limit(1);

		let credentialId: number;

		if (existingLinkedAccount?.userCredentialId) {
			credentialId = existingLinkedAccount.userCredentialId;
			await db
				.update(linkedAccount)
				.set({ avatarUrl, providerDisplayName: displayName })
				.where(eq(linkedAccount.id, existingLinkedAccount.id));
		} else {
			const userId = await findOrCreateUser(githubUser.email, displayName);
			credentialId = await findOrCreateCredential(userId, githubUser.email, displayName);

			await db.insert(linkedAccount).values({
				avatarUrl,
				providerDisplayName: displayName,
				providerKey: GITHUB_PROVIDER_KEY,
				providerUserId,
				userCredentialId: credentialId
			});
		}

		const [credential] = await db
			.select({ userId: userCredential.userId })
			.from(userCredential)
			.where(eq(userCredential.id, credentialId))
			.limit(1);

		if (!credential?.userId) {
			clearOauthCookies(event);
			return json({ error: 'Failed to resolve account' }, { status: 500 });
		}

		const session = await createSession({
			ipAddress: event.getClientAddress(),
			userAgent: event.request.headers.get('user-agent') ?? 'unknown',
			userId: credential.userId
		});

		setSessionCookie(event, session.token);
		clearOauthCookies(event);

		return new Response(null, {
			headers: {
				location: '/'
			},
			status: 302
		});
	} catch {
		clearOauthCookies(event);
		return json({ error: 'Failed to authenticate with GitHub' }, { status: 500 });
	}
};
