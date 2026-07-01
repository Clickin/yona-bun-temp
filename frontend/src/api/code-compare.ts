import { queryOptions } from "@tanstack/react-query";
import type { RuntimeConfig } from "../runtime-config";
import { restFetch } from "./rest-client";

type ProjectScopeInput = {
  ownerName: string;
  projectName: string;
};

export type CodeCompareCommit = {
  commitId: string;
};

export type CodeCompareFile = {
  patch: string;
  path: string;
};

export type CodeCompareResponse = {
  commitA: CodeCompareCommit | null;
  commitB: CodeCompareCommit | null;
  files: CodeCompareFile[];
  noHead: boolean;
  ownerName: string;
  patch: string;
  projectName: string;
  revA: string;
  revB: string;
};

function projectPath(input: ProjectScopeInput, suffix = ""): string {
  return `/projects/${encodeURIComponent(input.ownerName)}/${encodeURIComponent(
    input.projectName,
  )}${suffix}`;
}

function normalizeCompare(response: Partial<CodeCompareResponse>): CodeCompareResponse {
  return {
    commitA: response.commitA ? { commitId: response.commitA.commitId ?? "" } : null,
    commitB: response.commitB ? { commitId: response.commitB.commitId ?? "" } : null,
    files: (response.files ?? []).map((file) => ({
      patch: file.patch ?? "",
      path: file.path ?? "",
    })),
    noHead: response.noHead ?? false,
    ownerName: response.ownerName ?? "",
    patch: response.patch ?? "",
    projectName: response.projectName ?? "",
    revA: response.revA ?? "",
    revB: response.revB ?? "",
  };
}

export async function readCodeCompare(
  runtimeConfig: RuntimeConfig,
  input: ProjectScopeInput & { revisionRange: string },
  fetchImpl: typeof fetch = fetch,
): Promise<CodeCompareResponse> {
  const payload = await restFetch<Partial<CodeCompareResponse>>(
    runtimeConfig,
    projectPath(input, `/compare/${encodeURIComponent(input.revisionRange)}`),
    { fetchImpl, method: "GET" },
  );
  return normalizeCompare(payload);
}

export function codeCompareQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: ProjectScopeInput & { revisionRange: string },
) {
  return queryOptions({
    queryFn: () => readCodeCompare(runtimeConfig, input),
    queryKey: ["project", input.ownerName, input.projectName, "compare", input.revisionRange],
  });
}
