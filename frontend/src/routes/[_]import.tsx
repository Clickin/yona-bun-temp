import type { ComponentPropsWithoutRef } from "react";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useLinkProps, useRouter } from "@tanstack/react-router";
import { jsx as reactJsx } from "react/jsx-runtime";
import {
  importProjectRest,
  projectCreateFormOptionsQueryOptions,
  type ProjectCreateOwnerOption,
} from "../api/org-project";
import { apiQueryKeys } from "../api/query-keys";
import { readSessionBootstrap } from "../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YonaQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { SiteLayoutShell } from "./-home-route-screen";

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
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectImportScreen owner={search.owner} runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
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
  const isSelectedOwnerGroup =
    ownerOptions.find((option) => option.ownerName === ownerName)?.organization ??
    selectedOwnerOption?.organization ??
    false;
  const initiallyUsesRepoAuth = initialAuthId !== "" || repoAuthError !== undefined;
  const [usesRepoAuth, setUsesRepoAuth] = React.useState(initiallyUsesRepoAuth);
  const [repoAuthChanged, setRepoAuthChanged] = React.useState(false);
  const [projectScope, setProjectScope] = React.useState(initialProjectScope);
  const [menuCodeChecked, setMenuCodeChecked] = React.useState(true);
  const [menuPullRequestChecked, setMenuPullRequestChecked] = React.useState(true);
  const [menuReviewChecked, setMenuReviewChecked] = React.useState(true);
  const [urlError, setUrlError] = React.useState<string | null>(null);
  const [projectNameError, setProjectNameError] = React.useState<string | null>(null);
  const cancelHref = runtimeConfig.basePath === "/" ? "/" : runtimeConfig.basePath;
  const cancelLinkProps = useLinkProps({
    activeOptions: legacyImportActionLinkActiveOptions,
    activeProps: legacyImportActionLinkActiveProps,
    className: "ybtn",
    href: cancelHref,
    onClick: (event) => {
      event.preventDefault();
      router.history.push(cancelHref);
    },
    to: "/" as const,
  });
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
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="form-wrap new-project">
            <form
              id="importGit"
              action={prefixBasePath(runtimeConfig.basePath, "/_import")}
              method="post"
              className="frm-wrap"
              onSubmit={handleSubmit}
            >
              <legend>
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

              <dl>
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
                    id="repoAuth"
                    className="repo-auth-wrap"
                    style={usesRepoAuth ? { display: "block" } : undefined}
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
                  <select
                    id="project-owner"
                    name="owner"
                    data-toggle="select2"
                    data-format="user"
                    className="mb10"
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

              <div className="advanced-options">
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
                    <select data-toggle="select2" className="mb10 mt5" disabled>
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
                <LegacyHrefAnchor {...cancelLinkProps} legacyHref={cancelHref}>
                  {t("button.cancel")}
                </LegacyHrefAnchor>
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

function OwnerOption({ option }: { option: ProjectCreateOwnerOption }) {
  return (
    <option
      data-type={option.organization ? "group" : "user"}
      data-avatar-url={option.avatarUrl ?? ""}
      value={option.ownerName}
    >
      {option.ownerName}
    </option>
  );
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

function LegacyHrefAnchor({
  children,
  legacyHref,
  href: _href,
  ...props
}: ComponentPropsWithoutRef<"a"> & { legacyHref: string }) {
  return reactJsx("a", {
    ...props,
    href: legacyHref,
    children,
  });
}
