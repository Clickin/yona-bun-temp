import { describe, expect, it } from 'vitest';
import { generateCsrfToken, validateCsrfToken } from './csrf';

describe('csrf helpers', () => {
	it('generates URL-safe csrf tokens', () => {
		const token = generateCsrfToken();

		expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(token.length).toBeGreaterThanOrEqual(43);
	});

	it('validates matching token and rejects mismatches', () => {
		const csrfToken = generateCsrfToken();

		expect(validateCsrfToken(csrfToken, { csrfToken })).toBe(true);
		expect(validateCsrfToken(`${csrfToken}-tampered`, { csrfToken })).toBe(false);
		expect(validateCsrfToken('', { csrfToken })).toBe(false);
	});
});
