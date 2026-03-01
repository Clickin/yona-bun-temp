import { compare, hash } from 'bcryptjs';

const BCRYPT_COST_FACTOR = 12;

function buildPasswordInput(password: string, salt: string): string {
	return `${password}:${salt}`;
}

export async function hashPassword(password: string, salt: string): Promise<string> {
	return hash(buildPasswordInput(password, salt), BCRYPT_COST_FACTOR);
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
	return compare(buildPasswordInput(password, salt), hash);
}
