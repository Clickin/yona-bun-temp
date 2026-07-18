import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { uploadTemporaryAttachment } from "../../../api/attachments";
import { codeBranchesQueryOptions, setDefaultCodeBranchRest } from "../../../api/code-branches";
import {
  readProjectContainerQueryOptions,
  readProjectSettingsQueryOptions,
  updateProjectRest,
} from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { ProjectContainer } from "../../../api/types";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YoramQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import defaultProjectLogoUrl from "../../../assets/legacy/project_default_logo.png";
import { SiteLayoutShell } from "../../-home-route-screen";
import {
  ProjectHeader as SharedProjectHeader,
  ProjectMenu as SharedProjectMenu,
} from "../$projectName";
import { styles } from "./-setting.stylex";

const sx = {
  page: stylex.props(styles.page),
  form: stylex.props(styles.form),
  frame: stylex.props(styles.frame),
  topBox: stylex.props(styles.topBox),
  logo: stylex.props(styles.logo),
  input: stylex.props(styles.input),
  nameField: stylex.props(styles.nameField),
  namePopover: stylex.props(styles.namePopover),
  textarea: stylex.props(styles.textarea),
  oldPlace: stylex.props(styles.oldPlace),
  defaultBranchContainer: stylex.props(styles.defaultBranchContainer),
  defaultBranchDrop: stylex.props(styles.defaultBranchDrop),
  defaultBranchDropVisible: stylex.props(styles.defaultBranchDropVisible),
  defaultBranchChoice: stylex.props(styles.defaultBranchChoice),
  defaultBranchSelect: stylex.props(styles.defaultBranchSelect),
  save: stylex.props(styles.save),
} as const;

const PROJECT_NAME_PATTERN = /^[0-9A-Za-z_.가-힣-]+$/;
const RESERVED_PROJECT_NAMES = new Set([".", "..", ".git"]);
const legacyProjectSettingsLinkActiveOptions = {
  exact: true,
  explicitUndefined: true,
  includeSearch: true,
};
const legacyProjectSettingsLinkSuppressActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};
const LEGACY_PROJECT_SETTINGS_ROUTE = "/$ownerName/$projectName/settingform";

type ProjectSettingRouteScreenProps = {
  ownerName: string;
  projectName: string;
  renderProjectShell?: boolean;
  runtimeConfig: RuntimeConfig;
  selfRoutePath: string;
};

export const Route = createFileRoute("/$ownerName/$projectName/setting")({
  component: ProjectSettingRoute,
});

function ProjectSettingRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { ownerName, projectName } = Route.useParams();

  return (
    <ProjectSettingRouteScreen
      ownerName={ownerName}
      projectName={projectName}
      renderProjectShell={false}
      runtimeConfig={runtimeConfig}
      selfRoutePath={LEGACY_PROJECT_SETTINGS_ROUTE}
    />
  );
}

export function ProjectSettingRouteScreen({
  ownerName,
  projectName,
  renderProjectShell = true,
  runtimeConfig,
  selfRoutePath,
}: ProjectSettingRouteScreenProps) {
  const content = (
    <ProjectSettingRouteShell
      ownerName={ownerName}
      projectName={projectName}
      renderProjectShell={renderProjectShell}
      runtimeConfig={runtimeConfig}
      selfRoutePath={selfRoutePath}
    />
  );

  if (!renderProjectShell) {
    return content;
  }

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        {content}
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function ProjectSettingRouteShell({
  ownerName,
  projectName,
  renderProjectShell = true,
  runtimeConfig,
  selfRoutePath,
}: ProjectSettingRouteScreenProps) {
  const settingsQuery = useQuery(
    readProjectSettingsQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const projectShellQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const project = settingsQuery.data;
  const shellProject = projectShellQuery.data;
  const isGitProject = project ? stringField(project.vcs, "GIT") === "GIT" : false;
  const branchesQuery = useQuery({
    ...codeBranchesQueryOptions(runtimeConfig, { ownerName, projectName }),
    enabled: isGitProject,
  });

  if (!project || !shellProject || (isGitProject && !branchesQuery.data)) {
    return null;
  }

  const screen = (
    <ProjectSettingScreen
      branches={
        isGitProject ? (branchesQuery.data?.branches.map((branch) => branch.name) ?? []) : []
      }
      defaultBranch={isGitProject ? (branchesQuery.data?.defaultBranch ?? "") : ""}
      ownerName={ownerName}
      project={project}
      projectName={projectName}
      renderProjectShell={renderProjectShell}
      runtimeConfig={runtimeConfig}
      selfRoutePath={selfRoutePath}
    />
  );

  if (!renderProjectShell) {
    return screen;
  }

  const projectSearchScope = {
    organizationName: projectSearchScopeOrganizationName(shellProject, ownerName),
    ownerName,
    projectName,
  };

  return (
    <SiteLayoutShell
      projectSearchScope={projectSearchScope}
      runtimeConfig={runtimeConfig}
      showLegacyProjectHeaderLinks={!projectSearchScope.organizationName}
    >
      {screen}
    </SiteLayoutShell>
  );
}

function ProjectSettingScreen({
  branches,
  defaultBranch,
  ownerName,
  project,
  projectName,
  renderProjectShell,
  runtimeConfig,
  selfRoutePath,
}: {
  branches: string[];
  defaultBranch: string;
  ownerName: string;
  project: ProjectContainer;
  projectName: string;
  renderProjectShell: boolean;
  runtimeConfig: RuntimeConfig;
  selfRoutePath: string;
}) {
  const { t } = useLegacyMessages();

  const body = (
    <ProjectSettingBody
      branches={branches}
      defaultBranch={defaultBranch}
      ownerName={ownerName}
      projectName={projectName}
      project={project}
      runtimeConfig={runtimeConfig}
      selfRoutePath={selfRoutePath}
    />
  );

  return renderProjectShell ? (
    <>
      <title>{`${t("title.projectSetting")} - ${ownerName}/${projectName}`}</title>
      <SharedProjectHeader basePath={runtimeConfig.basePath} project={project} />
      <SharedProjectMenu active="setting" basePath={runtimeConfig.basePath} project={project} />
      {body}
    </>
  ) : (
    body
  );
}

function ProjectSettingBody({
  branches,
  defaultBranch,
  ownerName,
  projectName,
  project,
  runtimeConfig,
  selfRoutePath,
}: {
  branches: string[];
  defaultBranch: string;
  ownerName: string;
  projectName: string;
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
  selfRoutePath: string;
}) {
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const menuSetting = projectMenuSetting(project);
  const oldPlace = projectOldPlace(project);
  const projectScope = stringField(project.projectScope, "PUBLIC").toUpperCase();
  const isGit = stringField(project.vcs, "GIT") === "GIT";
  const [logoInputResetKey, setLogoInputResetKey] = useState(0);
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
  const [selectedDefaultReviewerCount, setSelectedDefaultReviewerCount] =
    useState(defaultReviewerCount);
  const [reviewerCountDropdownOpen, setReviewerCountDropdownOpen] = useState(false);
  const [reviewerCountEnabled, setReviewerCountEnabled] = useState(() =>
    booleanField(recordField(project).isUsingReviewerCount),
  );
  const [projectNamePopoverFocused, setProjectNamePopoverFocused] = useState(false);
  const [projectNamePopoverHovered, setProjectNamePopoverHovered] = useState(false);
  const [overview, setOverview] = useState(() => stringField(project.overview, ""));
  const [overviewHeight, setOverviewHeight] = useState(80);
  const overviewRef = useRef<HTMLTextAreaElement>(null);
  const isProjectNamePopoverVisible = projectNamePopoverFocused || projectNamePopoverHovered;
  useLayoutEffect(() => {
    const textarea = overviewRef.current;
    if (textarea) {
      setOverviewHeight(legacyAutosizeContentHeight(textarea));
    }
  }, [overview]);
  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      const selectedDefaultBranch = String(formData.get("defaultBranch") ?? defaultBranch);
      const logoFile = selectedLogoFile(formData.get("logoPath"));
      const logoAttachmentId = logoFile
        ? (await uploadTemporaryAttachment(runtimeConfig, csrfToken, logoFile)).id
        : undefined;
      const updateInput = {
        board: formData.get("board") === "true",
        code: formData.get("code") === "true",
        issue: formData.get("issue") === "true",
        isCodeAccessibleMemberOnly: formData.get("isCodeAccessibleMemberOnly") === "true",
        logoAttachmentId,
        milestone: formData.get("milestone") === "true",
        overview: String(formData.get("overview") ?? ""),
        ownerName,
        projectName: String(formData.get("name") ?? projectName),
        projectScope: String(formData.get("projectScope") ?? projectScope),
        review: formData.get("review") === "true",
        ...(isGit
          ? {
              defaultReviewerCount: Number(
                formData.get("defaultReviewerCount") ?? defaultReviewerCount,
              ),
              isUsingReviewerCount: formData.get("isUsingReviewerCount") === "true",
              pullRequest: formData.get("pullRequest") === "true",
            }
          : {}),
      };
      const updateResult = await updateProjectRest(
        runtimeConfig,
        csrfToken,
        ownerName,
        projectName,
        updateInput,
      );
      if (isGit && selectedDefaultBranch && selectedDefaultBranch !== defaultBranch) {
        await setDefaultCodeBranchRest(runtimeConfig, csrfToken, {
          branchName: selectedDefaultBranch,
          ownerName,
          projectName,
        });
      }
      return updateResult;
    },
    onSuccess() {
      setLogoInputResetKey((key) => key + 1);
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
    const formData = new FormData(event.currentTarget);
    const nextProjectName = String(formData.get("name") ?? "");
    if (!PROJECT_NAME_PATTERN.test(nextProjectName)) {
      window.alert(t("project.name.alert"));
      return;
    }
    if (RESERVED_PROJECT_NAMES.has(nextProjectName)) {
      window.alert(t("project.name.reserved.alert"));
      return;
    }
    mutation.mutate(formData);
  }

  function onChangeLogoPath(event: ChangeEvent<HTMLInputElement>) {
    if (!isImageFileInput(event.currentTarget)) {
      window.alert(t("project.logo.alert"));
      setLogoInputResetKey((key) => key + 1);
      return;
    }

    const form = event.currentTarget.form;
    if (form) {
      mutation.mutate(new FormData(form));
    }
  }

  return (
    <div {...sx.page} data-stylex-owner="project-setting-page">
      <div data-stylex-owner="project-setting-shell">
        <ProjectSettingMenu
          active="setting"
          showCode={menuCodeChecked}
          ownerName={ownerName}
          project={project}
          projectName={projectName}
          selfRoutePath={selfRoutePath}
        />

        <form
          id="saveSetting"
          method="post"
          action={prefixBasePath(runtimeConfig.basePath, `/${ownerName}/${projectName}/setting`)}
          encType="multipart/form-data"
          {...sx.form}
          data-stylex-owner="project-setting-form"
          onSubmit={onSubmit}
        >
          <div {...sx.frame} data-stylex-owner="project-setting-frame">
            <input type="hidden" name="id" value={projectId(project)} />
            <input
              type="hidden"
              name="watchingCount"
              value={numberField(recordField(project).watchCount)}
            />
            <div {...sx.topBox} data-stylex-owner="project-setting-top-box">
              <div className="setting-box left">
                <div
                  {...sx.logo}
                  data-stylex-owner="project-setting-logo"
                  style={{
                    backgroundImage: `url('${projectLogoUrl(project, runtimeConfig.basePath)}')`,
                  }}
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
                            key={logoInputResetKey}
                            id="logoPath"
                            type="file"
                            className="file"
                            name="logoPath"
                            accept="image/*"
                            onChange={onChangeLogoPath}
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
                <dd {...sx.nameField} data-stylex-owner="project-setting-name-field">
                  <input
                    {...sx.input}
                    data-stylex-owner="project-setting-name-input"
                    id="project-name"
                    type="text"
                    name="name"
                    maxLength={250}
                    defaultValue={projectName}
                    onBlur={() => setProjectNamePopoverFocused(false)}
                    onFocus={() => setProjectNamePopoverFocused(true)}
                    onMouseEnter={() => setProjectNamePopoverHovered(true)}
                    onMouseLeave={() => setProjectNamePopoverHovered(false)}
                  />
                  {isProjectNamePopoverVisible ? (
                    <div
                      className="popover left in"
                      {...sx.namePopover}
                      data-stylex-owner="project-setting-name-popover"
                    >
                      <div className="arrow"></div>
                      <div className="popover-title" aria-hidden="true"></div>
                      <div className="popover-content">{t("project.transfer.description6")}</div>
                    </div>
                  ) : null}
                  {oldPlace ? (
                    <div>
                      {t("project.previous.place", { args: [""] })}
                      <span {...sx.oldPlace} data-stylex-owner="project-setting-old-place">
                        {oldPlace}
                      </span>
                    </div>
                  ) : null}
                  <br />
                </dd>
                <dt>
                  <label htmlFor="project-desc">{t("project.description.placeholder")}</label>
                </dt>
                <dd>
                  <textarea
                    ref={overviewRef}
                    id="project-desc"
                    name="overview"
                    maxLength={250}
                    {...sx.textarea}
                    data-stylex-owner="project-setting-description"
                    className="textarea"
                    style={{
                      height: `${overviewHeight}px`,
                      overflow: "hidden",
                      overflowWrap: "break-word",
                      resize: "none",
                    }}
                    value={overview}
                    onChange={(event) => setOverview(event.currentTarget.value)}
                  ></textarea>
                </dd>
              </dl>
            </div>

            <div className="box-wrap middle">
              <div className="cu-label">{t("project.shareOption")}</div>{" "}
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
                </label>{" "}
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
                    </label>{" "}
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
                </label>{" "}
                <span className="note">{t("project.private.notice")}</span>
              </div>
            </div>

            {isGit ? (
              <div className="box-wrap middle">
                <div className="cu-label">{t("issue.template")}</div>{" "}
                <div className="cu-desc">
                  <Link
                    activeOptions={legacyProjectSettingsLinkActiveOptions}
                    activeProps={legacyProjectSettingsLinkSuppressActiveProps}
                    to="/$ownerName/$projectName/postform"
                    params={{ ownerName, projectName }}
                    search={{ issueTemplate: true }}
                    className="ybtn"
                    target="_blank"
                  >
                    {t("issue.template.edit")}
                  </Link>
                </div>
              </div>
            ) : null}

            <div className="box-wrap middle">
              <div className="cu-label">{t("project.codeAccessible")}</div>{" "}
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
                </label>{" "}
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
                  className={`box-wrap middle reviewer-count-wrap ${
                    stylex.props(
                      reviewerCountPanelVisible
                        ? styles.reviewerCountPanelVisible
                        : styles.reviewerCountPanelHidden,
                    ).className
                  }`}
                  id="reviewerCountSettingPanel"
                >
                  <div className="cu-label vmiddle">{t("project.reviewer.count")}</div>{" "}
                  <div className="cu-desc">
                    <input
                      name="isUsingReviewerCount"
                      type="radio"
                      className="radio-btn"
                      id="reviewerCountEnable"
                      value="true"
                      checked={reviewerCountEnabled}
                      onChange={() => setReviewerCountEnabled(true)}
                    />
                    <label htmlFor="reviewerCountEnable" className="bg-radiobtn label-public">
                      {t("project.reviewer.count.enable")}
                    </label>{" "}
                    <input
                      name="isUsingReviewerCount"
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
                      className={`hide ${
                        stylex.props(
                          reviewerCountEnabled
                            ? styles.reviewerCountControlsVisible
                            : styles.reviewerCountControlsHidden,
                        ).className
                      }`}
                    >
                      <input
                        type="hidden"
                        name="defaultReviewerCount"
                        value={selectedDefaultReviewerCount}
                      />
                      <div
                        className={`btn-group branches${reviewerCountDropdownOpen ? " open" : ""}`}
                      >
                        <button
                          className="btn dropdown-toggle large"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setReviewerCountDropdownOpen((open) => !open);
                          }}
                        >
                          <span className="d-label">{selectedDefaultReviewerCount}</span>
                          <span className="d-caret">
                            <span className="caret"></span>
                          </span>
                        </button>
                        <ul className="dropdown-menu">
                          {reviewerPoints.map((point) => (
                            <li data-value={point} key={point}>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setSelectedDefaultReviewerCount(point);
                                  setReviewerCountDropdownOpen(false);
                                }}
                              >
                                {point}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <span className="note ml10">{t("project.reviewer.count.description")}</span>
                    </div>
                  </div>
                </div>

                <div
                  className={`box-wrap middle ${
                    stylex.props(
                      menuCodeChecked
                        ? styles.defaultBranchPanelVisible
                        : styles.defaultBranchPanelHidden,
                    ).className
                  }`}
                  id="defaultBranceSettingPanel"
                >
                  <div className="cu-label vmiddle">{t("code.branches.defaultBranch")}</div>{" "}
                  <div className="cu-desc">
                    <DefaultBranchSelect2 branches={branches} defaultBranch={defaultBranch} />
                  </div>
                </div>
              </>
            ) : null}

            <div className="box-wrap middle">
              <div className="cu-label vmiddle">{t("project.menu.setting")}</div>{" "}
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
                />{" "}
                <MenuCheckbox
                  id="menuSettingIssue"
                  name="issue"
                  defaultChecked={booleanField(menuSetting.issue)}
                  label={t("menu.issue")}
                />{" "}
                {isGit ? (
                  <>
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
                    />{" "}
                  </>
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
                />{" "}
                <MenuCheckbox
                  id="menuSettingMilestone"
                  name="milestone"
                  defaultChecked={booleanField(menuSetting.milestone)}
                  label={t("milestone")}
                />{" "}
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
            <button {...sx.save} data-stylex-owner="project-setting-save" id="save" type="submit">
              {t("button.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function legacyAutosizeContentHeight(textarea: HTMLTextAreaElement) {
  const style = getComputedStyle(textarea);
  const verticalPadding =
    Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
  return Math.max(80, Math.ceil(textarea.scrollHeight - verticalPadding));
}

function DefaultBranchSelect2({
  branches,
  defaultBranch,
}: {
  branches: string[];
  defaultBranch: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(defaultBranch);

  return (
    <>
      <div
        id="s2id_project-default-branch"
        data-stylex-owner="project-setting-default-branch-container"
        className={`${sx.defaultBranchContainer.className} select2-container${open ? " select2-dropdown-open select2-container-active" : ""}`}
      >
        <button
          type="button"
          className="select2-choice"
          {...sx.defaultBranchChoice}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="select2-chosen">
            <strong className="branch-label branch">branch</strong> {selectedBranch}
          </span>
          <span className="select2-arrow" aria-hidden="true">
            <b></b>
          </span>
        </button>
        <input className="select2-focusser select2-offscreen" type="text" />
        <div
          className={`${sx.defaultBranchDrop.className} select2-drop select2-display-none select2-with-searchbox branches${open ? " select2-drop-active" : ""}`}
          data-stylex-owner="project-setting-default-branch-drop"
          {...(open ? sx.defaultBranchDropVisible : {})}
        >
          <div className="select2-search">
            <input className="select2-input" type="text" />
          </div>
          <ul className="select2-results">
            {branches.map((branchName) => (
              <li
                key={branchName}
                className={`select2-results-dept-0 select2-result select2-result-selectable${branchName === selectedBranch ? " select2-selected" : ""}`}
              >
                <button
                  type="button"
                  className="select2-result-label"
                  style={{
                    fontFamily: "inherit",
                    fontSize: "inherit",
                    fontWeight: "inherit",
                    textAlign: "left",
                    width: "100%",
                  }}
                  onClick={() => {
                    setSelectedBranch(branchName);
                    setOpen(false);
                  }}
                >
                  <strong className="branch-label branch">branch</strong> {branchName}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <select
        id="project-default-branch"
        name="defaultBranch"
        data-format="branch"
        data-dropdown-css-class="branches"
        data-stylex-owner="project-setting-default-branch-select"
        className={`${sx.defaultBranchSelect.className} select2-offscreen`}
        tabIndex={-1}
        key={selectedBranch}
        defaultValue={selectedBranch}
        onChange={(event) => setSelectedBranch(event.currentTarget.value)}
      >
        {branches.map((branchName) => (
          <option value={branchName} key={branchName}>
            {branchName}
          </option>
        ))}
      </select>
    </>
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

function ProjectSettingMenu({
  active,
  ownerName,
  project,
  projectName,
  showCode,
  selfRoutePath,
}: {
  active: "setting";
  ownerName: string;
  project: ProjectContainer;
  projectName: string;
  showCode: boolean;
  selfRoutePath: string;
}) {
  const { t } = useLegacyMessages();
  const enrolledMemberCount = enrolledUserCount(project);

  return (
    <ul className="nav nav-tabs">
      <li id="subMenuProjectSetting" className={active === "setting" ? "active" : ""}>
        <Link
          activeOptions={legacyProjectSettingsLinkActiveOptions}
          activeProps={legacyProjectSettingsLinkSuppressActiveProps}
          to={selfRoutePath}
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.setting")}
        </Link>
      </li>
      <li id="subMenuProjectMember" className="">
        <Link
          activeOptions={legacyProjectSettingsLinkActiveOptions}
          activeProps={legacyProjectSettingsLinkSuppressActiveProps}
          to="/$ownerName/$projectName/members"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.member")}
          <CountBadge count={enrolledMemberCount} className="num-badge" />
        </Link>
      </li>
      <li id="subMenuIssueLabel" className="">
        <Link
          activeOptions={legacyProjectSettingsLinkActiveOptions}
          activeProps={legacyProjectSettingsLinkSuppressActiveProps}
          to="/$ownerName/$projectName/issue/labelsform"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("issue.label")}
        </Link>
      </li>
      <li id="subMenuWebhook" className="">
        <Link
          activeOptions={legacyProjectSettingsLinkActiveOptions}
          activeProps={legacyProjectSettingsLinkSuppressActiveProps}
          to="/$ownerName/$projectName/webhooks"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.webhook")}
        </Link>
      </li>
      <li id="subMenuProjectTransfer" className="">
        <Link
          activeOptions={legacyProjectSettingsLinkActiveOptions}
          activeProps={legacyProjectSettingsLinkSuppressActiveProps}
          to="/$ownerName/$projectName/transfer"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.transfer")}
        </Link>
      </li>
      <li id="subMenuProjectDelete" className="">
        <Link
          activeOptions={legacyProjectSettingsLinkActiveOptions}
          activeProps={legacyProjectSettingsLinkSuppressActiveProps}
          to="/$ownerName/$projectName/deleteform"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.delete")}
        </Link>
      </li>
      <li
        id="subMenuProjectChangeVCS"
        className={
          stylex.props(showCode ? styles.changeVcsMenuVisible : styles.changeVcsMenuHidden)
            .className
        }
      >
        <Link
          activeOptions={legacyProjectSettingsLinkActiveOptions}
          activeProps={legacyProjectSettingsLinkSuppressActiveProps}
          to="/$ownerName/$projectName/changeVCS"
          search={() => ({ tabId: undefined })}
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

function projectLogoUrl(project: ProjectContainer, basePath: string) {
  return stringField(project.logoUrl, "") || prefixBasePath(basePath, defaultProjectLogoUrl);
}

function projectOldPlace(project: ProjectContainer) {
  const record = recordField(project);
  const previous = recordField(record.previous);
  const previousPlace = recordField(previous.place);
  const oldPlace =
    stringField(record.oldPlace, "") ||
    stringField(record.previousPlace, "") ||
    stringField(previous.place, "") ||
    stringField(previousPlace.description, "");
  if (!oldPlace || record.hasOldPlace === false) {
    return "";
  }
  return oldPlace;
}

function recordField(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function enrolledUserCount(project: ProjectContainer) {
  const enrolledUsers = recordField(project).enrolledUsers;
  return Array.isArray(enrolledUsers) ? enrolledUsers.length : 0;
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

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const organizationName = stringField(project.organizationName, "");
  if (organizationName) {
    return organizationName;
  }
  return projectIsProtected(project) ? ownerName : undefined;
}

function projectIsProtected(project: ProjectContainer) {
  return (
    project.isProtected === true ||
    project.isProtected === "true" ||
    project.isProtected === 1 ||
    project.isProtected === "1" ||
    stringField(project.projectScope, "").toUpperCase() === "PROTECTED"
  );
}

function selectedLogoFile(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || !value.name || value.size === 0) {
    return null;
  }
  return value;
}

function isImageFileInput(input: HTMLInputElement) {
  const files = Array.from(input.files ?? []);
  if (files.length > 0) {
    return files.every((file) => isImageFile(file, file.name));
  }
  return /\.(gif|bmp|jpg|jpeg|png)$/i.test(input.value);
}

function isImageFile(file: File, fallbackName: string) {
  if (file.type) {
    return file.type.toLowerCase().startsWith("image/");
  }
  return /\.(gif|bmp|jpg|jpeg|png)$/i.test(fallbackName);
}
