import type { RequestHandler } from '@sveltejs/kit';
import { handleSmartHttpRequest } from '$lib/server/git/http-backend';

function getPathInfo(repoId: string, gitPath: string): string {
	const cleanedPath = gitPath.replace(/^\/+/, '');
	return `/${repoId}/${cleanedPath}`;
}

export const GET: RequestHandler = async ({ params, request }) => {
	const repoId = params.repoId;
	const gitPath = params.gitPath;

	if (!repoId || !gitPath) {
		return new Response('Not Found', { status: 404 });
	}

	return handleSmartHttpRequest({
		repositoryId: repoId,
		pathInfo: getPathInfo(repoId, gitPath),
		request
	});
};

export const POST: RequestHandler = async ({ params, request }) => {
	const repoId = params.repoId;
	const gitPath = params.gitPath;

	if (!repoId || !gitPath) {
		return new Response('Not Found', { status: 404 });
	}

	return handleSmartHttpRequest({
		repositoryId: repoId,
		pathInfo: getPathInfo(repoId, gitPath),
		request
	});
};
