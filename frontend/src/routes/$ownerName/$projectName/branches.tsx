import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import {
  codeBranchesQueryOptions,
  deleteCodeBranchRest,
  setDefaultCodeBranchRest,
  type CodeBranchListItem,
  type CodeBranchListResponse,
} from "../../../api/code-branches";
import { apiQueryKeys } from "../../../api/query-keys";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { useLegacyMessages } from "../../../i18n";
import type { RuntimeConfig } from "../../../runtime-config";
import { projectBranchesTheme } from "./-branches.stylex";

export const Route = createFileRoute("/$ownerName/$projectName/branches")({
  component: ProjectBranchesRoute,
});

function ProjectBranchesRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  return <ProjectBranchesScreen runtimeConfig={runtimeConfig} />;
}

function ProjectBranchesScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();
  const branchesQuery = useQuery(
    codeBranchesQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!branchesQuery.data) {
    return null;
  }

  return (
    <>
      <title>{`${t("title.branches")} - ${ownerName}/${projectName}`}</title>
      <ProjectBranchesBody branches={branchesQuery.data} runtimeConfig={runtimeConfig} />
    </>
  );
}

function ProjectBranchesBody({
  branches,
  runtimeConfig,
}: {
  branches: CodeBranchListResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const { ownerName, projectName } = Route.useParams();
  const rawDefaultBranch =
    branches.defaultBranch || branches.branches.find((branch) => branch.isDefault)?.name || "";
  const defaultBranch = shortBranchName(rawDefaultBranch);
  const rows = [
    ...branches.branches.filter((branch) => isDefaultBranch(branch, rawDefaultBranch)).slice(0, 1),
    ...branches.branches.filter((branch) => !isDefaultBranch(branch, rawDefaultBranch)),
  ];

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="bubble-wrap dark-gray repo-wrap">
          <div className="code-browse-wrap">
            <ul
              className={`${stylex.props(styles.branchTabs).className} nav nav-tabs`}
              data-stylex-owner="project-branches-tabs"
            >
              <li>
                <Link
                  to="/$ownerName/$projectName/code/$branch"
                  params={{ branch: defaultBranch, ownerName, projectName }}
                  activeOptions={{
                    exact: true,
                    explicitUndefined: true,
                    includeHash: true,
                    includeSearch: true,
                  }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                >
                  {t("code.files")}
                </Link>
              </li>
              <li>
                <Link
                  to="/$ownerName/$projectName/commits/$branch"
                  params={{ branch: defaultBranch, ownerName, projectName }}
                  search={{}}
                  activeOptions={{
                    exact: true,
                    explicitUndefined: true,
                    includeHash: true,
                    includeSearch: true,
                  }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                >
                  {t("code.commits")}
                </Link>
              </li>
              <li className="active">
                <Link
                  to="/$ownerName/$projectName/branches"
                  params={{ ownerName, projectName }}
                  hash="branches-active-sentinel"
                  mask={{
                    to: "/$ownerName/$projectName/branches",
                    params: { ownerName, projectName },
                  }}
                  activeOptions={{
                    exact: true,
                    explicitUndefined: true,
                    includeHash: true,
                    includeSearch: true,
                  }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                >
                  {t("title.branches")}
                </Link>
              </li>
            </ul>

            <table
              className={`${stylex.props(styles.branchTable).className} table branch-list-wrap`}
              data-stylex-owner="project-branches-table"
            >
              <thead
                className={`${stylex.props(styles.tableHead).className} thead`}
                data-stylex-owner="project-branches-table-head"
              >
                <tr>
                  <th className={stylex.props(styles.tableCell).className}>
                    {t("title.branches")}
                  </th>
                  <th className={stylex.props(styles.tableCell).className}>
                    {t("code.branches.commit")}
                  </th>
                  <th className={stylex.props(styles.tableCell).className}>
                    {t("code.branches.pullRequest")}
                  </th>
                  {branches.permissions.canDelete || branches.permissions.canUpdate ? (
                    <th className={stylex.props(styles.tableCell).className}></th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((branch) => (
                  <BranchRow
                    key={branch.name}
                    branch={branch}
                    branches={branches}
                    runtimeConfig={runtimeConfig}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function BranchRow({
  branch,
  branches,
  runtimeConfig,
}: {
  branch: CodeBranchListItem;
  branches: CodeBranchListResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const { ownerName, projectName } = Route.useParams();
  const queryClient = useQueryClient();
  const isHead = isDefaultBranch(branch, branches.defaultBranch);
  const queryKey = apiQueryKeys.project.codeBranches(ownerName, projectName);
  const setDefaultMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return setDefaultCodeBranchRest(runtimeConfig, csrfToken, {
        branchName: branch.name,
        ownerName,
        projectName,
      });
    },
    onSuccess(data) {
      queryClient.setQueryData(queryKey, data);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteCodeBranchRest(runtimeConfig, csrfToken, {
        branchName: branch.name,
        ownerName,
        projectName,
      });
    },
    onSuccess(data) {
      queryClient.setQueryData(queryKey, data);
    },
  });

  return (
    <tr
      className={`${stylex.props(styles.branchRow, isHead ? styles.headRow : null).className}${isHead ? " head" : ""}`}
      data-stylex-owner="project-branches-row"
    >
      <td
        className={`${stylex.props(styles.tableCell, styles.branchNameCell).className} branchName`}
        data-stylex-owner="project-branches-branch-cell"
      >
        <Link
          to="/$ownerName/$projectName/code/$branch"
          params={{ branch: branch.name, ownerName, projectName }}
          activeOptions={{
            exact: true,
            explicitUndefined: true,
            includeHash: true,
            includeSearch: true,
          }}
          activeProps={{
            "aria-current": undefined,
            className: undefined,
            "data-status": undefined,
          }}
          className={`${stylex.props(styles.branchLink).className}`}
          data-stylex-owner="project-branches-branch-link"
        >
          {legacyBranchShortName(branch)}
        </Link>
        {isHead ? (
          <span
            className={`${stylex.props(styles.defaultBadge).className} headBranch ml10`}
            data-stylex-owner="project-branches-default-badge"
          >
            {t("code.branches.defaultBranch")}
          </span>
        ) : null}
      </td>
      <td
        className={`${stylex.props(styles.tableCell, styles.commitCell).className} commit`}
        data-stylex-owner="project-branches-commit-cell"
      >
        <Link
          to="/$ownerName/$projectName/commits/$branch"
          params={{ branch: branch.name, ownerName, projectName }}
          search={{}}
          activeOptions={{
            exact: true,
            explicitUndefined: true,
            includeHash: true,
            includeSearch: true,
          }}
          activeProps={{
            "aria-current": undefined,
            className: undefined,
            "data-status": undefined,
          }}
          className={`${stylex.props(styles.commitId).className} commitId`}
          data-stylex-owner="project-branches-commit-link"
          title={branch.commitId}
        >
          {branch.commitShortId}
        </Link>
        <span
          className={`${stylex.props(styles.commitDate).className} date`}
          data-stylex-owner="project-branches-commit-date"
          title={branch.commitDate}
        >
          {branch.commitDate}
        </span>
      </td>
      <td
        className={`${stylex.props(styles.tableCell, styles.pullRequestCell).className} pullRequest`}
        data-stylex-owner="project-branches-pull-request-cell"
      >
        {branch.pullRequest ? (
          <Link
            to="/$ownerName/$projectName/pullRequest/$pullRequestNumber"
            params={{
              ownerName: branch.pullRequest.ownerName,
              projectName: branch.pullRequest.projectName,
              pullRequestNumber: String(branch.pullRequest.pullRequestNumber),
            }}
            activeOptions={{
              exact: true,
              explicitUndefined: true,
              includeHash: true,
              includeSearch: true,
            }}
            activeProps={{
              "aria-current": undefined,
              className: undefined,
              "data-status": undefined,
            }}
            className={`${stylex.props(styles.pullRequestLink).className} pullrequest-state ${branch.pullRequest.state.toLowerCase()}`}
            data-stylex-owner="project-branches-pull-request-link"
            title={t(`pullRequest.state.${branch.pullRequest.state.toLowerCase()}`)}
          >
            <span
              aria-hidden="true"
              data-stylex-owner="project-branches-pull-request-dot"
              {...stylex.props(
                styles.pullRequestDot,
                pullRequestDotStyle(branch.pullRequest.state),
              )}
            />
            pullRequest-{branch.pullRequest.pullRequestNumber}
          </Link>
        ) : (
          <span
            className={`${stylex.props(styles.disabledPullRequest).className} disabled`}
            data-stylex-owner="project-branches-no-pull-request"
          >
            {t("code.branches.noPullRequest")}
          </span>
        )}
      </td>
      {branches.permissions.canDelete || branches.permissions.canUpdate ? (
        <td
          className={`${stylex.props(styles.tableCell, styles.actions).className} actions`}
          data-stylex-owner="project-branches-actions"
        >
          {branches.permissions.canUpdate && !isHead ? (
            <button
              type="button"
              className="ybtn ybtn-default ybtn-small"
              onClick={() => setDefaultMutation.mutate()}
            >
              {t("code.branches.setAsDefault")}
            </button>
          ) : null}
          {branches.permissions.canDelete && !isHead ? (
            <button
              type="button"
              className="ybtn ybtn-danger ybtn-small"
              onClick={(event) => {
                event.preventDefault();
                deleteMutation.mutate();
              }}
            >
              {t("button.delete")}
            </button>
          ) : null}
        </td>
      ) : null}
    </tr>
  );
}

function shortBranchName(branchName: string) {
  const slashIndex = branchName.lastIndexOf("/");
  return slashIndex > 0 ? branchName.slice(slashIndex + 1) : branchName;
}

function legacyBranchShortName(branch: CodeBranchListItem) {
  const name = branch.name || branch.shortName;
  return name.startsWith("refs/heads/") ? name.slice("refs/heads/".length) : name;
}

function isDefaultBranch(branch: CodeBranchListItem, defaultBranch: string) {
  if (branch.isDefault) {
    return true;
  }
  const defaultBranchName = shortBranchName(defaultBranch);
  return (
    branch.name === defaultBranch ||
    branch.name === defaultBranchName ||
    branch.shortName === defaultBranchName
  );
}

const styles = stylex.create({
  branchTabs: {
    marginBottom: "20px",
  },
  branchTable: {
    width: "100%",
  },
  tableHead: {
    backgroundColor: projectBranchesTheme.headerBackground,
    borderBottomColor: projectBranchesTheme.headerBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    fontSize: "12px",
    lineHeight: "34px",
  },
  tableCell: {
    border: "none",
    verticalAlign: "top",
  },
  branchRow: {
    borderBottomColor: projectBranchesTheme.rowBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
  },
  headRow: { backgroundColor: projectBranchesTheme.headRowBackground },
  branchNameCell: {
    minWidth: "180px",
    paddingTop: "13px",
  },
  branchLink: {
    color: projectBranchesTheme.branchLink,
    fontFamily: "monospace",
  },
  pullRequestLink: {
    color: projectBranchesTheme.pullRequestLink,
  },
  defaultBadge: {
    backgroundColor: projectBranchesTheme.defaultBadgeBackground,
    borderColor: projectBranchesTheme.defaultBadgeBorder,
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "1px",
    color: projectBranchesTheme.defaultBadgeText,
    display: "inline-block",
    padding: "3px 5px",
  },
  commitCell: {
    paddingTop: "13px",
    width: "155px",
  },
  commitId: {
    fontFamily: "monospace",
  },
  commitDate: {
    color: projectBranchesTheme.commitDateText,
    fontSize: "11px",
    marginLeft: "10px",
  },
  pullRequestCell: {
    paddingTop: "13px",
    width: "170px",
  },
  actions: {
    minWidth: "220px",
    textAlign: "right",
    width: "220px",
  },
  pullRequestDot: {
    borderRadius: "10px",
    display: "inline-block",
    height: "10px",
    marginRight: "5px",
    verticalAlign: "middle",
    width: "10px",
  },
  openDot: { backgroundColor: projectBranchesTheme.openDot },
  closedDot: { backgroundColor: projectBranchesTheme.closedDot },
  mergedDot: { backgroundColor: projectBranchesTheme.mergedDot },
  disabledPullRequest: {
    color: projectBranchesTheme.disabledPullRequestText,
  },
});

function pullRequestDotStyle(state: string) {
  if (state === "closed") return styles.closedDot;
  if (state === "merged") return styles.mergedDot;
  return styles.openDot;
}
