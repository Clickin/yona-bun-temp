import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  addProjectMemberRest,
  deleteProjectMemberRest,
  readProjectContainerQueryOptions,
  readProjectMembersQueryOptions,
  updateProjectMemberRoleRest,
} from "../../../../api/org-project";
import { apiQueryKeys } from "../../../../api/query-keys";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../app-view-models";
import { ProjectMembersPage } from "../../../-project-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  navigateToAppHref,
  NotFoundPage,
  useRequireAuthenticatedRoute,
} from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/members")({
  component: ProjectMembersRouteComponent,
});

function ProjectMembersRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, csrfToken, messages, runtimeConfig, setErrorMessage } = useAppRuntime();
  const queryClient = useQueryClient();
  const routeHref = `/${owner}/${projectName}/members`;
  const canRender = useRequireAuthenticatedRoute(routeHref);
  const [failureKind, setFailureKind] = React.useState<
    null | "bad-request" | "forbidden" | "not-found"
  >(null);
  const containerQuery = useQuery({
    ...readProjectContainerQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
    }),
    enabled: !bootstrapping && canRender,
  });
  const membersQueryKey = apiQueryKeys.project.members(owner, projectName);
  const membersQuery = useQuery({
    ...readProjectMembersQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
    }),
    enabled: !bootstrapping && canRender,
  });

  React.useEffect(() => {
    const error = containerQuery.error ?? membersQuery.error;
    if (!error) {
      setFailureKind(null);
      return;
    }
    const nextFailureKind = classifyConnectFailure(error);
    if (nextFailureKind) {
      setFailureKind(nextFailureKind);
      return;
    }
    setFailureKind("bad-request");
  }, [containerQuery.error, membersQuery.error]);

  const addMutation = useMutation({
    mutationFn: (loginId: string) =>
      addProjectMemberRest(runtimeConfig, csrfToken, {
        loginId,
        ownerName: owner,
        projectName,
      }),
    onError: (error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : messages("error.badrequest", { fallback: "error.badrequest" }),
      );
    },
    onSuccess: (detail) => {
      queryClient.setQueryData(membersQueryKey, detail);
      queryClient.invalidateQueries({ queryKey: membersQueryKey });
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.container(owner, projectName),
      });
    },
  });
  const updateRoleMutation = useMutation({
    mutationFn: (input: { role: string; userId: number }) =>
      updateProjectMemberRoleRest(runtimeConfig, csrfToken, {
        ownerName: owner,
        projectName,
        role: input.role,
        userId: input.userId,
      }),
    onError: (error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : messages("project.member.ownerMustBeAManager", {
              fallback: "project.member.ownerMustBeAManager",
            }),
      );
    },
    onSuccess: (detail) => {
      queryClient.setQueryData(membersQueryKey, detail);
      queryClient.invalidateQueries({ queryKey: membersQueryKey });
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.container(owner, projectName),
      });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (userId: number) =>
      deleteProjectMemberRest(runtimeConfig, csrfToken, {
        ownerName: owner,
        projectName,
        userId,
      }),
    onError: (error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : messages("error.badrequest", { fallback: "error.badrequest" }),
      );
    },
    onSuccess: (detail) => {
      queryClient.setQueryData(membersQueryKey, detail);
      queryClient.invalidateQueries({ queryKey: membersQueryKey });
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.container(owner, projectName),
      });
      if (detail.redirectPath && detail.redirectPath !== routeHref) {
        navigateToAppHref(runtimeConfig.basePath, detail.redirectPath);
      }
    },
  });

  if (bootstrapping || !canRender) {
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
    <ProjectMembersPage
      detail={membersQuery.data ?? null}
      messages={messages}
      onAddMember={(loginId) => addMutation.mutate(loginId)}
      onDeleteMember={(userId) => deleteMutation.mutate(userId)}
      onUpdateMemberRole={(userId, role) => updateRoleMutation.mutate({ role, userId })}
      pending={addMutation.isPending || updateRoleMutation.isPending || deleteMutation.isPending}
      projectDetail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      renderShell={false}
      runtimeConfig={runtimeConfig}
    />
  );
}
