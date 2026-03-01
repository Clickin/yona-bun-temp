import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { getYonaDataRoot } from '$lib/server/git/config';

export interface AuthAuditRecord {
	action: 'register' | 'login' | 'logout' | 'reset-password';
	outcome: 'success' | 'fail' | 'denied';
	ip: string;
	userAgent: string;
	targetEmail?: string;
	targetUserId?: number;
}

function getAuthAuditLogPath(): string {
	return join(getYonaDataRoot(), 'logs', 'auth-events.log');
}

export async function appendAuthAuditLog(record: AuthAuditRecord): Promise<void> {
	const logPath = getAuthAuditLogPath();
	const entry = `${JSON.stringify({ timestamp: new Date().toISOString(), ...record })}\n`;

	await mkdir(dirname(logPath), { recursive: true });
	await appendFile(logPath, entry, 'utf-8');
}
