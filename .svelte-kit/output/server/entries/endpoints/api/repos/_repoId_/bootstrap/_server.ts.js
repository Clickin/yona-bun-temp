import { json } from "@sveltejs/kit";
import { r as readMutationActor } from "../../../../../../chunks/auth.js";
import { access } from "node:fs/promises";
import {
  e as ensureYonaDataDirectories,
  r as resolveRepositoryPath,
  g as getRepositoryRoot,
  i as initBareRepository,
  a as runGit,
} from "../../../../../../chunks/executable.js";
async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
async function assertGitRepository(path) {
  try {
    await runGit(["rev-parse", "--git-dir"], { cwd: path });
  } catch {
    throw new Error(`Existing path is not a valid git repository: ${path}`);
  }
}
async function provisionRepository(repositoryId) {
  await ensureYonaDataDirectories();
  const repositoryPath = resolveRepositoryPath(getRepositoryRoot(), repositoryId);
  const exists = await pathExists(repositoryPath);
  if (!exists) {
    await initBareRepository(repositoryPath);
    return {
      repositoryId,
      repositoryPath,
      created: true,
    };
  }
  await assertGitRepository(repositoryPath);
  return {
    repositoryId,
    repositoryPath,
    created: false,
  };
}
const POST = async ({ params, request }) => {
  const actor = readMutationActor(request.headers);
  if (!actor) {
    return json({ error: "Unauthorized: missing actor headers" }, { status: 401 });
  }
  if (!actor.canAdmin) {
    return json({ error: "Forbidden: admin role required" }, { status: 403 });
  }
  const repoId = params.repoId;
  if (!repoId) {
    return json({ error: "Missing repository id" }, { status: 400 });
  }
  try {
    const result = await provisionRepository(repoId);
    return json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to provision repository";
    if (message.includes("Invalid repository id")) {
      return json({ error: message }, { status: 400 });
    }
    return json({ error: message }, { status: 500 });
  }
};
export { POST };
