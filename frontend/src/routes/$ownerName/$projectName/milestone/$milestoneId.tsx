import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import type { HTMLAttributes } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { readProjectContainerQueryOptions } from "../../../../api/org-project";
import { currentSessionQueryOptions } from "../../../../api/session";
import type {
  ProjectContainer,
  ProjectMilestone,
  ProjectMilestoneIssue,
  YonaLabel,
} from "../../../../api/types";
import {
  closeProjectMilestone,
  deleteProjectMilestone,
  massUpdateIssues,
  openProjectMilestone,
  readProjectMilestone,
  readSessionBootstrap,
} from "../../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../../i18n";
import { YonaQueryProvider } from "../../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../../runtime-config";
import { SiteLayoutShell } from "../../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../../$projectName";

type LegacyIssueListItemAttrs = HTMLAttributes<HTMLLIElement> & { href: string };
type LegacyIssueItemRowAttrs = {
  htmlFor: string;
};

type MilestoneDetailSearch = {
  state: "all" | "closed" | "open";
};

const LEGACY_MILESTONE_LINK_PROPS = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
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

function restApiErrorStatus(error: unknown) {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return undefined;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

function ProjectMilestoneDetailRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectMilestoneDetailScreen runtimeConfig={runtimeConfig} />
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

  if (!projectQuery.data) {
    return null;
  }

  const projectSearchScope = {
    organizationName: projectSearchScopeOrganizationName(projectQuery.data, ownerName),
    ownerName,
    projectName,
  };
  const projectShell = (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu
        active="milestone"
        basePath={runtimeConfig.basePath}
        project={projectQuery.data}
      />
    </>
  );

  const milestoneNotFound =
    restApiErrorStatus(milestoneQuery.error) === 404 ||
    (milestoneQuery.isSuccess && !milestoneQuery.data?.milestone);

  if (milestoneNotFound) {
    return (
      <SiteLayoutShell
        projectSearchScope={projectSearchScope}
        runtimeConfig={runtimeConfig}
        showLegacyProjectHeaderLinks
      >
        {projectShell}
        <ProjectMilestoneNotFoundTitle ownerName={ownerName} projectName={projectName} />
        <ProjectMilestoneNotFoundBody />
      </SiteLayoutShell>
    );
  }

  if (milestoneQuery.isPending || !milestoneQuery.data?.milestone) {
    return (
      <SiteLayoutShell
        projectSearchScope={projectSearchScope}
        runtimeConfig={runtimeConfig}
        showLegacyProjectHeaderLinks
      >
        {projectShell}
      </SiteLayoutShell>
    );
  }

  const currentUser = {
    avatarUrl: stringField(sessionQuery.data?.avatarUrl),
    id: stringField(sessionQuery.data?.actorId),
    label: stringField(sessionQuery.data?.userLabel, stringField(sessionQuery.data?.loginId)),
    loginId: stringField(sessionQuery.data?.loginId),
  };
  const viewerIsProjectMember =
    currentUser.loginId !== "" &&
    isProjectMember(
      recordArray(projectQuery.data.members),
      recordArray(milestoneQuery.data.milestone.assignableUsers),
      currentUser,
    );

  return (
    <SiteLayoutShell
      projectSearchScope={projectSearchScope}
      runtimeConfig={runtimeConfig}
      showLegacyProjectHeaderLinks
    >
      <ProjectMilestoneDetailTitle
        milestoneTitle={stringField(milestoneQuery.data.milestone.title)}
        ownerName={ownerName}
        projectName={projectName}
      />
      {projectShell}
      <MilestoneDetailAssets
        basePath={runtimeConfig.basePath}
        ownerName={ownerName}
        projectName={projectName}
      />
      <ProjectMilestoneDetailBody
        currentUser={currentUser}
        milestone={milestoneQuery.data.milestone}
        runtimeConfig={runtimeConfig}
        viewerIsProjectMember={viewerIsProjectMember}
      />
    </SiteLayoutShell>
  );
}

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const organizationName = stringField(project.organizationName, "");
  if (organizationName) {
    return organizationName;
  }
  return booleanField(project.isProtected) ? ownerName : undefined;
}

function ProjectMilestoneDetailTitle({
  milestoneTitle,
  ownerName,
  projectName,
}: {
  milestoneTitle: string;
  ownerName: string;
  projectName: string;
}) {
  return milestoneTitle ? <title>{`${milestoneTitle} - ${ownerName}/${projectName}`}</title> : null;
}

function ProjectMilestoneNotFoundTitle({
  ownerName,
  projectName,
}: {
  ownerName: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();

  return <title>{`${t("error.notfound")} - ${ownerName}/${projectName}`}</title>;
}

function ProjectMilestoneNotFoundBody() {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="error-wrap">
          <i className="ico ico-err2"></i>
          <p>{t("error.notfound.milestone")}</p>
          <Link
            to="/$ownerName/$projectName/milestones"
            params={{ ownerName, projectName }}
            className="ybtn ybtn-primary"
          >
            {t("button.list")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function MilestoneDetailAssets({
  basePath,
  ownerName,
  projectName,
}: {
  basePath: string;
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
      <link
        rel="stylesheet"
        type="text/css"
        href={prefixBasePath(basePath, `${projectPath}/issue/labels.css`)}
      />
    </>
  );
}

function ProjectMilestoneDetailBody({
  currentUser,
  milestone,
  runtimeConfig,
  viewerIsProjectMember,
}: {
  currentUser: { avatarUrl: string; id: string; label: string; loginId: string };
  milestone: ProjectMilestone;
  runtimeConfig: RuntimeConfig;
  viewerIsProjectMember: boolean;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { ownerName, projectName, milestoneId } = Route.useParams();
  const search = Route.useSearch();
  const [filter, setFilter] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmWasShown, setDeleteConfirmWasShown] = useState(false);
  const projectPath = `/${ownerName}/${projectName}`;
  const isClosed = stringField(milestone.state) === "closed";
  const completionPercent = numberField(milestone.completionPercent);
  const openIssues = milestone.openIssues ?? [];
  const closedIssues = milestone.closedIssues ?? [];
  const allIssues = [...openIssues, ...closedIssues];
  const visibleIssues =
    search.state === "closed" ? closedIssues : search.state === "all" ? allIssues : openIssues;
  const [checkedIssueIds, setCheckedIssueIds] = useState<string[]>([]);
  const attachmentsJson = useMemo(() => JSON.stringify(milestone.attachments ?? []), [milestone]);
  const milestoneQueryKey = ["project", ownerName, projectName, "milestones", Number(milestoneId)];
  const applyTitlePrefixFilter = (prefix: string) => {
    setFilter(prefix);
    searchInputRef.current?.focus();
  };

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
            <Link
              to="/$ownerName/$projectName/milestone/$milestoneId"
              params={{ ownerName, projectName, milestoneId }}
              search={{}}
              {...LEGACY_MILESTONE_LINK_PROPS}
              className="title"
            >
              {stringField(milestone.title)}
            </Link>
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

          <div
            className="actrow right-txt row-fluid"
            style={{ clear: "both", display: "block", padding: "15px 0" }}
          >
            <Link
              to="/$ownerName/$projectName/milestones"
              params={{ ownerName, projectName }}
              className="ybtn pull-left"
            >
              {t("button.list")}
            </Link>
            {booleanField(milestone.viewerCanDelete) ? (
              <button
                type="button"
                className="ybtn ybtn-danger"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setDeleteConfirmWasShown(true);
                  setDeleteConfirmOpen(true);
                }}
              >
                {t("button.delete")}
              </button>
            ) : null}
            {booleanField(milestone.viewerCanUpdate) ? (
              <>
                <Link
                  to="/$ownerName/$projectName/milestone/$milestoneId/editform"
                  params={{ ownerName, projectName, milestoneId }}
                  className="ybtn"
                >
                  {t("button.edit")}
                </Link>
                {isClosed ? (
                  <button
                    type="button"
                    className="ybtn"
                    onClick={() => stateMutation.mutate("open")}
                  >
                    {t("milestone.open")}
                  </button>
                ) : (
                  <button
                    type="button"
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
                <li key={state} className={search.state === state ? "active" : undefined}>
                  <Link
                    to="/$ownerName/$projectName/milestone/$milestoneId"
                    params={{ ownerName, projectName, milestoneId }}
                    search={{ state }}
                    hash="issues"
                    {...LEGACY_MILESTONE_LINK_PROPS}
                  >
                    {t(`issue.state.${state}`)}
                    <span className="num-badge">
                      {state === "open"
                        ? openIssues.length
                        : state === "closed"
                          ? closedIssues.length
                          : allIssues.length}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="issues">
              <div className="filter-wrap">
                <MassUpdateShell
                  allIssues={visibleIssues}
                  checkedIssueIds={checkedIssueIds}
                  currentUser={currentUser}
                  milestone={milestone}
                  onCheckedIssueIdsChange={setCheckedIssueIds}
                  projectPath={projectPath}
                  runtimeConfig={runtimeConfig}
                  viewerIsProjectMember={viewerIsProjectMember}
                />
                <div className="pull-right search search-bar">
                  <input
                    ref={searchInputRef}
                    name="filter"
                    className="textbox"
                    type="text"
                    placeholder={t("milestone.searchPlaceholder")}
                    value={filter}
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
                    checked={checkedIssueIds.includes(
                      stringField(issue.id, stringField(issue.issueNumber)),
                    )}
                    currentUserLoginId={currentUser.loginId}
                    filter={filter}
                    issue={issue}
                    onCheckedChange={(issueId, checked) => {
                      setCheckedIssueIds((currentIds) =>
                        checked
                          ? Array.from(new Set([...currentIds, issueId]))
                          : currentIds.filter((currentId) => currentId !== issueId),
                      );
                    }}
                    onTitlePrefixSearch={applyTitlePrefixFilter}
                    milestoneId={milestoneId}
                    ownerName={ownerName}
                    projectName={projectName}
                    projectPath={projectPath}
                    runtimeConfig={runtimeConfig}
                    viewerIsProjectMember={viewerIsProjectMember}
                  />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div
        id="deleteConfirm"
        className={deleteConfirmOpen ? "modal hide fade in" : "modal hide fade"}
        style={
          deleteConfirmOpen
            ? { display: "block" }
            : deleteConfirmWasShown
              ? { display: "none" }
              : undefined
        }
        aria-hidden={deleteConfirmOpen ? false : deleteConfirmWasShown ? true : undefined}
      >
        <div className="modal-header">
          <button
            type="button"
            className="close"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setDeleteConfirmOpen(false);
            }}
          >
            ×
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
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              deleteMutation.mutate();
            }}
          >
            {t("button.yes")}
          </button>
          <button
            type="button"
            className="ybtn"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setDeleteConfirmOpen(false);
            }}
          >
            {t("button.no")}
          </button>
        </div>
      </div>
      {deleteConfirmOpen ? <div className="modal-backdrop fade in"></div> : null}
    </div>
  );
}

function MassUpdateShell({
  allIssues,
  checkedIssueIds,
  currentUser,
  milestone,
  onCheckedIssueIdsChange,
  projectPath,
  runtimeConfig,
  viewerIsProjectMember,
}: {
  allIssues: ProjectMilestoneIssue[];
  checkedIssueIds: string[];
  currentUser: { avatarUrl: string; id: string; label: string; loginId: string };
  milestone: ProjectMilestone;
  onCheckedIssueIdsChange: (issueIds: string[]) => void;
  projectPath: string;
  runtimeConfig: RuntimeConfig;
  viewerIsProjectMember: boolean;
}) {
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const { ownerName, projectName, milestoneId } = Route.useParams();
  const effectiveCheckedIssueIds = viewerIsProjectMember ? checkedIssueIds : [];
  const issueIds = viewerIsProjectMember
    ? allIssues.map((issue) => stringField(issue.id, stringField(issue.issueNumber)))
    : [];
  const selectedIssues = allIssues.filter((issue) =>
    effectiveCheckedIssueIds.includes(stringField(issue.id, stringField(issue.issueNumber))),
  );
  const allChecked = issueIds.length > 0 && effectiveCheckedIssueIds.length === issueIds.length;
  const hasCheckedIssues = effectiveCheckedIssueIds.length > 0;
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const labels = projectIssueLabelOptions(recordArray(milestone.projectLabels), allIssues);
  const openMilestones = projectMilestoneOptions(
    recordArray(milestone.openMilestones).length
      ? (recordArray(milestone.openMilestones) as ProjectMilestone[])
      : stringField(milestone.state) === "open"
        ? [milestone]
        : [],
  );
  const users = projectAssignableUserOptions(
    recordArray(milestone.assignableUsers),
    allIssues,
    viewerIsProjectMember ? currentUser : undefined,
  );
  const toggleDropdown = (id: string, disabled: boolean) => {
    if (disabled) {
      return;
    }
    setOpenDropdownId((currentId) => (currentId === id ? null : id));
  };
  const closeDropdown = () => {
    setOpenDropdownId(null);
  };
  const stateMassUpdateMutation = useMutation({
    mutationFn: async ({
      issueNumbers,
      state,
    }: {
      issueNumbers: number[];
      state: "CLOSED" | "OPEN";
    }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return massUpdateIssues(runtimeConfig, csrfToken, {
        issueNumbers,
        ownerName,
        projectName,
        state,
      });
    },
    onSuccess() {
      onCheckedIssueIdsChange([]);
      void queryClient.invalidateQueries({
        queryKey: ["project", ownerName, projectName, "milestones", Number(milestoneId)],
      });
      void queryClient.invalidateQueries({
        queryKey: ["project", ownerName, projectName, "milestones"],
      });
    },
  });
  useEffect(() => {
    if (!hasCheckedIssues) {
      closeDropdown();
    }
  }, [hasCheckedIssues]);
  const submitMassUpdateState = (value: string) => {
    closeDropdown();
    if (!viewerIsProjectMember || !hasCheckedIssues) {
      return;
    }
    const normalizedState = value.toLowerCase();
    if (
      selectedIssues.length > 0 &&
      selectedIssues.every((issue) => stringField(issue.state).toLowerCase() === normalizedState)
    ) {
      return;
    }

    const issueNumbers: number[] = [];
    for (const issue of selectedIssues) {
      const issueNumber = Number(stringField(issue.issueNumber, "0"));
      if (issueNumber > 0) {
        issueNumbers.push(issueNumber);
      }
    }
    if (issueNumbers.length === 0) {
      return;
    }

    stateMassUpdateMutation.mutate({
      issueNumbers,
      state: value === "CLOSED" ? "CLOSED" : "OPEN",
    });
  };
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
            <input
              type="checkbox"
              id="check-all"
              checked={allChecked}
              onChange={(event) => {
                onCheckedIssueIdsChange(event.currentTarget.checked ? issueIds : []);
              }}
            />
          </label>
        </div>
        <MassUpdateDropdown
          disabled={!hasCheckedIssues}
          id="state"
          label={t("issue.update.state")}
          name="state"
          onClose={closeDropdown}
          onSelect={submitMassUpdateState}
          onToggle={toggleDropdown}
          open={openDropdownId === "state"}
          options={[
            { label: t("issue.state.open"), value: "OPEN" },
            { label: t("issue.state.closed"), value: "CLOSED" },
          ]}
        />
        <div
          id="assignee"
          className={`btn-group${openDropdownId === "assignee" ? " open" : ""}`}
          data-name="assignee.id"
        >
          <button
            type="button"
            className="btn dropdown-toggle medium"
            disabled={!hasCheckedIssues}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleDropdown("assignee", !hasCheckedIssues);
            }}
          >
            <span className="d-label">{t("issue.update.assignee.id")}</span>
            <span className="d-caret">
              <span className="caret"></span>
            </span>
          </button>
          <ul className="dropdown-menu mass-update-list">
            <li data-value="0">
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  closeDropdown();
                }}
              >
                {t("issue.noAssignee")}
              </button>
            </li>
            {viewerIsProjectMember && currentUser.id ? (
              <li data-value={currentUser.id}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    closeDropdown();
                  }}
                >
                  {t("issue.assignToMe")}
                </button>
              </li>
            ) : null}
            {users.length ? <li className="divider"></li> : null}
            {users.map((user) => (
              <li data-value={user.id} key={user.id}>
                <button
                  type="button"
                  className="usf-group"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    closeDropdown();
                  }}
                >
                  <span className="avatar-wrap smaller">
                    <img src={normalizedAvatarUrl(user.avatarUrl)} width="20" height="20" alt="" />
                  </span>
                  <strong className="name">{user.label}</strong>
                  <span className="loginid">
                    {" "}
                    <strong>@</strong>
                    {user.loginId}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        {openMilestones.length ? (
          <MassUpdateDropdown
            disabled={!hasCheckedIssues}
            id="milestone"
            label={t("issue.update.milestone.id")}
            name="milestone.id"
            onClose={closeDropdown}
            onToggle={toggleDropdown}
            open={openDropdownId === "milestone"}
            options={[
              { label: t("issue.noMilestone"), value: "-1" },
              { divider: true, value: "__divider" },
              ...openMilestones.map((openMilestone) => ({
                label: stringField(openMilestone.title),
                value: stringField(openMilestone.id),
              })),
            ]}
          />
        ) : null}
        {labels.length ? (
          <>
            <LabelMassUpdateDropdown
              disabled={!hasCheckedIssues}
              id="attaching-label"
              label={t("issue.update.attachLabel")}
              listId="attach-label-list"
              name="attachingLabelIds"
              onClose={closeDropdown}
              onToggle={toggleDropdown}
              open={openDropdownId === "attaching-label"}
              options={labels}
            />
            <LabelMassUpdateDropdown
              disabled={!hasCheckedIssues}
              id="detaching-label"
              label={t("issue.update.detachLabel")}
              listId="delete-label-list"
              name="detachingLabelIds"
              onClose={closeDropdown}
              onToggle={toggleDropdown}
              open={openDropdownId === "detaching-label"}
              options={labels}
            />
          </>
        ) : null}
      </form>
    </div>
  );
}

function MassUpdateDropdown({
  disabled,
  id,
  label,
  name,
  onClose,
  onSelect,
  onToggle,
  open,
  options,
}: {
  disabled: boolean;
  id: string;
  label: string;
  name: string;
  onClose: () => void;
  onSelect?: (value: string) => void;
  onToggle: (id: string, disabled: boolean) => void;
  open: boolean;
  options: Array<{ divider?: boolean; label?: string; value: string }>;
}) {
  return (
    <div id={id} className={`btn-group${open ? " open" : ""}`} data-name={name}>
      <button
        type="button"
        className="btn dropdown-toggle medium"
        disabled={disabled}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggle(id, disabled);
        }}
      >
        <span className="d-label">{label}</span>
        <span className="d-caret">
          <span className="caret"></span>
        </span>
      </button>
      <ul className="dropdown-menu mass-update-list">
        {options.map((option) =>
          option.divider ? (
            <li className="divider" key={option.value}></li>
          ) : (
            <li data-value={option.value} key={option.value}>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (onSelect) {
                    onSelect(option.value);
                    return;
                  }
                  onClose();
                }}
              >
                {option.label}
              </button>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function LabelMassUpdateDropdown({
  disabled,
  id,
  label,
  listId,
  name,
  onClose,
  onToggle,
  open,
  options,
}: {
  disabled: boolean;
  id: string;
  label: string;
  listId: string;
  name: string;
  onClose: () => void;
  onToggle: (id: string, disabled: boolean) => void;
  open: boolean;
  options: Array<{
    categoryId: string;
    categoryName: string;
    color?: string;
    id: string;
    name: string;
  }>;
}) {
  return (
    <div id={id} className={`btn-group${open ? " open" : ""}`} data-name={name}>
      <button
        type="button"
        className="btn dropdown-toggle medium"
        disabled={disabled}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggle(id, disabled);
        }}
      >
        <span className="d-label">{label}</span>
        <span className="d-caret">
          <span className="caret"></span>
        </span>
      </button>
      <ul id={listId} className="dropdown-menu mass-update-list">
        {groupLabels(options).map((group) => (
          <LabelMassUpdateGroup group={group} key={group.categoryId} onClose={onClose} />
        ))}
      </ul>
    </div>
  );
}

function LabelMassUpdateGroup({
  group,
  onClose,
}: {
  group: {
    categoryId: string;
    categoryName: string;
    labels: Array<{ color?: string; id: string; name: string }>;
  };
  onClose: () => void;
}) {
  return (
    <>
      <li className="disabled" data-category={group.categoryId}>
        <span>{group.categoryName}</span>
      </li>
      {group.labels.map((label) => (
        <li data-value={label.id} data-category={group.categoryId} key={label.id}>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }}
          >
            <span className="issue-label active list-label" data-label-id={label.id}>
              {label.name}
            </span>
          </button>
        </li>
      ))}
      <li className="divider" data-category={group.categoryId}></li>
    </>
  );
}

function MilestoneIssueRow({
  checked,
  currentUserLoginId,
  filter,
  issue,
  milestoneId,
  onCheckedChange,
  onTitlePrefixSearch,
  ownerName,
  projectName,
  projectPath,
  runtimeConfig,
  viewerIsProjectMember,
}: {
  checked: boolean;
  currentUserLoginId: string;
  filter: string;
  issue: ProjectMilestoneIssue;
  milestoneId: string;
  onCheckedChange: (issueId: string, checked: boolean) => void;
  onTitlePrefixSearch: (filter: string) => void;
  ownerName: string;
  projectName: string;
  projectPath: string;
  runtimeConfig: RuntimeConfig;
  viewerIsProjectMember: boolean;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const issueId = stringField(issue.id, stringField(issue.issueNumber));
  const issueNumber = stringField(issue.issueNumber, issueId);
  const title = stringField(issue.title);
  const state = stringField(issue.state);
  const issueHref = prefixBasePath(runtimeConfig.basePath, `${projectPath}/issue/${issueNumber}`);
  const authorLoginId = stringField(issue.authorLoginId);
  const authorLabel = stringField(issue.authorLabel);
  const assigneeLoginId = stringField(issue.assigneeLoginId);
  const createdLabel = stringField(issue.createdLabel, stringField(issue.updatedLabel));
  const issueWeight = numberField(issue.weight);
  const titleParts = splitHeaderWordsInBrackets(title);
  const normalizedFilter = filter.toLowerCase().trim();
  const hidden = normalizedFilter.length > 0 && !issueSearchText(issue).includes(normalizedFilter);
  const labels = sortedIssueLabels(issue);
  const issueItemRowAttrs = {
    htmlFor: `issue-${issueId}`,
  } satisfies LegacyIssueItemRowAttrs;
  const issueListItemAttrs = {
    href: issueHref,
  } satisfies LegacyIssueListItemAttrs;
  const dueDateAttrs =
    state === "open"
      ? {
          "data-placement": "top",
          title: stringField(issue.dueDateLabel),
        }
      : {};

  return (
    <li
      className="post-item title"
      id={`issue-item-${issueId}`}
      data-item="issue-item"
      data-value={`${stringField(issue.authorLoginId)} ${issueNumber} ${title}`}
      style={hidden ? { display: "none" } : undefined}
      {...issueListItemAttrs}
    >
      <div className="span9 span-hard-wrap">
        {viewerIsProjectMember ? (
          <label
            htmlFor={`issue-${issueId}`}
            className="mass-update-check hide-in-mobile"
            aria-label={`issue-${issueId}`}
          >
            <input
              id={`issue-${issueId}`}
              type="checkbox"
              name="checked-issue"
              data-issue-id={issueId}
              data-issue-labels={issueLabelData(labels)}
              checked={checked}
              onChange={(event) => {
                onCheckedChange(issueId, event.currentTarget.checked);
              }}
            />
          </label>
        ) : null}
        <div {...issueItemRowAttrs} className="issue-item-row">
          <div className="title-wrap">
            <Link
              to="/$ownerName/$projectName/issue/$issueNumber"
              params={{ ownerName, projectName, issueNumber }}
              className="title"
            >
              <span className="post-id">#{issueNumber}</span>
            </Link>
            {issueWeight > 0 ? (
              <span
                className="weight-up-arrow"
                data-placement="right"
                title={`${t("issue.weight")} ${issueWeight}`}
              >
                <i className="yobicon-angle-circled-up"></i>
              </span>
            ) : null}
            {issueWeight < 0 ? (
              <span
                className="weight-down-arrow"
                data-placement="right"
                title={`${t("issue.weight")} ${issueWeight}`}
              >
                <i className="yobicon-angle-circled-down"></i>
              </span>
            ) : null}
            {titleParts.prefixes.map((prefix) => (
              <button
                type="button"
                className="title-prefix"
                key={`${issueId}-${prefix}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onTitlePrefixSearch(prefix);
                }}
              >
                {prefix}
              </button>
            ))}
            <Link
              to="/$ownerName/$projectName/issue/$issueNumber"
              params={{ ownerName, projectName, issueNumber }}
              className="title"
            >
              {titleParts.title}
            </Link>
          </div>
          <div className="infos">
            {authorLabel && authorLoginId ? (
              <Link
                to="/$user"
                params={{ user: authorLoginId }}
                className="infos-item infos-link-item"
                data-placement="bottom"
                title={authorLoginId}
              >
                {authorLabel}
              </Link>
            ) : (
              <span className="infos-item">{t("issue.noAuthor")}</span>
            )}
            <span className="infos-item" data-placement="bottom" title={createdLabel}>
              {createdLabel}
            </span>
            <IssueSubtaskSummary issue={issue} ownerName={ownerName} projectName={projectName} />
            {stringField(issue.milestoneId) ? (
              <span className="mileston-tag">
                <Link
                  to="/$ownerName/$projectName/milestone/$milestoneId"
                  params={{ ownerName, projectName, milestoneId: stringField(issue.milestoneId) }}
                  {...LEGACY_MILESTONE_LINK_PROPS}
                  data-placement="bottom"
                  title={t("milestone")}
                >
                  {stringField(issue.milestoneTitle)}
                </Link>
              </span>
            ) : null}
            {numberField(issue.commentCount) ||
            numberField(issue.voterCount) ||
            numberField(issue.sharerCount) ? (
              <span className="infos-item item-count-groups">
                {numberField(issue.commentCount) ? (
                  <Link
                    to="/$ownerName/$projectName/issue/$issueNumber"
                    params={{ ownerName, projectName, issueNumber }}
                    hash="comments"
                    className="comments-count comments-count-color"
                  >
                    <span className="count-groups item-icon">
                      <i className="yobicon-comment2"></i>
                    </span>
                    <span className="count-groups item-count">
                      {numberField(issue.commentCount)}
                    </span>
                  </Link>
                ) : null}
                {numberField(issue.voterCount) ? (
                  <Link
                    to="/$ownerName/$projectName/issue/$issueNumber"
                    params={{ ownerName, projectName, issueNumber }}
                    hash="vote"
                    className="vote-count vote-color"
                  >
                    <span className="count-groups item-icon">
                      <i className="yobicon-hearts"></i>
                    </span>
                    <span className="count-groups item-count strong">
                      {numberField(issue.voterCount)}
                    </span>
                  </Link>
                ) : null}
                {numberField(issue.sharerCount) ? (
                  <button
                    type="button"
                    className="sharer-color"
                    data-placement="bottom"
                    title={t("issue.sharer")}
                  >
                    <span className="count-groups item-icon">
                      <i className="yobicon-friends"></i>
                    </span>
                    <span className="count-groups item-count strong">
                      {numberField(issue.sharerCount)}
                    </span>
                  </button>
                ) : null}
              </span>
            ) : null}
            {labels.map((label) => (
              <button
                type="button"
                key={stringField(label.id)}
                className="label issue-label list-label active"
                data-category-id={stringField(label.categoryId)}
                data-label-id={stringField(label.id)}
                style={{ background: cssBackgroundColor(stringField(label.color)) }}
                onClick={() => {
                  void router.navigate({
                    to: legacyProjectIssuesHref(ownerName, projectName, {
                      labelIds: [stringField(label.id)],
                      milestoneId,
                    }),
                  });
                }}
              >
                {stringField(label.name)}
              </button>
            ))}
            <div className="child-issue-list hide">
              <MilestoneIssueChildRows
                childIssues={issue.childIssues}
                currentUserLoginId={currentUserLoginId}
                ownerName={ownerName}
                parentIssueId={issueId}
                projectName={projectName}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="span3 hide-in-mobile">
        <div className="mt5 pull-right">
          {assigneeLoginId ? (
            <Link
              to="/$user"
              params={{ user: assigneeLoginId }}
              className="avatar-wrap assinee"
              data-placement="top"
              title={`${t("issue.assignee")}: ${stringField(issue.assigneeLabel)}`}
            >
              <img
                src={stringField(issue.assigneeAvatarUrl, "/assets/images/default-avatar-32.png")}
                width="32"
                height="32"
                alt={stringField(issue.assigneeLabel)}
              />
            </Link>
          ) : (
            <div className="empty-avatar-wrap">&nbsp;</div>
          )}
        </div>
        {stringField(issue.dueDateLabel) ? (
          <div
            className={`mr20 mt10 pull-right${
              state === "closed"
                ? " darkgray-txt"
                : booleanField(issue.dueDateOverdue)
                  ? " overdue"
                  : ""
            }`}
            {...dueDateAttrs}
          >
            <i className="yobicon-clock2 mr3 vmiddle"></i>
            <span className="vmiddle">
              {state === "open" && booleanField(issue.dueDateOverdue)
                ? t("issue.dueDate.overdue")
                : state === "open"
                  ? stringField(issue.dueDateText, stringField(issue.dueDateLabel))
                  : stringField(issue.dueDateLabel)}
            </span>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function issueSearchText(issue: ProjectMilestoneIssue) {
  return [
    stringField(issue.issueNumber),
    stringField(issue.title),
    stringField(issue.authorLoginId),
  ]
    .join(" ")
    .toLowerCase();
}

function IssueSubtaskSummary({
  issue,
  ownerName,
  projectName,
}: {
  issue: ProjectMilestoneIssue;
  ownerName: string;
  projectName: string;
}) {
  const childClosedCount = numberField(issue.childClosedCount);
  const childOpenCount = numberField(issue.childOpenCount);
  const childTotalCount = childClosedCount + childOpenCount;
  const percentage = childTotalCount ? Math.trunc((childClosedCount / childTotalCount) * 100) : 0;
  const parentIssueNumber = stringField(issue.parentIssueNumber);
  const parentIssueTitle = stringField(issue.parentIssueTitle);

  return (
    <>
      {childTotalCount ? (
        <>
          <div
            className={`subtask-progress upload-progress ${
              percentage === 100 ? "done-outline" : "red-outline"
            }`}
          >
            <div
              className={`bar ${percentage === 100 ? "done" : "red"}`}
              style={{ width: `${percentage}%` }}
              title="Subtask"
            ></div>
          </div>
          <span
            className={`subtask-progress completion-ratio${percentage === 100 ? " txt-green" : ""}`}
          >
            {percentage === 100 ? "" : `${childClosedCount}/`}
            {childTotalCount}
          </span>
        </>
      ) : null}
      {parentIssueNumber ? (
        <span className="infos-item subtask">
          <Link
            to="/$ownerName/$projectName/issue/$issueNumber"
            params={{ ownerName, projectName, issueNumber: parentIssueNumber }}
          >
            {`#${parentIssueNumber} ${truncateParentIssueTitle(parentIssueTitle)}`}
          </Link>
        </span>
      ) : null}
    </>
  );
}

function MilestoneIssueChildRows({
  childIssues,
  currentUserLoginId,
  ownerName,
  parentIssueId,
  projectName,
}: {
  childIssues: unknown;
  currentUserLoginId: string;
  ownerName: string;
  parentIssueId: string;
  projectName: string;
}) {
  const visibleChildIssues = recordArray(childIssues).filter(
    (childIssue) =>
      !booleanField(childIssue.isDraft) ||
      stringField(childIssue.authorLoginId) === currentUserLoginId,
  );
  const openChildIssues = visibleChildIssues.filter(
    (childIssue) => stringField(childIssue.state) !== "closed",
  );
  const closedChildIssues = visibleChildIssues.filter(
    (childIssue) => stringField(childIssue.state) === "closed",
  );
  const orderedChildIssues = [...openChildIssues, ...closedChildIssues];
  if (!orderedChildIssues.length) {
    return null;
  }

  return (
    <div className="child-issues">
      {orderedChildIssues.map((childIssue) => (
        <MilestoneIssueChildRow
          childIssue={childIssue}
          key={`${stringField(childIssue.state)}-${stringField(childIssue.issueNumber)}`}
          ownerName={ownerName}
          parentIssueId={parentIssueId}
          projectName={projectName}
        />
      ))}
    </div>
  );
}

function MilestoneIssueChildRow({
  childIssue,
  ownerName,
  parentIssueId,
  projectName,
}: {
  childIssue: Record<string, unknown>;
  ownerName: string;
  parentIssueId: string;
  projectName: string;
}) {
  const issueId = stringField(childIssue.id);
  const issueNumber = stringField(childIssue.issueNumber);
  const assigneeLabel = stringField(childIssue.assigneeLabel);
  const childIssueClassName =
    issueId && issueId === parentIssueId
      ? "issue-item selected-child child-issue"
      : "issue-item child-issue";
  const childIssueParams = { ownerName, projectName, issueNumber };
  const childIssueLabels = recordArray(childIssue.labels)
    .map((label) => ({
      categoryId: stringField(label.categoryId),
      color: stringField(label.color),
      id: stringField(label.id),
      name: stringField(label.name),
    }))
    .sort((left, right) => compareIssueLabels(left, right));

  return (
    <div className={childIssueClassName}>
      <span
        className={`state-label ${stringField(childIssue.state) === "closed" ? "closed" : "open"}`}
      >
        {stringField(childIssue.state) === "closed" ? <i className=" yobicon-checkmark"></i> : null}
      </span>
      <Link
        to="/$ownerName/$projectName/issue/$issueNumber"
        params={childIssueParams}
        className="twoColumeModeTarget"
      >
        <span className="item-name">
          <span className="subtask-number">
            {booleanField(childIssue.isDraft) ? (
              <span className="draft-number">#Draft</span>
            ) : (
              `#${issueNumber}`
            )}
          </span>
          <span>{stringField(childIssue.title)}</span>
          <span>{assigneeLabel ? ` - ${assigneeLabel}` : ""}</span>
        </span>
      </Link>
      <span className="font12 no-border-at-child">
        <MilestoneIssueChildCommentAndVotePair
          commentCount={numberField(childIssue.commentCount)}
          issueNumber={issueNumber}
          ownerName={ownerName}
          projectName={projectName}
          voterCount={numberField(childIssue.voterCount)}
        />
      </span>
      {childIssueLabels.map((label) => (
        <Link
          to={legacyProjectIssuesHref(ownerName, projectName, {
            labelIds: [label.id],
            state: "open",
          })}
          className="label issue-label list-label active twoColumeModeTarget"
          data-category-id={label.categoryId}
          data-label-id={label.id}
          key={label.id}
          style={label.color ? { background: cssBackgroundColor(label.color) } : undefined}
        >
          {label.name}
        </Link>
      ))}
      <span className="child-issue-date" title={stringField(childIssue.createdLabel)}>
        {stringField(childIssue.createdLabel)}
      </span>
    </div>
  );
}

function MilestoneIssueChildCommentAndVotePair({
  commentCount,
  issueNumber,
  ownerName,
  projectName,
  voterCount,
}: {
  commentCount: number;
  issueNumber: string;
  ownerName: string;
  projectName: string;
  voterCount: number;
}) {
  if (!commentCount && !voterCount) {
    return null;
  }

  const childIssueParams = { ownerName, projectName, issueNumber };
  return (
    <span className="item-count-groups">
      {commentCount ? (
        <Link
          to="/$ownerName/$projectName/issue/$issueNumber"
          params={childIssueParams}
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
          to="/$ownerName/$projectName/issue/$issueNumber"
          params={childIssueParams}
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

function sortedIssueLabels(issue: ProjectMilestoneIssue) {
  return (issue.labels ?? []).slice().sort(compareIssueLabels);
}

function compareIssueLabels(
  left: { categoryName?: unknown; name: string },
  right: { categoryName?: unknown; name: string },
) {
  const categoryOrder = stringField(left.categoryName).localeCompare(
    stringField(right.categoryName),
  );
  return categoryOrder || left.name.localeCompare(right.name);
}

function issueLabelData(labels: YonaLabel[]) {
  return labels
    .map((label) =>
      [
        stringField(label.categoryName),
        stringField(label.id),
        stringField(label.name),
        stringField(label.categoryId),
        String(booleanField(label.categoryIsExclusive)),
      ].join(","),
    )
    .join("|")
    .concat(labels.length ? "|" : "");
}

function projectMilestoneOptions(milestones: ProjectMilestone[]) {
  const options = [];
  for (const milestone of milestones) {
    const id = stringField(milestone.id);
    const title = stringField(milestone.title);
    if (id && title) {
      options.push({ id, title });
    }
  }
  return options;
}

function projectIssueLabelOptions(
  labels: Array<Record<string, unknown>>,
  issues: ProjectMilestoneIssue[],
) {
  const projectLabels = labels.flatMap((label) => {
    const id = stringField(label.id);
    const name = stringField(label.name);
    return id && name
      ? [
          {
            categoryId: stringField(label.categoryId),
            categoryName: stringField(label.categoryName, stringField(label.category)),
            color: stringField(label.color),
            id,
            name,
          },
        ]
      : [];
  });
  projectLabels.sort(compareIssueLabels);
  return projectLabels.length > 0 ? projectLabels : uniqueLabels(issues);
}

function uniqueLabels(issues: ProjectMilestoneIssue[]) {
  const labels = new Map<
    string,
    { categoryId: string; categoryName: string; color?: string; id: string; name: string }
  >();
  for (const issue of issues) {
    for (const label of issue.labels ?? []) {
      const id = stringField(label.id);
      if (id && !labels.has(id)) {
        labels.set(id, {
          categoryId: stringField(label.categoryId),
          categoryName: stringField(label.categoryName),
          color: stringField(label.color),
          id,
          name: stringField(label.name),
        });
      }
    }
  }
  return Array.from(labels.values()).sort(compareIssueLabels);
}

function groupLabels(
  labels: Array<{
    categoryId: string;
    categoryName: string;
    color?: string;
    id: string;
    name: string;
  }>,
) {
  const groups = new Map<
    string,
    {
      categoryId: string;
      categoryName: string;
      labels: Array<{ color?: string; id: string; name: string }>;
    }
  >();
  for (const label of labels) {
    const group = groups.get(label.categoryId) ?? {
      categoryId: label.categoryId,
      categoryName: label.categoryName,
      labels: [],
    };
    group.labels.push({ color: label.color, id: label.id, name: label.name });
    groups.set(label.categoryId, group);
  }
  return Array.from(groups.values());
}

function projectAssignableUserOptions(
  assignableUsers: Array<Record<string, unknown>>,
  issues: ProjectMilestoneIssue[],
  currentUser?: { avatarUrl: string; id: string; label: string; loginId: string },
) {
  const users = new Map<
    string,
    { avatarUrl: string; id: string; label: string; loginId: string }
  >();
  if (currentUser) {
    addUser(users, currentUser);
  }
  for (const item of assignableUsers) {
    addUser(users, {
      avatarUrl: normalizedAvatarUrl(item.avatarUrl),
      id: stringField(item.userId, stringField(item.id)),
      label: stringField(item.displayName, stringField(item.userLabel, stringField(item.loginId))),
      loginId: stringField(item.loginId),
    });
  }
  for (const issue of issues) {
    addUser(users, {
      avatarUrl: normalizedAvatarUrl(issue.assigneeAvatarUrl),
      id: stringField(issue.assigneeUserId),
      label: stringField(issue.assigneeLabel),
      loginId: stringField(issue.assigneeLoginId),
    });
    addUser(users, {
      avatarUrl: normalizedAvatarUrl(issue.authorAvatarUrl),
      id: stringField(issue.authorUserId),
      label: stringField(issue.authorLabel),
      loginId: stringField(issue.authorLoginId),
    });
  }
  return Array.from(users.values());
}

function isProjectMember(
  projectMembers: Array<Record<string, unknown>>,
  assignableUsers: Array<Record<string, unknown>>,
  currentUser: { id: string; loginId: string },
) {
  return (
    projectMembers.some((member) => sameUser(member, currentUser)) ||
    assignableUsers.some((member) => sameUser(member, currentUser))
  );
}

function sameUser(user: Record<string, unknown>, currentUser: { id: string; loginId: string }) {
  const userId = stringField(user.userId, stringField(user.id));
  const loginId = stringField(user.loginId);
  return (
    (currentUser.id.length > 0 && userId === currentUser.id) ||
    (currentUser.loginId.length > 0 && loginId === currentUser.loginId)
  );
}

function addUser(
  users: Map<string, { avatarUrl: string; id: string; label: string; loginId: string }>,
  user: { avatarUrl: string; id: string; label: string; loginId: string },
) {
  if (user.id && user.loginId && !users.has(user.id)) {
    users.set(user.id, {
      avatarUrl: user.avatarUrl || "/assets/images/default-avatar-32.png",
      id: user.id,
      label: user.label || user.loginId,
      loginId: user.loginId,
    });
  }
}

function normalizedAvatarUrl(value: unknown) {
  const avatarUrl = stringField(value).trim();
  return avatarUrl || "/assets/images/default-avatar-32.png";
}

function recordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object",
      )
    : [];
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

function splitHeaderWordsInBrackets(title: string) {
  const prefixes: string[] = [];
  const pattern = /^\s*(\[[^\]]+\])/u;
  let rest = title;
  while (true) {
    const match = pattern.exec(rest);
    if (!match) {
      break;
    }
    prefixes.push(match[1].trim());
    rest = rest.slice(match[0].length);
  }
  const onlyPrefixes = rest.trim() === "";
  return {
    prefixes: onlyPrefixes ? [] : prefixes,
    title: onlyPrefixes ? title : rest.trimStart(),
  };
}

function truncateParentIssueTitle(title: string) {
  const trimmed = title.slice(0, 10).trim();
  return title.length > 10 ? `${trimmed}...` : trimmed;
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

function legacyProjectIssuesHref(
  ownerName: string,
  projectName: string,
  query: {
    labelIds?: string[];
    milestoneId?: string;
    state?: "all" | "closed" | "open";
  },
) {
  const queryParts: string[] = [];
  if (query.state) {
    queryParts.push(`state=${encodeURIComponent(query.state)}`);
  }
  for (const labelId of query.labelIds ?? []) {
    queryParts.push(`labelIds=${encodeURIComponent(labelId)}`);
  }
  if (query.milestoneId) {
    queryParts.push(`milestoneId=${encodeURIComponent(query.milestoneId)}`);
  }
  return `/${ownerName}/${projectName}/issues?${queryParts.join("&")}`;
}
