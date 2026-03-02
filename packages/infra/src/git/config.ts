import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export function getYonaDataRoot(): string {
	return resolve(process.env.YONA_DATA ?? join(process.cwd(), '.yona-data'));
}

export function getRepositoryRoot(): string {
	return join(getYonaDataRoot(), 'repo');
}

export function getGitAuditLogPath(): string {
	return join(getYonaDataRoot(), 'logs', 'git-mutations.log');
}

export async function ensureYonaDataDirectories(): Promise<void> {
	await mkdir(getRepositoryRoot(), { recursive: true });
	await mkdir(join(getYonaDataRoot(), 'logs'), { recursive: true });
}
