/* oxlint-disable jsx-a11y/tabindex-no-positive -- legacy issue/create.scala.html requires title/body keyboard order 1 then 2. */
/* oxlint-disable react-doctor/query-mutation-missing-invalidation -- project header mutations share invalidateProject and issue creation invalidates source/target issue caches. */
/* oxlint-disable react-doctor/no-many-boolean-props -- backend ACL capability flags are the minimal legacy form visibility contract. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  Navigate,
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
  type CSSProperties,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  createMarkdownReferenceIndex,
  createYonaReferenceExtension,
  decorateMarkdownReferenceLink,
  gfmAutolinkLiterals,
  HEAD_ANCHOR_DECORATION,
  LegacyMarkdownHtml,
  legacyHardBreaks,
  legacyHeadingAnchors,
  LEGACY_SANITIZE_BASE_SCHEMA,
  reactNodeText,
  type LegacySanitizeSchema,
  type MarkdownComponents,
  type MarkdownReferenceDecoration,
  type MarkdownReferenceIndex,
  type MarkdownReferenceReplacement,
} from "../../../components/legacy-markdown";
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
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import { listProjectLabelsQueryOptions } from "../../../api/project-labels";
import { apiQueryKeys } from "../../../api/query-keys";
import { RestApiError } from "../../../api/rest-client";
import type { ProjectContainer, ProjectMilestone, YoramRecord } from "../../../api/types";
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
import { useLegacyMessages } from "../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import {
  humanFileSize,
  IssuePostFileUploader,
  type UploadRow,
} from "../../../components/file-uploader";
import { IssueDueDateInput } from "../../../components/issue-due-date-input";
import { MarkdownEditor } from "../../../components/markdown-editor";
import { SiteLayoutShell } from "../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../$projectName";

const CHECKLIST_TEMPLATE = "\n- [ ] Todo A\n- [ ] Todo B\n- [ ] Todo C";
const DRAFT_SAVE_DELAY_MS = 5_000;
const SEARCH_DELAY_MS = 300;
const TAB_CHARACTERS = "    ";
const EMPTY_MARKDOWN_REFERENCES: ProjectMarkdownReferencesResponse = {
  commitReferences: [],
  issueReferences: [],
  mentionReferences: [],
};
// Legacy owasp policy (yona-original/app/utils/Markdown.java) on top of the
// hast-util-sanitize defaultSchema base; attribute names are DOM-form because
// the TanStack HTML path sanitizes DOMParser output.
const ISSUE_MARKDOWN_SANITIZE_SCHEMA: LegacySanitizeSchema = {
  ...LEGACY_SANITIZE_BASE_SCHEMA,
  clobber: [],
  attributes: {
    ...LEGACY_SANITIZE_BASE_SCHEMA.attributes,
    "*": [
      ...(LEGACY_SANITIZE_BASE_SCHEMA.attributes["*"] ?? []),
      "class",
      "id",
      "style",
      "width",
      "height",
    ],
    a: [...(LEGACY_SANITIZE_BASE_SCHEMA.attributes.a ?? []), "href", "name", "target"],
    iframe: ["width", "height", "src", "frameborder", "allow", "allowfullscreen"],
    input: [...(LEGACY_SANITIZE_BASE_SCHEMA.attributes.input ?? []), "type", "disabled", "checked"],
    ol: [...(LEGACY_SANITIZE_BASE_SCHEMA.attributes.ol ?? []), "start"],
    source: ["src", "type", "target"],
    video: [
      "data-setup",
      "controls",
      "preload",
      "type",
      "autoplay",
      "responsive",
      "height",
      "width",
      "fluid",
      "liveui",
      "src",
    ],
  },
  protocols: {
    ...LEGACY_SANITIZE_BASE_SCHEMA.protocols,
    href: ["http", "https", "mailto", "file", "zpl"],
    src: ["http", "https", "mailto", "file", "zpl"],
  },
  tagNames: [
    ...new Set([
      ...LEGACY_SANITIZE_BASE_SCHEMA.tagNames,
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
  commentId?: number | string;
  parentIssueId?: number | string;
};

type IssueLabelOption = {
  categoryId: string;
  categoryIsExclusive: boolean;
  categoryName: string;
  color: string;
  id: number;
  name: string;
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

type IssueMarkdownLinkProps = ComponentPropsWithoutRef<"a"> & {
  basePath: string;
  decoration?: MarkdownReferenceDecoration;
};

type IssueMarkdownReferenceKit = {
  extension: ReturnType<typeof createYonaReferenceExtension>;
  index: MarkdownReferenceIndex;
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
        const { commentId: rawCommentId, parentIssueId: rawParentIssueId, ...rest } = result;
        const commentId = issueFormSearchId(rawCommentId);
        const parentIssueId = issueFormSearchId(rawParentIssueId);
        return {
          ...rest,
          ...(commentId === "" ? {} : { commentId }),
          ...(parentIssueId === "" ? {} : { parentIssueId }),
        } as typeof result;
      },
    ],
  },
  validateSearch(search: Record<string, unknown>): IssueFormSearch {
    const commentId = issueFormSearchId(search.commentId);
    const parentIssueId = issueFormSearchId(search.parentIssueId);
    return {
      ...(commentId === "" ? {} : { commentId }),
      ...(parentIssueId === "" ? {} : { parentIssueId }),
    };
  },
});

function ProjectIssueFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { ownerName, projectName } = Route.useParams();
  const formOptionsQuery = useQuery({
    queryFn: () => readProjectIssueFormOptions(runtimeConfig, ownerName, projectName),
    queryKey: ["project", ownerName, projectName, "issues", "form-options"],
    retry: false,
    retryOnMount: false,
  });

  return (
    <ProjectIssueFormScreen
      renderProjectShell={Boolean(formOptionsQuery.error)}
      runtimeConfig={runtimeConfig}
    />
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

function ProjectIssueFormScreen({
  renderProjectShell,
  runtimeConfig,
}: {
  renderProjectShell: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();
  const search = Route.useSearch();

  const content = (
    <>
      <title>{`${t("title.newIssue")} - ${ownerName}/${projectName}`}</title>
      <ProjectIssueFormProjectScreen
        ownerName={ownerName}
        projectName={projectName}
        parentIssueId={stringField(search.parentIssueId, "")}
        referCommentId={stringField(search.commentId, "")}
        renderProjectShell={renderProjectShell}
        runtimeConfig={runtimeConfig}
      />
    </>
  );

  if (!renderProjectShell) {
    return content;
  }

  return (
    <ProjectIssueFormShell
      ownerName={ownerName}
      projectName={projectName}
      runtimeConfig={runtimeConfig}
    >
      {content}
    </ProjectIssueFormShell>
  );
}

export function ProjectIssueFormProjectScreen({
  initialBodyMarkdown = "",
  ownerName,
  parentIssueId = "",
  projectHeaderRuntimeConfig,
  referCommentId = "",
  renderProjectShell = true,
  runtimeConfig,
  projectName,
  showSubtaskOptionOnMount = false,
}: {
  initialBodyMarkdown?: string;
  ownerName: string;
  parentIssueId?: string;
  projectHeaderRuntimeConfig?: RuntimeConfig;
  referCommentId?: string;
  renderProjectShell?: boolean;
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
    retry: false,
    retryOnMount: false,
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
    if (!projectQuery.data) {
      return <IssueFormLoginRedirect redirectUrl={initialPathname} />;
    }
  }

  const firstError = [projectQuery.error, formOptionsQuery.error].find(Boolean);
  if (!projectQuery.data) {
    if (firstError) {
      return (
        <div className="page-wrap-outer">
          <div className="project-page-wrap">
            <div
              className="issue-form-load-error"
              data-owner="project-issue-form-load-error"
              role="alert"
            >
              {t(firstError instanceof Error ? firstError.message : "error.internalServerError")}
            </div>
          </div>
        </div>
      );
    }
    return <div className="issue-form-loading" role="status" aria-label={t("common.loading")} />;
  }

  const projectShell = renderProjectShell ? (
    <>
      <ProjectHeader
        basePath={runtimeConfig.basePath}
        project={projectQuery.data}
        runtimeConfig={projectHeaderRuntimeConfig}
      />
      <ProjectMenu active="issue" basePath={runtimeConfig.basePath} project={projectQuery.data} />
    </>
  ) : null;

  if (formOptionsQuery.error instanceof RestApiError && formOptionsQuery.error.status === 401) {
    return (
      <>
        {projectShell}
        <IssueFormLoginRedirect redirectUrl={initialPathname} />
      </>
    );
  }

  if (firstError) {
    return (
      <>
        {projectShell}
        <div className="page-wrap-outer">
          <div className="project-page-wrap">
            <div
              className="issue-form-load-error"
              data-owner="project-issue-form-load-error"
              role="alert"
            >
              {t(firstError instanceof Error ? firstError.message : "error.internalServerError")}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!formOptionsQuery.data) {
    return (
      <>
        {projectShell}
        <div className="issue-form-loading" role="status" aria-label={t("common.loading")} />
      </>
    );
  }

  const initialBody = parentIssueId
    ? ""
    : initialBodyMarkdown || formOptionsQuery.data.issueTemplateMarkdown;

  return (
    <>
      {projectShell}
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
        labels={labelsQuery.data?.labels ?? []}
        milestones={openMilestonesQuery.data?.milestones ?? []}
        ownerName={ownerName}
        parentIssueId={parentIssueId}
        parentOptions={parentOptionsQuery.data?.items ?? []}
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
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname === "/users/loginform") {
    return null;
  }
  return <Navigate replace search={{ redirectUrl }} to="/users/loginform" />;
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
  labels: YoramRecord[];
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
  const [toastNotice, setToastNotice] = useState<{ key: number; message: string } | null>(null);
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

  const setToast = useCallback((message: string, _durationMs = 3_000) => {
    setToastNotice((current) => ({ key: (current?.key ?? 0) + 1, message }));
  }, []);

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
      setSubmitError(error instanceof Error ? t(error.message) : t("error.internalServerError"));
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
            const message = error instanceof Error ? t(error.message) : "Attachment upload failed.";
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
      const message = error instanceof Error ? t(error.message) : "Attachment delete failed.";
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
    <div className="page-wrap-outer issue-form-page-wrap" data-owner="project-issue-form-page">
      <div className="project-page-wrap">
        <div className="content-wrap frm-wrap" data-owner="project-issue-form">
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
            <IssueFormToast
              noticeKey={toastNotice?.key ?? 0}
              message={toastNotice?.message ?? ""}
            />
            <div className="row-fluid">
              <div className="span12">
                <dl>
                  <dd>
                    <div
                      className="span12 issue-title-row"
                      data-owner="project-issue-form-title-row"
                    >
                      <div
                        className="span11 issue-title-field"
                        data-owner="project-issue-form-title-field"
                      >
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
                        data-owner="project-issue-form-subtask-message"
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
                      <div
                        className="message issue-form-error"
                        role="alert"
                        data-owner="project-issue-form-error"
                      >
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
              <div className="row-fluid issue-form-columns" data-owner="project-issue-form-columns">
                <div className="span9 span-left-pane">
                  <dl>
                    <dd className="issue-editor-cell" data-owner="project-issue-form-editor">
                      <IssueBodyMarkdownEditor
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
                  <div className="actrow" data-owner="project-issue-form-actions">
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
                      data-owner="project-issue-form-cancel-button"
                      onClick={cancelIssueForm}
                    >
                      {t("button.cancel")}
                    </button>
                  </div>
                </div>
                <div
                  className="span3 span-hard-wrap right-menu"
                  data-owner="project-issue-form-right-menu"
                >
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
                  <dl className="issue-option issue-due-date-option">
                    <dt>{t("issue.dueDate")}</dt>
                    <dd>
                      <div
                        className="search search-bar"
                        data-owner="project-issue-form-due-date-search"
                      >
                        <label className="blind" htmlFor="issueDueDate">
                          {t("issue.dueDate")}
                        </label>
                        <IssueDueDateInput
                          ownerPrefix="project-issue-form"
                          inputId="issueDueDate"
                          datePickerRef={datePickerRef}
                          dueDateRef={dueDateRef}
                          value={dueDate}
                          autoComplete="off"
                          onChange={setDueDate}
                        />
                      </div>
                    </dd>
                  </dl>
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

function IssueFormToast({ message, noticeKey }: { message: string; noticeKey: number }) {
  if (noticeKey === 0) {
    return null;
  }

  return (
    <div id="yobiToasts" className="yobiToasts" key={noticeKey}>
      <div className="toast" tabIndex={-1} key={noticeKey}>
        <div className="btn-dismiss">
          <button type="button" className="btn-transparent">
            &times;
          </button>
        </div>
        <div className="center-text">
          <span className="v"></span>
          <div className="msg">{message}</div>
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
          data-owner="project-issue-form-title-head-options"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => {
            return (
              <button
                type="button"
                id={`title-head-${index}`}
                key={`${suggestion.category}-${suggestion.id ?? suggestion.name}`}
                className={`title-head-option ${index === activeIndex ? "active" : ""} project-issue-form-combobox-option-button`.trim()}
                data-owner="project-issue-form-title-suggestion-option"
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseSuggestion(suggestion)}
              >
                <small
                  className="project-issue-form-combobox-option-small"
                  style={
                    normalizedColor(suggestion.labelColor ?? "")
                      ? { backgroundColor: normalizedColor(suggestion.labelColor ?? "") }
                      : undefined
                  }
                  data-owner="project-issue-form-title-suggestion-category"
                >
                  {suggestion.category}
                </small>{" "}
                {suggestion.name}
              </button>
            );
          })}
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
      <div
        className="span6 subtask-parent-control"
        data-owner="project-issue-form-subtask-parent-control"
        hidden={isCrossProject}
        // the frozen bootstrap `.row-fluid [class*="span"] { display: block }`
        // (bootstrap.css:360) overrides the UA [hidden] rule, so mirror the
        // legacy jQuery .hide() (inline display:none) for the cross-project
        // parent control.
        style={isCrossProject ? { display: "none" } : undefined}
      >
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
            <option
              key={String(issue.id)}
              value={String(issue.id)}
              ref={
                String(issue.id) === parentIssueId
                  ? (option) => {
                      if (option) {
                        option.defaultSelected = true;
                      }
                    }
                  : undefined
              }
            >
              #{String(issue.issueNumber)}. {issue.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function IssueBodyMarkdownEditor({
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
  const editorTextareaStyleProps = { style: { height: `${textareaContentHeight}px` } };
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
  const markdownReferenceKit = useMemo(
    () =>
      createIssueMarkdownReferenceKit(
        markdownReferencesQuery.data ?? EMPTY_MARKDOWN_REFERENCES,
        issueStateLabels,
      ),
    [issueStateLabels, markdownReferencesQuery.data],
  );
  const markdownExtensions = useMemo(
    () => [
      gfmAutolinkLiterals,
      legacyHeadingAnchors(),
      markdownReferenceKit.extension,
      legacyHardBreaks,
    ],
    [markdownReferenceKit],
  );
  const markdownComponents = useMemo<MarkdownComponents>(
    () => ({
      a: (props: ComponentPropsWithoutRef<"a">) => {
        const { href, ...rest } = props;
        const decoration =
          (href &&
            markdownReferenceKit.index.replacementFor(href, reactNodeText(props.children))
              ?.decoration) ||
          (href?.startsWith("#yb-header-") ? HEAD_ANCHOR_DECORATION : undefined);
        const decorated = decorateMarkdownReferenceLink(
          props.className,
          props.children,
          decoration,
        );
        return (
          <IssueMarkdownLink
            {...rest}
            {...decorated}
            basePath={runtimeConfig.basePath}
            href={href}
          />
        );
      },
      video: (props: ComponentPropsWithoutRef<"video">) => {
        const { className, ...rest } = props;
        return (
          <video
            {...rest}
            className={className ?? ""}
            data-owner="project-issue-form-markdown-preview-video"
          />
        );
      },
      iframe: (props: ComponentPropsWithoutRef<"iframe">) => (
        <iframe title="Embedded content" {...props} allowFullScreen />
      ),
    }),
    [markdownReferenceKit, runtimeConfig.basePath],
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
    <MarkdownEditor
      activeTab={activeTab}
      onActiveTabChange={setActiveTab}
      wrapperClassName="mt10 issue-markdown-editor"
      wrapperOwner="project-issue-form-markdown-editor"
      tabListClassName="nav nav-tabs nm small"
      tabListOwner="project-issue-form-markdown-editor-tabs"
      tabContentStyleProps={(_tab, active) => ({ className: active ? "active" : undefined })}
      tabContentOwner={(tab) =>
        tab === "edit"
          ? "project-issue-form-markdown-tab-edit"
          : "project-issue-form-markdown-tab-preview"
      }
      checklistClassName="task-list-button"
      checklistOwner="project-issue-form-task-list-button"
      checklistButtonAriaLabel={t("button.add.checklist")}
      onChecklistClick={insertChecklist}
      clearTemporaryAriaHidden
      clearTemporaryButtonTabIndex={-1}
      noticeLabelClassName="editor-notice-label"
      noticeLabelOwner="project-issue-form-editor-notice"
      noticeContent={
        draftNotice ? (
          <span className="saved" data-owner="project-issue-form-editor-notice-saved">
            {draftNotice}
          </span>
        ) : null
      }
      tabContentClassName="tab-content issue-editor-tab-content"
      tabContentPaneOwner="project-issue-form-editor-tab-content"
      editPaneId="edit-body"
      textareaBoxOwner="project-issue-form-textarea-box"
      textareaBoxRef={textareaBoxRef}
      onTextareaBoxBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDismissedMentionKey(mentionKey);
          setActiveSuggestion(-1);
        }
      }}
      textareaRef={bodyRef}
      textareaName="body"
      textareaId="editor-body-body"
      textareaStyleProps={editorTextareaStyleProps}
      textareaStyleFirst={false}
      textareaOwner="project-issue-form-editor-textarea"
      textareaValue={bodyMarkdown}
      textareaOnChange={(event) => {
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
      textareaOnFocus={onBodyFocus}
      textareaTabIndex={2}
      textareaExtraProps={{
        role: "combobox",
        "aria-autocomplete": "list",
        "aria-controls": "editor-mention-options",
        "aria-expanded": mentionSuggestions.length > 0,
        "aria-activedescendant":
          mentionSuggestions.length > 0
            ? `editor-mention-option-${Math.max(activeSuggestion, 0)}`
            : undefined,
        onClick: (event) => {
          setDismissedMentionKey(null);
          setCaretPosition(event.currentTarget.selectionStart);
        },
        onScroll: (event) => setTextareaScrollTop(event.currentTarget.scrollTop),
        onPaste: (event) => {
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
        },
        onDragOver: (event) => {
          if (event.dataTransfer.types.includes("Files")) {
            event.preventDefault();
          }
        },
        onDrop: (event) => {
          const files = Array.from(event.dataTransfer.files);
          if (files.length === 0) {
            return;
          }
          event.preventDefault();
          onFiles(files, {
            end: event.currentTarget.selectionEnd,
            start: event.currentTarget.selectionStart,
          });
        },
        onKeyUp: (event) => {
          if (event.key !== "Escape") {
            setCaretPosition(event.currentTarget.selectionStart);
          }
        },
        onKeyDown: handleEditorKeyDown,
      }}
      textareaExtras={
        <>
          {mention ? (
            <div
              aria-hidden="true"
              style={{ transform: `translateY(-${textareaScrollTop}px)` }}
              className="editor-mention-mirror"
              data-owner="project-issue-form-mention-mirror"
            >
              {bodyMarkdown.slice(0, caretPosition)}
              <span
                ref={mentionMarkerRef}
                className="editor-mention-marker"
                data-owner="project-issue-form-editor-mention-marker"
              >
                {"\u200b"}
              </span>
            </div>
          ) : null}
          {mentionSuggestions.length > 0 ? (
            <div
              ref={mentionPopupRef}
              id="editor-mention-options"
              role="listbox"
              style={{ left: mentionPopupPosition.left, top: mentionPopupPosition.top }}
              className="issue-combobox-options editor-mention-options"
              data-owner="project-issue-form-editor-mention-options"
            >
              {mentionSuggestions.map((suggestion, index) => {
                return (
                  <button
                    type="button"
                    id={`editor-mention-option-${index}`}
                    key={suggestion.key}
                    className={`${index === activeSuggestion ? "active" : ""} project-issue-form-combobox-option-button`.trim()}
                    data-owner="project-issue-form-editor-mention-option"
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
                    {suggestion.detail ? (
                      <small
                        className="project-issue-form-combobox-option-small"
                        data-owner="project-issue-form-editor-mention-option-detail"
                      >
                        {suggestion.detail}
                      </small>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </>
      }
      previewPaneId="preview-body"
      previewClassName="markdown-preview markdown-wrap content-body"
      previewOwner="project-issue-form-markdown-preview"
      previewChildren={() => (
        <LegacyMarkdownHtml
          components={markdownComponents}
          extensions={markdownExtensions}
          sanitize={ISSUE_MARKDOWN_SANITIZE_SCHEMA}
          styleFilter={sanitizeLegacyStyle}
          urlTransform={legacyMarkdownUrlTransform}
        >
          {bodyMarkdown}
        </LegacyMarkdownHtml>
      )}
    />
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
          data-owner="project-issue-form-assignee-picker"
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
            <span
              className="select2-chosen issue-assignee-value"
              data-owner="project-issue-form-assignee-value"
            >
              {selected ? `${displayName(selected)} (${selected.loginId})` : t("issue.noAssignee")}
            </span>
            <span className="select2-arrow" aria-hidden="true">
              <b />
            </span>
          </div>
          <input
            className="select2-focusser select2-offscreen"
            data-owner="project-issue-form-assignee-control-input"
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
                data-owner="project-issue-form-assignee-dropdown-search"
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
              data-owner="project-issue-form-milestone-picker"
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
  const labelGroups = new Map<string, { labels: IssueLabelOption[]; name: string }>();
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
          data-owner="project-issue-form-label-picker"
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsOpen(false);
            }
          }}
        >
          <ul className="select2-choices">
            {selectedLabels.map((label) => {
              const labelColor = normalizedColor(label.color);
              return (
                <li
                  key={label.id}
                  className="select2-search-choice issue-label-token"
                  data-owner="project-issue-form-label-token"
                >
                  <div>
                    <strong
                      style={
                        labelColor
                          ? ({ "--x-label-color": labelColor } as CSSProperties)
                          : undefined
                      }
                      className="label issue-label active static"
                      data-owner="project-issue-form-label-background"
                    >
                      {label.name}
                    </strong>
                  </div>
                  <button
                    type="button"
                    className="select2-search-choice-close btn-transparent"
                    data-owner="project-issue-form-label-token-close"
                    aria-label={`${t("button.delete")} ${label.name}`}
                    onClick={() => onRemove(label.id)}
                  ></button>
                </li>
              );
            })}
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
              {labels.map((label) => {
                const labelColor = normalizedColor(label.color);
                return (
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
                        style={
                          labelColor
                            ? ({ "--x-label-color": labelColor } as CSSProperties)
                            : undefined
                        }
                        className="label issue-label active static"
                        data-owner="project-issue-form-label-background"
                      >
                        {label.name}
                      </strong>
                      <small>{label.categoryName}</small>
                    </div>
                  </li>
                );
              })}
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

function createIssueMarkdownReferenceKit(
  references: ProjectMarkdownReferencesResponse,
  issueStateLabels: Record<string, string>,
): IssueMarkdownReferenceKit {
  const replacements = markdownReferenceReplacements(references, issueStateLabels);
  return {
    extension: createYonaReferenceExtension(replacements),
    index: createMarkdownReferenceIndex(replacements),
  };
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
    if (!replacement.token || seen.has(replacement.token)) {
      return false;
    }
    seen.add(replacement.token);
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
    decoration: {
      className: ["issueLink"],
      stateSpan: {
        className: `issue-state ${state}`,
        label: issueStateLabels[state] ?? reference.state,
      },
    },
    label: reference.token.startsWith("#") ? display : `${display}${display}`,
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
    label: prefix ? `${prefix}@${reference.shortId}` : reference.shortId,
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
      decoration: { childWrapperClass: { className: "project-link" } },
      label,
      token: reference.token,
      url: `/${reference.ownerName}/${reference.projectName}`,
    };
  }
  if (reference.kind === "organization") {
    return {
      decoration: { childWrapperClass: { className: "org-link" } },
      label,
      token: reference.token,
      url: `/organizations/${reference.loginId}`,
    };
  }
  return {
    decoration: { className: ["no-text-decoration", "user-link"] },
    label,
    token: reference.token,
    url: `/${reference.loginId}`,
  };
}

function legacyMarkdownUrlTransform(value: string) {
  const protocol = value.match(/^([a-z][a-z\d+.-]*):/iu)?.[1]?.toLowerCase();
  return !protocol || ["http", "https", "mailto", "file", "zpl"].includes(protocol) ? value : "";
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

function normalizeIssueLabels(labels: YoramRecord[]): IssueLabelOption[] {
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
