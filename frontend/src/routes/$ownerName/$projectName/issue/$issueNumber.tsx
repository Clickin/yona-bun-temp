import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { Fragment, useEffect, useRef, useState, type MouseEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { listProjectLabelsQueryOptions } from "../../../../api/project-labels";
import { currentSessionQueryOptions } from "../../../../api/session";
import { readProjectContainerQueryOptions } from "../../../../api/org-project";
import { RestApiError } from "../../../../api/rest-client";
import { translateLegacyResource } from "../../../../api/translation";
import { LegacyI18nProvider, resolveInitialLanguage, useLegacyMessages } from "../../../../i18n";
import type { ProjectContainer, ProjectMilestone, YonaRecord } from "../../../../api/types";
import { YonaQueryProvider } from "../../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../../runtime-config";
import {
  deleteIssueComment,
  deleteIssue,
  readIssueDetail,
  listProjectMilestones,
  readSessionBootstrap,
  toggleFavoriteIssue,
  unwatchIssue,
  unvoteIssue,
  unvoteIssueComment,
  updateIssueWeight,
  voteIssue,
  voteIssueComment,
  watchIssue,
  type RestIssueDetailResponse,
} from "../../../../auth-workspace-client";
import { SiteLayoutShell } from "../../../-home-route-screen";
import { LegacyMarkdownHelp } from "../../../-legacy-markdown-help";
import { ProjectHeader, ProjectMenu } from "../../$projectName";

const LEGACY_LINK_PROPS = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};

function insulateModalButtonClick(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
  event.stopPropagation();
}

export const Route = createFileRoute("/$ownerName/$projectName/issue/$issueNumber")({
  component: ProjectIssueDetailRoute,
});

function ProjectIssueDetailRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { issueNumber } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname.endsWith(`/issue/${issueNumber}/editform`)) {
    return <Outlet />;
  }

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectIssueDetailScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectIssueDetailScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName, issueNumber } = Route.useParams();
  const numericIssueNumber = Number(issueNumber) || 0;
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const sessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));
  const issueQuery = useQuery({
    queryFn: () => readIssueDetail(runtimeConfig, ownerName, projectName, numericIssueNumber),
    queryKey: ["project-issue-detail", ownerName, projectName, numericIssueNumber],
  });
  const issueTitle = stringField(issueQuery.data?.title);
  useProjectIssueDetailDocumentTitle(runtimeConfig, issueTitle);
  const labelsQuery = useQuery(
    listProjectLabelsQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const openMilestonesQuery = useQuery({
    queryFn: () =>
      listProjectMilestones(runtimeConfig, ownerName, projectName, {
        orderBy: "dueDate",
        orderDir: "asc",
        state: "open",
      }),
    queryKey: ["project", ownerName, projectName, "milestones", "open", "issue-detail"],
  });
  const closedMilestonesQuery = useQuery({
    queryFn: () =>
      listProjectMilestones(runtimeConfig, ownerName, projectName, {
        orderBy: "dueDate",
        orderDir: "asc",
        state: "closed",
      }),
    queryKey: ["project", ownerName, projectName, "milestones", "closed", "issue-detail"],
  });

  if (!projectQuery.data || !sessionQuery.data) {
    return null;
  }

  const projectSearchScope = {
    organizationName: projectSearchScopeOrganizationName(projectQuery.data, ownerName),
    ownerName,
    projectName,
  };

  if (issueQuery.error instanceof RestApiError && issueQuery.error.status === 404) {
    return (
      <SiteLayoutShell projectSearchScope={projectSearchScope} runtimeConfig={runtimeConfig}>
        <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
        <ProjectMenu active="issue" basePath={runtimeConfig.basePath} project={projectQuery.data} />
        <ProjectIssueNotFoundBody ownerName={ownerName} projectName={projectName} />
      </SiteLayoutShell>
    );
  }

  if (
    !issueQuery.data ||
    !labelsQuery.data ||
    !openMilestonesQuery.data ||
    !closedMilestonesQuery.data
  ) {
    return null;
  }

  return (
    <SiteLayoutShell projectSearchScope={projectSearchScope} runtimeConfig={runtimeConfig}>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu active="issue" basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <IssueDetailAssets
        basePath={runtimeConfig.basePath}
        ownerName={ownerName}
        projectName={projectName}
        supportedLanguages={runtimeConfig.supportedLanguages}
      />
      <IssueDetailBody
        basePath={runtimeConfig.basePath}
        currentUserLoginId={stringField(sessionQuery.data.loginId)}
        currentUserIsAnonymous={booleanField(sessionQuery.data.isAnonymous)}
        issue={issueQuery.data}
        labels={labelsQuery.data.labels}
        milestones={{
          closed: closedMilestonesQuery.data.milestones,
          open: openMilestonesQuery.data.milestones,
        }}
        project={projectQuery.data}
        runtimeConfig={runtimeConfig}
      />
      <CommentDeleteModalScripts basePath={runtimeConfig.basePath} />
    </SiteLayoutShell>
  );
}

function useProjectIssueDetailDocumentTitle(runtimeConfig: RuntimeConfig, issueTitle: string) {
  useEffect(() => {
    const doc = globalThis["document"];
    if (!doc || issueTitle === "") {
      return;
    }

    const siteName = runtimeConfig.siteName ?? "Yona";
    doc.title = issueTitle;

    return () => {
      doc.title = siteName;
    };
  }, [issueTitle, runtimeConfig.siteName]);
}

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const organizationName = stringField(project.organizationName, "");
  if (organizationName) {
    return organizationName;
  }
  return booleanField(project.isProtected) ? ownerName : undefined;
}

function IssueDetailAssets({
  basePath,
  ownerName,
  projectName,
  supportedLanguages,
}: {
  basePath: string;
  ownerName: string;
  projectName: string;
  supportedLanguages?: string[];
}) {
  return (
    <>
      <link
        rel="stylesheet"
        type="text/css"
        href={prefixBasePath(basePath, "/assets/javascripts/lib/highlight/styles/default.css")}
      />
      <script
        defer
        type="text/javascript"
        src={prefixBasePath(basePath, "/assets/javascripts/lib/highlight/highlight.pack.js")}
      ></script>
      <script
        defer
        type="text/javascript"
        src={prefixBasePath(basePath, "/assets/javascripts/lib/marked.js")}
      ></script>
      <IssueDetailSelect2Partial basePath={basePath} supportedLanguages={supportedLanguages} />
      <script
        defer
        type="text/javascript"
        src={prefixBasePath(basePath, "/assets/javascripts/lib/moment-with-langs.min.js")}
      ></script>
      <script
        defer
        type="text/javascript"
        src={prefixBasePath(basePath, "/assets/javascripts/lib/pikaday/pikaday.js")}
      ></script>
      <script
        defer
        type="text/javascript"
        src={prefixBasePath(basePath, "/assets/javascripts/common/yobi.ui.Calendar.js")}
      ></script>
      <link
        rel="stylesheet"
        type="text/css"
        media="screen"
        href={prefixBasePath(basePath, `/${ownerName}/${projectName}/issue/labels.css`)}
      />
      <link
        rel="stylesheet"
        type="text/css"
        media="screen"
        href={prefixBasePath(basePath, "/assets/javascripts/lib/atjs/jquery.atwho.css")}
      />
      <link
        rel="stylesheet"
        type="text/css"
        media="screen"
        href={prefixBasePath(basePath, "/assets/javascripts/lib/elevator/jquery.elevator.css")}
      />
      <link
        rel="stylesheet"
        type="text/css"
        media="screen"
        href={prefixBasePath(basePath, "/assets/javascripts/lib/videojs/video-js.min.css")}
      />
      <script
        defer
        type="text/javascript"
        src={prefixBasePath(basePath, "/assets/javascripts/lib/atjs/jquery.caret.min.js")}
      ></script>
      <script
        defer
        type="text/javascript"
        src={prefixBasePath(basePath, "/assets/javascripts/lib/atjs/jquery.atwho.js")}
      ></script>
      <script
        defer
        type="text/javascript"
        src={prefixBasePath(basePath, "/assets/javascripts/lib/elevator/jquery.elevator.js")}
      ></script>
      <script
        defer
        type="text/javascript"
        src={prefixBasePath(basePath, "/assets/javascripts/lib/videojs/video.min.js")}
      ></script>
      <script
        defer
        type="text/javascript"
        src={prefixBasePath(basePath, "/assets/javascripts/lib/favico/favico.min.js")}
      ></script>
      <script
        defer
        type="text/javascript"
        src={prefixBasePath(basePath, "/assets/javascripts/service/yona.issue.Assginee.js")}
      ></script>
      <script
        defer
        type="text/javascript"
        src={prefixBasePath(basePath, "/assets/javascripts/service/yona.issue.Sharer.js")}
      ></script>
      <script
        defer
        type="text/javascript"
        src={prefixBasePath(basePath, "/assets/javascripts/service/yona.detectChange.js")}
      ></script>
      <script
        defer
        type="text/javascript"
        src={prefixBasePath(basePath, "/assets/javascripts/common/yona.Sha1.js")}
      ></script>
      <script
        defer
        type="text/javascript"
        src={prefixBasePath(basePath, "/assets/javascripts/common/yona.Tasklist.js")}
      ></script>
      <script
        defer
        type="text/javascript"
        src={prefixBasePath(basePath, "/assets/javascripts/common/yona.SubComment.js")}
      ></script>
      <script
        defer
        type="text/javascript"
        src={prefixBasePath(
          basePath,
          "/assets/javascripts/common/yona.CommentAttachmentsUpdate.js",
        )}
      ></script>
      <script
        defer
        type="text/javascript"
        src={prefixBasePath(basePath, "/assets/javascripts/common/yona.ReceiverList.js")}
      ></script>
    </>
  );
}

function IssueDetailSelect2Partial({
  basePath,
  supportedLanguages,
}: {
  basePath: string;
  supportedLanguages?: string[];
}) {
  const language = resolveInitialLanguage(supportedLanguages);
  const localeScript =
    language === "ko-KR"
      ? "/assets/javascripts/lib/select2/select2_locale_ko.js"
      : language === "ja-JP"
        ? "/assets/javascripts/lib/select2/select2_locale_ja.js"
        : "";

  return (
    <>
      <script
        defer
        src={prefixBasePath(basePath, "/assets/javascripts/lib/select2/select2.js")}
      ></script>
      <script
        defer
        src={prefixBasePath(basePath, "/assets/javascripts/common/yobi.ui.Select2.js")}
      ></script>
      {localeScript ? <script defer src={prefixBasePath(basePath, localeScript)}></script> : null}
    </>
  );
}

function ProjectIssueNotFoundBody({
  ownerName,
  projectName,
}: {
  ownerName: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="error-wrap">
          <i className="ico ico-err2"></i>
          <p>{t("error.notfound.issue_post")}</p>
          <Link to={`/${ownerName}/${projectName}/issues?state=all`} className="ybtn ybtn-primary">
            {t("button.list")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function IssueDetailBody({
  basePath,
  currentUserLoginId,
  currentUserIsAnonymous,
  issue,
  labels: projectLabels,
  milestones,
  project,
  runtimeConfig,
}: {
  basePath: string;
  currentUserLoginId: string;
  currentUserIsAnonymous: boolean;
  issue: RestIssueDetailResponse;
  labels: YonaRecord[];
  milestones: {
    closed: ProjectMilestone[];
    open: ProjectMilestone[];
  };
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useLegacyMessages();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sharerListOpen, setSharerListOpen] = useState(false);
  const [translatedBodyMarkdown, setTranslatedBodyMarkdown] = useState<string | null>(null);
  const [translatePending, setTranslatePending] = useState(false);
  const ownerName = stringField(issue.ownerName);
  const projectName = stringField(issue.projectName);
  const issueNumber = stringField(issue.issueNumber);
  const issueId = stringField(issue.issueId, issueNumber);
  const issueHref = prefixBasePath(basePath, `/${ownerName}/${projectName}/issue/${issueNumber}`);
  const editIssuePath = `/${ownerName}/${projectName}/issue/${issueNumber}/editform`;
  const issueState = stringField(issue.state, "open").toLowerCase();
  const stateLabel = issueState === "closed" ? "Closed" : "Open";
  const createdLabel = stringField(issue.createdLabel);
  const isDraft = booleanField(issue.isDraft);
  const isWatching = booleanField(issue.isWatching);
  const [isWatchingIssue, setIsWatchingIssue] = useState(isWatching);
  const isFavorited = booleanField(issue.isFavorited);
  const [isFavoritedIssue, setIsFavoritedIssue] = useState(isFavorited);
  const canUpdate = booleanField(issue.viewerCanUpdate);
  const canDelete = booleanField(issue.viewerCanDelete);
  const canBeDeleted = issue.canBeDeleted !== false;
  const canComment = booleanField(issue.viewerCanComment);
  const canWatch = issue.viewerCanWatch !== false;
  const hasVoted = booleanField(issue.hasVoted);
  const [hasVotedIssue, setHasVotedIssue] = useState(hasVoted);
  const translationApiEnabled = booleanField(issue.translationApiEnabled);
  const labels = (issue.labels ?? []).slice().sort(compareLabels);
  const selectableLabels = (projectLabels ?? []).slice().sort(compareLabels);
  const canManageProjectLabels = booleanField(project.viewerCanUpdate);
  const hasProjectMilestones = milestones.open.length > 0 || milestones.closed.length > 0;
  const showIssue = projectMenuEnabled(project, "issue");
  const showMilestone = projectMenuEnabled(project, "milestone");
  const voters = issue.issueVoters ?? [];
  const parentIssueId = stringField(issue.parentIssueId, issueId);
  const newSubtaskPath = `/${ownerName}/${projectName}/issueform?parentIssueId=${parentIssueId}`;
  const assigneeLoginId = stringField(issue.assigneeLoginId);
  const sharers = issue.sharers ?? [];
  const sharerValue = sharers.map((sharer) => stringField(sharer.loginId)).join(",");
  const sharerListVisible = sharers.length > 0 || sharerListOpen;
  const sharerListClassName = [
    "sharer-list",
    sharers.length ? "" : "hideFromDisplayOnly",
    sharerListOpen ? "sharer-list-border" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const sharerListStyle = sharerListOpen ? { display: "block" } : undefined;
  const bodyMarkdown = translatedBodyMarkdown ?? stringField(issue.bodyMarkdown);
  const bodyChecksum = stringField(issue.bodyChecksum, "body-sha1");
  const historyMarkdown = stringField(issue.historyMarkdown);
  const issueUpdateMillis = stringField(issue.issueUpdateMillis, "0");
  const dueDateLabel = stringField(issue.dueDateLabel);
  const dueDateStatusLabel = booleanField(issue.dueDateOverdue)
    ? "Overdue"
    : stringField(issue.dueDateUntilLabel);
  const shouldShowDueDateStatus = dueDateLabel !== "" && issueState === "open";
  const weight = numberField(issue.weight);
  const [commentDeleteRequestUri, setCommentDeleteRequestUri] = useState<string | null>(null);
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteIssue(runtimeConfig, csrfToken, { issueNumber, ownerName, projectName });
    },
    onSuccess() {
      queryClient.removeQueries({
        queryKey: ["project-issue-detail", ownerName, projectName, Number(issueNumber) || 0],
      });
      queryClient.invalidateQueries({ queryKey: ["project", ownerName, projectName, "issues"] });
      router.history.push(prefixBasePath(basePath, `/${ownerName}/${projectName}/issues`));
    },
  });
  const commentDeleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteIssueComment(runtimeConfig, csrfToken, {
        commentId,
        issueNumber,
        ownerName,
        projectName,
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: ["project-issue-detail", ownerName, projectName, Number(issueNumber) || 0],
      });
      setCommentDeleteRequestUri(null);
    },
  });
  const commentVoteMutation = useMutation({
    mutationFn: async ({ commentId, hasVoted }: { commentId: string; hasVoted: boolean }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      const input = { commentId, issueNumber, ownerName, projectName };
      return hasVoted
        ? unvoteIssueComment(runtimeConfig, csrfToken, input)
        : voteIssueComment(runtimeConfig, csrfToken, input);
    },
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: ["project-issue-detail", ownerName, projectName, Number(issueNumber) || 0],
      });
    },
  });
  const favoriteIssueMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return toggleFavoriteIssue(runtimeConfig, csrfToken, {
        issueNumber,
        ownerName,
        projectName,
      });
    },
    onSuccess(response) {
      const nextIsFavorited =
        typeof response.isFavorited === "boolean" ? response.isFavorited : !isFavoritedIssue;
      setIsFavoritedIssue((current) =>
        typeof response.isFavorited === "boolean" ? response.isFavorited : !current,
      );
      queryClient.setQueryData<RestIssueDetailResponse>(
        ["project-issue-detail", ownerName, projectName, Number(issueNumber) || 0],
        (current) => (current ? { ...current, isFavorited: nextIsFavorited } : current),
      );
    },
  });
  const watchIssueMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      const input = { issueNumber, ownerName, projectName };
      return isWatchingIssue
        ? unwatchIssue(runtimeConfig, csrfToken, input)
        : watchIssue(runtimeConfig, csrfToken, input);
    },
    onSuccess(response) {
      const nextIsWatching =
        typeof response.isWatching === "boolean" ? response.isWatching : !isWatchingIssue;
      setIsWatchingIssue(nextIsWatching);
      queryClient.setQueryData<RestIssueDetailResponse>(
        ["project-issue-detail", ownerName, projectName, Number(issueNumber) || 0],
        (current) => (current ? { ...current, isWatching: nextIsWatching } : current),
      );
    },
  });
  const voteIssueMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      const input = { issueNumber, ownerName, projectName };
      return hasVotedIssue
        ? unvoteIssue(runtimeConfig, csrfToken, input)
        : voteIssue(runtimeConfig, csrfToken, input);
    },
    onSuccess(response) {
      const nextHasVoted =
        typeof response.hasVoted === "boolean" ? response.hasVoted : !hasVotedIssue;
      setHasVotedIssue(nextHasVoted);
      queryClient.setQueryData<RestIssueDetailResponse>(
        ["project-issue-detail", ownerName, projectName, Number(issueNumber) || 0],
        (current) =>
          current
            ? {
                ...current,
                hasVoted: nextHasVoted,
                issueVoters: response.issueVoters,
                voterCount: response.voterCount,
              }
            : current,
      );
    },
  });
  async function translateIssueBody() {
    if (translatePending || translatedBodyMarkdown !== null) {
      return;
    }
    setTranslatePending(true);
    try {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      const translatedMarkdown = await translateLegacyResource(runtimeConfig, csrfToken, {
        number: Number(issueNumber) || 0,
        owner: ownerName,
        projectName,
        type: "issue",
      });
      setTranslatedBodyMarkdown(translatedMarkdown);
    } finally {
      setTranslatePending(false);
    }
  }

  const openDeleteModal = (event: MouseEvent<HTMLButtonElement>) => {
    insulateModalButtonClick(event);
    setDeleteModalOpen(true);
  };

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap board-view">
        <div className="board-header issue">
          <div className="pull-right mr10 mt10 hide-in-mobile">
            <div className="date" title={createdLabel}>
              {createdLabel}
            </div>
            <span className={`badge badge-issue-${issueState}`}>{stateLabel}</span>
          </div>
          <div className="title">
            {issue.parentIssueId ? <span className="subtask-mark">subtask</span> : null}
            <strong className="board-id">
              {isDraft ? <span className="draft-number">#Draft</span> : issueNumber}
            </strong>
            {issue.title}
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
            <span
              className="favorite-issue"
              data-issue-id={issueId}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                favoriteIssueMutation.mutate();
              }}
            >
              <i className={`${isFavoritedIssue ? "starred " : ""}star material-icons va-text-top`}>
                star
              </i>
            </span>
            <div className="pull-right hide show-in-mobile" style={{ fontSize: "0.7em" }}>
              <span className="date" title={createdLabel}>
                {createdLabel}
              </span>
              <span className={`badge badge-small badge-issue-${issueState}`}>{stateLabel}</span>
            </div>
          </div>
          {isDraft ? (
            <div className="draft">
              This is an draft issue. Only you can see it until you publish.
            </div>
          ) : null}
        </div>
        <div className="board-body row-fluid">
          <div className="span9 span-left-pane">
            <div className="author-info">
              <Link
                to="/$user"
                params={{ user: stringField(issue.authorLoginId) }}
                className="usf-group"
                activeOptions={{ exact: true }}
              >
                <span className="avatar-wrap smaller">
                  <img src={stringField(issue.authorAvatarUrl)} width="20" height="20" alt="" />
                </span>
                {issue.authorLoginId ? (
                  <>
                    <strong className="name">{stringField(issue.authorLabel)}</strong>
                    <span className="loginid">
                      {" "}
                      <strong>@</strong>
                      {stringField(issue.authorLoginId)}
                    </span>
                  </>
                ) : (
                  <strong className="name">No author</strong>
                )}
              </Link>
              <IssuePostingHistory
                historyMarkdown={historyMarkdown}
                loginTo={`/users/loginform?redirectUrl=/${ownerName}/${projectName}/issue/${issueNumber}`}
                isAnonymous={currentUserIsAnonymous}
                updatedByAuthorLabel={stringField(issue.updatedByAuthorLabel)}
                updatedLabel={stringField(issue.updatedLabel)}
              />
            </div>
            {bodyMarkdown ? (
              <>
                <div id={`issue-${issueNumber}`} className="hide">
                  <form
                    action={prefixBasePath(
                      basePath,
                      `/api/v1/projects/${ownerName}/${projectName}/issues/${issueNumber}/content`,
                    )}
                  >
                    <textarea defaultValue={bodyMarkdown}></textarea>
                  </form>
                </div>
                <div id={`issue-body-${issueNumber}`}>
                  <TasklistBar />
                  <div className="content markdown-wrap" data-allowed-update={String(canUpdate)}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{bodyMarkdown}</ReactMarkdown>
                  </div>
                </div>
              </>
            ) : (
              <div className="content empty-content"></div>
            )}
            <div
              className="attachments"
              id="attachments"
              data-attachments={JSON.stringify(issue.attachments ?? [])}
            >
              <AttachedFiles attachments={issue.attachments} basePath={basePath} />
            </div>
            <div className="board-actrow right-txt">
              <div className="pull-left">
                <div>
                  {canWatch ? (
                    <button
                      id="watch-button"
                      type="button"
                      className={`ybtn ${isWatchingIssue ? "ybtn-watching" : ""}`}
                      data-toggle="tooltip"
                      data-placement="top"
                      title="Watch this issue"
                      data-watching={String(isWatchingIssue)}
                      onClick={() => watchIssueMutation.mutate()}
                    >
                      {isWatchingIssue ? t("issue.unwatch") : t("issue.watch")}
                    </button>
                  ) : null}
                  {canUpdate ? (
                    <button
                      id="issue-share-button"
                      type="button"
                      className="ybtn"
                      data-toggle="popover"
                      data-trigger="hover"
                      data-placement="top"
                      data-content="You can share this issue with a user or all members of a project. If this project is private, then shared users can only access this issue and its subtasks."
                      onClick={() => setSharerListOpen(true)}
                    >
                      Issue Sharing
                    </button>
                  ) : null}
                  <span className="project-btn-item hide show-in-mobile-inline ml4">
                    <Link to={newSubtaskPath} className="ybtn ybtn-success">
                      New subtask
                    </Link>
                  </span>
                  <IssueWeight
                    issueNumber={issueNumber}
                    ownerName={ownerName}
                    projectName={projectName}
                    runtimeConfig={runtimeConfig}
                    weight={weight}
                  />
                </div>
              </div>
              <IssueVote
                canComment={canComment}
                hasVoted={hasVotedIssue}
                issue={issue}
                issueHref={issueHref}
                onIssueVote={() => voteIssueMutation.mutate()}
                voters={voters}
              />
              {translationApiEnabled ? (
                <button
                  type="button"
                  id="translate"
                  className="icon btn-transparent-with-fontsize-lineheight ml10"
                  data-toggle="tooltip"
                  title="Translation"
                  disabled={translatePending || translatedBodyMarkdown !== null}
                  onClick={() => void translateIssueBody()}
                >
                  <i className="yobicon-lang"></i>
                </button>
              ) : null}
              <IssueActionButtons
                canBeDeleted={canBeDeleted}
                canDelete={canDelete}
                canUpdate={canUpdate}
                issueNumber={issueNumber}
                onEditClick={() => void router.navigate({ to: editIssuePath })}
                onDeleteClick={openDeleteModal}
                ownerName={ownerName}
                projectName={projectName}
              />
            </div>
            <dl className={sharerListClassName} style={sharerListStyle}>
              <dt className="issue-share-title mb10">
                Issue Sharer{" "}
                <span className="num issue-sharer-count">
                  {sharers.length ? ` ${String(sharers.length)}` : ""}
                </span>
              </dt>
              <dd
                id="sharer-list"
                className={sharerListVisible ? "" : "hideFromDisplayOnly"}
                style={sharerListStyle}
              >
                {canUpdate ? (
                  <input
                    type="hidden"
                    className="bigdrop width100p"
                    id="issueSharer"
                    name="issueSharer"
                    placeholder="Select Issue Sharer"
                    defaultValue={sharerValue}
                    title=""
                  />
                ) : (
                  sharers.map((sharer) => {
                    const loginId = stringField(sharer.loginId);
                    return (
                      <div className="text-ellipsis sharer-item" key={loginId}>
                        <Link
                          to="/$user"
                          params={{ user: loginId }}
                          className="usf-group"
                          activeOptions={{ exact: true }}
                        >
                          <strong className="name">{stringField(sharer.userLabel)}</strong>
                        </Link>
                      </div>
                    );
                  })
                )}
              </dd>
            </dl>
            <div className="watcher-list"></div>
            <IssueChildIssues currentUserLoginId={currentUserLoginId} issue={issue} />
            {!isDraft ? (
              <IssueMainTimeline
                basePath={basePath}
                currentUserIsAnonymous={currentUserIsAnonymous}
                currentUserLoginId={currentUserLoginId}
                issue={issue}
                onCommentDeleteRequest={setCommentDeleteRequestUri}
                onCommentVote={(commentId, voted) =>
                  commentVoteMutation.mutate({ commentId, hasVoted: voted })
                }
                runtimeConfig={runtimeConfig}
              />
            ) : null}
          </div>
          <div className="span3 span-right-pane mb20">
            <div className="issue-info">
              <form
                id="issueUpdateForm"
                action={prefixBasePath(basePath, `/${ownerName}/${projectName}/issues`)}
                method="post"
              >
                <input type="hidden" name="issues[0].id" value={issueId} />
                <dl>
                  {showIssue ? (
                    <dd className="project-btn-item">
                      <Link to={newSubtaskPath} className="ybtn ybtn-success">
                        New subtask
                      </Link>
                    </dd>
                  ) : null}
                  <dt>Assignee</dt>
                  <dd>
                    {canUpdate ? (
                      <input
                        type="hidden"
                        className="bigdrop"
                        id="assignee"
                        name="assigneeLoginId"
                        placeholder="No assignee"
                        defaultValue={assigneeLoginId}
                        style={{ width: "100%" }}
                        title=""
                      />
                    ) : assigneeLoginId ? (
                      <Link
                        to="/$user"
                        params={{ user: assigneeLoginId }}
                        className="usf-group"
                        activeOptions={{ exact: true }}
                      >
                        <span className="avatar-wrap smaller">
                          <img
                            src={stringField(
                              issue.assigneeAvatarUrl,
                              "/assets/images/default-avatar-32.png",
                            )}
                            width="20"
                            height="20"
                            alt=""
                          />
                        </span>
                        <strong className="name">{stringField(issue.assigneeLabel)}</strong>
                        <span className="loginid">
                          {" "}
                          <strong>@</strong>
                          {assigneeLoginId}
                        </span>
                      </Link>
                    ) : (
                      <div>No assignee</div>
                    )}
                  </dd>
                </dl>
                {showMilestone ? (
                  <dl>
                    <dt>Milestone</dt>
                    <dd>
                      {hasProjectMilestones ? (
                        canUpdate ? (
                          <IssueMilestoneSelect issue={issue} milestones={milestones} />
                        ) : issue.milestoneId ? (
                          <Link
                            {...LEGACY_LINK_PROPS}
                            to={`/${ownerName}/${projectName}/milestone/${String(issue.milestoneId)}`}
                          >
                            {stringField(issue.milestoneTitle)}
                          </Link>
                        ) : (
                          "No milestone"
                        )
                      ) : (
                        <Link
                          {...LEGACY_LINK_PROPS}
                          to={`/${ownerName}/${projectName}/newMilestoneForm`}
                          className="ybtn ybtn-small ybtn-fullsize"
                          target="_blank"
                        >
                          New milestone
                        </Link>
                      )}
                    </dd>
                  </dl>
                ) : null}
                <dl>
                  <dt>
                    Due date
                    <span
                      className={
                        booleanField(issue.dueDateOverdue)
                          ? "duedate-status overdue"
                          : "duedate-status "
                      }
                    >
                      {shouldShowDueDateStatus && dueDateStatusLabel
                        ? `(${dueDateStatusLabel})`
                        : ""}
                    </span>
                  </dt>
                  <dd>
                    {canUpdate ? (
                      <div className="search search-bar">
                        <input
                          type="text"
                          name="dueDate"
                          defaultValue={dueDateLabel}
                          className="textbox full"
                          autoComplete="off"
                          data-toggle="calendar"
                        />
                        <button type="button" className="search-btn btn-calendar">
                          <i className="yobicon-calendar2"></i>
                        </button>
                      </div>
                    ) : (
                      dueDateLabel || "No due date"
                    )}
                  </dd>
                </dl>
                {selectableLabels.length > 0 && canUpdate ? (
                  <IssueLabelSelect
                    canManageLabels={canManageProjectLabels}
                    labels={selectableLabels}
                    ownerName={ownerName}
                    projectName={projectName}
                    selectedLabelIds={new Set(labels.map((label) => stringField(label.id)))}
                  />
                ) : selectableLabels.length > 0 ? (
                  <IssueSelectedLabels
                    issueState={issueState}
                    labels={labels}
                    ownerName={ownerName}
                    projectName={projectName}
                  />
                ) : null}
                <div className="act-row right-menu-icons">
                  <IssueActionButtons
                    canBeDeleted={canBeDeleted}
                    canDelete={canDelete}
                    canUpdate={canUpdate}
                    issueNumber={issueNumber}
                    onEditClick={() => void router.navigate({ to: editIssuePath })}
                    onDeleteClick={openDeleteModal}
                    ownerName={ownerName}
                    projectName={projectName}
                    wrap={false}
                  />
                </div>
              </form>
              <IssueIndexTimeline currentUserLoginId={currentUserLoginId} issue={issue} />
            </div>
          </div>
        </div>
        <div>
          <input type="hidden" id="issueBodyChecksum" value={bodyChecksum} />
          <input type="hidden" id="numOfComments" value={String(issue.commentCount ?? 0)} />
          <input type="hidden" id="issueUpdateDate" value={issueUpdateMillis} />
        </div>
        <div className="board-footer">
          <IssueDetailKeymap project={project} />
        </div>
      </div>
      <DeleteConfirm
        issueHref={issueHref}
        open={deleteModalOpen}
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
      <CommentDeleteConfirm
        confirmLabel={t("button.yes")}
        message={t("common.comment.delete.confirm")}
        onCancel={() => setCommentDeleteRequestUri(null)}
        onConfirm={(requestUri) => {
          const commentId = requestUri.match(/\/comment\/(\d+)(?:\/delete)?(?:[?#].*)?$/u)?.[1];
          if (commentId) {
            commentDeleteMutation.mutate(commentId);
          }
        }}
        open={commentDeleteRequestUri !== null}
        requestUri={commentDeleteRequestUri}
        title={t("common.comment.delete")}
        cancelLabel={t("button.no")}
      />
    </div>
  );
}

function CommentDeleteModalScripts({ basePath }: { basePath: string }) {
  return (
    <script
      defer
      type="text/javascript"
      src={prefixBasePath(basePath, "/assets/javascripts/common/yobi.Comment.js")}
    ></script>
  );
}

function IssuePostingHistory({
  historyMarkdown,
  isAnonymous,
  loginTo,
  updatedByAuthorLabel,
  updatedLabel,
}: {
  historyMarkdown: string;
  isAnonymous: boolean;
  loginTo: string;
  updatedByAuthorLabel: string;
  updatedLabel: string;
}) {
  const { t } = useLegacyMessages();
  const [open, setOpen] = useState(false);
  const openHistory = (event: MouseEvent<HTMLButtonElement>) => {
    insulateModalButtonClick(event);
    setOpen(true);
  };
  const closeHistory = (event: MouseEvent<HTMLButtonElement>) => {
    insulateModalButtonClick(event);
    setOpen(false);
  };

  if (!historyMarkdown) {
    return null;
  }

  if (isAnonymous) {
    return (
      <div className="posting-history">
        <Link to={loginTo}>{t("change.history")}</Link>
      </div>
    );
  }

  return (
    <div className="posting-history">
      <button
        type="button"
        data-toggle="modal"
        data-target="#-yona-posting-history"
        onClick={openHistory}
      >
        {updatedByAuthorLabel || updatedLabel ? (
          <span className="lastUpdatedBy">
            <span>{updatedByAuthorLabel}</span>
            <span>{updatedLabel}</span>
          </span>
        ) : null}
        <span>{t("change.edited")}</span>
      </button>
      <div id="-yona-posting-history" className={open ? "modal in" : "modal hide"}>
        <div className="modal-header">
          <button type="button" className="close" data-dismiss="modal" onClick={closeHistory}>
            ×
          </button>
          <h5 className="nm">{t("change.history")}</h5>
        </div>
        <div className="modal-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{historyMarkdown}</ReactMarkdown>
        </div>
        <div className="modal-footer">
          <button className="ybtn ybtn-info ybtn-small" data-dismiss="modal" onClick={closeHistory}>
            {t("button.confirm")}
          </button>
        </div>
      </div>
      {open ? <div className="modal-backdrop in"></div> : null}
    </div>
  );
}

function IssueVote({
  canComment,
  hasVoted,
  issue,
  issueHref,
  onIssueVote,
  voters,
}: {
  canComment: boolean;
  hasVoted: boolean;
  issue: RestIssueDetailResponse;
  issueHref: string;
  onIssueVote: () => void;
  voters: VoterLike[];
}) {
  const [votersOpen, setVotersOpen] = useState(false);
  const ownerName = stringField(issue.ownerName);
  const projectName = stringField(issue.projectName);
  const issueNumber = stringField(issue.issueNumber);
  const voteHref = `${issueHref}/${hasVoted ? "unvote" : "vote"}`;
  const openVotersDialog = (event: MouseEvent<HTMLButtonElement>) => {
    insulateModalButtonClick(event);
    setVotersOpen(true);
  };
  const closeVotersDialog = (event: MouseEvent<HTMLButtonElement>) => {
    insulateModalButtonClick(event);
    setVotersOpen(false);
  };

  return (
    <>
      <div id="vote" className={`vote-wrap ${voters.length ? "voter-exists" : ""}`}>
        {canComment ? (
          <button
            type="button"
            className={hasVoted ? "ybtn-watching" : ""}
            title={hasVoted ? "Unvote this issue" : "Vote this issue"}
            data-request-uri={voteHref}
            data-toggle="tooltip"
            onClick={onIssueVote}
          >
            <span className="heart">
              <i className="yobicon-hearts"></i>
            </span>
          </button>
        ) : (
          <span
            className="ybtn-disabled"
            style={{ color: "#777" }}
            data-toggle="tooltip"
            title="Please log in."
            data-login="required"
          >
            <span className="heart">
              <i className="yobicon-hearts"></i>
            </span>
          </span>
        )}
        {voters.length ? <IssueVoterAvatars onOpen={openVotersDialog} voters={voters} /> : null}
      </div>
      {voters.length ? (
        <IssueVoterListDialog
          id="voters"
          open={votersOpen}
          ownerName={ownerName}
          onClose={closeVotersDialog}
          projectName={projectName}
          issueNumber={issueNumber}
          voters={voters}
        />
      ) : null}
    </>
  );
}

function IssueVoterAvatars({
  onOpen,
  voters,
}: {
  onOpen: (event: MouseEvent<HTMLButtonElement>) => void;
  voters: VoterLike[];
}) {
  const visibleVoters = voters.slice(0, 3);
  const overflowVoters = voters.slice(3);
  const overflowTitle = overflowVoters
    .slice(0, 5)
    .map((voter) => `${stringField(voter.userLabel)} <br>`)
    .join("");

  return (
    <div className="voter-list-wrap">
      <ul className="voter-list">
        {visibleVoters.map((voter) => (
          <li key={stringField(voter.loginId)}>
            <Link
              {...LEGACY_LINK_PROPS}
              to="/$user"
              params={{ user: stringField(voter.loginId) }}
              className="avatar-wrap smaller"
              title={stringField(voter.userLabel)}
            >
              <img src={stringField(voter.avatarUrl)} alt="" />
            </Link>
          </li>
        ))}
        {overflowVoters.length ? (
          <li data-toggle="tooltip" data-html="true" title={overflowTitle}>
            <button type="button" data-toggle="modal" data-target="#voters" onClick={onOpen}>
              {`and ${overflowVoters.length} others`}
            </button>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function IssueVoterListDialog({
  id,
  onClose,
  open = false,
  voters,
}: {
  id: string;
  issueNumber?: string;
  onClose?: (event: MouseEvent<HTMLButtonElement>) => void;
  open?: boolean;
  ownerName?: string;
  projectName?: string;
  voters: VoterLike[];
}) {
  return (
    <>
      <div id={id} className={open ? "modal voters-dialog in" : "modal hide voters-dialog"}>
        <div className="modal-header">
          <button type="button" className="close" data-dismiss="modal" onClick={onClose}>
            ×
          </button>
          <h5 className="nm">Issue Voters</h5>
        </div>
        <div className="modal-body">
          <ul className="unstyled">
            {voters.map((voter) => (
              <li key={stringField(voter.loginId)}>
                <Link
                  {...LEGACY_LINK_PROPS}
                  to="/$user"
                  params={{ user: stringField(voter.loginId) }}
                  className="usf-group"
                  target="_blank"
                >
                  <span className="avatar-wrap mlarge">
                    <img src={stringField(voter.avatarUrl)} width="40" height="40" alt="" />
                  </span>
                  <strong className="name">{stringField(voter.userLabel)}</strong>
                  <span className="loginid">
                    {" "}
                    <strong>@</strong>
                    {stringField(voter.loginId)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="modal-footer">
          <button
            id="copyEmailBtn"
            className="ybtn ybtn-info ybtn-small"
            data-clipboard-text={voters
              .map(
                (voter) => `${stringField(voter.userLabel)} <${stringField(voter.emailAddress)}>;`,
              )
              .join("")}
          >
            Copy email
          </button>
          <button className="ybtn ybtn-info ybtn-small" data-dismiss="modal" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      {open ? <div className="modal-backdrop in"></div> : null}
    </>
  );
}

function IssueWeight({
  issueNumber,
  ownerName,
  projectName,
  runtimeConfig,
  weight,
}: {
  issueNumber: string;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  weight: number;
}) {
  const queryClient = useQueryClient();
  const [currentWeight, setCurrentWeight] = useState(weight);
  const weightMutation = useMutation({
    mutationFn: async (direction: "downvote" | "upvote") => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return updateIssueWeight(
        runtimeConfig,
        csrfToken,
        {
          issueNumber,
          ownerName,
          projectName,
        },
        direction === "upvote" ? 1 : -1,
      );
    },
    onSuccess(payload) {
      if (typeof payload.weight === "number") {
        setCurrentWeight(payload.weight);
      }
      queryClient.invalidateQueries({
        queryKey: ["project-issue-detail", ownerName, projectName, Number(issueNumber) || 0],
      });
    },
  });

  return (
    <span className="issue-weight">
      <span className="divider">|</span>
      <button
        id="upvote-issue-weight"
        className="ybtn ybtn-small"
        data-toggle="tooltip"
        onClick={() => weightMutation.mutate("upvote")}
        title="Issue weight: Upvote"
      >
        <i className="yobicon-arrow-up-alt"></i>
      </button>
      <button
        className="ybtn ybtn-small"
        id="down-vote-issue-weight"
        data-toggle="tooltip"
        onClick={() => weightMutation.mutate("downvote")}
        title="Issue weight: Down vote"
      >
        <i className="yobicon-arrow-down-alt"></i>
      </button>
      <span
        className="weight-number"
        data-toggle="popover"
        data-trigger="hover"
        data-placement="top"
        data-content="Issue weight description"
      >
        {currentWeight}
      </span>
    </span>
  );
}

function IssueMilestoneSelect({
  issue,
  milestones,
}: {
  issue: RestIssueDetailResponse;
  milestones: {
    closed: ProjectMilestone[];
    open: ProjectMilestone[];
  };
}) {
  const selectedMilestoneId = stringField(issue.milestoneId);

  return (
    <select
      id="milestone"
      name="milestone.id"
      data-toggle="select2"
      data-format="milestone"
      data-container-css-class="fullsize"
      defaultValue={selectedMilestoneId || "-1"}
    >
      <option value="-1">No milestone</option>
      <optgroup label="Open">
        {milestones.open.map((milestone) => (
          <option
            key={stringField(milestone.id)}
            value={stringField(milestone.id)}
            data-state={stringField(milestone.state, "open")}
          >
            {stringField(milestone.title)}
          </option>
        ))}
      </optgroup>
      <optgroup label="Closed">
        {milestones.closed.map((milestone) => (
          <option
            key={stringField(milestone.id)}
            value={stringField(milestone.id)}
            data-state={stringField(milestone.state, "closed")}
          >
            {stringField(milestone.title)}
          </option>
        ))}
      </optgroup>
    </select>
  );
}

function IssueLabelSelect({
  canManageLabels,
  labels,
  ownerName,
  projectName,
  selectedLabelIds,
}: {
  canManageLabels: boolean;
  labels: YonaRecord[];
  ownerName: string;
  projectName: string;
  selectedLabelIds: Set<string>;
}) {
  const categoryGroups = new Map<
    string,
    {
      categoryId: string;
      categoryIsExclusive: string;
      categoryName: string;
      labels: YonaRecord[];
    }
  >();
  for (const label of labels) {
    const categoryName = stringField(label.categoryName);
    if (!categoryGroups.has(categoryName)) {
      categoryGroups.set(categoryName, {
        categoryId: stringField(label.categoryId),
        categoryIsExclusive: String(booleanField(label.categoryIsExclusive)),
        categoryName,
        labels: [],
      });
    }
    categoryGroups.get(categoryName)?.labels.push(label);
  }

  return (
    <dl>
      <dt>
        Label{" "}
        {canManageLabels ? (
          <Link
            {...LEGACY_LINK_PROPS}
            to={`/${ownerName}/${projectName}/issue/labelsform`}
            target="_blank"
            className="label-edit"
          >
            [Edit]
          </Link>
        ) : null}
      </dt>
      <dd>
        <select
          id="labelIds"
          name="labelIds"
          multiple
          data-search="labelIds"
          data-toggle="select2"
          data-format="issuelabel"
          data-allow-clear="true"
          data-dropdown-css-class="issue-labels"
          data-container-css-class="issue-labels bordered fullsize"
          data-placeholder="Select label"
          data-close-on-select="false"
          className="hide"
        >
          <option></option>
          {Array.from(categoryGroups.values()).map((group) => (
            <optgroup
              key={`${group.categoryId}:${group.categoryName}`}
              label={group.categoryName}
              data-category-id={group.categoryId}
              data-category-is-exclusive={group.categoryIsExclusive}
            >
              {group.labels.map((label) => {
                const labelId = stringField(label.id);
                const categoryId = stringField(label.categoryId);
                const categoryIsExclusive = String(booleanField(label.categoryIsExclusive));
                const isSelected = selectedLabelIds.has(labelId);
                return (
                  <option
                    key={labelId}
                    value={labelId}
                    data-category-id={categoryId}
                    data-category-is-exclusive={categoryIsExclusive}
                    ref={
                      isSelected
                        ? (option) => {
                            if (option) {
                              option.defaultSelected = true;
                            }
                          }
                        : undefined
                    }
                  >
                    {stringField(label.name)}
                  </option>
                );
              })}
            </optgroup>
          ))}
        </select>
      </dd>
    </dl>
  );
}

function IssueSelectedLabels({
  issueState,
  labels,
  ownerName,
  projectName,
}: {
  issueState: string;
  labels: YonaRecord[];
  ownerName: string;
  projectName: string;
}) {
  if (!labels?.length) {
    return null;
  }

  const listPath = `/${ownerName}/${projectName}/issues?state=${encodeURIComponent(issueState)}`;

  return (
    <dl>
      <dt>Label</dt>
      <dd>
        {labels.map((label) => (
          <Link
            {...LEGACY_LINK_PROPS}
            to={`${listPath}&labelIds=${encodeURIComponent(String(label.id))}`}
            className="label issue-label active static"
            key={String(label.id)}
            style={{ background: stringField(label.color) }}
          >
            {label.name}
          </Link>
        ))}
      </dd>
    </dl>
  );
}

type IssueDetailChildItem = NonNullable<RestIssueDetailResponse["childIssues"]>[number];

function IssueChildIssues({
  currentUserLoginId,
  issue,
}: {
  currentUserLoginId: string;
  issue: RestIssueDetailResponse;
}) {
  const ownerName = stringField(issue.ownerName);
  const projectName = stringField(issue.projectName);
  const issueNumber = stringField(issue.issueNumber);
  const parentIssueNumber = stringField(issue.parentIssueNumber, issueNumber);
  const parentIssueTitle = stringField(issue.parentIssueTitle, issue.title);
  const parentIssueState = stringField((issue as YonaRecord).parentIssueState, issue.state);
  const childOpenCount = numberField(issue.childOpenCount);
  const childClosedCount = numberField(issue.childClosedCount);
  const totalCount = childOpenCount + childClosedCount;
  const isCurrentIssueParent = issue.parentIssueId == null;
  const isDirectSharedChildIssue =
    booleanField(issue.viewerIsDirectSharer) && issue.parentIssueId != null;
  const children = issue.childIssues ?? [];
  const visibleChildren = [
    ...(booleanField(issue.isDraft)
      ? children.filter(
          (child) =>
            booleanField(child.isDraft) &&
            stringField(child.authorLoginId, "") === currentUserLoginId,
        )
      : []),
    ...children.filter(
      (child) => !booleanField(child.isDraft) && stringField(child.state) !== "closed",
    ),
    ...children.filter((child) => stringField(child.state) === "closed"),
  ];

  if (isDirectSharedChildIssue || (!totalCount && visibleChildren.length === 0)) {
    return <div className="subtasks"></div>;
  }

  const percentage = totalCount ? Math.trunc((childClosedCount / totalCount) * 100) : 0;
  const assigneeLabel = isCurrentIssueParent ? stringField(issue.assigneeLabel) : "";

  return (
    <div className="subtasks">
      <div className="child-issues">
        <div className="issue-item parent-issue">
          <Link
            {...LEGACY_LINK_PROPS}
            to="/$ownerName/$projectName/issue/$issueNumber"
            params={{ ownerName, projectName, issueNumber: parentIssueNumber }}
            className={isCurrentIssueParent ? "bold" : ""}
          >
            {`#${parentIssueNumber} ${parentIssueTitle}${assigneeLabel ? ` - ${assigneeLabel}` : ""}`}
          </Link>
          <div className={`upload-progress ${percentage === 100 ? "done-outline" : "red-outline"}`}>
            <div
              className={`bar ${percentage === 100 ? "done" : "red"}`}
              style={{ width: `${percentage}%` }}
              title="Subtask"
            ></div>
          </div>
          <span className={percentage === 100 ? " txt-green" : " "}>
            {percentage === 100 ? "" : `${childClosedCount}/`}
            {totalCount}{" "}
          </span>
          <span className={`parent-issue-state ${parentIssueState}`}>
            {parentIssueState === "closed" ? "Closed" : "Open"}
          </span>
        </div>
        <hr className="parent-issue-delimeter" />
        <div className="child-issues">
          {visibleChildren.map((child) => (
            <IssueChildIssue
              child={child}
              currentIssueNumber={issueNumber}
              key={`${stringField(child.state)}-${stringField(child.issueNumber)}`}
              ownerName={ownerName}
              projectName={projectName}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function IssueChildIssue({
  child,
  currentIssueNumber,
  ownerName,
  projectName,
}: {
  child: IssueDetailChildItem;
  currentIssueNumber: string;
  ownerName: string;
  projectName: string;
}) {
  const issueNumber = stringField(child.issueNumber);
  const state = booleanField(child.isDraft) ? "draft" : stringField(child.state, "open");
  const isClosed = state === "closed";
  const labels = (child.labels ?? []).slice().sort(compareLabels);

  return (
    <div
      className={`issue-item ${issueNumber === currentIssueNumber ? "selected-child" : ""} child-issue`}
    >
      <span className={`state-label ${state}`}>
        {isClosed ? <i className=" yobicon-checkmark"></i> : null}
      </span>
      <Link
        {...LEGACY_LINK_PROPS}
        className="twoColumeModeTarget"
        to="/$ownerName/$projectName/issue/$issueNumber"
        params={{ ownerName, projectName, issueNumber }}
      >
        <span className="item-name">
          <span className="subtask-number">
            {booleanField(child.isDraft) ? (
              <span className="draft-number">#Draft</span>
            ) : (
              `#${issueNumber}`
            )}
          </span>
          <span>{stringField(child.title)}</span>
          <span>
            {stringField(child.assigneeLabel) ? ` - ${stringField(child.assigneeLabel)}` : ""}
          </span>
        </span>
      </Link>
      <span className="font12 no-border-at-child">
        <IssueChildCommentAndVotePair
          child={child}
          ownerName={ownerName}
          projectName={projectName}
        />
      </span>
      {labels.map((label) => (
        <Link
          {...LEGACY_LINK_PROPS}
          to={`/${ownerName}/${projectName}/issues?state=open&labelIds=${String(label.id)}`}
          className="label issue-label list-label active twoColumeModeTarget"
          key={String(label.id)}
          data-category-id={stringField(label.categoryId)}
          data-label-id={stringField(label.id)}
          style={{ background: stringField(label.color) }}
        >
          {label.name}
        </Link>
      ))}
      <span className="child-issue-date" title={stringField(child.createdLabel)}>
        {stringField(child.createdLabel)}
      </span>
    </div>
  );
}

function IssueChildCommentAndVotePair({
  child,
  ownerName,
  projectName,
}: {
  child: IssueDetailChildItem;
  ownerName: string;
  projectName: string;
}) {
  const commentCount = numberField(child.commentCount);
  const voterCount = numberField(child.voterCount);
  if (!commentCount && !voterCount) {
    return null;
  }

  return (
    <span className="item-count-groups">
      {commentCount ? (
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/issue/$issueNumber"
          params={{ ownerName, projectName, issueNumber: stringField(child.issueNumber) }}
          hash="comments"
          className="comments-count comments-count-color"
        >
          <span className="count-groups item-icon">
            <i className="yobicon-comment2"></i>
          </span>
          <span className="count-groups item-count">{commentCount}</span>
        </Link>
      ) : null}
      {voterCount ? (
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/issue/$issueNumber"
          params={{ ownerName, projectName, issueNumber: stringField(child.issueNumber) }}
          hash="vote"
          className="vote-count vote-color"
        >
          <span className="count-groups item-icon">
            <i className="yobicon-hearts"></i>
          </span>
          <span className="count-groups item-count strong">{voterCount}</span>
        </Link>
      ) : null}
    </span>
  );
}

function IssueDetailKeymap({ project }: { project: ProjectContainer }) {
  const { t } = useLegacyMessages();
  const [open, setOpen] = useState(false);
  const isMac =
    typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("macintosh");
  const ctrlKey = isMac ? "⌘" : "CTRL";
  const showPullRequest = stringField((project as Record<string, unknown>).vcs, "GIT") === "GIT";
  const showProjectSetting = booleanField((project as Record<string, unknown>).viewerCanUpdate);
  const openKeymap = (event: MouseEvent<HTMLButtonElement>) => {
    insulateModalButtonClick(event);
    setOpen(true);
  };
  const closeKeymap = (event: MouseEvent<HTMLButtonElement>) => {
    insulateModalButtonClick(event);
    setOpen(false);
  };

  return (
    <div className="pull-left" style={{ padding: "10px 0", marginLeft: "55px" }}>
      <button
        type="button"
        className="ybtn ybtn-inverse ybtn-mini"
        data-toggle="modal"
        onClick={openKeymap}
      >
        {t("title.keymap")}
      </button>
      <div
        id="helpKeys"
        className={open ? "modal fade keymap-help in" : "modal hide fade keymap-help"}
        tabIndex={-1}
        role="dialog"
        style={open ? { display: "block" } : undefined}
      >
        <div className="row-fluid">
          <div className="span3">
            <h5>{t("project.projects")}</h5>
            <KeymapEntry keys={["H"]} label={t("menu.home")} />
            <KeymapEntry keys={["B"]} label={t("menu.board")} />
            <KeymapEntry keys={["I"]} label={t("menu.issue")} />
            <KeymapEntry keys={["C"]} label={t("menu.code")} />
            <KeymapEntry keys={["M"]} label={t("milestone")} />
            {showPullRequest ? <KeymapEntry keys={["P"]} label={t("menu.pullRequest")} /> : null}
            {showProjectSetting ? <KeymapEntry keys={["Q"]} label={t("project.setting")} /> : null}
          </div>
          <div className="span9">
            <div className="row-fluid">
              <div className="span5">
                <h5>{t("title.issueDetail")}</h5>
                <KeymapEntry keys={["N"]} label={t("issue.menu.new")} />
                <KeymapEntry keys={["L"]} label={t("button.list")} />
                <KeymapEntry keys={["E"]} label={t("button.edit")} />
              </div>
              <div className="span7">
                <h5>{t("site")}</h5>
                <KeymapEntry keys={["A"]} label={t("issue.myIssue")} />
                <KeymapEntry keys={["U"]} label={t("userinfo.profile")} />
                <KeymapEntry keys={["F"]} label={t("user.menu")} />
                <KeymapEntry
                  keys={isMac ? ["CTRL", "ALT", "S"] : ["ALT", "S"]}
                  label={t("site.search")}
                />
                <KeymapEntry keys={[ctrlKey, "ENTER"]} label={t("button.submitForm")} />
              </div>
            </div>
            <div className="row-fluid mt20">
              <div className="span12">
                <h5>{t("search.menu.issue.comments")}</h5>
                <KeymapEntry
                  keys={["SHIFT", ctrlKey, "ENTER"]}
                  label={t("button.commentAndNextState.closed")}
                />
              </div>
            </div>
          </div>
        </div>
        <p className="actrow">
          <button
            type="button"
            className="ybtn ybtn-info"
            data-dismiss="modal"
            onClick={closeKeymap}
          >
            {t("button.confirm")}
          </button>
        </p>
      </div>
      {open ? <div className="modal-backdrop fade in"></div> : null}
    </div>
  );
}

function KeymapEntry({ keys, label }: { keys: string[]; label: string }) {
  return (
    <>
      {keys.map((key) => (
        <Fragment key={key}>
          {key === keys[0] ? "" : " + "}
          <span className="ybtn ybtn-small">{key}</span>
        </Fragment>
      ))}
      <span className="help-inline">{label}</span>
      <br />
    </>
  );
}

function IssueActionButtons({
  canBeDeleted,
  canDelete,
  canUpdate,
  issueNumber,
  onEditClick,
  onDeleteClick,
  ownerName,
  projectName,
  wrap = true,
}: {
  canBeDeleted: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  issueNumber: string;
  onEditClick: () => void;
  onDeleteClick: (event: MouseEvent<HTMLButtonElement>) => void;
  ownerName: string;
  projectName: string;
  wrap?: boolean;
}) {
  const buttons = (
    <span className="act-row">
      {canUpdate ? (
        <button
          type="button"
          className="icon btn-transparent-with-fontsize-lineheight ml10 pt5px"
          data-toggle="tooltip"
          title="Edit"
          onClick={onEditClick}
        >
          <i className="yobicon-edit-2"></i>
        </button>
      ) : (
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/issue/$issueNumber/editform"
          params={{ ownerName, projectName, issueNumber }}
        >
          <button
            type="button"
            className="icon btn-transparent-with-fontsize-lineheight ml10 pt5px"
            data-toggle="tooltip"
            title="See text"
          >
            <i className="yobicon-edit-2"></i>
          </button>
        </Link>
      )}
      {canBeDeleted && canDelete ? (
        <button
          type="button"
          className="icon btn-transparent-with-fontsize-lineheight ml6"
          data-toggle="modal"
          data-target="#deleteConfirm"
          title="Delete"
          onClick={onDeleteClick}
        >
          <i className="yobicon-trash"></i>
        </button>
      ) : null}
      {!canBeDeleted ? (
        <button
          type="button"
          className="icon disabled btn-transparent-with-fontsize-lineheight ml6"
          data-toggle="popover"
          data-trigger="hover"
          data-placement="top"
          data-content="Can't be deleted because of other users' comments"
        >
          <i className="yobicon-trash"></i>
        </button>
      ) : null}
    </span>
  );
  return wrap ? buttons : <>{buttons.props.children}</>;
}

type IssueComment = RestIssueDetailResponse["comments"][number];
type IssueTimelineItem = RestIssueDetailResponse["timeline"][number];
type IssueChildComment = IssueComment;
type VoterLike = {
  avatarUrl?: unknown;
  emailAddress?: unknown;
  loginId?: unknown;
  userLabel?: unknown;
};

function isTopLevelIssueComment(comment: IssueComment | IssueChildComment) {
  return stringField((comment as Record<string, unknown>).parentCommentId) === "";
}

function IssueMainTimeline({
  basePath,
  currentUserIsAnonymous,
  currentUserLoginId,
  issue,
  onCommentDeleteRequest,
  onCommentVote,
  runtimeConfig,
}: {
  basePath: string;
  currentUserIsAnonymous: boolean;
  currentUserLoginId: string;
  issue: RestIssueDetailResponse;
  onCommentDeleteRequest: (requestUri: string) => void;
  onCommentVote: (commentId: string, hasVoted: boolean) => void;
  runtimeConfig: RuntimeConfig;
}) {
  const comments = issue.comments ?? [];
  const topLevelComments = comments.filter(isTopLevelIssueComment);
  const timeline: IssueTimelineItem[] = issue.timeline?.length
    ? issue.timeline.filter((item) => !item.comment || isTopLevelIssueComment(item.comment))
    : topLevelComments.map((comment) => ({ comment, id: stringField(comment.id) }));
  const hasTimelineItems = timeline.length > 0;

  return (
    <div id="comments" className="board-comment-wrap">
      <div id="timeline">
        <div className="timeline-list">
          <div className="comment-header">
            <i></i>
            <strong>Comment</strong> <strong className="num">{topLevelComments.length}</strong>
          </div>
          <hr className="nm" />
          {hasTimelineItems ? (
            <ul className="comments">
              {timeline.map((item, index) =>
                item.comment ? (
                  <IssueCommentRow
                    basePath={basePath}
                    comment={item.comment}
                    currentUserIsAnonymous={currentUserIsAnonymous}
                    currentUserLoginId={currentUserLoginId}
                    issue={issue}
                    key={`comment-${stringField(item.comment.id)}`}
                    onCommentDeleteRequest={onCommentDeleteRequest}
                    onCommentVote={onCommentVote}
                    runtimeConfig={runtimeConfig}
                  />
                ) : (
                  <IssueEventRow
                    event={item}
                    issue={issue}
                    key={`event-${stringField(item.id)}`}
                    previousEvent={
                      index > 0 && !timeline[index - 1]?.comment ? timeline[index - 1] : undefined
                    }
                  />
                ),
              )}
            </ul>
          ) : null}
        </div>
      </div>
      <IssueCommentForm basePath={basePath} issue={issue} />
    </div>
  );
}

function IssueCommentForm({
  basePath,
  issue,
}: {
  basePath: string;
  issue: RestIssueDetailResponse;
}) {
  const ownerName = stringField(issue.ownerName);
  const projectName = stringField(issue.projectName);
  const issueNumber = stringField(issue.issueNumber);

  if (!booleanField(issue.viewerCanComment)) {
    return (
      <div
        className="write-comment-box mt20"
        title="You need to log in to add comments."
        data-login="required"
      >
        <div className="write-comment-wrap">
          <div className="textarea-box">
            <textarea className="comment disabled" disabled style={{ cursor: "text" }}></textarea>
          </div>
          <div className="right-txt mt10">
            <span className="ybtn ybtn-disabled">Add a comment</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <form
        id="comment-form"
        action={prefixBasePath(
          basePath,
          `/${ownerName}/${projectName}/issue/${issueNumber}/comments`,
        )}
        method="post"
        encType="multipart/form-data"
      >
        <div className="write-comment-box">
          <MarkdownEditor editorMode="comment-body" name="contents" value="" wrapId="contents" />
          <UploadForm resourceType="ISSUE_COMMENT" />
          <div className="write-comment-wrap">
            <div className="right-txt">
              <button type="button" className="ybtn hidden" id="dynamic-comment-btn"></button>
              <button type="submit" className="ybtn ybtn-success">
                Add a comment
              </button>
            </div>
          </div>
        </div>
      </form>
      <script
        defer
        type="text/javascript"
        src={prefixBasePath(basePath, "/assets/javascripts/common/yobi.CommentForm.js")}
      ></script>
    </>
  );
}

function UploadForm({ resourceType }: { resourceType: string }) {
  return (
    <div className="upload-wrap content-footer" data-resource-type={resourceType} id="upload">
      <div className="attach-wrap">
        <span className="help help-droppable">Drag &amp; Drop files to attach here or</span>
        <div className="btn-wrap">
          <div className="nbtn medium white fake-file-wrap">
            <i className="yobicon-upload"></i> File upload
            <input type="file" className="file" name="filePath" multiple />
          </div>
        </div>
        <span className="plain">Click upload button</span>
        <span className="help help-pastable">Paste the clipboard image</span>
      </div>
      <ul className="attached-files unstyled"></ul>
      <p className="right-txt help">
        <i className="yobicon-supportrequest"></i> Selected file will be attached when your comment
        is saved.
      </p>
    </div>
  );
}

function IssueEventRow({
  event,
  issue,
  previousEvent,
}: {
  event: IssueTimelineItem;
  issue: RestIssueDetailResponse;
  previousEvent?: IssueTimelineItem;
}) {
  const eventType = stringField(event.eventType);
  if (eventType === "ISSUE_BODY_CHANGED") {
    return null;
  }

  const eventId = stringField(event.id);
  const eventHash = `event-${eventId}`;
  const newValue = stringField(event.newValue).toLowerCase();
  const senderLoginId = stringField(event.senderLoginId);
  const senderLabel = stringField(event.senderLabel, senderLoginId);
  const ownerName = stringField(issue.ownerName);
  const projectName = stringField(issue.projectName);
  const sender = (
    <EventUserLink
      avatarUrl={stringField(event.senderAvatarUrl, "/assets/images/default-avatar-32.png")}
      label={senderLabel}
      loginId={senderLoginId}
    />
  );

  if (eventType === "ISSUE_STATE_CHANGED") {
    return (
      <li className="event" id={`event-${eventId}`}>
        <span className={`state ${newValue}`}>{issueStateLabel(newValue)}</span>
        {sender}
        {issueStateEventText(newValue)}
        <span className="date">
          <Link {...LEGACY_LINK_PROPS} to="." hash={eventHash}>
            {stringField(event.createdLabel)}
          </Link>
        </span>
      </li>
    );
  }

  if (eventType === "ISSUE_ASSIGNEE_CHANGED") {
    const targetLoginId = stringField(event.targetLoginId, stringField(event.newValue));
    const targetLabel = stringField(event.targetLabel, targetLoginId);
    return (
      <li className="event" id={`event-${eventId}`}>
        <span className="state changed">Assigned</span>
        {sender}
        {targetLoginId === senderLoginId ? " self-assigned this issue" : " assigned this issue to "}
        {targetLoginId === senderLoginId ? null : (
          <EventUserLink
            avatarUrl={stringField(event.targetAvatarUrl, "/assets/images/default-avatar-32.png")}
            label={targetLabel}
            loginId={targetLoginId}
          />
        )}
        <span className="date">
          <Link {...LEGACY_LINK_PROPS} to="." hash={eventHash}>
            {stringField(event.createdLabel)}
          </Link>
        </span>
      </li>
    );
  }

  if (eventType === "ISSUE_MILESTONE_CHANGED") {
    const milestoneId = stringField(event.milestoneId, stringField(event.newValue));
    const milestoneTitle = stringField(event.milestoneTitle, stringField(event.newValue));
    const milestone =
      milestoneId === "0" || milestoneId === "-1" ? (
        <span className="bold">None</span>
      ) : (
        <span className="bold font-blue">
          <Link
            {...LEGACY_LINK_PROPS}
            to="/$ownerName/$projectName/milestone/$milestoneId"
            params={{ ownerName, projectName, milestoneId }}
            title="Milestone"
          >
            {milestoneTitle}
          </Link>
        </span>
      );
    return (
      <li className="event" id={`event-${eventId}`}>
        <span className="state milestone-changed">Update milestone</span>
        {sender} changed milestone to {milestone}
        <span className="date">
          <Link {...LEGACY_LINK_PROPS} to="." hash={eventHash}>
            {stringField(event.createdLabel)}
          </Link>
        </span>
      </li>
    );
  }

  if (eventType === "ISSUE_MOVED") {
    const [fromOwner, fromProject] = stringField(event.oldValue).split("/");
    const fromProjectName = [fromOwner, fromProject].filter(Boolean).join("/");
    return (
      <li className="event" id={`event-${eventId}`}>
        <span className="state changed">moved</span>
        {sender} moved this issue from{" "}
        <strong>
          <Link {...LEGACY_LINK_PROPS} to={`/${fromProjectName}`} className="link">
            {fromProjectName}
          </Link>
        </strong>
        <span className="date">
          <Link {...LEGACY_LINK_PROPS} to="." hash={eventHash}>
            {stringField(event.createdLabel)}
          </Link>
        </span>
      </li>
    );
  }

  if (eventType === "ISSUE_REFERRED_FROM_COMMIT") {
    const commitId = stringField(event.newValue);
    return (
      <li className="event" id={`event-${eventId}`}>
        <span className="state changed">mentioned</span>
        {sender} mentioned this issue in{" "}
        <strong>
          Commit{" "}
          <Link
            {...LEGACY_LINK_PROPS}
            to="/$ownerName/$projectName/commit/$commitId"
            params={{ ownerName, projectName, commitId }}
            className="link"
          >
            @{commitId}
          </Link>
        </strong>
        <span className="date">
          <Link {...LEGACY_LINK_PROPS} to="." hash={eventHash}>
            {stringField(event.createdLabel)}
          </Link>
        </span>
      </li>
    );
  }

  if (eventType === "ISSUE_REFERRED_FROM_PULL_REQUEST") {
    const pullRequestNumber = stringField(event.pullRequestNumber, stringField(event.newValue));
    const pullRequestTitle = stringField(event.pullRequestTitle, pullRequestNumber);
    return (
      <li className="event" id={`event-${eventId}`}>
        <span className="state changed">mentioned</span>
        {sender} mentioned this issue in{" "}
        <strong>
          Pull request -{pullRequestNumber}{" "}
          <Link
            {...LEGACY_LINK_PROPS}
            to="/$ownerName/$projectName/pullRequest/$pullRequestNumber"
            params={{ ownerName, projectName, pullRequestNumber }}
            className="link"
          >
            {pullRequestTitle}
          </Link>
        </strong>
        <span className="date">
          <Link {...LEGACY_LINK_PROPS} to="." hash={eventHash}>
            {stringField(event.createdLabel)}
          </Link>
        </span>
      </li>
    );
  }

  if (eventType === "ISSUE_SHARER_CHANGED") {
    const added = stringField(event.newValue) !== "";
    const grouped = isSameEventTypeAndSameAction(event, previousEvent);
    const targetLoginId = stringField(
      event.targetLoginId,
      added ? stringField(event.newValue) : stringField(event.oldValue),
    );
    const target = (
      <EventUserLink
        avatarUrl={stringField(event.targetAvatarUrl, "/assets/images/default-avatar-32.png")}
        label={stringField(event.targetLabel, targetLoginId)}
        loginId={targetLoginId}
      />
    );
    return (
      <li className="event" id={`event-${eventId}`}>
        {grouped ? (
          <span className="state"></span>
        ) : (
          <span className={`state ${added ? "sharer-added" : "sharer-deleted"}`}>
            {added ? "Issue Sharer" : "Cancelled"}
          </span>
        )}
        {sender}
        {added ? " shared current issue to " : " cancelled issue sharing with "}
        {target}
        <span className="date">
          <Link {...LEGACY_LINK_PROPS} to="." hash={eventHash}>
            {stringField(event.createdLabel)}
          </Link>
        </span>
      </li>
    );
  }

  if (eventType === "ISSUE_LABEL_CHANGED") {
    const added = stringField(event.newValue) !== "";
    const grouped = isSameEventTypeAndSameAction(event, previousEvent);
    const label = issueEventLabelBox(
      added ? stringField(event.newValue) : stringField(event.oldValue),
      issue.labels,
    );
    return (
      <li className="event" id={`event-${eventId}`}>
        {grouped ? (
          <span className="state"></span>
        ) : (
          <span className={`state ${added ? "label-added" : "label-deleted"}`}>
            {added ? "Added" : "Removed"}
          </span>
        )}
        {sender}
        {added ? " added " : " removed "}
        {label} label
        <span className="date">
          <Link {...LEGACY_LINK_PROPS} to="." hash={eventHash}>
            {stringField(event.createdLabel)}
          </Link>
        </span>
      </li>
    );
  }

  return (
    <li className="event" id={`event-${eventId}`}>
      {stringField(event.newValue)} by {sender}
      <span className="date">
        <Link {...LEGACY_LINK_PROPS} to="." hash={eventHash}>
          {stringField(event.createdLabel)}
        </Link>
      </span>
    </li>
  );
}

function EventUserLink({
  avatarUrl,
  label,
  loginId,
}: {
  avatarUrl: string;
  label: string;
  loginId: string;
}) {
  return (
    <>
      <Link
        {...LEGACY_LINK_PROPS}
        to="/$user"
        params={{ user: loginId }}
        className="usf-group"
        title={label}
      >
        <img src={avatarUrl} className="avatar-wrap small" alt="" />
      </Link>
      <Link
        {...LEGACY_LINK_PROPS}
        to="/$user"
        params={{ user: loginId }}
        className="usf-group"
        title={loginId}
      >
        <strong>{label}</strong>
      </Link>
    </>
  );
}

function IssueCommentRow({
  basePath,
  comment,
  currentUserIsAnonymous,
  currentUserLoginId,
  issue,
  onCommentDeleteRequest,
  onCommentVote,
  runtimeConfig,
}: {
  basePath: string;
  comment: IssueComment;
  currentUserIsAnonymous: boolean;
  currentUserLoginId: string;
  issue: RestIssueDetailResponse;
  onCommentDeleteRequest: (requestUri: string) => void;
  onCommentVote: (commentId: string, hasVoted: boolean) => void;
  runtimeConfig: RuntimeConfig;
}) {
  const commentId = stringField(comment.id);
  const commentHash = `comment-${commentId}`;
  const authorLoginId = stringField(comment.authorLoginId);
  const authorLabel = stringField(comment.authorLabel);
  const issueNumber = stringField(issue.issueNumber);
  const ownerName = stringField(issue.ownerName);
  const projectName = stringField(issue.projectName);
  const deleteUri = prefixBasePath(
    basePath,
    `/${ownerName}/${projectName}/issue/${issueNumber}/comment/${commentId}`,
  );
  const canUpdate = booleanField(comment.viewerCanUpdate);
  const canRead = comment.viewerCanRead !== false;
  const canDelete = booleanField(comment.viewerCanDelete);
  const hasVoted = booleanField(comment.viewerHasVoted);
  const isAuthorComment = authorLoginId !== "" && authorLoginId === currentUserLoginId;
  const [translatedContentsMarkdown, setTranslatedContentsMarkdown] = useState<string | null>(null);
  const [translatePending, setTranslatePending] = useState(false);
  const [replyVisible, setReplyVisible] = useState(false);
  const [childFormOpen, setChildFormOpen] = useState(false);
  const [commentEditOpen, setCommentEditOpen] = useState(false);
  const translationApiEnabled = booleanField(issue.translationApiEnabled);
  const contentsMarkdown = translatedContentsMarkdown ?? stringField(comment.contentsMarkdown);
  const voters = comment.voters ?? [];
  const childComments = Array.isArray(comment.childComments)
    ? (comment.childComments as IssueChildComment[])
    : [];
  const hasCurrentUserMention = hasLegacyMention(comment.contentsMarkdown, currentUserLoginId);

  async function translateComment() {
    if (translatePending || translatedContentsMarkdown !== null) {
      return;
    }
    setTranslatePending(true);
    try {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      const translatedMarkdown = await translateLegacyResource(runtimeConfig, csrfToken, {
        number: Number(commentId) || 0,
        owner: ownerName,
        projectName,
        type: "issue-comment",
      });
      setTranslatedContentsMarkdown(translatedMarkdown);
    } finally {
      setTranslatePending(false);
    }
  }

  return (
    <li
      className={`comment ${isAuthorComment ? "author " : ""}${hasCurrentUserMention ? "mentioned" : ""}`}
      id={`comment-${commentId}`}
      onMouseEnter={() => setReplyVisible(true)}
      onMouseLeave={() => {
        if (!childFormOpen) {
          setReplyVisible(false);
        }
      }}
    >
      <ChildCommentAnchors childComments={childComments} />
      <div className="comment-avatar">
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$user"
          params={{ user: authorLoginId }}
          className="avatar-wrap"
          title={authorLoginId}
        >
          <img
            src={stringField(comment.authorAvatarUrl)}
            width="32"
            height="32"
            alt={authorLabel}
          />
        </Link>
      </div>
      <div className="media-body">
        <div className="meta-info">
          <span className="comment_author">
            <span className="resp-comment-avatar">
              <Link
                {...LEGACY_LINK_PROPS}
                to="/$user"
                params={{ user: authorLoginId }}
                className="avatar-wrap"
                title={authorLabel}
              >
                <img
                  src={stringField(comment.authorAvatarUrl)}
                  width="32"
                  height="32"
                  alt={authorLoginId}
                />
              </Link>
            </span>
            <Link
              {...LEGACY_LINK_PROPS}
              to="/$user"
              params={{ user: authorLoginId }}
              title={authorLoginId}
            >
              <strong>{authorLabel}</strong>
            </Link>
          </span>
          <span className="ago-date">
            <Link
              {...LEGACY_LINK_PROPS}
              to="."
              hash={commentHash}
              className="ago"
              title={stringField(comment.createdLabel)}
            >
              {stringField(comment.createdLabel)}
            </Link>
            <Link
              {...LEGACY_LINK_PROPS}
              to="."
              hash={commentHash}
              className="share-link"
              style={{ display: "none" }}
            >
              [Link]
            </Link>
          </span>
          <span className="act-row pull-right">
            <span className="new-issue-by">
              <Link {...LEGACY_LINK_PROPS} to={`/user/issues/new?commentId=${commentId}`}>
                Reference in new issue
              </Link>
            </span>
            <CommentVoters commentId={commentId} voters={voters} />
            {hasVoted ? (
              <button
                type="button"
                className="btn-transparent-with-fontsize-lineheight"
                title="Withdraw"
                data-request-type="comment-vote"
                data-request-uri={prefixBasePath(
                  basePath,
                  `/${ownerName}/${projectName}/issue/${issueNumber}/comment/${commentId}/unvote`,
                )}
                onClick={(event) => {
                  event.preventDefault();
                  onCommentVote(commentId, hasVoted);
                }}
              >
                <i className="yobicon-hearts vote-heart-on"></i>
              </button>
            ) : currentUserIsAnonymous ? (
              <i className="yobicon-hearts vote-heart-off vote-heart-disable-hover"></i>
            ) : (
              <button
                type="button"
                className="btn-transparent-with-fontsize-lineheight"
                title="Agree"
                data-request-type="comment-vote"
                data-request-uri={prefixBasePath(
                  basePath,
                  `/${ownerName}/${projectName}/issue/${issueNumber}/comment/${commentId}/vote`,
                )}
                onClick={(event) => {
                  event.preventDefault();
                  onCommentVote(commentId, hasVoted);
                }}
              >
                <i className="yobicon-hearts vote-heart-off"></i>
              </button>
            )}
            {translationApiEnabled ? (
              <button
                type="button"
                className="icon btn-transparent-with-fontsize-lineheight ml10 comment-translate"
                data-toggle="tooltip"
                data-comment-id={commentId}
                title="Translation"
                disabled={translatePending || translatedContentsMarkdown !== null}
                onClick={() => void translateComment()}
              >
                <i className="yobicon-lang"></i>
              </button>
            ) : null}
            {canRead ? (
              <button
                type="button"
                className="btn-transparent-with-fontsize-lineheight ml10"
                data-toggle="comment-edit"
                data-comment-id={commentId}
                title="Edit comment"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setCommentEditOpen((current) => !current);
                  setChildFormOpen(false);
                  setReplyVisible(false);
                }}
              >
                <i className="yobicon-edit-2"></i>
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                className="btn-transparent-with-fontsize-lineheight ml6"
                data-toggle="comment-delete"
                data-request-uri={deleteUri}
                title="Delete comment"
                onClick={(event) => {
                  insulateModalButtonClick(event);
                  onCommentDeleteRequest(deleteUri);
                }}
              >
                <i className="yobicon-trash"></i>
              </button>
            ) : null}
          </span>
        </div>
        <CommentUpdateForm
          basePath={basePath}
          canUpdate={canUpdate}
          comment={comment}
          contentsMarkdown={contentsMarkdown}
          formOpen={commentEditOpen}
          issue={issue}
          showNotification={isAuthorComment}
          onCancel={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setCommentEditOpen(false);
          }}
        />
        <div
          id={`comment-body-${commentId}`}
          style={commentEditOpen ? { display: "none" } : undefined}
        >
          <TasklistBar />
          <div
            className="comment-body markdown-wrap"
            data-allowed-update={String(canUpdate)}
            data-via-email={String(booleanField(comment.viaEmail))}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{contentsMarkdown}</ReactMarkdown>
          </div>
          <div
            className="attachments pull-left"
            data-attachments={JSON.stringify(comment.attachments ?? [])}
          >
            <AttachedFiles attachments={comment.attachments} basePath={basePath} />
          </div>
        </div>
      </div>
      <ChildComments
        basePath={basePath}
        childComments={childComments}
        closeForm={() => {
          setChildFormOpen(false);
          setReplyVisible(true);
        }}
        formOpen={childFormOpen}
        issue={issue}
        onCommentDeleteRequest={onCommentDeleteRequest}
        parentCommentId={commentId}
        replyVisible={replyVisible}
        toggleForm={() => {
          setChildFormOpen((current) => !current);
          setReplyVisible(true);
        }}
      />
    </li>
  );
}

function ChildCommentAnchors({ childComments }: { childComments: IssueChildComment[] }) {
  return (
    <>
      {childComments.map((comment) => (
        <div id={`comment-${stringField(comment.id)}`} key={stringField(comment.id)}></div>
      ))}
    </>
  );
}

function ChildComments({
  basePath,
  childComments,
  closeForm,
  formOpen,
  issue,
  onCommentDeleteRequest,
  parentCommentId,
  replyVisible,
  toggleForm,
}: {
  basePath: string;
  childComments: IssueChildComment[];
  closeForm: () => void;
  formOpen: boolean;
  issue: RestIssueDetailResponse;
  onCommentDeleteRequest: (requestUri: string) => void;
  parentCommentId: string;
  replyVisible: boolean;
  toggleForm: () => void;
}) {
  const ownerName = stringField(issue.ownerName);
  const projectName = stringField(issue.projectName);
  const issueNumber = stringField(issue.issueNumber);
  const isMac =
    typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("macintosh");
  const replyShortcutKey = isMac ? "⌘" : "CTRL";
  const newCommentAction = prefixBasePath(
    basePath,
    `/${ownerName}/${projectName}/issue/${issueNumber}/comments`,
  );
  const [notificationVisible, setNotificationVisible] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className="add-a-comment pull-right"
        onClick={() => {
          toggleForm();
          if (!formOpen) {
            requestAnimationFrame(() => textareaRef.current?.focus());
          }
        }}
        style={replyVisible ? { display: "block" } : undefined}
      >
        Reply
      </div>
      <div className="subcomment-media-body">
        <div className="child-comments">
          {childComments.map((comment) => (
            <ChildComment
              basePath={basePath}
              comment={comment}
              issue={issue}
              key={stringField(comment.id)}
              onCommentDeleteRequest={onCommentDeleteRequest}
            />
          ))}
        </div>
        {booleanField(issue.viewerCanComment) ? (
          <div
            className="child-comment-input-form"
            style={formOpen ? { display: "block", visibility: "visible" } : undefined}
          >
            <form action={newCommentAction} method="post" encType="multipart/form-data">
              <input
                className="parentCommentId"
                type="hidden"
                name="parentCommentId"
                value={parentCommentId}
              />
              <div className="oneline-comment-box">
                <textarea
                  ref={textareaRef}
                  className="editorSeries"
                  name="contents"
                  rows={1}
                  placeholder={`Reply (${replyShortcutKey} + ENTER)`}
                  onFocus={() => setNotificationVisible(true)}
                  onKeyUp={(event) => {
                    if (event.key === "Escape") {
                      closeForm();
                    }
                  }}
                  {...{ markdown: "true" }}
                ></textarea>
                <button type="submit" className="ybtn ybtn-success">
                  OK
                </button>
              </div>
              <div
                className="notification-receiver"
                style={notificationVisible ? { display: "block" } : undefined}
              >
                <span className="notification-receiver-title">Notification receivers </span>
                <span className="notification-receiver-list"></span>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </>
  );
}

function ChildComment({
  basePath,
  comment,
  issue,
  onCommentDeleteRequest,
}: {
  basePath: string;
  comment: IssueChildComment;
  issue: RestIssueDetailResponse;
  onCommentDeleteRequest: (requestUri: string) => void;
}) {
  const commentId = stringField(comment.id);
  const commentHash = `comment-${commentId}`;
  const authorLoginId = stringField(comment.authorLoginId);
  const authorLabel = stringField(comment.authorLabel, authorLoginId);
  const ownerName = stringField(issue.ownerName);
  const projectName = stringField(issue.projectName);
  const issueNumber = stringField(issue.issueNumber);
  const deleteUri = prefixBasePath(
    basePath,
    `/${ownerName}/${projectName}/issue/${issueNumber}/comment/${commentId}`,
  );
  const createdLabel = stringField(comment.createdLabel);

  return (
    <div className="one-line-comment">
      <div className="contents">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {stringField(comment.contentsMarkdown)}
        </ReactMarkdown>
        <span className="subcomment-author hide">
          -{" "}
          <Link
            to="/$user"
            params={{ user: authorLoginId }}
            className="usf-group"
            title={authorLoginId}
          >
            <strong>{authorLabel}</strong>
          </Link>
          <Link
            {...LEGACY_LINK_PROPS}
            to="."
            hash={commentHash}
            className="ago"
            title={createdLabel}
          >
            {createdLabel}
          </Link>
          {booleanField(comment.viewerCanDelete) ? (
            <button
              type="button"
              className="btn-transparent deleteButtonX"
              data-toggle="comment-delete"
              data-request-uri={deleteUri}
              title="Delete comment"
              onClick={(event) => {
                insulateModalButtonClick(event);
                onCommentDeleteRequest(deleteUri);
              }}
            >
              x
            </button>
          ) : null}
        </span>
      </div>
    </div>
  );
}

function CommentUpdateForm({
  basePath,
  canUpdate,
  comment,
  contentsMarkdown,
  formOpen,
  issue,
  showNotification,
  onCancel,
}: {
  basePath: string;
  canUpdate: boolean;
  comment: IssueComment;
  contentsMarkdown: string;
  formOpen: boolean;
  issue: RestIssueDetailResponse;
  showNotification: boolean;
  onCancel: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const commentId = stringField(comment.id);
  const ownerName = stringField(issue.ownerName);
  const projectName = stringField(issue.projectName);
  const issueNumber = stringField(issue.issueNumber);
  const attachments = attachmentItems(comment.attachments);

  return (
    <div
      id={`comment-editform-${commentId}`}
      className="comment-update-form"
      style={formOpen ? { display: "block" } : undefined}
    >
      <form
        action={prefixBasePath(
          basePath,
          `/${ownerName}/${projectName}/issue/${issueNumber}/comments/${commentId}`,
        )}
        method="post"
        encType="multipart/form-data"
      >
        <input type="hidden" name="id" value={commentId} />
        <div className="write-comment-box">
          <div className="write-comment-wrap">
            <MarkdownEditor
              editorMode="update-comment-body"
              name="contents"
              value={contentsMarkdown}
              wrapId={commentId}
            />
            <div className="upload-drop-here">
              <div className="msg-wrap">
                <div className="msg">Drag &amp; Drop files here to upload.</div>
              </div>
            </div>
            <div className="right-txt comment-update-button upload-button-line">
              <span className="file-upload">
                <label htmlFor={`upload-${commentId}`} className="file-upload__label ybtn">
                  File upload
                </label>
                <input
                  id={`upload-${commentId}`}
                  className="file-upload__input"
                  type="file"
                  name="filePath"
                  multiple
                />
              </span>
              {showNotification ? (
                <span
                  className="send-notification-check"
                  data-toggle="popover"
                  data-trigger="hover"
                  data-placement="top"
                  data-content="If you are not the original author, this option will be ignored. Notification mail will be sent."
                >
                  <label className="checkbox inline">
                    <input type="checkbox" name="notificationMail" value="yes" defaultChecked />
                    <strong>Send notification mail</strong>
                  </label>
                </span>
              ) : null}
              <button
                type="button"
                className="ybtn ybtn-cancel"
                data-comment-id={commentId}
                onClick={onCancel}
              >
                Cancel
              </button>
              {canUpdate ? (
                <button type="submit" className="ybtn ybtn-info">
                  Save
                </button>
              ) : null}
            </div>
          </div>
          <input
            type="hidden"
            name="temporaryUploadFiles"
            className="temporaryUploadFiles"
            value=""
          />
          <div className={`preview-${commentId}`}></div>
          <div className="attachment-files">
            {attachments.map((file) => {
              const fileId = stringField(file.id);
              return (
                <div
                  className="attached-file attached-file-marker"
                  data-name={stringField(file.name)}
                  data-href={stringField(file.url)}
                  data-mime={stringField(file.mimeType)}
                  key={fileId}
                >
                  <i className="mimetype"></i>
                  <strong className="name">{stringField(file.name)}</strong>
                  <span className="size">
                    {stringField(file.sizeLabel, stringField(file.size))}
                  </span>
                  <button type="button" className="btn-transparent btn-delete" data-id={fileId}>
                    &times;
                  </button>
                </div>
              );
            })}
          </div>
          <div
            id={`upload-${commentId}`}
            data-resourcetype="ISSUE_COMMENT"
            data-resourceid={commentId}
          ></div>
        </div>
      </form>
    </div>
  );
}

function MarkdownEditor({
  editorMode,
  name,
  value,
  wrapId,
}: {
  editorMode: string;
  name: string;
  value: string;
  wrapId: string;
}) {
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const switchTab = (event: MouseEvent<HTMLElement>, nextTab: "edit" | "preview") => {
    event.preventDefault();
    event.stopPropagation();
    setActiveTab(nextTab);
  };

  return (
    <div data-toggle="markdown-editor" className="mt10">
      <ul className="nav nav-tabs nm small">
        <li className={activeTab === "edit" ? "active" : undefined}>
          <button
            type="button"
            data-mode="edit"
            data-toggle="tab"
            data-target={`#edit-${wrapId}`}
            onClick={(event) => switchTab(event, "edit")}
          >
            Edit
          </button>
        </li>
        <li className={activeTab === "preview" ? "active" : undefined}>
          <button
            type="button"
            data-mode="preview"
            data-toggle="tab"
            data-target={`#preview-${wrapId}`}
            onClick={(event) => switchTab(event, "preview")}
          >
            Preview
          </button>
        </li>
        <li>
          <div className="task-list-button">
            <button
              type="button"
              className="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"
            >
              <i className="yobicon-list task-list-icon"></i> Add checklist
            </button>
          </div>
        </li>
        <li>
          <div className="editor-clear-temporary">
            <div className="editor-clear-temporary-button">
              <button
                type="button"
                id="button-clear-temporary"
                className="ybtn ybtn-small ybtn-warning"
              >
                Clear Temporary
              </button>
            </div>
          </div>
        </li>
        <li>
          <div className="editor-notice-label"></div>
        </li>
      </ul>
      <div className="tab-content" style={{ position: "relative", overflow: "visible" }}>
        <LegacyMarkdownHelp />
        <div id={`edit-${wrapId}`} className={`tab-pane${activeTab === "edit" ? " active" : ""}`}>
          <div className="textarea-box">
            <textarea
              name={name}
              className="editorSeries content comment nm"
              data-editor-mode={editorMode}
              id={`editor-${name}-${wrapId}`}
              defaultValue={value}
              onFocus={() => setNotificationVisible(true)}
              {...{ markdown: "true" }}
            ></textarea>
          </div>
        </div>
        <div
          id={`preview-${wrapId}`}
          className={`tab-pane${activeTab === "preview" ? " active" : ""}`}
        >
          <div
            className={`markdown-preview markdown-wrap ${editorMode}`}
            data-via-email="false"
          ></div>
        </div>
        <div
          className="notification-receiver"
          style={notificationVisible ? { display: "block" } : undefined}
        >
          <span className="notification-receiver-title">Notification receivers </span>
          <span className="notification-receiver-list"></span>
        </div>
      </div>
    </div>
  );
}

function TasklistBar() {
  return (
    <div className="tasklist">
      <div className="task-title">
        Tasks<span className="done-counter"></span>
      </div>
      <div className="task-progress">
        <div className="bar red" style={{ width: 0 }} title="Tasklist"></div>
      </div>
    </div>
  );
}

function CommentVoters({ commentId, voters }: { commentId: string; voters: VoterLike[] }) {
  const [open, setOpen] = useState(false);
  const openDialog = (event: MouseEvent<HTMLButtonElement>) => {
    insulateModalButtonClick(event);
    setOpen(true);
  };
  const closeDialog = (event: MouseEvent<HTMLButtonElement>) => {
    insulateModalButtonClick(event);
    setOpen(false);
  };

  if (!voters.length) {
    return null;
  }

  if (voters.length > 5) {
    return (
      <>
        <span
          style={{ marginRight: "2px" }}
          data-toggle="tooltip"
          data-html="true"
          title={`${voters
            .slice(0, 5)
            .map((voter) => stringField(voter.userLabel))
            .join("\n")}\n…`}
        >
          <button
            type="button"
            className="vote-description-people"
            data-toggle="modal"
            data-target={`#voters-${commentId}`}
            onClick={openDialog}
          >
            {voters.length} Agreements
          </button>
        </span>
        <IssueVoterListDialog
          id={`voters-${commentId}`}
          onClose={closeDialog}
          open={open}
          voters={voters}
        />
      </>
    );
  }

  return (
    <>
      {voters.map((voter) => (
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$user"
          params={{ user: stringField(voter.loginId) }}
          className="avatar-wrap smaller"
          title={stringField(voter.userLabel)}
          key={stringField(voter.loginId)}
        >
          <img src={stringField(voter.avatarUrl)} alt="" />
        </Link>
      ))}
    </>
  );
}

function IssueIndexTimeline({
  currentUserLoginId,
  issue,
}: {
  currentUserLoginId: string;
  issue: RestIssueDetailResponse;
}) {
  const comments = issue.comments ?? [];
  const topLevelComments = comments.filter(isTopLevelIssueComment);
  const hasTimelineItems = topLevelComments.length > 0 || (issue.timeline?.length ?? 0) > 0;

  return (
    <div id="comments" className="board-comment-wrap">
      <div id="timeline">
        <div className="timeline-list">
          <div className="comment-header">
            <strong>Comment</strong> <strong className="num">{topLevelComments.length}</strong>
          </div>
          {hasTimelineItems ? (
            <ul className="comments">
              {topLevelComments.map((comment) => (
                <IssueIndexComment
                  comment={comment}
                  currentUserLoginId={currentUserLoginId}
                  key={stringField(comment.id)}
                />
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function IssueIndexComment({
  comment,
  currentUserLoginId,
}: {
  comment: IssueComment;
  currentUserLoginId: string;
}) {
  const router = useRouter();
  const commentId = stringField(comment.id);
  const commentHash = `comment-${commentId}`;
  const authorLoginId = stringField(comment.authorLoginId);
  const authorLabel = stringField(comment.authorLabel);
  const childComments = Array.isArray(comment.childComments)
    ? (comment.childComments as IssueChildComment[])
    : [];
  const hasCurrentUserMention = hasLegacyMention(comment.contentsMarkdown, currentUserLoginId);
  const hasCurrentUserMentionInChild = childComments.some((childComment) =>
    hasLegacyMention(childComment.contentsMarkdown, currentUserLoginId),
  );

  return (
    <li
      className={`comment index-comment ${hasCurrentUserMention ? "mentioned" : ""} ${hasCurrentUserMentionInChild ? "mentionedInChild" : ""}`}
      id={`comment-${commentId}`}
      data-location={`#comment-${commentId}`}
      onClick={(event) => {
        const target = event.target;
        if (
          target instanceof Element &&
          target.closest("a, button, input, textarea, select, label")
        ) {
          return;
        }
        void router.navigate({ to: ".", hash: commentHash });
      }}
    >
      <div>
        <div id={`comment-body-${commentId}`}>
          <div className="comment-body">
            <Link {...LEGACY_LINK_PROPS} to="." hash={commentHash}>
              {ellipsisMarkdown(stringField(comment.contentsMarkdown))}
            </Link>
          </div>
        </div>
        <div className="index-comment-author">
          {childComments.length > 0 ? (
            <span className="comment-exists">
              <i className="yobicon-comment2"></i>
              {childComments.length > 1 ? childComments.length : ""}
            </span>
          ) : null}
          <span className="comment_author">
            <Link
              {...LEGACY_LINK_PROPS}
              to="/$user"
              params={{ user: authorLoginId }}
              title={authorLoginId}
            >
              <strong>{authorLabel}</strong>
            </Link>
          </span>
          <span className="ago-date">
            <Link
              {...LEGACY_LINK_PROPS}
              to="."
              hash={commentHash}
              className="ago"
              title={stringField(comment.createdLabel)}
            >
              {stringField(comment.createdLabel)}
            </Link>
            <Link
              {...LEGACY_LINK_PROPS}
              to="."
              hash={commentHash}
              className="share-link"
              style={{ display: "none" }}
            >
              [Link]
            </Link>
          </span>
        </div>
      </div>
    </li>
  );
}

function DeleteConfirm({
  issueHref,
  onCancel,
  onConfirm,
  open,
}: {
  issueHref: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
}) {
  const closeDialog = (event: MouseEvent<HTMLButtonElement>) => {
    insulateModalButtonClick(event);
    onCancel();
  };
  const confirmDelete = (event: MouseEvent<HTMLButtonElement>) => {
    insulateModalButtonClick(event);
    onConfirm();
  };

  return (
    <>
      <div id="deleteConfirm" className={open ? "modal fade in" : "modal hide fade"}>
        <div className="modal-header">
          <button type="button" className="close" data-dismiss="modal" onClick={closeDialog}>
            ×
          </button>
          <h3>Delete issue</h3>
        </div>
        <div className="modal-body">
          <p>Are you sure you want to delete this post?</p>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="ybtn ybtn-danger"
            data-request-method="delete"
            data-request-uri={issueHref}
            onClick={confirmDelete}
          >
            Yes
          </button>
          <button type="button" className="ybtn" data-dismiss="modal" onClick={closeDialog}>
            No
          </button>
        </div>
      </div>
      {open ? <div className="modal-backdrop fade in"></div> : null}
    </>
  );
}

function CommentDeleteConfirm({
  cancelLabel,
  confirmLabel,
  message,
  onCancel,
  onConfirm,
  open,
  requestUri,
  title,
}: {
  cancelLabel: string;
  confirmLabel: string;
  message: string;
  onCancel: () => void;
  onConfirm: (requestUri: string) => void;
  open: boolean;
  requestUri: string | null;
  title: string;
}) {
  const closeDialog = (event: MouseEvent<HTMLButtonElement>) => {
    insulateModalButtonClick(event);
    onCancel();
  };
  const confirmDelete = (event: MouseEvent<HTMLButtonElement>) => {
    insulateModalButtonClick(event);
    if (requestUri) {
      onConfirm(requestUri);
    }
  };

  return (
    <>
      <div
        id="comment-delete-modal"
        className={`modal ${open ? "in " : "hide "}fade`}
        aria-hidden={open ? "false" : undefined}
      >
        <div className="modal-header">
          <button type="button" className="close" data-dismiss="modal" onClick={closeDialog}>
            ×
          </button>
          <h3>{title}</h3>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button
            id="comment-delete-confirm"
            type="button"
            className="ybtn ybtn-danger"
            data-request-method={requestUri ? "delete" : undefined}
            data-request-uri={requestUri ?? undefined}
            onClick={confirmDelete}
          >
            {confirmLabel}
          </button>
          <button type="button" className="ybtn" data-dismiss="modal" onClick={closeDialog}>
            {cancelLabel}
          </button>
        </div>
      </div>
      {open ? <div className="modal-backdrop fade in"></div> : null}
    </>
  );
}

function compareLabels(
  left: { categoryName?: unknown; name?: unknown },
  right: { categoryName?: unknown; name?: unknown },
) {
  const categoryOrder = stringField(left.categoryName).localeCompare(
    stringField(right.categoryName),
  );
  return categoryOrder || stringField(left.name).localeCompare(stringField(right.name));
}

function AttachedFiles({
  attachments,
  basePath,
}: {
  attachments?:
    | RestIssueDetailResponse["attachments"]
    | { attachments?: RestIssueDetailResponse["attachments"] };
  basePath: string;
}) {
  const { t } = useLegacyMessages();
  const files = attachmentItems(attachments);

  if (files.length === 0) {
    return null;
  }

  return (
    <ul className="attaches wm">
      {files.map((file) => {
        const id = stringField(file.id);
        const name = stringField(file.name);
        const href = stringField(file.url);
        const sizeReadable = stringField(file.sizeLabel, stringField(file.size));
        const downloadHref = attachmentDownloadHref(href);
        const downloadPath = attachmentLinkPath(basePath, downloadHref);
        const filePath = attachmentLinkPath(basePath, href);

        return (
          <li className="attach" key={`${id}:${href}:${name}`}>
            <Link
              to={downloadPath}
              href={downloadHref}
              reloadDocument
              className="download ybtn ybtn-mini"
              title={`${t("button.download")} ${name}`}
            >
              <i className="yobicon-download"></i>
            </Link>
            <Link to={filePath} href={href} reloadDocument target="_blank" className="vmiddle">
              <i className="yobicon-paperclip"></i>
              <span className="filename">{name}</span>
              <span className="filesize">({sizeReadable})</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function attachmentItems(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value as Array<Record<string, unknown>>;
  }
  if (value && typeof value === "object") {
    const nested = (value as { attachments?: unknown }).attachments;
    if (Array.isArray(nested)) {
      return nested as Array<Record<string, unknown>>;
    }
  }
  return [];
}

function attachmentDownloadHref(href: string) {
  if (href === "") {
    return "?action=download";
  }
  return href.includes("?") ? `${href}&action=download` : `${href}?action=download`;
}

function attachmentLinkPath(basePath: string, href: string) {
  if (href === "" || basePath === "" || basePath === "/") {
    return href;
  }
  if (href.startsWith(basePath)) {
    const path = href.slice(basePath.length);
    return path === "" ? "/" : path;
  }
  return href;
}

function ellipsisMarkdown(markdown: string) {
  const text = markdown
    .replace(/!?\[([^\]]*)\]\([^)]+\)/gu, "$1")
    .replace(/[*_`>#-]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
  return text.length > 60 ? `${text.slice(0, 60)}...` : text;
}

function hasLegacyMention(value: unknown, loginId: string) {
  return loginId !== "" && stringField(value).includes(`@${loginId} `);
}

function issueStateLabel(state: string) {
  return state === "closed" ? "Closed" : "Open";
}

function issueStateEventText(state: string) {
  return state === "closed" ? " closed this issue" : " reopened this issue";
}

function issueEventLabelBox(value: string, labels: RestIssueDetailResponse["labels"]) {
  const parts = value.split(" - ");
  if (parts.length !== 2) {
    return value;
  }
  const categoryName = parts[0].trim();
  const labelName = parts[1].split(" #")[0]?.trim() ?? "";
  const label = labels?.find(
    (item) =>
      stringField(item.categoryName) === categoryName && stringField(item.name) === labelName,
  );
  if (!label) {
    return labelName;
  }
  return (
    <div className="label issue-label" style={{ backgroundColor: stringField(label.color) }}>
      {labelName}
    </div>
  );
}

function isSameEventTypeAndSameAction(event: IssueTimelineItem, previousEvent?: IssueTimelineItem) {
  return (
    previousEvent !== undefined &&
    stringField(event.eventType) === stringField(previousEvent.eventType) &&
    ((isAddingEvent(event) && isAddingEvent(previousEvent)) ||
      (isDeletingEvent(event) && isDeletingEvent(previousEvent)))
  );
}

function isAddingEvent(event: IssueTimelineItem) {
  return stringField(event.oldValue) === "" && stringField(event.newValue) !== "";
}

function isDeletingEvent(event: IssueTimelineItem) {
  return stringField(event.newValue) === "" && stringField(event.oldValue) !== "";
}

function stringField(value: unknown, fallback = "") {
  return typeof value === "string"
    ? value
    : typeof value === "number" || typeof value === "bigint"
      ? String(value)
      : fallback;
}

function projectMenuEnabled(project: ProjectContainer, key: string) {
  const menuSetting = (project as Record<string, unknown>).menuSetting;
  if (!menuSetting || typeof menuSetting !== "object") {
    return true;
  }
  return (menuSetting as Record<string, unknown>)[key] !== false;
}

function numberField(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : fallback;
}

function booleanField(value: unknown) {
  return value === true;
}
