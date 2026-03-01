import { generateResetToken } from './tokens';

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

export function generateCsrfToken(): string {
	return generateResetToken();
}

export function validateCsrfToken(token: string, session: { csrfToken: string }): boolean {
	if (!token || !session.csrfToken) {
		return false;
	}

	return constantTimeEqual(token, session.csrfToken);
}
