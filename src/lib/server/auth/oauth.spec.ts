import { describe, expect, it } from 'vitest';
import {
	generateOAuthState,
	generatePKCEVerifier,
	validateOAuthState,
	validatePKCEChallenge
} from './oauth';

describe('oauth utilities', () => {
	it('generates URL-safe random states', () => {
		const state = generateOAuthState();

		expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(state.length).toBeGreaterThanOrEqual(43);
	});

	it('generates 100 unique states', () => {
		const iterations = 100;
		const states = new Set<string>();

		for (let index = 0; index < iterations; index += 1) {
			states.add(generateOAuthState());
		}

		expect(states.size).toBe(iterations);
	});

	it('validates OAuth state using constant-time comparison', () => {
		const storedState = generateOAuthState();

		expect(validateOAuthState(storedState, storedState)).toBe(true);
		expect(validateOAuthState(`${storedState}x`, storedState)).toBe(false);
	});

	it('validates PKCE challenge for matching verifier/challenge pair', async () => {
		const { verifier, challenge } = await generatePKCEVerifier();

		expect(await validatePKCEChallenge(verifier, challenge)).toBe(true);
	});

	it('rejects tampered verifier and challenge pairs', async () => {
		const { verifier, challenge } = await generatePKCEVerifier();
		const replacement = challenge.endsWith('A') ? 'B' : 'A';
		const tamperedChallenge = `${challenge.slice(0, -1)}${replacement}`;

		expect(await validatePKCEChallenge(`${verifier}x`, challenge)).toBe(false);
		expect(await validatePKCEChallenge(verifier, tamperedChallenge)).toBe(false);
	});
});
