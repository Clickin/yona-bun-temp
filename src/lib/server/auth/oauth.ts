const OAUTH_STATE_SIZE_BYTES = 32;
const PKCE_VERIFIER_SIZE_BYTES = 32;

const textEncoder = new TextEncoder();

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
