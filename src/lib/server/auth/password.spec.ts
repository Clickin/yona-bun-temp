import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password utilities', () => {
	it('produces deterministic hashes for the same password and salt', async () => {
		const password = 'correct horse battery staple';
		const salt = 'user-123-salt';

		const firstHash = await hashPassword(password, salt);
		const secondHash = await hashPassword(password, salt);

		expect(firstHash).toBe(secondHash);
		expect(firstHash).toMatch(/^[a-f0-9]{64}$/);
	});

	it('verifies valid password and rejects invalid password', async () => {
		const salt = 'session-bound-salt';
		const hash = await hashPassword('sup3r-secret', salt);

		expect(await verifyPassword('sup3r-secret', hash, salt)).toBe(true);
		expect(await verifyPassword('wrong-password', hash, salt)).toBe(false);
	});
});
