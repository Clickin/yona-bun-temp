/* oxlint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions, jsx-a11y/no-aria-hidden-on-focusable -- legacy issue detail Bootstrap modal and index-comment DOM parity keeps plain modal divs/backdrops and aria-hidden close controls while React owns behavior. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import {
  Fragment,
  type ChangeEvent,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { listProjectLabelsQueryOptions } from "../../../../api/project-labels";
import { currentSessionQueryOptions } from "../../../../api/session";
import { readProjectContainerQueryOptions } from "../../../../api/org-project";
import { translateLegacyResource } from "../../../../api/translation";
import { LegacyI18nProvider, resolveInitialLanguage, useLegacyMessages } from "../../../../i18n";
import type { ProjectContainer, ProjectMilestone, YonaRecord } from "../../../../api/types";
import { YonaQueryProvider } from "../../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../../runtime-config";
import {
  deleteIssueComment,
  deleteIssue,
  massUpdateIssues,
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
import { useRootToast } from "../../../__root";
import { ProjectHeader, ProjectMenu } from "../../$projectName";

const LEGACY_LINK_PROPS = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};

type LegacyPopoverTriggerProps = {
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
  onFocus?: (event: FocusEvent<HTMLElement>) => void;
  onMouseEnter: (event: MouseEvent<HTMLElement>) => void;
  onMouseLeave: (event: MouseEvent<HTMLElement>) => void;
};

function LegacyHoverPopover({
  children,
  content,
  focusable = false,
}: {
  children: (triggerProps: LegacyPopoverTriggerProps) => ReactNode;
  content: string;
  focusable?: boolean;
}) {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const show = (event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition({
      left: rect.left + rect.width / 2,
      top: rect.top,
    });
  };
  const hide = () => setPosition(null);
  const triggerProps: LegacyPopoverTriggerProps = {
    onMouseEnter: show,
    onMouseLeave: hide,
    ...(focusable ? { onBlur: hide, onFocus: show } : {}),
  };
  const popoverStyle: CSSProperties | undefined = position
    ? {
        display: "block",
        left: position.left,
        position: "fixed",
        top: position.top - 10,
        transform: "translate(-50%, -100%)",
      }
    : undefined;

  return (
    <>
      {children(triggerProps)}
      {position ? (
        <div className="popover top in" style={popoverStyle}>
          <div className="arrow"></div>
          <div className="popover-content">{content}</div>
        </div>
      ) : null}
    </>
  );
}

function insulateModalButtonClick(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
  event.stopPropagation();
}

function closeOnEscape(event: KeyboardEvent<HTMLElement>, close: () => void) {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    close();
  }
}

function useModalFocus(open: boolean) {
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) {
      modalRef.current?.focus();
    }
  }, [open]);
  return modalRef;
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
    retry(failureCount, error) {
      return restApiErrorStatus(error) !== 404 && failureCount < 3;
    },
  });
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

  if (restApiErrorStatus(issueQuery.error) === 404) {
    return (
      <SiteLayoutShell projectSearchScope={projectSearchScope} runtimeConfig={runtimeConfig}>
        <ProjectIssueNotFoundTitle ownerName={ownerName} projectName={projectName} />
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
      <ProjectIssueDetailTitle
        issueBodyMarkdown={stringField(issueQuery.data.bodyMarkdown)}
        issueTitle={stringField(issueQuery.data.title)}
        ownerName={ownerName}
        projectName={projectName}
      />
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
    </SiteLayoutShell>
  );
}

function ProjectIssueDetailTitle({
  issueBodyMarkdown,
  issueTitle,
  ownerName,
  projectName,
}: {
  issueBodyMarkdown: string;
  issueTitle: string;
  ownerName: string;
  projectName: string;
}) {
  if (!issueTitle) {
    return null;
  }

  const description = legacyIssueOpenGraphDescription(issueBodyMarkdown, ownerName, projectName);

  return (
    <>
      <title>{issueTitle}</title>
      <meta property="og:title" content={issueTitle} />
      <meta property="og:description" content={description} />
      <meta name="twitter:title" content={issueTitle} />
      <meta name="twitter:description" content={description} />
    </>
  );
}

function legacyIssueOpenGraphDescription(
  issueBodyMarkdown: string,
  ownerName: string,
  projectName: string,
) {
  return `${issueBodyMarkdown.slice(0, 200)} - ${ownerName}/${projectName}`;
}

function ProjectIssueNotFoundTitle({
  ownerName,
  projectName,
}: {
  ownerName: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();

  return <title>{`${t("error.notfound")} - ${ownerName}/${projectName}`}</title>;
}

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const organizationName = stringField(project.organizationName, "");
  if (organizationName) {
    return organizationName;
  }
  return booleanField(project.isProtected) ? ownerName : undefined;
}

function restApiErrorStatus(error: unknown) {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return undefined;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
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
  const editIssuePath = `/${ownerName}/${projectName}/issue/${issueNumber}/editform`;
  const issueState = stringField(issue.state, "open").toLowerCase();
  const stateLabel = issueStateLabel(issueState, t);
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
  const [dueDateValue, setDueDateValue] = useState(dueDateLabel);
  const [committedDueDateValue, setCommittedDueDateValue] = useState(dueDateLabel.trim());
  const dueDateInputRef = useRef<HTMLInputElement>(null);
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
  const dueDateMutation = useMutation({
    mutationFn: async (dueDate: string) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return massUpdateIssues(runtimeConfig, csrfToken, {
        dueDate,
        isDueDateChanged: true,
        issueNumbers: [Number(issueNumber) || 0],
        ownerName,
        projectName,
      });
    },
    onSuccess(_response, dueDate) {
      setCommittedDueDateValue(dueDate);
      queryClient.invalidateQueries({
        queryKey: ["project-issue-detail", ownerName, projectName, Number(issueNumber) || 0],
      });
    },
  });
  useEffect(() => {
    setDueDateValue(dueDateLabel);
    setCommittedDueDateValue(dueDateLabel.trim());
  }, [dueDateLabel]);
  function handleDueDateChange(event: ChangeEvent<HTMLInputElement>) {
    setDueDateValue(event.currentTarget.value);
  }
  function commitDueDateChange() {
    const trimmedDueDate = dueDateValue.trim();
    if (!isValidIssueDueDate(trimmedDueDate)) {
      dueDateInputRef.current?.focus();
      return;
    }
    if (trimmedDueDate === committedDueDateValue) {
      return;
    }
    dueDateMutation.mutate(trimmedDueDate);
  }
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
                  <strong className="name">{t("issue.noAuthor")}</strong>
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
                      data-placement="top"
                      title="Watch this issue"
                      data-watching={String(isWatchingIssue)}
                      onClick={() => watchIssueMutation.mutate()}
                    >
                      {isWatchingIssue ? t("issue.unwatch") : t("issue.watch")}
                    </button>
                  ) : null}
                  {canUpdate ? (
                    <LegacyHoverPopover content={t("issue.sharer.description")} focusable>
                      {(popoverProps) => (
                        <button
                          id="issue-share-button"
                          type="button"
                          className="ybtn"
                          onClick={() => setSharerListOpen(true)}
                          {...popoverProps}
                        >
                          {t("button.share.issue")}
                        </button>
                      )}
                    </LegacyHoverPopover>
                  ) : null}
                  <span className="project-btn-item hide show-in-mobile-inline ml4">
                    <Link to={newSubtaskPath} className="ybtn ybtn-success">
                      {t("button.newSubtask")}
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
                currentUserLoginId={currentUserLoginId}
                hasVoted={hasVotedIssue}
                issue={issue}
                onIssueVote={() => voteIssueMutation.mutate()}
                voters={voters}
              />
              {translationApiEnabled ? (
                <button
                  type="button"
                  id="translate"
                  className="icon btn-transparent-with-fontsize-lineheight ml10"
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
                {t("issue.sharer")}{" "}
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
                    placeholder={t("issue.sharer.select")}
                    defaultValue={sharerValue}
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
                        {t("button.newSubtask")}
                      </Link>
                    </dd>
                  ) : null}
                  <dt>{t("issue.assignee")}</dt>
                  <dd>
                    {canUpdate ? (
                      <input
                        type="hidden"
                        className="bigdrop"
                        id="assignee"
                        name="assigneeLoginId"
                        placeholder={t("issue.noAssignee")}
                        defaultValue={assigneeLoginId}
                        style={{ width: "100%" }}
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
                      <div>{t("issue.noAssignee")}</div>
                    )}
                  </dd>
                </dl>
                {showMilestone ? (
                  <dl>
                    <dt>{t("milestone")}</dt>
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
                          t("issue.noMilestone")
                        )
                      ) : (
                        <Link
                          {...LEGACY_LINK_PROPS}
                          to={`/${ownerName}/${projectName}/newMilestoneForm`}
                          className="ybtn ybtn-small ybtn-fullsize"
                          target="_blank"
                        >
                          {t("milestone.menu.new")}
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
                          value={dueDateValue}
                          className="textbox full"
                          autoComplete="off"
                          onBlur={commitDueDateChange}
                          onChange={handleDueDateChange}
                          ref={dueDateInputRef}
                        />
                        <button
                          type="button"
                          className="search-btn btn-calendar"
                          onClick={() => dueDateInputRef.current?.focus()}
                        >
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
        cancelLabel={t("button.no")}
        confirmLabel={t("button.yes")}
        message={t("post.delete.confirm")}
        open={deleteModalOpen}
        title={t("issue.delete")}
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
  const modalRef = useModalFocus(open);
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
      <button type="button" onClick={openHistory}>
        {updatedByAuthorLabel || updatedLabel ? (
          <span className="lastUpdatedBy">
            <span>{updatedByAuthorLabel}</span>
            <span>{updatedLabel}</span>
          </span>
        ) : null}
        <span>{t("change.edited")}</span>
      </button>
      <div
        ref={modalRef}
        id="-yona-posting-history"
        className={open ? "modal in" : "modal hide"}
        tabIndex={open ? -1 : undefined}
        onKeyDown={(event) => closeOnEscape(event, () => setOpen(false))}
      >
        <div className="modal-header">
          <button type="button" className="close" aria-hidden="true" onClick={closeHistory}>
            ×
          </button>
          <h5 className="nm">{t("change.history")}</h5>
        </div>
        <div className="modal-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{historyMarkdown}</ReactMarkdown>
        </div>
        <div className="modal-footer">
          <button className="ybtn ybtn-info ybtn-small" aria-hidden="true" onClick={closeHistory}>
            {t("button.confirm")}
          </button>
        </div>
      </div>
      {open ? <div className="modal-backdrop in" onClick={() => setOpen(false)}></div> : null}
    </div>
  );
}

function IssueVote({
  canComment,
  currentUserLoginId,
  hasVoted,
  issue,
  onIssueVote,
  voters,
}: {
  canComment: boolean;
  currentUserLoginId: string;
  hasVoted: boolean;
  issue: RestIssueDetailResponse;
  onIssueVote: () => void;
  voters: VoterLike[];
}) {
  const [votersOpen, setVotersOpen] = useState(false);
  const ownerName = stringField(issue.ownerName);
  const projectName = stringField(issue.projectName);
  const issueNumber = stringField(issue.issueNumber);
  const openVotersDialog = (event: MouseEvent<HTMLButtonElement>) => {
    insulateModalButtonClick(event);
    setVotersOpen(true);
  };
  const closeVotersDialog = () => {
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
            title="Please log in."
            data-login="required"
          >
            <span className="heart">
              <i className="yobicon-hearts"></i>
            </span>
          </span>
        )}
        {voters.length ? (
          <IssueVoterAvatars
            currentUserLoginId={currentUserLoginId}
            hasVoted={hasVoted}
            onOpen={openVotersDialog}
            voters={voters}
          />
        ) : null}
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
  currentUserLoginId,
  hasVoted,
  onOpen,
  voters,
}: {
  currentUserLoginId: string;
  hasVoted: boolean;
  onOpen: (event: MouseEvent<HTMLButtonElement>) => void;
  voters: VoterLike[];
}) {
  const currentUserVoter =
    hasVoted && currentUserLoginId
      ? voters.find((voter) => stringField(voter.loginId) === currentUserLoginId)
      : undefined;
  const otherVoters = currentUserVoter
    ? voters.filter((voter) => stringField(voter.loginId) !== currentUserLoginId)
    : voters;
  const visibleVoters = currentUserVoter
    ? [currentUserVoter, ...otherVoters.slice(0, 3)]
    : otherVoters.slice(0, 3);
  const overflowVoters = otherVoters.slice(3);
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
          <li data-html="true" title={overflowTitle}>
            <button type="button" onClick={onOpen}>
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
  onClose?: () => void;
  open?: boolean;
  ownerName?: string;
  projectName?: string;
  voters: VoterLike[];
}) {
  const modalRef = useModalFocus(open);
  const setRootToast = useRootToast();
  const { t } = useLegacyMessages();
  const emailText = voters.map(voterEmailListEntry).join("");
  const copyEmailText = async (event: MouseEvent<HTMLButtonElement>) => {
    insulateModalButtonClick(event);
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API is not available.");
      }
      await navigator.clipboard.writeText(emailText);
      setRootToast({
        key: `issue-voters-email-copy:${id}:${Date.now()}`,
        message: t("button.copy.email.success.message"),
      });
    } catch {
      setRootToast({
        key: `issue-voters-email-copy-error:${id}:${Date.now()}`,
        message: t("site.features.error.clipboard"),
      });
    }
  };

  return (
    <>
      <div
        ref={modalRef}
        id={id}
        className={open ? "modal hide voters-dialog in" : "modal hide voters-dialog"}
        style={open ? { display: "block" } : undefined}
        tabIndex={open ? -1 : undefined}
        onKeyDown={(event) => closeOnEscape(event, () => onClose?.())}
      >
        <div className="modal-header">
          <button type="button" className="close" onClick={onClose}>
            ×
          </button>
          <h5 className="nm">{t("issue.voters")}</h5>
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
          <button id="copyEmailBtn" className="ybtn ybtn-info ybtn-small" onClick={copyEmailText}>
            {t("button.copy.email")}
          </button>
          <button className="ybtn ybtn-info ybtn-small" onClick={onClose}>
            {t("button.close")}
          </button>
        </div>
      </div>
      {open ? <div className="modal-backdrop in" onClick={() => onClose?.()}></div> : null}
    </>
  );
}

function voterEmailListEntry(voter: VoterLike) {
  return `${stringField(voter.userLabel)} <${stringField(voter.emailAddress)}>;`;
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
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const [currentWeight, setCurrentWeight] = useState(weight);
  const weightLabel = t("issue.weight");
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
        onClick={() => weightMutation.mutate("upvote")}
        title={`${weightLabel}: Upvote`}
      >
        <i className="yobicon-arrow-up-alt"></i>
      </button>
      <button
        className="ybtn ybtn-small"
        id="down-vote-issue-weight"
        onClick={() => weightMutation.mutate("downvote")}
        title={`${weightLabel}: Down vote`}
      >
        <i className="yobicon-arrow-down-alt"></i>
      </button>
      <LegacyHoverPopover content={t("issue.weight.description")}>
        {(popoverProps) => (
          <span className="weight-number" {...popoverProps}>
            {currentWeight}
          </span>
        )}
      </LegacyHoverPopover>
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
  const { t } = useLegacyMessages();
  const selectedMilestoneId = stringField(issue.milestoneId);

  return (
    <select
      id="milestone"
      name="milestone.id"
      data-format="milestone"
      data-container-css-class="fullsize"
      defaultValue={selectedMilestoneId || "-1"}
    >
      <option value="-1">{t("issue.noMilestone")}</option>
      <optgroup label={t("milestone.state.open")}>
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
      <optgroup label={t("milestone.state.closed")}>
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
  const { t } = useLegacyMessages();
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
          data-format="issuelabel"
          data-allow-clear="true"
          data-dropdown-css-class="issue-labels"
          data-container-css-class="issue-labels bordered fullsize"
          data-placeholder={t("label.select")}
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
  const { t } = useLegacyMessages();
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
            {issueStateLabel(parentIssueState, t)}
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
  const modalRef = useModalFocus(open);
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
      <button type="button" className="ybtn ybtn-inverse ybtn-mini" onClick={openKeymap}>
        {t("title.keymap")}
      </button>
      <div
        ref={modalRef}
        id="helpKeys"
        className={open ? "modal fade keymap-help in" : "modal hide fade keymap-help"}
        tabIndex={-1}
        role="dialog"
        style={open ? { display: "block" } : undefined}
        onKeyDown={(event) => closeOnEscape(event, () => setOpen(false))}
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
          <button type="button" className="ybtn ybtn-info" onClick={closeKeymap}>
            {t("button.confirm")}
          </button>
        </p>
      </div>
      {open ? <div className="modal-backdrop fade in" onClick={() => setOpen(false)}></div> : null}
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
  const { t } = useLegacyMessages();
  const buttons = (
    <span className="act-row">
      {canUpdate ? (
        <button
          type="button"
          className="icon btn-transparent-with-fontsize-lineheight ml10 pt5px"
          title={t("button.edit")}
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
            title={t("button.show.original")}
          >
            <i className="yobicon-edit-2"></i>
          </button>
        </Link>
      )}
      {canBeDeleted && canDelete ? (
        <button
          type="button"
          className="icon btn-transparent-with-fontsize-lineheight ml6"
          title={t("button.delete")}
          onClick={onDeleteClick}
        >
          <i className="yobicon-trash"></i>
        </button>
      ) : null}
      {!canBeDeleted ? (
        <LegacyHoverPopover content={t("issue.can.not.be.deleted")} focusable>
          {(popoverProps) => (
            <button
              type="button"
              className="icon disabled btn-transparent-with-fontsize-lineheight ml6"
              {...popoverProps}
            >
              <i className="yobicon-trash"></i>
            </button>
          )}
        </LegacyHoverPopover>
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
  const { t } = useLegacyMessages();
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
            <span className="ybtn ybtn-disabled">{t("button.comment.new")}</span>
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
                {t("button.comment.new")}
              </button>
            </div>
          </div>
        </div>
      </form>
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
  const { t } = useLegacyMessages();
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
        <span className={`state ${newValue}`}>{issueStateLabel(newValue, t)}</span>
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
        <span className="state changed">{t("issue.state.assigned")}</span>
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
          <Link
            {...LEGACY_LINK_PROPS}
            to="/$ownerName/$projectName"
            params={{ ownerName: fromOwner, projectName: fromProject }}
            className="link"
          >
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
            {added ? t("issue.sharer") : t("issue.event.sharer.deleted.title")}
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
  const viaEmail = booleanField(comment.viaEmail);
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
            data-via-email={String(viaEmail)}
            data-yobi-original-message-processed={viaEmail ? "true" : undefined}
          >
            <OriginalMessageMarkdown contentsMarkdown={contentsMarkdown} viaEmail={viaEmail} />
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

function OriginalMessageMarkdown({
  contentsMarkdown,
  viaEmail,
}: {
  contentsMarkdown: string;
  viaEmail: boolean;
}) {
  const [showOriginalMessage, setShowOriginalMessage] = useState(false);
  const originalMessage = viaEmail ? splitOriginalMessage(contentsMarkdown) : null;

  if (!originalMessage) {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{contentsMarkdown}</ReactMarkdown>;
  }

  return (
    <>
      {originalMessage.visibleMarkdown ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{originalMessage.visibleMarkdown}</ReactMarkdown>
      ) : null}
      <button
        type="button"
        style={{ border: 0, paddingLeft: "5px", paddingRight: "5px" }}
        onClick={() => setShowOriginalMessage((current) => !current)}
      >
        ...
      </button>
      <div hidden={!showOriginalMessage}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {originalMessage.originalMarkdown}
        </ReactMarkdown>
      </div>
    </>
  );
}

function splitOriginalMessage(contentsMarkdown: string) {
  const lines = contentsMarkdown.split(/\r?\n/u);
  const delimiterIndex = lines.findIndex((line, index) => {
    if (index === 0) {
      return false;
    }
    return /^---+[^-]*---+\s*$/u.test(line.trim());
  });

  if (delimiterIndex < 0) {
    return null;
  }

  return {
    originalMarkdown: lines.slice(delimiterIndex).join("\n"),
    visibleMarkdown: lines.slice(0, delimiterIndex).join("\n"),
  };
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
                <LegacyHoverPopover
                  content="If you are not the original author, this option will be ignored. Notification mail will be sent."
                  focusable
                >
                  {(popoverProps) => (
                    <span className="send-notification-check" {...popoverProps}>
                      <label className="checkbox inline">
                        <input type="checkbox" name="notificationMail" value="yes" defaultChecked />
                        <strong>Send notification mail</strong>
                      </label>
                    </span>
                  )}
                </LegacyHoverPopover>
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
                  data-mime={stringField(file.mimeType)}
                  key={fileId}
                >
                  <i className="mimetype"></i>
                  <strong className="name">{stringField(file.name)}</strong>
                  <span className="size">
                    {stringField(file.sizeLabel, stringField(file.size))}
                  </span>
                  <button type="button" className="btn-transparent btn-delete">
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
    <div className="mt10">
      <ul className="nav nav-tabs nm small">
        <li className={activeTab === "edit" ? "active" : undefined}>
          <button type="button" onClick={(event) => switchTab(event, "edit")}>
            Edit
          </button>
        </li>
        <li className={activeTab === "preview" ? "active" : undefined}>
          <button type="button" onClick={(event) => switchTab(event, "preview")}>
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
  const closeDialog = () => {
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
          data-html="true"
          title={`${voters
            .slice(0, 5)
            .map((voter) => stringField(voter.userLabel))
            .join("\n")}\n…`}
        >
          <button type="button" className="vote-description-people" onClick={openDialog}>
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
  const navigateToComment = () => {
    void router.navigate({ to: ".", hash: commentHash });
  };

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
        navigateToComment();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigateToComment();
        }
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
  cancelLabel,
  confirmLabel,
  message,
  onCancel,
  onConfirm,
  open,
  title,
}: {
  cancelLabel: string;
  confirmLabel: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}) {
  const closeDialog = (event: MouseEvent<HTMLButtonElement>) => {
    insulateModalButtonClick(event);
    onCancel();
  };
  const confirmDelete = (event: MouseEvent<HTMLButtonElement>) => {
    insulateModalButtonClick(event);
    onConfirm();
  };
  const modalRef = useModalFocus(open);

  return (
    <>
      <div
        ref={modalRef}
        id="deleteConfirm"
        className={open ? "modal fade in" : "modal hide fade"}
        tabIndex={open ? -1 : undefined}
        onKeyDown={(event) => closeOnEscape(event, onCancel)}
      >
        <div className="modal-header">
          <button type="button" className="close" onClick={closeDialog}>
            ×
          </button>
          <h3>{title}</h3>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button type="button" className="ybtn ybtn-danger" onClick={confirmDelete}>
            {confirmLabel}
          </button>
          <button type="button" className="ybtn" onClick={closeDialog}>
            {cancelLabel}
          </button>
        </div>
      </div>
      {open ? <div className="modal-backdrop fade in" onClick={onCancel}></div> : null}
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
  const modalRef = useModalFocus(open);

  return (
    <>
      <div
        ref={modalRef}
        id="comment-delete-modal"
        className={`modal ${open ? "in " : "hide "}fade`}
        aria-hidden={open ? "false" : undefined}
        tabIndex={open ? -1 : undefined}
        onKeyDown={(event) => closeOnEscape(event, onCancel)}
      >
        <div className="modal-header">
          <button type="button" className="close" onClick={closeDialog}>
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
            onClick={confirmDelete}
          >
            {confirmLabel}
          </button>
          <button type="button" className="ybtn" onClick={closeDialog}>
            {cancelLabel}
          </button>
        </div>
      </div>
      {open ? <div className="modal-backdrop fade in" onClick={onCancel}></div> : null}
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

function issueStateLabel(state: string, t: (key: string) => string) {
  return state === "closed" ? t("issue.state.closed") : t("issue.state.open");
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

function isValidIssueDueDate(value: string) {
  return value === "" || !Number.isNaN(Date.parse(value));
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
