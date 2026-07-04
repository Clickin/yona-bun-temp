import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  forkProjectRest,
  readProjectForkOptionsQueryOptions,
  toggleFavoriteProjectRest,
} from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { ProjectForkOptionsResponse } from "../../../api/org-project";
import type { ProjectContainer } from "../../../api/types";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";

type ForkCloneProgress = {
  originalOwnerName: string;
  originalProjectName: string;
  redirectPath: string;
  targetOwnerName: string;
  targetProjectName: string;
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
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectForkScreen
            forkOwnerName={forkOwnerName}
            ownerName={ownerName}
            projectName={projectName}
            runtimeConfig={runtimeConfig}
          />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectForkScreen({
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
  const query = useQuery(
    readProjectForkOptionsQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!query.data) {
    return null;
  }

  const project = projectContainerFromForkSource(query.data.source);

  return (
    <>
      <ProjectHeader project={project} />
      <ProjectMenu project={project} />
      <ProjectForkBody
        forkOwnerName={forkOwnerName}
        ownerName={ownerName}
        options={query.data}
        projectName={projectName}
        runtimeConfig={runtimeConfig}
      />
    </>
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
      router.history.push(cloneProgress.redirectPath);
    }, 3000);
    return () => window.clearTimeout(timeout);
  }, [cloneProgress, router.history]);

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
    const url = event.currentTarget.selectedOptions.item(0)?.dataset.url;
    if (!url) {
      return;
    }
    queryClient.invalidateQueries({
      queryKey: apiQueryKeys.project.forkOptions(ownerName, projectName),
    });
    router.history.push(url);
  }

  if (cloneProgress) {
    return <ProjectForkCloneProgress progress={cloneProgress} />;
  }

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="content-wrap frm-wrap">
          <form method="post" className="form-horizontal nm" onSubmit={onSubmit}>
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
                          src="/assets/images/fork-pull/fork.jpg"
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
                              activeProps={{ className: undefined }}
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
                        <option
                          key={optionOwnerName}
                          data-url={prefixBasePath(
                            runtimeConfig.basePath,
                            `/${ownerName}/${projectName}/newFork/${optionOwnerName}`,
                          )}
                          value={optionOwnerName}
                        >
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
                  />
                  <label htmlFor="public" className="bg-radiobtn label-public">
                    {t("project.public")}
                  </label>
                  {options.ownerOptions.some(
                    (ownerOption) =>
                      ownerOption.organization &&
                      stringField(ownerOption.ownerName, "") === selectedOwner,
                  ) ? (
                    <>
                      <input
                        name="projectScope"
                        type="radio"
                        id="protected"
                        value="PROTECTED"
                        className="radio-btn"
                      />
                      <label htmlFor="protected" className="bg-radiobtn label-protected">
                        {t("project.protected")}
                      </label>
                    </>
                  ) : null}
                  <input
                    name="projectScope"
                    type="radio"
                    id="private"
                    value="PRIVATE"
                    className="radio-btn"
                  />
                  <label htmlFor="private" className="bg-radiobtn label-private">
                    {t("project.private")}
                  </label>
                </div>
              </div>
              <div className="control-group">
                <div className="controls">
                  <button type="submit" className="ybtn ybtn-info">
                    {t("fork")}
                  </button>
                  <Link
                    to={pullRequestsPath(ownerName, projectName)}
                    className="ybtn"
                    activeProps={{ className: undefined }}
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

function ProjectHeader({ project }: { project: ProjectContainer }) {
  const { runtimeConfig } = Route.useRouteContext();
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const projectId = stringField(project.id, "");
  const logoUrl = stringField(project.logoUrl, "") || "/assets/images/project_default_logo.png";
  const backgroundImageUrl =
    stringField(project.backgroundImageUrl, "") || "/assets/images/bg-default-project.png";
  const isForked = booleanField(project.isForkedFromOrigin);
  const originalOwnerName = stringField(project.originalOwnerName, "");
  const originalProjectName = stringField(project.originalProjectName, "");
  const [isFavoritedProject, setIsFavoritedProject] = useState(
    () => booleanField(project.isFavorite) || booleanField(project.isFavorited),
  );
  const favoriteMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return toggleFavoriteProjectRest(runtimeConfig, csrfToken, ownerName, projectName);
    },
    onSuccess(response) {
      setIsFavoritedProject((current) =>
        typeof response.favorited === "boolean" ? response.favorited : !current,
      );
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.forkOptions(ownerName, projectName),
      });
    },
  });

  return (
    <div
      className="project-header-outer"
      style={{ backgroundImage: `url('${backgroundImageUrl}')` }}
    >
      <div className="project-header-inner">
        <div className="project-header-wrap">
          <div className="project-header-avatar">
            <img src={logoUrl} alt="" />
          </div>
          <div className={`project-breadcrumb-wrap${isForked ? " fork" : ""}`}>
            <div className="project-breadcrumb">
              <span className="project-author hide-in-mobile">
                <Link to={userPath(ownerName)} activeProps={{ className: undefined }}>
                  {ownerName}
                </Link>
              </span>
              <span className="project-separator hide-in-mobile">/</span>
              <span className="project-name">
                <Link
                  to={projectPath(ownerName, projectName)}
                  activeProps={{ className: undefined }}
                >
                  {projectName}
                </Link>
              </span>
              <span
                className="user-project-list"
                data-project-id={projectId}
                role="button"
                tabIndex={0}
                onMouseDown={(event) => {
                  event.stopPropagation();
                  favoriteMutation.mutate();
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") {
                    return;
                  }
                  event.preventDefault();
                  event.stopPropagation();
                  favoriteMutation.mutate();
                }}
              >
                <i
                  className={`${isFavoritedProject ? "starred" : ""} star material-icons va-text-top`}
                >
                  star
                </i>
              </span>
              {booleanField(project.isPrivate) ? (
                <span className="project-private">
                  <i className="yobicon-lock"></i>
                </span>
              ) : null}
              {booleanField(project.isProtected) ? (
                <span className="project-protected" title="Group Project">
                  G
                </span>
              ) : null}
            </div>
            {isForked ? (
              <div className="project-origin">
                <span className="project-origin-title">{t("fork.original")}</span>
                <Link
                  to={projectPath(originalOwnerName, originalProjectName)}
                  className="project-origin-name"
                  activeProps={{ className: undefined }}
                >
                  {originalOwnerName} / {originalProjectName}
                </Link>
              </div>
            ) : null}
          </div>
          <div className="project-util-wrap">
            <ul className="project-util"></ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectMenu({ project }: { project: ProjectContainer }) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const menuSetting = recordField(project.menuSetting);

  return (
    <div className="project-menu-outer">
      <div className="project-menu-inner">
        <ul className="project-menu-nav project-menu-gruop">
          <ProjectMenuItem
            to={projectPath(ownerName, projectName)}
            label={t("title.projectHome")}
            short="H"
          />
          {booleanField(menuSetting.code) ? (
            <ProjectMenuItem
              className="code-menu "
              to={projectSubPath(ownerName, projectName, "code")}
              label={t("menu.code")}
              short="C"
            />
          ) : null}
          {booleanField(menuSetting.issue) ? (
            <ProjectMenuItem
              to={projectSubPath(ownerName, projectName, "issues")}
              label={t("menu.issue")}
              short="I"
            />
          ) : null}
          {booleanField(menuSetting.pullRequest) && stringField(project.vcs, "GIT") === "GIT" ? (
            <ProjectMenuItem
              className="active"
              to={pullRequestsPath(ownerName, projectName)}
              label={t("menu.pullRequest")}
              short="P"
            />
          ) : null}
          {booleanField(menuSetting.review) ? (
            <ProjectMenuItem
              to={projectSubPath(ownerName, projectName, "reviews")}
              label={t("menu.review")}
              short="R"
            />
          ) : null}
          {booleanField(menuSetting.milestone) ? (
            <ProjectMenuItem
              to={projectSubPath(ownerName, projectName, "milestones")}
              label={t("milestone")}
              short="M"
            />
          ) : null}
          {booleanField(menuSetting.board) ? (
            <ProjectMenuItem
              to={projectSubPath(ownerName, projectName, "posts")}
              label={t("menu.board")}
              short="B"
            />
          ) : null}
        </ul>
        {booleanField(project.viewerCanUpdate) ? (
          <div className="project-setting">
            <ul className="project-menu-nav">
              <li className="">
                <Link
                  to={projectSubPath(ownerName, projectName, "setting")}
                  activeProps={{ className: undefined }}
                >
                  <i className="yobicon-cog"></i>
                  <span className="blind">
                    <span className="menu-name">{t("menu.admin")}</span>
                  </span>
                  <CountBadge count={numberField(project.enrollmentRequestCount)} />
                </Link>
              </li>
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProjectMenuItem({
  className = "",
  label,
  short,
  to,
}: {
  className?: string;
  label: string;
  short: string;
  to: string;
}) {
  return (
    <li className={className}>
      <Link to={to} activeProps={{ className: undefined }}>
        <span className="menu-name">{label}</span>
        <span className="short-menu">{short}</span>
      </Link>
    </li>
  );
}

function CountBadge({
  className = "project-menu-count",
  count,
}: {
  className?: string;
  count: number;
}) {
  return count > 0 ? <span className={className}>{count}</span> : null;
}

function projectContainerFromForkSource(
  source: ProjectForkOptionsResponse["source"],
): ProjectContainer {
  return {
    ...source,
    enrollmentRequestCount: numberField(recordField(source).enrollmentRequestCount),
    members: [],
  };
}

function userPath(ownerName: string) {
  return `/${ownerName}`;
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

function numberField(value: unknown) {
  return typeof value === "number" ? value : 0;
}

function booleanField(value: unknown) {
  return value === true;
}
