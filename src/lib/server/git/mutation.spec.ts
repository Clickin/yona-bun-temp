import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { MutationActor } from './auth';
import { createInlineEditCommit, getRefOid, initBareRepository, readFileAtRef, runGit } from './executable';
import { AuthorizationError, ConflictError, performInlineEditMutation } from './mutation';

const TEMP_PATHS: string[] = [];

async function createTempDir(prefix: string): Promise<string> {
	const path = await mkdtemp(join(tmpdir(), prefix));
	TEMP_PATHS.push(path);
	return path;
}

async function setupBareRepositoryWithMain(): Promise<{ tempRoot: string; barePath: string }> {
	const tempRoot = await createTempDir('yona-git-mutation-test-');
	const repoRoot = join(tempRoot, 'repo-root');
	const barePath = join(repoRoot, '1001');

	await mkdir(repoRoot, { recursive: true });
	await initBareRepository(barePath);

	const workPath = join(tempRoot, 'work');
	await runGit(['clone', barePath, workPath], { cwd: tempRoot });
	await runGit(['config', 'user.name', 'Seed User'], { cwd: workPath });
	await runGit(['config', 'user.email', 'seed@example.com'], { cwd: workPath });
	await writeFile(join(workPath, 'README.md'), 'initial\n', 'utf-8');
	await runGit(['add', 'README.md'], { cwd: workPath });
	await runGit(['commit', '-m', 'initial commit'], { cwd: workPath });
	await runGit(['checkout', '-B', 'main'], { cwd: workPath });
	await runGit(['push', '-u', 'origin', 'main'], { cwd: workPath });

	return { tempRoot, barePath };
}

function actor(overrides: Partial<MutationActor> = {}): MutationActor {
	return {
		id: 'u-1',
		name: 'Web Editor',
		email: 'editor@example.com',
		role: 'developer',
		canDirectWrite: false,
		canAdmin: false,
		ipAddress: '127.0.0.1',
		...overrides
	};
}

afterEach(async () => {
	delete process.env.YONA_DATA;
	delete process.env.YONA_PROTECTED_BRANCHES;
	await Promise.all(TEMP_PATHS.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe('inline edit mutation (Yona intent)', () => {
	it('denies direct write on protected branch for unauthorized actor', async () => {
		const { tempRoot, barePath } = await setupBareRepositoryWithMain();
		process.env.YONA_DATA = join(tempRoot, 'yona-data');

		await expect(
			performInlineEditMutation({
				repositoryId: '1001',
				repoPath: barePath,
				branch: 'main',
				filePath: 'README.md',
				content: 'blocked write\n',
				message: 'attempt protected write',
				actor: actor({ canDirectWrite: false })
			})
		).rejects.toBeInstanceOf(AuthorizationError);
	});

	it('returns conflict when baseOid is stale', async () => {
		const { tempRoot, barePath } = await setupBareRepositoryWithMain();
		process.env.YONA_DATA = join(tempRoot, 'yona-data');

		const staleOid = await getRefOid(barePath, 'refs/heads/main');
		await createInlineEditCommit({
			repoPath: barePath,
			branch: 'main',
			filePath: 'README.md',
			content: 'someone else updated first\n',
			message: 'other commit',
			authorName: 'Other User',
			authorEmail: 'other@example.com',
			expectedOldOid: staleOid
		});

		await expect(
			performInlineEditMutation({
				repositoryId: '1001',
				repoPath: barePath,
				branch: 'main',
				filePath: 'README.md',
				content: 'my stale edit\n',
				message: 'stale edit',
				baseOid: staleOid,
				actor: actor({ canDirectWrite: true })
			})
		).rejects.toBeInstanceOf(ConflictError);
	});

	it('creates commit and updates file when actor is allowed', async () => {
		const { tempRoot, barePath } = await setupBareRepositoryWithMain();
		process.env.YONA_DATA = join(tempRoot, 'yona-data');

		const baseOid = await getRefOid(barePath, 'refs/heads/main');
		const result = await performInlineEditMutation({
			repositoryId: '1001',
			repoPath: barePath,
			branch: 'main',
			filePath: 'README.md',
			content: 'updated by inline edit\n',
			message: 'inline edit commit',
			baseOid,
			actor: actor({ canDirectWrite: true })
		});

		expect(result.commit.oldOid).toBe(baseOid);
		expect(result.commit.newOid).not.toBe(baseOid);

		const stored = await readFileAtRef(barePath, 'refs/heads/main', 'README.md');
		expect(stored).toBe('updated by inline edit\n');
	});

	it('supports commitTextFile-style sequential edits across files (Yona CodeCommentThreadTest intent)', async () => {
		const { tempRoot, barePath } = await setupBareRepositoryWithMain();
		process.env.YONA_DATA = join(tempRoot, 'yona-data');

		const writeActor = actor({ canDirectWrite: true });

		const base = await getRefOid(barePath, 'refs/heads/main');
		const first = await performInlineEditMutation({
			repositoryId: '1001',
			repoPath: barePath,
			branch: 'main',
			filePath: 'a.txt',
			content: 'read me\n',
			message: 'base commit',
			baseOid: base,
			actor: writeActor
		});

		const second = await performInlineEditMutation({
			repositoryId: '1001',
			repoPath: barePath,
			branch: 'main',
			filePath: 'b.txt',
			content: 'world\n',
			message: 'commit 2',
			baseOid: first.commit.newOid,
			actor: writeActor
		});

		const third = await performInlineEditMutation({
			repositoryId: '1001',
			repoPath: barePath,
			branch: 'main',
			filePath: 'a.txt',
			content: 'HELLO\n',
			message: 'commit 3',
			baseOid: second.commit.newOid,
			actor: writeActor
		});

		expect(first.commit.newOid).not.toBe(base);
		expect(second.commit.newOid).not.toBe(first.commit.newOid);
		expect(third.commit.newOid).not.toBe(second.commit.newOid);

		const a = await readFileAtRef(barePath, 'refs/heads/main', 'a.txt');
		const b = await readFileAtRef(barePath, 'refs/heads/main', 'b.txt');
		expect(a).toBe('HELLO\n');
		expect(b).toBe('world\n');
	});
});
