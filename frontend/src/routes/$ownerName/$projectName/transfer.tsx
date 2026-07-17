import { useState, type ChangeEvent, type MouseEvent } from "react";
import * as stylex from "@stylexjs/stylex";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  readProjectContainerQueryOptions,
  readProjectTransferQueryOptions,
  requestProjectTransferRest,
} from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { ProjectContainer } from "../../../api/types";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YoramQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../$projectName";
import { projectTransferColors } from "./-transfer.stylex";

const styles = stylex.create({
  bubble: {
    backgroundColor: projectTransferColors.bubbleSurface,
  },
  row: {
    color: projectTransferColors.descriptionText,
  },
  label: {
    color: projectTransferColors.labelText,
  },
  description: {
    color: projectTransferColors.descriptionText,
  },
  input: {
    backgroundColor: projectTransferColors.inputSurface,
    borderColor: projectTransferColors.inputBorder,
    color: projectTransferColors.inputText,
  },
  notices: {
    color: projectTransferColors.noticeText,
  },
  notice: {
    color: projectTransferColors.noticeText,
  },
  checkbox: {
    accentColor: projectTransferColors.checkboxAccent,
  },
  agreementLabel: {
    color: projectTransferColors.agreementText,
  },
  actionBox: {
    padding: { default: "20px 0 12px", "@media (max-width: 720px)": "10px 0" },
    textAlign: "center",
  },
  action: {
    backgroundColor: {
      default: projectTransferColors.actionSurface,
      ":hover": projectTransferColors.actionHoverSurface,
      ":focus": projectTransferColors.actionHoverSurface,
      ":active": projectTransferColors.actionHoverSurface,
    },
    borderColor: {
      default: projectTransferColors.actionBorder,
      ":hover": projectTransferColors.actionHoverBorder,
      ":focus": projectTransferColors.actionHoverBorder,
      ":active": projectTransferColors.actionHoverBorder,
    },
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: projectTransferColors.actionShadow,
    color: {
      default: projectTransferColors.actionText,
      ":hover": projectTransferColors.actionHoverText,
      ":focus": projectTransferColors.actionHoverText,
      ":active": projectTransferColors.actionHoverText,
    },
    cursor: "pointer",
    display: "inline-block",
    fontSize: "14px",
    fontWeight: "400",
    lineHeight: "20px",
    margin: "0 0 0 .3em",
    outline: "0 none",
    padding: "4px 12px",
    position: "relative",
    textAlign: "center",
    textDecoration: { default: "none", ":hover": "none", ":focus": "none", ":active": "none" },
    transition: "all 0.3s ease",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    zIndex: "2",
  },
  firstAction: { marginLeft: "0" },
  dangerAction: {
    backgroundColor: {
      default: projectTransferColors.dangerSurface,
      ":hover": projectTransferColors.dangerBorder,
      ":focus": projectTransferColors.dangerBorder,
      ":active": projectTransferColors.dangerBorder,
    },
    borderColor: {
      default: projectTransferColors.dangerBorder,
      ":hover": projectTransferColors.dangerBorder,
      ":focus": projectTransferColors.dangerBorder,
      ":active": projectTransferColors.dangerBorder,
    },
    color: {
      default: projectTransferColors.primaryText,
      ":hover": projectTransferColors.primaryText,
      ":focus": projectTransferColors.primaryText,
      ":active": projectTransferColors.primaryText,
    },
  },
  modal: {
    backgroundColor: projectTransferColors.modalSurface,
    borderColor: projectTransferColors.modalBorder,
    borderRadius: "6px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: projectTransferColors.modalShadow,
    color: projectTransferColors.modalText,
    left: { default: "50%", "@media (max-width: 720px)": "0" },
    marginLeft: { default: "-280px", "@media (max-width: 720px)": "0" },
    outline: "none",
    position: "fixed",
    top: "10%",
    width: { default: "560px", "@media (max-width: 720px)": "100%" },
    zIndex: "1050",
  },
  modalClosed: { display: "none" },
  modalOpen: { display: "block" },
  header: {
    borderBottomColor: projectTransferColors.footerBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    padding: "9px 15px",
  },
  close: {
    background: "transparent",
    border: "0",
    color: projectTransferColors.backdrop,
    cursor: "pointer",
    float: "right",
    fontSize: "20px",
    fontWeight: "700",
    lineHeight: "20px",
    marginTop: "2px",
    opacity: { default: "0.2", ":hover": "0.4", ":focus": "0.4" },
    padding: "0",
    textShadow: projectTransferColors.closeTextShadow,
  },
  heading: { fontSize: "24.5px", fontWeight: "700", lineHeight: "30px", margin: "0" },
  body: { maxHeight: "400px", overflowY: "auto", padding: "15px", position: "relative" },
  footer: {
    backgroundColor: projectTransferColors.footerSurface,
    borderRadius: "0 0 6px 6px",
    borderTopColor: projectTransferColors.footerBorder,
    borderTopStyle: "solid",
    borderTopWidth: "1px",
    boxShadow: projectTransferColors.footerShadow,
    padding: "14px 15px 15px",
    textAlign: "right",
  },
  backdrop: {
    backgroundColor: projectTransferColors.backdrop,
    bottom: "0",
    left: "0",
    opacity: "0.5",
    position: "fixed",
    right: "0",
    top: "0",
    zIndex: "1040",
  },
});

const actionBoxStyleProps = stylex.props(styles.actionBox);
const dangerActionStyleProps = stylex.props(styles.action, styles.firstAction, styles.dangerAction);
const defaultActionStyleProps = stylex.props(styles.action);
const headerStyleProps = stylex.props(styles.header);
const closeStyleProps = stylex.props(styles.close);
const headingStyleProps = stylex.props(styles.heading);
const bodyStyleProps = stylex.props(styles.body);
const footerStyleProps = stylex.props(styles.footer);
const backdropStyleProps = stylex.props(styles.backdrop);

const legacyLinkActiveOptions = {
  exact: true,
  explicitUndefined: true,
  includeSearch: true,
} as const;
const legacyLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
} as const;

export const Route = createFileRoute("/$ownerName/$projectName/transfer")({
  component: ProjectTransferRoute,
});

function ProjectTransferRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return <ProjectTransferRouteScreen renderProjectShell={false} runtimeConfig={runtimeConfig} />;
}

export function ProjectTransferRouteScreen({
  renderProjectShell = true,
  runtimeConfig,
}: {
  renderProjectShell?: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const content = (
    <ProjectTransferRouteShell
      renderProjectShell={renderProjectShell}
      runtimeConfig={runtimeConfig}
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

function ProjectTransferRouteShell({
  renderProjectShell,
  runtimeConfig,
}: {
  renderProjectShell: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const projectSearchScope = projectQuery.data
    ? {
        organizationName: projectSearchScopeOrganizationName(projectQuery.data, ownerName),
        ownerName,
        projectName,
      }
    : { ownerName, projectName };

  const screen = (
    <ProjectTransferScreen renderProjectShell={renderProjectShell} runtimeConfig={runtimeConfig} />
  );

  if (!renderProjectShell) {
    return screen;
  }

  return (
    <SiteLayoutShell
      projectSearchScope={projectSearchScope}
      runtimeConfig={runtimeConfig}
      showLegacyProjectHeaderLinks
    >
      {screen}
    </SiteLayoutShell>
  );
}

function ProjectTransferScreen({
  renderProjectShell,
  runtimeConfig,
}: {
  renderProjectShell: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const transferQuery = useQuery(
    readProjectTransferQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!projectQuery.data || !transferQuery.data) {
    return null;
  }

  return (
    <>
      <title>{`${t("title.projectTransfer")} - ${ownerName}/${projectName}`}</title>
      <ProjectTransferBody
        project={projectQuery.data}
        renderProjectShell={renderProjectShell}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

function ProjectTransferBody({
  project,
  renderProjectShell,
  runtimeConfig,
}: {
  project: ProjectContainer;
  renderProjectShell: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const [destination, setDestination] = useState("");
  const [isTransferAccepted, setIsTransferAccepted] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [hasTransferRequestStarted, setHasTransferRequestStarted] = useState(false);
  const transferMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return requestProjectTransferRest(runtimeConfig, csrfToken, {
        destination,
        ownerName,
        projectName,
      });
    },
    onSuccess(response) {
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.transfer(ownerName, projectName),
      });
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.base(ownerName, projectName),
      });
      if (typeof response.redirectPath === "string") {
        router.history.push(prefixBasePath(runtimeConfig.basePath, response.redirectPath));
      } else {
        router.history.go(0);
      }
    },
    onError() {
      setIsTransferModalOpen(false);
      // oxlint-disable-next-line no-alert -- legacy project.Transfer.js uses $yobi.alert for request failures.
      window.alert(t("project.transfer.error"));
    },
  });
  const insulateTransferModalButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const openTransferModal = (event: MouseEvent<HTMLButtonElement>) => {
    insulateTransferModalButtonClick(event);
    if (!isTransferAccepted) {
      // oxlint-disable-next-line no-alert -- legacy project.Transfer.js uses $yobi.alert before opening the modal.
      window.alert(t("project.transfer.alert"));
      return;
    }
    setIsTransferModalOpen(true);
  };
  const closeTransferModal = () => {
    setIsTransferModalOpen(false);
  };
  const dismissTransferModal = (event: MouseEvent<HTMLButtonElement>) => {
    insulateTransferModalButtonClick(event);
    closeTransferModal();
  };

  return (
    <>
      {renderProjectShell ? (
        <>
          <ProjectHeader basePath={runtimeConfig.basePath} project={project} />
          <ProjectMenu active="setting" basePath={runtimeConfig.basePath} project={project} />
        </>
      ) : null}
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <ProjectSettingMenu ownerName={ownerName} project={project} projectName={projectName} />
          <div
            {...stylex.props(styles.bubble)}
            className={`${stylex.props(styles.bubble).className} bubble-wrap gray wp`}
            data-stylex-owner="project-transfer-bubble"
          >
            <div
              {...stylex.props(styles.row)}
              className={`${stylex.props(styles.row).className} row-fluid`}
              data-stylex-owner="project-transfer-owner-row"
            >
              <div
                {...stylex.props(styles.label)}
                className={`${stylex.props(styles.label).className} cu-label`}
                data-stylex-owner="project-transfer-owner-label"
              >
                {t("project.transfer.new.owner")}
              </div>{" "}
              <div
                {...stylex.props(styles.description)}
                className={`${stylex.props(styles.description).className} cu-desc`}
                data-stylex-owner="project-transfer-owner-description"
              >
                <p>
                  <input
                    {...stylex.props(styles.input)}
                    type="text"
                    id="owner"
                    name="owner"
                    className={stylex.props(styles.input).className}
                    data-stylex-owner="project-transfer-owner-input"
                    value={destination}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      setDestination(event.target.value);
                    }}
                  />
                </p>
              </div>
            </div>
            <div
              {...stylex.props(styles.row)}
              className={`${stylex.props(styles.row).className} row-fluid`}
              data-stylex-owner="project-transfer-agreement-row"
            >
              <div
                {...stylex.props(styles.label)}
                className={`${stylex.props(styles.label).className} cu-label`}
                data-stylex-owner="project-transfer-agreement-label"
              >
                {t("project.transfer")}
              </div>{" "}
              <div
                {...stylex.props(styles.description)}
                className={`${stylex.props(styles.description).className} cu-desc`}
                data-stylex-owner="project-transfer-agreement-description"
              >
                <ul
                  {...stylex.props(styles.notices)}
                  className={stylex.props(styles.notices).className}
                  data-stylex-owner="project-transfer-notices"
                >
                  <li
                    {...stylex.props(styles.notice)}
                    className={`${stylex.props(styles.notice).className} notice`}
                    data-stylex-owner="project-transfer-notice"
                  >
                    <strong>{t("project.transfer.description1")}</strong>
                  </li>
                  <li
                    {...stylex.props(styles.notice)}
                    className={`${stylex.props(styles.notice).className} notice`}
                    data-stylex-owner="project-transfer-notice"
                  >
                    <strong>{t("project.transfer.description2")}</strong>
                  </li>
                  <li
                    {...stylex.props(styles.notice)}
                    className={`${stylex.props(styles.notice).className} notice`}
                    data-stylex-owner="project-transfer-notice"
                  >
                    <strong>{t("project.transfer.description3")}</strong>
                  </li>
                  <li
                    {...stylex.props(styles.notice)}
                    className={`${stylex.props(styles.notice).className} notice`}
                    data-stylex-owner="project-transfer-notice"
                  >
                    <strong>{t("project.transfer.description4")}</strong>
                  </li>
                  <li
                    {...stylex.props(styles.notice)}
                    className={`${stylex.props(styles.notice).className} notice`}
                    data-stylex-owner="project-transfer-notice"
                  >
                    <strong>{t("project.transfer.description5")}</strong>
                  </li>
                </ul>
                <p>
                  <input
                    type="checkbox"
                    {...stylex.props(styles.checkbox)}
                    className={`${stylex.props(styles.checkbox).className} checkbox`}
                    data-stylex-owner="project-transfer-checkbox"
                    autoComplete="off"
                    id="accept"
                    checked={isTransferAccepted}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      setIsTransferAccepted(event.target.checked);
                    }}
                  />
                  <label
                    {...stylex.props(styles.agreementLabel)}
                    htmlFor="accept"
                    className={`${stylex.props(styles.agreementLabel).className} bg-checkbox label-agreement`}
                    data-stylex-owner="project-transfer-agreement"
                  >
                    {t("project.transfer.accept")}
                  </label>
                </p>
              </div>
            </div>
          </div>
          <div
            {...actionBoxStyleProps}
            className={actionBoxStyleProps.className}
            data-stylex-owner="project-transfer-action"
          >
            <button
              {...dangerActionStyleProps}
              type="button"
              id="btnTransfer"
              className={dangerActionStyleProps.className}
              data-stylex-owner="project-transfer-action"
              onClick={openTransferModal}
            >
              <i className="yobicon-database"></i> {t("project.transfer.this")}
            </button>
          </div>
          <div
            {...stylex.props(
              styles.modal,
              isTransferModalOpen ? styles.modalOpen : styles.modalClosed,
            )}
            id="alertTransfer"
            data-stylex-owner="project-transfer-modal"
            aria-hidden={!isTransferModalOpen}
          >
            <div
              {...headerStyleProps}
              className={headerStyleProps.className}
              data-stylex-owner="project-transfer-modal-header"
            >
              <button
                {...closeStyleProps}
                type="button"
                className={closeStyleProps.className}
                data-stylex-owner="project-transfer-modal-header"
                onClick={dismissTransferModal}
              >
                ×
              </button>
              <h3
                {...headingStyleProps}
                className={headingStyleProps.className}
                data-stylex-owner="project-transfer-modal-header"
              >
                {t("project.transfer.requestion")}
              </h3>
            </div>
            <div
              {...bodyStyleProps}
              className={bodyStyleProps.className}
              data-stylex-owner="project-transfer-modal-body"
            >
              <p>{t("project.transfer.description")}</p>
              <p>{t("project.transfer.reaccept")}</p>
            </div>
            <div
              {...footerStyleProps}
              className={footerStyleProps.className}
              data-stylex-owner="project-transfer-modal-footer"
            >
              <button
                {...dangerActionStyleProps}
                id="btnTransferExec"
                type="button"
                className={dangerActionStyleProps.className}
                data-stylex-owner="project-transfer-modal-footer"
                disabled={hasTransferRequestStarted || transferMutation.isPending}
                onClick={() => {
                  if (hasTransferRequestStarted || transferMutation.isPending) {
                    return;
                  }
                  setHasTransferRequestStarted(true);
                  transferMutation.mutate();
                }}
              >
                {t("button.yes")}
              </button>
              <button
                {...defaultActionStyleProps}
                type="button"
                className={defaultActionStyleProps.className}
                data-stylex-owner="project-transfer-modal-footer"
                onClick={dismissTransferModal}
              >
                {t("button.no")}
              </button>
            </div>
          </div>
          {isTransferModalOpen ? (
            // oxlint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- legacy Bootstrap backdrop is a div and dismisses the transfer modal on click.
            <div
              {...backdropStyleProps}
              className={backdropStyleProps.className}
              data-stylex-owner="project-transfer-modal-backdrop"
              onClick={closeTransferModal}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}

function ProjectSettingMenu({
  ownerName,
  project,
  projectName,
}: {
  ownerName: string;
  project: ProjectContainer;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const memberEnrollmentCount = projectMemberCount(project);

  return (
    <ul className="nav nav-tabs">
      <li id="subMenuProjectSetting" className="">
        <Link
          activeOptions={legacyLinkActiveOptions}
          activeProps={legacyLinkActiveProps}
          to="/$ownerName/$projectName/setting"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.setting")}
        </Link>
      </li>
      <li id="subMenuProjectMember" className="">
        <Link
          activeOptions={legacyLinkActiveOptions}
          activeProps={legacyLinkActiveProps}
          to="/$ownerName/$projectName/members"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.member")}
          <CountBadge count={memberEnrollmentCount} className="num-badge" />
        </Link>
      </li>
      <li id="subMenuIssueLabel" className="">
        <Link
          activeOptions={legacyLinkActiveOptions}
          activeProps={legacyLinkActiveProps}
          to="/$ownerName/$projectName/issue/labelsform"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("issue.label")}
        </Link>
      </li>
      <li id="subMenuWebhook" className="">
        <Link
          activeOptions={legacyLinkActiveOptions}
          activeProps={legacyLinkActiveProps}
          to="/$ownerName/$projectName/webhooks"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.webhook")}
        </Link>
      </li>
      <li id="subMenuProjectTransfer" className="active">
        <Link
          activeOptions={legacyLinkActiveOptions}
          activeProps={legacyLinkActiveProps}
          to="/$ownerName/$projectName/transfer"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.transfer")}
        </Link>
      </li>
      <li id="subMenuProjectDelete" className="">
        <Link
          activeOptions={legacyLinkActiveOptions}
          activeProps={legacyLinkActiveProps}
          to="/$ownerName/$projectName/deleteform"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.delete")}
        </Link>
      </li>
      <li
        id="subMenuProjectChangeVCS"
        className=""
        style={booleanField(projectMenuSetting(project).code) ? undefined : { display: "none" }}
      >
        <Link
          activeOptions={legacyLinkActiveOptions}
          activeProps={legacyLinkActiveProps}
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

function countField(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function booleanField(value: unknown) {
  return value === true;
}

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const organizationName = stringField(project.organizationName, "");
  if (organizationName) {
    return organizationName;
  }
  return booleanField(project.isProtected) ? ownerName : undefined;
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

function projectMemberCount(project: ProjectContainer) {
  const record = recordField(project);
  return countField(record.enrolledUsers);
}
