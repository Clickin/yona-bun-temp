import { access } from 'node:fs/promises';
import { ensureYonaDataDirectories, getRepositoryRoot } from './config';
import { initBareRepository, resolveRepositoryPath, runGit } from './executable';

async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function assertGitRepository(path: string): Promise<void> {
	try {
		await runGit(['rev-parse', '--git-dir'], { cwd: path });
	} catch {
		throw new Error(`Existing path is not a valid git repository: ${path}`);
	}
}

export interface ProvisionRepositoryResult {
	repositoryId: string;
	repositoryPath: string;
	created: boolean;
}

export async function provisionRepository(repositoryId: string): Promise<ProvisionRepositoryResult> {
	await ensureYonaDataDirectories();

	const repositoryPath = resolveRepositoryPath(getRepositoryRoot(), repositoryId);
	const exists = await pathExists(repositoryPath);

	if (!exists) {
		await initBareRepository(repositoryPath);
		return {
			repositoryId,
			repositoryPath,
			created: true
		};
	}

	await assertGitRepository(repositoryPath);

	return {
		repositoryId,
		repositoryPath,
		created: false
	};
}
