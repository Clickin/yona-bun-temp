import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useEffect,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from "react";
import { codeBranchesQueryOptions, setDefaultCodeBranchRest } from "../../../api/code-branches";
import { readProjectSettingsQueryOptions, updateProjectRest } from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { ProjectContainer } from "../../../api/types";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";

const LegacyInternalLink = Link as ComponentType<
  AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }
>;

export const Route = createFileRoute("/$ownerName/$projectName/setting")({
  component: ProjectSettingRoute,
});

function ProjectSettingRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectSettingScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectSettingScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectSettingsQueryOptions(runtimeConfig, { ownerName, projectName }),
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
      <ProjectMenu basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectSettingBody
        branches={branchesQuery.data.branches.map((branch) => branch.name)}
        defaultBranch={branchesQuery.data.defaultBranch}
        project={projectQuery.data}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

function ProjectSettingBody({
  branches,
  defaultBranch,
  project,
  runtimeConfig,
}: {
  branches: string[];
  defaultBranch: string;
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const menuSetting = projectMenuSetting(project);
  const projectScope = stringField(project.projectScope, "PUBLIC").toUpperCase();
  const isGit = stringField(project.vcs, "GIT") === "GIT";
  const [menuCodeChecked, setMenuCodeChecked] = useState(() => booleanField(menuSetting.code));
  const [menuPullRequestChecked, setMenuPullRequestChecked] = useState(() =>
    booleanField(menuSetting.pullRequest),
  );
  const [menuReviewChecked, setMenuReviewChecked] = useState(() =>
    booleanField(menuSetting.review),
  );
  const [reviewerCountPanelVisible, setReviewerCountPanelVisible] = useState(() =>
    booleanField(menuSetting.code),
  );
  const defaultReviewerCount = numberField(recordField(project).defaultReviewerCount) || 1;
  const maxReviewerCount =
    numberField(recordField(project).maxReviewerCount) || defaultReviewerCount;
  const reviewerPoints = Array.from({ length: maxReviewerCount }, (_value, index) => index + 1);
  const [reviewerCountEnabled, setReviewerCountEnabled] = useState(() =>
    booleanField(recordField(project).isUsingReviewerCount),
  );
  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      const selectedDefaultBranch = String(formData.get("defaultBranch") ?? defaultBranch);
      const updateResult = await updateProjectRest(
        runtimeConfig,
        csrfToken,
        ownerName,
        projectName,
        {
          board: formData.get("board") === "true",
          code: formData.get("code") === "true",
          defaultReviewerCount: Number(
            formData.get("defaultReviewerCount") ?? defaultReviewerCount,
          ),
          issue: formData.get("issue") === "true",
          isCodeAccessibleMemberOnly: formData.get("isCodeAccessibleMemberOnly") === "true",
          isUsingReviewerCount: formData.get("isUsingReviewerCount") === "true",
          milestone: formData.get("milestone") === "true",
          overview: String(formData.get("overview") ?? ""),
          ownerName,
          projectName: String(formData.get("name") ?? projectName),
          projectScope: String(formData.get("projectScope") ?? projectScope),
          pullRequest: formData.get("pullRequest") === "true",
          review: formData.get("review") === "true",
        },
      );
      if (selectedDefaultBranch && selectedDefaultBranch !== defaultBranch) {
        await setDefaultCodeBranchRest(runtimeConfig, csrfToken, {
          branchName: selectedDefaultBranch,
          ownerName,
          projectName,
        });
      }
      return updateResult;
    },
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.base(ownerName, projectName),
      });
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.codeBranches(ownerName, projectName),
      });
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate(new FormData(event.currentTarget));
  }

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <ProjectSettingMenu
          active="setting"
          showCode={menuCodeChecked}
          ownerName={ownerName}
          project={project}
          projectName={projectName}
        />

        <form
          id="saveSetting"
          method="post"
          action={prefixBasePath(runtimeConfig.basePath, `/${ownerName}/${projectName}/setting`)}
          encType="multipart/form-data"
          className="nm"
          onSubmit={onSubmit}
        >
          <div className="bubble-wrap gray" style={{ overflow: "visible" }}>
            <input type="hidden" name="id" value={projectId(project)} />
            <input
              type="hidden"
              name="watchingCount"
              value={numberField(recordField(project).watchCount)}
            />
            <div className="box-wrap top clearfix frm-wrap" style={{ paddingTop: "20px" }}>
              <div className="setting-box left">
                <div
                  className="logo-wrap"
                  style={{ backgroundImage: `url('${projectLogoUrl(project)}')` }}
                ></div>
                <div className="logo-desc">
                  <ul className="unstyled descs">
                    <li>
                      <strong>{t("project.logo")}</strong>
                    </li>
                    <li>
                      {t("project.logo.type")} <span className="point">bmp, jpg, gif, png</span>
                    </li>
                    <li>
                      {t("project.logo.maxFileSize")} <span className="point">5MB</span>
                    </li>
                    <li>
                      <div className="btn-wrap">
                        <div className="nbtn medium white fake-file-wrap">
                          <i className="yobicon-upload"></i> {t("button.upload")}
                          <input
                            id="logoPath"
                            type="file"
                            className="file"
                            name="logoPath"
                            accept="image/*"
                          />
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
              <dl className="setting-box right">
                <dt>
                  <label htmlFor="project-name">{t("project.name.placeholder")}</label>
                </dt>
                <dd>
                  <input
                    id="project-name"
                    type="text"
                    name="name"
                    data-trigger="focus"
                    data-content={t("project.transfer.description6")}
                    data-placement="left"
                    maxLength={250}
                    defaultValue={projectName}
                  />
                  <br />
                </dd>
                <dt>
                  <label htmlFor="project-desc">{t("project.description.placeholder")}</label>
                </dt>
                <dd>
                  <textarea
                    id="project-desc"
                    name="overview"
                    maxLength={250}
                    className="textarea"
                    defaultValue={stringField(project.overview, "")}
                  ></textarea>
                </dd>
              </dl>
            </div>

            <div className="box-wrap middle">
              <div className="cu-label">{t("project.shareOption")}</div>
              <div className="cu-desc">
                <input
                  name="projectScope"
                  type="radio"
                  className="radio-btn"
                  id="public"
                  value="PUBLIC"
                  defaultChecked={projectScope === "PUBLIC"}
                />
                <label htmlFor="public" className="bg-radiobtn label-public">
                  {t("project.public")}
                </label>
                {stringField(project.organizationName, "") ? (
                  <>
                    <input
                      name="projectScope"
                      type="radio"
                      className="radio-btn"
                      id="protected"
                      value="PROTECTED"
                      defaultChecked={projectScope === "PROTECTED"}
                    />
                    <label htmlFor="protected" className="bg-radiobtn label-protected">
                      {t("project.protected")}
                    </label>
                  </>
                ) : null}
                <input
                  name="projectScope"
                  type="radio"
                  className="radio-btn"
                  id="private"
                  value="PRIVATE"
                  defaultChecked={projectScope === "PRIVATE"}
                />
                <label htmlFor="private" className="bg-radiobtn label-private">
                  {t("project.private")}
                </label>
                <span className="note">{t("project.private.notice")}</span>
              </div>
            </div>

            {isGit ? (
              <div className="box-wrap middle">
                <div className="cu-label">{t("issue.template")}</div>
                <div className="cu-desc">
                  <a
                    href={prefixBasePath(
                      runtimeConfig.basePath,
                      `/${ownerName}/${projectName}/postform?issueTemplate=true`,
                    )}
                    className="ybtn"
                    target="_blank"
                  >
                    {t("issue.template.edit")}
                  </a>
                </div>
              </div>
            ) : null}

            <div className="box-wrap middle">
              <div className="cu-label">{t("project.codeAccessible")}</div>
              <div className="cu-desc">
                <input
                  name="isCodeAccessibleMemberOnly"
                  type="radio"
                  id="codeAccessibleMemberOnly"
                  className="radio-btn"
                  value="true"
                  defaultChecked={booleanField(recordField(project).codeMemberOnly)}
                />
                <label htmlFor="codeAccessibleMemberOnly" className="bg-radiobtn label-public">
                  {t("button.yes")}
                </label>
                <input
                  name="isCodeAccessibleMemberOnly"
                  type="radio"
                  id="codeAccessibleAnyone"
                  className="radio-btn"
                  value="false"
                  defaultChecked={!booleanField(recordField(project).codeMemberOnly)}
                />
                <label htmlFor="codeAccessibleAnyone" className="bg-radiobtn label-private">
                  {t("button.no")}
                </label>
                <span className="note"></span>
              </div>
            </div>

            {isGit ? (
              <>
                <div
                  className="box-wrap middle reviewer-count-wrap"
                  id="reviewerCountSettingPanel"
                  style={reviewerCountPanelVisible ? undefined : { display: "none" }}
                >
                  <div className="cu-label vmiddle">{t("project.reviewer.count")}</div>
                  <div className="cu-desc">
                    <input
                      name="isUsingReviewerCount"
                      data-toggle="reviewer-count"
                      data-action="show"
                      type="radio"
                      className="radio-btn"
                      id="reviewerCountEnable"
                      value="true"
                      checked={reviewerCountEnabled}
                      onChange={() => setReviewerCountEnabled(true)}
                    />
                    <label htmlFor="reviewerCountEnable" className="bg-radiobtn label-public">
                      {t("project.reviewer.count.enable")}
                    </label>
                    <input
                      name="isUsingReviewerCount"
                      data-toggle="reviewer-count"
                      data-action="hide"
                      type="radio"
                      className="radio-btn"
                      id="reviewerCountDisable"
                      value="false"
                      checked={!reviewerCountEnabled}
                      onChange={() => setReviewerCountEnabled(false)}
                    />
                    <label htmlFor="reviewerCountDisable" className="bg-radiobtn label-private">
                      {t("project.reviewer.count.disable")}
                    </label>

                    <div
                      id="welReviewerCount"
                      data-value={String(booleanField(recordField(project).isUsingReviewerCount))}
                      className="hide"
                      style={{ display: reviewerCountEnabled ? "block" : "none" }}
                    >
                      <div
                        className="btn-group branches"
                        data-id="project-reviewer-count"
                        data-name="defaultReviewerCount"
                      >
                        <button className="btn dropdown-toggle large" data-toggle="dropdown">
                          <span className="d-label">{defaultReviewerCount}</span>
                          <span className="d-caret">
                            <span className="caret"></span>
                          </span>
                        </button>
                        <ul className="dropdown-menu">
                          {reviewerPoints.map((point) => (
                            <li data-value={point} key={point}>
                              <LegacyNoHrefAnchor>{point}</LegacyNoHrefAnchor>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <span className="note ml10">{t("project.reviewer.count.description")}</span>
                    </div>
                  </div>
                </div>

                <div
                  className="box-wrap middle"
                  id="defaultBranceSettingPanel"
                  style={menuCodeChecked ? undefined : { display: "none" }}
                >
                  <div className="cu-label vmiddle">{t("code.branches.defaultBranch")}</div>
                  <div className="cu-desc">
                    <select
                      id="project-default-branch"
                      name="defaultBranch"
                      data-toggle="select2"
                      data-format="branch"
                      data-dropdown-css-class="branches"
                      style={{ minWidth: "220px" }}
                      defaultValue={defaultBranch}
                    >
                      {branches.map((branchName) => (
                        <option value={branchName} key={branchName}>
                          {branchName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            ) : null}

            <div className="box-wrap middle">
              <div className="cu-label vmiddle">{t("project.menu.setting")}</div>
              <div className="cu-desc">
                <MenuCheckbox
                  id="menuSettingCode"
                  name="code"
                  checked={menuCodeChecked}
                  label={t("menu.code")}
                  onChange={(checked) => {
                    setMenuCodeChecked(checked);
                    if (!checked) {
                      setMenuPullRequestChecked(false);
                      setMenuReviewChecked(false);
                      setReviewerCountEnabled(false);
                      setReviewerCountPanelVisible(false);
                    }
                  }}
                />
                <MenuCheckbox
                  id="menuSettingIssue"
                  name="issue"
                  defaultChecked={booleanField(menuSetting.issue)}
                  label={t("menu.issue")}
                />
                {isGit ? (
                  <MenuCheckbox
                    id="menuSettingPullRequest"
                    name="pullRequest"
                    checked={menuPullRequestChecked}
                    label={t("menu.pullRequest")}
                    onChange={(checked) => {
                      setMenuPullRequestChecked(checked);
                      if (checked) {
                        setMenuCodeChecked(true);
                        setReviewerCountPanelVisible(true);
                      } else {
                        setReviewerCountEnabled(false);
                        setReviewerCountPanelVisible(false);
                      }
                    }}
                  />
                ) : null}
                <MenuCheckbox
                  id="menuSettingReview"
                  name="review"
                  checked={menuReviewChecked}
                  label={t("menu.review")}
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
                  defaultChecked={booleanField(menuSetting.milestone)}
                  label={t("milestone")}
                />
                <MenuCheckbox
                  id="menuSettingBoard"
                  name="board"
                  defaultChecked={booleanField(menuSetting.board)}
                  label={t("menu.board")}
                />
              </div>
            </div>
          </div>

          <div className="box-wrap bottom">
            <button id="save" type="submit" className="ybtn ybtn-success">
              {t("button.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MenuCheckbox({
  checked,
  defaultChecked,
  id,
  label,
  name,
  onChange,
}: {
  checked?: boolean;
  defaultChecked?: boolean;
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
        defaultChecked={defaultChecked}
        onChange={(event) => onChange?.(event.currentTarget.checked)}
      />
      {label}
    </label>
  );
}

function LegacyNoHrefAnchor({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    ref.current?.removeAttribute("href");
  }, []);

  return (
    <a ref={ref} href="/">
      {children}
    </a>
  );
}

function ProjectHeader({ basePath, project }: { basePath: string; project: ProjectContainer }) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const projectIdValue = projectId(project);
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
                <a href={prefixBasePath(basePath, `/${ownerName}`)}>{ownerName}</a>
              </span>
              <span className="project-separator hide-in-mobile">/</span>
              <span className="project-name">
                <a href={projectHref(basePath, ownerName, projectName)}>{projectName}</a>
              </span>
              <span className="user-project-list" data-project-id={projectIdValue}>
                <i
                  className={`${projectFavorited(project) ? "starred" : ""} star material-icons va-text-top`}
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
                <a
                  href={projectHref(basePath, originalOwnerName, originalProjectName)}
                  className="project-origin-name"
                >
                  {originalOwnerName} / {originalProjectName}
                </a>
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

function ProjectMenu({ basePath, project }: { basePath: string; project: ProjectContainer }) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const menuSetting = projectMenuSetting(project);

  return (
    <div className="project-menu-outer">
      <div className="project-menu-inner">
        <ul className="project-menu-nav project-menu-gruop">
          <ProjectMenuItem
            href={projectHref(basePath, ownerName, projectName)}
            label={t("title.projectHome")}
            short="H"
          />
          {booleanField(menuSetting.code) ? (
            <ProjectMenuItem
              className="code-menu "
              href={prefixBasePath(basePath, `/${ownerName}/${projectName}/code`)}
              label={t("menu.code")}
              short="C"
            />
          ) : null}
          {booleanField(menuSetting.issue) ? (
            <ProjectMenuItem
              href={prefixBasePath(basePath, `/${ownerName}/${projectName}/issues`)}
              label={t("menu.issue")}
              short="I"
            />
          ) : null}
          {booleanField(menuSetting.pullRequest) && stringField(project.vcs, "GIT") === "GIT" ? (
            <ProjectMenuItem
              href={prefixBasePath(basePath, `/${ownerName}/${projectName}/pullRequests`)}
              label={t("menu.pullRequest")}
              short="P"
            />
          ) : null}
          {booleanField(menuSetting.review) ? (
            <ProjectMenuItem
              href={prefixBasePath(basePath, `/${ownerName}/${projectName}/reviews`)}
              label={t("menu.review")}
              short="R"
            />
          ) : null}
          {booleanField(menuSetting.milestone) ? (
            <ProjectMenuItem
              href={prefixBasePath(basePath, `/${ownerName}/${projectName}/milestones`)}
              label={t("milestone")}
              short="M"
            />
          ) : null}
          {booleanField(menuSetting.board) ? (
            <ProjectMenuItem
              href={prefixBasePath(basePath, `/${ownerName}/${projectName}/posts`)}
              label={t("menu.board")}
              short="B"
            />
          ) : null}
        </ul>
        {booleanField(project.viewerCanUpdate) ? (
          <div className="project-setting">
            <ul className="project-menu-nav">
              <li className="active">
                <a href={prefixBasePath(basePath, `/${ownerName}/${projectName}/setting`)}>
                  <i className="yobicon-cog"></i>
                  <span className="blind">
                    <span className="menu-name">{t("menu.admin")}</span>
                  </span>
                  <CountBadge count={numberField(project.enrollmentRequestCount)} />
                </a>
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
  href,
  label,
  short,
}: {
  className?: string;
  href: string;
  label: string;
  short: string;
}) {
  return (
    <li className={className}>
      <a href={href}>
        <span className="menu-name">{label}</span>
        <span className="short-menu">{short}</span>
      </a>
    </li>
  );
}

function ProjectSettingMenu({
  active,
  ownerName,
  project,
  projectName,
  showCode,
}: {
  active: "setting";
  ownerName: string;
  project: ProjectContainer;
  projectName: string;
  showCode: boolean;
}) {
  const { t } = useLegacyMessages();

  return (
    <ul className="nav nav-tabs">
      <li id="subMenuProjectSetting" className={active === "setting" ? "active" : ""}>
        <LegacyInternalLink to={`/${ownerName}/${projectName}/setting`}>
          {t("project.setting")}
        </LegacyInternalLink>
      </li>
      <li id="subMenuProjectMember" className="">
        <LegacyInternalLink to={`/${ownerName}/${projectName}/members`}>
          {t("project.member")}
          <CountBadge count={numberField(project.enrollmentRequestCount)} className="num-badge" />
        </LegacyInternalLink>
      </li>
      <li id="subMenuIssueLabel" className="">
        <LegacyInternalLink to={`/${ownerName}/${projectName}/labels`}>
          {t("issue.label")}
        </LegacyInternalLink>
      </li>
      <li id="subMenuWebhook" className="">
        <LegacyInternalLink to={`/${ownerName}/${projectName}/webhooks`}>
          {t("project.webhook")}
        </LegacyInternalLink>
      </li>
      <li id="subMenuProjectTransfer" className="">
        <LegacyInternalLink to={`/${ownerName}/${projectName}/transfer`}>
          {t("project.transfer")}
        </LegacyInternalLink>
      </li>
      <li id="subMenuProjectDelete" className="">
        <LegacyInternalLink to={`/${ownerName}/${projectName}/deleteform`}>
          {t("project.delete")}
        </LegacyInternalLink>
      </li>
      <li
        id="subMenuProjectChangeVCS"
        className=""
        style={showCode ? undefined : { display: "none" }}
      >
        <LegacyInternalLink to={`/${ownerName}/${projectName}/changeVCS`}>
          {t("project.changeVCS")}
        </LegacyInternalLink>
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

function projectHref(basePath: string, ownerName: string, projectName: string) {
  return prefixBasePath(basePath, `/${ownerName}/${projectName}`);
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
