import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { importProjectRest, projectCreateFormOptionsQueryOptions } from "../api/org-project";
import { apiQueryKeys } from "../api/query-keys";
import { readSessionBootstrap } from "../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YoramQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { SiteLayoutShell } from "./-home-route-screen";
import { styles } from "./-project-import.stylex";

type ProjectImportSearch = {
  owner?: string;
};

type ProjectImportFormOptionsState = {
  errors?: Record<string, string | string[] | undefined>;
  form?: Record<string, string | undefined>;
  formErrors?: Record<string, string | string[] | undefined>;
  formValues?: Record<string, string | undefined>;
};

const legacyImportActionLinkActiveOptions = {
  exact: true,
  explicitUndefined: true,
} as const;
const legacyImportActionLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};

export const Route = createFileRoute("/_import")({
  component: ProjectImportRoute,
  validateSearch(search): ProjectImportSearch {
    return {
      owner: typeof search.owner === "string" ? search.owner : undefined,
    };
  },
});

function ProjectImportRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const search = Route.useSearch();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectImportScreen owner={search.owner} runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function ProjectImportScreen({
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
  const initialFormState = (optionsQuery.data ?? {}) as ProjectImportFormOptionsState;
  const initialFormValues = initialFormState.formValues ?? initialFormState.form ?? {};
  const initialFormErrors = initialFormState.formErrors ?? initialFormState.errors ?? {};
  const initialUrl = initialFormValues.url ?? "";
  const initialAuthId = initialFormValues.authId ?? "";
  const initialProjectName = initialFormValues.name ?? "";
  const initialOverview = initialFormValues.overview ?? "";
  const initialProjectScope = normalizeProjectScope(initialFormValues.projectScope);
  const repoAuthError = firstError(initialFormErrors.repoAuth);
  const ownerError = firstError(initialFormErrors.owner);
  const ownerOptions = optionsQuery.data?.ownerOptions ?? [];
  const selectedOwner =
    initialFormValues.owner ??
    ownerOptions.find((option) => option.selected)?.ownerName ??
    optionsQuery.data?.selectedOwnerName ??
    ownerOptions[0]?.ownerName ??
    "";
  const selectedOwnerOption = ownerOptions.find((option) => option.ownerName === selectedOwner);
  const [ownerName, setOwnerName] = React.useState(selectedOwner);
  const [ownerMenuOpen, setOwnerMenuOpen] = React.useState(false);
  const currentOwnerOption = ownerOptions.find((option) => option.ownerName === ownerName);
  const isSelectedOwnerGroup =
    ownerOptions.find((option) => option.ownerName === ownerName)?.organization ??
    selectedOwnerOption?.organization ??
    false;
  const initiallyUsesRepoAuth = initialAuthId !== "" || repoAuthError !== undefined;
  const [usesRepoAuth, setUsesRepoAuth] = React.useState(initiallyUsesRepoAuth);
  const repoAuthStyleProps = usesRepoAuth ? stylex.props(styles.repoAuthVisible) : undefined;
  const [repoAuthChanged, setRepoAuthChanged] = React.useState(false);
  const [projectScope, setProjectScope] = React.useState(initialProjectScope);
  const [menuCodeChecked, setMenuCodeChecked] = React.useState(true);
  const [menuPullRequestChecked, setMenuPullRequestChecked] = React.useState(true);
  const [menuReviewChecked, setMenuReviewChecked] = React.useState(true);
  const [urlError, setUrlError] = React.useState<string | null>(null);
  const [projectNameError, setProjectNameError] = React.useState<string | null>(null);
  const authIdRef = React.useRef<HTMLInputElement>(null);
  const didFocusInitialFieldRef = React.useRef(false);
  const urlRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (!ownerName && selectedOwner) {
      setOwnerName(selectedOwner);
    }
  }, [ownerName, selectedOwner]);
  React.useEffect(() => {
    if (!repoAuthChanged) {
      setUsesRepoAuth(initiallyUsesRepoAuth);
    }
  }, [initiallyUsesRepoAuth, repoAuthChanged]);
  React.useEffect(() => {
    setProjectScope(initialProjectScope);
  }, [initialProjectScope]);
  React.useEffect(() => {
    if (
      didFocusInitialFieldRef.current ||
      !optionsQuery.isSuccess ||
      usesRepoAuth !== initiallyUsesRepoAuth
    ) {
      return;
    }
    didFocusInitialFieldRef.current = true;
    if (usesRepoAuth) {
      authIdRef.current?.focus();
    } else {
      urlRef.current?.focus();
    }
  }, [initiallyUsesRepoAuth, optionsQuery.isSuccess, usesRepoAuth]);
  const importMutation = useMutation({
    mutationFn: async (input: {
      authId: string;
      authPw: string;
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
      url: string;
      vcs: string;
    }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return importProjectRest(runtimeConfig, csrfToken, input);
    },
    async onSuccess(response) {
      await queryClient.invalidateQueries({ queryKey: apiQueryKeys.project.list() });
      router.history.push(prefixBasePath(runtimeConfig.basePath, response.redirectPath));
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const url = String(formData.get("url") ?? "");
    const projectName = String(formData.get("name") ?? "");
    const nextProjectNameError = validateProjectName(projectName, t);
    const nextUrlError = url.trim().length === 0 ? t("project.import.error.empty.url") : null;
    setProjectNameError(nextProjectNameError);
    setUrlError(nextUrlError);
    if (nextProjectNameError || nextUrlError) {
      return;
    }
    importMutation.mutate({
      authId: String(formData.get("authId") ?? ""),
      authPw: String(formData.get("authPw") ?? ""),
      board: formData.has("board"),
      code: formData.has("code"),
      issue: formData.has("issue"),
      milestone: formData.has("milestone"),
      overview: String(formData.get("overview") ?? ""),
      ownerName: String(formData.get("owner") ?? ""),
      projectName: String(formData.get("name") ?? ""),
      projectScope: String(formData.get("projectScope") ?? "PUBLIC"),
      pullRequest: formData.has("pullRequest"),
      review: formData.has("review"),
      url,
      vcs: String(formData.get("vcs") ?? "GIT"),
    });
  }

  return (
    <SiteLayoutShell runtimeConfig={runtimeConfig}>
      <title>{t("title.newProject")}</title>
      <div
        className={`${stylex.props(styles.page).className} page-wrap-outer`}
        data-stylex-owner="project-import-page"
      >
        <div className="project-page-wrap">
          <div
            className={`${stylex.props(styles.form).className} form-wrap new-project`}
            data-stylex-owner="project-import-form-wrap"
          >
            <form
              id="importGit"
              action={prefixBasePath(runtimeConfig.basePath, "/_import")}
              method="post"
              className="frm-wrap"
              onSubmit={handleSubmit}
            >
              <legend data-stylex-owner="project-import-heading">
                {t("project.import.from.git")}
                <span>
                  <small>{t("project.import.or")} &nbsp; </small>
                  <Link
                    to="/projectform"
                    search={{ owner: ownerName || selectedOwner }}
                    className="ybtn ybtn-small nm"
                    activeOptions={legacyImportActionLinkActiveOptions}
                    activeProps={legacyImportActionLinkActiveProps}
                  >
                    <strong>{t("title.newProject")}</strong>
                  </Link>
                </span>
              </legend>

              <dl data-stylex-owner="project-import-fields">
                <dt>
                  <label htmlFor="url">
                    {t("project.git.repository.url")}
                    <strong className="orange-txt">*</strong>
                  </label>
                </dt>
                <dd>
                  <input
                    id="url"
                    type="text"
                    name="url"
                    className="text"
                    placeholder={t("project.git.url.alert")}
                    ref={urlRef}
                    key={initialUrl}
                    defaultValue={initialUrl}
                    onChange={() => {
                      if (urlError) {
                        setUrlError(null);
                      }
                    }}
                    aria-invalid={urlError ? true : undefined}
                  />
                  {urlError ? (
                    <div className="popover fade left in">
                      <div className="arrow" />
                      <div className="popover-content">{urlError}</div>
                    </div>
                  ) : null}
                </dd>
                <dd>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      id="useRepoAuth"
                      checked={usesRepoAuth}
                      onChange={(event) => {
                        setUrlError(null);
                        setProjectNameError(null);
                        setRepoAuthChanged(true);
                        setUsesRepoAuth(event.currentTarget.checked);
                      }}
                    />{" "}
                    {t("project.import.auth.required")}
                  </label>

                  <div
                    {...repoAuthStyleProps}
                    id="repoAuth"
                    className={`repo-auth-wrap ${repoAuthStyleProps?.className ?? ""}`.trim()}
                    data-stylex-owner="project-import-repo-auth"
                  >
                    <div className="row-fluid">
                      <dl className="span6">
                        <dt>{t("project.import.auth.userid")}</dt>
                        <dd>
                          <input
                            type="text"
                            name="authId"
                            className="text"
                            ref={authIdRef}
                            key={initialAuthId}
                            defaultValue={initialAuthId}
                            disabled={repoAuthChanged && !usesRepoAuth}
                            placeholder={t("project.import.auth.userid.desc")}
                          />
                        </dd>
                      </dl>
                      <dl className="span6">
                        <dt>{t("project.import.auth.userpw")}</dt>
                        <dd>
                          <input
                            type="password"
                            name="authPw"
                            className="text"
                            disabled={repoAuthChanged && !usesRepoAuth}
                          />
                        </dd>
                      </dl>
                    </div>
                  </div>
                </dd>

                <dt className="bordertop">
                  <label htmlFor="project-owner">
                    {t("project.owner")}
                    <strong className="orange-txt">*</strong>
                  </label>
                </dt>
                <dd>
                  <div
                    {...stylex.props(styles.selectContainer)}
                    className={`${stylex.props(styles.selectContainer).className} select2-container mb10${ownerMenuOpen ? " select2-dropdown-open select2-container-active" : ""}`}
                    data-stylex-owner="project-import-owner-select"
                  >
                    <button
                      type="button"
                      {...stylex.props(styles.selectButton)}
                      className={`${stylex.props(styles.selectButton).className} select2-choice`}
                      aria-expanded={ownerMenuOpen}
                      onClick={() => setOwnerMenuOpen((open) => !open)}
                    >
                      <span className="select2-chosen">
                        <span className="usf-group" title={`${ownerName} `}>
                          <span className="avatar-wrap smaller">
                            <img
                              src={prefixBasePath(
                                runtimeConfig.basePath,
                                currentOwnerOption?.avatarUrl?.trim() ||
                                  (isSelectedOwnerGroup
                                    ? "/assets/images/group_default.png"
                                    : "/assets/images/default-avatar-128.png"),
                              )}
                              width="20"
                              height="20"
                              alt=""
                            />
                          </span>
                          <strong className="name">{ownerName}</strong>
                          <span className="loginid"></span>
                        </span>
                      </span>
                      <span className="select2-arrow" aria-hidden="true">
                        <b></b>
                      </span>
                    </button>
                    <input
                      className="select2-focusser select2-offscreen"
                      type="text"
                      disabled={ownerMenuOpen}
                      aria-label={t("project.owner")}
                    />
                    <div
                      className={`select2-drop select2-display-none select2-with-searchbox${ownerMenuOpen ? " select2-drop-active" : ""}`}
                      {...(ownerMenuOpen ? stylex.props(styles.selectDropOpen) : {})}
                    >
                      <div className="select2-search">
                        <input
                          type="text"
                          className={`select2-input${ownerMenuOpen ? " select2-focused" : ""}`}
                          aria-label={t("project.owner")}
                        />
                      </div>
                      <ul className="select2-results">
                        {ownerOptions.map((option) => (
                          <li
                            key={option.ownerName}
                            className={`select2-results-dept-0 select2-result select2-result-selectable${option.ownerName === ownerName ? " select2-selected" : ""}`}
                          >
                            <button
                              type="button"
                              {...stylex.props(styles.selectButton)}
                              className={`${stylex.props(styles.selectButton).className} select2-result-label`}
                              onClick={() => {
                                setOwnerName(option.ownerName);
                                setOwnerMenuOpen(false);
                                if (!option.organization && projectScope === "PROTECTED") {
                                  setProjectScope("PUBLIC");
                                }
                              }}
                            >
                              <span className="usf-group" title={`${option.ownerName} `}>
                                <span className="avatar-wrap smaller">
                                  <img
                                    src={prefixBasePath(
                                      runtimeConfig.basePath,
                                      option.avatarUrl?.trim() ||
                                        (option.organization
                                          ? "/assets/images/group_default.png"
                                          : "/assets/images/default-avatar-128.png"),
                                    )}
                                    width="20"
                                    height="20"
                                    alt=""
                                  />
                                </span>
                                <strong className="name">{option.ownerName}</strong>
                                <span className="loginid"></span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <select
                    id="project-owner"
                    name="owner"
                    data-format="user"
                    className="mb10 select2-offscreen"
                    tabIndex={-1}
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
                      <option key={option.ownerName} value={option.ownerName}>
                        {option.ownerName}
                      </option>
                    ))}
                  </select>
                  {ownerError ? (
                    <span className="orange-text">{t(ownerError, { fallback: ownerError })}</span>
                  ) : null}
                </dd>

                <dt>
                  <label htmlFor="project-name">
                    {t("project.name")}
                    <strong className="orange-txt">*</strong>
                  </label>
                </dt>
                <dd>
                  <input
                    id="project-name"
                    type="text"
                    name="name"
                    className="text"
                    maxLength={250}
                    key={initialProjectName}
                    defaultValue={initialProjectName}
                    placeholder={t("project.name.alert")}
                    onBlur={(event) => {
                      event.currentTarget.value = event.currentTarget.value
                        .trim()
                        .replaceAll(" ", "-");
                    }}
                    onChange={() => {
                      if (projectNameError) {
                        setProjectNameError(null);
                      }
                    }}
                    aria-invalid={projectNameError ? true : undefined}
                  />
                  {projectNameError ? (
                    <div className="popover fade left in">
                      <div className="arrow" />
                      <div className="popover-content">{projectNameError}</div>
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
                    key={initialOverview}
                    defaultValue={initialOverview}
                  />
                </dd>
              </dl>

              <div
                className={`${stylex.props(styles.advanced).className} advanced-options`}
                data-stylex-owner="project-import-advanced"
              >
                <div className="row-fluid">
                  <div className="span2 right-txt mt10">{t("project.shareOption")}</div>
                  <div className="span10">
                    <ul className="unstyled project-scopes mt10">
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
                          <strong className="ml5">{t("project.public")}</strong>
                          <p className="note">{t("project.public.notice")}</p>
                        </label>
                      </li>

                      <li
                        id="opt-protected"
                        className="mt10"
                        style={isSelectedOwnerGroup ? undefined : { display: "none" }}
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
                          <strong className="ml5">{t("project.protected")}</strong>
                          <p className="note">{t("project.protected.notice")}</p>
                        </label>
                      </li>

                      <li className="mt10">
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
                          <strong className="ml5">{t("project.private")}</strong>
                          <p className="note">{t("project.private.notice")}</p>
                        </label>
                      </li>
                    </ul>
                  </div>
                </div>

                <hr />

                <div className="row-fluid">
                  <div className="span2 right-txt mt10">
                    <label htmlFor="vcs">{t("project.vcs")}</label>
                  </div>
                  <div className="span10 cu-desc">
                    <div
                      {...stylex.props(styles.selectContainer)}
                      className={`${stylex.props(styles.selectContainer).className} select2-container select2-container-disabled mb10 mt5`}
                      data-stylex-owner="project-import-vcs-select"
                    >
                      <button
                        type="button"
                        {...stylex.props(styles.selectButton)}
                        className={`${stylex.props(styles.selectButton).className} select2-choice`}
                        disabled
                      >
                        <span className="select2-chosen">{t("project.new.vcsType.git")}</span>
                        <span className="select2-arrow" aria-hidden="true">
                          <b></b>
                        </span>
                      </button>
                      <input
                        className="select2-focusser select2-offscreen"
                        type="text"
                        disabled
                        aria-label={t("project.vcs")}
                      />
                      <div className="select2-drop select2-display-none select2-with-searchbox">
                        <div className="select2-search">
                          <input className="select2-input" type="text" disabled />
                        </div>
                        <ul className="select2-results"></ul>
                      </div>
                    </div>
                    <select className="mb10 mt5 select2-offscreen" disabled tabIndex={-1}>
                      <option>{t("project.new.vcsType.git")}</option>
                    </select>
                    <input type="hidden" name="vcs" value="GIT" />
                  </div>
                </div>

                <hr />

                <div className="row-fluid">
                  <div className="span2 right-txt">{t("project.menu.setting")}</div>
                  <div className="span10 cu-desc">
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
                    <MenuCheckbox id="menuSettingIssue" name="issue" label={t("menu.issue")} />
                    <MenuCheckbox
                      id="menuSettingPullRequest"
                      name="pullRequest"
                      label={t("menu.pullRequest")}
                      checked={menuPullRequestChecked}
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
                    />
                    <MenuCheckbox id="menuSettingBoard" name="board" label={t("menu.board")} />
                  </div>
                </div>
              </div>

              <div className="actions mt20">
                <button className="ybtn ybtn-primary" disabled={importMutation.isPending}>
                  {t("project.create")}
                </button>
                <Link
                  to="/"
                  className="ybtn"
                  activeOptions={legacyImportActionLinkActiveOptions}
                  activeProps={legacyImportActionLinkActiveProps}
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

function firstError(error: string | string[] | undefined) {
  return Array.isArray(error) ? error[0] : error;
}

function normalizeProjectScope(scope: string | undefined) {
  const normalized = scope?.toUpperCase();
  return normalized === "PROTECTED" || normalized === "PRIVATE" ? normalized : "PUBLIC";
}

function validateProjectName(projectName: string, t: (key: string) => string) {
  if (projectName.length === 0 || !/^[0-9A-Za-z-_.가-힣]+$/.test(projectName)) {
    return t("project.name.alert");
  }
  if (projectName === "." || projectName === ".." || projectName === ".git") {
    return t("project.name.reserved.alert");
  }
  return null;
}

function MenuCheckbox({
  checked,
  id,
  label,
  name,
  onChange,
}: {
  checked?: boolean;
  id: string;
  label: string;
  name: string;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="bg-radiobtn label-public inline-list">
      <input
        type="checkbox"
        className="radio-btn"
        id={id}
        name={name}
        value="true"
        checked={checked}
        defaultChecked={checked === undefined ? true : undefined}
        onChange={(event) => onChange?.(event.currentTarget.checked)}
      />
      {label}
    </label>
  );
}
