import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runGit } from './executable';
import { provisionRepository } from './provision';

const TEMP_PATHS: string[] = [];

async function createTempDir(prefix: string): Promise<string> {
	const path = await mkdtemp(join(tmpdir(), prefix));
	TEMP_PATHS.push(path);
	return path;
}

afterEach(async () => {
	delete process.env.YONA_DATA;
	await Promise.all(TEMP_PATHS.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe('repository provisioning', () => {
	it('creates a new bare repository when missing', async () => {
		const tempRoot = await createTempDir('yona-git-provision-');
		process.env.YONA_DATA = join(tempRoot, 'yona-data');

		const result = await provisionRepository('1001');

		expect(result.created).toBe(true);
		expect(result.repositoryPath.endsWith('/repo/1001')).toBe(true);

		const workPath = join(tempRoot, 'work');
		await runGit(['clone', result.repositoryPath, workPath], { cwd: tempRoot });
		await runGit(['status', '--porcelain=v1'], { cwd: workPath });
	});

	it('returns existing repository without recreating', async () => {
		const tempRoot = await createTempDir('yona-git-provision-existing-');
		process.env.YONA_DATA = join(tempRoot, 'yona-data');

		const first = await provisionRepository('1001');
		const second = await provisionRepository('1001');

		expect(first.created).toBe(true);
		expect(second.created).toBe(false);
		expect(second.repositoryPath).toBe(first.repositoryPath);
	});

	it('fails when existing path is not a git repository', async () => {
		const tempRoot = await createTempDir('yona-git-provision-invalid-');
		const yonaData = join(tempRoot, 'yona-data');
		process.env.YONA_DATA = yonaData;

		const repoPath = join(yonaData, 'repo', '1001');
		await mkdir(repoPath, { recursive: true });
		await writeFile(join(repoPath, 'not-a-repo.txt'), 'broken', 'utf-8');

		await expect(provisionRepository('1001')).rejects.toThrow('not a valid git repository');
	});
});
