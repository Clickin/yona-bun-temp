import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  createProjectRest,
  projectCreateFormOptionsQueryOptions,
  type ProjectCreateOwnerOption,
} from "../api/org-project";
import { apiQueryKeys } from "../api/query-keys";
import { readSessionBootstrap } from "../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YonaQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { SiteLayoutShell } from "./-home-route-screen";

type ProjectCreateSearch = {
  owner?: string;
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
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectCreateScreen owner={search.owner} runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
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
  const ownerOptions = optionsQuery.data?.ownerOptions ?? [];
  const selectedOwner =
    ownerOptions.find((option) => option.selected)?.ownerName ??
    optionsQuery.data?.selectedOwnerName ??
    ownerOptions[0]?.ownerName ??
    "";
  const [vcs, setVcs] = React.useState("GIT");
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
    const ownerName = String(formData.get("owner") ?? "");
    createMutation.mutate({
      board: formData.has("board"),
      code: formData.has("code"),
      issue: formData.has("issue"),
      milestone: formData.has("milestone"),
      overview: String(formData.get("overview") ?? ""),
      ownerName,
      projectName: String(formData.get("name") ?? ""),
      projectScope: String(formData.get("projectScope") ?? "PUBLIC"),
      pullRequest: formData.has("pullRequest"),
      review: formData.has("review"),
      vcs: String(formData.get("vcs") ?? "GIT"),
    });
  }

  return (
    <SiteLayoutShell runtimeConfig={runtimeConfig}>
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="form-wrap new-project">
            <form
              id="newProjectForm"
              action={prefixBasePath(runtimeConfig.basePath, "/projects")}
              method="post"
              className="frm-wrap"
              onSubmit={handleSubmit}
            >
              <legend>
                {t("title.newProject")}
                <span>
                  <small>{t("project.import.or")} &nbsp; </small>
                  <a
                    href={prefixBasePath(
                      runtimeConfig.basePath,
                      `/_import?owner=${encodeURIComponent(selectedOwner)}`,
                    )}
                    className="ybtn ybtn-small nm"
                  >
                    <strong>{t("project.import.from.git")}</strong>
                  </a>
                </span>
              </legend>

              <dl>
                <dt>
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
                    style={{ minWidth: "220px" }}
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
                    placeholder={t("project.name.placeholder")}
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
                    <select
                      id="vcs"
                      name="vcs"
                      data-toggle="select2"
                      data-dropdown-css-class="select2-without-searchbox"
                      className="mb10 mt5"
                      style={{ minWidth: "220px" }}
                      value={vcs}
                      onChange={(event) => setVcs(event.currentTarget.value)}
                    >
                      <option value="GIT">{t("project.new.vcsType.git")}</option>
                      <option value="SUBVERSION">{t("project.new.vcsType.subversion")}</option>
                    </select>

                    <span
                      id="svn"
                      className="ml10 notice"
                      style={vcs === "GIT" ? { display: "none" } : undefined}
                    >
                      {t("project.svn.warning")}
                    </span>
                  </div>
                </div>

                <hr />

                <div className="row-fluid">
                  <div className="span2 right-txt">{t("project.menu.setting")}</div>
                  <div className="span10">
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
                <button className="ybtn ybtn-success" disabled={createMutation.isPending}>
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
