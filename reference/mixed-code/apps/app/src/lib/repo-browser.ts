import {
  listRepositoryBranchesOutputSchema,
  listRepositoryCommitsOutputSchema,
  readRepositoryCommitOutputSchema,
  readRepositoryFileOutputSchema,
} from "@yona/contracts";

async function readJson<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  parse: (value: unknown) => T,
) {
  const response = await fetch(input, init);
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) {
        message = body.error;
      }
    } catch {}
    throw new Error(message);
  }

  return parse(await response.json());
}

export async function readProjectRepositoryId(input: { ownerName: string; projectName: string }) {
  const encodedOwner = encodeURIComponent(input.ownerName);
  const encodedProjectName = encodeURIComponent(input.projectName);
  return readJson(
    `/api/projects/${encodedOwner}/${encodedProjectName}/repo-id`,
    { method: "GET" },
    (value) => {
      const row = value as { repoId?: string };
      if (!row.repoId || row.repoId.trim().length === 0) {
        throw new Error("Invalid repository id response.");
      }
      return row.repoId;
    },
  );
}

export async function listRepositoryBranches(input: { repoId: string }) {
  const encodedRepoId = encodeURIComponent(input.repoId);
  return readJson(`/api/repos/${encodedRepoId}/branches`, { method: "GET" }, (value) =>
    listRepositoryBranchesOutputSchema.parse(value),
  );
}

export async function listRepositoryCommits(input: {
  branch: string;
  limit: number;
  repoId: string;
}) {
  const encodedRepoId = encodeURIComponent(input.repoId);
  const query = new URLSearchParams({
    branch: input.branch,
    limit: String(input.limit),
  });
  return readJson(
    `/api/repos/${encodedRepoId}/commits?${query.toString()}`,
    { method: "GET" },
    (value) => listRepositoryCommitsOutputSchema.parse(value),
  );
}

export async function readRepositoryCommitDetail(input: { oid: string; repoId: string }) {
  const encodedRepoId = encodeURIComponent(input.repoId);
  const encodedOid = encodeURIComponent(input.oid);
  return readJson(`/api/repos/${encodedRepoId}/commits/${encodedOid}`, { method: "GET" }, (value) =>
    readRepositoryCommitOutputSchema.parse(value),
  );
}

export async function readRepositoryFileContent(input: {
  branch: string;
  filePath: string;
  repoId: string;
}) {
  const encodedRepoId = encodeURIComponent(input.repoId);
  const query = new URLSearchParams({
    branch: input.branch,
    path: input.filePath,
  });
  return readJson(
    `/api/repos/${encodedRepoId}/files?${query.toString()}`,
    { method: "GET" },
    (value) => readRepositoryFileOutputSchema.parse(value),
  );
}
