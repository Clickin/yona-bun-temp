import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  codeBranchesQueryOptions,
  deleteCodeBranchRest,
  setDefaultCodeBranchRest,
  type CodeBranchListItem,
  type CodeBranchListResponse,
} from "../../../api/code-branches";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../$projectName";

export const Route = createFileRoute("/$ownerName/$projectName/branches")({
  component: ProjectBranchesRoute,
});

function ProjectBranchesRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectBranchesScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectBranchesScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const branchesQuery = useQuery(
    codeBranchesQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!projectQuery.data || !branchesQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu active="code" basePath={runtimeConfig.basePath} project={projectQuery.data} />
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
  const defaultBranch =
    branches.defaultBranch || branches.branches.find((branch) => branch.isDefault)?.name || "";
  const rows = [
    ...branches.branches
      .filter((branch) => branch.name === defaultBranch || branch.isDefault)
      .slice(0, 1),
    ...branches.branches.filter((branch) => branch.name !== defaultBranch && !branch.isDefault),
  ];
  const defaultBranchPath = encodeBranch(defaultBranch);

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="bubble-wrap dark-gray repo-wrap">
          <div className="code-browse-wrap">
            <ul className="nav nav-tabs" style={{ marginBottom: "20px" }}>
              <li>
                <a
                  href={prefixBasePath(
                    runtimeConfig.basePath,
                    `/${ownerName}/${projectName}/code/${defaultBranchPath}`,
                  )}
                >
                  {t("code.files")}
                </a>
              </li>
              <li>
                <a
                  href={prefixBasePath(
                    runtimeConfig.basePath,
                    `/${ownerName}/${projectName}/commits/${defaultBranchPath}`,
                  )}
                >
                  {t("code.commits")}
                </a>
              </li>
              <li className="active">
                <a
                  href={prefixBasePath(
                    runtimeConfig.basePath,
                    `/${ownerName}/${projectName}/branches`,
                  )}
                >
                  {t("title.branches")}
                </a>
              </li>
            </ul>

            <table className="table branch-list-wrap">
              <thead className="thead">
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
  const encodedBranch = encodeBranch(branch.name);
  const isHead = branch.name === branches.defaultBranch || branch.isDefault;
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
    <tr className={isHead ? "head" : undefined}>
      <td className="branchName">
        <a
          href={prefixBasePath(
            runtimeConfig.basePath,
            `/${ownerName}/${projectName}/code/${encodedBranch}`,
          )}
        >
          {branch.shortName}
        </a>
        {isHead ? (
          <span className="headBranch ml10">{t("code.branches.defaultBranch")}</span>
        ) : null}
      </td>
      <td className="commit">
        <a
          href={prefixBasePath(
            runtimeConfig.basePath,
            `/${ownerName}/${projectName}/commits/${encodedBranch}`,
          )}
          className="commitId"
          title={branch.commitId}
        >
          {branch.commitShortId}
        </a>
        <span className="date" data-toggle="tooltip" data-placement="top" title={branch.commitDate}>
          {branch.commitDate}
        </span>
      </td>
      <td className="pullRequest">
        {branch.pullRequest ? (
          <a
            href={prefixBasePath(
              runtimeConfig.basePath,
              `/${branch.pullRequest.ownerName}/${branch.pullRequest.projectName}/pullRequest/${branch.pullRequest.pullRequestNumber}`,
            )}
            className={`blue-txt pullrequest-state ${branch.pullRequest.state.toLowerCase()}`}
            data-toggle="tooltip"
            data-placement="top"
            title={t(`pullRequest.state.${branch.pullRequest.state.toLowerCase()}`)}
          >
            pullRequest-{branch.pullRequest.pullRequestNumber}
          </a>
        ) : (
          <span className="disabled">{t("code.branches.noPullRequest")}</span>
        )}
      </td>
      {branches.permissions.canDelete || branches.permissions.canUpdate ? (
        <td className="actions">
          {branches.permissions.canUpdate && !isHead ? (
            <button
              type="button"
              className="ybtn ybtn-default ybtn-small"
              data-request-method="post"
              data-request-uri={prefixBasePath(
                runtimeConfig.basePath,
                `/${ownerName}/${projectName}/code/${encodedBranch}/setAsDefault`,
              )}
              onClick={() => setDefaultMutation.mutate()}
            >
              {t("code.branches.setAsDefault")}
            </button>
          ) : null}
          {branches.permissions.canDelete && !isHead ? (
            <a
              href={prefixBasePath(
                runtimeConfig.basePath,
                `/${ownerName}/${projectName}/code/${encodedBranch}/`,
              )}
              className="ybtn ybtn-danger ybtn-small"
              data-request-method="delete"
              onClick={(event) => {
                event.preventDefault();
                deleteMutation.mutate();
              }}
            >
              {t("button.delete")}
            </a>
          ) : null}
        </td>
      ) : null}
    </tr>
  );
}

function encodeBranch(branchName: string) {
  return encodeURIComponent(branchName);
}
