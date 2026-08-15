/* oxlint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions, jsx-a11y/no-aria-hidden-on-focusable, jsx-a11y/prefer-tag-over-role -- legacy issue detail Bootstrap modal, Select2 generated DOM, and index-comment DOM parity keep their visible element composition while React owns behavior. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  Fragment,
  isValidElement,
  use,
  useEffect,
  useMemo,
  useId,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, {
  defaultSchema,
  type Options as RehypeSanitizeOptions,
} from "rehype-sanitize";
import ReactMarkdown, {
  defaultUrlTransform,
  type Components,
  type ExtraProps,
} from "react-markdown";
import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/prism";
import { ghcolors } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { type IssueAssignableUserItem } from "../../../../api/issue-meta";
import { listProjectLabelsQueryOptions } from "../../../../api/project-labels";
import { listProjectMilestonesQueryOptions } from "../../../../api/milestones";
import { currentSessionQueryOptions } from "../../../../api/session";
import { readProjectContainerQueryOptions } from "../../../../api/org-project";
import { translateLegacyResource } from "../../../../api/translation";
import { useLegacyMessages } from "../../../../i18n";
import type { ProjectIssuesSearch } from "../issues";
import { useWireframeContentProgress } from "../../../../components/route-fetch-lock";
import type { ProjectContainer, ProjectMilestone, YoramRecord } from "../../../../api/types";
import { prefixBasePath, type RuntimeConfig } from "../../../../runtime-config";
import {
  createIssueComment,
  deleteIssueComment,
  deleteIssue,
  massUpdateIssues,
  readIssueDetail,
  readSessionBootstrap,
  searchIssueAssignableUsers,
  searchIssueSharableUsers,
  shareIssue,
  toggleFavoriteIssue,
  unshareIssue,
  unwatchIssue,
  unvoteIssue,
  unvoteIssueComment,
  updateIssueComment,
  updateIssueState,
  updateIssueWeight,
  voteIssue,
  voteIssueComment,
  watchIssue,
  type RestIssueDetailResponse,
} from "../../../../auth-workspace-client";
import { LastOutletTransition } from "../../../-last-outlet-transition";
import { SiteLayoutShell } from "../../../-home-route-screen";
import { ProjectNestedShellContext } from "../../$projectName";
import { useRootToast } from "../../../__root";
import legacySpriteUrl from "../../../../assets/legacy/sprite.png";
import { UploadForm } from "../../../../components/file-uploader";
import { IssueLabel } from "../../../../components/issue-label";
import { IssueDueDateInput } from "../../../../components/issue-due-date-input";
import { MarkdownEditor, type MarkdownEditorProps } from "../../../../components/markdown-editor";
import "../../../../yobicon-font.css";

const LEGACY_LINK_PROPS = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};
const LEGACY_GLOBAL_MARKDOWN_ATTRIBUTES: Record<string, true> = {
  className: true,
  height: true,
  id: true,
  width: true,
};
const ISSUE_MARKDOWN_BASE_ATTRIBUTES = Object.fromEntries(
  Object.entries(defaultSchema.attributes ?? {}).map(([tagName, attributes]) => [
    tagName,
    attributes.filter(
      (attribute) =>
        !Array.isArray(attribute) || !(String(attribute[0]) in LEGACY_GLOBAL_MARKDOWN_ATTRIBUTES),
    ),
  ]),
) as NonNullable<RehypeSanitizeOptions["attributes"]>;
const ISSUE_MARKDOWN_SANITIZE_SCHEMA: RehypeSanitizeOptions = {
  ...defaultSchema,
  clobber: [],
  attributes: {
    ...ISSUE_MARKDOWN_BASE_ATTRIBUTES,
    "*": [...(ISSUE_MARKDOWN_BASE_ATTRIBUTES["*"] ?? []), "className", "id", "width", "height"],
    a: [...(ISSUE_MARKDOWN_BASE_ATTRIBUTES.a ?? []), "href", "name", "target"],
    iframe: [
      ...(ISSUE_MARKDOWN_BASE_ATTRIBUTES.iframe ?? []),
      "width",
      "height",
      "src",
      "frameBorder",
      "allow",
      "allowFullScreen",
    ],
    input: [...(ISSUE_MARKDOWN_BASE_ATTRIBUTES.input ?? []), "type", "disabled", "checked"],
    ol: [...(ISSUE_MARKDOWN_BASE_ATTRIBUTES.ol ?? []), "start"],
    source: [...(ISSUE_MARKDOWN_BASE_ATTRIBUTES.source ?? []), "src", "type"],
    video: [
      ...(ISSUE_MARKDOWN_BASE_ATTRIBUTES.video ?? []),
      "dataSetup",
      "controls",
      "preload",
      "type",
      "autoPlay",
      "height",
      "width",
      "src",
    ],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto", "file", "zpl"],
    src: ["http", "https", "file", "zpl"],
  },
  tagNames: [
    ...new Set([
      ...(defaultSchema.tagNames ?? []),
      "video",
      "source",
      "iframe",
      "input",
      "pre",
      "br",
      "hr",
      "ol",
      "span",
    ]),
  ],
};
const issueMarkdownSyntaxTheme = {
  ...ghcolors,
  'pre[class*="language-"]': {},
  'code[class*="language-"]': {},
};

type IssueMarkdownLinkProps = ComponentPropsWithoutRef<"a"> &
  ExtraProps & {
    basePath: string;
  };

function IssueMarkdownLink({
  basePath,
  children,
  href,
  node: _node,
  rel: _rel,
  target,
  ...props
}: IssueMarkdownLinkProps) {
  if (!href) {
    return <>{children}</>;
  }
  if (props.download !== undefined) {
    return (
      <Link
        {...props}
        href={href}
        rel={target ? "noopener noreferrer" : undefined}
        target={target}
        to={toLinkTarget(basePath, href)}
      >
        {children}
      </Link>
    );
  }
  if (href.startsWith("#")) {
    return (
      <Link
        {...props}
        {...LEGACY_LINK_PROPS}
        hash={href.slice(1)}
        rel={target ? "noopener noreferrer" : undefined}
        search={true}
        target={target}
        to="."
      >
        {children}
      </Link>
    );
  }
  const internalPath = markdownInternalPath(href, basePath);
  if (internalPath) {
    return (
      <Link
        {...props}
        {...LEGACY_LINK_PROPS}
        rel={target ? "noopener noreferrer" : undefined}
        target={target}
        to={internalPath as "/"}
      >
        {children}
      </Link>
    );
  }
  // TanStack Link renders URL-string `to` as an external anchor href; a bare
  // `href` prop is overridden by the built current-location href, so external
  // and download markdown links carry the URL in `to`.
  return (
    <Link
      {...props}
      href={href}
      rel={target ? "noopener noreferrer" : undefined}
      target={target}
      to={href}
    >
      {children}
    </Link>
  );
}

function IssueMarkdownPre({
  children,
  className,
  node: _node,
  ...props
}: ComponentPropsWithoutRef<"pre"> & ExtraProps) {
  const code = Array.isArray(children) ? children[0] : children;
  if (isValidElement<{ children?: ReactNode; className?: string }>(code)) {
    const language = code.props.className?.match(/(?:^|\s)language-([^\s]+)/u)?.[1];
    if (language) {
      return (
        <SyntaxHighlighter
          language={language}
          style={issueMarkdownSyntaxTheme}
          PreTag="pre"
          codeTagProps={{
            className: code.props.className,
          }}
          data-owner="project-issue-detail-markdown-code-block"
        >
          {String(code.props.children ?? "").replace(/\n$/u, "")}
        </SyntaxHighlighter>
      );
    }
  }
  return (
    <pre {...props} className={className ?? ""} data-owner="project-issue-detail-markdown-pre">
      {children}
    </pre>
  );
}

const ISSUE_MARKDOWN_COMPONENTS: Components = {
  blockquote: ({ node: _node, ...props }) => <blockquote {...props} />,
  code: ({ className, node: _node, ...props }) => {
    return <code {...props} className={className ?? ""} />;
  },
  h1: ({ node: _node, ...props }) => <h1 {...props} />,
  h2: ({ node: _node, ...props }) => <h2 {...props} />,
  h3: ({ node: _node, ...props }) => <h3 {...props} />,
  img: ({ node: _node, ...props }) => <img {...props} />,
  li: ({ node: _node, ...props }) => <li {...props} />,
  ol: ({ node: _node, ...props }) => <ol {...props} />,
  p: ({ node: _node, ...props }) => <p {...props} />,
  pre: IssueMarkdownPre,
  table: ({ node: _node, ...props }) => <table {...props} />,
  td: ({ node: _node, ...props }) => <td {...props} />,
  th: ({ node: _node, ...props }) => <th {...props} />,
  ul: ({ node: _node, ...props }) => <ul {...props} />,
  video: ({ className, node: _node, ...props }) => {
    return (
      <video
        {...props}
        className={className ?? ""}
        data-owner="project-issue-detail-markdown-video"
      />
    );
  },
};

function IssueMarkdown({ basePath, children }: { basePath: string; children: string }) {
  const components = useMemo<Components>(
    () => ({
      ...ISSUE_MARKDOWN_COMPONENTS,
      a: (props) => <IssueMarkdownLink {...props} basePath={basePath} />,
    }),
    [basePath],
  );
  return (
    <ReactMarkdown
      components={components}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, ISSUE_MARKDOWN_SANITIZE_SCHEMA]]}
      remarkPlugins={[remarkGfm]}
      urlTransform={(url) => issueMarkdownUrlTransform(basePath, url)}
    >
      {children}
    </ReactMarkdown>
  );
}

function issueMarkdownUrlTransform(basePath: string, url: string) {
  const safeUrl = defaultUrlTransform(url);
  return url.startsWith("/") && !url.startsWith("//") ? prefixBasePath(basePath, safeUrl) : safeUrl;
}

function markdownInternalPath(href: string, basePath: string) {
  if (!href.startsWith("/") || href.startsWith("//")) {
    return null;
  }
  if (basePath !== "/" && (href === basePath || href.startsWith(`${basePath}/`))) {
    return href.slice(basePath.length) || "/";
  }
  return href;
}

function stripMarkdownComments(markdown: string) {
  return markdown.replace(/<!--[\s\S]*?-->/gu, "");
}

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
  const popoverStyle: React.CSSProperties | undefined = position
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
        <div
          style={popoverStyle}
          className="popover top in"
          data-owner="issue-detail-legacy-popover"
        >
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
  return <LastOutletTransition routeId={Route.id} />;
}

export function ProjectIssueDetailIndexScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName, issueNumber } = Route.useParams();
  const numericIssueNumber = Number(issueNumber) || 0;
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const sessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));
  useWireframeContentProgress([["project-issue-detail", ownerName, projectName]]);
  const issueQuery = useQuery({
    queryFn: () => readIssueDetail(runtimeConfig, ownerName, projectName, numericIssueNumber),
    queryKey: ["project-issue-detail", ownerName, projectName, numericIssueNumber],
    retry(failureCount, error) {
      return restApiErrorStatus(error) !== 404 && failureCount < 3;
    },
    retryOnMount: false,
  });
  const labelsQuery = useQuery({
    ...listProjectLabelsQueryOptions(runtimeConfig, { ownerName, projectName }),
    enabled: Boolean(issueQuery.data),
  });
  const openMilestonesQuery = useQuery({
    ...listProjectMilestonesQueryOptions(runtimeConfig, {
      includeDetails: false,
      orderBy: "dueDate",
      orderDir: "asc",
      ownerName,
      projectName,
      state: "open",
    }),
    enabled: Boolean(projectQuery.data && issueQuery.data),
  });
  const closedMilestonesQuery = useQuery({
    ...listProjectMilestonesQueryOptions(runtimeConfig, {
      includeDetails: false,
      orderBy: "dueDate",
      orderDir: "asc",
      ownerName,
      projectName,
      state: "closed",
    }),
    enabled: Boolean(projectQuery.data && issueQuery.data),
  });

  if (!projectQuery.data || !sessionQuery.data) {
    return <ProjectIssueDetailWireframe runtimeConfig={runtimeConfig} />;
  }

  if (restApiErrorStatus(issueQuery.error) === 404) {
    return (
      <>
        <ProjectIssueNotFoundTitle ownerName={ownerName} projectName={projectName} />
        <ProjectIssueNotFoundBody ownerName={ownerName} projectName={projectName} />
      </>
    );
  }

  if (!issueQuery.data) {
    return <ProjectIssueDetailWireframe runtimeConfig={runtimeConfig} />;
  }

  const detailContent = (
    <>
      <ProjectIssueDetailTitle
        issueBodyMarkdown={stringField(issueQuery.data.bodyMarkdown)}
        issueTitle={stringField(issueQuery.data.title)}
        ownerName={ownerName}
        projectName={projectName}
      />
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
        labels={labelsQuery.data?.labels ?? []}
        milestones={{
          closed: closedMilestonesQuery.data?.milestones ?? [],
          open: openMilestonesQuery.data?.milestones ?? [],
        }}
        milestonesPending={openMilestonesQuery.isPending || closedMilestonesQuery.isPending}
        project={projectQuery.data}
        runtimeConfig={runtimeConfig}
      />
    </>
  );

  return detailContent;
}

function ProjectIssueDetailWireframe({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  // Inside the project layout the shell already owns the global and project
  // navbars; rendering another SiteLayoutShell here stacks a second navbar
  // while the issue data loads. Keep the body-only wireframe when nested.
  const nestedProjectShell = use(ProjectNestedShellContext);
  const body = (
    <div
      className="page-wrap-outer"
      data-owner="project-issue-detail-page"
      data-wireframe="project-issue-detail"
      aria-busy="true"
    >
      <div className="project-page-wrap board-view issue-detail-page">
        <div className="board-header issue" data-owner="project-issue-detail-header">
          <div className="title" aria-hidden="true">
            {"\u00a0"}
          </div>
        </div>
        <div className="board-body row-fluid" data-owner="project-issue-detail-body">
          <div className="span9 span-left-pane">
            <div className="author-info" aria-hidden="true">
              {"\u00a0"}
            </div>
            <div
              className="issue-detail-wireframe-content content markdown-wrap"
              aria-hidden="true"
            >
              {"\u00a0"}
            </div>
          </div>
          <div className="span3 span-right-pane" aria-hidden="true">
            <div className="issue-detail-issue-info issue-info">
              <dl>
                <dt>{"\u00a0"}</dt>
                <dd>{"\u00a0"}</dd>
                <dt>{"\u00a0"}</dt>
                <dd>{"\u00a0"}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (nestedProjectShell) {
    return body;
  }

  return <SiteLayoutShell runtimeConfig={runtimeConfig}>{body}</SiteLayoutShell>;
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
    <div className="page-wrap-outer" data-owner="project-issue-detail-page">
      <div className="project-page-wrap">
        <div className="error-wrap" data-owner="project-issue-detail-error-wrap">
          <i className="ico ico-err2" data-owner="project-issue-detail-error-icon"></i>
          <p data-owner="project-issue-detail-error-message">{t("error.notfound.issue_post")}</p>
          <Link
            to="/$ownerName/$projectName/issues"
            params={{ ownerName, projectName }}
            search={{ state: "all" } as unknown as ProjectIssuesSearch}
            className="ybtn ybtn-primary"
          >
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
  milestonesPending,
  project,
  runtimeConfig,
}: {
  basePath: string;
  currentUserLoginId: string;
  currentUserIsAnonymous: boolean;
  issue: RestIssueDetailResponse;
  labels: YoramRecord[];
  milestones: {
    closed: ProjectMilestone[];
    open: ProjectMilestone[];
  };
  milestonesPending: boolean;
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { language, t } = useLegacyMessages();
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
  const createdDisplayLabel = legacyRelativeDateLabel(createdLabel, language);
  const isDraft = booleanField(issue.isDraft);
  const isWatching = booleanField(issue.isWatching);
  const [isWatchingIssue, setIsWatchingIssue] = useState(isWatching);
  const isFavorited = booleanField(issue.isFavorited);
  const [isFavoritedIssue, setIsFavoritedIssue] = useState(isFavorited);
  const canUpdate = booleanField(issue.viewerCanUpdate);
  const canDelete = booleanField(issue.viewerCanDelete);
  const canBeDeleted = issue.canBeDeleted !== false;
  const canComment = booleanField(issue.viewerCanComment);
  const canWatch = !currentUserIsAnonymous && issue.viewerCanWatch !== false;
  const hasVoted = booleanField(issue.hasVoted);
  const [hasVotedIssue, setHasVotedIssue] = useState(hasVoted);
  const translationApiEnabled = booleanField(issue.translationApiEnabled);
  const labels = (issue.labels ?? []).slice().sort(compareLabels);
  const [selectedLabelIds, setSelectedLabelIds] = useState(() =>
    labels.map((label) => stringField(label.id)),
  );
  const selectableLabels = (projectLabels ?? []).slice().sort(compareLabels);
  const canManageProjectLabels = booleanField(project.viewerCanUpdate);
  const hasProjectMilestones = milestones.open.length > 0 || milestones.closed.length > 0;
  const showIssue = projectMenuEnabled(project, "issue");
  const showMilestone = projectMenuEnabled(project, "milestone");
  const voters = issue.issueVoters ?? [];
  const parentIssueId = stringField(issue.parentIssueId, issueId);
  const newSubtaskPath = `/${ownerName}/${projectName}/issueform?parentIssueId=${parentIssueId}`;
  const assigneeLoginId = stringField(issue.assigneeLoginId);
  const [selectedAssigneeLoginId, setSelectedAssigneeLoginId] = useState(assigneeLoginId);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(
    stringField(issue.milestoneId, "-1"),
  );
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
  const bodyMarkdown = translatedBodyMarkdown ?? stringField(issue.bodyMarkdown);
  const bodyChecksum = stringField(issue.bodyChecksum, "body-sha1");
  const historyMarkdown = stringField(issue.historyMarkdown);
  const issueUpdateMillis = stringField(issue.issueUpdateMillis, "0");
  const dueDateLabel = stringField(issue.dueDateLabel);
  const [dueDateValue, setDueDateValue] = useState(dueDateLabel);
  const [committedDueDateValue, setCommittedDueDateValue] = useState(dueDateLabel.trim());
  const dueDateInputRef = useRef<HTMLInputElement>(null);
  const dueDatePickerRef = useRef<HTMLInputElement>(null);
  const dueDateStatusLabel = booleanField(issue.dueDateOverdue)
    ? "Overdue"
    : localizeIssueDuration(stringField(issue.dueDateUntilLabel), language);
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
  const metadataMutation = useMutation({
    mutationFn: async (input: {
      addLabelIds?: number[];
      assigneeLoginId?: string;
      removeLabelIds?: number[];
      milestoneId?: number;
    }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return massUpdateIssues(runtimeConfig, csrfToken, {
        addLabelIds: input.addLabelIds ?? [],
        assigneeLoginId: input.assigneeLoginId ?? "",
        assigneeUpdate: input.assigneeLoginId !== undefined,
        issueNumbers: [Number(issueNumber) || 0],
        milestoneId: input.milestoneId,
        milestoneUpdate: input.milestoneId !== undefined,
        removeLabelIds: input.removeLabelIds ?? [],
        ownerName,
        projectName,
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: ["project-issue-detail", ownerName, projectName, Number(issueNumber) || 0],
      });
    },
  });
  const sharerMutation = useMutation({
    mutationFn: async ({
      loginId,
      remove,
      targetType,
    }: {
      loginId: string;
      remove: boolean;
      targetType?: string;
    }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      const input = { issueNumber, loginId, ownerName, projectName, targetType };
      return remove
        ? unshareIssue(runtimeConfig, csrfToken, input)
        : shareIssue(runtimeConfig, csrfToken, input);
    },
    onSuccess() {
      void queryClient.invalidateQueries({
        queryKey: ["project-issue-detail", ownerName, projectName, Number(issueNumber) || 0],
      });
    },
  });
  useEffect(() => {
    setDueDateValue(dueDateLabel);
    setCommittedDueDateValue(dueDateLabel.trim());
  }, [dueDateLabel]);
  function handleDueDateChange(value: string) {
    setDueDateValue(value);
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
      <div className="project-page-wrap board-view issue-detail-page">
        <div className="board-header issue" data-owner="project-issue-detail-header">
          <div
            className="pull-right mr10 mt10 hide-in-mobile"
            data-owner="project-issue-detail-desktop-metadata"
          >
            <div className="date" data-owner="project-issue-detail-date" title={createdLabel}>
              {createdDisplayLabel}
            </div>
            <span
              className={`badge badge-issue-${issueState}`}
              data-owner="project-issue-detail-state-badge"
            >
              {stateLabel}
            </span>
          </div>
          <div className="title" data-owner="project-issue-detail-title">
            {issue.parentIssueId ? <span className="subtask-mark">subtask</span> : null}
            <strong className="board-id" data-owner="project-issue-detail-board-id">
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
            <div className="hide show-in-mobile" data-owner="project-issue-detail-mobile-metadata">
              <span className="date" data-owner="project-issue-detail-date" title={createdLabel}>
                {createdDisplayLabel}
              </span>
              <span
                className={`badge badge-small badge-issue-${issueState}`}
                data-owner="project-issue-detail-state-badge"
              >
                {stateLabel}
              </span>
            </div>
          </div>
          {isDraft ? (
            <div className="draft">
              This is an draft issue. Only you can see it until you publish.
            </div>
          ) : null}
        </div>
        <div className="board-body row-fluid" data-owner="project-issue-detail-body">
          <div className="span9 span-left-pane">
            <div className="author-info" data-owner="project-issue-detail-author">
              <Link
                to="/$user"
                params={{ user: stringField(issue.authorLoginId) }}
                className="usf-group"
                activeOptions={{ exact: true }}
              >
                <span className="avatar-wrap smaller">
                  <img
                    src={stringField(issue.authorAvatarUrl) || undefined}
                    width="20"
                    height="20"
                    alt=""
                  />
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
                basePath={basePath}
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
                  <TasklistBar markdown={bodyMarkdown} />
                  <div
                    className="content markdown-wrap"
                    data-owner="project-issue-detail-content"
                    data-allowed-update={String(canUpdate)}
                  >
                    <IssueMarkdown basePath={basePath}>
                      {stripMarkdownComments(bodyMarkdown)}
                    </IssueMarkdown>
                  </div>
                </div>
              </>
            ) : (
              <div className="content empty-content" data-owner="project-issue-detail-empty"></div>
            )}
            <div
              className="attachments"
              id="attachments"
              data-attachments={JSON.stringify(issue.attachments ?? [])}
            >
              <AttachedFiles attachments={issue.attachments} />
            </div>
            <div className="board-actrow" data-owner="project-issue-detail-actions">
              <div className="pull-left" data-owner="project-issue-detail-board-action-group">
                <div>
                  {canWatch ? (
                    <button
                      id="watch-button"
                      type="button"
                      className={`ybtn ${isWatchingIssue ? "ybtn-watching" : ""}`}
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
                  <span
                    // wave-33 retained-class: legacy view.scala.html:191
                    // (the margin utility class is retired — legacy-fallback
                    // gate; the margin-left is owned by the data-owner rule)
                    className="project-btn-item hide show-in-mobile-inline"
                    data-owner="project-issue-detail-mobile-new-subtask"
                  >
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
                  className="icon btn-transparent-with-fontsize-lineheight"
                  data-owner="project-issue-detail-translation-button"
                  title="Translation"
                  disabled={translatePending || translatedBodyMarkdown !== null}
                  onClick={() => void translateIssueBody()}
                >
                  <i className="yobicon-lang" data-yobicon={"\ue1a3"}></i>
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
            <dl
              className={sharerListClassName}
              data-owner="issue-detail-sharer-list"
              style={sharerListOpen ? { display: "block" } : undefined}
            >
              <dt className="issue-share-title" data-owner="project-issue-detail-sharer-title">
                {t("issue.sharer")}{" "}
                <span className="num issue-sharer-count">
                  {sharers.length ? ` ${String(sharers.length)}` : ""}
                </span>
              </dt>
              <dd
                id="sharer-list"
                className={sharerListVisible ? "" : "hideFromDisplayOnly"}
                data-owner="issue-detail-sharer-list-content"
              >
                {canUpdate ? (
                  <LegacySharerControl
                    issue={issue}
                    runtimeConfig={runtimeConfig}
                    value={sharerValue}
                    onAdd={(loginId, targetType) =>
                      sharerMutation.mutate({ loginId, remove: false, targetType })
                    }
                    onRemove={(loginId) => sharerMutation.mutate({ loginId, remove: true })}
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
          <div className="span3 span-right-pane" data-owner="project-issue-detail-sidebar">
            <div
              className="issue-info"
              data-owner="project-issue-detail-sidebar-meta"
              data-owner-issue-info="project-issue-detail-issue-info"
            >
              <form
                id="issueUpdateForm"
                action={prefixBasePath(basePath, `/${ownerName}/${projectName}/issues`)}
                method="post"
              >
                <input type="hidden" name="issues[0].id" value={issueId} />
                <dl data-owner="issue-detail-sidebar-dl">
                  {showIssue ? (
                    <dd className="project-btn-item" data-owner="issue-detail-sidebar-dd">
                      <Link to={newSubtaskPath} className="ybtn ybtn-success">
                        {t("button.newSubtask")}
                      </Link>
                    </dd>
                  ) : null}
                  <dt>{t("issue.assignee")}</dt>
                  <dd data-owner="issue-detail-sidebar-dd">
                    {canUpdate ? (
                      <>
                        <input
                          type="hidden"
                          className="bigdrop"
                          id="assignee"
                          name="assigneeLoginId"
                          placeholder={t("issue.noAssignee")}
                          value={selectedAssigneeLoginId}
                          readOnly
                          style={{ width: "100%" }}
                          data-owner="issue-detail-assignee-input"
                        />
                        <LegacyAssigneeControl
                          issue={issue}
                          runtimeConfig={runtimeConfig}
                          value={selectedAssigneeLoginId}
                          onChange={(value) => {
                            setSelectedAssigneeLoginId(value);
                            metadataMutation.mutate({ assigneeLoginId: value });
                          }}
                        />
                      </>
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
                        <strong className="name" data-owner="issue-detail-sidebar-assignee-name">
                          {stringField(issue.assigneeLabel)}
                        </strong>
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
                  <dl data-owner="issue-detail-sidebar-dl">
                    <dt>{t("milestone")}</dt>
                    <dd data-owner="issue-detail-sidebar-dd">
                      {milestonesPending ? (
                        stringField(issue.milestoneTitle) || t("issue.noMilestone")
                      ) : hasProjectMilestones ? (
                        canUpdate ? (
                          <IssueMilestoneSelect
                            milestones={milestones}
                            selectedMilestoneId={selectedMilestoneId}
                            onChange={(value) => {
                              setSelectedMilestoneId(value);
                              metadataMutation.mutate({ milestoneId: Number(value) });
                            }}
                          />
                        ) : issue.milestoneId ? (
                          <Link
                            {...LEGACY_LINK_PROPS}
                            to="/$ownerName/$projectName/milestone/$milestoneId"
                            params={{
                              ownerName,
                              projectName,
                              milestoneId: String(issue.milestoneId),
                            }}
                          >
                            {stringField(issue.milestoneTitle)}
                          </Link>
                        ) : (
                          t("issue.noMilestone")
                        )
                      ) : (
                        <Link
                          {...LEGACY_LINK_PROPS}
                          to="/$ownerName/$projectName/newMilestoneForm"
                          params={{ ownerName, projectName }}
                          className="ybtn ybtn-small ybtn-fullsize"
                          target="_blank"
                        >
                          {t("milestone.menu.new")}
                        </Link>
                      )}
                    </dd>
                  </dl>
                ) : null}
                <dl data-owner="issue-detail-sidebar-dl">
                  <dt>
                    {t("issue.dueDate")}
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
                  <dd data-owner="issue-detail-sidebar-dd">
                    {canUpdate ? (
                      <div className="search search-bar">
                        <IssueDueDateInput
                          ownerPrefix="project-issue-detail"
                          dueDateRef={dueDateInputRef}
                          datePickerRef={dueDatePickerRef}
                          value={dueDateValue}
                          autoComplete="off"
                          onBlur={commitDueDateChange}
                          onChange={handleDueDateChange}
                        />
                      </div>
                    ) : (
                      dueDateLabel || t("issue.noDuedate")
                    )}
                  </dd>
                </dl>
                {selectableLabels.length > 0 && canUpdate ? (
                  <IssueLabelSelect
                    canManageLabels={canManageProjectLabels}
                    labels={selectableLabels}
                    ownerName={ownerName}
                    projectName={projectName}
                    selectedLabelIds={new Set(selectedLabelIds)}
                    onChange={(nextIds) => {
                      const currentIds = new Set(selectedLabelIds);
                      setSelectedLabelIds(nextIds);
                      metadataMutation.mutate({
                        addLabelIds: nextIds
                          .filter((id) => !currentIds.has(id))
                          .map((id) => Number(id)),
                        removeLabelIds: [...currentIds]
                          .filter((id) => !nextIds.includes(id))
                          .map((id) => Number(id)),
                      });
                    }}
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
        <div className="board-footer" data-owner="project-issue-detail-board-footer">
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
  basePath,
  historyMarkdown,
  isAnonymous,
  loginTo,
  updatedByAuthorLabel,
  updatedLabel,
}: {
  basePath: string;
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
        data-owner="issue-detail-history-modal"
        tabIndex={open ? -1 : undefined}
        onKeyDown={(event) => closeOnEscape(event, () => setOpen(false))}
      >
        <div className="modal-header issue-detail-modal-section issue-detail-modal-header">
          <button
            type="button"
            className="close issue-detail-modal-close"
            aria-hidden="true"
            onClick={closeHistory}
          >
            ×
          </button>
          <h5 className="nm">{t("change.history")}</h5>
        </div>
        <div className="modal-body issue-detail-modal-section">
          <IssueMarkdown basePath={basePath}>
            {stripMarkdownComments(historyMarkdown)}
          </IssueMarkdown>
        </div>
        <div className="modal-footer issue-detail-modal-section issue-detail-modal-footer">
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
  const { t } = useLegacyMessages();
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
      <div
        id="vote"
        className={`vote-wrap ${voters.length ? "voter-exists" : ""}`}
        data-owner="project-issue-detail-vote-wrap"
      >
        {canComment ? (
          <button
            type="button"
            className={hasVoted ? "ybtn-watching" : ""}
            title={hasVoted ? "Unvote this issue" : "Vote this issue"}
            onClick={onIssueVote}
          >
            <span
              className={`heart${hasVoted ? " is-voted" : ""}`}
              data-owner="project-issue-detail-vote-heart"
            >
              <i
                className="yobicon-hearts"
                data-owner="project-issue-detail-vote-heart-icon"
                data-owner-instance="active"
              ></i>
            </span>
          </button>
        ) : (
          <span
            className="ybtn-disabled"
            data-owner="project-issue-detail-disabled-vote"
            title={t("user.login.alert")}
            data-login="required"
          >
            <span className="heart" data-owner="project-issue-detail-vote-heart-disabled">
              <i
                className="yobicon-hearts"
                data-owner="project-issue-detail-vote-heart-icon"
                data-owner-instance="disabled"
              ></i>
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
    <div className="voter-list-wrap" data-owner="project-issue-detail-voter-list-wrap">
      <ul className="voter-list" data-owner="project-issue-detail-voter-list">
        {visibleVoters.map((voter) => (
          <li
            className="voter-list-item"
            data-owner="project-issue-detail-voter-list-item"
            key={stringField(voter.loginId)}
          >
            <Link
              {...LEGACY_LINK_PROPS}
              to="/$user"
              params={{ user: stringField(voter.loginId) }}
              className="avatar-wrap smaller"
              data-owner="project-issue-detail-voter-avatar"
              title={stringField(voter.userLabel)}
            >
              <img src={stringField(voter.avatarUrl)} alt="" />
            </Link>
          </li>
        ))}
        {overflowVoters.length ? (
          <li
            className="voter-list-item"
            data-html="true"
            data-owner="project-issue-detail-voter-overflow"
            title={overflowTitle}
          >
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
        data-owner="issue-detail-voters-modal"
        {...(open ? { style: { display: "block" } } : {})}
        tabIndex={open ? -1 : undefined}
        onKeyDown={(event) => closeOnEscape(event, () => onClose?.())}
      >
        <div className="modal-header issue-detail-modal-section issue-detail-modal-header">
          <button type="button" className="close issue-detail-modal-close" onClick={onClose}>
            ×
          </button>
          <h5 className="nm">{t("issue.voters")}</h5>
        </div>
        <div className="modal-body issue-detail-modal-section">
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
        <div className="modal-footer issue-detail-modal-section issue-detail-modal-footer">
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
        <i className="yobicon-arrow-up-alt" data-yobicon={"\ue01d"}></i>
      </button>
      <button
        className="ybtn ybtn-small"
        id="down-vote-issue-weight"
        onClick={() => weightMutation.mutate("downvote")}
        title={`${weightLabel}: Down vote`}
      >
        <i className="yobicon-arrow-down-alt" data-yobicon={"\ue01e"}></i>
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
  milestones,
  onChange,
  selectedMilestoneId,
}: {
  milestones: {
    closed: ProjectMilestone[];
    open: ProjectMilestone[];
  };
  onChange: (value: string) => void;
  selectedMilestoneId: string;
}) {
  const { t } = useLegacyMessages();
  const [open, setOpen] = useState(false);
  const allMilestones = [...milestones.open, ...milestones.closed];
  const selectedTitle =
    allMilestones.find((milestone) => stringField(milestone.id) === selectedMilestoneId)?.title ??
    t("issue.noMilestone");

  return (
    <>
      <select
        id="milestone"
        name="milestone.id"
        data-format="milestone"
        data-container-css-class="fullsize"
        value={selectedMilestoneId}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="select2-offscreen"
      >
        <option
          value="-1"
          ref={
            selectedMilestoneId === "-1"
              ? (option) => {
                  if (option) {
                    option.defaultSelected = true;
                  }
                }
              : undefined
          }
        >
          {t("issue.noMilestone")}
        </option>
        <optgroup label={t("milestone.state.open")}>
          {milestones.open.map((milestone) => (
            <option
              key={stringField(milestone.id)}
              value={stringField(milestone.id)}
              data-state={stringField(milestone.state, "open")}
              ref={
                stringField(milestone.id) === selectedMilestoneId
                  ? (option) => {
                      if (option) {
                        option.defaultSelected = true;
                      }
                    }
                  : undefined
              }
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
              ref={
                stringField(milestone.id) === selectedMilestoneId
                  ? (option) => {
                      if (option) {
                        option.defaultSelected = true;
                      }
                    }
                  : undefined
              }
            >
              {stringField(milestone.title)}
            </option>
          ))}
        </optgroup>
      </select>
      <LegacySingleSelectControl
        ariaLabel={t("milestone")}
        open={open}
        options={[
          { label: t("issue.noMilestone"), value: "-1" },
          ...allMilestones.map((milestone) => ({
            label: stringField(milestone.title),
            value: stringField(milestone.id),
          })),
        ]}
        selectedLabel={stringField(selectedTitle)}
        selectedValue={selectedMilestoneId}
        setOpen={setOpen}
        onChange={onChange}
        className="fullsize"
      />
    </>
  );
}

function LegacySingleSelectControl({
  ariaLabel,
  className,
  onChange,
  open,
  options,
  selectedLabel,
  selectedValue,
  setOpen,
}: {
  ariaLabel: string;
  className: string;
  onChange: (value: string) => void;
  open: boolean;
  options: Array<{ label: string; value: string }>;
  selectedLabel: string;
  selectedValue: string;
  setOpen: (open: boolean) => void;
}) {
  const listboxId = useId();
  return (
    <div
      className={`select2-container ${className}${open ? " select2-dropdown-open" : ""}`}
      role="combobox"
      aria-controls={listboxId}
      aria-label={ariaLabel}
      aria-expanded={open}
    >
      <div
        className="select2-choice"
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => activateLegacyControl(event, () => setOpen(!open))}
      >
        <span className="select2-chosen">{selectedLabel}</span>
        <span className="select2-arrow" aria-hidden="true">
          <b></b>
        </span>
      </div>
      <div className={`select2-drop${open ? " select2-drop-active" : " select2-display-none"}`}>
        <ul className="select2-results" role="listbox" id={listboxId}>
          {options.map((option) => (
            <li
              key={option.value}
              className={selectedValue === option.value ? "select2-highlighted" : undefined}
            >
              <div
                className="select2-result-label"
                role="option"
                tabIndex={open ? 0 : -1}
                aria-selected={selectedValue === option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                onKeyDown={(event) =>
                  activateLegacyControl(event, () => {
                    onChange(option.value);
                    setOpen(false);
                  })
                }
              >
                {option.label}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function IssueLabelSelect({
  canManageLabels,
  labels,
  ownerName,
  projectName,
  onChange,
  selectedLabelIds,
}: {
  canManageLabels: boolean;
  labels: YoramRecord[];
  ownerName: string;
  projectName: string;
  onChange: (labelIds: string[]) => void;
  selectedLabelIds: Set<string>;
}) {
  const { t } = useLegacyMessages();
  const categoryGroups = new Map<
    string,
    {
      categoryId: string;
      categoryIsExclusive: string;
      categoryName: string;
      labels: YoramRecord[];
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
        {t("label")}{" "}
        {canManageLabels ? (
          <Link
            {...LEGACY_LINK_PROPS}
            to="/$ownerName/$projectName/issue/labelsform"
            params={{ ownerName, projectName }}
            target="_blank"
            className="label-edit"
          >
            [{t("button.edit")}]
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
          onChange={(event) =>
            onChange(Array.from(event.currentTarget.selectedOptions, (option) => option.value))
          }
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
        <LegacyLabelControl
          labels={labels}
          onChange={onChange}
          selectedLabelIds={selectedLabelIds}
        />
      </dd>
    </dl>
  );
}

function LegacySharerControl({
  issue,
  onAdd,
  onRemove,
  runtimeConfig,
  value,
}: {
  issue: RestIssueDetailResponse;
  onAdd: (loginId: string, targetType?: string) => void;
  onRemove: (loginId: string) => void;
  runtimeConfig: RuntimeConfig;
  value: string;
}) {
  const { t } = useLegacyMessages();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ownerName = stringField(issue.ownerName);
  const projectName = stringField(issue.projectName);
  const issueNumber = numberField(issue.issueNumber);
  const selectedLoginIds = new Set(
    (issue.sharers ?? []).map((sharer) => stringField(sharer.loginId)),
  );
  const usersQuery = useQuery({
    enabled: open,
    queryFn: () =>
      searchIssueSharableUsers(runtimeConfig, {
        issueNumber,
        ownerName,
        projectName,
        query: query.trim(),
      }),
    queryKey: [
      "project-issue-detail",
      ownerName,
      projectName,
      issueNumber,
      "sharable-users",
      query,
    ],
  });
  const users = (usersQuery.data?.items ?? []).filter(
    (user) => !selectedLoginIds.has(user.loginId),
  );

  return (
    <>
      <input
        type="hidden"
        className="bigdrop width100p"
        id="issueSharer"
        name="issueSharer"
        placeholder={t("issue.sharer.select")}
        value={value}
        readOnly
      />
      <div className="select2-container select2-container-multi width100p">
        <ul className="select2-choices">
          {(issue.sharers ?? []).map((sharer) => {
            const loginId = stringField(sharer.loginId);
            return (
              <li className="select2-search-choice" key={loginId}>
                <div>{stringField(sharer.userLabel, loginId)}</div>
                <button
                  type="button"
                  className="select2-search-choice-close"
                  aria-label={`${stringField(sharer.userLabel, loginId)} ${t("button.delete")}`}
                  onClick={() => onRemove(loginId)}
                ></button>
              </li>
            );
          })}
          <li className="select2-search-field">
            <input
              type="text"
              value={query}
              aria-label={t("issue.sharer.select")}
              autoComplete="off"
              placeholder={selectedLoginIds.size ? "" : t("issue.sharer.select")}
              onFocus={() => setOpen(true)}
              onChange={(event) => {
                setQuery(event.currentTarget.value);
                setOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setOpen(false);
                }
              }}
            />
          </li>
        </ul>
        {open ? (
          <div className="select2-drop select2-drop-active">
            <ul className="select2-results" role="listbox">
              {users.map((user) => (
                <li key={`${user.type}:${user.loginId}`}>
                  <button
                    type="button"
                    className="select2-result-label"
                    role="option"
                    onClick={() => {
                      onAdd(user.loginId, user.type);
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    {user.displayName || user.loginId} {user.loginId}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </>
  );
}

function LegacyAssigneeControl({
  issue,
  onChange,
  runtimeConfig,
  value,
}: {
  issue: RestIssueDetailResponse;
  onChange: (value: string) => void;
  runtimeConfig: RuntimeConfig;
  value: string;
}) {
  const { t } = useLegacyMessages();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<IssueAssignableUserItem | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const ownerName = stringField(issue.ownerName);
  const projectName = stringField(issue.projectName);
  const issueNumber = numberField(issue.issueNumber);
  const initialLoginId = stringField(issue.assigneeLoginId);
  const usersQuery = useQuery({
    enabled: open,
    queryFn: () =>
      searchIssueAssignableUsers(runtimeConfig, {
        issueNumber,
        ownerName,
        projectName,
        query: query.trim(),
      }),
    queryKey: [
      "project-issue-detail",
      ownerName,
      projectName,
      issueNumber,
      "assignable-users",
      query,
    ],
  });
  const users = usersQuery.data?.items ?? [];
  const choose = (user: IssueAssignableUserItem | null) => {
    setSelectedUser(user);
    onChange(user?.loginId ?? "");
    setQuery("");
    setOpen(false);
  };
  const openControl = () => {
    setOpen(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };
  const displayLoginId =
    selectedUser?.loginId ?? (value === initialLoginId ? initialLoginId : value);
  const displayName =
    selectedUser?.displayName ??
    (displayLoginId === initialLoginId ? stringField(issue.assigneeLabel, initialLoginId) : value);

  return (
    <div
      className={`select2-container bigdrop${open ? " select2-dropdown-open" : ""}`}
      role="combobox"
      aria-label={t("issue.assignee")}
      aria-expanded={open}
      aria-controls="issue-assignee-results"
      data-owner="issue-detail-assignee-control"
    >
      <div
        className="select2-choice"
        role="button"
        tabIndex={0}
        onClick={() => (open ? setOpen(false) : openControl())}
        onKeyDown={(event) => activateLegacyControl(event, openControl)}
      >
        <span className="select2-chosen">
          {value ? (
            <span className="usf-group">
              {value === initialLoginId && issue.assigneeAvatarUrl ? (
                <span className="avatar-wrap smaller">
                  <img src={stringField(issue.assigneeAvatarUrl)} width="20" height="20" alt="" />
                </span>
              ) : null}
              <strong className="name">{displayName}</strong>
              <span className="loginid"> {displayLoginId}</span>
            </span>
          ) : (
            t("issue.noAssignee")
          )}
        </span>
        <span className="select2-arrow" aria-hidden="true">
          <b></b>
        </span>
      </div>
      {open ? (
        <div className="select2-drop select2-drop-active">
          <div className="select2-search">
            <input
              ref={searchInputRef}
              type="text"
              className="select2-input"
              value={query}
              aria-label={t("issue.assignee")}
              autoComplete="off"
              onChange={(event) => setQuery(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setOpen(false);
                }
              }}
            />
          </div>
          <ul id="issue-assignee-results" className="select2-results" role="listbox">
            <li className={!value ? "select2-highlighted" : undefined}>
              <button
                type="button"
                className="select2-result-label"
                role="option"
                aria-selected={!value}
                onClick={() => choose(null)}
              >
                {t("issue.noAssignee")}
              </button>
            </li>
            {users.map((user) => (
              <li
                className={value === user.loginId ? "select2-highlighted" : undefined}
                key={`${user.type}:${user.loginId}`}
              >
                <button
                  type="button"
                  className="select2-result-label"
                  role="option"
                  aria-selected={value === user.loginId}
                  onClick={() => choose(user)}
                >
                  {user.displayName || user.loginId} {user.loginId}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function LegacyLabelControl({
  labels,
  onChange,
  selectedLabelIds,
}: {
  labels: YoramRecord[];
  onChange: (labelIds: string[]) => void;
  selectedLabelIds: Set<string>;
}) {
  const { t } = useLegacyMessages();
  const [open, setOpen] = useState(false);
  const selectedIds = [...selectedLabelIds];
  const toggle = (id: string) =>
    onChange(
      selectedLabelIds.has(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id],
    );
  return (
    <div
      className={`select2-container select2-container-multi issue-labels bordered fullsize${open ? " select2-container-active" : ""}`.trim()}
      data-owner="project-issue-detail-label-control"
    >
      <ul className="select2-choices">
        {labels
          .filter((label) => selectedLabelIds.has(stringField(label.id)))
          .map((label) => (
            <li className="select2-search-choice" key={stringField(label.id)}>
              <div>
                <IssueLabel
                  as="strong"
                  className="label static"
                  color={stringField(label.color)}
                  labelId={stringField(label.id)}
                  data-owner="project-issue-detail-label-geometry"
                >
                  {stringField(label.name)}
                </IssueLabel>
              </div>
              <span
                className="select2-search-choice-close"
                role="button"
                tabIndex={0}
                aria-label={`${stringField(label.name)} ${t("button.delete")}`}
                onClick={() => toggle(stringField(label.id))}
                onKeyDown={(event) =>
                  activateLegacyControl(event, () => toggle(stringField(label.id)))
                }
              ></span>
            </li>
          ))}
        <li className="select2-search-field">
          <input
            className="select2-input"
            aria-label={t("label.select")}
            autoComplete="off"
            data-owner="project-issue-detail-label-search-input"
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
          />
        </li>
      </ul>
      {open ? (
        <div className="select2-drop issue-labels select2-drop-active">
          <ul className="select2-results" role="listbox" aria-multiselectable="true">
            {labels.map((label) => {
              const id = stringField(label.id);
              return (
                <li
                  key={id}
                  className={selectedLabelIds.has(id) ? "select2-highlighted" : undefined}
                >
                  <div
                    className="select2-result-label"
                    role="option"
                    tabIndex={0}
                    aria-selected={selectedLabelIds.has(id)}
                    onClick={() => toggle(id)}
                    onKeyDown={(event) => activateLegacyControl(event, () => toggle(id))}
                  >
                    <IssueLabel
                      className="label"
                      color={stringField(label.color)}
                      labelId={id}
                      data-owner="project-issue-detail-label-color"
                    >
                      {stringField(label.name)}
                    </IssueLabel>
                  </div>
                </li>
              );
            })}
          </ul>
          <button type="button" className="ybtn ybtn-small" onClick={() => setOpen(false)}>
            {t("button.close")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function IssueSelectedLabels({
  issueState,
  labels,
  ownerName,
  projectName,
}: {
  issueState: string;
  labels: YoramRecord[];
  ownerName: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  if (!labels?.length) {
    return null;
  }

  const listPath = "/$ownerName/$projectName/issues";

  return (
    <dl>
      <dt>{t("issue.label")}</dt>
      <dd>
        {labels.map((label) => (
          <IssueLabel
            as={Link}
            {...LEGACY_LINK_PROPS}
            to={listPath}
            params={{ ownerName, projectName }}
            search={
              {
                state: issueState === "closed" ? "closed" : "open",
                // ponytail: partial search; missing fields get route defaults. Single label
                // id serializes raw as `labelIds=8` (numbers pass plain, strings JSON-encode).
                labelIds: Number(label.id),
              } as unknown as ProjectIssuesSearch
            }
            className="label static"
            color={stringField(label.color)}
            labelId={String(label.id)}
            data-owner="project-issue-detail-label-geometry"
            key={String(label.id)}
          >
            {label.name}
          </IssueLabel>
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
  const parentIssueState = stringField((issue as YoramRecord).parentIssueState, issue.state);
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
    return <div className="subtasks" data-owner="project-issue-detail-subtasks"></div>;
  }

  const percentage = totalCount ? Math.trunc((childClosedCount / totalCount) * 100) : 0;
  const progressStyle = { "--x-subtask-progress-width": `${percentage}%` } as React.CSSProperties;
  const assigneeLabel = isCurrentIssueParent ? stringField(issue.assigneeLabel) : "";
  const parentIssueStateVariant = parentIssueState.toLowerCase();

  return (
    <div className="subtasks" data-owner="project-issue-detail-subtasks">
      <div className="child-issues">
        <div className="issue-item parent-issue" data-owner="project-issue-detail-parent-issue">
          <Link
            {...LEGACY_LINK_PROPS}
            to="/$ownerName/$projectName/issue/$issueNumber"
            params={{ ownerName, projectName, issueNumber: parentIssueNumber }}
            className={isCurrentIssueParent ? "bold" : ""}
          >
            {`#${parentIssueNumber} ${parentIssueTitle}${assigneeLabel ? ` - ${assigneeLabel}` : ""}`}
          </Link>
          <div
            className={`upload-progress ${percentage === 100 ? "done-outline" : "red-outline"}`}
            data-owner="project-issue-detail-subtask-progress-shell"
          >
            <div
              style={progressStyle}
              className={`bar ${percentage === 100 ? "done" : "red"}`}
              data-owner="project-issue-detail-subtask-progress-bar"
              title="Subtask"
            ></div>
          </div>
          <span className={percentage === 100 ? " txt-green" : " "}>
            {percentage === 100 ? "" : `${childClosedCount}/`}
            {totalCount}{" "}
          </span>
          <span
            className={`parent-issue-state ${parentIssueState}`}
            data-owner="project-issue-detail-parent-state"
          >
            {issueStateLabel(parentIssueState, t)}
          </span>
        </div>
        <hr
          className="parent-issue-delimeter"
          data-owner="project-issue-detail-parent-issue-delimiter"
        />
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
  const isSelected = issueNumber === currentIssueNumber;
  const labels = (child.labels ?? []).slice().sort(compareLabels);

  return (
    <div
      className={`issue-item ${isSelected ? "selected-child" : ""} child-issue`.trim()}
      data-owner={
        isSelected ? "project-issue-detail-selected-child" : "project-issue-detail-subtask-item"
      }
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
      <span
        className="font12 no-border-at-child"
        data-owner="project-issue-detail-child-comment-vote-text"
      >
        <IssueChildCommentAndVotePair
          child={child}
          ownerName={ownerName}
          projectName={projectName}
        />
      </span>
      {labels.map((label) => (
        <IssueLabel
          as={Link}
          {...LEGACY_LINK_PROPS}
          to={`/${ownerName}/${projectName}/issues?state=open&labelIds=${String(label.id)}`}
          className="label list-label twoColumeModeTarget"
          color={stringField(label.color)}
          labelId={stringField(label.id)}
          data-owner="project-issue-detail-label-geometry"
          key={String(label.id)}
          data-category-id={stringField(label.categoryId)}
        >
          {label.name}
        </IssueLabel>
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
    <span className="item-count-groups" data-owner="project-issue-detail-item-count-group">
      {commentCount ? (
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/issue/$issueNumber"
          params={{ ownerName, projectName, issueNumber: stringField(child.issueNumber) }}
          hash="comments"
          className="comments-count comments-count-color"
          data-owner="project-issue-detail-comment-count-link"
        >
          <span
            className="count-groups item-icon issue-detail-count-group-icon-first"
            data-owner="project-issue-detail-comment-count-icon"
          >
            <i className="yobicon-comment2" data-yobicon={"\ue274"}></i>
          </span>
          <span className="count-groups item-count issue-detail-count-group-count">
            {commentCount}
          </span>
        </Link>
      ) : null}
      {voterCount ? (
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/issue/$issueNumber"
          params={{ ownerName, projectName, issueNumber: stringField(child.issueNumber) }}
          hash="vote"
          className={`vote-count vote-color${commentCount ? " issue-detail-vote-count-link-offset" : ""}`}
          data-owner="project-issue-detail-vote-count-link"
        >
          <span
            className={`count-groups item-icon${commentCount ? "" : " issue-detail-count-group-icon-first"}`}
            data-owner="project-issue-detail-vote-count-icon"
          >
            <i className="yobicon-hearts" data-yobicon={"\ue4b0"}></i>
          </span>
          <span className="count-groups item-count strong issue-detail-count-group-count">
            {voterCount}
          </span>
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
    <div data-owner="issue-detail-keymap-wrapper">
      <button type="button" className="ybtn ybtn-inverse ybtn-mini" onClick={openKeymap}>
        {t("title.keymap")}
      </button>
      <div
        ref={modalRef}
        id="helpKeys"
        className={open ? "modal fade keymap-help in" : "modal hide fade keymap-help"}
        data-owner="issue-detail-keymap-modal"
        tabIndex={-1}
        role="dialog"
        {...(open ? { style: { display: "block" } } : {})}
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
          className="icon btn-transparent-with-fontsize-lineheight"
          data-owner="project-issue-detail-action-edit"
          title={t("button.edit")}
          onClick={onEditClick}
        >
          <i className="yobicon-edit-2" data-yobicon={"\ue51d"}></i>
        </button>
      ) : (
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/issue/$issueNumber/editform"
          params={{ ownerName, projectName, issueNumber }}
        >
          <button
            type="button"
            className="icon btn-transparent-with-fontsize-lineheight"
            data-owner="project-issue-detail-action-edit"
            title={t("button.show.original")}
          >
            <i className="yobicon-edit-2" data-yobicon={"\ue51d"}></i>
          </button>
        </Link>
      )}
      {canBeDeleted && canDelete ? (
        <button
          type="button"
          className="icon btn-transparent-with-fontsize-lineheight"
          data-owner="project-issue-detail-action-delete"
          title={t("button.delete")}
          onClick={onDeleteClick}
        >
          <i className="yobicon-trash" data-yobicon={"\ue838"}></i>
        </button>
      ) : null}
      {!canBeDeleted ? (
        <LegacyHoverPopover content={t("issue.can.not.be.deleted")} focusable>
          {(popoverProps) => (
            <button
              type="button"
              className="icon disabled btn-transparent-with-fontsize-lineheight"
              data-owner="project-issue-detail-action-delete"
              {...popoverProps}
            >
              <i className="yobicon-trash" data-yobicon={"\ue838"}></i>
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
  const { t } = useLegacyMessages();
  const comments = issue.comments ?? [];
  const topLevelComments = comments.filter(isTopLevelIssueComment);
  const timeline: IssueTimelineItem[] = issue.timeline?.length
    ? issue.timeline.filter((item) => !item.comment || isTopLevelIssueComment(item.comment))
    : topLevelComments.map((comment) => ({ comment, id: stringField(comment.id) }));
  const hasTimelineItems = timeline.length > 0;

  return (
    <div id="comments" className="board-comment-wrap" data-owner="project-issue-detail-timeline">
      <div id="timeline">
        <div className="timeline-list">
          <div className="comment-header">
            <i></i>
            <strong>{t("common.comment")}</strong>{" "}
            <strong className="num">{topLevelComments.length}</strong>
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
      <IssueCommentForm basePath={basePath} issue={issue} runtimeConfig={runtimeConfig} />
    </div>
  );
}

function IssueCommentForm({
  basePath,
  issue,
  runtimeConfig,
}: {
  basePath: string;
  issue: RestIssueDetailResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const [contentsMarkdown, setContentsMarkdown] = useState("");
  const ownerName = stringField(issue.ownerName);
  const projectName = stringField(issue.projectName);
  const issueNumber = stringField(issue.issueNumber);
  const nextState = stringField(issue.state, "open").toLowerCase() === "open" ? "closed" : "open";
  const detailQueryKey = [
    "project-issue-detail",
    ownerName,
    projectName,
    Number(issueNumber) || 0,
  ] as const;
  const submitMutation = useMutation({
    mutationFn: async (withStateTransition: boolean) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      if (!withStateTransition || contentsMarkdown.trim()) {
        await createIssueComment(runtimeConfig, csrfToken, {
          contentsMarkdown,
          issueNumber,
          ownerName,
          projectName,
        });
      }
      if (withStateTransition) {
        await updateIssueState(runtimeConfig, csrfToken, {
          issueNumber,
          ownerName,
          projectName,
          state: nextState,
        });
      }
    },
    onSuccess() {
      setContentsMarkdown("");
      void queryClient.invalidateQueries({ queryKey: detailQueryKey });
    },
  });

  if (!booleanField(issue.viewerCanComment)) {
    return (
      <div
        className="write-comment-box"
        title={t("user.login.alert")}
        data-login="required"
        data-owner="project-issue-detail-unauthorized-comment"
      >
        <div className="write-comment-wrap">
          <div className="textarea-box">
            <textarea
              className="comment disabled"
              disabled
              data-owner="issue-detail-disabled-comment-secondary"
            ></textarea>
          </div>
          <div className="right-txt" data-owner="project-issue-detail-disabled-comment-actions">
            <span className="ybtn ybtn-disabled">{t("button.comment.new")}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      id="comment-form"
      action={prefixBasePath(
        basePath,
        `/${ownerName}/${projectName}/issue/${issueNumber}/comments`,
      )}
      method="post"
      encType="multipart/form-data"
      onSubmit={(event) => {
        event.preventDefault();
        submitMutation.mutate(false);
      }}
    >
      <div className="write-comment-box" data-owner="project-issue-detail-comment-form">
        <div className="write-comment-wrap">
          <MarkdownEditor
            {...issueDetailMarkdownEditorProps("comment-body", "contents", "", "contents")}
            textareaValue={contentsMarkdown}
            textareaOnChange={(event) => setContentsMarkdown(event.currentTarget.value)}
            textareaExtraProps={{
              onKeyDown(event) {
                if (event.key === "Enter" && event.shiftKey && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault();
                  submitMutation.mutate(true);
                }
              },
            }}
          />
          <UploadForm
            resourceType="ISSUE_COMMENT"
            wrapperId="upload"
            helpClassName="help"
            helpOwner="project-issue-detail-upload-help"
          />
          <div data-owner="project-issue-detail-comment-actions">
            {booleanField(issue.viewerCanUpdate) ? (
              <button
                type="button"
                className="ybtn"
                id="dynamic-comment-btn"
                disabled={submitMutation.isPending}
                onClick={() => submitMutation.mutate(true)}
              >
                {t(
                  `${contentsMarkdown.length ? "button.commentAndNextState" : "button.nextState"}.${nextState}`,
                )}
              </button>
            ) : null}
            <button type="submit" className="ybtn ybtn-success" disabled={submitMutation.isPending}>
              {t("button.comment.new")}
            </button>
          </div>
        </div>
      </div>
    </form>
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
  const { language, t } = useLegacyMessages();
  const { runtimeConfig } = Route.useRouteContext();
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
      avatarUrl={stringField(
        event.senderAvatarUrl,
        prefixBasePath(runtimeConfig.basePath, "/assets/images/default-avatar-32.png"),
      )}
      label={senderLabel}
      loginId={senderLoginId}
    />
  );

  if (eventType === "ISSUE_STATE_CHANGED") {
    return (
      <li className="event" id={`event-${eventId}`} data-owner="issue-detail-timeline-event">
        <span className={`state ${newValue}`} data-owner="issue-detail-timeline-event-state">
          {issueStateLabel(newValue, t)}
        </span>
        {sender}
        {issueStateEventText(newValue)}
        <span className="date" data-owner="issue-detail-timeline-event-date">
          <Link {...LEGACY_LINK_PROPS} to="." hash={eventHash}>
            {legacyRelativeDateLabel(stringField(event.createdLabel), language)}
          </Link>
        </span>
      </li>
    );
  }

  if (eventType === "ISSUE_ASSIGNEE_CHANGED") {
    const targetLoginId = stringField(event.targetLoginId, stringField(event.newValue));
    const targetLabel = stringField(event.targetLabel, targetLoginId);
    return (
      <li className="event" id={`event-${eventId}`} data-owner="issue-detail-timeline-event">
        <span className="state changed" data-owner="issue-detail-timeline-event-state">
          {t("issue.state.assigned")}
        </span>
        {sender}
        {targetLoginId === senderLoginId ? " self-assigned this issue" : " assigned this issue to "}
        {targetLoginId === senderLoginId ? null : (
          <EventUserLink
            avatarUrl={stringField(
              event.targetAvatarUrl,
              prefixBasePath(runtimeConfig.basePath, "/assets/images/default-avatar-32.png"),
            )}
            label={targetLabel}
            loginId={targetLoginId}
          />
        )}
        <span className="date" data-owner="issue-detail-timeline-event-date">
          <Link {...LEGACY_LINK_PROPS} to="." hash={eventHash}>
            {legacyRelativeDateLabel(stringField(event.createdLabel), language)}
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
        <span className="bold">{t("common.none")}</span>
      ) : (
        <span className="bold font-blue">
          <Link
            {...LEGACY_LINK_PROPS}
            to="/$ownerName/$projectName/milestone/$milestoneId"
            params={{ ownerName, projectName, milestoneId }}
            title={t("milestone")}
          >
            {milestoneTitle}
          </Link>
        </span>
      );
    return (
      <li className="event" id={`event-${eventId}`} data-owner="issue-detail-timeline-event">
        <span className="state milestone-changed" data-owner="issue-detail-timeline-event-state">
          {t("issue.update.milestone.id")}
        </span>
        {language === "ko-KR" ? (
          <>
            {sender}님이 마일스톤을 {milestone}(으)로 변경했습니다.
          </>
        ) : (
          <>
            {sender} changed milestone to {milestone}
          </>
        )}
        <span className="date" data-owner="issue-detail-timeline-event-date">
          <Link {...LEGACY_LINK_PROPS} to="." hash={eventHash}>
            {legacyRelativeDateLabel(stringField(event.createdLabel), language)}
          </Link>
        </span>
      </li>
    );
  }

  if (eventType === "ISSUE_MOVED") {
    const [fromOwner, fromProject] = stringField(event.oldValue).split("/");
    const fromProjectName = [fromOwner, fromProject].filter(Boolean).join("/");
    return (
      <li className="event" id={`event-${eventId}`} data-owner="issue-detail-timeline-event">
        <span className="state changed" data-owner="issue-detail-timeline-event-state">
          moved
        </span>
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
        <span className="date" data-owner="issue-detail-timeline-event-date">
          <Link {...LEGACY_LINK_PROPS} to="." hash={eventHash}>
            {legacyRelativeDateLabel(stringField(event.createdLabel), language)}
          </Link>
        </span>
      </li>
    );
  }

  if (eventType === "ISSUE_REFERRED_FROM_COMMIT") {
    const commitId = stringField(event.newValue);
    return (
      <li className="event" id={`event-${eventId}`} data-owner="issue-detail-timeline-event">
        <span className="state changed" data-owner="issue-detail-timeline-event-state">
          mentioned
        </span>
        {sender} mentioned this issue in{" "}
        <strong>
          Commit{" "}
          <Link
            {...LEGACY_LINK_PROPS}
            to="/$ownerName/$projectName/commit/$commitId"
            params={{ ownerName, projectName, commitId }}
            search={{ branch: "", path: "" }}
            className="link"
          >
            @{commitId}
          </Link>
        </strong>
        <span className="date" data-owner="issue-detail-timeline-event-date">
          <Link {...LEGACY_LINK_PROPS} to="." hash={eventHash}>
            {legacyRelativeDateLabel(stringField(event.createdLabel), language)}
          </Link>
        </span>
      </li>
    );
  }

  if (eventType === "ISSUE_REFERRED_FROM_PULL_REQUEST") {
    const pullRequestNumber = stringField(event.pullRequestNumber, stringField(event.newValue));
    const pullRequestTitle = stringField(event.pullRequestTitle, pullRequestNumber);
    return (
      <li className="event" id={`event-${eventId}`} data-owner="issue-detail-timeline-event">
        <span className="state changed" data-owner="issue-detail-timeline-event-state">
          mentioned
        </span>
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
        <span className="date" data-owner="issue-detail-timeline-event-date">
          <Link {...LEGACY_LINK_PROPS} to="." hash={eventHash}>
            {legacyRelativeDateLabel(stringField(event.createdLabel), language)}
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
        avatarUrl={stringField(
          event.targetAvatarUrl,
          prefixBasePath(runtimeConfig.basePath, "/assets/images/default-avatar-32.png"),
        )}
        label={stringField(event.targetLabel, targetLoginId)}
        loginId={targetLoginId}
      />
    );
    return (
      <li className="event" id={`event-${eventId}`} data-owner="issue-detail-timeline-event">
        {grouped ? (
          <span className="state" data-owner="issue-detail-timeline-event-state"></span>
        ) : (
          <span
            className={`state ${added ? "sharer-added" : "sharer-deleted"}`}
            data-owner="issue-detail-timeline-event-state"
          >
            {added ? t("issue.sharer") : t("issue.event.sharer.deleted.title")}
          </span>
        )}
        {sender}
        {added ? " shared current issue to " : " cancelled issue sharing with "}
        {target}
        <span className="date" data-owner="issue-detail-timeline-event-date">
          <Link {...LEGACY_LINK_PROPS} to="." hash={eventHash}>
            {legacyRelativeDateLabel(stringField(event.createdLabel), language)}
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
      <li className="event" id={`event-${eventId}`} data-owner="issue-detail-timeline-event">
        {grouped ? (
          <span className="state" data-owner="issue-detail-timeline-event-state"></span>
        ) : (
          <span
            className={`state ${added ? "label-added" : "label-deleted"}`}
            data-owner="issue-detail-timeline-event-state"
          >
            {added ? "Added" : "Removed"}
          </span>
        )}
        {sender}
        {added ? " added " : " removed "}
        {label} label
        <span className="date" data-owner="issue-detail-timeline-event-date">
          <Link {...LEGACY_LINK_PROPS} to="." hash={eventHash}>
            {legacyRelativeDateLabel(stringField(event.createdLabel), language)}
          </Link>
        </span>
      </li>
    );
  }

  return (
    <li className="event" id={`event-${eventId}`} data-owner="issue-detail-timeline-event">
      {stringField(event.newValue)} by {sender}
      <span className="date" data-owner="issue-detail-timeline-event-date">
        <Link {...LEGACY_LINK_PROPS} to="." hash={eventHash}>
          {legacyRelativeDateLabel(stringField(event.createdLabel), language)}
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
  const { language } = useLegacyMessages();
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
              {legacyRelativeDateLabel(stringField(comment.createdLabel), language)}
            </Link>
            <Link
              {...LEGACY_LINK_PROPS}
              to="."
              hash={commentHash}
              className="share-link"
              data-owner="issue-detail-share-link"
            >
              [Link]
            </Link>
          </span>
          <span className="act-row pull-right" data-owner="project-issue-detail-comment-action-row">
            <span className="new-issue-by">
              <Link
                {...LEGACY_LINK_PROPS}
                to="/user/issues/new"
                search={
                  { commentId: Number(commentId) || undefined } as unknown as {
                    commentId: string;
                  }
                }
              >
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
                <i className="yobicon-hearts vote-heart-on" data-yobicon={"\ue4b0"}></i>
              </button>
            ) : currentUserIsAnonymous ? (
              <i
                className="yobicon-hearts vote-heart-off vote-heart-disable-hover"
                data-yobicon={"\ue4b0"}
              ></i>
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
                <i className="yobicon-hearts vote-heart-off" data-yobicon={"\ue4b0"}></i>
              </button>
            )}
            {translationApiEnabled ? (
              <button
                type="button"
                className="icon btn-transparent-with-fontsize-lineheight comment-translate"
                data-owner="project-issue-detail-comment-translation-button"
                data-comment-id={commentId}
                title="Translation"
                disabled={translatePending || translatedContentsMarkdown !== null}
                onClick={() => void translateComment()}
              >
                <i className="yobicon-lang" data-yobicon={"\ue1a3"}></i>
              </button>
            ) : null}
            {canRead ? (
              <button
                type="button"
                className="btn-transparent-with-fontsize-lineheight"
                data-owner="project-issue-detail-comment-action-edit"
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
                <i className="yobicon-edit-2" data-yobicon={"\ue51d"}></i>
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                className="btn-transparent-with-fontsize-lineheight"
                data-owner="project-issue-detail-comment-action-delete"
                title="Delete comment"
                onClick={(event) => {
                  insulateModalButtonClick(event);
                  onCommentDeleteRequest(deleteUri);
                }}
              >
                <i className="yobicon-trash" data-yobicon={"\ue838"}></i>
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
          runtimeConfig={runtimeConfig}
          showNotification={isAuthorComment}
          onCancel={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setCommentEditOpen(false);
          }}
          onSaved={() => setCommentEditOpen(false)}
        />
        <div
          id={`comment-body-${commentId}`}
          {...(commentEditOpen ? { style: { display: "none" } } : {})}
        >
          <TasklistBar markdown={contentsMarkdown} />
          <div
            className="comment-body markdown-wrap"
            data-allowed-update={String(canUpdate)}
            data-via-email={String(viaEmail)}
            data-yobi-original-message-processed={viaEmail ? "true" : undefined}
          >
            <OriginalMessageMarkdown
              basePath={basePath}
              contentsMarkdown={contentsMarkdown}
              viaEmail={viaEmail}
            />
          </div>
          <div
            className="attachments"
            data-owner="project-issue-detail-comment-attachments"
            data-attachments={JSON.stringify(comment.attachments ?? [])}
          >
            <AttachedFiles attachments={comment.attachments} />
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
        runtimeConfig={runtimeConfig}
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
  basePath,
  contentsMarkdown,
  viaEmail,
}: {
  basePath: string;
  contentsMarkdown: string;
  viaEmail: boolean;
}) {
  const [showOriginalMessage, setShowOriginalMessage] = useState(false);
  const sanitizedContentsMarkdown = stripMarkdownComments(contentsMarkdown);
  const originalMessage = viaEmail ? splitOriginalMessage(sanitizedContentsMarkdown) : null;

  if (!originalMessage) {
    return <IssueMarkdown basePath={basePath}>{sanitizedContentsMarkdown}</IssueMarkdown>;
  }

  return (
    <>
      {originalMessage.visibleMarkdown ? (
        <IssueMarkdown basePath={basePath}>{originalMessage.visibleMarkdown}</IssueMarkdown>
      ) : null}
      <button
        type="button"
        data-owner="project-issue-detail-original-message-toggle"
        onClick={() => setShowOriginalMessage((current) => !current)}
      >
        ...
      </button>
      <div hidden={!showOriginalMessage}>
        <IssueMarkdown basePath={basePath}>{originalMessage.originalMarkdown}</IssueMarkdown>
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
  runtimeConfig,
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
  runtimeConfig: RuntimeConfig;
  toggleForm: () => void;
}) {
  const queryClient = useQueryClient();
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
  const [contentsMarkdown, setContentsMarkdown] = useState("");
  const [notificationVisible, setNotificationVisible] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submitMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return createIssueComment(runtimeConfig, csrfToken, {
        contentsMarkdown,
        issueNumber,
        ownerName,
        parentCommentId,
        projectName,
      });
    },
    onSuccess() {
      void queryClient.invalidateQueries({
        queryKey: ["project-issue-detail", ownerName, projectName, Number(issueNumber) || 0],
      });
      setContentsMarkdown("");
      closeForm();
    },
  });

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        data-owner="project-issue-detail-child-comment-reply"
        onClick={() => {
          toggleForm();
          if (!formOpen) {
            requestAnimationFrame(() => textareaRef.current?.focus());
          }
        }}
        className={`add-a-comment${replyVisible ? "" : " issue-detail-child-comment-reply-hidden"}`}
      >
        Reply
      </div>
      <div
        className="subcomment-media-body"
        data-owner="project-issue-detail-child-comment-surface"
      >
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
            data-owner="project-issue-detail-child-comment-form"
            className={`child-comment-input-form${formOpen ? "" : " issue-detail-child-comment-form-hidden"}`}
          >
            <form
              action={newCommentAction}
              method="post"
              encType="multipart/form-data"
              onSubmit={(event) => {
                event.preventDefault();
                submitMutation.mutate();
              }}
            >
              <input
                className="parentCommentId"
                type="hidden"
                name="parentCommentId"
                value={parentCommentId}
              />
              <div
                className="oneline-comment-box"
                data-owner="project-issue-detail-child-comment-form-row"
              >
                <textarea
                  ref={textareaRef}
                  className="issue-detail-child-comment-textarea editorSeries"
                  value={contentsMarkdown}
                  name="contents"
                  rows={1}
                  placeholder={`Reply (${replyShortcutKey} + ENTER)`}
                  onFocus={() => setNotificationVisible(true)}
                  onChange={(event) => setContentsMarkdown(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                      event.preventDefault();
                      submitMutation.mutate();
                    }
                  }}
                  onKeyUp={(event) => {
                    if (event.key === "Escape") {
                      closeForm();
                    }
                  }}
                  {...{ markdown: "true" }}
                ></textarea>
                <button
                  className="issue-detail-child-comment-submit ybtn ybtn-success"
                  type="submit"
                  disabled={submitMutation.isPending}
                >
                  OK
                </button>
              </div>
              <div
                data-owner="project-issue-detail-child-comment-notification-receiver"
                className={`notification-receiver${notificationVisible ? "" : " issue-detail-notification-receiver-hidden"}`}
              >
                <span
                  data-owner="project-issue-detail-child-comment-notification-receiver-title"
                  className="notification-receiver-title"
                >
                  {"Notification receivers "}
                </span>
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
      <div className="contents" data-owner="project-issue-detail-child-comment-contents">
        <IssueMarkdown basePath={basePath}>
          {stripMarkdownComments(stringField(comment.contentsMarkdown))}
        </IssueMarkdown>
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
              data-owner="project-issue-detail-child-comment-delete"
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
  onCancel,
  onSaved,
  runtimeConfig,
  showNotification,
}: {
  basePath: string;
  canUpdate: boolean;
  comment: IssueComment;
  contentsMarkdown: string;
  formOpen: boolean;
  issue: RestIssueDetailResponse;
  onCancel: (event: MouseEvent<HTMLButtonElement>) => void;
  onSaved: () => void;
  runtimeConfig: RuntimeConfig;
  showNotification: boolean;
}) {
  const queryClient = useQueryClient();
  const commentId = stringField(comment.id);
  const ownerName = stringField(issue.ownerName);
  const projectName = stringField(issue.projectName);
  const issueNumber = stringField(issue.issueNumber);
  const attachments = attachmentItems(comment.attachments);
  const [editedMarkdown, setEditedMarkdown] = useState(contentsMarkdown);
  useEffect(() => setEditedMarkdown(contentsMarkdown), [contentsMarkdown]);
  const updateMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return updateIssueComment(runtimeConfig, csrfToken, {
        attachmentIds: attachments.map((attachment) => stringField(attachment.id)).filter(Boolean),
        commentId,
        contentsMarkdown: editedMarkdown,
        issueNumber,
        ownerName,
        projectName,
      });
    },
    onSuccess() {
      void queryClient.invalidateQueries({
        queryKey: ["project-issue-detail", ownerName, projectName, Number(issueNumber) || 0],
      });
      onSaved();
    },
  });
  return (
    <div
      id={`comment-editform-${commentId}`}
      {...(formOpen ? { style: { display: "block" } } : {})}
      className="comment-update-form"
    >
      <form
        action={prefixBasePath(
          basePath,
          `/${ownerName}/${projectName}/issue/${issueNumber}/comments/${commentId}`,
        )}
        method="post"
        encType="multipart/form-data"
        onSubmit={(event) => {
          event.preventDefault();
          updateMutation.mutate();
        }}
      >
        <input type="hidden" name="id" value={commentId} />
        <div className="write-comment-box">
          <div className="write-comment-wrap">
            <MarkdownEditor
              {...issueDetailMarkdownEditorProps(
                "update-comment-body",
                "contents",
                contentsMarkdown,
                commentId,
              )}
              textareaValue={editedMarkdown}
              textareaOnChange={(event) => setEditedMarkdown(event.currentTarget.value)}
            />
            <div className="upload-drop-here">
              <div className="msg-wrap">
                <div className="msg">Drag &amp; Drop files here to upload.</div>
              </div>
            </div>
            <div
              className="comment-update-button upload-button-line"
              data-owner="project-issue-detail-comment-update-actions"
            >
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
                <button
                  type="submit"
                  className="ybtn ybtn-info"
                  disabled={updateMutation.isPending}
                >
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

function issueDetailMarkdownEditorProps(
  editorMode: string,
  name: string,
  value: string,
  wrapId: string,
): MarkdownEditorProps {
  return {
    wrapperClassName: `mt10 markdown-editor `.trim(),

    wrapperOwner: "project-issue-detail-markdown-editor-wrapper",
    wrapperInstance: wrapId,
    tabClickPreventDefault: true,
    tabContentClassName: ` tab-content`,
    tabContentPaneOwner: "project-issue-detail-editor-tab-content",
    tabContentPaneInstance: wrapId,
    editPaneId: `edit-${wrapId}`,
    previewPaneId: `preview-${wrapId}`,
    textareaName: name,
    textareaId: `editor-${name}-${wrapId}`,
    textareaMode: editorMode,
    textareaDefaultValue: value,
    previewClassName: `markdown-preview markdown-wrap ${editorMode}`,
    notificationRevealStyle: { style: { display: "block" } },
    notificationOwner: "project-issue-detail-markdown-editor-notification-receiver",
    notificationInstance: wrapId,
    // color #999 is owned by the data-owner rule (app.css) — no inline style
    notificationTitleOwner: "project-issue-detail-markdown-editor-notification-receiver-title",
  };
}

function taskItemsFromMarkdown(markdown: string) {
  let inCodeFence = false;
  const items: boolean[] = [];
  for (const line of stripMarkdownComments(markdown).split(/\r?\n/u)) {
    if (line.trim().startsWith("```")) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) {
      continue;
    }
    const match = line.match(/^(?:\s*[-+*]|(?:\d+\.))?\s*\[([ xX])\](?=\s)/u);
    if (match) {
      items.push(match[1].toLowerCase() === "x");
    }
  }
  return items;
}

function TasklistBar({ markdown }: { markdown: string }) {
  const tasks = taskItemsFromMarkdown(markdown);
  const completed = tasks.filter(Boolean).length;
  const hasTasks = tasks.length > 0;
  const percentage = hasTasks ? (completed / tasks.length) * 100 : 0;
  const width = `${percentage}%`;
  const complete = hasTasks && percentage === 100;
  const titleStyle = {
    fontWeight: 500,
    width,
  };
  const progressBarStyle = {
    backgroundColor: complete ? "#8bc34a" : "red",
    height: "2px",
    transitionDuration: "0.2s",
    "--x-task-progress-width": width,
  } as React.CSSProperties;
  return (
    <div
      className={`tasklist task-show${hasTasks ? " project-issue-detail-tasklist-visible" : ""}`}
      data-owner="project-issue-detail-tasklist"
    >
      <div style={titleStyle} className="task-title" data-owner="project-issue-detail-task-title">
        Tasks
        <span
          className="issue-detail-task-done-counter done-counter"
          data-owner="project-issue-detail-task-done-counter"
        >
          {hasTasks ? `(${completed}/${tasks.length})` : null}
        </span>
      </div>
      <div className="task-progress" data-owner="project-issue-detail-task-progress">
        <div
          style={progressBarStyle}
          className={`bar ${complete ? "green" : "red"}`}
          data-owner="project-issue-detail-task-progress-bar"
          data-owner-instance="tasklist"
          title="Tasklist"
        ></div>
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
          data-owner="issue-detail-voter-summary"
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
  const { t } = useLegacyMessages();
  const comments = issue.comments ?? [];
  const topLevelComments = comments.filter(isTopLevelIssueComment);
  const hasTimelineItems = topLevelComments.length > 0 || (issue.timeline?.length ?? 0) > 0;

  return (
    <div
      id="comments"
      className="board-comment-wrap"
      data-owner="project-issue-detail-index-timeline"
    >
      <div id="timeline">
        <div className="timeline-list">
          <div className="comment-header">
            <strong>{t("common.comment")}</strong>{" "}
            <strong className="num">{topLevelComments.length}</strong>
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
  const { language } = useLegacyMessages();
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
              <i className="yobicon-comment2" data-yobicon={"\ue274"}></i>
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
              {legacyRelativeDateLabel(stringField(comment.createdLabel), language)}
            </Link>
            <Link
              {...LEGACY_LINK_PROPS}
              to="."
              hash={commentHash}
              className="share-link"
              data-owner="issue-detail-share-link-secondary"
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
        data-owner="issue-detail-delete-confirm-modal"
        tabIndex={open ? -1 : undefined}
        onKeyDown={(event) => closeOnEscape(event, onCancel)}
      >
        <div className="modal-header issue-detail-modal-section issue-detail-modal-header">
          <button type="button" className="close issue-detail-modal-close" onClick={closeDialog}>
            ×
          </button>
          <h3 className="issue-detail-modal-title">{title}</h3>
        </div>
        <div className="modal-body issue-detail-modal-section">
          <p className="issue-detail-modal-body-text">{message}</p>
        </div>
        <div className="modal-footer issue-detail-modal-section issue-detail-modal-footer">
          <button
            type="button"
            className="ybtn ybtn-danger"
            data-owner="project-issue-detail-delete-danger-button"
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
        data-owner="issue-detail-comment-delete-modal"
        aria-hidden={open ? "false" : undefined}
        tabIndex={open ? -1 : undefined}
        onKeyDown={(event) => closeOnEscape(event, onCancel)}
      >
        <div className="modal-header issue-detail-modal-section issue-detail-modal-header">
          <button type="button" className="close issue-detail-modal-close" onClick={closeDialog}>
            ×
          </button>
          <h3 className="issue-detail-modal-title">{title}</h3>
        </div>
        <div className="modal-body issue-detail-modal-section">
          <p className="issue-detail-modal-body-text">{message}</p>
        </div>
        <div className="modal-footer issue-detail-modal-section issue-detail-modal-footer">
          <button
            id="comment-delete-confirm"
            type="button"
            className="ybtn ybtn-danger"
            data-owner="project-issue-detail-comment-delete-danger-button"
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
}: {
  attachments?:
    | RestIssueDetailResponse["attachments"]
    | { attachments?: RestIssueDetailResponse["attachments"] };
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
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
        // TanStack Link renders `to` base-prefixed and overrides a bare `href`
        // with the current location; carry the base-relative path in `to` so
        // the anchor renders the real href (reloadDocument keeps it native).
        const downloadLinkProps: ComponentPropsWithoutRef<typeof Link> = {
          href: downloadHref,
          reloadDocument: true,
          to: toLinkTarget(router.basepath, downloadHref),
        };
        const fileLinkProps: ComponentPropsWithoutRef<typeof Link> = {
          href,
          reloadDocument: true,
          target: "_blank",
          to: toLinkTarget(router.basepath, href),
        };

        return (
          <li className="attach" key={`${id}:${href}:${name}`}>
            <Link
              {...downloadLinkProps}
              className="download ybtn ybtn-mini"
              title={`${t("button.download")} ${name}`}
            >
              <i className="yobicon-download"></i>
            </Link>
            <Link {...fileLinkProps} className="vmiddle">
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

// TanStack Link prefixes `to` with the router basepath and overrides a bare
// `href` prop with the current location. Hrefs arriving here are already
// base-prefixed (API attachment urls, markdown urlTransform), so hand `to`
// the base-relative path; external URLs pass through untouched.
function toLinkTarget(basePath: string, href: string): string {
  if (
    basePath !== "/" &&
    href.startsWith("/") &&
    !href.startsWith("//") &&
    href.startsWith(`${basePath}/`)
  ) {
    return href.slice(basePath.length) || "/";
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

function localizeIssueDuration(value: string, language: string) {
  if (language !== "ko-KR") {
    return value;
  }
  return value.replace(/^(\d+)\s+days?$/u, "$1일");
}

function legacyRelativeDateLabel(rawLabel: string, language: string, now = Date.now()) {
  if (language !== "ko-KR" || rawLabel === "") {
    return rawLabel;
  }
  const timestamp = Date.parse(rawLabel);
  if (Number.isNaN(timestamp)) {
    return rawLabel;
  }
  const elapsedSeconds = Math.floor((now - timestamp) / 1000);
  if (elapsedSeconds < 0) {
    return rawLabel;
  }
  if (elapsedSeconds < 60) {
    return "방금 전";
  }
  if (elapsedSeconds < 60 * 60) {
    return `${Math.floor(elapsedSeconds / 60)}분 전`;
  }
  if (elapsedSeconds < 24 * 60 * 60) {
    return `${Math.floor(elapsedSeconds / (60 * 60))}시간 전`;
  }
  if (elapsedSeconds < 30 * 24 * 60 * 60) {
    return `${Math.floor(elapsedSeconds / (24 * 60 * 60))}일 전`;
  }
  return rawLabel;
}

function activateLegacyControl(event: KeyboardEvent<HTMLElement>, activate: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    activate();
  }
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
    <IssueLabel
      as="div"
      className="label"
      color={stringField(label.color)}
      labelId={String(label.id)}
      data-owner="project-issue-detail-label-geometry"
    >
      {labelName}
    </IssueLabel>
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
