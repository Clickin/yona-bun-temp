import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useRouter } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import type { HTMLAttributes } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import defaultAvatarUrl from "../../../../assets/legacy/default-avatar-64.png";
import { LastOutletTransition } from "../../../-last-outlet-transition";
import { readProjectContainerQueryOptions } from "../../../../api/org-project";
import { currentSessionQueryOptions } from "../../../../api/session";
import type {
  ProjectContainer,
  ProjectMilestone,
  ProjectMilestoneIssue,
  YoramLabel,
} from "../../../../api/types";
import {
  closeProjectMilestone,
  deleteProjectMilestone,
  massUpdateIssues,
  openProjectMilestone,
  readProjectMilestone,
  readSessionBootstrap,
} from "../../../../auth-workspace-client";
import { useLegacyMessages } from "../../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../../runtime-config";
import { styles } from "./-milestone-detail.stylex";

const sx = {
  page: stylex.props(styles.page),
  wrap: stylex.props(styles.wrap),
  progress: stylex.props(styles.progress),
  progressBar: (width: string) => stylex.props(styles.progressBar(width)),
  description: stylex.props(styles.description),
  actions: stylex.props(styles.actions),
  tabs: stylex.props(styles.tabs),
  tabBadge: stylex.props(styles.tabBadge),
  issueList: stylex.props(styles.issueList),
  issueRow: stylex.props(styles.issueRow),
  issueMeta: stylex.props(styles.issueMeta),
  massUpdate: stylex.props(styles.massUpdate),
  search: stylex.props(styles.search),
  deleteModalVisible: stylex.props(styles.deleteModalVisible),
  deleteModalHidden: stylex.props(styles.deleteModalHidden),
} as const;

type LegacyIssueListItemAttrs = HTMLAttributes<HTMLLIElement> & { href: string };
type LegacyIssueItemRowAttrs = {
  htmlFor: string;
};

type MilestoneDetailSearch = {
  state?: "all" | "closed" | "open";
};

const LEGACY_MILESTONE_LINK_PROPS = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};
type LegacyTranslate = ReturnType<typeof useLegacyMessages>["t"];

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
  return <LastOutletTransition routeId={Route.id} />;
}

export function ProjectMilestoneDetailIndexScreen({
  runtimeConfig,
}: {
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName, milestoneId } = Route.useParams();
  const numericMilestoneId = Number(milestoneId) || 0;
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const sessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));
  const milestoneQuery = useQuery({
    queryFn: () => readProjectMilestone(runtimeConfig, ownerName, projectName, numericMilestoneId),
    queryKey: ["project", ownerName, projectName, "milestones", numericMilestoneId],
    retry(failureCount, error) {
      return restApiErrorStatus(error) !== 404 && failureCount < 3;
    },
    retryOnMount: false,
  });

  if (!projectQuery.data) {
    return null;
  }

  const milestoneNotFound =
    restApiErrorStatus(milestoneQuery.error) === 404 ||
    (milestoneQuery.isSuccess && !milestoneQuery.data?.milestone);

  if (milestoneNotFound) {
    return (
      <>
        <ProjectMilestoneNotFoundTitle ownerName={ownerName} projectName={projectName} />
        <ProjectMilestoneNotFoundBody />
      </>
    );
  }

  if (milestoneQuery.isPending || !milestoneQuery.data?.milestone) {
    return null;
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

  const detailContent = (
    <>
      <ProjectMilestoneDetailTitle
        milestoneTitle={stringField(milestoneQuery.data.milestone.title)}
        ownerName={ownerName}
        projectName={projectName}
      />
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
    </>
  );

  return detailContent;
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

export function ProjectMilestoneNotFoundTitle({
  ownerName,
  projectName,
}: {
  ownerName: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();

  return <title>{`${t("error.notfound")} - ${ownerName}/${projectName}`}</title>;
}

export function ProjectMilestoneNotFoundBody() {
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
    <link
      rel="stylesheet"
      type="text/css"
      href={prefixBasePath(basePath, `${projectPath}/issue/labels.css`)}
    />
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
  const selectedState = search.state ?? "open";
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
  const openIssueCount = numberField(milestone.openIssueCount);
  const closedIssueCount = numberField(milestone.closedIssueCount);
  const visibleIssues =
    selectedState === "closed" ? closedIssues : selectedState === "all" ? allIssues : openIssues;
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
  const deleteModalStyleProps = deleteConfirmOpen
    ? sx.deleteModalVisible
    : deleteConfirmWasShown
      ? sx.deleteModalHidden
      : undefined;

  return (
    <div {...sx.page} data-stylex-owner="milestone-detail-page">
      <div data-stylex-owner="milestone-detail-shell">
        <div {...sx.wrap} data-stylex-owner="milestone-detail-wrap">
          <h4>
            <Link
              to="/$ownerName/$projectName/milestone/$milestoneId"
              params={{ ownerName, projectName, milestoneId }}
              search={{}}
              {...LEGACY_MILESTONE_LINK_PROPS}
              className="title"
            >
              {stringField(milestone.title)}
            </Link>{" "}
            <small className="ml10">
              {stringField(milestone.dueDateLabel) ? (
                <>
                  <span className="due-date">
                    {t("label.dueDate")} <strong>{stringField(milestone.dueDateLabel)}</strong>
                  </span>
                  {!isClosed ? (
                    <span className="date">
                      ({localizedMilestoneUntilLabel(stringField(milestone.untilLabel), t)})
                    </span>
                  ) : null}
                </>
              ) : null}
              <span className={`badge badge-issue-${isClosed ? "closed" : "open"} margin-left-5`}>
                {t(`milestone.state.${isClosed ? "closed" : "open"}`)}
              </span>
            </small>
          </h4>

          <div {...sx.progress} data-stylex-owner="milestone-detail-progress">
            <div
              {...sx.progressBar(`${completionPercent}%`)}
              data-stylex-owner="milestone-detail-progress-bar"
            ></div>
          </div>

          {stringField(milestone.contentsMarkdown) ? (
            <div
              className={`${sx.description.className} milestone-desc`}
              data-stylex-owner="milestone-detail-description"
            >
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
            className={`${sx.actions.className} actrow right-txt row-fluid`}
            data-stylex-owner="milestone-detail-actions"
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
            <ul {...sx.tabs} data-stylex-owner="milestone-detail-tabs">
              {(["open", "closed", "all"] as const).map((tabState) => (
                <li key={tabState} className={selectedState === tabState ? "active" : undefined}>
                  <Link
                    to="/$ownerName/$projectName/milestone/$milestoneId"
                    params={{ ownerName, projectName, milestoneId }}
                    search={{ state: tabState }}
                    hash="issues"
                    {...LEGACY_MILESTONE_LINK_PROPS}
                  >
                    {t(`issue.state.${tabState}`)}
                    <span {...sx.tabBadge}>
                      {tabState === "open"
                        ? openIssueCount
                        : tabState === "closed"
                          ? closedIssueCount
                          : openIssueCount + closedIssueCount}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="issues" data-stylex-owner="milestone-detail-issues">
              <div className="filter-wrap" data-stylex-owner="milestone-detail-filter">
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
                <div {...sx.search} data-stylex-owner="milestone-detail-search">
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
              <ul
                className={`${sx.issueList.className} post-list-wrap row-fluid`}
                data-stylex-owner="milestone-detail-issue-list"
              >
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
        {...deleteModalStyleProps}
        className={`${deleteConfirmOpen ? "modal hide fade in" : "modal hide fade"} ${deleteModalStyleProps?.className ?? ""}`.trim()}
        data-stylex-owner="milestone-detail-delete-modal"
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
  const labels = projectIssueLabelOptions(recordArray(milestone.projectLabels), []);
  const openMilestones = projectMilestoneOptions(
    recordArray(milestone.openMilestones) as ProjectMilestone[],
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
    <div
      className={`${sx.massUpdate.className} mass-update-wrap hide-in-mobile`}
      data-stylex-owner="milestone-detail-mass-update"
    >
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
                    <img
                      src={mountedAppLocalUrl(
                        runtimeConfig.basePath,
                        normalizedAvatarUrl(user.avatarUrl),
                      )}
                      width="20"
                      height="20"
                      alt=""
                    />
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
  const createdTitle = stringField(issue.createdTitle, createdLabel);
  const createdDisplayLabel = localizedIssueCreatedLabel(createdLabel, t);
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
          title: stringField(issue.dueDateLabel),
        }
      : {};

  return (
    <li
      className={`${sx.issueRow.className} post-item title`}
      data-stylex-owner="milestone-detail-issue-row"
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
        <div
          {...issueItemRowAttrs}
          className={`${sx.issueMeta.className} issue-item-row`}
          data-stylex-owner="milestone-detail-issue-meta"
        >
          <div className="title-wrap">
            <Link
              to="/$ownerName/$projectName/issue/$issueNumber"
              params={{ ownerName, projectName, issueNumber }}
              className="title"
            >
              <span className="post-id">#{issueNumber}</span>
            </Link>
            {issueWeight > 0 ? (
              <span className="weight-up-arrow" title={`${t("issue.weight")} ${issueWeight}`}>
                <i className="yobicon-angle-circled-up"></i>
              </span>
            ) : null}
            {issueWeight < 0 ? (
              <span className="weight-down-arrow" title={`${t("issue.weight")} ${issueWeight}`}>
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
                title={authorLoginId}
              >
                {authorLabel}
              </Link>
            ) : (
              <span className="infos-item">{t("issue.noAuthor")}</span>
            )}
            <span className="infos-item" title={createdTitle}>
              {createdDisplayLabel}
            </span>
            <IssueSubtaskSummary issue={issue} ownerName={ownerName} projectName={projectName} />
            {stringField(issue.milestoneId) ? (
              <span className="mileston-tag">
                <Link
                  to="/$ownerName/$projectName/milestone/$milestoneId"
                  params={{ ownerName, projectName, milestoneId: stringField(issue.milestoneId) }}
                  {...LEGACY_MILESTONE_LINK_PROPS}
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
                  <button type="button" className="sharer-color" title={t("issue.sharer")}>
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
            {labels.map((label) =>
              (() => {
                const labelColor = stylex.props(
                  styles.labelColor(cssBackgroundColor(stringField(label.color))),
                );
                return (
                  <button
                    type="button"
                    key={stringField(label.id)}
                    {...labelColor}
                    className={`${labelColor.className} label issue-label list-label active`}
                    data-category-id={stringField(label.categoryId)}
                    data-label-id={stringField(label.id)}
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
                );
              })(),
            )}
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
              title={`${t("issue.assignee")}: ${stringField(issue.assigneeLabel)}`}
            >
              <img
                src={mountedAppLocalUrl(
                  runtimeConfig.basePath,
                  normalizedAvatarUrl(issue.assigneeAvatarUrl),
                )}
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
                  ? localizedIssueDueDateText(
                      stringField(issue.dueDateText, stringField(issue.dueDateLabel)),
                      t,
                    )
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
  const progressStyle = stylex.props(styles.progressBar(`${percentage}%`));
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
              {...progressStyle}
              className={`${progressStyle.className} bar ${percentage === 100 ? "done" : "red"}`}
              data-stylex-owner="milestone-detail-subtask-progress-bar"
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
      {childIssueLabels.map((label) =>
        (() => {
          const labelColor = label.color
            ? stylex.props(styles.labelColor(cssBackgroundColor(label.color)))
            : undefined;
          return (
            <Link
              to={legacyProjectIssuesHref(ownerName, projectName, {
                labelIds: [label.id],
                state: "open",
              })}
              {...labelColor}
              className={`${labelColor?.className ?? ""} label issue-label list-label active twoColumeModeTarget`}
              data-category-id={label.categoryId}
              data-label-id={label.id}
              key={label.id}
            >
              {label.name}
            </Link>
          );
        })(),
      )}
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

function issueLabelData(labels: YoramLabel[]) {
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
      avatarUrl: user.avatarUrl || defaultAvatarUrl,
      id: user.id,
      label: user.label || user.loginId,
      loginId: user.loginId,
    });
  }
}

function normalizedAvatarUrl(value: unknown) {
  const avatarUrl = stringField(value).trim();
  return avatarUrl || defaultAvatarUrl;
}

function localizedMilestoneUntilLabel(value: string, t: LegacyTranslate) {
  const match = /^(\d+)\s+days?\s+(left|past)$/iu.exec(value.trim());
  if (!match) {
    return value;
  }
  return t(match[2]?.toLowerCase() === "past" ? "common.time.overday" : "common.time.leftday", {
    args: [match[1] ?? "0"],
  });
}

function localizedIssueCreatedLabel(value: string, t: LegacyTranslate, now = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return value;
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp) || timestamp > now) {
    return value;
  }
  const elapsedDays = Math.floor((now - timestamp) / (24 * 60 * 60 * 1000));
  return elapsedDays === 0
    ? t("common.time.today")
    : t(elapsedDays === 1 ? "common.time.day" : "common.time.days", { args: [elapsedDays] });
}

function localizedIssueDueDateText(value: string, t: LegacyTranslate) {
  const match = /^(\d+)\s+days?$/iu.exec(value.trim());
  return match ? t("common.time.default.day", { args: [match[1] ?? "0"] }) : value;
}

function mountedAppLocalUrl(basePath: string, url: string) {
  return /^\/(?:assets|images)\//u.test(url) ? prefixBasePath(basePath, url) : url;
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
  // ponytail: background style renders #rrggbb identically to rgb(); no consumer string-matches rgb, so use hex directly.
  const trimmed = value.trim();
  return /^#[0-9a-f]{6}$/iu.test(trimmed) ? trimmed : value;
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
