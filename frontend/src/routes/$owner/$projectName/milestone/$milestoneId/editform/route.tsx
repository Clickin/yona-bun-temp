import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { apiQueryKeys } from "../../../../../../api/query-keys";
import {
  readProjectContainer,
  readProjectMilestone,
  updateProjectMilestone,
} from "../../../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../../../app-runtime-context";
import {
  toProjectContainerView,
  toProjectMilestoneDetailView,
} from "../../../../../../app-view-models";
import { prefixBasePath } from "../../../../../../runtime-config";
import { ProjectMilestoneFormPage } from "../../../../../-milestone-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/milestone/$milestoneId/editform")({
  component: ProjectMilestoneEditFormRouteComponent,
});

function ProjectMilestoneEditFormRouteComponent() {
  const { owner, projectName, milestoneId } = Route.useParams();
  const { bootstrapping, csrfToken, messages, runtimeConfig } = useAppRuntime();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const routeHref = `/${owner}/${projectName}/milestone/${milestoneId}/editform`;
  const [detail, setDetail] = React.useState<ReturnType<typeof toProjectContainerView> | null>(
    null,
  );
  const [milestone, setMilestone] =
    React.useState<ReturnType<typeof toProjectMilestoneDetailView>>(null);
  const [failureKind, setFailureKind] = React.useState<
    null | "bad-request" | "forbidden" | "not-found"
  >(null);

  useDocumentTitle("title.editMilestone");

  const updateMilestoneMutation = useMutation({
    mutationFn: (input: {
      attachmentIds: number[];
      contentsMarkdown: string;
      dueDate: string;
      state: string;
      title: string;
    }) =>
      updateProjectMilestone(runtimeConfig, csrfToken, {
        attachmentIds: input.attachmentIds.map(BigInt),
        contentsMarkdown: input.contentsMarkdown,
        dueDate: input.dueDate,
        milestoneId: BigInt(Number(milestoneId)),
        ownerName: owner,
        projectName,
        state: input.state,
        title: input.title,
      }),
    onSuccess: (response) => {
      const nextMilestoneId = response.milestone?.id
        ? Number(response.milestone.id)
        : Number(milestoneId);
      void queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.base(owner, projectName),
      });
      void navigate({
        href: prefixBasePath(
          runtimeConfig.basePath,
          `/${owner}/${projectName}/milestone/${nextMilestoneId}`,
        ),
      });
    },
  });

  React.useEffect(() => {
    let cancelled = false;
    setFailureKind(null);
    void (async () => {
      try {
        const [nextDetail, nextMilestone] = await Promise.all([
          readProjectContainer(runtimeConfig, owner, projectName),
          readProjectMilestone(runtimeConfig, owner, projectName, Number(milestoneId)),
        ]);
        if (!cancelled) {
          setDetail(toProjectContainerView(nextDetail));
          setMilestone(toProjectMilestoneDetailView(nextMilestone));
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
  }, [milestoneId, owner, projectName, runtimeConfig]);

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
    <ProjectMilestoneFormPage
      csrfToken={csrfToken}
      detail={detail}
      initialMilestone={milestone}
      messages={messages}
      mode="edit"
      onSubmit={async (input) => {
        await updateMilestoneMutation.mutateAsync(input);
      }}
      owner={owner}
      projectName={projectName}
      renderShell={false}
      runtimeConfig={runtimeConfig}
    />
  );
}
