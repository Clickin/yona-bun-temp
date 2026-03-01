import { randomUUID } from 'node:crypto';
import { appendGitMutationAuditLog } from './audit';
import type { MutationActor } from './auth';
import { getGitAuditLogPath } from './config';
import { GitCommandError } from './errors';
import { createInlineEditCommit, getRefOid, readFileAtRef } from './executable';
import { withRepositoryWriteLock } from './locks';
import { canDirectWriteBranch } from './policy';
import type { InlineEditCommitResult } from './types';

export class AuthorizationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AuthorizationError';
	}
}

export class ConflictError extends Error {
	public readonly expectedOid: string;
	public readonly actualOid: string;

	constructor(expectedOid: string, actualOid: string) {
		super(`Reference moved (expected ${expectedOid}, actual ${actualOid})`);
		this.name = 'ConflictError';
		this.expectedOid = expectedOid;
		this.actualOid = actualOid;
	}
}

export interface InlineEditMutationInput {
	repositoryId: string;
	repoPath: string;
	branch: string;
	filePath: string;
	content: string;
	message: string;
	baseOid?: string;
	actor: MutationActor;
	requestId?: string;
}

export interface InlineEditMutationResult {
	requestId: string;
	commit: InlineEditCommitResult;
}

export async function readRepositoryFile(params: {
	repoPath: string;
	branch: string;
	filePath: string;
}): Promise<{ content: string; oid: string }> {
	const refName = `refs/heads/${params.branch}`;
	const oid = await getRefOid(params.repoPath, refName);
	const content = await readFileAtRef(params.repoPath, refName, params.filePath);

	return { content, oid };
}

function isUpdateRefConflict(error: unknown): boolean {
	if (!(error instanceof GitCommandError)) {
		return false;
	}

	const commandText = error.command.join(' ');
	if (!commandText.includes(' update-ref ')) {
		return false;
	}

	const stderr = error.stderr.toLowerCase();
	return stderr.includes('cannot lock ref') || stderr.includes('failed to update ref');
}

export async function performInlineEditMutation(
	input: InlineEditMutationInput
): Promise<InlineEditMutationResult> {
	if (!canDirectWriteBranch(input.branch, input.actor)) {
		throw new AuthorizationError(`Direct write denied for protected branch: ${input.branch}`);
	}

	const requestId = input.requestId ?? randomUUID();
	const refName = `refs/heads/${input.branch}`;

	return withRepositoryWriteLock(input.repoPath, async () => {
		const headOid = await getRefOid(input.repoPath, refName);

		if (input.baseOid && input.baseOid !== headOid) {
			await appendGitMutationAuditLog(getGitAuditLogPath(), {
				timestamp: new Date().toISOString(),
				requestId,
				action: 'inline-edit-conflict',
				repositoryId: input.repositoryId,
				branch: input.branch,
				filePath: input.filePath,
				actorId: input.actor.id,
				actorName: input.actor.name,
				actorEmail: input.actor.email,
				actorIp: input.actor.ipAddress,
				oldOid: input.baseOid,
				message: input.message
			});

			throw new ConflictError(input.baseOid, headOid);
		}

		try {
			const commit = await createInlineEditCommit({
				repoPath: input.repoPath,
				branch: input.branch,
				filePath: input.filePath,
				content: input.content,
				message: input.message,
				authorName: input.actor.name,
				authorEmail: input.actor.email,
				committerName: input.actor.name,
				committerEmail: input.actor.email,
				expectedOldOid: input.baseOid ?? headOid
			});

			await appendGitMutationAuditLog(getGitAuditLogPath(), {
				timestamp: new Date().toISOString(),
				requestId,
				action: 'inline-edit-commit',
				repositoryId: input.repositoryId,
				branch: input.branch,
				filePath: input.filePath,
				actorId: input.actor.id,
				actorName: input.actor.name,
				actorEmail: input.actor.email,
				actorIp: input.actor.ipAddress,
				oldOid: commit.oldOid,
				newOid: commit.newOid,
				message: input.message
			});

			return { requestId, commit };
		} catch (error) {
			if (isUpdateRefConflict(error)) {
				const actualOid = await getRefOid(input.repoPath, refName);
				throw new ConflictError(input.baseOid ?? headOid, actualOid);
			}

			throw error;
		}
	});
}
