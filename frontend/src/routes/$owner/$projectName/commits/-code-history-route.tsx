import * as React from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { restFetch } from "../../../../api/rest-client";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../app-view-models";
import { readProjectContainer } from "../../../../auth-workspace-client";
import type { RuntimeConfig } from "../../../../runtime-config";
import { CodeHistoryPage, type CodeHistoryViewModel } from "../../../-code-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../-shared";

interface CodeHistoryOptions {
  branch?: string;
  page?: number;
  path?: string;
}

interface CodeHistoryResponse {
  branches: Array<{ name: string }>;
  breadcrumbs: Array<{ name: string; path: string }>;
  commits: Array<{
    authorAvatarUrl?: string;
    authorDate: string;
    authorEmail: string;
    authorLoginId?: string;
    authorName: string;
    commentCount: number;
    commitId: string;
    commitShortId: string;
    message: string;
    shortMessage: string;
  }>;
  hasNewer: boolean;
  hasOlder: boolean;
  noHead: boolean;
  ownerName: string;
  page: number;
  path: string;
  projectName: string;
  selectedBranch: string;
}

async function readCodeHistory(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  input: CodeHistoryOptions = {},
): Promise<CodeHistoryResponse> {
  const searchParams = new URLSearchParams();
  if (input.branch) {
    searchParams.set("branch", input.branch);
  }
  if (input.path) {
    searchParams.set("path", input.path);
  }
  if (input.page && input.page > 0) {
    searchParams.set("page", input.page.toString());
  }
  const query = searchParams.toString();
  const path = `/projects/${encodeURIComponent(ownerName)}/${encodeURIComponent(
    projectName,
  )}/commits${query ? `?${query}` : ""}`;
  return restFetch<CodeHistoryResponse>(runtimeConfig, path, {
    method: "GET",
  });
}

function toCodeHistoryView(response: CodeHistoryResponse): CodeHistoryViewModel {
  return {
    branches: response.branches.map((branch) => ({ name: branch.name })),
    breadcrumbs: response.breadcrumbs.map((breadcrumb) => ({
      name: breadcrumb.name,
      path: breadcrumb.path,
    })),
    commits: response.commits.map((commit) => ({
      authorAvatarUrl: commit.authorAvatarUrl ?? "",
      authorDate: commit.authorDate,
      authorEmail: commit.authorEmail,
      authorLoginId: commit.authorLoginId ?? "",
      authorName: commit.authorName,
      commentCount: commit.commentCount,
      commitId: commit.commitId,
      commitShortId: commit.commitShortId,
      message: commit.message,
      shortMessage: commit.shortMessage,
    })),
    hasNewer: response.hasNewer,
    hasOlder: response.hasOlder,
    noHead: response.noHead,
    ownerName: response.ownerName,
    page: response.page,
    path: response.path,
    projectName: response.projectName,
    selectedBranch: response.selectedBranch,
  };
}

export function CodeHistoryRouteView(props: {
  branch?: string;
  owner: string;
  path?: string;
  projectName: string;
}) {
  const owner = props.owner;
  const projectName = props.projectName;
  const branch = props.branch ?? "";
  const path = props.path ?? "";
  const { bootstrapping, messages, runtimeConfig } = useAppRuntime();
  const navigate = useNavigate();
  const locationHref = useRouterState({ select: (state) => state.location.href });
  const routeHref = `/${owner}/${projectName}/commits`;
  const [detail, setDetail] = React.useState<ReturnType<typeof toProjectContainerView> | null>(
    null,
  );
  const [history, setHistory] = React.useState<CodeHistoryViewModel | null>(null);
  const [failureKind, setFailureKind] = React.useState<
    null | "bad-request" | "forbidden" | "not-found"
  >(null);

  useDocumentTitle("title.commitHistory");

  React.useEffect(() => {
    let cancelled = false;
    setFailureKind(null);
    void (async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const page = Number(searchParams.get("page") || "0") || 0;
        const [nextDetail, nextHistory] = await Promise.all([
          readProjectContainer(runtimeConfig, owner, projectName),
          readCodeHistory(runtimeConfig, owner, projectName, { branch, page, path }),
        ]);
        if (!cancelled) {
          setDetail(toProjectContainerView(nextDetail));
          setHistory(toCodeHistoryView(nextHistory));
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
        setFailureKind("bad-request");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branch, locationHref, owner, path, projectName, runtimeConfig]);

  if (bootstrapping) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={routeHref} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={routeHref} />;
  }
  if (failureKind === "bad-request") {
    return <BadRequestPage href={routeHref} />;
  }

  return (
    <CodeHistoryPage
      detail={detail}
      history={history}
      messages={messages}
      onNavigate={(href) => {
        void navigate({ href });
      }}
      renderShell={false}
      runtimeConfig={runtimeConfig}
    />
  );
}
