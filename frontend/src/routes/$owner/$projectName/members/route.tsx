import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  addProjectMemberRest,
  deleteProjectMemberRest,
  readProjectContainerQueryOptions,
  readProjectMembersQueryOptions,
  updateProjectMemberRoleRest,
  type ProjectMember,
  type ReadProjectMembersResponse,
} from "../../../../api/org-project";
import { apiQueryKeys } from "../../../../api/query-keys";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../app-view-models";
import { ProjectMembersPage } from "../../../-project-views";
import {
  classifyConnectFailure,
  ForbiddenPage,
  navigateToAppHref,
  NotFoundPage,
  useDocumentTitle,
} from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/members")({
  component: ProjectMembersRouteComponent,
});

function ProjectMembersRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const queryClient = useQueryClient();
  const routeHref = `/${owner}/${projectName}/members`;
  const scope = { ownerName: owner, projectName };
  const membersKey = apiQueryKeys.project.members(owner, projectName);
  const containerKey = apiQueryKeys.project.container(owner, projectName);
  const containerQuery = useQuery({
    ...readProjectContainerQueryOptions(runtimeConfig, scope),
    enabled: !bootstrapping,
  });
  const membersQuery = useQuery({
    ...readProjectMembersQueryOptions(runtimeConfig, scope),
    enabled: !bootstrapping,
  });

  const navigateAfterMutation = (response: ReadProjectMembersResponse) => {
    if (response.redirectPath && response.redirectPath !== routeHref) {
      navigateToAppHref(runtimeConfig.basePath, response.redirectPath);
    }
  };

  const addMutation = useMutation({
    mutationFn: (loginId: string) =>
      addProjectMemberRest(runtimeConfig, csrfToken, {
        loginId,
        ownerName: owner,
        projectName,
      }),
    onSuccess: async (response: ReadProjectMembersResponse) => {
      queryClient.setQueryData(membersKey, response);
      await queryClient.invalidateQueries({ queryKey: membersKey });
      await queryClient.invalidateQueries({ queryKey: containerKey });
      navigateAfterMutation(response);
    },
  });
  const updateRoleMutation = useMutation({
    mutationFn: (input: { member: ProjectMember; role: string }) =>
      updateProjectMemberRoleRest(runtimeConfig, csrfToken, {
        ownerName: owner,
        projectName,
        role: input.role,
        userId: input.member.userId,
      }),
    onSuccess: async (response: ReadProjectMembersResponse) => {
      queryClient.setQueryData(membersKey, response);
      await queryClient.invalidateQueries({ queryKey: membersKey });
      await queryClient.invalidateQueries({ queryKey: containerKey });
      navigateAfterMutation(response);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (member: ProjectMember) =>
      deleteProjectMemberRest(runtimeConfig, csrfToken, {
        ownerName: owner,
        projectName,
        userId: member.userId,
      }),
    onSuccess: async (response: ReadProjectMembersResponse) => {
      queryClient.setQueryData(membersKey, response);
      await queryClient.invalidateQueries({ queryKey: membersKey });
      await queryClient.invalidateQueries({ queryKey: containerKey });
      navigateAfterMutation(response);
    },
  });

  const error =
    containerQuery.error ??
    membersQuery.error ??
    addMutation.error ??
    updateRoleMutation.error ??
    deleteMutation.error;
  const failureKind = classifyConnectFailure(error);

  useDocumentTitle("Project members");
  React.useEffect(() => {
    if (error && !classifyConnectFailure(error)) {
      setErrorMessage(error instanceof Error ? error.message : "Project member update failed.");
    }
  }, [error, setErrorMessage]);

  if (bootstrapping || containerQuery.isLoading || membersQuery.isLoading) {
    return (
      <main className="app-shell">
        <h1>Loading&hellip;</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={routeHref} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={routeHref} />;
  }

  return (
    <ProjectMembersPage
      detail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      pending={addMutation.isPending || updateRoleMutation.isPending || deleteMutation.isPending}
      response={membersQuery.data ?? null}
      runtimeConfig={runtimeConfig}
      onAddMember={async (loginId) => {
        await addMutation.mutateAsync(loginId);
      }}
      onDeleteMember={async (member) => {
        await deleteMutation.mutateAsync(member);
      }}
      onUpdateMemberRole={async (member, role) => {
        await updateRoleMutation.mutateAsync({ member, role });
      }}
    />
  );
}
