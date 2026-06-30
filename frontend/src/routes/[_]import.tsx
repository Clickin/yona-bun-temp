import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
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
  const ownerOptions = optionsQuery.data?.ownerOptions ?? [];
  const selectedOwner =
    ownerOptions.find((option) => option.selected)?.ownerName ??
    optionsQuery.data?.selectedOwnerName ??
    ownerOptions[0]?.ownerName ??
    "";
  const [usesRepoAuth, setUsesRepoAuth] = React.useState(false);
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
      url: String(formData.get("url") ?? ""),
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
                  <a
                    href={prefixBasePath(
                      runtimeConfig.basePath,
                      `/projectform?owner=${encodeURIComponent(selectedOwner)}`,
                    )}
                    className="ybtn ybtn-small nm"
                  >
                    <strong>{t("title.newProject")}</strong>
                  </a>
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
                    defaultValue=""
                  />
                </dd>
                <dd>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      id="useRepoAuth"
                      checked={usesRepoAuth}
                      onChange={(event) => setUsesRepoAuth(event.currentTarget.checked)}
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
                            defaultValue=""
                            placeholder={t("project.import.auth.userid.desc")}
                          />
                        </dd>
                      </dl>
                      <dl className="span6">
                        <dt>{t("project.import.auth.userpw")}</dt>
                        <dd>
                          <input type="password" name="authPw" className="text" />
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
                    defaultValue={selectedOwner}
                  >
                    {ownerOptions.map((option) => (
                      <OwnerOption key={option.ownerName} option={option} />
                    ))}
                  </select>
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
                    defaultValue=""
                    placeholder={t("project.name.alert")}
                  />
                </dd>

                <dt>
                  <label htmlFor="description">{t("project.description")}</label>
                </dt>
                <dd>
                  <textarea
                    id="description"
                    name="overview"
                    className="text textarea.span4"
                    defaultValue=""
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
                          defaultChecked
                        />
                        <label htmlFor="public">
                          <strong className="ml5">{t("project.public")}</strong>
                          <p className="note">{t("project.public.notice")}</p>
                        </label>
                      </li>

                      <li id="opt-protected" className="mt10" style={{ display: "none" }}>
                        <input
                          type="radio"
                          id="protected"
                          name="projectScope"
                          value="PROTECTED"
                          className="radio-btn pull-left"
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
                    <MenuCheckbox id="menuSettingCode" name="code" label={t("menu.code")} />
                    <MenuCheckbox id="menuSettingIssue" name="issue" label={t("menu.issue")} />
                    <MenuCheckbox
                      id="menuSettingPullRequest"
                      name="pullRequest"
                      label={t("menu.pullRequest")}
                    />
                    <MenuCheckbox id="menuSettingReview" name="review" label={t("menu.review")} />
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
                <a href={prefixBasePath(runtimeConfig.basePath, "/")} className="ybtn">
                  {t("button.cancel")}
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </SiteLayoutShell>
  );
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

function MenuCheckbox({ id, label, name }: { id: string; label: string; name: string }) {
  return (
    <label htmlFor={id} className="bg-radiobtn label-public inline-list">
      <input
        type="checkbox"
        className="radio-btn"
        id={id}
        name={name}
        value="true"
        defaultChecked
      />
      {label}
    </label>
  );
}
