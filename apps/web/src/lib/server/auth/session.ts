import { inMemorySessionStore, resetInMemorySessionStoreForTests } from '@yona/infra';
import { generateCsrfToken } from './csrf';
import { generateResetToken, hashToken } from './tokens';

const DEFAULT_COOKIE_NAME = 'yona_session';
const DEFAULT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const SESSION_COOKIE_PATH = '/';

export interface SessionCookieOptions {
	httpOnly: true;
	maxAge: number;
	path: string;
	sameSite: 'lax';
	secure: boolean;
}

export interface SessionCookieOptionInput {
	cookieSecure?: string;
	maxAge?: string;
	nodeEnv?: string;
}

export interface SessionRecord {
	csrfToken: string;
	expiresAt: Date;
	userId: number;
}

export interface CreateSessionInput {
	ipAddress?: string;
	now?: Date;
	userAgent?: string;
	userId: number;
}

export interface CreatedSession {
	csrfToken: string;
	expiresAt: Date;
	token: string;
	userId: number;
}

function parseBooleanFlag(value: string | undefined): boolean | undefined {
	if (value === undefined) {
		return undefined;
	}

	return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function __resetSessionStoreForTests(): void {
	resetInMemorySessionStoreForTests();
}

export function getSessionCookieName(cookieName = process.env.AUTH_SESSION_COOKIE_NAME): string {
	if (cookieName && cookieName.trim().length > 0) {
		return cookieName.trim();
	}

	return DEFAULT_COOKIE_NAME;
}

export function getSessionCookieMaxAge(maxAge = process.env.AUTH_SESSION_COOKIE_MAX_AGE): number {
	const parsed = Number.parseInt(maxAge ?? '', 10);
	if (Number.isFinite(parsed) && parsed > 0) {
		return parsed;
	}

	return DEFAULT_COOKIE_MAX_AGE_SECONDS;
}

export function getSessionCookieOptions(input: SessionCookieOptionInput = {}): SessionCookieOptions {
	const maxAge = getSessionCookieMaxAge(input.maxAge);
	const secureFromEnv = parseBooleanFlag(input.cookieSecure ?? process.env.AUTH_SESSION_COOKIE_SECURE);
	const nodeEnv = input.nodeEnv ?? process.env.NODE_ENV;

	return {
		httpOnly: true,
		maxAge,
		path: SESSION_COOKIE_PATH,
		sameSite: 'lax',
		secure: secureFromEnv ?? nodeEnv === 'production'
	};
}

export async function hashSessionToken(token: string): Promise<string> {
	return hashToken(token);
}

export async function createSession(input: CreateSessionInput): Promise<CreatedSession> {
	const now = input.now ?? new Date();
	const token = generateResetToken();
	const tokenHash = await hashSessionToken(token);
	const csrfToken = generateCsrfToken();
	const expiresAt = new Date(now.getTime() + getSessionCookieMaxAge() * 1000);

	await inMemorySessionStore.create({
		createdAt: now,
		csrfToken,
		expiresAt,
		tokenHash,
		userId: input.userId
	});

	return {
		csrfToken,
		expiresAt,
		token,
		userId: input.userId
	};
}

export async function getSessionByToken(token: string, now = new Date()): Promise<SessionRecord | null> {
	const tokenHash = await hashSessionToken(token);
	return inMemorySessionStore.getByTokenHash(tokenHash, now);
}

export async function deleteSessionByToken(token: string): Promise<void> {
	const tokenHash = await hashSessionToken(token);
	await inMemorySessionStore.deleteByTokenHash(tokenHash);
}

export async function deleteAllSessionsByUserId(userId: number): Promise<void> {
	await inMemorySessionStore.deleteAllByUserId(userId);
}
