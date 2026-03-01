const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

export interface AuthPayload {
	email: string;
	password: string;
	name?: string;
}

export function hasValidSameOrigin(request: Request): boolean {
	const requestUrl = new URL(request.url);
	const host = request.headers.get('host');
	const origin = request.headers.get('origin');

	if (host && host.trim().toLowerCase() !== requestUrl.host.toLowerCase()) {
		return false;
	}

	if (origin) {
		let originUrl: URL;

		try {
			originUrl = new URL(origin);
		} catch {
			return false;
		}

		if (originUrl.origin.toLowerCase() !== requestUrl.origin.toLowerCase()) {
			return false;
		}
	}

	return true;
}

export function getClientIp(request: Request, fallbackIp?: string): string {
	const forwardedFor = request.headers.get('x-forwarded-for');
	if (forwardedFor) {
		const [first] = forwardedFor.split(',');
		if (first && first.trim().length > 0) {
			return first.trim();
		}
	}

	const realIp = request.headers.get('x-real-ip');
	if (realIp && realIp.trim().length > 0) {
		return realIp.trim();
	}

	if (fallbackIp && fallbackIp.trim().length > 0) {
		return fallbackIp.trim();
	}

	return 'unknown';
}

function normalizeEmail(value: string): string {
	return value.trim().toLowerCase();
}

export async function readAuthPayload(request: Request): Promise<{ payload?: AuthPayload; error?: string }> {
	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return { error: 'Invalid JSON body' };
	}

	if (!body || typeof body !== 'object') {
		return { error: 'Invalid request payload' };
	}

	const email = typeof (body as { email?: unknown }).email === 'string' ? normalizeEmail((body as { email: string }).email) : '';
	const password = typeof (body as { password?: unknown }).password === 'string' ? (body as { password: string }).password : '';
	const nameRaw = (body as { name?: unknown }).name;

	if (!email || !EMAIL_PATTERN.test(email)) {
		return { error: 'Invalid email or password format' };
	}

	if (!password || password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
		return { error: 'Invalid email or password format' };
	}

	if (nameRaw !== undefined && typeof nameRaw !== 'string') {
		return { error: 'Invalid request payload' };
	}

	const name = typeof nameRaw === 'string' ? nameRaw.trim().slice(0, 255) : undefined;

	return {
		payload: {
			email,
			password,
			name: name && name.length > 0 ? name : undefined
		}
	};
}
