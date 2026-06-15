import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  codeBranchesQueryOptions,
  deleteCodeBranchRest,
  setDefaultCodeBranchRest,
} from "../../../../api/code-branches";
import { apiQueryKeys } from "../../../../api/query-keys";
import { readProjectContainer } from "../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../app-view-models";
import { CodeBranchListPage } from "../../../-code-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/branches")({
  component: CodeBranchesRouteComponent,
});

function CodeBranchesRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const queryClient = useQueryClient();
  const [pendingBranchName, setPendingBranchName] = React.useState("");
  const routeHref = `/${owner}/${projectName}/branches`;
  const scope = { ownerName: owner, projectName };
  const containerQuery = useQuery({
    enabled: !bootstrapping,
    queryFn: () => readProjectContainer(runtimeConfig, owner, projectName),
    queryKey: apiQueryKeys.project.container(owner, projectName),
  });
  const branchQuery = useQuery({
    ...codeBranchesQueryOptions(runtimeConfig, scope),
    enabled: !bootstrapping,
  });
  const mutationError = React.useCallback(
    (error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "error.badrequest");
    },
    [setErrorMessage],
  );
  const setDefaultMutation = useMutation({
    mutationFn: (branchName: string) =>
      setDefaultCodeBranchRest(runtimeConfig, csrfToken, {
        ...scope,
        branchName,
      }),
    onError: mutationError,
    onSettled: () => {
      setPendingBranchName("");
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData(apiQueryKeys.project.codeBranches(owner, projectName), updated);
      await queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.codeBranches(owner, projectName),
      });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (branchName: string) =>
      deleteCodeBranchRest(runtimeConfig, csrfToken, {
        ...scope,
        branchName,
      }),
    onError: mutationError,
    onSettled: () => {
      setPendingBranchName("");
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData(apiQueryKeys.project.codeBranches(owner, projectName), updated);
      await queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.codeBranches(owner, projectName),
      });
    },
  });
  const error = containerQuery.error ?? branchQuery.error;
  const failureKind = error ? (classifyConnectFailure(error) ?? "bad-request") : null;

  useDocumentTitle("title.branches");

  if (bootstrapping || containerQuery.isLoading || branchQuery.isLoading) {
    return (
      <main className="app-shell">
        <h1>common.loading</h1>
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
    <CodeBranchListPage
      branchList={branchQuery.data ?? null}
      detail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      pendingBranchName={pendingBranchName}
      runtimeConfig={runtimeConfig}
      onDeleteBranch={async (branchName) => {
        setPendingBranchName(branchName);
        await deleteMutation.mutateAsync(branchName);
      }}
      onSetDefaultBranch={async (branchName) => {
        setPendingBranchName(branchName);
        await setDefaultMutation.mutateAsync(branchName);
      }}
    />
  );
}
