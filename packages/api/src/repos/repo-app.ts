import { Hono } from "hono";
import {
  AuthorizationError,
  ConflictError,
  ensureYonaDataDirectories,
  handleSmartHttpRequest,
  performInlineEditMutation,
  provisionRepository,
  readMutationActor,
  readRepositoryFile,
  resolveRepositoryPath,
  getRepositoryRoot,
} from "@yona/infra";

interface InlineEditRequestBody {
  branch?: string;
  filePath?: string;
  content?: string;
  message?: string;
  baseOid?: string;
}

function validateInlineEditBody(body: InlineEditRequestBody): string | null {
  if (!body.branch || !body.filePath || body.content === undefined || !body.message) {
    return "branch, filePath, content, and message are required";
  }

  if (body.message.trim().length === 0) {
    return "message cannot be empty";
  }

  return null;
}

function getPathInfo(repoId: string, gitPath: string): string {
  const cleanedPath = gitPath.replace(/^\/+/, "");
  return `/${repoId}/${cleanedPath}`;
}

function resolveSmartHttpGitPath(
  path: string,
  repoId: string,
  routeParam: string | undefined,
): string | null {
  if (routeParam && routeParam.length > 0) {
    return routeParam;
  }

  const prefix = `/api/repos/${repoId}/smart-http/`;
  if (!path.startsWith(prefix)) {
    return null;
  }

  const fromPath = path.slice(prefix.length);
  return fromPath.length > 0 ? fromPath : null;
}

export const repoApp = new Hono();

repoApp.post("/api/repos/:repoId/bootstrap", async (c) => {
  const actor = readMutationActor(c.req.raw.headers);
  if (!actor) {
    return c.json({ error: "Unauthorized: missing actor headers" }, 401);
  }

  if (!actor.canAdmin) {
    return c.json({ error: "Forbidden: admin role required" }, 403);
  }

  const repoId = c.req.param("repoId");
  if (!repoId) {
    return c.json({ error: "Missing repository id" }, 400);
  }

  try {
    const result = await provisionRepository(repoId);
    return c.json(result, result.created ? 201 : 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to provision repository";
    if (message.includes("Invalid repository id")) {
      return c.json({ error: message }, 400);
    }

    return c.json({ error: message }, 500);
  }
});

repoApp.get("/api/repos/:repoId/files", async (c) => {
  const repoId = c.req.param("repoId");
  const branch = c.req.query("branch")?.trim();
  const filePath = c.req.query("path")?.trim();

  if (!repoId || !branch || !filePath) {
    return c.json({ error: "repoId, branch, and path query parameters are required" }, 400);
  }

  await ensureYonaDataDirectories();

  try {
    const repoPath = resolveRepositoryPath(getRepositoryRoot(), repoId);
    const result = await readRepositoryFile({ repoPath, branch, filePath });

    return c.json({
      repositoryId: repoId,
      branch,
      filePath,
      baseOid: result.oid,
      content: result.content,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read file";
    if (
      message.includes("Invalid repository id") ||
      message.includes("Invalid file path") ||
      message.includes("Repository path escapes root")
    ) {
      return c.json({ error: message }, 400);
    }

    if (message.includes("ENOENT") || message.includes("not found")) {
      return c.json({ error: message }, 404);
    }

    return c.json({ error: message }, 500);
  }
});

repoApp.post("/api/repos/:repoId/inline-edit", async (c) => {
  const actor = readMutationActor(c.req.raw.headers);
  if (!actor) {
    return c.json({ error: "Unauthorized: missing actor headers" }, 401);
  }

  const repoId = c.req.param("repoId");
  if (!repoId) {
    return c.json({ error: "Missing repository id" }, 400);
  }

  let body: InlineEditRequestBody;
  try {
    body = (await c.req.json()) as InlineEditRequestBody;
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const validationError = validateInlineEditBody(body);
  if (validationError) {
    return c.json({ error: validationError }, 400);
  }

  await ensureYonaDataDirectories();

  try {
    const repoPath = resolveRepositoryPath(getRepositoryRoot(), repoId);
    const result = await performInlineEditMutation({
      repositoryId: repoId,
      repoPath,
      branch: body.branch ?? "",
      filePath: body.filePath ?? "",
      content: body.content ?? "",
      message: body.message ?? "",
      baseOid: body.baseOid,
      actor,
      requestId: c.req.raw.headers.get("x-request-id") ?? undefined,
    });

    return c.json({
      requestId: result.requestId,
      repositoryId: repoId,
      branch: body.branch,
      filePath: body.filePath,
      commit: result.commit,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return c.json({ error: error.message }, 403);
    }

    if (error instanceof ConflictError) {
      return c.json(
        {
          error: "Conflict: branch moved since baseOid",
          expectedOid: error.expectedOid,
          actualOid: error.actualOid,
        },
        409,
      );
    }

    const message = error instanceof Error ? error.message : "Failed to perform inline edit";
    if (
      message.includes("Invalid repository id") ||
      message.includes("Invalid file path") ||
      message.includes("Repository path escapes root")
    ) {
      return c.json({ error: message }, 400);
    }

    if (message.includes("ENOENT") || message.includes("not found")) {
      return c.json({ error: message }, 404);
    }

    return c.json({ error: message }, 500);
  }
});

repoApp.get("/api/repos/:repoId/smart-http/*", async (c) => {
  const repoId = c.req.param("repoId");
  const gitPath = resolveSmartHttpGitPath(c.req.path, repoId ?? "", c.req.param("*"));

  if (!repoId || !gitPath) {
    return new Response("Not Found", { status: 404 });
  }

  return handleSmartHttpRequest({
    repositoryId: repoId,
    pathInfo: getPathInfo(repoId, gitPath),
    request: c.req.raw,
  });
});

repoApp.post("/api/repos/:repoId/smart-http/*", async (c) => {
  const repoId = c.req.param("repoId");
  const gitPath = resolveSmartHttpGitPath(c.req.path, repoId ?? "", c.req.param("*"));

  if (!repoId || !gitPath) {
    return new Response("Not Found", { status: 404 });
  }

  return handleSmartHttpRequest({
    repositoryId: repoId,
    pathInfo: getPathInfo(repoId, gitPath),
    request: c.req.raw,
  });
});
