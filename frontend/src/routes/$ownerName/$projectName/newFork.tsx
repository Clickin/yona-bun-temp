import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
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
import { LastOutletTransition } from "../../-last-outlet-transition";
import { DefaultSearchErrorBody } from "../../-search-screen";
import { ProjectNestedShellContext } from "../$projectName";
import { styles } from "./-newFork.stylex";

const sx = {
  page: stylex.props(styles.page),
  form: stylex.props(styles.form),
  heading: stylex.props(styles.heading),
  help: stylex.props(styles.help),
  helpImage: stylex.props(styles.helpImage),
  helpMessages: stylex.props(styles.helpMessages),
  existing: stylex.props(styles.existing),
  existingMessage: stylex.props(styles.existingMessage),
  existingRow: stylex.props(styles.existingRow),
  existingIcon: stylex.props(styles.existingIcon),
  existingSource: stylex.props(styles.existingSource),
  existingArrow: stylex.props(styles.existingArrow),
  existingLink: stylex.props(styles.existingLink),
  group: stylex.props(styles.group),
  label: stylex.props(styles.label),
  controls: stylex.props(styles.controls),
  input: stylex.props(styles.input),
  action: stylex.props(styles.action),
  cancel: stylex.props(styles.action, styles.cancel),
} as const;

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
  return <LastOutletTransition routeId={Route.id} />;
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
    const body = (
      <>
        <ProjectForkTitle isGitProject={false} ownerName={ownerName} projectName={projectName} />
        <DefaultSearchErrorBody
          iconClassName="ico-404"
          messageKey="error.badrequest.only.available.for.git"
          runtimeConfig={runtimeConfig}
          ybtnClassName="ybtn ybtn-info"
        />
      </>
    );
    return nestedProjectShell ? (
      body
    ) : (
      <SiteLayoutShell runtimeConfig={runtimeConfig}>{body}</SiteLayoutShell>
    );
  }

  if (!projectQuery.data) {
    return nestedProjectShell ? null : (
      <SiteLayoutShell runtimeConfig={runtimeConfig}>{null}</SiteLayoutShell>
    );
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
    <div {...sx.page} data-stylex-owner="project-fork-page">
      <div data-stylex-owner="project-fork-shell">
        <div data-stylex-owner="project-fork-form-wrap">
          <form
            action={prefixBasePath(runtimeConfig.basePath, `/${ownerName}/${projectName}/fork`)}
            method="post"
            {...sx.form}
            data-stylex-owner="project-fork-form"
            onSubmit={onSubmit}
          >
            <input type="hidden" name="owner" value={selectedOwner} />
            <fieldset>
              <legend>
                <h4 {...sx.heading} data-stylex-owner="project-fork-heading">
                  {`${ownerName} / ${projectName} ${t("fork")}`}
                </h4>
              </legend>
              <div {...sx.help} data-stylex-owner="project-fork-help" id="helpMessage">
                <div className="row-fluid" data-stylex-owner="project-fork-help-row">
                  {options.existingForks.length === 0 ? (
                    <>
                      <div className="pull-left">
                        <img
                          {...sx.helpImage}
                          data-stylex-owner="project-fork-help-image"
                          src={prefixBasePath(
                            runtimeConfig.basePath,
                            "/legacy-assets/images/fork-pull/fork.jpg",
                          )}
                          alt=""
                        />
                        <br />
                      </div>
                      <div {...sx.helpMessages} data-stylex-owner="project-fork-help-copy">
                        <p className="lead">{t("fork.help.title")}</p>
                        <p>{t("fork.help.message.1")}</p>
                        <p>{t("fork.help.message.2")}</p>
                      </div>
                    </>
                  ) : (
                    <div
                      {...sx.existing}
                      className={`${sx.existing.className} help-messages center-txt`}
                      data-stylex-owner="project-fork-existing"
                    >
                      <i
                        {...sx.existingIcon}
                        className={`${sx.existingIcon.className} ico ico-err2`}
                        data-stylex-owner="project-fork-existing-icon"
                      ></i>
                      <p {...sx.existingMessage} data-stylex-owner="project-fork-existing-message">
                        {t("fork.already.exist")}
                      </p>
                      {options.existingForks.map((forkedProject) => {
                        const forkOwnerName = stringField(forkedProject.ownerName, "");
                        const forkProjectName = stringField(forkedProject.projectName, "");
                        return (
                          <p
                            {...sx.existingRow}
                            key={`${forkOwnerName}/${forkProjectName}`}
                            data-stylex-owner="project-fork-existing-row"
                          >
                            <strong
                              {...sx.existingSource}
                              className={`${sx.existingSource.className} vmiddle`}
                              data-stylex-owner="project-fork-existing-source"
                            >
                              {`${ownerName} / ${projectName}`}
                            </strong>
                            <i
                              {...sx.existingArrow}
                              className={`${sx.existingArrow.className} yobicon-right vmiddle`}
                              data-stylex-owner="project-fork-existing-arrow"
                            ></i>
                            <Link
                              to={projectPath(forkOwnerName, forkProjectName)}
                              {...sx.existingLink}
                              className={`${sx.existingLink.className} vmiddle`}
                              data-stylex-owner="project-fork-existing-link"
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
              <div {...sx.group} data-stylex-owner="project-fork-owner-group">
                <label
                  {...sx.label}
                  data-stylex-owner="project-fork-owner-label"
                  htmlFor="inputOwner"
                >
                  {t("project.owner")}
                </label>
                <div {...sx.controls} data-stylex-owner="project-fork-owner-controls">
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
              <div {...sx.group} data-stylex-owner="project-fork-name-group">
                <label
                  {...sx.label}
                  data-stylex-owner="project-fork-name-label"
                  htmlFor="inputName"
                >
                  {t("project.name")}
                </label>
                <div {...sx.controls} data-stylex-owner="project-fork-name-controls">
                  <input
                    {...sx.input}
                    data-stylex-owner="project-fork-name-input"
                    type="text"
                    id="inputName"
                    name="name"
                    defaultValue={selectedName}
                  />
                  <span
                    {...stylex.props(styles.helpInline)}
                    className={`${stylex.props(styles.helpInline).className} help-inline`}
                    data-stylex-owner="project-fork-name-help"
                  >
                    {t("project.name.alert")}{" "}
                  </span>
                </div>
              </div>
              <div {...sx.group} data-stylex-owner="project-fork-scope-group">
                <label {...sx.label} data-stylex-owner="project-fork-scope-label">
                  {t("project.shareOption")}
                </label>
                <div {...sx.controls} data-stylex-owner="project-fork-scope-controls">
                  <input
                    name="projectScope"
                    type="radio"
                    id="public"
                    value="PUBLIC"
                    {...stylex.props(styles.radio)}
                    className={`${stylex.props(styles.radio).className} radio-btn`}
                    data-stylex-owner="project-fork-public-radio"
                    defaultChecked
                  />{" "}
                  <label
                    {...stylex.props(styles.radio)}
                    htmlFor="public"
                    className={`${stylex.props(styles.radio).className} bg-radiobtn label-public`}
                    data-stylex-owner="project-fork-public-label"
                  >
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
                        {...stylex.props(styles.radio)}
                        className={`${stylex.props(styles.radio).className} radio-btn`}
                        data-stylex-owner="project-fork-protected-radio"
                      />{" "}
                      <label
                        {...stylex.props(styles.radio)}
                        htmlFor="protected"
                        className={`${stylex.props(styles.radio).className} bg-radiobtn label-protected`}
                        data-stylex-owner="project-fork-protected-label"
                      >
                        {t("project.protected")}
                      </label>
                    </>
                  ) : null}{" "}
                  <input
                    name="projectScope"
                    type="radio"
                    id="private"
                    value="PRIVATE"
                    {...stylex.props(styles.radio)}
                    className={`${stylex.props(styles.radio).className} radio-btn`}
                    data-stylex-owner="project-fork-private-radio"
                  />{" "}
                  <label
                    {...stylex.props(styles.radio)}
                    htmlFor="private"
                    className={`${stylex.props(styles.radio).className} bg-radiobtn label-private`}
                    data-stylex-owner="project-fork-private-label"
                  >
                    {t("project.private")}
                  </label>
                </div>
              </div>
              <div {...sx.group} data-stylex-owner="project-fork-actions">
                <div {...sx.controls}>
                  <button {...sx.action} data-stylex-owner="project-fork-submit" type="submit">
                    {t("fork")}
                  </button>{" "}
                  <Link
                    to={pullRequestsPath(ownerName, projectName)}
                    {...sx.cancel}
                    data-stylex-owner="project-fork-cancel"
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
