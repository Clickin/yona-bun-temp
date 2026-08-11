import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import {
  createProjectRest,
  projectCreateFormOptionsQueryOptions,
  type ProjectCreateOwnerOption,
} from "../api/org-project";
import { apiQueryKeys } from "../api/query-keys";
import { readSessionBootstrap } from "../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YoramQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { SiteLayoutShell } from "./-home-route-screen";
type ProjectCreateSearch = {
  owner?: string;
};

type ProjectCreateFormRestore = {
  name?: string;
  overview?: string;
  owner?: string;
  ownerName?: string;
  projectScope?: string;
  vcs?: string;
};

const legacyProjectCreateCancelLinkActiveOptions = {
  exact: true,
  explicitUndefined: true,
  includeHash: true,
  includeSearch: true,
} as const;
const legacyProjectCreateCancelLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};

export const Route = createFileRoute("/projectform")({
  component: ProjectCreateRoute,
  validateSearch(search): ProjectCreateSearch {
    return {
      owner: typeof search.owner === "string" ? search.owner : undefined,
    };
  },
});

function ProjectCreateRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const search = Route.useSearch();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectCreateScreen owner={search.owner} runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function ProjectCreateScreen({
  owner,
  runtimeConfig,
}: {
  owner?: string;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const optionsQuery = useQuery(projectCreateFormOptionsQueryOptions(runtimeConfig, { owner }));
  const restoredForm = optionsQuery.data as
    | (typeof optionsQuery.data & ProjectCreateFormRestore)
    | undefined;
  const ownerOptions = optionsQuery.data?.ownerOptions ?? [];
  const restoredOwner = stringField(restoredForm?.owner ?? restoredForm?.ownerName);
  const selectedOwner =
    (restoredOwner && ownerOptions.some((option) => option.ownerName === restoredOwner)
      ? restoredOwner
      : undefined) ??
    ownerOptions.find((option) => option.selected)?.ownerName ??
    optionsQuery.data?.selectedOwnerName ??
    ownerOptions[0]?.ownerName ??
    "";
  const selectedOwnerOption = ownerOptions.find((option) => option.ownerName === selectedOwner);
  const [ownerName, setOwnerName] = React.useState(selectedOwner);
  const isSelectedOwnerGroup =
    ownerOptions.find((option) => option.ownerName === ownerName)?.organization ??
    selectedOwnerOption?.organization ??
    false;
  const defaultProjectScope = normalizeDefaultProjectScope(runtimeConfig.projectDefaultScope);
  const defaultMenus = React.useMemo(
    () => projectDefaultMenus(runtimeConfig.projectDefaultMenus),
    [runtimeConfig.projectDefaultMenus],
  );
  const [vcs, setVcs] = React.useState("GIT");
  const [projectScope, setProjectScope] = React.useState(defaultProjectScope);
  const [projectName, setProjectName] = React.useState("");
  const [overview, setOverview] = React.useState("");
  const [nameError, setNameError] = React.useState<string | undefined>();
  const [menuCodeChecked, setMenuCodeChecked] = React.useState(() => defaultMenus.has("code"));
  const [menuPullRequestChecked, setMenuPullRequestChecked] = React.useState(() =>
    defaultMenus.has("pullRequest"),
  );
  const [menuReviewChecked, setMenuReviewChecked] = React.useState(() =>
    defaultMenus.has("review"),
  );
  React.useEffect(() => {
    if (!ownerName && selectedOwner) {
      setOwnerName(selectedOwner);
    }
  }, [ownerName, selectedOwner]);
  React.useEffect(() => {
    const restoredProjectName = stringField(restoredForm?.name);
    if (restoredProjectName !== undefined && !projectName) {
      setProjectName(restoredProjectName);
    }
    const restoredOverview = stringField(restoredForm?.overview);
    if (restoredOverview !== undefined && !overview) {
      setOverview(restoredOverview);
    }
    const restoredProjectScope = normalizeRestoredProjectScope(restoredForm?.projectScope);
    if (restoredProjectScope) {
      setProjectScope(restoredProjectScope);
    }
    const restoredVcs = normalizeRestoredVcs(restoredForm?.vcs);
    if (restoredVcs) {
      setVcs(restoredVcs);
      if (restoredVcs === "SUBVERSION") {
        setMenuPullRequestChecked(true);
      }
    }
  }, [overview, projectName, restoredForm]);
  const createMutation = useMutation({
    mutationFn: async (input: {
      board: boolean;
      code: boolean;
      issue: boolean;
      milestone: boolean;
      overview: string;
      ownerName: string;
      projectName: string;
      projectScope: string;
      pullRequest: boolean;
      review: boolean;
      vcs: string;
    }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return createProjectRest(runtimeConfig, csrfToken, input.ownerName, input);
    },
    async onSuccess(project) {
      await queryClient.invalidateQueries({ queryKey: apiQueryKeys.project.list() });
      router.history.push(
        prefixBasePath(runtimeConfig.basePath, `/${project.ownerName}/${project.projectName}`),
      );
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const projectName = String(formData.get("name") ?? "");
    const validationError = validateProjectName(projectName, t);
    if (validationError) {
      setNameError(validationError);
      return;
    }
    setNameError(undefined);
    const ownerName = String(formData.get("owner") ?? "");
    createMutation.mutate({
      board: formData.has("board"),
      code: formData.has("code"),
      issue: formData.has("issue"),
      milestone: formData.has("milestone"),
      overview: String(formData.get("overview") ?? ""),
      ownerName,
      projectName,
      projectScope: String(formData.get("projectScope") ?? "PUBLIC"),
      pullRequest: formData.has("pullRequest"),
      review: formData.has("review"),
      vcs: String(formData.get("vcs") ?? "GIT"),
    });
  }

  return (
    <SiteLayoutShell runtimeConfig={runtimeConfig}>
      <title>{t("title.newProject")}</title>
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className={"form-wrap new-project"} data-owner="project-form">
            <form
              id="newProjectForm"
              action={prefixBasePath(runtimeConfig.basePath, "/projects")}
              method="post"
              className="frm-wrap"
              onSubmit={handleSubmit}
            >
              <legend data-owner="project-form-legend">
                {t("title.newProject")}
                <span>
                  <small>{t("project.import.or")} &nbsp; </small>
                  <Link
                    to="/_import"
                    search={{ owner: ownerName || selectedOwner }}
                    className="ybtn ybtn-small nm"
                  >
                    <strong>{t("project.import.from.git")}</strong>
                  </Link>
                </span>
              </legend>

              <dl>
                <dt>
                  <label htmlFor="project-owner">
                    {t("project.owner")}
                    <strong data-owner="project-form-required-marker-owner">*</strong>
                  </label>
                </dt>
                <dd>
                  <select
                    id="project-owner"
                    name="owner"
                    data-format="user"
                    className={"mb10"}
                    style={{ minWidth: "220px" }}
                    data-owner="project-form-owner"
                    value={ownerName}
                    onChange={(event) => {
                      const nextOwner = event.currentTarget.value;
                      setOwnerName(nextOwner);
                      const nextOwnerIsGroup = ownerOptions.find(
                        (option) => option.ownerName === nextOwner,
                      )?.organization;
                      if (!nextOwnerIsGroup && projectScope === "PROTECTED") {
                        setProjectScope("PUBLIC");
                      }
                    }}
                  >
                    {ownerOptions.map((option) => (
                      <OwnerOption key={option.ownerName} option={option} />
                    ))}
                  </select>
                </dd>

                <dt>
                  <label htmlFor="project-name">
                    {t("project.name")}
                    <strong data-owner="project-form-required-marker-name">*</strong>
                  </label>
                </dt>
                <dd>
                  <input
                    id="project-name"
                    type="text"
                    name="name"
                    className="text"
                    maxLength={250}
                    value={projectName}
                    onBlur={() => {
                      setProjectName((current) => current.trim().replace(/ /gu, "-"));
                    }}
                    onChange={(event) => {
                      setProjectName(event.currentTarget.value);
                      setNameError(undefined);
                    }}
                    placeholder={t("project.name.placeholder")}
                    data-owner="project-form-name"
                  />
                  {nameError ? (
                    <div
                      className={"popover fade left in"}
                      role="tooltip"
                      data-owner="project-form-name-error"
                    >
                      <div className="arrow" />
                      <div className="popover-content">{nameError}</div>
                    </div>
                  ) : null}
                </dd>

                <dt>
                  <label htmlFor="description">{t("project.description")}</label>
                </dt>
                <dd>
                  <textarea
                    id="description"
                    name="overview"
                    className="text textarea.span4"
                    value={overview}
                    onChange={(event) => setOverview(event.currentTarget.value)}
                    data-owner="project-form-description"
                  />
                </dd>
              </dl>

              <div className={"advanced-options"} data-owner="project-form-advanced">
                <div className="row-fluid">
                  <div className={"span2 mt10"} data-owner="project-form-share-option-label">
                    {t("project.shareOption")}
                  </div>
                  <div className="span10">
                    <ul className={"unstyled project-scopes mt10"} data-owner="project-form-scopes">
                      <li>
                        <input
                          type="radio"
                          id="public"
                          name="projectScope"
                          value="PUBLIC"
                          className="radio-btn pull-left"
                          checked={projectScope === "PUBLIC"}
                          onChange={() => setProjectScope("PUBLIC")}
                        />
                        <label htmlFor="public">
                          <strong className="ml5" data-owner="project-form-public-visibility-label">
                            {t("project.public")}
                          </strong>
                          <p className={"note"} data-owner="project-form-scope-note">
                            {t("project.public.notice")}
                          </p>
                        </label>
                      </li>

                      <li
                        id="opt-protected"
                        className={"mt10"}
                        style={isSelectedOwnerGroup ? undefined : { display: "none" }}
                        data-owner="project-form-protected-scope"
                      >
                        <input
                          type="radio"
                          id="protected"
                          name="projectScope"
                          value="PROTECTED"
                          className="radio-btn pull-left"
                          checked={projectScope === "PROTECTED"}
                          onChange={() => setProjectScope("PROTECTED")}
                        />
                        <label htmlFor="protected">
                          <strong
                            className="ml5"
                            data-owner="project-form-protected-visibility-label"
                          >
                            {t("project.protected")}
                          </strong>
                          <p className={"note"} data-owner="project-form-scope-note">
                            {t("project.protected.notice")}
                          </p>
                        </label>
                      </li>

                      <li className={"mt10"}>
                        <input
                          type="radio"
                          id="private"
                          name="projectScope"
                          value="PRIVATE"
                          className="radio-btn pull-left"
                          checked={projectScope === "PRIVATE"}
                          onChange={() => setProjectScope("PRIVATE")}
                        />
                        <label htmlFor="private">
                          <strong
                            className="ml5"
                            data-owner="project-form-private-visibility-label"
                          >
                            {t("project.private")}
                          </strong>
                          <p className={"note"} data-owner="project-form-scope-note">
                            {t("project.private.notice")}
                          </p>
                        </label>
                      </li>
                    </ul>
                  </div>
                </div>

                <hr />

                <div className="row-fluid">
                  <div className={"span2 mt10"} data-owner="project-form-vcs-label">
                    <label htmlFor="vcs">{t("project.vcs")}</label>
                  </div>
                  <div className="span10 cu-desc">
                    <select
                      id="vcs"
                      name="vcs"
                      data-dropdown-css-class="select2-without-searchbox"
                      className={"mb10 mt5"}
                      style={{ minWidth: "220px" }}
                      data-owner="project-form-vcs"
                      value={vcs}
                      onChange={(event) => {
                        const nextVcs = event.currentTarget.value;
                        setVcs(nextVcs);
                        setMenuPullRequestChecked(true);
                      }}
                    >
                      <option value="GIT">{t("project.new.vcsType.git")}</option>
                      <option value="SUBVERSION">{t("project.new.vcsType.subversion")}</option>
                    </select>

                    <span
                      id="svn"
                      className={`ml10 notice${vcs === "GIT" ? " is-hidden" : ""}`}
                      data-owner="project-form-vcs-warning"
                    >
                      {t("project.svn.warning")}
                    </span>
                  </div>
                </div>

                <hr />

                <div className="row-fluid">
                  <div className={"span2"} data-owner="project-form-menu-setting-label">
                    {t("project.menu.setting")}
                  </div>
                  <div className="span10">
                    <MenuCheckbox
                      id="menuSettingCode"
                      name="code"
                      label={t("menu.code")}
                      checked={menuCodeChecked}
                      onChange={(checked) => {
                        setMenuCodeChecked(checked);
                        if (!checked) {
                          setMenuPullRequestChecked(false);
                          setMenuReviewChecked(false);
                        }
                      }}
                    />
                    <MenuCheckbox
                      id="menuSettingIssue"
                      name="issue"
                      label={t("menu.issue")}
                      defaultChecked={defaultMenus.has("issue")}
                    />
                    <MenuCheckbox
                      id="menuSettingPullRequest"
                      name="pullRequest"
                      label={t("menu.pullRequest")}
                      checked={menuPullRequestChecked}
                      hidden={vcs === "SUBVERSION"}
                      onChange={(checked) => {
                        setMenuPullRequestChecked(checked);
                        if (checked) {
                          setMenuCodeChecked(true);
                        }
                      }}
                    />
                    <MenuCheckbox
                      id="menuSettingReview"
                      name="review"
                      label={t("menu.review")}
                      checked={menuReviewChecked}
                      onChange={(checked) => {
                        setMenuReviewChecked(checked);
                        if (checked) {
                          setMenuCodeChecked(true);
                        }
                      }}
                    />
                    <MenuCheckbox
                      id="menuSettingMilestone"
                      name="milestone"
                      label={t("milestone")}
                      defaultChecked={defaultMenus.has("milestone")}
                    />
                    <MenuCheckbox
                      id="menuSettingBoard"
                      name="board"
                      label={t("menu.board")}
                      defaultChecked={defaultMenus.has("board")}
                    />
                  </div>
                </div>
              </div>

              <div className={"actions mt20"} data-owner="project-form-actions">
                <button className="ybtn ybtn-success" disabled={createMutation.isPending}>
                  {t("project.create")}
                </button>
                <Link
                  to="/"
                  className="ybtn"
                  activeOptions={legacyProjectCreateCancelLinkActiveOptions}
                  activeProps={legacyProjectCreateCancelLinkActiveProps}
                >
                  {t("button.cancel")}
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </SiteLayoutShell>
  );
}

function OwnerOption({ option }: { option: ProjectCreateOwnerOption }) {
  return <option value={option.ownerName}>{option.ownerName}</option>;
}

function MenuCheckbox({
  checked,
  defaultChecked = true,
  hidden,
  id,
  label,
  name,
  onChange,
}: {
  checked?: boolean;
  defaultChecked?: boolean;
  hidden?: boolean;
  id: string;
  label: string;
  name: string;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="bg-radiobtn label-public inline-list"
      data-owner={`project-form-menu-${name}`}
      hidden={hidden}
    >
      <input
        type="checkbox"
        className="radio-btn"
        id={id}
        name={name}
        value="true"
        checked={checked}
        defaultChecked={checked === undefined ? defaultChecked : undefined}
        onChange={(event) => onChange?.(event.currentTarget.checked)}
      />
      {label}
    </label>
  );
}

function normalizeDefaultProjectScope(
  scope: string | undefined,
): "PUBLIC" | "PROTECTED" | "PRIVATE" {
  const normalized = (scope ?? "").trim().toUpperCase();
  return normalized === "PROTECTED" || normalized === "PRIVATE" ? normalized : "PUBLIC";
}

function normalizeRestoredProjectScope(
  scope: string | undefined,
): "PUBLIC" | "PROTECTED" | "PRIVATE" | undefined {
  const normalized = (scope ?? "").trim().toUpperCase();
  return normalized === "PUBLIC" || normalized === "PROTECTED" || normalized === "PRIVATE"
    ? normalized
    : undefined;
}

function normalizeRestoredVcs(vcs: string | undefined): "GIT" | "SUBVERSION" | undefined {
  const normalized = (vcs ?? "").trim().toUpperCase();
  return normalized === "GIT" || normalized === "SUBVERSION" ? normalized : undefined;
}

function projectDefaultMenus(menus: string[] | undefined): Set<string> {
  const defaults = menus?.length
    ? menus
    : ["code", "issue", "pullRequest", "review", "milestone", "board"];
  return new Set(defaults);
}

function validateProjectName(projectName: string, t: (key: string) => string): string | undefined {
  if (!/^[0-9A-Za-z-_.\uac00-\ud7a3]+$/u.test(projectName)) {
    return t("project.name.alert");
  }
  if (projectName === "." || projectName === ".." || projectName === ".git") {
    return t("project.name.reserved.alert");
  }
  return undefined;
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
