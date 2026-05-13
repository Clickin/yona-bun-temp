import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { restFetch } from "../../../../../api/rest-client";
import { readProjectContainer } from "../../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../../app-view-models";
import type { RuntimeConfig } from "../../../../../runtime-config";
import { CodeCommitDetailPage, type CodeCommitDetailViewModel } from "../../../../-code-views";
import {
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/commit/$commitId")({
  component: CodeCommitDetailRouteComponent,
});

interface CodeCommitDetailResponse {
  branches: Array<{ name: string }>;
  breadcrumbs: Array<{ name: string; path: string }>;
  commit: CodeCommitDetailViewModel["commit"];
  files: Array<{ path: string; patch: string }>;
  noHead: boolean;
  ownerName: string;
  parentCommit: { commitId: string; commitShortId: string } | null;
  path: string;
  projectName: string;
  selectedBranch: string;
}

async function readCodeCommitDetail(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  commitId: string,
  input: { branch?: string; path?: string } = {},
): Promise<CodeCommitDetailResponse> {
  const searchParams = new URLSearchParams();
  if (input.branch) {
    searchParams.set("branch", input.branch);
  }
  if (input.path) {
    searchParams.set("path", input.path);
  }
  const query = searchParams.toString();
  const path = `/projects/${encodeURIComponent(ownerName)}/${encodeURIComponent(
    projectName,
  )}/commit/${encodeURIComponent(commitId)}${query ? `?${query}` : ""}`;
  return restFetch<CodeCommitDetailResponse>(runtimeConfig, path, {
    method: "GET",
  });
}

function toCodeCommitDetailView(response: CodeCommitDetailResponse): CodeCommitDetailViewModel {
  return {
    branches: response.branches.map((branch) => ({ name: branch.name })),
    breadcrumbs: response.breadcrumbs.map((breadcrumb) => ({
      name: breadcrumb.name,
      path: breadcrumb.path,
    })),
    commit: response.commit,
    files: response.files.map((file) => ({
      path: file.path,
      patch: file.patch,
    })),
    noHead: response.noHead,
    ownerName: response.ownerName,
    parentCommit: response.parentCommit,
    path: response.path,
    projectName: response.projectName,
    selectedBranch: response.selectedBranch,
  };
}

function CodeCommitDetailRouteComponent() {
  const { commitId, owner, projectName } = Route.useParams();
  const { bootstrapping, runtimeConfig, setErrorMessage } = useAppRuntime();
  const [detail, setDetail] = React.useState<ReturnType<typeof toProjectContainerView> | null>(
    null,
  );
  const [commitDetail, setCommitDetail] = React.useState<CodeCommitDetailViewModel | null>(null);
  const [failureKind, setFailureKind] = React.useState<null | "forbidden" | "not-found">(null);

  useDocumentTitle("Commit");

  React.useEffect(() => {
    let cancelled = false;
    setFailureKind(null);
    void (async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const [nextDetail, nextCommitDetail] = await Promise.all([
          readProjectContainer(runtimeConfig, owner, projectName),
          readCodeCommitDetail(runtimeConfig, owner, projectName, commitId, {
            branch: searchParams.get("branch") ?? "",
            path: searchParams.get("path") ?? "",
          }),
        ]);
        if (!cancelled) {
          setDetail(toProjectContainerView(nextDetail));
          setCommitDetail(toCodeCommitDetailView(nextCommitDetail));
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        const nextFailureKind = classifyConnectFailure(error);
        if (nextFailureKind) {
          setFailureKind(nextFailureKind);
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : "Read commit detail failed.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [commitId, owner, projectName, runtimeConfig, setErrorMessage]);

  if (bootstrapping) {
    return (
      <main className="app-shell">
        <h1>Loading&hellip;</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={`/${owner}/${projectName}/commit/${commitId}`} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={`/${owner}/${projectName}/commit/${commitId}`} />;
  }

  return (
    <CodeCommitDetailPage
      commitDetail={commitDetail}
      detail={detail}
      runtimeConfig={runtimeConfig}
    />
  );
}
