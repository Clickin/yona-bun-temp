import { access, appendFile, mkdir, rename, rm, stat } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface GitMutationAuditRecord {
	timestamp: string;
	requestId: string;
	action: 'inline-edit-commit' | 'inline-edit-conflict';
	repositoryId: string;
	branch: string;
	filePath: string;
	actorId: string;
	actorName: string;
	actorEmail: string;
	actorIp: string;
	oldOid: string;
	newOid?: string;
	message: string;
}

function getAuditMaxBytes(): number {
	const parsed = Number.parseInt(process.env.YONA_GIT_AUDIT_MAX_BYTES ?? '', 10);
	if (Number.isFinite(parsed) && parsed > 0) {
		return parsed;
	}

	return 5 * 1024 * 1024;
}

function getAuditMaxFiles(): number {
	const parsed = Number.parseInt(process.env.YONA_GIT_AUDIT_MAX_FILES ?? '', 10);
	if (Number.isFinite(parsed) && parsed >= 2) {
		return parsed;
	}

	return 3;
}

async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function rotateAuditIfNeeded(filePath: string, incomingLength: number): Promise<void> {
	if (!(await pathExists(filePath))) {
		return;
	}

	const maxBytes = getAuditMaxBytes();
	const maxFiles = getAuditMaxFiles();
	const fileStats = await stat(filePath);

	if (fileStats.size + incomingLength <= maxBytes) {
		return;
	}

	for (let index = maxFiles - 1; index >= 1; index -= 1) {
		const fromPath = index === 1 ? filePath : `${filePath}.${index - 1}`;
		const toPath = `${filePath}.${index}`;

		if (!(await pathExists(fromPath))) {
			continue;
		}

		await rm(toPath, { force: true });
		await rename(fromPath, toPath);
	}
}

export async function appendGitMutationAuditLog(
	filePath: string,
	record: GitMutationAuditRecord
): Promise<void> {
	const entry = `${JSON.stringify(record)}\n`;
	await mkdir(dirname(filePath), { recursive: true });
	await rotateAuditIfNeeded(filePath, Buffer.byteLength(entry, 'utf-8'));
	await appendFile(filePath, entry, 'utf-8');
}
