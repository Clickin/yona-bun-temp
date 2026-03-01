const HASH_ITERATIONS = 210_000;
const HASH_LENGTH_BYTES = 32;

const textEncoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let output = '';

	for (const byte of bytes) {
		output += byte.toString(16).padStart(2, '0');
	}

	return output;
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

export async function hashPassword(password: string, salt: string): Promise<string> {
	const passwordKey = await crypto.subtle.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, [
		'deriveBits'
	]);
	const bits = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			hash: 'SHA-256',
			salt: textEncoder.encode(salt),
			iterations: HASH_ITERATIONS
		},
		passwordKey,
		HASH_LENGTH_BYTES * 8
	);

	return toHex(bits);
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
	const candidateHash = await hashPassword(password, salt);
	return constantTimeEqual(candidateHash, hash);
}
