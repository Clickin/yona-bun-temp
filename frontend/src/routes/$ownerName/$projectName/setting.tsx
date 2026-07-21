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
  settingBox: stylex.props(styles.settingBox),
  settingBoxLeft: stylex.props(styles.settingBoxLeft),
  settingBoxRight: stylex.props(styles.settingBoxRight),
  logo: stylex.props(styles.logo),
  logoDesc: stylex.props(styles.logoDesc),
  descsItem: stylex.props(styles.descsItem),
  descsLast: stylex.props(styles.descsLast),
  input: stylex.props(styles.input),
  nameField: stylex.props(styles.nameField),
  namePopover: stylex.props(styles.namePopover),
  textarea: stylex.props(styles.textarea),
  oldPlace: stylex.props(styles.oldPlace),
  radioInput: stylex.props(styles.radioInput),
  defaultBranchContainer: stylex.props(styles.defaultBranchContainer),
  defaultBranchDrop: stylex.props(styles.defaultBranchDrop),
  defaultBranchDropHidden: stylex.props(styles.defaultBranchDropHidden),
  defaultBranchDropVisible: stylex.props(styles.defaultBranchDropVisible),
  defaultBranchChoice: stylex.props(styles.defaultBranchChoice),
  defaultBranchChosen: stylex.props(styles.defaultBranchChosen),
  defaultBranchLabel: stylex.props(styles.defaultBranchLabel),
  defaultBranchArrow: stylex.props(styles.defaultBranchArrow),
  defaultBranchArrowGlyph: stylex.props(styles.defaultBranchArrowGlyph),
  defaultBranchSearch: stylex.props(styles.defaultBranchSearch),
  defaultBranchSearchInput: stylex.props(styles.defaultBranchSearchInput),
  defaultBranchResults: stylex.props(styles.defaultBranchResults),
  defaultBranchResultItem: stylex.props(styles.defaultBranchResultItem),
  defaultBranchResult: stylex.props(styles.defaultBranchResult),
  defaultBranchSelect: stylex.props(styles.defaultBranchSelect),
  issueTemplateEdit: stylex.props(styles.issueTemplateEdit),
} as const;

const textareaStaticStyles = stylex.create({
  overflow: { overflow: "hidden", overflowWrap: "break-word", resize: "none" },
});

const reviewerDropdownStyles = stylex.create({
  group: {
    display: "inline-block",
    position: "relative",
    verticalAlign: "middle",
  },
  toggle: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(0,0,0,.15)",
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: "0 1px 0 rgba(0,0,0,.05)",
    color: "#333333",
    display: "inline-block",
    fontSize: "14px",
    lineHeight: "20px",
    marginBottom: "0px",
    marginLeft: ".3em",
    outline: "0px",
    padding: "0px",
    paddingLeft: "12px",
    position: "relative",
    textAlign: "left",
    textShadow: "none",
    transition: "all 0.3s ease",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  },
  toggleOpen: { backgroundColor: "#f2f2f2" },
  label: {
    display: "inline-block",
    float: "left",
    margin: "0px",
    overflow: "hidden",
    padding: "4px 0px",
    paddingRight: "9px",
    width: "116px",
  },
  caretWrap: {
    float: "right",
    margin: "0px",
    padding: "4px 9px",
  },
  caret: {
    borderLeftColor: "transparent",
    borderLeftStyle: "solid",
    borderLeftWidth: "4px",
    borderRightColor: "transparent",
    borderRightStyle: "solid",
    borderRightWidth: "4px",
    borderTopColor: "#4f4f4f",
    borderTopStyle: "solid",
    borderTopWidth: "4px",
    display: "inline-block",
    height: "0px",
    verticalAlign: "top",
    width: "0px",
  },
  menu: {
    backgroundClip: "padding-box",
    backgroundColor: "#ffffff",
    borderColor: "rgba(0,0,0,0.2)",
    borderRadius: "2px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: "-2px 2px 1px rgba(0,0,0,0.1)",
    float: "left",
    left: "0px",
    listStyle: "none",
    margin: "2px 0px 0px",
    minWidth: "160px",
    overflow: "hidden",
    padding: "0px",
    position: "absolute",
    top: "100%",
    zIndex: "1000",
  },
  menuHidden: { display: "none" },
  menuVisible: { display: "block" },
  item: { marginBottom: "1px" },
});

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
  const textareaClassName = [
    "textarea",
    sx.textarea.className,
    stylex.props(styles.textareaHeight(`${overviewHeight}px`)).className,
    stylex.props(textareaStaticStyles.overflow).className,
  ]
    .filter(Boolean)
    .join(" ");
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
              <div
                className={`${sx.settingBox.className} ${sx.settingBoxLeft.className} setting-box left`}
                data-stylex-owner="project-setting-setting-box-left"
              >
                <div
                  {...sx.logo}
                  {...stylex.props(
                    styles.logoBackground(
                      `url('${projectLogoUrl(project, runtimeConfig.basePath)}')`,
                    ),
                  )}
                  className={`${sx.logo.className} ${stylex.props(styles.logoBackground(`url('${projectLogoUrl(project, runtimeConfig.basePath)}')`)).className ?? ""}`.trim()}
                  data-stylex-owner="project-setting-logo"
                ></div>
                <div
                  className={`${sx.logoDesc.className} logo-desc`}
                  data-stylex-owner="project-setting-logo-desc"
                >
                  <ul className="unstyled descs" data-stylex-owner="project-setting-descs">
                    <li
                      className={sx.descsItem.className}
                      data-stylex-owner="project-setting-descs-item"
                    >
                      <strong>{t("project.logo")}</strong>
                    </li>
                    <li
                      className={sx.descsItem.className}
                      data-stylex-owner="project-setting-descs-item"
                    >
                      {t("project.logo.type")}{" "}
                      <span
                        {...stylex.props(styles.point)}
                        className={`${stylex.props(styles.point).className} point`}
                        data-stylex-owner="project-setting-point"
                      >
                        bmp, jpg, gif, png
                      </span>
                    </li>
                    <li
                      className={sx.descsItem.className}
                      data-stylex-owner="project-setting-descs-item"
                    >
                      {t("project.logo.maxFileSize")}{" "}
                      <span
                        {...stylex.props(styles.point)}
                        className={`${stylex.props(styles.point).className} point`}
                        data-stylex-owner="project-setting-point"
                      >
                        5MB
                      </span>
                    </li>
                    <li
                      className={sx.descsLast.className}
                      data-stylex-owner="project-setting-descs-last"
                    >
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
              <dl
                className={`${sx.settingBox.className} ${sx.settingBoxRight.className} setting-box right`}
                data-stylex-owner="project-setting-setting-box-right"
              >
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
                    data-stylex-owner="project-setting-description"
                    className={textareaClassName}
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
                  className={`${sx.radioInput.className} radio-btn`}
                  id="public"
                  value="PUBLIC"
                  defaultChecked={projectScope === "PUBLIC"}
                  data-stylex-owner="project-setting-radio-public"
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
                  className={`${sx.radioInput.className} radio-btn`}
                  id="private"
                  value="PRIVATE"
                  defaultChecked={projectScope === "PRIVATE"}
                  data-stylex-owner="project-setting-radio-private"
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
                    className={`${sx.issueTemplateEdit.className} ybtn`}
                    data-stylex-owner="project-setting-issue-template-edit"
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
                  className={`${sx.radioInput.className} radio-btn`}
                  value="true"
                  defaultChecked={booleanField(recordField(project).codeMemberOnly)}
                  data-stylex-owner="project-setting-radio-code-members"
                />
                <label htmlFor="codeAccessibleMemberOnly" className="bg-radiobtn label-public">
                  {t("button.yes")}
                </label>{" "}
                <input
                  name="isCodeAccessibleMemberOnly"
                  type="radio"
                  id="codeAccessibleAnyone"
                  className={`${sx.radioInput.className} radio-btn`}
                  value="false"
                  defaultChecked={!booleanField(recordField(project).codeMemberOnly)}
                  data-stylex-owner="project-setting-radio-code-anyone"
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
                      className={`${sx.radioInput.className} radio-btn`}
                      id="reviewerCountEnable"
                      value="true"
                      checked={reviewerCountEnabled}
                      onChange={() => setReviewerCountEnabled(true)}
                      data-stylex-owner="project-setting-radio-reviewer-enable"
                    />
                    <label htmlFor="reviewerCountEnable" className="bg-radiobtn label-public">
                      {t("project.reviewer.count.enable")}
                    </label>{" "}
                    <input
                      name="isUsingReviewerCount"
                      type="radio"
                      className={`${sx.radioInput.className} radio-btn`}
                      id="reviewerCountDisable"
                      value="false"
                      checked={!reviewerCountEnabled}
                      onChange={() => setReviewerCountEnabled(false)}
                      data-stylex-owner="project-setting-radio-reviewer-disable"
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
                        className={`btn-group branches${reviewerCountDropdownOpen ? " open" : ""} ${stylex.props(reviewerDropdownStyles.group).className}`}
                        data-stylex-owner="project-reviewer-count-dropdown"
                      >
                        <button
                          className={`btn dropdown-toggle large ${
                            stylex.props(
                              reviewerDropdownStyles.toggle,
                              reviewerCountDropdownOpen ? reviewerDropdownStyles.toggleOpen : null,
                            ).className
                          }`}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setReviewerCountDropdownOpen((open) => !open);
                          }}
                        >
                          <span
                            className={`d-label ${stylex.props(reviewerDropdownStyles.label).className}`}
                          >
                            {selectedDefaultReviewerCount}
                          </span>
                          <span
                            className={`d-caret ${stylex.props(reviewerDropdownStyles.caretWrap).className}`}
                          >
                            <span
                              className={`caret ${stylex.props(reviewerDropdownStyles.caret).className}`}
                            ></span>
                          </span>
                        </button>
                        <ul
                          className={`dropdown-menu ${
                            stylex.props(
                              reviewerDropdownStyles.menu,
                              reviewerCountDropdownOpen
                                ? reviewerDropdownStyles.menuVisible
                                : reviewerDropdownStyles.menuHidden,
                            ).className
                          }`}
                        >
                          {reviewerPoints.map((point) => (
                            <li
                              className={stylex.props(reviewerDropdownStyles.item).className}
                              data-value={point}
                              key={point}
                            >
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
                  first
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
            <button
              {...stylex.props(styles.save)}
              data-stylex-owner="project-setting-save"
              id="save"
              type="submit"
            >
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
  const [searchTerm, setSearchTerm] = useState("");
  const visibleBranches = branches.filter((branchName) =>
    branchName.toLowerCase().includes(searchTerm.trim().toLowerCase()),
  );

  return (
    <>
      <div
        id="s2id_project-default-branch"
        data-stylex-owner="project-setting-default-branch-container"
        className={`${sx.defaultBranchContainer.className} select2-container${open ? " select2-dropdown-open select2-container-active" : ""}`}
      >
        <button
          type="button"
          {...sx.defaultBranchChoice}
          className={`${sx.defaultBranchChoice.className ?? ""} select2-choice`.trim()}
          data-stylex-owner="project-setting-default-branch-choice"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <span
            className={`select2-chosen ${sx.defaultBranchChosen.className ?? ""}`.trim()}
            data-stylex-owner="project-setting-default-branch-chosen"
          >
            <strong
              className={`branch-label branch ${sx.defaultBranchLabel.className ?? ""}`.trim()}
              data-stylex-owner="project-setting-default-branch-label"
            >
              branch
            </strong>{" "}
            {selectedBranch}
          </span>
          <span
            className={`select2-arrow ${sx.defaultBranchArrow.className ?? ""}`.trim()}
            data-stylex-owner="project-setting-default-branch-arrow"
            aria-hidden="true"
          >
            <b
              className={sx.defaultBranchArrowGlyph.className}
              data-stylex-owner="project-setting-default-branch-arrow-glyph"
            ></b>
          </span>
        </button>
        <input className="select2-focusser select2-offscreen" type="text" />
        <div
          className={`${sx.defaultBranchDrop.className} select2-drop select2-display-none select2-with-searchbox branches ${open ? `select2-drop-active ${sx.defaultBranchDropVisible.className ?? ""}` : (sx.defaultBranchDropHidden.className ?? "")}`.trim()}
          data-stylex-owner="project-setting-default-branch-drop"
        >
          <div
            className={`select2-search ${sx.defaultBranchSearch.className ?? ""}`.trim()}
            data-stylex-owner="project-setting-default-branch-search"
          >
            <input
              className={`select2-input ${sx.defaultBranchSearchInput.className ?? ""}`.trim()}
              data-stylex-owner="project-setting-default-branch-search-input"
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              type="text"
              value={searchTerm}
            />
          </div>
          <ul
            className={`select2-results ${sx.defaultBranchResults.className ?? ""}`.trim()}
            data-stylex-owner="project-setting-default-branch-results"
          >
            {visibleBranches.map((branchName) => (
              <li
                key={branchName}
                className={`select2-results-dept-0 select2-result select2-result-selectable ${sx.defaultBranchResultItem.className ?? ""}${branchName === selectedBranch ? " select2-selected" : ""}`.trim()}
                data-stylex-owner="project-setting-default-branch-result-item"
              >
                <button
                  type="button"
                  {...sx.defaultBranchResult}
                  className={`select2-result-label ${sx.defaultBranchResult.className ?? ""}`.trim()}
                  data-stylex-owner="project-setting-default-branch-result"
                  onClick={() => {
                    setSelectedBranch(branchName);
                    setOpen(false);
                    setSearchTerm("");
                  }}
                >
                  <strong
                    className={`branch-label branch ${sx.defaultBranchLabel.className ?? ""}`.trim()}
                    data-stylex-owner="project-setting-default-branch-result-label"
                  >
                    branch
                  </strong>{" "}
                  {branchName}
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
  first = false,
  id,
  label,
  name,
  onChange,
}: {
  checked?: boolean;
  defaultChecked?: boolean;
  first?: boolean;
  id: string;
  label: string;
  name: string;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label
      className={`${stylex.props(styles.menuCheckboxLabel, first && styles.menuCheckboxLabelFirst).className} bg-radiobtn label-public inline-list`}
      htmlFor={id}
      data-stylex-owner={`project-menu-checkbox-${name}-label`}
    >
      <input
        type="checkbox"
        className={`${stylex.props(styles.menuCheckboxInput).className} radio-btn`}
        data-stylex-owner={`project-menu-checkbox-${name}-input`}
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
