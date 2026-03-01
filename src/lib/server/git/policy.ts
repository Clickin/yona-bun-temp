import type { MutationActor } from './auth';

const DEFAULT_PROTECTED_BRANCHES = ['main', 'master'] as const;
const DEFAULT_PROTECTED_BRANCH_WRITE_ROLES = ['admin', 'maintainer'] as const;
const DEFAULT_UNPROTECTED_BRANCH_WRITE_ROLES = ['admin', 'maintainer', 'developer'] as const;

function parseList(value: string | undefined): string[] {
	if (!value) {
		return [...DEFAULT_PROTECTED_BRANCHES];
	}

	return value
		.split(',')
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
}

export function getProtectedBranches(): Set<string> {
	return new Set(parseList(process.env.YONA_PROTECTED_BRANCHES));
}

export function getProtectedBranchWriteRoles(): Set<string> {
	return new Set(parseList(process.env.YONA_PROTECTED_BRANCH_WRITE_ROLES ?? DEFAULT_PROTECTED_BRANCH_WRITE_ROLES.join(',')));
}

export function getUnprotectedBranchWriteRoles(): Set<string> {
	return new Set(
		parseList(process.env.YONA_UNPROTECTED_BRANCH_WRITE_ROLES ?? DEFAULT_UNPROTECTED_BRANCH_WRITE_ROLES.join(','))
	);
}

export function isProtectedBranch(branch: string): boolean {
	return getProtectedBranches().has(branch);
}

export function canDirectWriteBranch(branch: string, actor: MutationActor): boolean {
	if (actor.canAdmin || actor.canDirectWrite) {
		return true;
	}

	if (isProtectedBranch(branch)) {
		return getProtectedBranchWriteRoles().has(actor.role);
	}

	return getUnprotectedBranchWriteRoles().has(actor.role);
}
