import { useQuery } from "@tanstack/react-query";
import { LegacyI18nProvider } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { type RuntimeConfig } from "../../../runtime-config";
import { readDirectIssueFormOptions } from "../../../auth-workspace-client";
import { SiteLayoutShell } from "../../-home-route-screen";
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
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <DirectIssueFormProjectScreen
          commentId={commentId}
          mine={mine}
          runtimeConfig={runtimeConfig}
        />
      </LegacyI18nProvider>
    </YonaQueryProvider>
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
  const directOptionsQuery = useQuery({
    queryFn: () =>
      readDirectIssueFormOptions(runtimeConfig, {
        commentId: commentId || undefined,
        mine,
      }),
    queryKey: ["user", "issues", "new-options", commentId, mine],
  });

  if (!directOptionsQuery.data) {
    return null;
  }

  const { bodyMarkdown, referCommentId, selectedProject } = directOptionsQuery.data;
  if (selectedProject.ownerName === "" || selectedProject.projectName === "") {
    return null;
  }

  return (
    <SiteLayoutShell projectSearchScope={selectedProject} runtimeConfig={runtimeConfig}>
      <ProjectIssueFormProjectScreen
        initialBodyMarkdown={bodyMarkdown}
        ownerName={selectedProject.ownerName}
        projectName={selectedProject.projectName}
        referCommentId={referCommentId || commentId}
        runtimeConfig={runtimeConfig}
        showSubtaskOptionOnMount
      />
    </SiteLayoutShell>
  );
}
