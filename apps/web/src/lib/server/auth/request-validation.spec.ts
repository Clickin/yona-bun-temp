import { describe, expect, it } from 'vitest';
import { getClientIp, hasValidSameOrigin, readAuthPayload } from './request-validation';

describe('request-validation', () => {
	describe('hasValidSameOrigin', () => {
		it('returns false when host header mismatches request host', () => {
			const request = new Request('https://example.com/api/auth/login', {
				headers: { host: 'evil.com' }
			});

			expect(hasValidSameOrigin(request)).toBe(false);
		});

		it('returns false when origin header is malformed', () => {
			const request = new Request('https://example.com/api/auth/login', {
				headers: { origin: 'not-a-valid-origin' }
			});

			expect(hasValidSameOrigin(request)).toBe(false);
		});

		it('returns false when origin differs from request origin', () => {
			const request = new Request('https://example.com/api/auth/login', {
				headers: { origin: 'https://another.example.com' }
			});

			expect(hasValidSameOrigin(request)).toBe(false);
		});

		it('returns true when host and origin match', () => {
			const request = new Request('https://example.com/api/auth/login', {
				headers: {
					host: 'example.com',
					origin: 'https://example.com'
				}
			});

			expect(hasValidSameOrigin(request)).toBe(true);
		});
	});

	describe('getClientIp', () => {
		it('prefers first forwarded ip when present', () => {
			const request = new Request('http://localhost', {
				headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.2' }
			});

			expect(getClientIp(request)).toBe('203.0.113.1');
		});

		it('falls back to x-real-ip then fallback ip then unknown', () => {
			const requestWithRealIp = new Request('http://localhost', {
				headers: { 'x-forwarded-for': '   ', 'x-real-ip': '198.51.100.10' }
			});
			expect(getClientIp(requestWithRealIp, '127.0.0.1')).toBe('198.51.100.10');

			const requestWithFallback = new Request('http://localhost', {
				headers: { 'x-forwarded-for': '   ', 'x-real-ip': '   ' }
			});
			expect(getClientIp(requestWithFallback, '127.0.0.1')).toBe('127.0.0.1');

			const requestUnknown = new Request('http://localhost');
			expect(getClientIp(requestUnknown)).toBe('unknown');
		});
	});

	describe('readAuthPayload', () => {
		it('returns error for invalid JSON body', async () => {
			const request = new Request('http://localhost/api/auth/login', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: '{'
			});

			await expect(readAuthPayload(request)).resolves.toEqual({ error: 'Invalid JSON body' });
		});

		it('returns error for non-object payload', async () => {
			const request = new Request('http://localhost/api/auth/login', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: '"invalid"'
			});

			await expect(readAuthPayload(request)).resolves.toEqual({ error: 'Invalid request payload' });
		});

		it('returns format errors for invalid email and password', async () => {
			const invalidEmailRequest = new Request('http://localhost/api/auth/login', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email: 'invalid', password: 'password123' })
			});
			await expect(readAuthPayload(invalidEmailRequest)).resolves.toEqual({
				error: 'Invalid email or password format'
			});

			const shortPasswordRequest = new Request('http://localhost/api/auth/login', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email: 'user@example.com', password: 'short' })
			});
			await expect(readAuthPayload(shortPasswordRequest)).resolves.toEqual({
				error: 'Invalid email or password format'
			});
		});

		it('returns invalid payload error for non-string name', async () => {
			const request = new Request('http://localhost/api/auth/register', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email: 'user@example.com', password: 'password123', name: 123 })
			});

			await expect(readAuthPayload(request)).resolves.toEqual({ error: 'Invalid request payload' });
		});

		it('normalizes valid payload fields', async () => {
			const longName = `${'x'.repeat(260)}   `;
			const request = new Request('http://localhost/api/auth/register', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					email: ' User@Example.com ',
					password: 'password123',
					name: longName
				})
			});

			const result = await readAuthPayload(request);
			expect(result.error).toBeUndefined();
			expect(result.payload).toEqual({
				email: 'user@example.com',
				password: 'password123',
				name: 'x'.repeat(255)
			});
		});

		it('drops empty trimmed name to undefined', async () => {
			const request = new Request('http://localhost/api/auth/register', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					email: 'user@example.com',
					password: 'password123',
					name: '   '
				})
			});

			await expect(readAuthPayload(request)).resolves.toEqual({
				payload: {
					email: 'user@example.com',
					password: 'password123',
					name: undefined
				}
			});
		});
	});
});
