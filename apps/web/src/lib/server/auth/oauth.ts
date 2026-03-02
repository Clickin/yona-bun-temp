const OAUTH_STATE_SIZE_BYTES = 32;
const PKCE_VERIFIER_SIZE_BYTES = 32;

const GITHUB_TOKEN_ENDPOINT = 'https://github.com/login/oauth/access_token';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

const OAUTH_PROVIDER_CONFIG = {
	github: {
		clientIdEnv: 'GITHUB_CLIENT_ID',
		clientSecretEnv: 'GITHUB_CLIENT_SECRET',
		tokenEndpointDefault: GITHUB_TOKEN_ENDPOINT,
		tokenEndpointEnv: 'GITHUB_TOKEN_ENDPOINT'
	},
	google: {
		clientIdEnv: 'GOOGLE_CLIENT_ID',
		clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
		tokenEndpointDefault: GOOGLE_TOKEN_ENDPOINT,
		tokenEndpointEnv: 'GOOGLE_TOKEN_ENDPOINT'
	}
} as const;

const textEncoder = new TextEncoder();

type OAuthProviderConfig = (typeof OAUTH_PROVIDER_CONFIG)[keyof typeof OAUTH_PROVIDER_CONFIG];

export type OAuthProvider = keyof typeof OAUTH_PROVIDER_CONFIG;

export interface OAuthTokenExchangeResult {
	accessToken: string;
	expiresIn: number | null;
	scope: string | null;
}

function readRequiredEnv(name: string): string {
	const value = process.env[name];
	if (!value || value.trim().length === 0) {
		throw new Error(`${name} is required for OAuth token exchange`);
	}

	return value;
}

function getProviderConfig(provider: string): OAuthProviderConfig {
	const config = OAUTH_PROVIDER_CONFIG[provider as OAuthProvider];
	if (!config) {
		throw new Error(`Unsupported OAuth provider: ${provider}`);
	}

	return config;
}

function getTokenEndpoint(config: OAuthProviderConfig): string {
	const configured = process.env[config.tokenEndpointEnv];
	if (!configured || configured.trim().length === 0) {
		return config.tokenEndpointDefault;
	}

	try {
		return new URL(configured).toString();
	} catch {
		throw new Error(`Invalid OAuth token endpoint: ${config.tokenEndpointEnv}`);
	}
}

function parseExpiresIn(raw: unknown): number | null {
	if (typeof raw === 'number' && Number.isFinite(raw)) {
		return raw;
	}

	if (typeof raw === 'string' && raw.length > 0) {
		const parsed = Number(raw);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}

	return null;
}

async function parseTokenPayload(response: Response): Promise<Record<string, unknown>> {
	const rawBody = await response.text();
	if (rawBody.length === 0) {
		return {};
	}

	const contentType = response.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		return JSON.parse(rawBody) as Record<string, unknown>;
	}

	const params = new URLSearchParams(rawBody);
	const payload: Record<string, unknown> = {};
	for (const [key, value] of params.entries()) {
		payload[key] = value;
	}

	return payload;
}

function toBase64Url(buffer: ArrayBuffer | Uint8Array): string {
	const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
	let binary = '';

	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function constantTimeEqual(left: string, right: string): boolean {
	if (left.length !== right.length) {
		return false;
	}

	let mismatch = 0;

	for (let index = 0; index < left.length; index += 1) {
		mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
	}

	return mismatch === 0;
}

export function generateOAuthState(): string {
	const randomBytes = crypto.getRandomValues(new Uint8Array(OAUTH_STATE_SIZE_BYTES));
	return toBase64Url(randomBytes);
}

export function validateOAuthState(state: string, storedState: string): boolean {
	return constantTimeEqual(state, storedState);
}

export async function generatePKCEVerifier(): Promise<{ verifier: string; challenge: string }> {
	const randomBytes = crypto.getRandomValues(new Uint8Array(PKCE_VERIFIER_SIZE_BYTES));
	const verifier = toBase64Url(randomBytes);
	const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(verifier));

	return {
		verifier,
		challenge: toBase64Url(digest)
	};
}

export async function validatePKCEChallenge(verifier: string, challenge: string): Promise<boolean> {
	const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(verifier));
	const candidateChallenge = toBase64Url(digest);
	return constantTimeEqual(candidateChallenge, challenge);
}

export async function exchangeCodeForToken(
	provider: string,
	code: string,
	redirectUri: string
): Promise<OAuthTokenExchangeResult> {
	if (!code || code.trim().length === 0) {
		throw new Error('OAuth authorization code is required');
	}

	if (!redirectUri || redirectUri.trim().length === 0) {
		throw new Error('OAuth redirect URI is required');
	}

	const config = getProviderConfig(provider);
	const response = await fetch(getTokenEndpoint(config), {
		body: new URLSearchParams({
			client_id: readRequiredEnv(config.clientIdEnv),
			client_secret: readRequiredEnv(config.clientSecretEnv),
			code,
			grant_type: 'authorization_code',
			redirect_uri: redirectUri
		}),
		headers: {
			accept: 'application/json',
			'content-type': 'application/x-www-form-urlencoded'
		},
		method: 'POST'
	});

	if (!response.ok) {
		throw new Error(`OAuth token exchange failed for ${provider}: HTTP ${response.status}`);
	}

	let payload: Record<string, unknown>;
	try {
		payload = await parseTokenPayload(response);
	} catch {
		throw new Error(`OAuth token exchange failed for ${provider}: invalid token response`);
	}

	const accessToken = payload.access_token;
	if (typeof accessToken !== 'string' || accessToken.length === 0) {
		throw new Error(`OAuth token exchange failed for ${provider}: missing access_token`);
	}

	const scope = payload.scope;

	return {
		accessToken,
		expiresIn: parseExpiresIn(payload.expires_in),
		scope: typeof scope === 'string' && scope.length > 0 ? scope : null
	};
}
