import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  codeBranchesQueryOptions,
  deleteCodeBranchRest,
  setDefaultCodeBranchRest,
  type CodeBranchListItem,
  type CodeBranchListResponse,
} from "../../../api/code-branches";
import { apiQueryKeys } from "../../../api/query-keys";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { formatLegacyTimestamp, useLegacyMessages } from "../../../i18n";
import type { RuntimeConfig } from "../../../runtime-config";

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
            <ul className="nav nav-tabs" data-owner="project-branches-tabs">
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

            <table className="table branch-list-wrap" data-owner="project-branches-table">
              <thead className="thead" data-owner="project-branches-table-head">
                <tr>
                  <th>{t("title.branches")}</th>
                  <th>{t("code.branches.commit")}</th>
                  <th>{t("code.branches.pullRequest")}</th>
                  {branches.permissions.canDelete || branches.permissions.canUpdate ? (
                    <th></th>
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
  const commitDate = formatLegacyTimestamp(branch.commitDate, t);
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
    <tr className={isHead ? "head" : undefined} data-owner="project-branches-row">
      <td className="branchName" data-owner="project-branches-branch-cell">
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
          data-owner="project-branches-branch-link"
        >
          {legacyBranchShortName(branch)}
        </Link>
        {isHead ? (
          <span className="headBranch ml10" data-owner="project-branches-default-badge">
            {t("code.branches.defaultBranch")}
          </span>
        ) : null}
      </td>
      <td className="commit" data-owner="project-branches-commit-cell">
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
          className="commitId"
          data-owner="project-branches-commit-link"
          title={branch.commitId}
        >
          {branch.commitShortId}
        </Link>
        <span className="date" data-owner="project-branches-commit-date" title={commitDate.title}>
          {commitDate.label}
        </span>
      </td>
      <td className="pullRequest" data-owner="project-branches-pull-request-cell">
        {!isHead && branch.pullRequest ? (
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
            className={`blue-txt pullrequest-state ${branch.pullRequest.state.toLowerCase()}`}
            data-owner="project-branches-pull-request-link"
            title={t(`pullRequest.state.${branch.pullRequest.state.toLowerCase()}`)}
          >
            pullRequest-{branch.pullRequest.pullRequestNumber}
          </Link>
        ) : (
          <span className="disabled" data-owner="project-branches-no-pull-request">
            {t("code.branches.noPullRequest")}
          </span>
        )}
      </td>
      {branches.permissions.canDelete || branches.permissions.canUpdate ? (
        <td className="actions" data-owner="project-branches-actions">
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
