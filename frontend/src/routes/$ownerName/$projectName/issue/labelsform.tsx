import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  copyProjectLabelsRest,
  createProjectLabelRest,
  listProjectLabelsQueryOptions,
} from "../../../../api/project-labels";
import {
  readProjectSettingsQueryOptions,
  toggleFavoriteProjectRest,
} from "../../../../api/org-project";
import { apiQueryKeys } from "../../../../api/query-keys";
import type { ProjectContainer, YonaRecord } from "../../../../api/types";
import { readSessionBootstrap } from "../../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../../i18n";
import { YonaQueryProvider } from "../../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../../runtime-config";
import { SiteLayoutShell } from "../../../-home-route-screen";

const NEW_LABEL_COLORS = [
  "#f44336",
  "#e91e63",
  "#9c27b0",
  "#3f51b5",
  "#2196f3",
  "#03a9f4",
  "#00bcd4",
  "#009688",
  "#4caf50",
  "#8bc34a",
  "#cddc39",
  "#ffeb3b",
  "#ffc107",
  "#ff9800",
  "#ff5722",
  "#795548",
  "#9e9e9e",
];
const EDIT_LABEL_COLORS = [
  "#FF7770",
  "#F18CA7",
  "#FFB399",
  "#F1D55C",
  "#A5D870",
  "#32CDA1",
  "#9985D8",
  "#40A0EB",
  "#6BC4E9",
  "#DCBD98",
  "#8C8C9C",
  "#7A9CB4",
];
const LEGACY_LINK_PROPS = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};

export const Route = createFileRoute("/$ownerName/$projectName/issue/labelsform")({
  component: ProjectLabelsRoute,
});

function ProjectLabelsRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectLabelsScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectLabelsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectSettingsQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const labelsQuery = useQuery(
    listProjectLabelsQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!projectQuery.data || !labelsQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader project={projectQuery.data} />
      <ProjectMenu project={projectQuery.data} />
      <ProjectLabelsBody
        labels={labelsQuery.data.labels}
        project={projectQuery.data}
        runtimeConfig={runtimeConfig}
      />
      <EditCategoryModal />
      <EditLabelModal labels={labelsQuery.data.labels} />
    </>
  );
}

function ProjectLabelsBody({
  labels,
  project,
  runtimeConfig,
}: {
  labels: YonaRecord[];
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const copyMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return copyProjectLabelsRest(runtimeConfig, csrfToken, {
        fromOwnerName: String(formData.get("owner") ?? ""),
        fromProjectName: String(formData.get("projectName") ?? ""),
        ownerName,
        projectName,
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.labels(ownerName, projectName),
      });
    },
  });
  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return createProjectLabelRest(runtimeConfig, csrfToken, {
        categoryName: String(formData.get("category") ?? ""),
        labelColor: String(formData.get("color") ?? ""),
        labelName: String(formData.get("name") ?? ""),
        ownerName,
        projectName,
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.labels(ownerName, projectName),
      });
    },
  });

  function onCopy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    copyMutation.mutate(new FormData(event.currentTarget));
  }

  function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.mutate(new FormData(event.currentTarget));
  }

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap label-editor-wrap">
        <ProjectSettingMenu
          active="labels"
          ownerName={ownerName}
          project={project}
          projectName={projectName}
        />

        {booleanField(project.viewerCanUpdate) ? (
          <>
            <form
              id="copyLabel"
              action={prefixBasePath(
                runtimeConfig.basePath,
                `/${ownerName}/${projectName}/labels/copy`,
              )}
              method="post"
              className="new-label-wrap"
              onSubmit={onCopy}
            >
              <strong className="form-legend">{t("label.copy.append")}</strong>
              <div className="form-wrap">
                <input
                  type="text"
                  name="owner"
                  className="input-label mr5"
                  placeholder={t("project.owner")}
                />
                <input
                  type="text"
                  name="projectName"
                  className="input-label"
                  placeholder={t("project.name")}
                />
              </div>
              <button type="submit" className="ybtn ybtn-info btn-submit">
                {t("label.copy")}
              </button>
              <div>{t("label.copy.description")}</div>
              <div>{t("label.copy.description2")}</div>
            </form>
            <form
              id="frmNewLabel"
              action={prefixBasePath(runtimeConfig.basePath, `/${ownerName}/${projectName}/labels`)}
              method="post"
              className="new-label-wrap"
              onSubmit={onCreate}
            >
              <strong className="form-legend">{t("label.new")}</strong>
              <div className="form-wrap">
                <div>
                  <input
                    type="text"
                    name="category"
                    className="input-label mr5"
                    maxLength={250}
                    data-provider="typeahead"
                    autoComplete="off"
                    placeholder={t("label.category")}
                  />
                  <input
                    type="text"
                    name="name"
                    className="input-label"
                    maxLength={250}
                    autoComplete="off"
                    placeholder={t("label.name")}
                  />
                </div>
                <div className="label-preset-colors">
                  {NEW_LABEL_COLORS.map((color) => (
                    <ColorButton color={color} key={color} />
                  ))}
                  <input
                    type="text"
                    name="color"
                    className="input-small input-label-color"
                    placeholder={t("label.customColor")}
                  />
                </div>
              </div>
              <button type="submit" className="ybtn ybtn-primary btn-submit">
                {t("label.add")}
              </button>
            </form>
          </>
        ) : null}

        <div id="labelsList" className="issue-label-list-wrap">
          <ProjectLabelsList
            basePath={runtimeConfig.basePath}
            labels={labels}
            ownerName={ownerName}
            project={project}
            projectName={projectName}
          />
        </div>
      </div>
    </div>
  );
}

function ProjectLabelsList({
  basePath,
  labels,
  ownerName,
  project,
  projectName,
}: {
  basePath: string;
  labels: YonaRecord[];
  ownerName: string;
  project: ProjectContainer;
  projectName: string;
}) {
  const { t } = useLegacyMessages();

  if (labels.length === 0) {
    return (
      <div className="error-wrap">
        <i className="ico ico-err1"></i>
        <p>{t("label.list.empty")}</p>
      </div>
    );
  }

  const categories = groupedLabels(labels);
  const canUpdate = booleanField(project.viewerCanUpdate);
  const projectIdValue = projectId(project);

  return (
    <>
      <div className="row-fluid list-head">
        <div className="span3 category">
          <strong>{t("label.category")}</strong>
        </div>
        <div className="span9 name">
          <strong>{t("label.name")}</strong>
        </div>
      </div>
      {categories.map((category) => (
        <div
          className="row-fluid list-item category-wrap"
          data-category={category.id}
          data-category-name={category.name}
          key={category.id || category.name}
        >
          <div className="span3">
            <h5 className="right-txt mr20">
              <span className="category-name">{category.name}</span>
              <p className="mt5">
                <i
                  className={`category-exclusive ${category.isExclusive ? "yobicon-tag single" : "yobicon-tags multiple"}`}
                  data-toggle="tooltip"
                  data-html="true"
                  title={`${t("label.category.option")}<br>${t(
                    category.isExclusive
                      ? "label.category.option.single"
                      : "label.category.option.multiple",
                  )}`}
                ></i>
                {canUpdate ? (
                  <button
                    type="button"
                    className="ybtn ybtn-mini"
                    data-project-id={projectIdValue}
                    data-category-id={category.id}
                    data-category-name={category.name}
                    data-category-is-exclusive={String(category.isExclusive)}
                    data-category-update-uri={prefixBasePath(
                      basePath,
                      `/${ownerName}/${projectName}/issue/label/category/${category.id}`,
                    )}
                  >
                    {t("label.category.edit")}
                  </button>
                ) : null}
              </p>
            </h5>
          </div>
          <div className="span9">
            <table className="table nm">
              <tbody>
                {category.labels.map((label) => {
                  const labelId = stringField(label.id, "");
                  const labelName = stringField(label.name, "");
                  return (
                    <tr data-label-id={labelId} key={labelId || labelName}>
                      <td>
                        <span
                          className="issue-label active"
                          data-label-id={labelId}
                          data-label-name={labelName}
                        >
                          {labelName}
                        </span>
                      </td>
                      <td className="actions">
                        {canUpdate ? (
                          <>
                            <button
                              type="button"
                              className="ybtn ybtn-danger ybtn-small"
                              data-category-name={category.name}
                              data-label-id={labelId}
                              data-delete-uri={prefixBasePath(
                                basePath,
                                `/${ownerName}/${projectName}/issue/label/${labelId}/delete`,
                              )}
                            >
                              {t("button.delete")}
                            </button>
                            <button
                              type="button"
                              className="ybtn ybtn-small"
                              data-category-id={category.id}
                              data-label-name={labelName}
                              data-label-color={stringField(label.color, "")}
                              data-update-uri={prefixBasePath(
                                basePath,
                                `/${ownerName}/${projectName}/issue/label/${labelId}`,
                              )}
                            >
                              {t("button.edit")}
                            </button>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}

function groupedLabels(labels: YonaRecord[]) {
  const categories = new Map<
    string,
    { id: string; isExclusive: boolean; labels: YonaRecord[]; name: string }
  >();

  for (const label of labels) {
    const id = stringField(label.categoryId, "");
    const name = stringField(label.category, "");
    const key = id || name;
    const existing = categories.get(key);
    if (existing) {
      existing.labels.push(label);
      continue;
    }
    categories.set(key, {
      id,
      isExclusive: booleanField(label.categoryIsExclusive),
      labels: [label],
      name,
    });
  }

  return Array.from(categories.values());
}

function EditCategoryModal() {
  const { t } = useLegacyMessages();

  return (
    <div
      id="editCategory"
      className="modal hide yobiDialog"
      tabIndex={-1}
      role="dialog"
      aria-hidden="true"
    >
      <div className="btn-dismiss">
        <button type="button" className="btn-transparent" data-dismiss="modal">
          ×
        </button>
      </div>
      <div className="message edit-label-category-form">
        <div className="center-txt">
          <input
            type="text"
            name="name"
            className="text category-name"
            placeholder={t("label.category")}
          />

          <div className="desc">
            {t("label.category.option")}
            <select
              name="isExclusive"
              data-toggle="select2"
              data-dropdown-css-class="select2-without-searchbox"
            >
              <option value="false">{t("label.category.option.multiple")}</option>
              <option value="true">{t("label.category.option.single")}</option>
            </select>
          </div>
        </div>

        <div className="center-txt buttons mt20 mb20">
          <button type="button" className="ybtn ybtn-info btnSubmit">
            {t("button.save")}
          </button>
          <button type="button" className="ybtn ybtn-default" data-dismiss="modal">
            {t("button.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditLabelModal({ labels }: { labels: YonaRecord[] }) {
  const { t } = useLegacyMessages();
  const categoriesById = new Map<string, { id: string; name: string }>();
  for (const label of labels) {
    const id = stringField(label.categoryId, "");
    if (id) {
      categoriesById.set(id, { id, name: stringField(label.category, "") });
    }
  }
  const categories = Array.from(categoriesById.values());

  return (
    <div
      id="editLabel"
      className="modal hide yobiDialog"
      tabIndex={-1}
      role="dialog"
      aria-hidden="true"
    >
      <div className="btn-dismiss">
        <button type="button" className="btn-transparent" data-dismiss="modal">
          ×
        </button>
      </div>
      <div className="message edit-label-form">
        <div className="center-txt">
          <select name="category.id" data-toggle="select2">
            {categories.map((category) => (
              <option value={category.id} key={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            name="name"
            className="text input-label-name"
            maxLength={250}
            placeholder={t("label.name")}
          />

          <div className="label-preset-colors edit">
            {EDIT_LABEL_COLORS.map((color) => (
              <ColorButton color={color} key={color} />
            ))}
            <input
              type="text"
              name="color"
              className="input-small input-label-color"
              placeholder={t("label.customColor")}
            />
          </div>
        </div>
        <div className="center-txt buttons mt20 mb20">
          <button type="button" className="ybtn ybtn-info btnSubmit">
            {t("button.save")}
          </button>
          <button type="button" className="ybtn ybtn-default" data-dismiss="modal">
            {t("button.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ColorButton({ color }: { color: string }) {
  return (
    <button
      type="button"
      className="issue-label btn-preset-color"
      style={{ backgroundColor: color }}
    ></button>
  );
}

function ProjectHeader({ project }: { project: ProjectContainer }) {
  const { runtimeConfig } = Route.useRouteContext();
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const projectIdValue = projectId(project);
  const [isFavoritedProject, setIsFavoritedProject] = useState(() => projectFavorited(project));
  const logoUrl = projectLogoUrl(project);
  const backgroundImageUrl =
    stringField(recordField(project).backgroundImageUrl, "") ||
    stringField(recordField(project).backgroundUrl, "") ||
    "/assets/images/bg-default-project.png";
  const isForked =
    booleanField(recordField(project).isForkedFromOrigin) ||
    booleanField(recordField(project).isForked);
  const originalOwnerName =
    stringField(recordField(project).originalOwnerName, "") ||
    stringField(recordField(project).originOwnerName, "");
  const originalProjectName =
    stringField(recordField(project).originalProjectName, "") ||
    stringField(recordField(project).originProjectName, "");
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
        queryKey: apiQueryKeys.project.base(ownerName, projectName),
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
                <Link {...LEGACY_LINK_PROPS} to="/$user" params={{ user: ownerName }}>
                  {ownerName}
                </Link>
              </span>
              <span className="project-separator hide-in-mobile">/</span>
              <span className="project-name">
                <Link
                  {...LEGACY_LINK_PROPS}
                  to="/$ownerName/$projectName"
                  params={{ ownerName, projectName }}
                >
                  {projectName}
                </Link>
              </span>
              <span
                className="user-project-list"
                data-project-id={projectIdValue}
                role="button"
                tabIndex={0}
                onClick={(event) => {
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
              {booleanField(recordField(project).isPrivate) ? (
                <span className="project-private">
                  <i className="yobicon-lock"></i>
                </span>
              ) : null}
              {booleanField(recordField(project).isProtected) ? (
                <span className="project-protected" title="Group Project">
                  G
                </span>
              ) : null}
            </div>
            {isForked ? (
              <div className="project-origin">
                <span className="project-origin-title">{t("fork.original")}</span>
                <Link
                  {...LEGACY_LINK_PROPS}
                  to="/$ownerName/$projectName"
                  params={{ ownerName: originalOwnerName, projectName: originalProjectName }}
                  className="project-origin-name"
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
  const menuSetting = projectMenuSetting(project);

  return (
    <div className="project-menu-outer">
      <div className="project-menu-inner">
        <ul className="project-menu-nav project-menu-gruop">
          <ProjectMenuItem
            label={t("title.projectHome")}
            params={{ ownerName, projectName }}
            short="H"
            to="/$ownerName/$projectName"
          />
          {booleanField(menuSetting.code) ? (
            <ProjectMenuItem
              className="code-menu "
              label={t("menu.code")}
              params={{ ownerName, projectName }}
              short="C"
              to="/$ownerName/$projectName/code"
            />
          ) : null}
          {booleanField(menuSetting.issue) ? (
            <ProjectMenuItem
              label={t("menu.issue")}
              params={{ ownerName, projectName }}
              short="I"
              to="/$ownerName/$projectName/issues"
            />
          ) : null}
          {booleanField(menuSetting.pullRequest) && stringField(project.vcs, "GIT") === "GIT" ? (
            <ProjectMenuItem
              label={t("menu.pullRequest")}
              params={{ ownerName, projectName }}
              short="P"
              to="/$ownerName/$projectName/pullRequests"
            />
          ) : null}
          {booleanField(menuSetting.review) ? (
            <ProjectMenuItem
              label={t("menu.review")}
              params={{ ownerName, projectName }}
              short="R"
              to="/$ownerName/$projectName/reviews"
            />
          ) : null}
          {booleanField(menuSetting.milestone) ? (
            <ProjectMenuItem
              label={t("milestone")}
              params={{ ownerName, projectName }}
              short="M"
              to="/$ownerName/$projectName/milestones"
            />
          ) : null}
          {booleanField(menuSetting.board) ? (
            <ProjectMenuItem
              label={t("menu.board")}
              params={{ ownerName, projectName }}
              short="B"
              to="/$ownerName/$projectName/posts"
            />
          ) : null}
        </ul>
        {booleanField(project.viewerCanUpdate) ? (
          <div className="project-setting">
            <ul className="project-menu-nav">
              <li className="active">
                <Link
                  {...LEGACY_LINK_PROPS}
                  to="/$ownerName/$projectName/setting"
                  params={{ ownerName, projectName }}
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
  params,
  short,
  to,
}: {
  className?: string;
  label: string;
  params: { ownerName: string; projectName: string };
  short: string;
  to: string;
}) {
  return (
    <li className={className}>
      <Link {...LEGACY_LINK_PROPS} to={to} params={params}>
        <span className="menu-name">{label}</span>
        <span className="short-menu">{short}</span>
      </Link>
    </li>
  );
}

function ProjectSettingMenu({
  active,
  ownerName,
  project,
  projectName,
}: {
  active: "labels";
  ownerName: string;
  project: ProjectContainer;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const menuSetting = projectMenuSetting(project);

  return (
    <ul className="nav nav-tabs">
      <li id="subMenuProjectSetting" className="">
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/setting"
          params={{ ownerName, projectName }}
        >
          {t("project.setting")}
        </Link>
      </li>
      <li id="subMenuProjectMember" className="">
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/members"
          params={{ ownerName, projectName }}
        >
          {t("project.member")}
          <CountBadge count={numberField(project.enrollmentRequestCount)} className="num-badge" />
        </Link>
      </li>
      <li id="subMenuIssueLabel" className={active === "labels" ? "active" : ""}>
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/issue/labelsform"
          params={{ ownerName, projectName }}
          hash="labelsform-active-sentinel"
          mask={{
            to: "/$ownerName/$projectName/issue/labelsform",
            params: { ownerName, projectName },
          }}
        >
          {t("issue.label")}
        </Link>
      </li>
      <li id="subMenuWebhook" className="">
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/webhooks"
          params={{ ownerName, projectName }}
        >
          {t("project.webhook")}
        </Link>
      </li>
      <li id="subMenuProjectTransfer" className="">
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/transfer"
          params={{ ownerName, projectName }}
        >
          {t("project.transfer")}
        </Link>
      </li>
      <li id="subMenuProjectDelete" className="">
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/deleteform"
          params={{ ownerName, projectName }}
        >
          {t("project.delete")}
        </Link>
      </li>
      <li
        id="subMenuProjectChangeVCS"
        className=""
        style={booleanField(menuSetting.code) ? undefined : { display: "none" }}
      >
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/changeVCS"
          params={{ ownerName, projectName }}
        >
          {t("project.changeVCS")}
        </Link>
      </li>
    </ul>
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

function projectMenuSetting(project: ProjectContainer) {
  const record = recordField(project);
  const nested = recordField(record.menuSetting);
  return {
    board: nested.board ?? record.showBoard,
    code: nested.code ?? record.showCode,
    issue: nested.issue ?? record.showIssue,
    milestone: nested.milestone ?? record.showMilestone,
    pullRequest: nested.pullRequest ?? record.showPullRequest,
    review: nested.review ?? record.showReview,
  };
}

function projectId(project: ProjectContainer) {
  return (
    stringField(recordField(project).id, "") || stringField(recordField(project).projectId, "")
  );
}

function projectLogoUrl(project: ProjectContainer) {
  return stringField(project.logoUrl, "") || "/assets/images/project_default_logo.png";
}

function projectFavorited(project: ProjectContainer) {
  return (
    booleanField(recordField(project).isFavorite) || booleanField(recordField(project).isFavorited)
  );
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
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function booleanField(value: unknown) {
  return value === true;
}
