import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  addProjectMemberRest,
  deleteProjectMemberRest,
  readProjectMembersQueryOptions,
  updateProjectMemberRoleRest,
} from "../../../../api/org-project";
import { apiQueryKeys } from "../../../../api/query-keys";
import { useAppRuntime } from "../../../../app-runtime-context";
import { ProjectMembersPage } from "../../../-project-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useRequireAuthenticatedRoute,
} from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/members")({
  component: ProjectMembersRouteComponent,
});

function ProjectMembersRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const queryClient = useQueryClient();
  const routeHref = `/${owner}/${projectName}/members`;
  const canRender = useRequireAuthenticatedRoute(routeHref);
  const [failureKind, setFailureKind] = React.useState<
    null | "bad-request" | "forbidden" | "not-found"
  >(null);
  const membersQueryKey = apiQueryKeys.project.members(owner, projectName);
  const membersQuery = useQuery({
    ...readProjectMembersQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
    }),
    enabled: !bootstrapping && canRender,
  });

  React.useEffect(() => {
    if (!membersQuery.error) {
      setFailureKind(null);
      return;
    }
    const nextFailureKind = classifyConnectFailure(membersQuery.error);
    if (nextFailureKind) {
      setFailureKind(nextFailureKind);
      return;
    }
    setFailureKind("bad-request");
  }, [membersQuery.error]);

  const addMutation = useMutation({
    mutationFn: (loginId: string) =>
      addProjectMemberRest(runtimeConfig, csrfToken, {
        loginId,
        ownerName: owner,
        projectName,
      }),
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "error.badrequest");
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
        error instanceof Error ? error.message : "project.member.ownerMustBeAManager",
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
      setErrorMessage(error instanceof Error ? error.message : "error.badrequest");
    },
    onSuccess: (detail) => {
      queryClient.setQueryData(membersQueryKey, detail);
      queryClient.invalidateQueries({ queryKey: membersQueryKey });
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.container(owner, projectName),
      });
      if (detail.redirectPath && detail.redirectPath !== routeHref) {
        window.location.assign(`${runtimeConfig.basePath}${detail.redirectPath}`);
      }
    },
  });

  if (bootstrapping || !canRender) {
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
    <ProjectMembersPage
      detail={membersQuery.data ?? null}
      onAddMember={(loginId) => addMutation.mutate(loginId)}
      onDeleteMember={(userId) => deleteMutation.mutate(userId)}
      onUpdateMemberRole={(userId, role) => updateRoleMutation.mutate({ role, userId })}
      pending={addMutation.isPending || updateRoleMutation.isPending || deleteMutation.isPending}
      runtimeConfig={runtimeConfig}
    />
  );
}
