import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { use, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  forkProjectRest,
  readProjectContainerQueryOptions,
  readProjectForkOptionsQueryOptions,
} from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { ProjectForkOptionsResponse } from "../../../api/org-project";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { useLegacyMessages } from "../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { DefaultSearchErrorBody } from "../../-search-screen";
import { ProjectNestedShellContext } from "../$projectName";

type ForkCloneProgress = {
  originalOwnerName: string;
  originalProjectName: string;
  redirectPath: string;
  targetOwnerName: string;
  targetProjectName: string;
};

const legacyProjectShellLinkActiveOptions = {
  exact: true,
  explicitUndefined: true,
  includeHash: true,
  includeSearch: true,
} as const;
const legacyProjectShellLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};

export const Route = createFileRoute("/$ownerName/$projectName/newFork")({
  component: ProjectForkRoute,
});

function ProjectForkRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { ownerName, projectName } = Route.useParams();

  return (
    <ProjectForkRouteContent
      ownerName={ownerName}
      projectName={projectName}
      runtimeConfig={runtimeConfig}
    />
  );
}

export function ProjectForkRouteContent({
  forkOwnerName,
  ownerName,
  projectName,
  runtimeConfig,
}: {
  forkOwnerName?: string;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
}) {
  return (
    <ProjectForkRouteShell
      forkOwnerName={forkOwnerName}
      ownerName={ownerName}
      projectName={projectName}
      runtimeConfig={runtimeConfig}
    />
  );
}

function ProjectForkRouteShell({
  forkOwnerName,
  ownerName,
  projectName,
  runtimeConfig,
}: {
  forkOwnerName?: string;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
}) {
  const nestedProjectShell = use(ProjectNestedShellContext);
  const query = useQuery(
    readProjectForkOptionsQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const isGitProject = query.data
    ? stringField(recordField(query.data.source).vcs, "").toUpperCase() === "GIT"
    : null;
  const projectQueryOptions = readProjectContainerQueryOptions(runtimeConfig, {
    ownerName,
    projectName,
  });
  const projectQuery = useQuery({
    ...projectQueryOptions,
    enabled: isGitProject === true,
  });

  if (!query.data) {
    return nestedProjectShell ? null : (
      <SiteLayoutShell runtimeConfig={runtimeConfig}>{null}</SiteLayoutShell>
    );
  }

  if (!isGitProject) {
    return (
      <SiteLayoutShell runtimeConfig={runtimeConfig}>
        <ProjectForkTitle isGitProject={false} ownerName={ownerName} projectName={projectName} />
        <DefaultSearchErrorBody
          iconClassName="ico-404"
          messageKey="error.badrequest.only.available.for.git"
          runtimeConfig={runtimeConfig}
          ybtnClassName="ybtn ybtn-info"
        />
      </SiteLayoutShell>
    );
  }

  if (!projectQuery.data) {
    return <SiteLayoutShell runtimeConfig={runtimeConfig}>{null}</SiteLayoutShell>;
  }

  return (
    <ProjectForkBody
      forkOwnerName={forkOwnerName}
      ownerName={ownerName}
      options={query.data}
      projectName={projectName}
      runtimeConfig={runtimeConfig}
    />
  );
}

function ProjectForkTitle({
  isGitProject,
  ownerName,
  projectName,
}: {
  isGitProject: boolean;
  ownerName: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();

  return (
    <title>
      {isGitProject
        ? `${t("fork")} - ${ownerName}/${projectName}`
        : t("error.badrequest.only.available.for.git")}
    </title>
  );
}

function ProjectForkBody({
  forkOwnerName,
  ownerName,
  options,
  projectName,
  runtimeConfig,
}: {
  forkOwnerName?: string;
  ownerName: string;
  options: ProjectForkOptionsResponse;
  projectName: string;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [cloneProgress, setCloneProgress] = useState<ForkCloneProgress | null>(null);
  const requestedOwner = options.ownerOptions.some(
    (ownerOption) => stringField(ownerOption.ownerName, "") === forkOwnerName,
  )
    ? forkOwnerName
    : undefined;
  const selectedOwner = requestedOwner ?? stringField(options.selected?.ownerName, ownerName);
  const firstOwner = stringField(options.ownerOptions[0]?.ownerName, "");
  const selectedOwnerProps =
    selectedOwner === firstOwner ? {} : ({ defaultValue: selectedOwner } as const);
  const selectedName = stringField(options.selected?.projectName, projectName);
  const sourceOwnerName = stringField(options.source?.ownerName, ownerName);
  const sourceProjectName = stringField(options.source?.projectName, projectName);
  const submitMutation = useMutation({
    mutationFn: async (input: { name: string; owner: string; projectScope: string }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return forkProjectRest(runtimeConfig, csrfToken, {
        ...input,
        ownerName,
        projectName,
      });
    },
    onSuccess(response, input) {
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.forkOptions(ownerName, projectName),
      });
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.base(ownerName, projectName),
      });
      setCloneProgress({
        originalOwnerName: sourceOwnerName,
        originalProjectName: sourceProjectName,
        redirectPath: response.redirectPath,
        targetOwnerName: input.owner,
        targetProjectName: input.name,
      });
    },
  });

  useEffect(() => {
    if (!cloneProgress) {
      return;
    }
    const timeout = window.setTimeout(() => {
      router.history.push(prefixBasePath(runtimeConfig.basePath, cloneProgress.redirectPath));
    }, 3000);
    return () => window.clearTimeout(timeout);
  }, [cloneProgress, router.history, runtimeConfig.basePath]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const ownerValues = formData.getAll("owner");
    submitMutation.mutate({
      name: String(formData.get("name") ?? selectedName),
      owner: String(ownerValues.at(-1) ?? selectedOwner),
      projectScope: String(formData.get("projectScope") ?? "PUBLIC"),
    });
  }

  function onChangeOwner(event: ChangeEvent<HTMLSelectElement>) {
    const nextOwnerName = event.currentTarget.value;
    if (!nextOwnerName) {
      return;
    }
    queryClient.invalidateQueries({
      queryKey: apiQueryKeys.project.forkOptions(ownerName, projectName),
    });
    router.history.push(
      prefixBasePath(
        runtimeConfig.basePath,
        `/${ownerName}/${projectName}/newFork/${nextOwnerName}`,
      ),
    );
  }

  if (cloneProgress) {
    return <ProjectForkCloneProgress progress={cloneProgress} />;
  }

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="content-wrap frm-wrap">
          <form
            action={prefixBasePath(runtimeConfig.basePath, `/${ownerName}/${projectName}/fork`)}
            method="post"
            className="form-horizontal nm"
            onSubmit={onSubmit}
          >
            <input type="hidden" name="owner" value={selectedOwner} />
            <fieldset>
              <legend>
                <h4 style={{ paddingTop: "10px" }}>
                  {`${ownerName} / ${projectName} ${t("fork")}`}
                </h4>
              </legend>
              <div id="helpMessage" className="well">
                <div className="row-fluid">
                  {options.existingForks.length === 0 ? (
                    <>
                      <div className="pull-left">
                        <img
                          className="img-polaroid"
                          src={prefixBasePath(
                            runtimeConfig.basePath,
                            "/legacy-assets/images/fork-pull/fork.jpg",
                          )}
                          alt=""
                        />
                        <br />
                      </div>
                      <div className="pull-left help-messages">
                        <p className="lead">{t("fork.help.title")}</p>
                        <p>{t("fork.help.message.1")}</p>
                        <p>{t("fork.help.message.2")}</p>
                      </div>
                    </>
                  ) : (
                    <div className="help-messages center-txt">
                      <i className="ico ico-err2"></i>
                      <p>{t("fork.already.exist")}</p>
                      {options.existingForks.map((forkedProject) => {
                        const forkOwnerName = stringField(forkedProject.ownerName, "");
                        const forkProjectName = stringField(forkedProject.projectName, "");
                        return (
                          <p key={`${forkOwnerName}/${forkProjectName}`}>
                            <strong className="vmiddle">{`${ownerName} / ${projectName}`}</strong>
                            <i className="yobicon-right vmiddle"></i>
                            <Link
                              to={projectPath(forkOwnerName, forkProjectName)}
                              className="vmiddle primary-txt"
                              activeOptions={legacyProjectShellLinkActiveOptions}
                              activeProps={legacyProjectShellLinkActiveProps}
                            >
                              {`${forkOwnerName} / ${forkProjectName}`}
                            </Link>
                          </p>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="control-group">
                <label className="control-label" htmlFor="inputOwner">
                  {t("project.owner")}
                </label>
                <div className="controls">
                  <select
                    id="project-owner"
                    name="owner"
                    onChange={onChangeOwner}
                    {...selectedOwnerProps}
                  >
                    {options.ownerOptions.map((ownerOption) => {
                      const optionOwnerName = stringField(ownerOption.ownerName, "");
                      return (
                        <option key={optionOwnerName} value={optionOwnerName}>
                          {optionOwnerName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <div className="control-group">
                <label className="control-label" htmlFor="inputName">
                  {t("project.name")}
                </label>
                <div className="controls">
                  <input type="text" id="inputName" name="name" defaultValue={selectedName} />
                  <span className="help-inline">{t("project.name.alert")} </span>
                </div>
              </div>
              <div className="control-group">
                <label className="control-label">{t("project.shareOption")}</label>
                <div className="controls">
                  <input
                    name="projectScope"
                    type="radio"
                    id="public"
                    value="PUBLIC"
                    className="radio-btn"
                    defaultChecked
                  />{" "}
                  <label htmlFor="public" className="bg-radiobtn label-public">
                    {t("project.public")}
                  </label>
                  {options.ownerOptions.some(
                    (ownerOption) =>
                      ownerOption.organization &&
                      stringField(ownerOption.ownerName, "") === selectedOwner,
                  ) ? (
                    <>
                      {" "}
                      <input
                        name="projectScope"
                        type="radio"
                        id="protected"
                        value="PROTECTED"
                        className="radio-btn"
                      />{" "}
                      <label htmlFor="protected" className="bg-radiobtn label-protected">
                        {t("project.protected")}
                      </label>
                    </>
                  ) : null}{" "}
                  <input
                    name="projectScope"
                    type="radio"
                    id="private"
                    value="PRIVATE"
                    className="radio-btn"
                  />{" "}
                  <label htmlFor="private" className="bg-radiobtn label-private">
                    {t("project.private")}
                  </label>
                </div>
              </div>
              <div className="control-group">
                <div className="controls">
                  <button type="submit" className="ybtn ybtn-info">
                    {t("fork")}
                  </button>{" "}
                  <Link
                    to={pullRequestsPath(ownerName, projectName)}
                    className="ybtn"
                    activeOptions={legacyProjectShellLinkActiveOptions}
                    activeProps={legacyProjectShellLinkActiveProps}
                  >
                    {t("button.cancel")}
                  </Link>
                </div>
              </div>
            </fieldset>
          </form>
        </div>
      </div>
    </div>
  );
}

function ProjectForkCloneProgress({ progress }: { progress: ForkCloneProgress }) {
  const { t } = useLegacyMessages();

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="content-wrap frm-wrap">
          <legend>
            {t("fork.forking", {
              args: [
                progress.originalOwnerName,
                progress.originalProjectName,
                progress.targetOwnerName,
                progress.targetProjectName,
              ],
            })}
          </legend>
          <p>{t("fork.forking.message.1")}</p>
          <p>{t("fork.forking.message.2")}</p>
        </div>
      </div>
    </div>
  );
}

function projectPath(ownerName: string, projectName: string) {
  return `/${ownerName}/${projectName}`;
}

function pullRequestsPath(ownerName: string, projectName: string) {
  return projectSubPath(ownerName, projectName, "pullRequests");
}

function projectSubPath(ownerName: string, projectName: string, subPath: string) {
  return `${projectPath(ownerName, projectName)}/${subPath}`;
}

function recordField(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
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
