import * as React from "react";
import { readCodeBrowser, readProjectContainer } from "../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toCodeBrowserView, toProjectContainerView } from "../../../../app-view-models";
import { CodeBrowserPage } from "../../../-code-views";
import {
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../-shared";

export function CodeBrowserRouteView(props: {
  branch?: string;
  owner: string;
  path?: string;
  projectName: string;
}) {
  const owner = props.owner;
  const projectName = props.projectName;
  const branch = props.branch ?? "";
  const path = props.path ?? "";
  const { bootstrapping, runtimeConfig, setErrorMessage } = useAppRuntime();
  const routeHref = `/${owner}/${projectName}/code`;
  const [detail, setDetail] = React.useState<ReturnType<typeof toProjectContainerView> | null>(
    null,
  );
  const [code, setCode] = React.useState<ReturnType<typeof toCodeBrowserView> | null>(null);
  const [failureKind, setFailureKind] = React.useState<null | "forbidden" | "not-found">(null);

  useDocumentTitle("Code");

  React.useEffect(() => {
    let cancelled = false;
    setFailureKind(null);
    void (async () => {
      try {
        const [nextDetail, nextCode] = await Promise.all([
          readProjectContainer(runtimeConfig, owner, projectName),
          readCodeBrowser(runtimeConfig, owner, projectName, { branch, path }),
        ]);
        if (!cancelled) {
          setDetail(toProjectContainerView(nextDetail));
          setCode(toCodeBrowserView(nextCode));
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
        setErrorMessage(error instanceof Error ? error.message : "Read code browser failed.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branch, owner, path, projectName, runtimeConfig, setErrorMessage]);

  if (bootstrapping) {
    return (
      <main className="app-shell">
        <h1>Loading…</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={routeHref} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={routeHref} />;
  }

  return <CodeBrowserPage code={code} detail={detail} runtimeConfig={runtimeConfig} />;
}
