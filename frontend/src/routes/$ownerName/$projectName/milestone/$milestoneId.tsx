import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import {
  createElement,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type ComponentType,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { readProjectContainerQueryOptions } from "../../../../api/org-project";
import { currentSessionQueryOptions } from "../../../../api/session";
import type { ProjectMilestone, ProjectMilestoneIssue, YonaLabel } from "../../../../api/types";
import {
  closeProjectMilestone,
  deleteProjectMilestone,
  openProjectMilestone,
  readProjectMilestone,
  readSessionBootstrap,
} from "../../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../../i18n";
import { YonaQueryProvider } from "../../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../../runtime-config";
import { SiteLayoutShell } from "../../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../../$projectName";

const LegacyInternalLink = Link as ComponentType<
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    hash?: string;
    params?: Record<string, string>;
    search?: Record<string, unknown>;
    to: string;
  }
>;

type MilestoneDetailSearch = {
  state: "all" | "closed" | "open";
};

export const Route = createFileRoute("/$ownerName/$projectName/milestone/$milestoneId")({
  component: ProjectMilestoneDetailRoute,
  validateSearch(search: Record<string, unknown>): MilestoneDetailSearch {
    const state = typeof search.state === "string" ? search.state.toLowerCase() : "open";
    return {
      state: state === "closed" || state === "all" ? state : "open",
    };
  },
});

function ProjectMilestoneDetailRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectMilestoneDetailScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectMilestoneDetailScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName, milestoneId } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isEditChildRoute = pathname.endsWith(`/milestone/${milestoneId}/editform`);
  const numericMilestoneId = Number(milestoneId) || 0;
  const projectQuery = useQuery({
    ...readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
    enabled: !isEditChildRoute,
  });
  const sessionQuery = useQuery({
    ...currentSessionQueryOptions(runtimeConfig),
    enabled: !isEditChildRoute,
  });
  const milestoneQuery = useQuery({
    enabled: !isEditChildRoute,
    queryFn: () => readProjectMilestone(runtimeConfig, ownerName, projectName, numericMilestoneId),
    queryKey: ["project", ownerName, projectName, "milestones", numericMilestoneId],
  });

  if (isEditChildRoute) {
    return <Outlet />;
  }

  if (!projectQuery.data || !sessionQuery.data || !milestoneQuery.data?.milestone) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu
        active="milestone"
        basePath={runtimeConfig.basePath}
        project={projectQuery.data}
      />
      <MilestoneDetailAssets
        basePath={runtimeConfig.basePath}
        currentUserLoginId={stringField(sessionQuery.data.loginId)}
        ownerName={ownerName}
        projectName={projectName}
      />
      <ProjectMilestoneDetailBody
        milestone={milestoneQuery.data.milestone}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

function MilestoneDetailAssets({
  basePath,
  currentUserLoginId,
  ownerName,
  projectName,
}: {
  basePath: string;
  currentUserLoginId: string;
  ownerName: string;
  projectName: string;
}) {
  const projectPath = `/${ownerName}/${projectName}`;
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
      <link
        rel="stylesheet"
        type="text/css"
        href={prefixBasePath(basePath, `${projectPath}/issue/labels.css`)}
      />
      <meta name="yona-current-user-login-id" content={currentUserLoginId} />
    </>
  );
}

function ProjectMilestoneDetailBody({
  milestone,
  runtimeConfig,
}: {
  milestone: ProjectMilestone;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { ownerName, projectName, milestoneId } = Route.useParams();
  const search = Route.useSearch();
  const [filter, setFilter] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const projectPath = `/${ownerName}/${projectName}`;
  const milestonePath = `${projectPath}/milestone/${milestoneId}`;
  const isClosed = stringField(milestone.state) === "closed";
  const completionPercent = numberField(milestone.completionPercent);
  const openIssues = milestone.openIssues ?? [];
  const closedIssues = milestone.closedIssues ?? [];
  const allIssues = [...openIssues, ...closedIssues];
  const visibleIssues =
    search.state === "closed" ? closedIssues : search.state === "all" ? allIssues : openIssues;
  const attachmentsJson = useMemo(() => JSON.stringify(milestone.attachments ?? []), [milestone]);
  const milestoneQueryKey = ["project", ownerName, projectName, "milestones", Number(milestoneId)];

  const stateMutation = useMutation({
    mutationFn: async (state: "closed" | "open") => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      const input = { milestoneId: Number(milestoneId) || 0, ownerName, projectName };
      return state === "closed"
        ? closeProjectMilestone(runtimeConfig, csrfToken, input)
        : openProjectMilestone(runtimeConfig, csrfToken, input);
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: milestoneQueryKey });
      queryClient.invalidateQueries({
        queryKey: ["project", ownerName, projectName, "milestones"],
      });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteProjectMilestone(runtimeConfig, csrfToken, {
        milestoneId: Number(milestoneId) || 0,
        ownerName,
        projectName,
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: milestoneQueryKey });
      queryClient.invalidateQueries({
        queryKey: ["project", ownerName, projectName, "milestones"],
      });
      router.navigate({ to: `/${ownerName}/${projectName}/milestones` });
    },
  });

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="milesion-wrap">
          <h4>
            <LegacyInternalLink
              to="/$ownerName/$projectName/milestone/$milestoneId"
              params={{ ownerName, projectName, milestoneId }}
              search={{}}
              className="title"
            >
              {stringField(milestone.title)}
            </LegacyInternalLink>
            <small className="ml10">
              {stringField(milestone.dueDateLabel) ? (
                <>
                  <span className="due-date">
                    {t("label.dueDate")} <strong>{stringField(milestone.dueDateLabel)}</strong>
                  </span>
                  {!isClosed ? (
                    <span className="date">({stringField(milestone.untilLabel)})</span>
                  ) : null}
                </>
              ) : null}
              <span className={`badge badge-issue-${isClosed ? "closed" : "open"} margin-left-5`}>
                {t(`milestone.state.${isClosed ? "closed" : "open"}`)}
              </span>
            </small>
          </h4>

          <div className="progress progress-success">
            <div className="bar" style={{ width: `${completionPercent}%` }}></div>
          </div>

          {stringField(milestone.contentsMarkdown) ? (
            <div className="milestone-desc">
              <div className="markdown-wrap">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {stringField(milestone.contentsMarkdown)}
                </ReactMarkdown>
              </div>
              <div className="attachments" data-attachments={attachmentsJson}></div>
            </div>
          ) : (
            <div className="content empty-content"></div>
          )}

          <div className="actrow right-txt row-fluid" style={{ clear: "both", padding: "15px 0" }}>
            <LegacyInternalLink
              to="/$ownerName/$projectName/milestones"
              params={{ ownerName, projectName }}
              className="ybtn pull-left"
            >
              {t("button.list")}
            </LegacyInternalLink>
            {booleanField(milestone.viewerCanDelete)
              ? createElement(
                  "a",
                  {
                    "data-toggle": "modal",
                    className: "ybtn ybtn-danger",
                    href: "#deleteConfirm",
                    onClick: (event) => {
                      event.preventDefault();
                      setDeleteConfirmOpen(true);
                    },
                  },
                  t("button.delete"),
                )
              : null}
            {booleanField(milestone.viewerCanUpdate) ? (
              <>
                <LegacyInternalLink
                  to="/$ownerName/$projectName/milestone/$milestoneId/editform"
                  params={{ ownerName, projectName, milestoneId }}
                  className="ybtn"
                >
                  {t("button.edit")}
                </LegacyInternalLink>
                {isClosed ? (
                  <button
                    type="button"
                    data-request-method="post"
                    data-request-uri={prefixBasePath(
                      runtimeConfig.basePath,
                      `${milestonePath}/open`,
                    )}
                    className="ybtn"
                    onClick={() => stateMutation.mutate("open")}
                  >
                    {t("milestone.open")}
                  </button>
                ) : (
                  <button
                    type="button"
                    data-request-method="post"
                    data-request-uri={prefixBasePath(
                      runtimeConfig.basePath,
                      `${milestonePath}/close`,
                    )}
                    className="ybtn"
                    onClick={() => stateMutation.mutate("closed")}
                  >
                    {t("milestone.close")}
                  </button>
                )}
              </>
            ) : null}
          </div>

          <div id="issues">
            <ul className="nav nav-tabs">
              {(["open", "closed", "all"] as const).map((state) => (
                <li key={state} className={search.state === state ? "active" : ""}>
                  <LegacyInternalLink
                    to="/$ownerName/$projectName/milestone/$milestoneId"
                    params={{ ownerName, projectName, milestoneId }}
                    search={{ state }}
                    hash="issues"
                  >
                    {t(`issue.state.${state}`)}
                    <span className="num-badge">
                      {state === "open"
                        ? openIssues.length
                        : state === "closed"
                          ? closedIssues.length
                          : allIssues.length}
                    </span>
                  </LegacyInternalLink>
                </li>
              ))}
            </ul>

            <div className="issues">
              <div className="filter-wrap">
                <MassUpdateShell projectPath={projectPath} runtimeConfig={runtimeConfig} />
                <div className="pull-right search search-bar">
                  <input
                    name="filter"
                    className="textbox"
                    type="text"
                    placeholder={t("milestone.searchPlaceholder")}
                    value={filter}
                    data-toggle="item-search"
                    data-items="issue-item"
                    onChange={(event) => {
                      setFilter(event.currentTarget.value);
                    }}
                  />
                  <button type="submit" className="search-btn">
                    <i className="yobicon-search"></i>
                  </button>
                </div>
              </div>
              <ul className="post-list-wrap row-fluid">
                {visibleIssues.map((issue) => (
                  <MilestoneIssueRow
                    key={stringField(issue.id, stringField(issue.issueNumber))}
                    filter={filter}
                    issue={issue}
                    projectPath={projectPath}
                  />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div
        id="deleteConfirm"
        className={deleteConfirmOpen ? "modal fade in" : "modal hide fade"}
        style={deleteConfirmOpen ? { display: "block" } : undefined}
      >
        <div className="modal-header">
          <button
            type="button"
            className="close"
            onClick={() => {
              setDeleteConfirmOpen(false);
            }}
          >
            x
          </button>
          <h3>{t("milestone.delete")}</h3>
        </div>
        <div className="modal-body">
          <p>{t("post.delete.confirm")}</p>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="ybtn ybtn-danger"
            data-request-method="delete"
            data-request-uri={prefixBasePath(runtimeConfig.basePath, milestonePath)}
            onClick={() => deleteMutation.mutate()}
          >
            {t("button.yes")}
          </button>
          <button
            type="button"
            className="ybtn"
            onClick={() => {
              setDeleteConfirmOpen(false);
            }}
          >
            {t("button.no")}
          </button>
        </div>
      </div>
    </div>
  );
}

function MassUpdateShell({
  projectPath,
  runtimeConfig,
}: {
  projectPath: string;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  return (
    <div className="mass-update-wrap hide-in-mobile">
      <form
        id="mass-update-form"
        className="mass-update-form pull-left"
        action={prefixBasePath(runtimeConfig.basePath, `${projectPath}/issues`)}
        method="post"
      >
        <div className="btn-group check-all">
          <label htmlFor="check-all" aria-label="check-all">
            <input type="checkbox" id="check-all" data-target="checked-issue" />
          </label>
        </div>
        <div id="state" className="btn-group" data-name="state">
          <button className="btn dropdown-toggle medium" data-toggle="dropdown" disabled>
            <span className="d-label">{t("issue.update.state")}</span>
            <span className="d-caret">
              <span className="caret"></span>
            </span>
          </button>
          <ul className="dropdown-menu mass-update-list">
            <li data-value="OPEN">{createElement("a", {}, t("issue.state.open"))}</li>
            <li data-value="CLOSED">{createElement("a", {}, t("issue.state.closed"))}</li>
          </ul>
        </div>
      </form>
    </div>
  );
}

function MilestoneIssueRow({
  filter,
  issue,
  projectPath,
}: {
  filter: string;
  issue: ProjectMilestoneIssue;
  projectPath: string;
}) {
  const issueId = stringField(issue.id, stringField(issue.issueNumber));
  const issueNumber = stringField(issue.issueNumber);
  const title = stringField(issue.title);
  const isClosed = stringField(issue.state) === "closed";
  const normalizedFilter = filter.toLowerCase().trim();
  const hidden = normalizedFilter.length > 0 && !issueSearchText(issue).includes(normalizedFilter);
  const labels = sortLabels(issue.labels ?? []);

  return (
    <li
      className="post-item title"
      id={`issue-item-${issueId}`}
      data-item="issue-item"
      data-value={`${stringField(issue.authorLoginId)} ${issueNumber} ${title}`}
      style={hidden ? { display: "none" } : undefined}
    >
      <div className="span9 span-hard-wrap">
        <label
          htmlFor={`issue-${issueId}`}
          className="mass-update-check hide-in-mobile"
          aria-label={`issue-${issueId}`}
        >
          <input
            id={`issue-${issueId}`}
            type="checkbox"
            name="checked-issue"
            data-toggle="issue-checkbox"
            data-issue-id={issueId}
            data-issue-labels=""
          />
        </label>
        <div
          ref={(node) => {
            node?.setAttribute("for", `issue-${issueId}`);
          }}
          className="issue-item-row"
        >
          <div className="title-wrap">
            <LegacyInternalLink to={`${projectPath}/issue/${issueNumber}`} className="title">
              <span className="post-id">#{issueNumber}</span>
            </LegacyInternalLink>
            <LegacyInternalLink to={`${projectPath}/issue/${issueNumber}`} className="title">
              {title}
            </LegacyInternalLink>
          </div>
          <div className="infos">
            <span className={isClosed ? "state-label closed" : "state-label open"}>
              {isClosed ? <i className=" yobicon-checkmark"></i> : null}
            </span>
            {stringField(issue.assigneeLabel) ? (
              <span className="infos-item">{stringField(issue.assigneeLabel)}</span>
            ) : null}
            {labels.map((label) =>
              createElement(
                "a",
                {
                  "data-category-id": stringField(label.categoryId),
                  "data-label-id": stringField(label.id),
                  className: "label issue-label list-label active",
                  href: "#",
                  key: stringField(label.id),
                  style: { background: cssBackgroundColor(stringField(label.color)) },
                },
                stringField(label.name),
              ),
            )}
            <div className="child-issue-list hide"></div>
          </div>
        </div>
      </div>
      <div className="span3 hide-in-mobile">
        <div className="mt5 pull-right">
          <div className="empty-avatar-wrap">&nbsp;</div>
        </div>
      </div>
    </li>
  );
}

function issueSearchText(issue: ProjectMilestoneIssue) {
  return [
    stringField(issue.issueNumber),
    stringField(issue.title),
    stringField(issue.assigneeLabel),
    ...((issue.labels ?? []) as YonaLabel[]).map((label) => stringField(label.name)),
  ]
    .join(" ")
    .toLowerCase();
}

function sortLabels(labels: YonaLabel[]) {
  return labels.slice().sort((left, right) => {
    const leftKey = `${stringField(left.categoryName)}\u0000${stringField(left.name)}`;
    const rightKey = `${stringField(right.categoryName)}\u0000${stringField(right.name)}`;
    return leftKey.localeCompare(rightKey);
  });
}

function booleanField(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function numberField(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function stringField(value: unknown, fallback = "") {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
}

function cssBackgroundColor(value: string) {
  const match = /^#([0-9a-f]{6})$/iu.exec(value.trim());
  if (!match) {
    return value;
  }
  const hex = match[1];
  return `rgb(${Number.parseInt(hex.slice(0, 2), 16)}, ${Number.parseInt(
    hex.slice(2, 4),
    16,
  )}, ${Number.parseInt(hex.slice(4, 6), 16)})`;
}
