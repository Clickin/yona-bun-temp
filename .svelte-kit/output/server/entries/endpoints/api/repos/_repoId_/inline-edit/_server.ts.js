import { json } from "@sveltejs/kit";
import { r as readMutationActor } from "../../../../../../chunks/auth.js";
import {
  e as ensureYonaDataDirectories,
  r as resolveRepositoryPath,
  g as getRepositoryRoot,
} from "../../../../../../chunks/executable.js";
import {
  p as performInlineEditMutation,
  A as AuthorizationError,
  C as ConflictError,
} from "../../../../../../chunks/mutation.js";
function validateInlineEditBody(body) {
  if (!body.branch || !body.filePath || body.content === void 0 || !body.message) {
    return "branch, filePath, content, and message are required";
  }
  if (body.message.trim().length === 0) {
    return "message cannot be empty";
  }
  return null;
}
const POST = async ({ params, request }) => {
  const actor = readMutationActor(request.headers);
  if (!actor) {
    return json({ error: "Unauthorized: missing actor headers" }, { status: 401 });
  }
  const repoId = params.repoId;
  if (!repoId) {
    return json({ error: "Missing repository id" }, { status: 400 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const validationError = validateInlineEditBody(body);
  if (validationError) {
    return json({ error: validationError }, { status: 400 });
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
      requestId: request.headers.get("x-request-id") ?? void 0,
    });
    return json({
      requestId: result.requestId,
      repositoryId: repoId,
      branch: body.branch,
      filePath: body.filePath,
      commit: result.commit,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ConflictError) {
      return json(
        {
          error: "Conflict: branch moved since baseOid",
          expectedOid: error.expectedOid,
          actualOid: error.actualOid,
        },
        { status: 409 },
      );
    }
    const message = error instanceof Error ? error.message : "Failed to perform inline edit";
    if (
      message.includes("Invalid repository id") ||
      message.includes("Invalid file path") ||
      message.includes("Repository path escapes root")
    ) {
      return json({ error: message }, { status: 400 });
    }
    if (message.includes("ENOENT") || message.includes("not found")) {
      return json({ error: message }, { status: 404 });
    }
    return json({ error: message }, { status: 500 });
  }
};
export { POST };
