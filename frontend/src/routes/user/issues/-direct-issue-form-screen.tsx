import { useQuery } from "@tanstack/react-query";
import { RestApiError } from "../../../api/rest-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YoramQueryProvider } from "../../../query-client";
import { type RuntimeConfig } from "../../../runtime-config";
import { readDirectIssueFormOptions } from "../../../auth-workspace-client";
import { HomeRouteScreen, SiteLayoutShell } from "../../-home-route-screen";
import { ProjectIssueFormProjectScreen } from "../../$ownerName/$projectName/issueform";

export function DirectIssueFormRouteScreen({
  commentId = "",
  mine = false,
  runtimeConfig,
}: {
  commentId?: string;
  mine?: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <DirectIssueFormProjectScreen
          commentId={commentId}
          mine={mine}
          runtimeConfig={runtimeConfig}
        />
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function DirectIssueFormProjectScreen({
  commentId,
  mine,
  runtimeConfig,
}: {
  commentId: string;
  mine: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const directOptionsQuery = useQuery({
    queryFn: () =>
      readDirectIssueFormOptions(runtimeConfig, {
        commentId: commentId || undefined,
        mine,
      }),
    queryKey: ["user", "issues", "new-options", commentId, mine],
    retry: false,
  });

  const { data, error } = directOptionsQuery;
  const selectedProject = data?.selectedProject;
  if (
    (data && (!selectedProject?.ownerName || !selectedProject.projectName)) ||
    (error instanceof RestApiError && error.status === 404 && error.message === "project.is.empty")
  ) {
    return (
      <HomeRouteScreen
        flashMessageKey="project.is.empty"
        routePath={mine ? "/user/issues/new/mine" : "/user/issues/new"}
        runtimeConfig={runtimeConfig}
      />
    );
  }

  if (error || !data || !selectedProject) {
    return (
      <SiteLayoutShell runtimeConfig={runtimeConfig}>
        <div className="page-wrap-outer">
          <div className="project-page-wrap">
            {error ? (
              <div className="issue-form-load-error" role="alert">
                {t(error instanceof Error ? error.message : "error.internalServerError")}
              </div>
            ) : (
              <div className="issue-form-loading" role="status">
                {t("common.loading")}
              </div>
            )}
          </div>
        </div>
      </SiteLayoutShell>
    );
  }

  const { bodyMarkdown, referCommentId } = data;

  return (
    <SiteLayoutShell projectSearchScope={selectedProject} runtimeConfig={runtimeConfig}>
      <>
        <title>{`${t("title.newIssue")} - ${selectedProject.ownerName}/${selectedProject.projectName}`}</title>
        <ProjectIssueFormProjectScreen
          initialBodyMarkdown={bodyMarkdown}
          ownerName={selectedProject.ownerName}
          projectName={selectedProject.projectName}
          projectHeaderRuntimeConfig={runtimeConfig}
          referCommentId={referCommentId || commentId}
          runtimeConfig={runtimeConfig}
          showSubtaskOptionOnMount
        />
      </>
    </SiteLayoutShell>
  );
}
