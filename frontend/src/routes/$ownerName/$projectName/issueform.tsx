/* oxlint-disable jsx-a11y/tabindex-no-positive -- legacy issue/create.scala.html requires title/body keyboard order 1 then 2. */
/* oxlint-disable react-doctor/query-mutation-missing-invalidation -- project header mutations share invalidateProject and issue creation invalidates source/target issue caches. */
/* oxlint-disable react-doctor/no-many-boolean-props -- backend ACL capability flags are the minimal legacy form visibility contract. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  createFileRoute,
  useBlocker,
  useNavigate,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, {
  defaultSchema,
  type Options as RehypeSanitizeOptions,
} from "rehype-sanitize";
import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import {
  deleteTemporaryAttachment,
  uploadTemporaryAttachment,
  type UploadedAttachment,
} from "../../../api/attachments";
import type {
  IssueAssignableUserItem,
  IssueMentionUserItem,
  MarkdownCommitReference,
  MarkdownIssueReference,
  MarkdownMentionReference,
  ProjectMarkdownReferencesResponse,
  ProjectIssueReferenceItem,
  ProjectTitleHeadItem,
} from "../../../api/issue-meta";
import {
  cancelEnrollProjectRest,
  enrollProjectRest,
  readProjectContainerQueryOptions,
  toggleFavoriteProjectRest,
  toggleProjectWatchRest,
} from "../../../api/org-project";
import { listProjectLabelsQueryOptions } from "../../../api/project-labels";
import { apiQueryKeys } from "../../../api/query-keys";
import { RestApiError } from "../../../api/rest-client";
import type { ProjectContainer, ProjectMilestone, YonaRecord } from "../../../api/types";
import {
  createIssue,
  listIssueParentOptions,
  listProjectMilestones,
  readProjectMarkdownReferences,
  readProjectIssueFormOptions,
  readSessionBootstrap,
  searchProjectAssignableUsers,
  searchProjectIssueReferences,
  searchProjectMentionUsers,
  searchProjectTitleHeads,
} from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { LegacyMarkdownHelp } from "../../-legacy-markdown-help";
import { useRootToast } from "../../__root";

const CHECKLIST_TEMPLATE = "\n- [ ] Todo A\n- [ ] Todo B\n- [ ] Todo C";
const DRAFT_SAVE_DELAY_MS = 5_000;
const SEARCH_DELAY_MS = 300;
const TAB_CHARACTERS = "    ";
const EMPTY_MARKDOWN_REFERENCES: ProjectMarkdownReferencesResponse = {
  commitReferences: [],
  issueReferences: [],
  mentionReferences: [],
};
const LEGACY_GLOBAL_MARKDOWN_ATTRIBUTES = new Set(["className", "id", "style", "width", "height"]);
const ISSUE_MARKDOWN_BASE_ATTRIBUTES = Object.fromEntries(
  Object.entries(defaultSchema.attributes ?? {}).map(([tagName, attributes]) => [
    tagName,
    attributes.filter(
      (attribute) =>
        !Array.isArray(attribute) || !LEGACY_GLOBAL_MARKDOWN_ATTRIBUTES.has(String(attribute[0])),
    ),
  ]),
) as NonNullable<RehypeSanitizeOptions["attributes"]>;

const ISSUE_MARKDOWN_SANITIZE_SCHEMA: RehypeSanitizeOptions = {
  ...defaultSchema,
  clobber: [],
  attributes: {
    ...ISSUE_MARKDOWN_BASE_ATTRIBUTES,
    "*": [
      ...(ISSUE_MARKDOWN_BASE_ATTRIBUTES["*"] ?? []),
      "className",
      "id",
      "style",
      "width",
      "height",
    ],
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
    source: [...(ISSUE_MARKDOWN_BASE_ATTRIBUTES.source ?? []), "src", "type", "target"],
    video: [
      ...(ISSUE_MARKDOWN_BASE_ATTRIBUTES.video ?? []),
      "dataSetup",
      "controls",
      "preload",
      "type",
      "autoPlay",
      "responsive",
      "height",
      "width",
      "fluid",
      "liveui",
      "src",
    ],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto", "file", "zpl"],
    src: ["http", "https", "mailto", "file", "zpl"],
  },
  tagNames: [
    ...new Set([
      ...(defaultSchema.tagNames ?? []),
      "video",
      "source",
      "a",
      "input",
      "pre",
      "br",
      "hr",
      "iframe",
      "ol",
      "span",
    ]),
  ],
};

const LEGACY_EMOJIS = [
  { content: "👍", name: "+1" },
  { content: "❤️️", name: "heart" },
  { content: "😘", name: "wink" },
  { content: "🙂", name: "smile" },
  { content: "😕", name: "confused" },
  { content: "✅", name: "check" },
  { content: "🎉", name: "hooray" },
  { content: "😢", name: "sad" },
  { content: "👎", name: "-1" },
  { content: "🎉", name: "tada" },
  { content: "❌", name: "x" },
  { content: "⭕", name: "o" },
  { content: "😄", name: "face smile" },
  { content: "😙", name: "face smile kiss" },
  { content: "😗", name: "face kissing" },
  { content: "😲", name: "face astonished" },
  { content: "😠", name: "face angry" },
  { content: "😱", name: "face scream" },
  { content: "😢", name: "face cry" },
  { content: "😐", name: "face neutral" },
  { content: "😍", name: "face heart" },
  { content: "❓", name: "question?" },
  { content: "❗️", name: "!" },
  { content: "‼️", name: "bangbang!" },
  { content: "🍺", name: "beer" },
  { content: "🍦", name: "icecream" },
  { content: "🇰🇷", name: "korea" },
  { content: "🇺🇸", name: "us america" },
  { content: "🇫🇷", name: "fr" },
  { content: "🇨🇳", name: "cn china" },
  { content: "💯", name: "+100" },
  { content: "✔️", name: "heavy check" },
  { content: "➕", name: "+plus" },
  { content: "➖️", name: "-minus" },
  { content: "🌵️", name: "cactus" },
  { content: "🐈", name: "animal cat" },
  { content: "🍀", name: "clover" },
  { content: "✌️", name: "v️" },
  { content: "🔒", name: "lock" },
  { content: "🔓", name: "unlock" },
  { content: "💡", name: "idea bulb" },
  { content: "💣", name: "bomb" },
  { content: "📆", name: "calendar" },
  { content: "📅", name: "date" },
  { content: "🐔", name: "chicken" },
  { content: "🍄", name: "mushroom" },
  { content: "💰", name: "moneybag" },
  { content: "💵", name: "money dollar" },
  { content: "✉️", name: "envelope" },
  { content: "📈", name: "chart upward" },
  { content: "📉", name: "chart downward" },
  { content: "📦", name: "택배 parcel" },
  { content: "👏", name: "박수 clap" },
  { content: "🃏", name: "game joker" },
  { content: "🎴", name: "game cards" },
  { content: "🎲", name: "game die" },
  { content: "🍵", name: "tea" },
  { content: "☕", name: "coffee" },
  { content: "🔮", name: "crystal" },
  { content: "🚕", name: "taxi" },
  { content: "🚌", name: "bus" },
  { content: "🚋", name: "train" },
  { content: "⚠️", name: "warn" },
  { content: "⭐", name: "star" },
  { content: "☎️", name: "phone" },
] as const;

type IssueFormSearch = {
  commentId: number | string;
  parentIssueId: number | string;
};

type IssueLabelOption = {
  categoryId: string;
  categoryIsExclusive: boolean;
  categoryName: string;
  color: string;
  id: number;
  name: string;
};

type UploadRow = {
  attachment?: UploadedAttachment;
  error?: string;
  key: number;
  name: string;
  placeholder?: string;
  progress: number;
  size: number;
  status: "deleting" | "error" | "ready" | "uploading";
};

type BodySelection = {
  end: number;
  start: number;
};

type EditorMention = {
  end: number;
  query: string;
  start: number;
  trigger: "#" | ":" | "@";
};

type EditorMentionSuggestion = {
  accessibleLabel: string;
  detail: string;
  imageUrl: string;
  insertion: string;
  key: string;
  label: string;
};

type MarkdownAstNode = {
  children?: MarkdownAstNode[];
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
  };
  type: string;
  url?: string;
  value?: string;
};

type MarkdownHastNode = {
  children?: MarkdownHastNode[];
  properties?: Record<string, unknown>;
  type: string;
};

type MarkdownReferenceKind = "commit" | "issue" | "mention";

type MarkdownReferenceReplacement = {
  children: MarkdownAstNode[];
  className?: string[];
  kind: MarkdownReferenceKind;
  token: string;
  url: string;
};

type IssueMarkdownLinkProps = ComponentPropsWithoutRef<"a"> &
  ExtraProps & {
    basePath: string;
  };

const plainLinkActiveOptions = {
  exact: true,
  explicitUndefined: true,
  includeHash: true,
  includeSearch: true,
} as const;

const plainLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};

export const Route = createFileRoute("/$ownerName/$projectName/issueform")({
  component: ProjectIssueFormRoute,
  search: {
    middlewares: [
      ({ next, search }) => {
        const result = next(search);
        return {
          ...result,
          commentId: issueFormSearchId(result.commentId),
          parentIssueId: issueFormSearchId(result.parentIssueId),
        } as typeof result;
      },
    ],
  },
  validateSearch(search: Record<string, unknown>): IssueFormSearch {
    return {
      commentId: issueFormSearchId(search.commentId),
      parentIssueId: issueFormSearchId(search.parentIssueId),
    };
  },
});

function ProjectIssueFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { ownerName, projectName } = Route.useParams();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectIssueFormShell
          ownerName={ownerName}
          projectName={projectName}
          runtimeConfig={runtimeConfig}
        >
          <ProjectIssueFormScreen runtimeConfig={runtimeConfig} />
        </ProjectIssueFormShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectIssueFormShell({
  children,
  ownerName,
  projectName,
  runtimeConfig,
}: {
  children: ReactNode;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
}) {
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const projectSearchScope = projectQuery.data
    ? {
        organizationName: projectSearchScopeOrganizationName(projectQuery.data, ownerName),
        ownerName,
        projectName,
      }
    : { ownerName, projectName };

  return (
    <SiteLayoutShell projectSearchScope={projectSearchScope} runtimeConfig={runtimeConfig}>
      {children}
    </SiteLayoutShell>
  );
}

function ProjectIssueFormScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();
  const search = Route.useSearch();

  return (
    <>
      <title>{`${t("title.newIssue")} - ${ownerName}/${projectName}`}</title>
      <ProjectIssueFormProjectScreen
        ownerName={ownerName}
        projectName={projectName}
        parentIssueId={stringField(search.parentIssueId, "")}
        referCommentId={stringField(search.commentId, "")}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

export function ProjectIssueFormProjectScreen({
  initialBodyMarkdown = "",
  ownerName,
  parentIssueId = "",
  referCommentId = "",
  runtimeConfig,
  projectName,
  showSubtaskOptionOnMount = false,
}: {
  initialBodyMarkdown?: string;
  ownerName: string;
  parentIssueId?: string;
  referCommentId?: string;
  runtimeConfig: RuntimeConfig;
  projectName: string;
  showSubtaskOptionOnMount?: boolean;
}) {
  const { t } = useLegacyMessages();
  const currentPathname = useRouterState({ select: (state) => state.location.pathname });
  const [initialPathname] = useState(() => currentPathname);
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const formOptionsQuery = useQuery({
    queryFn: () => readProjectIssueFormOptions(runtimeConfig, ownerName, projectName),
    queryKey: ["project", ownerName, projectName, "issues", "form-options"],
  });
  const labelsQuery = useQuery(
    listProjectLabelsQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const parentOptionsQuery = useQuery({
    queryFn: () => listIssueParentOptions(runtimeConfig, ownerName, projectName),
    queryKey: ["project", ownerName, projectName, "issues", "parent-options"],
  });
  const openMilestonesQuery = useQuery({
    queryFn: () =>
      listProjectMilestones(runtimeConfig, ownerName, projectName, {
        orderBy: "dueDate",
        orderDir: "asc",
        state: "open",
      }),
    queryKey: ["project", ownerName, projectName, "milestones", "open", "issue-form"],
  });

  if (formOptionsQuery.error instanceof RestApiError && formOptionsQuery.error.status === 401) {
    return <IssueFormLoginRedirect redirectUrl={initialPathname} />;
  }

  const firstError = [
    projectQuery.error,
    formOptionsQuery.error,
    labelsQuery.error,
    parentOptionsQuery.error,
    openMilestonesQuery.error,
  ].find(Boolean);
  if (firstError) {
    return (
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="issue-form-load-error" role="alert">
            {firstError instanceof Error ? firstError.message : t("error.internalServerError")}
          </div>
        </div>
      </div>
    );
  }

  if (
    !projectQuery.data ||
    !formOptionsQuery.data ||
    !labelsQuery.data ||
    !parentOptionsQuery.data ||
    !openMilestonesQuery.data
  ) {
    return <div className="issue-form-loading" role="status" aria-label={t("common.loading")} />;
  }

  const initialBody = parentIssueId
    ? ""
    : initialBodyMarkdown || formOptionsQuery.data.issueTemplateMarkdown;

  return (
    <>
      <IssueFormProjectHeader project={projectQuery.data} runtimeConfig={runtimeConfig} />
      <IssueFormProjectMenu project={projectQuery.data} />
      <ProjectIssueFormBody
        canCreateIssueAssignee={formOptionsQuery.data.canCreateIssueAssignee}
        canCreateIssueMilestone={formOptionsQuery.data.canCreateIssueMilestone}
        canManageIssueLabels={formOptionsQuery.data.canManageIssueLabels}
        formProjects={[
          formOptionsQuery.data.currentProject,
          ...formOptionsQuery.data.movableIssueProjects.filter(
            (project) => project.projectId !== formOptionsQuery.data.currentProject.projectId,
          ),
        ]}
        initialBodyMarkdown={initialBody}
        labels={labelsQuery.data.labels}
        milestones={openMilestonesQuery.data.milestones}
        ownerName={ownerName}
        parentIssueId={parentIssueId}
        parentOptions={parentOptionsQuery.data.items}
        project={projectQuery.data}
        projectName={projectName}
        referCommentId={referCommentId}
        runtimeConfig={runtimeConfig}
        showSubtaskOptionOnMount={showSubtaskOptionOnMount}
      />
    </>
  );
}

function IssueFormLoginRedirect({ redirectUrl }: { redirectUrl: string }) {
  const { t } = useLegacyMessages();
  const navigate = useNavigate();

  useEffect(() => {
    void navigate({
      replace: true,
      search: { redirectUrl },
      to: "/users/loginform",
    });
  }, [navigate, redirectUrl]);

  return (
    <div className="issue-form-login-redirect" role="status">
      {t("error.auth.unauthorized.waringMessage")}
    </div>
  );
}

function IssueFormProjectHeader({
  project,
  runtimeConfig,
}: {
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const ownerName = project.ownerName;
  const projectName = project.projectName;
  const [isFavorited, setIsFavorited] = useState(project.isFavorited);
  const [isWatching, setIsWatching] = useState(project.isWatching);
  const [watchCount, setWatchCount] = useState(project.watchCount);
  const [enrollmentRequested, setEnrollmentRequested] = useState(project.enrollmentRequested);
  const [openUtility, setOpenUtility] = useState<"enrollment" | "watch" | null>(null);
  const privateProject = project.projectScope.toUpperCase() === "PRIVATE";
  const protectedProject = project.projectScope.toUpperCase() === "PROTECTED";
  const backgroundImageUrl = prefixBasePath(
    runtimeConfig.basePath,
    project.backgroundUrl || "/legacy-assets/images/project_default.jpg",
  );

  useEffect(() => setIsFavorited(project.isFavorited), [project.isFavorited]);
  useEffect(() => setIsWatching(project.isWatching), [project.isWatching]);
  useEffect(() => setWatchCount(project.watchCount), [project.watchCount]);
  useEffect(
    () => setEnrollmentRequested(project.enrollmentRequested),
    [project.enrollmentRequested],
  );

  const invalidateProject = () =>
    queryClient.invalidateQueries({
      queryKey: apiQueryKeys.project.container(ownerName, projectName),
    });
  const favoriteMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return toggleFavoriteProjectRest(runtimeConfig, csrfToken, ownerName, projectName);
    },
    onSuccess(response) {
      setIsFavorited(response.favorited);
      void invalidateProject();
    },
  });
  const watchMutation = useMutation({
    mutationFn: async (nextWatching: boolean) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return toggleProjectWatchRest(runtimeConfig, csrfToken, ownerName, projectName, nextWatching);
    },
    onSuccess(response, nextWatching) {
      setIsWatching(response.isWatching ?? nextWatching);
      setWatchCount(
        typeof response.watchCount === "number"
          ? response.watchCount
          : Math.max(0, watchCount + (nextWatching ? 1 : -1)),
      );
      setOpenUtility(null);
      void invalidateProject();
    },
  });
  const enrollmentMutation = useMutation({
    mutationFn: async (nextRequested: boolean) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return nextRequested
        ? enrollProjectRest(runtimeConfig, csrfToken, ownerName, projectName)
        : cancelEnrollProjectRest(runtimeConfig, csrfToken, ownerName, projectName);
    },
    onSuccess(response, nextRequested) {
      setEnrollmentRequested(
        typeof response.enrollmentRequested === "boolean"
          ? response.enrollmentRequested
          : nextRequested,
      );
      setOpenUtility(null);
      void invalidateProject();
    },
  });

  return (
    <div
      className="project-header-outer issue-form-project-header"
      style={{ backgroundImage: `url('${backgroundImageUrl}')` }}
    >
      <div className="project-header-inner">
        <div className="project-header-wrap">
          <div className="project-header-avatar">
            <img src={projectLogoUrl(project, runtimeConfig.basePath)} alt="" />
          </div>
          <div className={`project-breadcrumb-wrap${project.isForked ? " fork" : ""}`}>
            <div className="project-breadcrumb">
              <span className="project-author hide-in-mobile">
                <Link
                  activeOptions={plainLinkActiveOptions}
                  activeProps={plainLinkActiveProps}
                  to="/$user"
                  params={{ user: ownerName }}
                  search={{ daysAgo: 14, selected: "issues" }}
                >
                  {ownerName}
                </Link>
              </span>
              <span className="project-separator hide-in-mobile">/</span>
              <span className="project-name">
                <Link
                  activeOptions={plainLinkActiveOptions}
                  activeProps={plainLinkActiveProps}
                  to="/$ownerName/$projectName"
                  params={{ ownerName, projectName }}
                >
                  {projectName}
                </Link>
              </span>
              <span className="user-project-list">
                <button
                  type="button"
                  className="star-project"
                  aria-label={t("title.favorite")}
                  disabled={favoriteMutation.isPending}
                  onClick={() => favoriteMutation.mutate()}
                >
                  <i className={`${isFavorited ? "starred " : ""}star material-icons va-text-top`}>
                    star
                  </i>
                </button>
              </span>
              {privateProject ? (
                <span className="project-private">
                  <i className="yobicon-lock" />
                </span>
              ) : null}
              {protectedProject ? (
                <span className="project-protected" title="Group Project">
                  G
                </span>
              ) : null}
            </div>
            {project.isForked && project.originOwnerName && project.originProjectName ? (
              <div className="project-origin">
                <span className="project-origin-title">{t("fork.original")}</span>
                <Link
                  activeOptions={plainLinkActiveOptions}
                  activeProps={plainLinkActiveProps}
                  to="/$ownerName/$projectName"
                  params={{
                    ownerName: project.originOwnerName,
                    projectName: project.originProjectName,
                  }}
                  className="project-origin-name"
                >
                  {project.originOwnerName} / {project.originProjectName}
                </Link>
              </div>
            ) : null}
          </div>
          <div className="project-util-wrap">
            <ul className="project-util">
              {project.viewerCanEnroll ? (
                <li className={openUtility === "enrollment" ? "open" : undefined}>
                  <button
                    type="button"
                    className={`ybtn ybtn-small${enrollmentRequested ? " ybtn-info" : ""}`}
                    aria-expanded={openUtility === "enrollment"}
                    disabled={enrollmentMutation.isPending}
                    onClick={() =>
                      setOpenUtility((current) => (current === "enrollment" ? null : "enrollment"))
                    }
                  >
                    <i className="yobicon-addfriend" /> {t("organization.member.enrollment.title")}
                  </button>
                  {openUtility === "enrollment" ? (
                    <div className="dropdown-menu flat right title issue-project-utility-menu">
                      <div className="pop-content btn-wrap">
                        <button
                          type="button"
                          className="ybtn enrollBtn"
                          onClick={() => enrollmentMutation.mutate(!enrollmentRequested)}
                        >
                          {t(
                            enrollmentRequested
                              ? "button.cancel.enrollment"
                              : "button.new.enrollment",
                          )}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              ) : null}
              {project.viewerCanWatch || project.viewerCanLeave ? (
                <li className={openUtility === "watch" ? "open" : undefined}>
                  <div
                    className={`btn-group dropdown watch-btn${openUtility === "watch" ? " open" : ""}`}
                  >
                    <Link
                      activeOptions={plainLinkActiveOptions}
                      activeProps={plainLinkActiveProps}
                      className={`btn watcher-count no-border${isWatching ? " watch-on" : ""}`}
                      title={t("project.watcher.number")}
                      to="/$ownerName/$projectName/watchers"
                      params={{ ownerName, projectName }}
                    >
                      {watchCount}
                    </Link>
                    <button
                      type="button"
                      className="btn nofocus no-border down-arrow"
                      aria-expanded={openUtility === "watch"}
                      onClick={() =>
                        setOpenUtility((current) => (current === "watch" ? null : "watch"))
                      }
                    >
                      {t(isWatching ? "project.unwatch" : "project.watch")}
                    </button>
                    {openUtility === "watch" ? (
                      <div className="dropdown-menu flat right title issue-project-utility-menu">
                        <div className="pop-title">
                          {t(
                            isWatching
                              ? "project.you.are.watching"
                              : "project.you.are.not.watching",
                            { args: [projectName] },
                          )}
                        </div>
                        <div className="pop-content btn-wrap">
                          <button
                            type="button"
                            className="ybtn ybtn-watching watchBtn"
                            disabled={watchMutation.isPending}
                            onClick={() => watchMutation.mutate(!isWatching)}
                          >
                            <i className={isWatching ? "yobicon-eye-off" : "yobicon-eye"} />{" "}
                            {t(isWatching ? "project.unwatch" : "project.watch")}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function IssueFormProjectMenu({ project }: { project: ProjectContainer }) {
  const { t } = useLegacyMessages();
  const { ownerName, projectName } = project;
  const count = (value: number) =>
    value > 0 ? <span className="project-menu-count">{value}</span> : null;

  return (
    <div className="project-menu-outer">
      <div className="project-menu-inner">
        <ul className="project-menu-nav project-menu-gruop">
          <li>
            <Link to="/$ownerName/$projectName" params={{ ownerName, projectName }}>
              <span className="menu-name">{t("title.projectHome")}</span>
              <span className="short-menu">H</span>
            </Link>
          </li>
          {project.showCode ? (
            <li className="code-menu">
              <Link to="/$ownerName/$projectName/code" params={{ ownerName, projectName }}>
                <span className="menu-name">{t("menu.code")}</span>
                <span className="short-menu">C</span>
              </Link>
            </li>
          ) : null}
          {project.showIssue ? (
            <li className="active">
              <Link
                to="/$ownerName/$projectName/issues"
                params={{ ownerName, projectName }}
                search={{
                  assigneeId: "",
                  authorId: "",
                  commenterId: "",
                  dueDate: "",
                  filter: "",
                  labelIds: [],
                  milestoneId: "",
                  orderBy: "createdDate",
                  orderDir: "desc",
                  pageNum: 1,
                  state: "open",
                }}
              >
                <span className="menu-name">{t("menu.issue")}</span>
                <span className="short-menu">I</span>
                {count(project.openIssueCount)}
              </Link>
            </li>
          ) : null}
          {project.showPullRequest && project.vcs.toUpperCase() === "GIT" ? (
            <li>
              {project.isForked ? (
                <Link
                  to="/$ownerName/$projectName/sentPullRequests"
                  params={{ ownerName, projectName }}
                  search={{ contributorId: 0, filter: "", pageNum: 1 }}
                >
                  <span className="menu-name">{t("menu.pullRequest")}</span>
                  <span className="short-menu">P</span>
                  {count(project.openPullRequestCount)}
                </Link>
              ) : (
                <Link
                  to="/$ownerName/$projectName/pullRequests"
                  params={{ ownerName, projectName }}
                  search={{ contributorId: 0, filter: "", pageNum: 1 }}
                >
                  <span className="menu-name">{t("menu.pullRequest")}</span>
                  <span className="short-menu">P</span>
                  {count(project.openPullRequestCount)}
                </Link>
              )}
            </li>
          ) : null}
          {project.showReview ? (
            <li>
              <Link
                to="/$ownerName/$projectName/reviews"
                params={{ ownerName, projectName }}
                search={{
                  authorId: 0,
                  filter: "",
                  orderBy: "",
                  orderDir: "",
                  pageNum: 1,
                  participantId: 0,
                  state: "open",
                }}
              >
                <span className="menu-name">{t("menu.review")}</span>
                <span className="short-menu">R</span>
                {count(project.reviewCount)}
              </Link>
            </li>
          ) : null}
          {project.showMilestone ? (
            <li>
              <Link to="/$ownerName/$projectName/milestones" params={{ ownerName, projectName }}>
                <span className="menu-name">{t("milestone")}</span>
                <span className="short-menu">M</span>
              </Link>
            </li>
          ) : null}
          {project.showBoard ? (
            <li>
              <Link
                to="/$ownerName/$projectName/posts"
                params={{ ownerName, projectName }}
                search={{
                  filter: "",
                  labelIds: [],
                  orderBy: "updatedDate",
                  orderDir: "desc",
                  pageNum: 1,
                }}
              >
                <span className="menu-name">{t("menu.board")}</span>
                <span className="short-menu">B</span>
                {count(project.boardCount)}
              </Link>
            </li>
          ) : null}
        </ul>
        {project.showAdmin ? (
          <div className="project-setting">
            <ul className="project-menu-nav">
              <li>
                <Link to="/$ownerName/$projectName/settingform" params={{ ownerName, projectName }}>
                  <i className="yobicon-cog" />
                  <span className="blind">
                    <span className="menu-name">{t("menu.admin")}</span>
                  </span>
                  {count(project.enrollmentRequestCount)}
                </Link>
              </li>
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProjectIssueFormBody({
  canCreateIssueAssignee,
  canCreateIssueMilestone,
  canManageIssueLabels,
  formProjects,
  initialBodyMarkdown,
  labels: rawLabels,
  milestones,
  ownerName,
  parentIssueId: initialParentIssueId,
  parentOptions,
  project,
  projectName,
  referCommentId,
  runtimeConfig,
  showSubtaskOptionOnMount,
}: {
  canCreateIssueAssignee: boolean;
  canCreateIssueMilestone: boolean;
  canManageIssueLabels: boolean;
  formProjects: Array<{
    logoUrl: string;
    ownerName: string;
    projectId: number;
    projectName: string;
  }>;
  initialBodyMarkdown: string;
  labels: YonaRecord[];
  milestones: ProjectMilestone[];
  ownerName: string;
  parentIssueId: string;
  parentOptions: Array<{
    id: bigint | number;
    issueNumber: bigint | number;
    selected: boolean;
    title: string;
  }>;
  project: ProjectContainer;
  projectName: string;
  referCommentId: string;
  runtimeConfig: RuntimeConfig;
  showSubtaskOptionOnMount: boolean;
}) {
  const { t } = useLegacyMessages();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const setRootToast = useRootToast();
  const routePathname = useRouterState({ select: (state) => state.location.pathname });
  const draftKey = prefixBasePath(runtimeConfig.basePath, routePathname);
  const labels = useMemo(() => normalizeIssueLabels(rawLabels), [rawLabels]);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);
  const datePickerRef = useRef<HTMLInputElement>(null);
  const allowNavigationRef = useRef(false);
  const pendingBodySelectionRef = useRef<BodySelection | null>(null);
  const uploadSequenceRef = useRef(0);
  const draftTouchedRef = useRef(false);
  const [title, setTitle] = useState("");
  const [bodyMarkdown, setBodyMarkdown] = useState(initialBodyMarkdown);
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState<IssueAssignableUserItem | null>(null);
  const [selectedLabelIds, setSelectedLabelIds] = useState<number[]>([]);
  const [milestoneId, setMilestoneId] = useState("");
  const [isSubtaskOptionVisible, setIsSubtaskOptionVisible] = useState(
    initialParentIssueId !== "" || showSubtaskOptionOnMount,
  );
  const [isSubtaskOptionHighlighted, setIsSubtaskOptionHighlighted] =
    useState(showSubtaskOptionOnMount);
  const [targetProjectId, setTargetProjectId] = useState(() => projectIdNumber(project));
  const [parentIssueId, setParentIssueId] = useState(initialParentIssueId);
  const [draftNotice, setDraftNotice] = useState("");
  const [hasEditorActivated, setHasEditorActivated] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [uploadRows, setUploadRows] = useState<UploadRow[]>([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const isCrossProject = targetProjectId !== projectIdNumber(project);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (typeof localStorage === "undefined") {
      return;
    }
    const storedDraft = localStorage.getItem(draftKey);
    if (storedDraft) {
      setBodyMarkdown(storedDraft);
    }
  }, [draftKey]);

  useEffect(() => {
    if (!draftTouchedRef.current || typeof localStorage === "undefined") {
      return;
    }
    if (bodyMarkdown === "") {
      localStorage.removeItem(draftKey);
      setDraftNotice("");
      return;
    }
    setDraftNotice("");
    const timeoutId = setTimeout(() => {
      localStorage.setItem(draftKey, bodyMarkdown);
      setDraftNotice("Draft saved");
    }, DRAFT_SAVE_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, [bodyMarkdown, draftKey]);

  useLayoutEffect(() => {
    const pendingSelection = pendingBodySelectionRef.current;
    const textarea = bodyRef.current;
    if (!pendingSelection || !textarea) {
      return;
    }
    textarea.setSelectionRange(pendingSelection.start, pendingSelection.end);
    pendingBodySelectionRef.current = null;
  }, [bodyMarkdown]);

  useBlocker({
    enableBeforeUnload: () =>
      hasEditorActivated && bodyMarkdown.trim() !== "" && !allowNavigationRef.current,
    shouldBlockFn: ({ current, next }) => {
      if (
        current.pathname === next.pathname &&
        issueFormSearchMatches(current.search, next.search)
      ) {
        return false;
      }
      if (!hasEditorActivated || bodyMarkdown.trim() === "" || allowNavigationRef.current) {
        return false;
      }
      return !globalThis.confirm(t("issue.error.beforeunload"));
    },
  });

  const cancelIssueForm = () => {
    const isDirty = hasEditorActivated && bodyMarkdown.trim() !== "" && !allowNavigationRef.current;
    if (isDirty && !globalThis.confirm(t("issue.error.beforeunload"))) {
      return;
    }
    allowNavigationRef.current = true;
    router.history.back();
  };

  const setToast = useCallback(
    (message: string, durationMs = 3_000) => {
      setRootToast({ durationMs, key: `${Date.now()}-${message}`, message });
    },
    [setRootToast],
  );

  const selectLabel = useCallback(
    (labelId: number) => {
      const selectedLabel = labels.find((label) => label.id === labelId);
      if (!selectedLabel) {
        return;
      }
      setSelectedLabelIds((current) => {
        const withoutSelected = current.filter((id) => id !== labelId);
        const withoutExclusivePeers = selectedLabel.categoryIsExclusive
          ? withoutSelected.filter((id) => {
              const label = labels.find((candidate) => candidate.id === id);
              return label?.categoryId !== selectedLabel.categoryId;
            })
          : withoutSelected;
        return [...withoutExclusivePeers, labelId];
      });
    },
    [labels],
  );

  const attachmentIds = uploadRows.flatMap((row) =>
    row.status === "ready" && row.attachment ? [row.attachment.id] : [],
  );
  const mutation = useMutation({
    mutationFn: async ({
      dueDate: normalizedDueDate,
      isDraft,
    }: {
      dueDate: string;
      isDraft: boolean;
    }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return createIssue(runtimeConfig, csrfToken, {
        assigneeLoginId: assignee?.loginId ?? "",
        attachmentIds,
        bodyMarkdown,
        dueDate: normalizedDueDate,
        isDraft,
        labelIds: selectedLabelIds,
        milestoneId: Number(milestoneId) || undefined,
        ownerName,
        parentIssueId:
          isSubtaskOptionVisible && !isCrossProject && parentIssueId
            ? Number(parentIssueId)
            : undefined,
        projectName,
        referCommentId: referCommentId || undefined,
        targetProjectId: isSubtaskOptionVisible ? targetProjectId : undefined,
        title: title.trim(),
      });
    },
    onError(error) {
      allowNavigationRef.current = false;
      setSubmitError(error instanceof Error ? error.message : t("error.internalServerError"));
    },
    async onSuccess(issue) {
      const targetOwnerName = stringField(issue.ownerName, ownerName);
      const targetProjectName = stringField(issue.projectName, projectName);
      await queryClient.invalidateQueries({
        queryKey: ["project", ownerName, projectName, "issues"],
      });
      if (targetOwnerName !== ownerName || targetProjectName !== projectName) {
        await queryClient.invalidateQueries({
          queryKey: ["project", targetOwnerName, targetProjectName, "issues"],
        });
      }
      allowNavigationRef.current = true;
      await navigate({
        to: "/$ownerName/$projectName/issue/$issueNumber",
        params: {
          issueNumber: stringField(issue.issueNumber, ""),
          ownerName: targetOwnerName,
          projectName: targetProjectName,
        },
      });
    },
  });

  const validateAndSubmit = (isDraft: boolean) => {
    setSubmitError("");
    if (title.trim() === "") {
      globalThis.alert(t("issue.error.emptyTitle"));
      titleRef.current?.focus();
      return;
    }
    const normalizedDueDate = normalizeIssueDueDate(dueDate);
    if (normalizedDueDate === null) {
      setToast(t("issue.error.invalid.duedate"));
      dueDateRef.current?.focus();
      return;
    }
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(draftKey);
    }
    setDraftNotice("");
    mutation.mutate({ dueDate: normalizedDueDate, isDraft });
  };

  const replaceBodyMarker = useCallback((marker: string, replacement: string) => {
    setBodyMarkdown((current) => {
      const markerStart = current.indexOf(marker);
      if (markerStart < 0) {
        return current;
      }
      const textarea = bodyRef.current;
      const selection = pendingBodySelectionRef.current ?? {
        end: textarea?.selectionEnd ?? 0,
        start: textarea?.selectionStart ?? 0,
      };
      const markerEnd = markerStart + marker.length;
      const delta = replacement.length - marker.length;
      const adjustPosition = (position: number) => {
        if (position <= markerStart) {
          return position;
        }
        if (position <= markerEnd) {
          return markerStart + replacement.length;
        }
        return position + delta;
      };
      pendingBodySelectionRef.current = {
        end: adjustPosition(selection.end),
        start: adjustPosition(selection.start),
      };
      return `${current.slice(0, markerStart)}${replacement}${current.slice(markerEnd)}`;
    });
    draftTouchedRef.current = true;
  }, []);

  const insertBodyUploadPlaceholders = useCallback(
    (placeholders: string[], selection: BodySelection) => {
      const insertion = placeholders.join("");
      setBodyMarkdown((current) => {
        const start = Math.max(0, Math.min(selection.start, current.length));
        const nextCaret = start + insertion.length;
        pendingBodySelectionRef.current = { end: nextCaret, start: nextCaret };
        return `${current.slice(0, start)}${insertion}${current.slice(start)}`;
      });
      draftTouchedRef.current = true;
      setHasEditorActivated(true);
    },
    [],
  );

  const uploadFiles = useCallback(
    async (files: File[], insertionSelection?: BodySelection) => {
      if (files.length === 0) {
        return;
      }
      const maxFileSize = runtimeConfig.maxUploadedFileSize ?? Number.MAX_SAFE_INTEGER;
      const uploadableFiles = files.filter((file) => file.size <= maxFileSize);
      if (uploadableFiles.length !== files.length) {
        setToast(
          legacyHtmlMessageToText(t("error.toolargefile", { args: [humanFileSize(maxFileSize)] })),
        );
      }
      if (uploadableFiles.length === 0) {
        return;
      }
      const rows = uploadableFiles.map((file) => {
        const key = ++uploadSequenceRef.current;
        return {
          key,
          name: file.name || "upload.bin",
          placeholder: insertionSelection ? uploadPlaceholder(key) : undefined,
          progress: 0,
          size: file.size,
          status: "uploading" as const,
        };
      });
      if (insertionSelection) {
        insertBodyUploadPlaceholders(
          rows.flatMap((row) => (row.placeholder ? [row.placeholder] : [])),
          insertionSelection,
        );
      }
      setUploadRows((current) => [...current, ...rows]);
      let csrfToken = "";
      try {
        csrfToken = (await readSessionBootstrap(runtimeConfig)).csrfToken;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Attachment upload failed.";
        setUploadRows((current) =>
          current.filter((row) => !rows.some((candidate) => candidate.key === row.key)),
        );
        rows.forEach((row) => row.placeholder && replaceBodyMarker(row.placeholder, ""));
        setToast(t("common.attach.error.upload", { args: ["", message] }));
        return;
      }
      await Promise.all(
        uploadableFiles.map(async (file, index) => {
          const uploadRow = rows[index];
          try {
            const attachment = await uploadTemporaryAttachment(
              runtimeConfig,
              csrfToken,
              file,
              fetch,
              (progress) => {
                setUploadRows((current) =>
                  current.map((row) =>
                    row.key === uploadRow.key
                      ? { ...row, progress: Math.max(0, Math.min(progress, 100)) }
                      : row,
                  ),
                );
              },
            );
            if (uploadRow.placeholder) {
              replaceBodyMarker(
                uploadRow.placeholder,
                attachmentMarkdown(attachment, runtimeConfig.basePath),
              );
            }
            setUploadRows((current) =>
              current.map((row) =>
                row.key === uploadRow.key
                  ? {
                      ...row,
                      attachment,
                      name: attachment.name,
                      progress: 100,
                      size: attachment.size,
                      status: "ready",
                    }
                  : row,
              ),
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : "Attachment upload failed.";
            if (uploadRow.placeholder) {
              replaceBodyMarker(uploadRow.placeholder, "");
            }
            setUploadRows((current) => current.filter((row) => row.key !== uploadRow.key));
            setToast(t("common.attach.error.upload", { args: ["", message] }));
          }
        }),
      );
    },
    [insertBodyUploadPlaceholders, replaceBodyMarker, runtimeConfig, setToast, t],
  );

  const removeAttachment = async (row: UploadRow) => {
    if (!row.attachment || row.status !== "ready") {
      setUploadRows((current) => current.filter((candidate) => candidate.key !== row.key));
      return;
    }
    setUploadRows((current) =>
      current.map((candidate) =>
        candidate.key === row.key ? { ...candidate, status: "deleting" } : candidate,
      ),
    );
    try {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      await deleteTemporaryAttachment(runtimeConfig, csrfToken, row.attachment.id);
      const link = attachmentMarkdown(row.attachment, runtimeConfig.basePath);
      setBodyMarkdown((current) => current.split(link).join("").split(link.trim()).join(""));
      draftTouchedRef.current = true;
      setUploadRows((current) => current.filter((candidate) => candidate.key !== row.key));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Attachment delete failed.";
      setUploadRows((current) =>
        current.map((candidate) =>
          candidate.key === row.key
            ? {
                ...candidate,
                error: undefined,
                status: "ready",
              }
            : candidate,
        ),
      );
      setToast(t("common.attach.error.delete", { args: ["", message] }));
    }
  };

  const insertAttachment = (attachment: UploadedAttachment) => {
    const textarea = bodyRef.current;
    const insertion = attachmentMarkdown(attachment, runtimeConfig.basePath);
    const start = textarea?.selectionStart ?? bodyMarkdown.length;
    setBodyMarkdown(`${bodyMarkdown.slice(0, start)}${insertion}${bodyMarkdown.slice(start)}`);
    draftTouchedRef.current = true;
    setHasEditorActivated(true);
    requestAnimationFrame(() => {
      const nextCursor = start + insertion.length;
      bodyRef.current?.focus();
      bodyRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleFileDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingFiles(false);
    void uploadFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <div className="page-wrap-outer issue-form-page-wrap">
      <div className="project-page-wrap">
        <div className="content-wrap frm-wrap">
          <form
            id="issue-form"
            action={prefixBasePath(
              runtimeConfig.basePath,
              `/${ownerName}/${projectName}/issues/latest`,
            )}
            encType="multipart/form-data"
            method="post"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              validateAndSubmit(false);
            }}
          >
            <div className="row-fluid">
              <div className="span12">
                <dl>
                  <dd>
                    <div className="span12 issue-title-row">
                      <div className="span11 issue-title-field">
                        <TitleInput
                          ownerName={ownerName}
                          projectName={projectName}
                          runtimeConfig={runtimeConfig}
                          selectLabel={selectLabel}
                          setToast={setToast}
                          title={title}
                          titleRef={titleRef}
                          onFocusBody={() => bodyRef.current?.focus()}
                          onTitleChange={setTitle}
                        />
                      </div>
                      <button
                        type="button"
                        className={`span1 subtask-message${isSubtaskOptionHighlighted ? " option-on" : ""}`}
                        aria-expanded={isSubtaskOptionVisible}
                        onClick={() =>
                          setIsSubtaskOptionVisible((current) => {
                            const next = !current;
                            setIsSubtaskOptionHighlighted(next);
                            return next;
                          })
                        }
                      >
                        {t("issue.option")}
                      </button>
                    </div>
                    {submitError ? (
                      <div className="message issue-form-error" role="alert">
                        {submitError}
                      </div>
                    ) : null}
                    <SubtaskSelects
                      currentProjectId={projectIdNumber(project)}
                      formProjects={formProjects}
                      parentIssueId={parentIssueId}
                      parentOptions={parentOptions}
                      showOption={isSubtaskOptionVisible}
                      targetProjectId={targetProjectId}
                      onParentIssueChange={setParentIssueId}
                      onTargetProjectChange={(nextProjectId) => {
                        setTargetProjectId(nextProjectId);
                        if (nextProjectId !== projectIdNumber(project)) {
                          setParentIssueId("");
                          const target = formProjects.find(
                            (candidate) => candidate.projectId === nextProjectId,
                          );
                          setToast(
                            `Issue will be moved or written to '${target?.projectName ?? ""}'`,
                            4_000,
                          );
                        }
                      }}
                    />
                  </dd>
                </dl>
              </div>
              <div className="row-fluid issue-form-columns">
                <div className="span9 span-left-pane">
                  <dl>
                    <dd className="issue-editor-cell">
                      <IssueMarkdownEditor
                        bodyMarkdown={bodyMarkdown}
                        bodyRef={bodyRef}
                        draftNotice={draftNotice}
                        ownerName={ownerName}
                        projectName={projectName}
                        runtimeConfig={runtimeConfig}
                        onBodyChange={(value) => {
                          draftTouchedRef.current = true;
                          setHasEditorActivated(true);
                          setBodyMarkdown(value);
                        }}
                        onBodyFocus={() => setHasEditorActivated(true)}
                        onFiles={(files, selection) => void uploadFiles(files, selection)}
                      />
                    </dd>
                  </dl>
                  <IssuePostFileUploader
                    isDragging={isDraggingFiles}
                    rows={uploadRows}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setIsDraggingFiles(true);
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      setIsDraggingFiles(false);
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleFileDrop}
                    onFiles={(files) => void uploadFiles(files)}
                    onInsert={insertAttachment}
                    onRemove={(row) => void removeAttachment(row)}
                  />
                  <div className="actrow right-txt">
                    <button
                      type="submit"
                      id="button-save"
                      className="ybtn ybtn-success"
                      disabled={mutation.isPending}
                    >
                      {t("button.save")}
                    </button>{" "}
                    <button
                      type="button"
                      id="draft-save-btn"
                      className="ybtn ybtn-watching draft-save-btn"
                      title={t("button.draft.save.description")}
                      disabled={mutation.isPending}
                      onClick={() => validateAndSubmit(true)}
                    >
                      {t("button.draft.save")}
                    </button>
                    <button
                      type="button"
                      className="ybtn issue-form-cancel"
                      onClick={cancelIssueForm}
                    >
                      {t("button.cancel")}
                    </button>
                  </div>
                </div>
                <div className="span3 span-hard-wrap right-menu">
                  {canCreateIssueAssignee ? (
                    <IssueAssigneeSelect
                      ownerName={ownerName}
                      projectName={projectName}
                      runtimeConfig={runtimeConfig}
                      selected={assignee}
                      onSelect={setAssignee}
                    />
                  ) : null}
                  {project.showMilestone && canCreateIssueMilestone ? (
                    <IssueMilestoneSelect
                      milestoneId={milestoneId}
                      milestones={milestones}
                      ownerName={ownerName}
                      projectName={projectName}
                      onChange={setMilestoneId}
                    />
                  ) : null}
                  <IssueDueDateInput
                    datePickerRef={datePickerRef}
                    dueDate={dueDate}
                    dueDateRef={dueDateRef}
                    onChange={setDueDate}
                  />
                  <IssueLabelSelect
                    canManageIssueLabels={canManageIssueLabels}
                    labels={labels}
                    ownerName={ownerName}
                    projectName={projectName}
                    selectedLabelIds={selectedLabelIds}
                    onRemove={(labelId) =>
                      setSelectedLabelIds((current) => current.filter((id) => id !== labelId))
                    }
                    onSelect={selectLabel}
                  />
                  <input type="hidden" name="referCommentId" value={referCommentId} />
                  <input
                    type="hidden"
                    id="isDraft"
                    name="isDraft"
                    value={mutation.variables?.isDraft ? "true" : "false"}
                  />
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function TitleInput({
  onFocusBody,
  onTitleChange,
  ownerName,
  projectName,
  runtimeConfig,
  selectLabel,
  setToast,
  title,
  titleRef,
}: {
  onFocusBody: () => void;
  onTitleChange: (value: string) => void;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  selectLabel: (labelId: number) => void;
  setToast: (message: string, durationMs?: number) => void;
  title: string;
  titleRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { t } = useLegacyMessages();
  const titleQuery = titleHeadQuery(title);
  const debouncedQuery = useDebouncedValue(titleQuery, SEARCH_DELAY_MS);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dismissedQuery, setDismissedQuery] = useState<string | null>(null);
  const titleHeadsQuery = useQuery({
    enabled: debouncedQuery !== null,
    queryFn: () =>
      searchProjectTitleHeads(runtimeConfig, ownerName, projectName, debouncedQuery ?? ""),
    queryKey: ["project", ownerName, projectName, "title-heads", debouncedQuery],
  });
  const suggestions = useMemo(() => {
    if (titleQuery === null || titleQuery !== debouncedQuery || dismissedQuery === titleQuery) {
      return [];
    }
    const normalizedQuery = titleQuery.toLowerCase();
    return [...(titleHeadsQuery.data?.result ?? [])]
      .filter((item) => item.searchText.toLowerCase().includes(normalizedQuery))
      .sort(
        (left, right) =>
          right.frequency - left.frequency ||
          compareLowercaseCodeUnits(left.category, right.category) ||
          compareLowercaseCodeUnits(left.name, right.name),
      )
      .slice(0, 10);
  }, [debouncedQuery, dismissedQuery, titleHeadsQuery.data?.result, titleQuery]);

  useEffect(() => setActiveIndex(-1), [debouncedQuery]);

  const chooseSuggestion = (suggestion: ProjectTitleHeadItem) => {
    const openBracket = title.lastIndexOf("[");
    if (openBracket < 0) {
      return;
    }
    if (suggestion.category && suggestion.id !== undefined) {
      selectLabel(suggestion.id);
      onTitleChange(title.slice(0, openBracket));
      setToast(`Label: ${suggestion.name}`);
    } else {
      onTitleChange(`${title.slice(0, openBracket)}[${suggestion.name}]`);
    }
    setDismissedQuery(null);
    requestAnimationFrame(() => titleRef.current?.focus());
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length > 0 && titleQuery !== null) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % suggestions.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        chooseSuggestion(suggestions[Math.max(activeIndex, 0)]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setDismissedQuery(titleQuery);
        return;
      }
    }
    if (event.key === "Enter") {
      event.preventDefault();
      onFocusBody();
    }
  };

  return (
    <div
      className="title-head-combobox"
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDismissedQuery(titleQuery);
        }
      }}
    >
      <input
        ref={titleRef}
        type="text"
        id="title"
        name="title"
        value={title}
        className="text title"
        maxLength={250}
        tabIndex={1}
        placeholder={t("title")}
        autoComplete="off"
        title={t("title.help.key")}
        role="combobox"
        aria-autocomplete="list"
        aria-controls="title-head-options"
        aria-expanded={suggestions.length > 0}
        aria-activedescendant={activeIndex >= 0 ? `title-head-${activeIndex}` : undefined}
        onChange={(event) => {
          setDismissedQuery(null);
          onTitleChange(event.currentTarget.value);
        }}
        onKeyDown={handleKeyDown}
      />
      {suggestions.length > 0 ? (
        <div
          id="title-head-options"
          className="issue-combobox-options title-head-options"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <button
              type="button"
              id={`title-head-${index}`}
              key={`${suggestion.category}-${suggestion.id ?? suggestion.name}`}
              className={index === activeIndex ? "active" : undefined}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseSuggestion(suggestion)}
            >
              <small style={{ color: normalizedColor(suggestion.labelColor ?? "") }}>
                {suggestion.category}
              </small>{" "}
              {suggestion.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SubtaskSelects({
  currentProjectId,
  formProjects,
  onParentIssueChange,
  onTargetProjectChange,
  parentIssueId,
  parentOptions,
  showOption,
  targetProjectId,
}: {
  currentProjectId: number;
  formProjects: Array<{
    logoUrl: string;
    ownerName: string;
    projectId: number;
    projectName: string;
  }>;
  onParentIssueChange: (value: string) => void;
  onTargetProjectChange: (value: number) => void;
  parentIssueId: string;
  parentOptions: Array<{
    id: bigint | number;
    issueNumber: bigint | number;
    selected: boolean;
    title: string;
  }>;
  showOption: boolean;
  targetProjectId: number;
}) {
  const { t } = useLegacyMessages();
  const isCrossProject = targetProjectId !== currentProjectId;
  const [projectOpen, setProjectOpen] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  const selectedProject =
    formProjects.find((project) => project.projectId === targetProjectId) ?? formProjects[0];
  const selectedParent = parentOptions.find((issue) => String(issue.id) === String(parentIssueId));

  const selectProject = (projectId: number) => {
    onTargetProjectChange(projectId);
    setProjectOpen(false);
  };

  const selectParent = (value: string) => {
    onParentIssueChange(value);
    setParentOpen(false);
  };

  return (
    <div className={`subtask-wrap${showOption ? " show" : ""}`} aria-hidden={!showOption}>
      <div className="span3">
        <div
          id="s2id_targetProjectId"
          className={`select2-container fullsize${projectOpen ? " select2-dropdown-open select2-container-active" : ""}`}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setProjectOpen(false);
            }
          }}
        >
          <div
            className="select2-choice"
            role="combobox"
            tabIndex={0}
            aria-label={t("organization.choose.projects")}
            aria-controls="targetProjectId-options"
            aria-expanded={projectOpen}
            onClick={() => setProjectOpen((current) => !current)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setProjectOpen((current) => !current);
              }
            }}
          >
            <span className="select2-chosen">
              <span className="usf-group" title={selectedProject?.projectName}>
                <span className="width25px" />
                <span className="loginid">
                  {selectedProject?.projectId === currentProjectId
                    ? ""
                    : `${selectedProject?.ownerName} /`}
                </span>
                <span className="name">{selectedProject?.projectName}</span>
              </span>
            </span>
            <abbr className="select2-search-choice-close" />
            <span className="select2-arrow" aria-hidden="true">
              <b />
            </span>
          </div>
          <input
            className="select2-focusser select2-offscreen"
            type="text"
            aria-label={t("organization.choose.projects")}
          />
          <div
            id="targetProjectId-options"
            className={`select2-drop select2-with-searchbox${projectOpen ? " select2-drop-active" : " select2-display-none"}`}
          >
            <div className="select2-search">
              <input className="select2-input" type="text" autoComplete="off" />
            </div>
            <ul className="select2-results" role="listbox">
              {formProjects.map((formProject) => (
                <li key={formProject.projectId}>
                  <div
                    className="select2-result-label"
                    role="option"
                    tabIndex={0}
                    aria-selected={formProject.projectId === targetProjectId}
                    onClick={() => selectProject(formProject.projectId)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectProject(formProject.projectId);
                      }
                    }}
                  >
                    {formProject.projectId === currentProjectId
                      ? formProject.projectName
                      : `${formProject.ownerName} / ${formProject.projectName}`}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <select
          id="targetProjectId"
          name="targetProjectId"
          className="select2-offscreen"
          value={String(targetProjectId)}
          disabled={!showOption}
          onChange={(event) => onTargetProjectChange(Number(event.currentTarget.value))}
        >
          {formProjects.map((formProject) => (
            <option key={formProject.projectId} value={formProject.projectId}>
              {formProject.projectId === currentProjectId
                ? formProject.projectName
                : `${formProject.ownerName} / ${formProject.projectName}`}
            </option>
          ))}
        </select>
      </div>
      <div className="span6 subtask-parent-control" hidden={isCrossProject}>
        <div
          id="s2id_parentId"
          className={`select2-container fullsize${parentOpen ? " select2-dropdown-open select2-container-active" : ""}`}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setParentOpen(false);
            }
          }}
        >
          <div
            className="select2-choice"
            role="combobox"
            tabIndex={0}
            aria-label={t("issue.subtask.select")}
            aria-controls="parentId-options"
            aria-expanded={parentOpen}
            onClick={() => setParentOpen((current) => !current)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setParentOpen((current) => !current);
              }
            }}
          >
            <span className="select2-chosen">
              <span
                title={
                  selectedParent
                    ? `#${String(selectedParent.issueNumber)}. ${selectedParent.title}`
                    : undefined
                }
              >
                {selectedParent
                  ? `#${String(selectedParent.issueNumber)}. ${selectedParent.title}`
                  : t("issue.subtask.select")}
              </span>
            </span>
            <abbr className="select2-search-choice-close" />
            <span className="select2-arrow" aria-hidden="true">
              <b />
            </span>
          </div>
          <input
            className="select2-focusser select2-offscreen"
            type="text"
            aria-label={t("issue.subtask.select")}
          />
          <div
            id="parentId-options"
            className={`select2-drop select2-with-searchbox${parentOpen ? " select2-drop-active" : " select2-display-none"}`}
          >
            <div className="select2-search">
              <input className="select2-input" type="text" autoComplete="off" />
            </div>
            <ul className="select2-results" role="listbox">
              <li>
                <div
                  className="select2-result-label"
                  role="option"
                  tabIndex={0}
                  aria-selected={parentIssueId === ""}
                  onClick={() => selectParent("")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectParent("");
                    }
                  }}
                >
                  {t("issue.subtask.select")}
                </div>
              </li>
              {parentOptions.map((issue) => (
                <li key={String(issue.id)}>
                  <div
                    className="select2-result-label"
                    role="option"
                    tabIndex={0}
                    aria-selected={String(issue.id) === parentIssueId}
                    onClick={() => selectParent(String(issue.id))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectParent(String(issue.id));
                      }
                    }}
                  >
                    #{String(issue.issueNumber)}. {issue.title}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <select
          id="parentId"
          name="parentIssueId"
          className="select2-offscreen"
          value={parentIssueId}
          disabled={!showOption || isCrossProject}
          onChange={(event) => onParentIssueChange(event.currentTarget.value)}
        >
          <option value="">{t("issue.subtask.select")}</option>
          {parentOptions.map((issue) => (
            <option key={String(issue.id)} value={String(issue.id)}>
              #{String(issue.issueNumber)}. {issue.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function IssueMarkdownEditor({
  bodyMarkdown,
  bodyRef,
  draftNotice,
  onBodyChange,
  onBodyFocus,
  onFiles,
  ownerName,
  projectName,
  runtimeConfig,
}: {
  bodyMarkdown: string;
  bodyRef: React.RefObject<HTMLTextAreaElement | null>;
  draftNotice: string;
  onBodyChange: (value: string) => void;
  onBodyFocus: () => void;
  onFiles: (files: File[], selection: BodySelection) => void;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [caretPosition, setCaretPosition] = useState(0);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [dismissedMentionKey, setDismissedMentionKey] = useState<string | null>(null);
  const [mentionPopupPosition, setMentionPopupPosition] = useState({ left: 4, top: 34 });
  const [textareaScrollTop, setTextareaScrollTop] = useState(0);
  const [textareaContentHeight, setTextareaContentHeight] = useState(300);
  const textareaBoxRef = useRef<HTMLDivElement>(null);
  const mentionMarkerRef = useRef<HTMLSpanElement>(null);
  const mentionPopupRef = useRef<HTMLDivElement>(null);
  const mention = useMemo(
    () => editorMentionAt(bodyMarkdown, caretPosition),
    [bodyMarkdown, caretPosition],
  );
  const debouncedMention = useDebouncedValue(mention, SEARCH_DELAY_MS);
  const markdownReferencesQuery = useQuery({
    enabled: activeTab === "preview" && bodyMarkdown.trim() !== "",
    queryFn: () =>
      readProjectMarkdownReferences(runtimeConfig, {
        bodyMarkdown,
        ownerName,
        projectName,
      }),
    queryKey: [
      ...apiQueryKeys.project.base(ownerName, projectName),
      "markdown-references",
      bodyMarkdown,
    ],
    staleTime: Number.POSITIVE_INFINITY,
  });
  const mentionUsersQuery = useQuery({
    enabled: debouncedMention?.trigger === "@",
    queryFn: () =>
      searchProjectMentionUsers(runtimeConfig, {
        context: "issue-body",
        ownerName,
        projectName,
        query: debouncedMention?.query ?? "",
      }),
    queryKey: [
      "project",
      ownerName,
      projectName,
      "mention-users",
      debouncedMention?.query ?? "",
      "issue-body",
    ],
  });
  const issueReferencesQuery = useQuery({
    enabled: debouncedMention?.trigger === "#",
    queryFn: () =>
      searchProjectIssueReferences(runtimeConfig, {
        ownerName,
        projectName,
        query: debouncedMention?.query ?? "",
      }),
    queryKey: apiQueryKeys.project.issueReferences(ownerName, projectName, {
      query: debouncedMention?.query ?? "",
    }),
  });
  const rawMentionSuggestions = useMemo(
    () =>
      editorMentionSuggestions(
        mention,
        debouncedMention,
        mentionUsersQuery.data?.items ?? [],
        issueReferencesQuery.data?.items ?? [],
      ),
    [debouncedMention, issueReferencesQuery.data?.items, mention, mentionUsersQuery.data?.items],
  );
  const mentionKey = mention
    ? `${mention.trigger}:${mention.start}:${mention.end}:${mention.query}`
    : null;
  const mentionSuggestions =
    mentionKey && mentionKey !== dismissedMentionKey ? rawMentionSuggestions : [];
  const issueStateLabels = useMemo(
    () => ({
      closed: t("issue.state.closed"),
      open: t("issue.state.open"),
    }),
    [t],
  );
  const markdownAutoLinkPlugin = useMemo(
    () =>
      createIssueMarkdownAutoLinkPlugin(
        markdownReferencesQuery.data ?? EMPTY_MARKDOWN_REFERENCES,
        issueStateLabels,
      ),
    [issueStateLabels, markdownReferencesQuery.data],
  );
  const markdownComponents = useMemo<Components>(
    () => ({
      a: (props) => <IssueMarkdownLink {...props} basePath={runtimeConfig.basePath} />,
    }),
    [runtimeConfig.basePath],
  );

  useEffect(() => {
    const legacyProtocols = ["file:", "zpl:"];
    const addedProtocols = legacyProtocols.filter(
      (protocol) => !router.protocolAllowlist.has(protocol),
    );
    addedProtocols.forEach((protocol) => router.protocolAllowlist.add(protocol));
    return () => addedProtocols.forEach((protocol) => router.protocolAllowlist.delete(protocol));
  }, [router]);

  useEffect(() => setActiveSuggestion(-1), [debouncedMention]);
  useLayoutEffect(() => {
    const box = textareaBoxRef.current;
    const marker = mentionMarkerRef.current;
    const popup = mentionPopupRef.current;
    if (!box || !marker || !popup || mentionSuggestions.length === 0) {
      return;
    }
    const boxRect = box.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    const popupWidth = Math.min(popupRect.width, Math.max(0, boxRect.width - 8));
    const popupHeight = popupRect.height;
    const left = Math.max(
      4,
      Math.min(markerRect.left - boxRect.left, boxRect.width - popupWidth - 4),
    );
    const belowTop = markerRect.bottom + 4;
    const aboveTop = markerRect.top - popupHeight - 4;
    const viewportHeight = globalThis.innerHeight;
    const absoluteTop =
      belowTop + popupHeight <= viewportHeight - 4
        ? belowTop
        : aboveTop >= 4
          ? aboveTop
          : Math.max(4, Math.min(belowTop, viewportHeight - popupHeight - 4));
    const nextPosition = { left, top: absoluteTop - boxRect.top };
    setMentionPopupPosition((current) =>
      Math.abs(current.left - nextPosition.left) < 0.5 &&
      Math.abs(current.top - nextPosition.top) < 0.5
        ? current
        : nextPosition,
    );
  }, [bodyMarkdown, caretPosition, mentionSuggestions.length, textareaScrollTop]);

  const insertChecklist = () => {
    const textarea = bodyRef.current;
    const start = textarea?.selectionStart ?? bodyMarkdown.length;
    const insertionStart = start === 0 && bodyMarkdown.length > 0 ? bodyMarkdown.length : start;
    onBodyChange(
      `${bodyMarkdown.slice(0, insertionStart)}${CHECKLIST_TEMPLATE}${bodyMarkdown.slice(insertionStart)}`,
    );
    setCaretPosition(insertionStart + CHECKLIST_TEMPLATE.length);
    requestAnimationFrame(() => {
      const nextCursor = insertionStart + CHECKLIST_TEMPLATE.length;
      bodyRef.current?.focus();
      bodyRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const chooseMention = (suggestion: EditorMentionSuggestion) => {
    if (!mention) {
      return;
    }
    const nextBody = `${bodyMarkdown.slice(0, mention.start)}${suggestion.insertion}${bodyMarkdown.slice(mention.end)}`;
    const nextCaret = mention.start + suggestion.insertion.length;
    onBodyChange(nextBody);
    setDismissedMentionKey(null);
    setCaretPosition(nextCaret);
    requestAnimationFrame(() => {
      bodyRef.current?.focus();
      bodyRef.current?.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionSuggestions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveSuggestion((current) => (current + 1) % mentionSuggestions.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveSuggestion((current) =>
          current <= 0 ? mentionSuggestions.length - 1 : current - 1,
        );
        return;
      }
      if (event.key === "Enter" || (event.key === "Tab" && !event.shiftKey)) {
        event.preventDefault();
        chooseMention(mentionSuggestions[Math.max(activeSuggestion, 0)]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setDismissedMentionKey(mentionKey);
        return;
      }
    }
    if (event.key !== "Tab") {
      return;
    }
    event.preventDefault();
    const indentation = editTextareaIndentation(
      event.currentTarget.value,
      event.currentTarget.selectionStart,
      event.currentTarget.selectionEnd,
      event.shiftKey,
    );
    onBodyChange(indentation.value);
    setCaretPosition(indentation.start);
    requestAnimationFrame(() => {
      bodyRef.current?.focus();
      bodyRef.current?.setSelectionRange(indentation.start, indentation.end);
    });
  };

  return (
    <div className="mt10 issue-markdown-editor">
      <ul className="nav nav-tabs nm small">
        <li className={activeTab === "edit" ? "active" : undefined}>
          <button type="button" onClick={() => setActiveTab("edit")}>
            {t("common.editor.edit")}
          </button>
        </li>
        <li className={activeTab === "preview" ? "active" : undefined}>
          <button type="button" onClick={() => setActiveTab("preview")}>
            {t("common.editor.preview")}
          </button>
        </li>
        <li>
          <div className="task-list-button">
            <button
              type="button"
              className="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"
              aria-label={t("button.add.checklist")}
              onClick={insertChecklist}
            >
              <i className="yobicon-list task-list-icon" /> {t("button.add.checklist")}
            </button>
          </div>
        </li>
        <li>
          <div className="editor-clear-temporary" aria-hidden="true">
            <div className="editor-clear-temporary-button">
              <button
                type="button"
                id="button-clear-temporary"
                className="ybtn ybtn-small ybtn-warning"
                tabIndex={-1}
              >
                {t("button.clear.temporary")}
              </button>
            </div>
          </div>
        </li>
        <li>
          <div className="editor-notice-label">
            {draftNotice ? <span className="saved">{draftNotice}</span> : null}
          </div>
        </li>
      </ul>
      <div className="tab-content issue-editor-tab-content">
        <LegacyMarkdownHelp />
        <div id="edit-body" className={`tab-pane${activeTab === "edit" ? " active" : ""}`}>
          <div
            ref={textareaBoxRef}
            className="textarea-box"
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setDismissedMentionKey(mentionKey);
                setActiveSuggestion(-1);
              }
            }}
          >
            <textarea
              ref={bodyRef}
              name="body"
              className="editorSeries content comment nm"
              id="editor-body-body"
              value={bodyMarkdown}
              tabIndex={2}
              role="combobox"
              aria-autocomplete="list"
              aria-controls="editor-mention-options"
              aria-expanded={mentionSuggestions.length > 0}
              aria-activedescendant={
                mentionSuggestions.length > 0
                  ? `editor-mention-option-${Math.max(activeSuggestion, 0)}`
                  : undefined
              }
              style={{
                height: `${textareaContentHeight}px`,
                overflow: "hidden",
                overflowWrap: "break-word",
                resize: "none",
              }}
              onChange={(event) => {
                setTextareaContentHeight(300);
                setDismissedMentionKey(null);
                onBodyChange(event.currentTarget.value);
                setCaretPosition(event.currentTarget.selectionStart);
                requestAnimationFrame(() => {
                  const textarea = bodyRef.current;
                  if (!textarea) return;
                  const style = getComputedStyle(textarea);
                  const verticalPadding =
                    Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
                  setTextareaContentHeight(Math.max(300, textarea.scrollHeight - verticalPadding));
                });
              }}
              onFocus={onBodyFocus}
              onClick={(event) => {
                setDismissedMentionKey(null);
                setCaretPosition(event.currentTarget.selectionStart);
              }}
              onScroll={(event) => setTextareaScrollTop(event.currentTarget.scrollTop)}
              onPaste={(event) => {
                const markdownTable = clipboardMarkdownTable(event.clipboardData);
                if (markdownTable !== null) {
                  event.preventDefault();
                  const insertionStart = event.currentTarget.selectionStart;
                  const nextCaret = insertionStart + markdownTable.length;
                  onBodyChange(
                    `${bodyMarkdown.slice(0, insertionStart)}${markdownTable}${bodyMarkdown.slice(insertionStart)}`,
                  );
                  setCaretPosition(nextCaret);
                  requestAnimationFrame(() => {
                    bodyRef.current?.focus();
                    bodyRef.current?.setSelectionRange(nextCaret, nextCaret);
                  });
                  return;
                }
                const files = clipboardImageFiles(event.clipboardData).map((file) =>
                  legacyPastedImageFile(file),
                );
                if (files.length === 0) {
                  return;
                }
                event.preventDefault();
                onFiles(files, {
                  end: event.currentTarget.selectionEnd,
                  start: event.currentTarget.selectionStart,
                });
              }}
              onDragOver={(event) => {
                if (event.dataTransfer.types.includes("Files")) {
                  event.preventDefault();
                }
              }}
              onDrop={(event) => {
                const files = Array.from(event.dataTransfer.files);
                if (files.length === 0) {
                  return;
                }
                event.preventDefault();
                onFiles(files, {
                  end: event.currentTarget.selectionEnd,
                  start: event.currentTarget.selectionStart,
                });
              }}
              onKeyUp={(event) => {
                if (event.key !== "Escape") {
                  setCaretPosition(event.currentTarget.selectionStart);
                }
              }}
              onKeyDown={handleEditorKeyDown}
            />
            {mention ? (
              <div
                className="editor-mention-mirror"
                aria-hidden="true"
                style={{ transform: `translateY(-${textareaScrollTop}px)` }}
              >
                {bodyMarkdown.slice(0, caretPosition)}
                <span ref={mentionMarkerRef} className="editor-mention-marker">
                  {"\u200b"}
                </span>
              </div>
            ) : null}
            {mentionSuggestions.length > 0 ? (
              <div
                ref={mentionPopupRef}
                id="editor-mention-options"
                className="issue-combobox-options editor-mention-options"
                role="listbox"
                style={mentionPopupPosition}
              >
                {mentionSuggestions.map((suggestion, index) => (
                  <button
                    type="button"
                    id={`editor-mention-option-${index}`}
                    key={suggestion.key}
                    className={index === activeSuggestion ? "active" : undefined}
                    role="option"
                    aria-selected={index === activeSuggestion}
                    aria-label={suggestion.accessibleLabel}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => chooseMention(suggestion)}
                  >
                    {suggestion.imageUrl ? (
                      <img src={suggestion.imageUrl} alt="" width="20" height="20" />
                    ) : null}
                    <span>{suggestion.label}</span>
                    {suggestion.detail ? <small>{suggestion.detail}</small> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div id="preview-body" className={`tab-pane${activeTab === "preview" ? " active" : ""}`}>
          <div className="markdown-preview markdown-wrap content-body">
            <ReactMarkdown
              components={markdownComponents}
              rehypePlugins={[
                rehypeRaw,
                rehypeLegacyStylePolicy,
                [rehypeSanitize, ISSUE_MARKDOWN_SANITIZE_SCHEMA],
              ]}
              remarkPlugins={[
                remarkGfm,
                remarkBreaks,
                remarkLegacyHeadingAnchors,
                markdownAutoLinkPlugin,
              ]}
              urlTransform={legacyMarkdownUrlTransform}
            >
              {bodyMarkdown}
            </ReactMarkdown>
          </div>
        </div>
        <div className="notification-receiver">
          <span className="notification-receiver-title">
            {t("notification.receiver.list.title")}
          </span>
          <span className="notification-receiver-list" />
        </div>
      </div>
    </div>
  );
}

function IssuePostFileUploader({
  isDragging,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onFiles,
  onInsert,
  onRemove,
  rows,
}: {
  isDragging: boolean;
  onDragEnter: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onFiles: (files: File[]) => void;
  onInsert: (attachment: UploadedAttachment) => void;
  onRemove: (row: UploadRow) => void;
  rows: UploadRow[];
}) {
  const { t } = useLegacyMessages();

  return (
    <div
      id="upload"
      className={`upload-wrap content-footer${isDragging ? " dragover" : ""}`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="attach-wrap">
        <span className="help help-droppable">{t("common.attach.drophere")}</span>{" "}
        <div className="btn-wrap">
          <label className="nbtn medium white fake-file-wrap">
            <i className="yobicon-upload" /> {t("button.upload")}
            <input
              type="file"
              className="file"
              name="filePath"
              multiple
              onChange={(event) => {
                onFiles(Array.from(event.currentTarget.files ?? []));
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>{" "}
        <span className="plain">{t("common.attach.clickbutton")}</span>{" "}
        <span className="help help-pastable">{t("common.attach.pastehere")}</span>
      </div>
      <ul className={`attached-files unstyled${rows.length > 0 ? " has-files" : ""}`}>
        {rows.map((row) => (
          <li
            key={row.key}
            className={`attached-file temporary${row.status === "ready" ? " complete" : ""}`}
          >
            <button
              type="button"
              className="attached-file-main"
              aria-label={`${t("common.attach.clickToPost")} ${row.name}`}
              disabled={!row.attachment || row.status !== "ready"}
              onClick={() => row.attachment && onInsert(row.attachment)}
            >
              <i className="yobicon-supportrequest" />
              <strong className="name">{row.name}</strong>{" "}
              <span className="size">{humanFileSize(row.size)}</span>
              {row.status === "uploading" ? (
                <span className="progress upload-progress">
                  <span className="bar orange" style={{ width: `${row.progress}%` }} />
                </span>
              ) : null}
              {row.attachment && row.status === "ready" ? (
                <span className="btn-insert-copy">{t("common.attach.clickToPost")}</span>
              ) : null}
            </button>
            {row.error ? <span className="upload-error">{row.error}</span> : null}
            <button
              type="button"
              className="btn-transparent btn-delete pull-right"
              aria-label={`${t("button.delete")} ${row.name}`}
              disabled={row.status === "deleting" || row.status === "uploading"}
              onClick={() => onRemove(row)}
            >
              &times;
            </button>
          </li>
        ))}
      </ul>
      {rows.length > 0 ? (
        <p className="right-txt help attach-save-help">
          <i className="yobicon-supportrequest" /> {t("common.attach.attachIfYouSave")}
        </p>
      ) : null}
      {isDragging ? (
        <div className="upload-drop-here">
          <div className="msg-wrap">
            <div className="msg">{t("common.attach.dropFilesHere")}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function IssueAssigneeSelect({
  onSelect,
  ownerName,
  projectName,
  runtimeConfig,
  selected,
}: {
  onSelect: (user: IssueAssignableUserItem | null) => void;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  selected: IssueAssignableUserItem | null;
}) {
  const { t } = useLegacyMessages();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DELAY_MS);
  const usersQuery = useQuery({
    enabled: isOpen,
    queryFn: () =>
      searchProjectAssignableUsers(runtimeConfig, {
        ownerName,
        projectName,
        query: debouncedQuery,
      }),
    queryKey: ["project", ownerName, projectName, "assignable-users", debouncedQuery],
  });
  const users = (usersQuery.data?.items ?? []).slice(0, 10);
  const displayName = (user: IssueAssignableUserItem) => assigneeDisplayName(user, (key) => t(key));

  useEffect(() => setActiveIndex(-1), [debouncedQuery]);

  const choose = (user: IssueAssignableUserItem) => {
    onSelect(user.loginId === "" || user.displayName === "issue.noAssignee" ? null : user);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <dl className="issue-option issue-assignee-option">
      <dt>{t("issue.assignee")}</dt>
      <dd>
        <div
          className={`select2-container bigdrop issue-combobox issue-assignee-control${isOpen ? " select2-dropdown-open" : ""}`}
          style={{ width: "100%" }}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsOpen(false);
            }
          }}
        >
          <div
            className={`select2-choice${selected ? "" : " select2-default"}`}
            role="combobox"
            tabIndex={0}
            aria-label={t("issue.assignee")}
            aria-controls="assignee-options"
            aria-expanded={isOpen}
            onClick={() => {
              const nextOpen = !isOpen;
              setIsOpen(nextOpen);
              if (nextOpen) {
                requestAnimationFrame(() => searchInputRef.current?.focus());
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setIsOpen(true);
                requestAnimationFrame(() => searchInputRef.current?.focus());
              }
            }}
          >
            <span className="select2-chosen issue-assignee-value">
              {selected ? `${displayName(selected)} (${selected.loginId})` : t("issue.noAssignee")}
            </span>
            <span className="select2-arrow" aria-hidden="true">
              <b />
            </span>
          </div>
          <input
            className="select2-focusser select2-offscreen"
            type="text"
            autoComplete="off"
            aria-label={t("issue.assignee")}
          />
          <div
            id="assignee-options"
            className={`select2-drop select2-with-searchbox issue-combobox-options${isOpen ? " select2-drop-active" : " select2-display-none"}`}
          >
            <div className="select2-search">
              <input
                ref={searchInputRef}
                type="text"
                className="select2-input issue-assignee-dropdown-search"
                value={query}
                aria-label={t("issue.assignee")}
                aria-autocomplete="list"
                aria-controls="assignee-options"
                aria-activedescendant={
                  activeIndex >= 0 ? `assignee-option-${activeIndex}` : undefined
                }
                autoComplete="off"
                onChange={(event) => setQuery(event.currentTarget.value)}
                onKeyDown={(event) =>
                  handleComboboxKeyDown(event, users, activeIndex, setActiveIndex, choose, () =>
                    setIsOpen(false),
                  )
                }
              />
            </div>
            <ul className="select2-results" role="listbox">
              {users.map((user, index) => (
                <li key={`${user.type}-${user.loginId}`}>
                  <div
                    id={`assignee-option-${index}`}
                    className={`select2-result-label${index === activeIndex ? " active" : ""}`}
                    role="option"
                    tabIndex={0}
                    aria-selected={index === activeIndex}
                    aria-label={`${displayName(user)} (${user.loginId})`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(user)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        choose(user);
                      }
                    }}
                  >
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" width="20" height="20" />
                    ) : null}
                    <span>{displayName(user)}</span>
                    <small>{user.loginId}</small>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <input
          type="hidden"
          id="assignee"
          className="bigdrop select2-offscreen"
          name="assigneeLoginId"
          value={selected?.loginId ?? ""}
          readOnly
        />
      </dd>
    </dl>
  );
}

function IssueMilestoneSelect({
  milestoneId,
  milestones,
  onChange,
  ownerName,
  projectName,
}: {
  milestoneId: string;
  milestones: ProjectMilestone[];
  onChange: (value: string) => void;
  ownerName: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const [isOpen, setIsOpen] = useState(false);
  const selectedMilestone = milestones.find(
    (milestone) => stringField(milestone.id, "") === milestoneId,
  );

  return (
    <dl id="milestoneOption" className="issue-option">
      <dt>{t("milestone")}</dt>
      <dd>
        {milestones.length === 0 ? (
          <Link
            to="/$ownerName/$projectName/newMilestoneForm"
            params={{ ownerName, projectName }}
            className="ybtn ybtn-small ybtn-fullsize"
            target="_blank"
          >
            {t("milestone.menu.new")}
          </Link>
        ) : (
          <>
            <div
              className={`select2-container fullsize${isOpen ? " select2-dropdown-open" : ""}`}
              style={{ width: "100%" }}
            >
              <div
                className="select2-choice"
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                aria-label={t("milestone")}
                onClick={() => setIsOpen((current) => !current)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setIsOpen((current) => !current);
                  }
                }}
              >
                <span className="select2-chosen">
                  {selectedMilestone?.title ?? t("issue.noMilestone")}
                </span>
                <abbr className="select2-search-choice-close" />
                <span className="select2-arrow" aria-hidden="true">
                  <b />
                </span>
              </div>
              <input
                className="select2-focusser select2-offscreen"
                type="text"
                autoComplete="off"
                aria-label={t("milestone")}
              />
              <div
                className={`select2-drop select2-with-searchbox${isOpen ? " select2-drop-active" : " select2-display-none"}`}
              >
                <div className="select2-search">
                  <input
                    type="text"
                    className="select2-input"
                    autoComplete="off"
                    aria-label={t("milestone")}
                  />
                </div>
                <ul className="select2-results" role="listbox">
                  {[{ id: "", title: t("issue.noMilestone") }, ...milestones].map((milestone) => {
                    const value = stringField(milestone.id, "");
                    return (
                      <li key={value || "none"}>
                        <div
                          className="select2-result-label"
                          role="option"
                          tabIndex={0}
                          aria-selected={value === milestoneId}
                          onClick={() => {
                            onChange(value);
                            setIsOpen(false);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onChange(value);
                              setIsOpen(false);
                            }
                          }}
                        >
                          {stringField(milestone.title, "")}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
            <select
              id="milestoneId"
              name="milestoneId"
              className="select2-offscreen"
              value={milestoneId}
              onChange={(event) => onChange(event.currentTarget.value)}
            >
              <option value="">{t("issue.noMilestone")}</option>
              {milestones.map((milestone) => (
                <option key={stringField(milestone.id, "")} value={stringField(milestone.id, "")}>
                  {stringField(milestone.title, "")}
                </option>
              ))}
            </select>
          </>
        )}
      </dd>
    </dl>
  );
}

function IssueDueDateInput({
  datePickerRef,
  dueDate,
  dueDateRef,
  onChange,
}: {
  datePickerRef: React.RefObject<HTMLInputElement | null>;
  dueDate: string;
  dueDateRef: React.RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
}) {
  const { t } = useLegacyMessages();
  const nativeDateValue = /^\d{4}-\d{2}-\d{2}$/u.test(dueDate) ? dueDate : "";

  const openPicker = () => {
    const picker = datePickerRef.current;
    if (!picker) {
      return;
    }
    picker.focus();
    try {
      picker.showPicker?.();
    } catch {
      picker.focus();
    }
  };

  return (
    <dl className="issue-option issue-due-date-option">
      <dt>{t("issue.dueDate")}</dt>
      <dd>
        <div className="search search-bar">
          <label className="blind" htmlFor="issueDueDate">
            {t("issue.dueDate")}
          </label>
          <input
            ref={dueDateRef}
            type="text"
            id="issueDueDate"
            name="dueDate"
            className="textbox full"
            value={dueDate}
            autoComplete="off"
            onChange={(event) => onChange(event.currentTarget.value)}
          />
          <button
            type="button"
            className="search-btn btn-calendar"
            aria-label={t("issue.dueDate")}
            onClick={openPicker}
          >
            <i className="yobicon-calendar2" />
          </button>
          <input
            ref={datePickerRef}
            type="date"
            className="issue-due-date-native-picker"
            aria-label={t("milestone.form.dueDate")}
            tabIndex={-1}
            value={nativeDateValue}
            onChange={(event) => onChange(event.currentTarget.value)}
          />
        </div>
      </dd>
    </dl>
  );
}

function IssueLabelSelect({
  canManageIssueLabels,
  labels,
  onRemove,
  onSelect,
  ownerName,
  projectName,
  selectedLabelIds,
}: {
  canManageIssueLabels: boolean;
  labels: IssueLabelOption[];
  onRemove: (labelId: number) => void;
  onSelect: (labelId: number) => void;
  ownerName: string;
  projectName: string;
  selectedLabelIds: number[];
}) {
  const { t } = useLegacyMessages();
  const [isOpen, setIsOpen] = useState(false);
  if (labels.length === 0) {
    return null;
  }
  const selectedLabels = selectedLabelIds.flatMap((id) => {
    const label = labels.find((candidate) => candidate.id === id);
    return label ? [label] : [];
  });
  const labelGroups = new Map<number, { labels: IssueLabelOption[]; name: string }>();
  for (const label of labels) {
    const group = labelGroups.get(label.categoryId);
    if (group) group.labels.push(label);
    else labelGroups.set(label.categoryId, { labels: [label], name: label.categoryName });
  }

  return (
    <dl className="issue-option issue-label-option">
      <dt>
        {t("label")}{" "}
        {canManageIssueLabels ? (
          <Link
            activeOptions={plainLinkActiveOptions}
            activeProps={plainLinkActiveProps}
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
        <div
          className={`select2-container select2-container-multi hide issue-labels bordered fullsize issue-combobox issue-label-combobox issue-label-control${isOpen ? " select2-dropdown-open" : ""}`}
          style={{ display: "inline-block" }}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsOpen(false);
            }
          }}
        >
          <ul className="select2-choices">
            {selectedLabels.map((label) => (
              <li key={label.id} className="select2-search-choice issue-label-token">
                <div>
                  <strong
                    className="label issue-label active static"
                    style={{ backgroundColor: normalizedColor(label.color) }}
                  >
                    {label.name}
                  </strong>
                </div>
                <button
                  type="button"
                  className="select2-search-choice-close btn-transparent"
                  aria-label={`${t("button.delete")} ${label.name}`}
                  onClick={() => onRemove(label.id)}
                ></button>
              </li>
            ))}
            <li className="select2-search-field">
              <input
                type="text"
                className={`select2-input${selectedLabels.length === 0 ? " select2-default" : ""}`}
                value=""
                placeholder={selectedLabels.length === 0 ? t("label.select") : undefined}
                aria-label={t("label.select")}
                role="combobox"
                aria-controls="issue-label-options"
                aria-expanded={isOpen}
                autoComplete="off"
                onFocus={() => setIsOpen(true)}
                onClick={() => setIsOpen(true)}
                onChange={() => undefined}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setIsOpen(false);
                }}
              />
            </li>
          </ul>
          <div
            id="issue-label-options"
            className={`select2-drop select2-drop-multi issue-labels issue-combobox-options${isOpen ? " select2-drop-active" : " select2-display-none"}`}
          >
            <ul className="select2-results" role="listbox">
              {labels.map((label) => (
                <li key={label.id}>
                  <div
                    className="select2-result-label"
                    role="option"
                    tabIndex={0}
                    aria-selected={selectedLabelIds.includes(label.id)}
                    aria-label={displayLabelName(label.name)}
                    onClick={() => onSelect(label.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect(label.id);
                      }
                    }}
                  >
                    <strong
                      className="label issue-label active static"
                      style={{ backgroundColor: normalizedColor(label.color) }}
                    >
                      {label.name}
                    </strong>
                    <small>{label.categoryName}</small>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <select
          id="labelIds"
          name="labelIds"
          className="hide select2-offscreen"
          multiple
          value={selectedLabelIds.map(String)}
          onChange={(event) => {
            for (const option of event.currentTarget.selectedOptions)
              onSelect(Number(option.value));
          }}
        >
          {Array.from(labelGroups.entries()).map(([categoryId, group]) => (
            <optgroup key={categoryId} label={group.name}>
              {group.labels.map((label) => (
                <option key={label.id} value={label.id}>
                  {label.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </dd>
    </dl>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeoutId = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeoutId);
  }, [delayMs, value]);
  return debounced;
}

function handleComboboxKeyDown<T>(
  event: KeyboardEvent<HTMLInputElement>,
  items: T[],
  activeIndex: number,
  setActiveIndex: (update: (current: number) => number) => void,
  choose: (item: T) => void,
  close: () => void,
) {
  if (event.key === "Escape") {
    event.preventDefault();
    close();
    return;
  }
  if (items.length === 0) {
    return;
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    setActiveIndex((current) => (current + 1) % items.length);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    setActiveIndex((current) => (current <= 0 ? items.length - 1 : current - 1));
  } else if (event.key === "Enter") {
    event.preventDefault();
    choose(items[Math.max(activeIndex, 0)]);
  }
}

function editTextareaIndentation(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  removeIndentation: boolean,
): BodySelection & { value: string } {
  if (!removeIndentation) {
    const selectedLines = value.slice(selectionStart, selectionEnd).split("\n");
    const replacement = selectedLines.map((line) => `${TAB_CHARACTERS}${line}`).join("\n");
    const end = selectionEnd + TAB_CHARACTERS.length * selectedLines.length;
    return {
      end,
      start: selectionStart === selectionEnd ? end : selectionStart,
      value: `${value.slice(0, selectionStart)}${replacement}${value.slice(selectionEnd)}`,
    };
  }

  if (selectionStart === selectionEnd) {
    let lineStart = selectionStart;
    while (lineStart > 0) {
      const previousCharacter = value.charAt(lineStart - 1);
      if (previousCharacter === "\n" || previousCharacter === "\r") {
        break;
      }
      lineStart -= 1;
    }
    const portion = value.slice(lineStart, selectionEnd);
    if (!portion.includes(TAB_CHARACTERS)) {
      return { end: selectionEnd, start: selectionStart, value };
    }
    const nextValue = `${value.slice(0, lineStart)}${portion.replace(TAB_CHARACTERS, "")}${value.slice(selectionEnd)}`;
    const adjustedEnd = selectionEnd - 1;
    const caret = adjustedEnd <= lineStart ? adjustedEnd : adjustedEnd - TAB_CHARACTERS.length + 1;
    return { end: caret, start: caret, value: nextValue };
  }

  let edits = 0;
  const selectedLines = value
    .slice(selectionStart, selectionEnd)
    .split("\n")
    .map((line) => {
      if (!line.includes(TAB_CHARACTERS)) {
        return line;
      }
      edits += 1;
      return line.replace(TAB_CHARACTERS, "");
    });
  return {
    end: edits > 0 ? selectionEnd - TAB_CHARACTERS.length * edits : selectionEnd,
    start: selectionStart,
    value: `${value.slice(0, selectionStart)}${selectedLines.join("\n")}${value.slice(selectionEnd)}`,
  };
}

function clipboardMarkdownTable(clipboardData: DataTransfer): string | null {
  const items = Array.from(clipboardData.items);
  const hasPlainText = items.some(
    (item) => item.kind === "string" && item.type.startsWith("text/plain"),
  );
  const hasImage = items.some((item) => item.kind === "file" && item.type.startsWith("image/"));
  if (!hasPlainText || !hasImage) {
    return null;
  }
  return markdownTableFromPlainText(clipboardData.getData("text/plain"));
}

function clipboardImageFiles(clipboardData: DataTransfer): File[] {
  return Array.from(clipboardData.items).flatMap((item) => {
    if (item.kind !== "file" || !item.type.startsWith("image/")) {
      return [];
    }
    const file = item.getAsFile();
    return file ? [file] : [];
  });
}

function markdownTableFromPlainText(plainText: string): string {
  const rows = plainText
    .trim()
    .split(/[\u0085\u2028\u2029]|\r\n?/gu)
    .map((row) => row.replace("\n", " ").split("\t"));
  const alignments: Array<"c" | "l" | "r"> = [];
  const alignmentPattern = /^(\^[lcr])/iu;
  const widths = rows[0].map((column, columnIndex) => {
    const alignment = column.match(alignmentPattern)?.[1]?.slice(1).toLowerCase();
    alignments.push(alignment === "c" || alignment === "r" ? alignment : "l");
    rows[0][columnIndex] = column.replace(alignmentPattern, "");
    return Math.max(...rows.map((row) => String(row[columnIndex]).length));
  });
  const markdownRows = rows.map(
    (row) =>
      `| ${row
        .map((column, index) => `${column}${" ".repeat(widths[index] - column.length)}`)
        .join(" | ")} |`,
  );
  const separator = `|${widths
    .map((width, index) => {
      const alignment = alignments[index];
      const prefix = alignment === "c" ? ":" : "";
      const postfix = alignment === "c" || alignment === "r" ? ":" : "";
      const adjustment = alignment === "c" ? 2 : alignment === "r" ? 1 : 0;
      return `${prefix}${"-".repeat(width + 2 - adjustment)}${postfix}`;
    })
    .join("|")}|`;
  markdownRows.splice(1, 0, separator);
  return markdownRows.join("\n");
}

function legacyPastedImageFile(file: File, now = new Date()): File {
  const submitId = `${now.getSeconds()}${now.getMilliseconds()}-${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
  return new File([file], `${submitId}.png`, {
    lastModified: file.lastModified,
    type: file.type,
  });
}

function createIssueMarkdownAutoLinkPlugin(
  references: ProjectMarkdownReferencesResponse,
  issueStateLabels: Record<string, string>,
) {
  const replacements = markdownReferenceReplacements(references, issueStateLabels);
  return function issueMarkdownAutoLinkPlugin() {
    return (tree: MarkdownAstNode) => {
      for (const kind of ["issue", "commit", "mention"] as const) {
        transformMarkdownAutoLinks(
          tree,
          replacements.filter((replacement) => replacement.kind === kind),
        );
      }
    };
  };
}

function transformMarkdownAutoLinks(
  node: MarkdownAstNode,
  replacements: MarkdownReferenceReplacement[],
) {
  if (
    replacements.length === 0 ||
    !node.children ||
    ["code", "definition", "html", "image", "inlineCode", "link", "linkReference"].includes(
      node.type,
    )
  ) {
    return;
  }
  node.children = node.children.flatMap((child) => {
    if (child.type !== "text" || child.value === undefined) {
      transformMarkdownAutoLinks(child, replacements);
      return [child];
    }
    return markdownAutoLinkTextNodes(child.value, replacements);
  });
}

function markdownReferenceReplacements(
  references: ProjectMarkdownReferencesResponse,
  issueStateLabels: Record<string, string>,
): MarkdownReferenceReplacement[] {
  const replacements: MarkdownReferenceReplacement[] = [
    ...references.issueReferences.map((reference) =>
      markdownIssueReplacement(reference, issueStateLabels),
    ),
    ...references.commitReferences.map(markdownCommitReplacement),
    ...references.mentionReferences.map(markdownMentionReplacement),
  ];
  const seen = new Set<string>();
  return replacements.filter((replacement) => {
    const key = `${replacement.kind}:${replacement.token}`;
    if (!replacement.token || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function markdownIssueReplacement(
  reference: MarkdownIssueReference,
  issueStateLabels: Record<string, string>,
): MarkdownReferenceReplacement {
  const state = reference.state.toLowerCase();
  const displayToken = reference.token.replace(/^@/u, "");
  const display = `${displayToken}.${reference.title}`;
  return {
    children: [
      {
        type: "text",
        value: reference.token.startsWith("#") ? display : `${display}${display}`,
      },
      {
        data: {
          hName: "span",
          hProperties: { className: ["issue-state", state] },
        },
        type: "text",
        value: issueStateLabels[state] ?? reference.state,
      },
    ],
    className: ["issueLink"],
    kind: "issue",
    token: reference.token,
    url: `/${reference.ownerName}/${reference.projectName}/issue/${reference.issueNumber}`,
  };
}

function markdownCommitReplacement(
  reference: MarkdownCommitReference,
): MarkdownReferenceReplacement {
  const separator = reference.token.lastIndexOf("@");
  const prefix = separator > 0 ? reference.token.slice(0, separator) : "";
  return {
    children: [
      {
        type: "text",
        value: prefix ? `${prefix}@${reference.shortId}` : reference.shortId,
      },
    ],
    kind: "commit",
    token: reference.token,
    url: `/${reference.ownerName}/${reference.projectName}/commit/${reference.commitId}`,
  };
}

function markdownMentionReplacement(
  reference: MarkdownMentionReference,
): MarkdownReferenceReplacement {
  const label = `@${reference.label || reference.loginId}`;
  if (reference.kind === "project") {
    return {
      children: [markdownReferenceLabel(label, "project-link")],
      kind: "mention",
      token: reference.token,
      url: `/${reference.ownerName}/${reference.projectName}`,
    };
  }
  if (reference.kind === "organization") {
    return {
      children: [markdownReferenceLabel(label, "org-link")],
      kind: "mention",
      token: reference.token,
      url: `/organizations/${reference.loginId}`,
    };
  }
  return {
    children: [markdownReferenceLabel(label)],
    className: ["no-text-decoration", "user-link"],
    kind: "mention",
    token: reference.token,
    url: `/${reference.loginId}`,
  };
}

function markdownReferenceLabel(value: string, className?: string): MarkdownAstNode {
  return className
    ? {
        data: { hName: "span", hProperties: { className: [className] } },
        type: "text",
        value,
      }
    : { type: "text", value };
}

function markdownAutoLinkTextNodes(value: string, replacements: MarkdownReferenceReplacement[]) {
  const nodes: MarkdownAstNode[] = [];
  const replacementsByFirstCharacter = new Map<string, MarkdownReferenceReplacement[]>();
  for (const replacement of replacements) {
    const firstCharacter = replacement.token[0];
    const matches = replacementsByFirstCharacter.get(firstCharacter);
    if (matches) {
      matches.push(replacement);
    } else {
      replacementsByFirstCharacter.set(firstCharacter, [replacement]);
    }
  }
  let cursor = 0;
  while (cursor < value.length) {
    const match = nextMarkdownReference(value, cursor, replacementsByFirstCharacter);
    if (!match) {
      nodes.push({ type: "text", value: value.slice(cursor) });
      break;
    }
    if (match.index > cursor) {
      nodes.push({ type: "text", value: value.slice(cursor, match.index) });
    }
    nodes.push({
      children: match.replacement.children,
      data: match.replacement.className
        ? { hProperties: { className: match.replacement.className } }
        : undefined,
      type: "link",
      url: match.replacement.url,
    });
    cursor = match.index + match.replacement.token.length;
  }
  return nodes.length > 0 ? nodes : [{ type: "text", value }];
}

function nextMarkdownReference(
  value: string,
  cursor: number,
  replacementsByFirstCharacter: Map<string, MarkdownReferenceReplacement[]>,
) {
  for (let index = cursor; index < value.length; index += 1) {
    const replacements = replacementsByFirstCharacter.get(value[index]);
    if (!replacements) {
      continue;
    }
    let best: MarkdownReferenceReplacement | null = null;
    for (const replacement of replacements) {
      if (
        value.startsWith(replacement.token, index) &&
        markdownReferenceBoundaryIsValid(value, index, replacement.token) &&
        (!best || replacement.token.length > best.token.length)
      ) {
        best = replacement;
      }
    }
    if (best) {
      return { index, replacement: best };
    }
  }
  return null;
}

function markdownReferenceBoundaryIsValid(value: string, index: number, token: string) {
  const previousCharacter = value.slice(0, index).match(/.$/u)?.[0] ?? "";
  const nextCharacter = value.slice(index + token.length).match(/^./u)?.[0] ?? "";
  const wordCharacter = /[A-Za-z0-9_]/u;
  return !wordCharacter.test(previousCharacter) && !wordCharacter.test(nextCharacter);
}

function remarkLegacyHeadingAnchors() {
  return (tree: MarkdownAstNode) => {
    const seen = new Map<string, number>();
    appendLegacyHeadingAnchors(tree, seen);
  };
}

function appendLegacyHeadingAnchors(node: MarkdownAstNode, seen: Map<string, number>) {
  if (node.type === "heading") {
    const headingId = `yb-header-${nextLegacyHeadingSlug(markdownAstText(node), seen)}`;
    node.data = {
      ...node.data,
      hProperties: { ...node.data?.hProperties, id: headingId },
    };
    node.children = [
      ...(node.children ?? []),
      {
        children: [{ type: "text", value: "#" }],
        data: { hProperties: { className: ["head-anchor"] } },
        type: "link",
        url: `#${headingId}`,
      },
    ];
  }
  node.children?.forEach((child) => appendLegacyHeadingAnchors(child, seen));
}

function markdownAstText(node: MarkdownAstNode): string {
  return node.value ?? node.children?.map(markdownAstText).join("") ?? "";
}

function nextLegacyHeadingSlug(value: string, seen: Map<string, number>) {
  const originalSlug = legacyHeadingSlug(value);
  let slug = originalSlug;
  let occurrence = seen.get(originalSlug) ?? 0;
  if (seen.has(slug)) {
    do {
      occurrence += 1;
      slug = `${originalSlug}-${occurrence}`;
    } while (seen.has(slug));
  }
  seen.set(originalSlug, occurrence);
  seen.set(slug, 0);
  return slug;
}

function legacyHeadingSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/<[!/a-z].*?>/giu, "")
    .replace(/[\u2000-\u206f\u2e00-\u2e7f\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/gu, "")
    .replace(/[^\w|ㄱ-ㅎ|ㅏ-ㅣ|가-힣]+/gu, "-")
    .replace(/\s/gu, "-");
}

function legacyMarkdownUrlTransform(value: string) {
  const protocol = value.match(/^([a-z][a-z\d+.-]*):/iu)?.[1]?.toLowerCase();
  return !protocol || ["http", "https", "mailto", "file", "zpl"].includes(protocol) ? value : "";
}

function rehypeLegacyStylePolicy() {
  return (tree: MarkdownHastNode) => sanitizeLegacyStyleProperties(tree);
}

function sanitizeLegacyStyleProperties(node: MarkdownHastNode) {
  const style = node.properties?.["style"];
  if (typeof style === "string") {
    const sanitizedStyle = sanitizeLegacyStyle(style);
    if (sanitizedStyle) {
      node.properties!["style"] = sanitizedStyle;
    } else {
      delete node.properties!["style"];
    }
  }
  node.children?.forEach(sanitizeLegacyStyleProperties);
}

function sanitizeLegacyStyle(style: string) {
  const declarations = splitCssDeclarations(style);
  if (!declarations) {
    return "";
  }
  const safeDeclarations = declarations.flatMap((declaration) => {
    const separator = declaration.indexOf(":");
    if (separator <= 0) {
      return [];
    }
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();
    if (
      !/^[a-z][a-z0-9-]*$/u.test(property) ||
      !value ||
      hasCssControlCharacter(value) ||
      /\\|\/\*|\*\//u.test(value) ||
      /(?:expression|url|var)\s*\(|javascript\s*:|@import|!important/iu.test(value) ||
      /^(?:behavior|content|cursor|filter|list-style(?:-image)?|position|z-index)$/u.test(
        property,
      ) ||
      /^(?:background-image|inset|top|right|bottom|left)(?:-|$)/u.test(property)
    ) {
      return [];
    }
    return [`${property}: ${value}`];
  });
  return safeDeclarations.length > 0 ? `${safeDeclarations.join("; ")};` : "";
}

function hasCssControlCharacter(value: string) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127;
  });
}

function splitCssDeclarations(style: string): string[] | null {
  const declarations: string[] = [];
  let start = 0;
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = 0; index < style.length; index += 1) {
    const character = style[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) {
        quote = "";
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
      if (depth < 0) {
        return null;
      }
    } else if (character === ";" && depth === 0) {
      declarations.push(style.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (quote || depth !== 0 || escaped) {
    return null;
  }
  declarations.push(style.slice(start).trim());
  return declarations.filter(Boolean);
}

function IssueMarkdownLink({
  basePath,
  children,
  href,
  node: _node,
  rel: _rel,
  target,
  ...props
}: IssueMarkdownLinkProps) {
  const router = useRouter();
  if (!href) {
    return <>{children}</>;
  }
  if (href.startsWith("#")) {
    return (
      <Link
        {...props}
        activeOptions={plainLinkActiveOptions}
        activeProps={plainLinkActiveProps}
        hash={href.slice(1)}
        onClick={(event) => {
          // TanStack Router 1.168 re-stringifies validated search during Link click; commit the already-built location.
          props.onClick?.(event);
          if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            (target !== undefined && target !== "_self")
          ) {
            return;
          }
          event.preventDefault();
          void router.commitLocation(
            router.buildLocation({ hash: href.slice(1), search: true, to: "." }),
          );
        }}
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
        activeOptions={plainLinkActiveOptions}
        activeProps={plainLinkActiveProps}
        rel={target ? "noopener noreferrer" : undefined}
        target={target}
        to={internalPath as "/"}
      >
        {children}
      </Link>
    );
  }
  const externalHref = markdownExternalHref(href);
  return (
    <Link
      {...props}
      href={externalHref}
      rel={target ? "noopener noreferrer" : undefined}
      target={target}
      to={externalHref as "/"}
    >
      {children}
    </Link>
  );
}

function markdownExternalHref(href: string) {
  return href.startsWith("//")
    ? new URL(href, globalThis.location?.href ?? "https://localhost/").href
    : href;
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

function normalizeIssueLabels(labels: YonaRecord[]): IssueLabelOption[] {
  return labels.flatMap((label) => {
    const id = Number(label.id);
    const name = stringField(label.name, "");
    if (!Number.isFinite(id) || !name) {
      return [];
    }
    return [
      {
        categoryId: stringField(label.categoryId, ""),
        categoryIsExclusive: booleanField(label.categoryIsExclusive),
        categoryName: stringField(label.categoryName, ""),
        color: stringField(label.color, "#999999"),
        id,
        name,
      },
    ];
  });
}

function titleHeadQuery(title: string): string | null {
  const match = title.match(/\[([^[\]]*)$/u);
  return match && match[1].length <= 20 ? match[1] : null;
}

function editorMentionAt(bodyMarkdown: string, caretPosition: number): EditorMention | null {
  if (caretPosition < 0) {
    return null;
  }
  const beforeCaret = bodyMarkdown.slice(0, caretPosition);
  const match = beforeCaret.match(/(?:^|\s)([@#:])(.{0,20})$/u);
  if (!match || !legacyMentionQuery(match[2])) {
    return null;
  }
  const trigger = match[1] as "#" | ":" | "@";
  const query = match[2];
  return {
    end: caretPosition,
    query,
    start: caretPosition - query.length - 1,
    trigger,
  };
}

function legacyMentionQuery(query: string) {
  return (
    /^[A-Za-zÀ-ÿ0-9_'.+-]*$/u.test(query) ||
    Array.from(query).every((character) => (character.codePointAt(0) ?? 0) > 255)
  );
}

function editorMentionSuggestions(
  mention: EditorMention | null,
  debouncedMention: EditorMention | null,
  users: IssueMentionUserItem[],
  issues: ProjectIssueReferenceItem[],
): EditorMentionSuggestion[] {
  if (
    !mention ||
    !debouncedMention ||
    mention.trigger !== debouncedMention.trigger ||
    mention.query !== debouncedMention.query
  ) {
    return [];
  }
  const normalizedQuery = mention.query.toLowerCase();
  if (mention.trigger === "@") {
    const candidates = users.flatMap((user, index) => {
      const searchText = user.searchText.trim() || `${user.displayName} ${user.loginId}`;
      const matchIndex = normalizedQuery ? searchText.toLowerCase().indexOf(normalizedQuery) : 0;
      return matchIndex >= 0 ? [{ index, matchIndex, user }] : [];
    });
    return candidates
      .sort((left, right) => left.matchIndex - right.matchIndex || left.index - right.index)
      .slice(0, 10)
      .map(({ user }) => ({
        accessibleLabel: `${user.displayName} ${user.loginId}`,
        detail: user.loginId,
        imageUrl: user.avatarUrl,
        insertion: `@${user.loginId} `,
        key: `user-${user.type}-${user.loginId}`,
        label: user.displayName,
      }));
  }
  if (mention.trigger === "#") {
    return issues
      .map((issue, sourceIndex) => ({
        issue,
        order: legacyIssueSuggestionOrder(issue, mention.query, sourceIndex),
      }))
      .sort((left, right) => left.order - right.order)
      .slice(0, 10)
      .map(({ issue }) => ({
        accessibleLabel: `#${issue.issueNumber} ${issue.title}`,
        detail: issue.title,
        imageUrl: "",
        insertion: `#${issue.issueNumber} `,
        key: `issue-${issue.issueNumber}`,
        label: `#${issue.issueNumber}`,
      }));
  }
  return LEGACY_EMOJIS.filter((emoji) => emoji.name.toLowerCase().includes(normalizedQuery))
    .slice(0, 10)
    .map((emoji) => ({
      accessibleLabel: `${emoji.content} ${emoji.name}`,
      detail: emoji.name,
      imageUrl: "",
      insertion: `${emoji.content} `,
      key: `emoji-${emoji.name}`,
      label: emoji.content,
    }));
}

function legacyIssueSuggestionOrder(
  issue: ProjectIssueReferenceItem,
  query: string,
  sourceIndex: number,
) {
  if (!query) {
    return sourceIndex;
  }
  const issueNumber = String(issue.issueNumber);
  if (issueNumber === query) {
    return 0;
  }
  const normalizedQuery = query.toLowerCase();
  const issueNumberIndex = issueNumber.toLowerCase().indexOf(normalizedQuery);
  const titleIndex = issue.title.toLowerCase().indexOf(normalizedQuery);
  return sourceIndex + 1 + 10 ** issueNumberIndex + (issueNumberIndex > -1 ? 0 : 100 ** titleIndex);
}

function normalizedColor(color: string) {
  const value = color.trim().replace(/^#+/u, "");
  return value ? `#${value}` : "#999999";
}

function compareLowercaseCodeUnits(left: string, right: string) {
  const normalizedLeft = left.toLowerCase();
  const normalizedRight = right.toLowerCase();
  return normalizedLeft < normalizedRight ? -1 : normalizedLeft > normalizedRight ? 1 : 0;
}

function displayLabelName(name: string) {
  return name.length === 0 ? name : `${name[0].toUpperCase()}${name.slice(1)}`;
}

function assigneeDisplayName(
  user: IssueAssignableUserItem,
  translate: (messageKey: string) => string,
) {
  const displayName = user.displayName || user.pureNameOnly || user.loginId;
  return ["issue.assignToMe", "issue.assignToAuthor", "issue.noAssignee"].includes(displayName)
    ? translate(displayName)
    : displayName;
}

function humanFileSize(bytes: number) {
  const normalizedBytes = Math.max(0, Number(bytes) || 0);
  if (normalizedBytes < 1_024) {
    return `${normalizedBytes.toLocaleString("en-US")} bytes`;
  }
  const units = ["Kb", "Mb", "Gb", "Tb", "Pb"];
  const exponent = Math.min(
    units.length,
    Math.max(1, Math.floor(Math.log(normalizedBytes) / Math.log(1_024))),
  );
  return `${(normalizedBytes / 1_024 ** exponent).toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })} ${units[exponent - 1]}`;
}

function legacyHtmlMessageToText(message: string) {
  return message.replace(/<br\s*\/?\s*>/giu, " ");
}

function uploadPlaceholder(key: number) {
  return `<!--_upload-${key}_-->`;
}

function attachmentMarkdown(attachment: UploadedAttachment, basePath: string) {
  const href = attachment.url || prefixBasePath(basePath, `/files/${attachment.id}`);
  const link = `[${attachment.name}](${href}) `;
  const mimeType = attachment.mimeType.trim().toLowerCase();
  if (mimeType.startsWith("image/")) {
    return `!${link}`;
  }
  if (["video/mp4", "video/ogg", "video/webm"].includes(mimeType)) {
    return `<video class="video-js" data-setup="{}" controls><source src="${escapeHtmlAttribute(href)}" type="${escapeHtmlAttribute(mimeType)}"></video>${link}`;
  }
  return link;
}

function escapeHtmlAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function projectLogoUrl(project: ProjectContainer, basePath: string) {
  return prefixBasePath(
    basePath,
    project.logoUrl || "/legacy-assets/images/project_default_logo.png",
  );
}

function projectIdNumber(project: ProjectContainer) {
  const projectId = Number(project.projectId);
  return Number.isFinite(projectId) ? projectId : 0;
}

function normalizeIssueDueDate(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return "";
  }
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
      ? trimmed
      : null;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return [
    String(parsed.getFullYear()).padStart(4, "0"),
    String(parsed.getMonth() + 1).padStart(2, "0"),
    String(parsed.getDate()).padStart(2, "0"),
  ].join("-");
}

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  return (
    project.organizationName ||
    (project.projectScope.toUpperCase() === "PROTECTED" ? ownerName : undefined)
  );
}

function issueFormSearchId(value: unknown): number | string {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && /^(?:0|[1-9]\d*)$/u.test(value)) {
    const numericValue = Number(value);
    return Number.isSafeInteger(numericValue) ? numericValue : value;
  }
  return typeof value === "string" ? value : "";
}

function issueFormSearchMatches(left: unknown, right: unknown) {
  const leftSearch = left && typeof left === "object" ? (left as Record<string, unknown>) : {};
  const rightSearch = right && typeof right === "object" ? (right as Record<string, unknown>) : {};
  return (
    stringField(leftSearch.commentId, "") === stringField(rightSearch.commentId, "") &&
    stringField(leftSearch.parentIssueId, "") === stringField(rightSearch.parentIssueId, "")
  );
}

function stringField(value: unknown, fallback: string) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return fallback;
}

function booleanField(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}
