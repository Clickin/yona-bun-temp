import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { restFetch } from "../../../../../api/rest-client";
import { readProjectContainer } from "../../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../../app-view-models";
import type { RuntimeConfig } from "../../../../../runtime-config";
import { CodeComparePage, type CodeCompareViewModel } from "../../../../-code-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/compare/$revisionRange")({
  component: CodeCompareRouteComponent,
});

interface CodeCompareResponse {
  commitA: CodeCompareViewModel["commitA"];
  commitB: CodeCompareViewModel["commitB"];
  files: Array<{ path: string; patch: string }>;
  noHead: boolean;
  ownerName: string;
  projectName: string;
  revA: string;
  revB: string;
}

async function readCodeCompare(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  revisionRange: string,
): Promise<CodeCompareResponse> {
  const path = `/projects/${encodeURIComponent(ownerName)}/${encodeURIComponent(
    projectName,
  )}/compare/${encodeURIComponent(revisionRange)}`;
  return restFetch<CodeCompareResponse>(runtimeConfig, path, {
    method: "GET",
  });
}

function toCodeCompareView(response: CodeCompareResponse): CodeCompareViewModel {
  return {
    commitA: response.commitA,
    commitB: response.commitB,
    files: response.files.map((file) => ({
      path: file.path,
      patch: file.patch,
    })),
    noHead: response.noHead,
    ownerName: response.ownerName,
    projectName: response.projectName,
    revA: response.revA,
    revB: response.revB,
  };
}

function CodeCompareRouteComponent() {
  const { owner, projectName, revisionRange } = Route.useParams();
  const { bootstrapping, messages, runtimeConfig } = useAppRuntime();
  const [detail, setDetail] = React.useState<ReturnType<typeof toProjectContainerView> | null>(
    null,
  );
  const [compare, setCompare] = React.useState<CodeCompareViewModel | null>(null);
  const [failureKind, setFailureKind] = React.useState<
    null | "bad-request" | "forbidden" | "not-found"
  >(null);

  useDocumentTitle(revisionRange);

  React.useEffect(() => {
    let cancelled = false;
    setFailureKind(null);
    void (async () => {
      try {
        const [nextDetail, nextCompare] = await Promise.all([
          readProjectContainer(runtimeConfig, owner, projectName),
          readCodeCompare(runtimeConfig, owner, projectName, revisionRange),
        ]);
        if (!cancelled) {
          setDetail(toProjectContainerView(nextDetail));
          setCompare(toCodeCompareView(nextCompare));
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
  }, [owner, projectName, revisionRange, runtimeConfig]);

  if (bootstrapping) {
    return (
      <main className="app-shell">
        <h1>common.loading</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={`/${owner}/${projectName}/compare/${revisionRange}`} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={`/${owner}/${projectName}/compare/${revisionRange}`} />;
  }
  if (failureKind === "bad-request") {
    return <BadRequestPage href={`/${owner}/${projectName}/compare/${revisionRange}`} />;
  }

  return (
    <CodeComparePage
      compare={compare}
      detail={detail}
      messages={messages}
      runtimeConfig={runtimeConfig}
    />
  );
}
