/* oxlint-disable jsx-a11y/prefer-tag-over-role -- legacy Select2/Bootstrap parity DOM intentionally keeps role-based controls. */
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useRouter } from "@tanstack/react-router";
import { codeHistoryQueryOptions, type CodeHistoryResponse } from "../../../api/code-commits";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import type { ProjectContainer } from "../../../api/types";
import { formatLegacyTimestamp, useLegacyMessages } from "../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { useRootToast } from "../../__root";

type ProjectCodeHistorySearch = {
  page?: number;
};

const legacyCodeHistoryLinkActiveOptions = {
  exact: true,
  explicitUndefined: true,
  includeHash: true,
  includeSearch: true,
} as const;
const legacyCodeHistoryLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};

export const Route = createFileRoute("/$ownerName/$projectName/commits")({
  component: ProjectCodeHistoryRoute,
  validateSearch(search): ProjectCodeHistorySearch {
    const page = typeof search.page === "number" ? search.page : Number(search.page);
    return Number.isFinite(page) && page > 0 ? { page } : {};
  },
});

function ProjectCodeHistoryRoute() {
  return <Outlet />;
}

export function ProjectCodeHistoryIndexScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  return <ProjectCodeHistoryScreen project={projectQuery.data} runtimeConfig={runtimeConfig} />;
}

function ProjectCodeHistoryScreen({
  project,
  runtimeConfig,
}: {
  project: ProjectContainer | undefined;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const { page = 0 } = Route.useSearch();
  const historyQuery = useQuery(
    codeHistoryQueryOptions(runtimeConfig, { ownerName, page, path: "", projectName }),
  );

  if (!project || !historyQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectCodeHistoryTitle />
      <ProjectCodeHistoryBody
        history={historyQuery.data}
        ownerName={ownerName}
        project={project}
        projectName={projectName}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

function ProjectCodeHistoryTitle() {
  const { t } = useLegacyMessages();
  const { ownerName, projectName } = Route.useParams();

  return <title>{`${t("title.commitHistory")} - ${ownerName}/${projectName}`}</title>;
}

export function ProjectCodeBranchHistoryRouteFrame({
  page,
  routeParams,
  runtimeConfig,
}: {
  page: number;
  routeParams: { branch: string; ownerName: string; projectName: string };
  runtimeConfig: RuntimeConfig;
}) {
  return (
    <ProjectCodeBranchHistoryRouteShell
      page={page}
      routeParams={routeParams}
      runtimeConfig={runtimeConfig}
    />
  );
}

function ProjectCodeBranchHistoryRouteShell({
  page,
  routeParams,
  runtimeConfig,
}: {
  page: number;
  routeParams: { branch: string; ownerName: string; projectName: string };
  runtimeConfig: RuntimeConfig;
}) {
  const { branch, ownerName, projectName } = routeParams;
  const { t } = useLegacyMessages();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const historyQuery = useQuery(
    codeHistoryQueryOptions(runtimeConfig, { branch, ownerName, page, projectName }),
  );
  const project = projectQuery.data;
  if (!project || !historyQuery.data) return null;
  return (
    <>
      <title>{`${t("title.commitHistory")} - ${ownerName}/${projectName}`}</title>
      <ProjectCodeHistoryBody
        history={historyQuery.data}
        ownerName={ownerName}
        project={project}
        projectName={projectName}
        requestedBranch={branch}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

export function ProjectCodeHistoryBody({
  history,
  ownerName,
  project,
  projectName,
  requestedBranch,
  runtimeConfig,
}: {
  history: CodeHistoryResponse;
  ownerName: string;
  project: ProjectContainer;
  projectName: string;
  requestedBranch?: string;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const setRootToast = useRootToast();
  const copyToastCounterRef = useRef(0);
  const isGit = project.vcs === "GIT";
  const selectedBranch = history.selectedBranch;
  const displayedBranch =
    (requestedBranch
      ? history.branches.find((item) => item.name === selectedBranch)?.name
      : undefined) ??
    history.branches[0]?.name ??
    selectedBranch;
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [branchFilter, setBranchFilter] = useState("");
  const [highlightedBranch, setHighlightedBranch] = useState(0);
  const branchTriggerRef = useRef<HTMLButtonElement>(null);
  const branchSearchRef = useRef<HTMLInputElement>(null);
  const highlightedBranchRef = useRef<HTMLLIElement>(null);
  const normalizedBranchFilter = branchFilter.toLowerCase();
  const visibleBranches = history.branches.filter((item) =>
    item.name.toLowerCase().includes(normalizedBranchFilter),
  );
  const selectedBranchHref = displayedBranch
    ? projectHref(
        runtimeConfig.basePath,
        ownerName,
        projectName,
        "commits",
        encodeBranch(displayedBranch),
      )
    : undefined;
  const selectedBranchValue = selectedBranchHref ? `${selectedBranchHref}/` : "";

  // react-doctor-disable-next-line react-doctor/no-effect-event-handler -- focus follows the legacy dropdown opening after its input mounts.
  useEffect(() => {
    if (branchMenuOpen) branchSearchRef.current?.focus();
  }, [branchMenuOpen]);

  // react-doctor-disable-next-line react-doctor/no-effect-event-handler -- scroll follows keyboard/filter state after the option list renders.
  useEffect(() => {
    if (branchMenuOpen) highlightedBranchRef.current?.scrollIntoView({ block: "nearest" });
  }, [branchMenuOpen, branchFilter, highlightedBranch]);

  const openBranchMenu = (search = "") => {
    setBranchFilter(search);
    setHighlightedBranch(
      search
        ? 0
        : Math.max(
            0,
            history.branches.findIndex((item) => item.name === displayedBranch),
          ),
    );
    setBranchMenuOpen(true);
  };
  const selectBranch = (name: string) => {
    setBranchMenuOpen(false);
    branchTriggerRef.current?.focus();
    if (name === displayedBranch) return;
    router.history.push(
      `${projectHref(runtimeConfig.basePath, ownerName, projectName, "commits", encodeBranch(name))}/`,
    );
  };

  const copyCommitId = async (commitId: string) => {
    copyToastCounterRef.current += 1;
    const toastKey = `copy-commit-id:${commitId}:${copyToastCounterRef.current}`;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API is not available.");
      }
      await navigator.clipboard.writeText(commitId);
      setRootToast({
        durationMs: 1000,
        key: toastKey,
        message: t("code.copyCommitId.copied"),
      });
    } catch {
      setRootToast({
        key: `${toastKey}:error`,
        message: t("site.features.error.clipboard"),
      });
    }
  };

  return (
    <div className="page-wrap-outer" data-owner="project-commits-page">
      <div className="project-page-wrap">
        <div className="bubble-wrap dark-gray repo-wrap" data-owner="project-commits-shell">
          <div className="code-browse-wrap">
            <div
              role="group"
              className={`select2-container pull-right${branchMenuOpen ? " select2-dropdown-open select2-container-active" : ""}`}
              style={{ width: "220px" }}
              data-owner="project-commits-branch-picker"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setBranchMenuOpen(false);
                }
              }}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (!branchMenuOpen) {
                  if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
                    event.preventDefault();
                    openBranchMenu();
                  } else if (
                    event.key.length === 1 &&
                    !event.ctrlKey &&
                    !event.metaKey &&
                    !event.altKey
                  ) {
                    event.preventDefault();
                    openBranchMenu(event.key);
                  }
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  setBranchMenuOpen(false);
                  branchTriggerRef.current?.focus();
                } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  setHighlightedBranch((index) =>
                    Math.max(
                      0,
                      Math.min(
                        visibleBranches.length - 1,
                        index + (event.key === "ArrowDown" ? 1 : -1),
                      ),
                    ),
                  );
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  const item = visibleBranches[highlightedBranch];
                  if (item) selectBranch(item.name);
                }
              }}
            >
              <button
                ref={branchTriggerRef}
                type="button"
                className="select2-choice"
                data-owner="project-commits-branch-choice"
                aria-expanded={branchMenuOpen}
                aria-haspopup="listbox"
                aria-controls="commits-branch-options"
                onClick={() => {
                  if (branchMenuOpen) setBranchMenuOpen(false);
                  else openBranchMenu();
                }}
              >
                <span className="select2-chosen">
                  {isGit ? (
                    <strong
                      className={`branch-label ${displayedBranch.startsWith("refs/tags/") ? "tag" : "branch"}`}
                    >
                      {displayedBranch.startsWith("refs/tags/") ? "tag" : "branch"}
                    </strong>
                  ) : null}
                  {isGit ? " " : null}
                  {branchItemName(displayedBranch)}
                </span>
                <span className="select2-arrow" aria-hidden="true">
                  <b></b>
                </span>
              </button>
              <input
                className="select2-focusser select2-offscreen"
                type="text"
                disabled={branchMenuOpen}
                tabIndex={-1}
                aria-label={t("title.branches")}
              />
              <div
                className={`project-commits-branch-dropdown select2-drop select2-display-none select2-with-searchbox branches${branchMenuOpen ? " select2-drop-active is-open" : ""}`}
              >
                <div className="select2-search">
                  <input
                    ref={branchSearchRef}
                    role="combobox"
                    aria-expanded={branchMenuOpen}
                    aria-controls="commits-branch-options"
                    aria-autocomplete="list"
                    aria-activedescendant={
                      branchMenuOpen && visibleBranches[highlightedBranch]
                        ? `commits-branch-option-${highlightedBranch}`
                        : undefined
                    }
                    type="text"
                    className={`select2-input${branchMenuOpen ? " select2-focused" : ""}`}
                    aria-label={t("title.branches")}
                    value={branchFilter}
                    onChange={(event) => {
                      setBranchFilter(event.currentTarget.value);
                      setHighlightedBranch(0);
                    }}
                  />
                </div>
                <ul
                  className="select2-results"
                  id="commits-branch-options"
                  role="listbox"
                  aria-label={t("title.branches")}
                >
                  {visibleBranches.map((item, index) => (
                    <li
                      key={item.name}
                      ref={index === highlightedBranch ? highlightedBranchRef : undefined}
                      id={`commits-branch-option-${index}`}
                      role="option"
                      aria-selected={item.name === displayedBranch}
                      className={`select2-results-dept-0 select2-result select2-result-selectable${index === highlightedBranch ? " select2-highlighted" : ""}`}
                      onMouseMove={() => setHighlightedBranch(index)}
                    >
                      <button
                        type="button"
                        className="select2-result-label"
                        tabIndex={-1}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectBranch(item.name)}
                      >
                        {isGit ? (
                          <strong
                            className={`branch-label ${item.name.startsWith("refs/tags/") ? "tag" : "branch"}`}
                          >
                            {item.name.startsWith("refs/tags/") ? "tag" : "branch"}
                          </strong>
                        ) : null}
                        {isGit ? " " : null}
                        {branchItemName(item.name)}
                      </button>
                    </li>
                  ))}
                  {branchMenuOpen && visibleBranches.length === 0 ? (
                    <li className="select2-no-results">{t("title.no.results")}</li>
                  ) : null}
                </ul>
              </div>
            </div>
            <select
              id="branches"
              className="select2-offscreen"
              tabIndex={-1}
              value={selectedBranchValue}
              onChange={(event) => {
                router.history.push(event.currentTarget.value);
              }}
            >
              {history.branches.map((item) => (
                <option
                  key={item.name}
                  value={`${projectHref(
                    runtimeConfig.basePath,
                    ownerName,
                    projectName,
                    "commits",
                    encodeBranch(item.name),
                  )}/`}
                >
                  {item.name}
                </option>
              ))}
            </select>

            {/* F5 style margin-bottom:20px — history.scala.html:100. */}
            <ul
              className="nav nav-tabs"
              data-owner="project-commits-tabs"
              style={{ marginBottom: "20px" }}
            >
              <li>
                <Link
                  to="/$ownerName/$projectName/code/$branch"
                  params={{ branch: requestedBranch || "HEAD", ownerName, projectName }}
                  activeOptions={legacyCodeHistoryLinkActiveOptions}
                  activeProps={legacyCodeHistoryLinkActiveProps}
                >
                  {t("code.files")}
                </Link>
              </li>
              <li className="active">
                {requestedBranch ? (
                  <Link
                    to="/$ownerName/$projectName/commits/$branch/$"
                    params={{ _splat: "/", branch: requestedBranch, ownerName, projectName }}
                    search={{ page: undefined as never }}
                    activeOptions={legacyCodeHistoryLinkActiveOptions}
                    activeProps={legacyCodeHistoryLinkActiveProps}
                  >
                    {t("code.commits")}
                  </Link>
                ) : (
                  <Link
                    to="/$ownerName/$projectName/commits"
                    params={{ ownerName, projectName }}
                    search={{}}
                    activeOptions={legacyCodeHistoryLinkActiveOptions}
                    activeProps={legacyCodeHistoryLinkActiveProps}
                  >
                    {t("code.commits")}
                  </Link>
                )}
              </li>
              {isGit ? (
                <li>
                  <Link
                    to="/$ownerName/$projectName/branches"
                    params={{ ownerName, projectName }}
                    activeOptions={legacyCodeHistoryLinkActiveOptions}
                    activeProps={legacyCodeHistoryLinkActiveProps}
                  >
                    {t("title.branches")}
                  </Link>
                </li>
              ) : null}
            </ul>

            <div id="history" className="commit-wrap" data-owner="project-commits-history">
              <table className="code-table commits" data-owner="project-commits-table">
                <thead className="thead">
                  <tr>
                    <td className="commit-id">
                      <strong>@</strong>
                    </td>
                    <td className="messages">
                      <strong>{t("code.commitMsg")}</strong>
                    </td>
                    <td className="date">
                      <strong>{t(isGit ? "code.authorDate" : "code.commitDate")}</strong>
                    </td>
                    <td className="author">
                      <strong>{t("code.author")}</strong>
                    </td>
                  </tr>
                </thead>
                <tbody className="tbody">
                  {history.commits.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="warning-none"
                        data-owner="project-commits-empty-warning"
                      >
                        {t("code.nocommits")}
                      </td>
                    </tr>
                  ) : (
                    history.commits.map((commit) => {
                      const showCommitPath = projectRoutePath(
                        ownerName,
                        projectName,
                        "commit",
                        commit.commitId,
                      );
                      return (
                        <tr key={commit.commitId}>
                          <td className="commit-id" data-owner="project-commits-commit-id">
                            <button
                              type="button"
                              className="ybtn ybtn-mini btn-copy-commitId"
                              title={t("code.copyCommitId")}
                              data-commitid={commit.commitId}
                              onClick={() => void copyCommitId(commit.commitId)}
                            >
                              <i className="yobicon-copy"></i>
                            </button>
                            <Link
                              to={showCommitPath}
                              // F5 no ?branch — yona-original/app/views/code/history.scala.html:46-55
                              // (getShowCommitURL adds ?branch only for the selectedBranch
                              // route; the bare /commits URL renders plain commit links).
                              search={requestedBranch ? { branch: requestedBranch } : {}}
                              activeOptions={legacyCodeHistoryLinkActiveOptions}
                              activeProps={legacyCodeHistoryLinkActiveProps}
                              title={t("code.showCommit")}
                            >
                              {commit.commitShortId}
                            </Link>
                          </td>
                          <td className="messages" data-owner="project-commits-messages">
                            {commit.commentCount > 0 ? (
                              <span data-owner="project-commits-comment-count">
                                <i className="yobicon-comments"></i> {commit.commentCount}
                              </span>
                            ) : null}
                            <CommitMessage
                              message={commit.message}
                              search={requestedBranch ? { branch: requestedBranch } : {}}
                              shortMessage={commit.shortMessage}
                              to={showCommitPath}
                            />
                          </td>
                          <td className="date" data-owner="project-commits-date">
                            {formatLegacyTimestamp(commit.authorDate, t).label}
                          </td>
                          <td className="author" data-owner="project-commits-author">
                            <CommitAuthor basePath={runtimeConfig.basePath} commit={commit} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="actrow margin-top-20" data-owner="project-commits-pagination">
            {history.hasNewer ? (
              requestedBranch ? (
                <Link
                  to="/$ownerName/$projectName/commits/$branch/$"
                  params={{ _splat: "/", branch: requestedBranch, ownerName, projectName }}
                  search={{ page: Math.max(0, history.page - 1) }}
                  activeOptions={legacyCodeHistoryLinkActiveOptions}
                  activeProps={legacyCodeHistoryLinkActiveProps}
                  className="ybtn pull-left"
                  data-owner="project-commits-newer"
                >
                  {t("code.newer")}
                </Link>
              ) : (
                <Link
                  to="/$ownerName/$projectName/commits"
                  params={{ ownerName, projectName }}
                  search={{ page: Math.max(0, history.page - 1) }}
                  activeOptions={legacyCodeHistoryLinkActiveOptions}
                  activeProps={legacyCodeHistoryLinkActiveProps}
                  className="ybtn pull-left"
                  data-owner="project-commits-newer"
                >
                  {t("code.newer")}
                </Link>
              )
            ) : null}
            {history.hasOlder ? (
              requestedBranch ? (
                <Link
                  to="/$ownerName/$projectName/commits/$branch/$"
                  params={{ _splat: "/", branch: requestedBranch, ownerName, projectName }}
                  search={{ page: history.page + 1 }}
                  activeOptions={legacyCodeHistoryLinkActiveOptions}
                  activeProps={legacyCodeHistoryLinkActiveProps}
                  className="ybtn pull-left"
                  data-owner="project-commits-older"
                >
                  {t("code.older")}
                </Link>
              ) : (
                <Link
                  to="/$ownerName/$projectName/commits"
                  params={{ ownerName, projectName }}
                  search={{ page: history.page + 1 }}
                  activeOptions={legacyCodeHistoryLinkActiveOptions}
                  activeProps={legacyCodeHistoryLinkActiveProps}
                  className="ybtn pull-left"
                  data-owner="project-commits-older"
                >
                  {t("code.older")}
                </Link>
              )
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function CommitMessage({
  message,
  search,
  shortMessage,
  to,
}: {
  message: string;
  search: Record<string, string>;
  shortMessage: string;
  to: string;
}) {
  const { t } = useLegacyMessages();
  const lines = message.split("\n");
  const summary = shortMessage || t("code.commitMsg.empty");
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <Link
        to={to}
        search={search}
        activeOptions={legacyCodeHistoryLinkActiveOptions}
        activeProps={legacyCodeHistoryLinkActiveProps}
        className="commitMsg short"
        data-owner="project-commits-message-summary"
      >
        {summary}
      </Link>
      {lines.length > 1 ? (
        <>
          <button
            type="button"
            className="commitMsg moreBtn"
            onClick={() => setIsExpanded((current) => !current)}
          >
            <span>…</span>
          </button>
          <pre className={`commitMsg desc${isExpanded ? "" : " hidden"}`}>
            {lines.slice(1).join("\n")}
          </pre>
        </>
      ) : null}
    </>
  );
}

function CommitAuthor({
  basePath,
  commit,
}: {
  basePath: string;
  commit: CodeHistoryResponse["commits"][number];
}) {
  const { t } = useLegacyMessages();
  const usesGeneratedAvatar = !commit.authorAvatarUrl;
  const avatarUrl =
    commit.authorAvatarUrl || prefixBasePath(basePath, "/assets/images/default-avatar-32.png");

  if (commit.authorLoginId) {
    const authorPath = `/${commit.authorLoginId}` as "/";
    return (
      <Link
        to={authorPath}
        activeOptions={legacyCodeHistoryLinkActiveOptions}
        className="avatar-wrap"
        activeProps={legacyCodeHistoryLinkActiveProps}
        title={commit.authorLoginId}
      >
        {usesGeneratedAvatar ? (
          // oxlint-disable-next-line jsx-a11y/alt-text -- legacy default avatar branch renders no alt/size attributes.
          <img src={avatarUrl} />
        ) : (
          <img
            src={avatarUrl}
            alt={commit.authorName || commit.authorLoginId}
            width="32"
            height="32"
          />
        )}
      </Link>
    );
  }

  if (commit.authorEmail) {
    return (
      <span className="avatar-wrap" title={commit.authorEmail}>
        {/* oxlint-disable-next-line jsx-a11y/alt-text -- legacy email-only default avatar branch renders no alt/size attributes. */}
        <img src={avatarUrl} />
      </span>
    );
  }

  return <span>{commit.authorName || t("user.role.anonymous")}</span>;
}

function projectHref(basePath: string, ownerName: string, projectName: string, ...parts: string[]) {
  return prefixBasePath(basePath, projectRoutePath(ownerName, projectName, ...parts));
}

function projectRoutePath(ownerName: string, projectName: string, ...parts: string[]) {
  return `/${[ownerName, projectName, ...parts].filter((part) => part !== "").join("/")}`;
}

function encodeBranch(branch: string) {
  return encodeURIComponent(branch);
}

function branchItemName(branch: string) {
  return branch.startsWith("refs/") ? branch.slice(branch.indexOf("/", 5) + 1) : branch;
}
