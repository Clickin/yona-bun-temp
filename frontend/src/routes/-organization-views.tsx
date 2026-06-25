import * as React from "react";
import { uploadTemporaryAttachment } from "../api/attachments";
import {
  LEGACY_DEFAULT_LANGUAGE,
  lookupLegacyMessage,
  useLegacyMessages,
  type LegacyI18nContextValue,
} from "../i18n";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import type {
  OrganizationAdminViewModel,
  OrganizationDetailViewModel,
  OrganizationIssueListViewModel,
} from "./-view-models";
import { legacyIssueLabelClassName } from "./-shared";

type LegacyMessageLookup = LegacyI18nContextValue["t"];

function legacyMessage(messages: LegacyMessageLookup | undefined, key: string, args?: string[]) {
  if (messages) {
    return messages(key, args ? { args } : undefined);
  }
  return lookupLegacyMessage(LEGACY_DEFAULT_LANGUAGE, key, args ? { args } : undefined);
}

export function buildOrganizationHref(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  suffix = "",
) {
  const normalizedSuffix = suffix === "" ? "" : `/${suffix.replace(/^\/+/, "")}`;
  return prefixBasePath(
    runtimeConfig.basePath,
    `/organizations/${organizationName}${normalizedSuffix}`,
  );
}

function buildOrganizationIssueHref(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  query: OrganizationIssueListQuery,
  updates: Partial<OrganizationIssueListQuery>,
) {
  const nextQuery = { ...query, ...updates };
  const search = new URLSearchParams();
  if (nextQuery.state) {
    search.set("state", nextQuery.state);
  }
  if (nextQuery.filter) {
    search.set("filter", nextQuery.filter);
  }
  if (nextQuery.orderBy) {
    search.set("orderBy", nextQuery.orderBy);
  }
  if (nextQuery.orderDir) {
    search.set("orderDir", nextQuery.orderDir);
  }
  if (nextQuery.authorId) {
    search.set("authorId", String(nextQuery.authorId));
  }
  if (nextQuery.assigneeId) {
    search.set("assigneeId", String(nextQuery.assigneeId));
  }
  if (nextQuery.mentionId) {
    search.set("mentionId", String(nextQuery.mentionId));
  }
  for (const projectName of nextQuery.projectNames) {
    search.append("projectNames", projectName);
  }
  search.set("pageNum", String(nextQuery.pageNum || 1));
  const suffix = `issues?${search.toString()}`;
  return buildOrganizationHref(runtimeConfig, organizationName, suffix);
}

function legacyMessageWithKeyFallback(
  messages: LegacyMessageLookup | undefined,
  key: string,
  args?: string[],
) {
  if (messages) {
    return messages(key, args ? { args } : undefined);
  }
  return lookupLegacyMessage(LEGACY_DEFAULT_LANGUAGE, key, args ? { args } : undefined);
}

function LegacyTwoColumnModeCheckboxArea(props: { messages?: LegacyMessageLookup }) {
  return (
    <div
      className="two-column-icon mr10 hide-in-mobile"
      data-content={legacyMessage(props.messages, "common.two.column.mode.desc")}
      id="two-column-mode-checkbox"
      title={legacyMessage(props.messages, "common.two.column.mode")}
    >
      <label
        className="checkbox"
        aria-label={legacyMessage(props.messages, "common.two.column.view")}
      >
        <div className="two-column-icon-border">
          <input id="two-column-mode" type="checkbox" />
          <span className="two-column-mode-text">
            {legacyMessage(props.messages, "common.two.column.view")}
          </span>
        </div>
      </label>
    </div>
  );
}

function userInfoHref(runtimeConfig: RuntimeConfig, loginId: string) {
  return prefixBasePath(runtimeConfig.basePath, `/${loginId}`);
}

function isOrganizationLogoImageFile(file: File) {
  if (file.type.toLowerCase().startsWith("image/")) {
    return true;
  }
  return /\.(?:bmp|gif|jpe?g|png)$/i.test(file.name);
}

function isLegacyOrganizationName(name: string) {
  return /^[a-zA-Z0-9-가-힣]+([_.][a-zA-Z0-9-가-힣]+)*$/.test(name);
}

export interface OrganizationIssueListQuery {
  assigneeId: number;
  authorId: number;
  filter: string;
  mentionId: number;
  orderBy: string;
  orderDir: string;
  pageNum: number;
  projectNames: string[];
  state: string;
}

export function OrganizationMenu(props: {
  active?: "boards" | "home" | "issues" | "pullrequests" | "settings";
  detail: OrganizationDetailViewModel;
  messages?: LegacyMessageLookup;
  runtimeConfig: RuntimeConfig;
}) {
  const { detail, messages, runtimeConfig } = props;

  return (
    <div className="project-menu-outer">
      <div className="project-menu-inner">
        <ul className="project-menu-nav project-menu-gruop">
          <li className={props.active === "home" ? "active" : undefined}>
            <a href={buildOrganizationHref(runtimeConfig, detail.organizationName)}>
              {legacyMessage(messages, "title.organizationHome")}
            </a>
          </li>
          <li className={props.active === "issues" ? "active" : undefined}>
            <a href={buildOrganizationHref(runtimeConfig, detail.organizationName, "issues")}>
              {legacyMessage(messages, "menu.issue")}
            </a>
          </li>
          <li className={props.active === "boards" ? "active" : undefined}>
            <a href={buildOrganizationHref(runtimeConfig, detail.organizationName, "boards")}>
              {legacyMessage(messages, "menu.board")}
            </a>
          </li>
          <li className={props.active === "pullrequests" ? "active" : undefined}>
            <a href={buildOrganizationHref(runtimeConfig, detail.organizationName, "pullrequests")}>
              {legacyMessage(messages, "menu.pullRequest")}
            </a>
          </li>
        </ul>
        <div className="project-setting">
          <ul className="project-menu-nav">
            {detail.viewerCanUpdate ? (
              <li className={props.active === "settings" ? "active" : undefined}>
                <a
                  href={buildOrganizationHref(
                    runtimeConfig,
                    detail.organizationName,
                    "settingform",
                  )}
                >
                  <i className="yobicon-cog" />
                  <span className="blind">{legacyMessage(messages, "menu.admin")}</span>
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function OrganizationHeader(props: {
  detail: OrganizationDetailViewModel;
  messages?: LegacyMessageLookup;
  onCancelEnrollOrganization?: (organizationName: string) => void;
  onEnrollOrganization?: (organizationName: string) => void;
  runtimeConfig: RuntimeConfig;
}) {
  const { detail, messages, runtimeConfig } = props;
  const organizationHref = buildOrganizationHref(runtimeConfig, detail.organizationName);
  const logoUrl =
    detail.logoUrl ??
    prefixBasePath(runtimeConfig.basePath, "/assets/images/organization_default_logo.png");
  const enrollmentHref = buildOrganizationHref(
    runtimeConfig,
    detail.organizationName,
    detail.enrollmentRequested ? "cancel/enroll" : "enroll",
  );

  return (
    <div
      className="project-header-outer"
      style={logoUrl ? { backgroundImage: `url('${logoUrl}')` } : undefined}
    >
      <div className="project-header-inner">
        <div className="project-header-wrap">
          <div className="project-header-avatar">
            <img alt="" src={logoUrl} />
          </div>
          <div className="project-breadcrumb-wrap">
            <div className="project-breadcrumb">
              <span className="project-author">
                <span className="group-title-head">group</span>
                <a href={organizationHref}>{detail.organizationName}</a>
              </span>
            </div>
          </div>
          {detail.viewerCanEnroll ? (
            <div className="project-util-wrap">
              <ul className="project-util">
                <li>
                  <button
                    className={`ybtn ybtn-small${
                      detail.enrollmentRequested ? " ybtn-info" : ""
                    } dropdown-toggle`}
                    data-toggle="dropdown"
                    type="button"
                  >
                    <i className="yobicon-addfriend" />{" "}
                    {legacyMessage(messages, "organization.member.enrollment.title")}
                  </button>
                  <div className="dropdown-menu flat right title">
                    <div className="pop-title">
                      {detail.enrollmentRequested
                        ? legacyMessage(messages, "organization.you.want.to.be.a.member", [
                            detail.organizationName,
                          ])
                        : legacyMessage(messages, "organization.you.may.want.to.be.a.member", [
                            detail.organizationName,
                          ])}
                    </div>
                    <div className="pop-content">
                      {detail.enrollmentRequested
                        ? legacyMessage(messages, "organization.member.enrollment.help.after")
                        : legacyMessage(messages, "organization.member.enrollment.help.before")}
                    </div>
                    <div className="pop-content btn-wrap">
                      <a
                        className={`ybtn${
                          detail.enrollmentRequested ? "" : " ybtn-info"
                        } enrollBtn`}
                        href={enrollmentHref}
                        id="enrollBtn"
                        onClick={(event) => {
                          event.preventDefault();
                          const handler = detail.enrollmentRequested
                            ? props.onCancelEnrollOrganization
                            : props.onEnrollOrganization;
                          if (!handler) {
                            return;
                          }
                          handler(detail.organizationName);
                        }}
                      >
                        <i
                          className={
                            detail.enrollmentRequested
                              ? "yobicon-removefriend"
                              : "yobicon-addfriend"
                          }
                        />{" "}
                        {detail.enrollmentRequested
                          ? legacyMessage(messages, "button.cancel.enrollment")
                          : legacyMessage(messages, "button.new.enrollment")}
                      </a>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function OrganizationSettingsSubMenu(props: {
  active?: "settings" | "members" | "delete";
  messages?: LegacyMessageLookup;
  organizationName: string;
  runtimeConfig: RuntimeConfig;
}) {
  return (
    <ul className="nav nav-tabs">
      <li className={props.active === "settings" ? "active" : undefined}>
        <a href={buildOrganizationHref(props.runtimeConfig, props.organizationName, "settingform")}>
          {legacyMessage(props.messages, "organization.settingFrom")}
        </a>
      </li>
      <li className={props.active === "members" ? "active" : undefined}>
        <a href={buildOrganizationHref(props.runtimeConfig, props.organizationName, "members")}>
          {legacyMessage(props.messages, "organization.member")}
        </a>
      </li>
      <li className={props.active === "delete" ? "active" : undefined}>
        <a href={buildOrganizationHref(props.runtimeConfig, props.organizationName, "deleteForm")}>
          {legacyMessage(props.messages, "organization.delete")}
        </a>
      </li>
    </ul>
  );
}

function OrganizationMemberBubble(props: {
  members: NonNullable<OrganizationDetailViewModel["adminMembers"]>;
  messages?: LegacyMessageLookup;
  runtimeConfig: RuntimeConfig;
  title: string;
}) {
  return (
    <div className="bubble-wrap gray project-home organization-home">
      <div className="bubble-wrap gray organization-home">
        <div className="inner member-info">
          <header>
            <h3>{legacyMessage(props.messages, props.title)}</h3>
          </header>
          <div className="organization-member-wrap">
            <div className="member-wrap">
              <ul className="project-members unstyled">
                {props.members.map((member) => {
                  const userHref = prefixBasePath(
                    props.runtimeConfig.basePath,
                    `/${member.loginId}`,
                  );
                  return (
                    <li className="member" key={`${props.title}-${member.loginId}`}>
                      <a
                        className="avatar-wrap"
                        data-placement="top"
                        data-toggle="tooltip"
                        href={userHref}
                        title={member.loginId}
                      >
                        <img alt={member.loginId} height={45} src={member.avatarUrl} width={45} />
                      </a>
                      <a
                        data-placement="top"
                        data-toggle="tooltip"
                        href={userHref}
                        title={member.loginId}
                      >
                        {member.userLabel}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrganizationMembershipActions(props: {
  detail: OrganizationDetailViewModel;
  messages?: LegacyMessageLookup;
  onLeaveOrganization?: (organizationName: string) => void;
  runtimeConfig: RuntimeConfig;
}) {
  const { detail } = props;
  const [modalOpen, setModalOpen] = React.useState(false);

  if (detail.viewerCanLeave) {
    return (
      <>
        <button
          className="ybtn ybtn-minimum ybtn-danger pull-right"
          data-href={buildOrganizationHref(props.runtimeConfig, detail.organizationName, "leave")}
          id="groupLeaveBtn"
          onClick={(event) => {
            event.preventDefault();
            setModalOpen(true);
          }}
          type="button"
        >
          {legacyMessage(props.messages, "organization.member.leave")}
        </button>
        <div className={modalOpen ? "modal" : "modal hide"} id="alertLeave">
          <div className="modal-header">
            <button
              aria-label={legacyMessage(props.messages, "button.close")}
              className="close"
              data-dismiss="modal"
              onClick={() => setModalOpen(false)}
              type="button"
            >
              ×
            </button>
            <h3>{legacyMessage(props.messages, "organization.member.leave")}</h3>
          </div>
          <div className="modal-body">
            <p>{legacyMessage(props.messages, "organization.member.leaveConfirm")}</p>
          </div>
          <div className="modal-footer">
            <button
              className="ybtn ybtn-info ybtn-mini"
              id="leaveBtn"
              onClick={() => {
                props.onLeaveOrganization?.(detail.organizationName);
                setModalOpen(false);
              }}
              type="button"
            >
              {legacyMessage(props.messages, "button.yes")}
            </button>
            <button
              className="ybtn ybtn-mini"
              data-dismiss="modal"
              onClick={() => setModalOpen(false)}
              type="button"
            >
              {legacyMessage(props.messages, "button.no")}
            </button>
          </div>
        </div>
      </>
    );
  }

  return null;
}

export function OrganizationNewPage(props: {
  onCreateOrganization?: (input: { description: string; organizationName: string }) => void;
  pending?: boolean;
}) {
  const { t: messages } = useLegacyMessages();
  const [formState, setFormState] = React.useState({
    description: "",
    organizationName: "",
  });
  const [validationMessage, setValidationMessage] = React.useState<string | null>(null);

  return (
    <main className="app-shell organization-new-shell">
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="form-wrap new-project">
            <form
              className="frm-wrap"
              name="new-org"
              onSubmit={(event) => {
                event.preventDefault();
                if (!isLegacyOrganizationName(formState.organizationName)) {
                  setValidationMessage("organization.name.alert");
                  return;
                }
                setValidationMessage(null);
                props.onCreateOrganization?.(formState);
              }}
            >
              <legend>{legacyMessage(messages, "title.newOrganization")}</legend>
              <dl>
                <dt>
                  <label htmlFor="name">
                    {legacyMessage(messages, "organization.name.placeholder")}
                  </label>
                </dt>
                <dd>
                  <input
                    className="text"
                    id="name"
                    maxLength={250}
                    name="name"
                    placeholder=""
                    type="text"
                    value={formState.organizationName}
                    onChange={(event) => {
                      setFormState((current) => ({
                        ...current,
                        organizationName: event.target.value,
                      }));
                      setValidationMessage(null);
                    }}
                  />
                  <div className="n-alert" data-errtype="name">
                    <div className="orange-txt">
                      <span
                        className="msg wrongName"
                        style={{ display: validationMessage ? undefined : "none" }}
                      >
                        {validationMessage ? legacyMessage(messages, validationMessage) : null}
                      </span>
                    </div>
                  </div>
                </dd>
                <dt>
                  <label htmlFor="descr">
                    {legacyMessage(messages, "organization.description.placeholder")}
                  </label>
                </dt>
                <dd>
                  <textarea
                    className="text textarea span4"
                    id="descr"
                    name="descr"
                    style={{ resize: "vertical" }}
                    value={formState.description}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </dd>
              </dl>
              <div className="actions">
                <button className="ybtn ybtn-success" disabled={props.pending} type="submit">
                  <i className="yobicon-friends" />
                  {` ${legacyMessage(messages, "organization.create")}`}
                </button>
                <a className="ybtn" href="/">
                  {legacyMessage(messages, "button.cancel")}
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

export function OrganizationDetailPage(props: {
  detail: OrganizationDetailViewModel | null | undefined;
  messages?: LegacyMessageLookup;
  runtimeConfig: RuntimeConfig;
  onCancelEnrollOrganization?: (organizationName: string) => void;
  onEnrollOrganization?: (organizationName: string) => void;
  onLeaveOrganization?: (organizationName: string) => void;
}) {
  const detail = props.detail ?? {
    adminMembers: [],
    description: "",
    enrollmentRequested: false,
    memberMembers: [],
    organizationName: "",
    viewerCanCreateProject: false,
    viewerCanEnroll: false,
    viewerCanLeave: false,
    viewerCanUpdate: false,
    visibleProjects: [],
  };
  const [projectFilter, setProjectFilter] = React.useState("");
  const normalizedProjectFilter = projectFilter.trim().toLocaleLowerCase();
  const visibleProjects = (detail.visibleProjects ?? []).filter((project) => {
    if (!normalizedProjectFilter) {
      return true;
    }
    return `${project.projectName} ${project.overview}`
      .toLocaleLowerCase()
      .includes(normalizedProjectFilter);
  });

  return (
    <main className="app-shell organization-page">
      <OrganizationHeader
        detail={detail}
        messages={props.messages}
        onCancelEnrollOrganization={props.onCancelEnrollOrganization}
        onEnrollOrganization={props.onEnrollOrganization}
        runtimeConfig={props.runtimeConfig}
      />
      <OrganizationMenu
        active="home"
        detail={detail}
        messages={props.messages}
        runtimeConfig={props.runtimeConfig}
      />
      <div className="page-wrap-outer">
        <div className="project-page-wrap organization-home-wrap">
          <div className="project-home-header row-fluid">
            <div className="project-overview span9 span-hard-wrap">
              <h3 className="markdown-wrap">
                <span className="project-description" id="project-description">
                  {detail.description}
                </span>
              </h3>
            </div>
          </div>
          <div className="row-fluid organization-home-body">
            <div className="span9 span-left-pane">
              <div className="project-search-wrap row-fluid mt10">
                <div className="span7">
                  <div className="search-bar">
                    <input
                      className="textbox full"
                      data-items="project-item"
                      data-toggle="item-search"
                      id="mylist-filter"
                      name="mylist-filter"
                      onChange={(event) => setProjectFilter(event.currentTarget.value)}
                      placeholder={legacyMessage(props.messages, "title.type.name")}
                      type="text"
                      value={projectFilter}
                    />
                    <button className="search-btn" type="button">
                      <i className="yobicon-search" />
                    </button>
                  </div>
                </div>
                {detail.viewerCanCreateProject ? (
                  <div className="pull-right">
                    <a
                      className="ybtn ybtn-primary"
                      href={prefixBasePath(
                        props.runtimeConfig.basePath,
                        `/projectform?owner=${encodeURIComponent(detail.organizationName)}`,
                      )}
                    >
                      {legacyMessage(props.messages, "button.newProject")}
                    </a>
                  </div>
                ) : null}
              </div>
              <div className="project-list-wrap organization-project-list">
                <ul className="all-projects organization-project-list">
                  {visibleProjects.map((project) => {
                    const projectHref = prefixBasePath(
                      props.runtimeConfig.basePath,
                      `/${project.ownerName}/${project.projectName}`,
                    );
                    const ownerHref = prefixBasePath(
                      props.runtimeConfig.basePath,
                      `/${project.ownerName}`,
                    );
                    const originHref =
                      project.originOwnerName && project.originProjectName
                        ? prefixBasePath(
                            props.runtimeConfig.basePath,
                            `/${project.originOwnerName}/${project.originProjectName}`,
                          )
                        : "";
                    return (
                      <li
                        className="project"
                        data-item="project-item"
                        data-value={`${project.projectName} ${project.overview}`}
                        key={`${project.ownerName}/${project.projectName}`}
                      >
                        <div className="listitem organization-project-card">
                          <div className="info-wrap">
                            <div className="owner-avatar-wrap hide-in-mobile">
                              <a href={projectHref}>
                                {project.logoUrl ? (
                                  <img alt={`${project.projectName}.name`} src={project.logoUrl} />
                                ) : null}
                              </a>
                            </div>
                            <div className="organization-project-info">
                              <div className="header">
                                <a className="black" href={projectHref}>
                                  {project.projectName}
                                </a>
                                {originHref ? (
                                  <span className="small-font blue-txt">
                                    <a className="origin-title" href={originHref}>
                                      <i className="yobicon-split" />
                                      {project.originOwnerName} / {project.originProjectName}
                                    </a>
                                  </span>
                                ) : null}
                                {project.projectScope === "private" ? (
                                  <i className="yobicon-lock yobicon-small" />
                                ) : null}
                                {project.projectScope === "protected" ? (
                                  <span className="project-protected" title="Group Project">
                                    G
                                  </span>
                                ) : null}
                              </div>
                              <div className="desc">{project.overview}</div>
                              <p className="name-tag">
                                by{" "}
                                <a className="owner-name-small" href={ownerHref}>
                                  {project.ownerName}
                                </a>{" "}
                                at{" "}
                                <strong title={project.createdLabel}>{project.createdLabel}</strong>
                                {project.lastPushedLabel ? (
                                  <span className="small-font">
                                    , {legacyMessage(props.messages, "project.codeUpdate")}{" "}
                                    <strong title={project.lastPushedLabel}>
                                      {project.lastPushedLabel}
                                    </strong>
                                  </span>
                                ) : null}
                              </p>
                            </div>
                          </div>
                          <div className="stats-wrap pull-right">
                            <div className="members">
                              <ul className="unstyled" />
                              <p>
                                <i className="yobicon-friends yobicon-middle" />
                                <strong>{project.memberCount}</strong> <i className="yobicon-eye" />{" "}
                                <strong>{project.watchCount}</strong>{" "}
                                {project.isWatching ? (
                                  <i
                                    className="yobicon-lightbulb ramp-on"
                                    data-toggle="tooltip"
                                    title={legacyMessage(
                                      props.messages,
                                      "project.default.group.watching",
                                    )}
                                  />
                                ) : (
                                  <i
                                    className="yobicon-lightbulb ramp-off"
                                    data-toggle="tooltip"
                                    title={legacyMessageWithKeyFallback(
                                      props.messages,
                                      "project.you.are.not.watching",
                                      [""],
                                    )}
                                  />
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
            <aside className="span3 span-right-pane">
              <OrganizationMembershipActions
                detail={detail}
                messages={props.messages}
                onLeaveOrganization={props.onLeaveOrganization}
                runtimeConfig={props.runtimeConfig}
              />
              {detail.adminMembers?.length ? (
                <OrganizationMemberBubble
                  members={detail.adminMembers}
                  messages={props.messages}
                  runtimeConfig={props.runtimeConfig}
                  title="user.role.org_admin"
                />
              ) : null}
              {detail.memberMembers?.length ? (
                <OrganizationMemberBubble
                  members={detail.memberMembers}
                  messages={props.messages}
                  runtimeConfig={props.runtimeConfig}
                  title="user.role.org_member"
                />
              ) : null}
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}

export function OrganizationIssueListPage(props: {
  currentUserId: number;
  detail: OrganizationDetailViewModel | null | undefined;
  issueList: OrganizationIssueListViewModel | null | undefined;
  messages?: LegacyMessageLookup;
  query: OrganizationIssueListQuery;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? {
    description: "",
    organizationName: props.issueList?.organizationName ?? "",
    viewerCanUpdate: false,
  };
  const issueList = props.issueList;
  const query = props.query;
  const organizationName = detail.organizationName || issueList?.organizationName || "";
  const openHref = buildOrganizationIssueHref(props.runtimeConfig, organizationName, query, {
    pageNum: 1,
    state: "open",
  });
  const closedHref = buildOrganizationIssueHref(props.runtimeConfig, organizationName, query, {
    pageNum: 1,
    state: "closed",
  });
  const authoredHref = buildOrganizationIssueHref(props.runtimeConfig, organizationName, query, {
    assigneeId: 0,
    authorId: props.currentUserId,
    mentionId: 0,
    pageNum: 1,
  });
  const assignedHref = buildOrganizationIssueHref(props.runtimeConfig, organizationName, query, {
    assigneeId: props.currentUserId,
    authorId: 0,
    mentionId: 0,
    pageNum: 1,
  });
  const mentionedHref = buildOrganizationIssueHref(props.runtimeConfig, organizationName, query, {
    assigneeId: 0,
    authorId: 0,
    mentionId: props.currentUserId,
    pageNum: 1,
  });
  const allHref = buildOrganizationIssueHref(props.runtimeConfig, organizationName, query, {
    assigneeId: 0,
    authorId: 0,
    mentionId: 0,
    pageNum: 1,
  });
  const issueItems = issueList?.items ?? [];
  const state = query.state || "open";
  const totalPageCount = Math.ceil((issueList?.totalCount ?? 0) / (issueList?.pageSize || 1));
  const orderDirFor = (orderBy: string) =>
    query.orderBy === orderBy && query.orderDir === "desc" ? "asc" : "desc";
  const orderHref = (orderBy: string) =>
    buildOrganizationIssueHref(props.runtimeConfig, organizationName, query, {
      orderBy,
      orderDir: orderDirFor(orderBy),
      pageNum: 1,
    });

  return (
    <main>
      <OrganizationHeader
        detail={detail}
        messages={props.messages}
        runtimeConfig={props.runtimeConfig}
      />
      <OrganizationMenu
        active="issues"
        detail={detail}
        messages={props.messages}
        runtimeConfig={props.runtimeConfig}
      />
      <div className="page-wrap-outer">
        <div className="page-wrap">
          <div className="row-fluid issue-list-wrap" data-pjax-container="">
            <aside className="left-menu span2 span-hard-wrap">
              <div className="inner advanced">
                <ul className="lst-stacked unstyled">
                  <li
                    className={
                      !query.assigneeId && !query.authorId && !query.mentionId
                        ? "active"
                        : undefined
                    }
                  >
                    <a
                      data-assignee-id=""
                      data-author-id=""
                      data-mention-id=""
                      data-milestone-id=""
                      data-pjax-filter=""
                      data-project-names={query.projectNames.join(",")}
                      href={allHref}
                    >
                      {legacyMessage(props.messages, "issue.list.all")}
                    </a>
                  </li>
                  {props.currentUserId > 0 ? (
                    <>
                      <li
                        className={query.assigneeId === props.currentUserId ? "active" : undefined}
                      >
                        <a
                          data-assignee-id={props.currentUserId}
                          data-author-id=""
                          data-mention-id=""
                          data-milestone-id=""
                          data-pjax-filter=""
                          data-project-names={query.projectNames.join(",")}
                          href={assignedHref}
                        >
                          {legacyMessage(props.messages, "issue.list.assignedToMe")}
                        </a>
                      </li>
                      <li className={query.authorId === props.currentUserId ? "active" : undefined}>
                        <a
                          data-assignee-id=""
                          data-author-id={props.currentUserId}
                          data-mention-id=""
                          data-milestone-id=""
                          data-pjax-filter=""
                          data-project-names={query.projectNames.join(",")}
                          href={authoredHref}
                        >
                          {legacyMessage(props.messages, "issue.list.authoredByMe")}
                        </a>
                      </li>
                      <li
                        className={query.mentionId === props.currentUserId ? "active" : undefined}
                      >
                        <a
                          data-assignee-id=""
                          data-author-id=""
                          data-mention-id={props.currentUserId}
                          data-milestone-id=""
                          data-pjax-filter=""
                          data-project-names={query.projectNames.join(",")}
                          href={mentionedHref}
                        >
                          {legacyMessage(props.messages, "issue.list.mentionedOfMe")}
                        </a>
                      </li>
                    </>
                  ) : null}
                </ul>
                <form
                  action={buildOrganizationHref(props.runtimeConfig, organizationName, "issues")}
                  id="search"
                  method="get"
                  name="search"
                >
                  <select
                    data-container-css-class="fullsize"
                    data-placeholder={legacyMessage(props.messages, "organization.choose.projects")}
                    data-toggle="select2"
                    defaultValue={query.projectNames}
                    id="projects"
                    multiple
                    name="projectNames[]"
                  >
                    {(issueList?.visibleProjects ?? []).map((project) => (
                      <option
                        data-avatar-url=""
                        key={project.projectName}
                        value={project.projectName}
                      >
                        {project.projectName}
                      </option>
                    ))}
                  </select>
                  <hr />
                  <input name="orderBy" type="hidden" value={query.orderBy} />
                  <input name="orderDir" type="hidden" value={query.orderDir} />
                  <input name="state" type="hidden" value={state} />
                  <input
                    data-search="authorId"
                    name="authorId"
                    type="hidden"
                    value={query.authorId || ""}
                  />
                  <input
                    data-search="assigneeId"
                    name="assigneeId"
                    type="hidden"
                    value={query.assigneeId || ""}
                  />
                  <input
                    data-search="mentionId"
                    name="mentionId"
                    type="hidden"
                    value={query.mentionId || ""}
                  />
                  <div className="search">
                    <div className="search-bar">
                      <input
                        className="textbox full"
                        defaultValue={query.filter}
                        name="filter"
                        type="text"
                      />
                      <button className="search-btn" type="submit">
                        <i className="yobicon-search" />
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </aside>
            <section className="span10 span-hard-wrap" id="span10">
              <ul className="nav nav-tabs nm">
                <li className={state === "open" ? "active" : undefined}>
                  <a data-state="open" href={openHref}>
                    {legacyMessage(props.messages, "issue.state.open")}{" "}
                    <span className="num-badge">{issueList?.openIssueCount ?? 0}</span>
                  </a>
                </li>
                <li className={state === "closed" ? "active" : undefined}>
                  <a data-state="closed" href={closedHref}>
                    {legacyMessage(props.messages, "issue.state.closed")}{" "}
                    <span className="num-badge">{issueList?.closedIssueCount ?? 0}</span>
                  </a>
                </li>
                <li>
                  <LegacyTwoColumnModeCheckboxArea messages={props.messages} />
                </li>
              </ul>
              {issueItems.length > 0 ? (
                <>
                  <div className="filter-wrap small-heights">
                    {issueItems.length > 1 ? (
                      <div className="filters pull-right">
                        {[
                          ["dueDate", "common.order.dueDate"],
                          ["updatedDate", "common.order.updatedDate"],
                          ["createdDate", "common.order.date"],
                          ["numOfComments", "common.order.comments"],
                        ].map(([orderBy, label]) => (
                          <a
                            className={query.orderBy === orderBy ? "filter active" : "filter"}
                            data-order-by={orderBy}
                            data-order-dir={orderDirFor(orderBy)}
                            href={orderHref(orderBy)}
                            key={orderBy}
                          >
                            <i
                              className={`ico btn-gray-arrow ${
                                query.orderBy === orderBy && query.orderDir !== "desc" ? "" : "down"
                              }`}
                            />
                            {legacyMessage(props.messages, label)}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <ul className="post-list-wrap">
                    {issueItems.map((issue) => {
                      const issueHref = prefixBasePath(
                        props.runtimeConfig.basePath,
                        `/${issue.ownerName}/${issue.projectName}/issue/${issue.issueNumber}`,
                      );
                      const legacyIssueId = issue.id && issue.id > 0 ? issue.id : issue.issueNumber;
                      const projectHref = prefixBasePath(
                        props.runtimeConfig.basePath,
                        `/${issue.ownerName}/${issue.projectName}`,
                      );
                      const labelHrefBase = buildOrganizationIssueHref(
                        props.runtimeConfig,
                        organizationName,
                        query,
                        { pageNum: 1 },
                      );
                      const authorHref = issue.authorLoginId
                        ? userInfoHref(props.runtimeConfig, issue.authorLoginId)
                        : "#";
                      const assigneeHref = issue.assigneeLoginId
                        ? userInfoHref(props.runtimeConfig, issue.assigneeLoginId)
                        : "#";
                      return (
                        <li
                          className="post-item title"
                          data-href={issueHref}
                          id={`issue-item-${legacyIssueId}`}
                          key={`${issue.ownerName}/${issue.projectName}/${issue.issueNumber}`}
                        >
                          <div className="span10 span-hard-wrap">
                            <a
                              className={`avatar-wrap mlarge hide-in-mobile${
                                issue.authorAvatarUrl ? "" : " empty-avatar-wrap"
                              }`}
                              data-placement="top"
                              data-toggle="tooltip"
                              href={authorHref}
                              title={
                                issue.authorLoginId ||
                                issue.authorLabel ||
                                legacyMessage(props.messages, "issue.noAuthor")
                              }
                            >
                              {issue.authorAvatarUrl ? (
                                <img
                                  alt={issue.authorLabel}
                                  height={32}
                                  src={issue.authorAvatarUrl}
                                  width={32}
                                />
                              ) : (
                                "\u00a0"
                              )}
                            </a>
                            <div className="title-wrap">
                              <a className="title" href={issueHref}>
                                {issue.title}
                              </a>
                            </div>
                            <div className="infos">
                              {issue.authorLoginId && issue.authorLabel ? (
                                <a
                                  className="infos-item infos-link-item"
                                  data-placement="top"
                                  data-toggle="tooltip"
                                  href={authorHref}
                                  title={issue.authorLoginId}
                                >
                                  {issue.authorLabel}
                                </a>
                              ) : (
                                <span className="infos-item">
                                  {legacyMessage(props.messages, "issue.noAuthor")}
                                </span>
                              )}
                              <span className="infos-item">{issue.updatedLabel}</span>
                              {issue.milestoneTitle ? (
                                <span className="infos-item mileston-tag">
                                  {issue.milestoneTitle}
                                </span>
                              ) : null}
                              {issue.commentCount > 0 || issue.voterCount > 0 ? (
                                <span className="infos-item item-count-groups">
                                  {issue.commentCount > 0 ? (
                                    <a className="num-comments" href={`${issueHref}#comments`}>
                                      {issue.commentCount}
                                    </a>
                                  ) : null}
                                  {issue.voterCount > 0 ? (
                                    <a className="num-hearts strong" href={`${issueHref}#vote`}>
                                      {issue.voterCount}
                                    </a>
                                  ) : null}
                                </span>
                              ) : null}
                              <a className="infos-link-item group-project-name" href={projectHref}>
                                {issue.projectName}
                              </a>
                              <span className="post-id margin-right-5">#{issue.issueNumber}</span>
                              {issue.labels.map((label) => (
                                <a
                                  className={legacyIssueLabelClassName(
                                    "label issue-label list-label",
                                    label.color,
                                  )}
                                  data-label-id={label.id}
                                  href={`${labelHrefBase}&labelIds=${label.id}`}
                                  key={label.id}
                                  style={{ background: label.color || "#ddd" }}
                                >
                                  {label.name}
                                </a>
                              ))}
                            </div>
                          </div>
                          <div className="span2 hide-in-mobile">
                            <div className="mt5 pull-right">
                              {issue.assigneeLabel ? (
                                <a
                                  className={`avatar-wrap assinee${
                                    issue.assigneeAvatarUrl ? "" : " empty-avatar-wrap"
                                  }`}
                                  data-placement="top"
                                  data-toggle="tooltip"
                                  href={assigneeHref}
                                  title={`${legacyMessage(props.messages, "issue.assignee")}: ${
                                    issue.assigneeLabel
                                  }`}
                                >
                                  {issue.assigneeAvatarUrl ? (
                                    <img
                                      alt={issue.assigneeLabel}
                                      height={32}
                                      src={issue.assigneeAvatarUrl}
                                      width={32}
                                    />
                                  ) : (
                                    "\u00a0"
                                  )}
                                </a>
                              ) : (
                                <div className="empty-avatar-wrap">&nbsp;</div>
                              )}
                            </div>
                            {issue.dueDateLabel ? (
                              <div
                                className={`mr20 mt10 pull-right${
                                  issue.dueDateOverdue ? " overdue" : ""
                                }`}
                                data-placement="top"
                                data-toggle="tooltip"
                                title={issue.dueDateLabel}
                              >
                                <i className="yobicon-clock2" />
                                {issue.dueDateLabel}
                              </div>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div id="pagination" data-total={totalPageCount}>
                    <a
                      className="pageNum active"
                      href={buildOrganizationIssueHref(
                        props.runtimeConfig,
                        organizationName,
                        query,
                        {
                          pageNum: issueList?.pageNum ?? 1,
                        },
                      )}
                    >
                      {issueList?.pageNum ?? 1}
                    </a>
                  </div>
                </>
              ) : (
                <div className="error-wrap">
                  <i className="ico ico-err1" />
                  <p>{legacyMessage(props.messages, "issue.is.empty")}</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

export function OrganizationSettingsPage(props: {
  csrfToken?: string;
  detail: OrganizationDetailViewModel | null | undefined;
  messages?: LegacyMessageLookup;
  pending?: boolean;
  runtimeConfig: RuntimeConfig;
  onUpdateOrganization?: (input: {
    currentOrganizationName: string;
    description: string;
    logoAttachmentId?: number;
    organizationName: string;
  }) => void;
}) {
  const detail = props.detail ?? {
    description: "",
    organizationName: "",
    viewerCanUpdate: false,
  };
  const [formState, setFormState] = React.useState({
    currentOrganizationName: detail.organizationName,
    description: detail.description,
    logoAttachmentId: undefined as number | undefined,
    organizationName: detail.organizationName,
  });
  const [logoPreviewUrl, setLogoPreviewUrl] = React.useState(detail.logoUrl ?? "");
  const [validationMessage, setValidationMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setFormState({
      currentOrganizationName: detail.organizationName,
      description: detail.description,
      logoAttachmentId: undefined,
      organizationName: detail.organizationName,
    });
    setLogoPreviewUrl(detail.logoUrl ?? "");
    setValidationMessage(null);
  }, [detail.description, detail.logoUrl, detail.organizationName]);

  return (
    <main className="app-shell organization-settings-shell">
      <OrganizationHeader
        detail={detail}
        messages={props.messages}
        runtimeConfig={props.runtimeConfig}
      />
      <OrganizationMenu
        active="settings"
        detail={detail}
        messages={props.messages}
        runtimeConfig={props.runtimeConfig}
      />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <OrganizationSettingsSubMenu
            active="settings"
            messages={props.messages}
            organizationName={detail.organizationName}
            runtimeConfig={props.runtimeConfig}
          />
          <form
            className="nm"
            encType="multipart/form-data"
            id="saveSetting"
            name="update-org"
            onSubmit={(event) => {
              event.preventDefault();
              if (!isLegacyOrganizationName(formState.organizationName)) {
                setValidationMessage("organization.name.alert");
                return;
              }
              setValidationMessage(null);
              props.onUpdateOrganization?.(formState);
            }}
          >
            <input name="id" type="hidden" value={detail.organizationName} />
            <div className="bubble-wrap gray">
              <div className="box-wrap top clearfix frm-wrap" style={{ paddingTop: 20 }}>
                <div className="setting-box left">
                  <div
                    className="logo-wrap"
                    style={
                      logoPreviewUrl ? { backgroundImage: `url('${logoPreviewUrl}')` } : undefined
                    }
                  />
                  <div className="logo-desc">
                    <strong>{legacyMessage(props.messages, "organization.logo")}</strong>
                    <ul className="unstyled descs">
                      <li>{legacyMessage(props.messages, "organization.logo.type")}</li>
                      <li>{legacyMessage(props.messages, "organization.logo.maxFileSize")}</li>
                    </ul>
                    <div className="nbtn medium white fake-file-wrap">
                      <i className="yobicon-upload" />
                      {` ${legacyMessage(props.messages, "button.upload")}`}
                      <input
                        accept="image/*"
                        className="file"
                        id="logoPath"
                        name="logoPath"
                        type="file"
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];
                          if (file && !isOrganizationLogoImageFile(file)) {
                            setValidationMessage("project.logo.alert");
                            event.currentTarget.value = "";
                            return;
                          }
                          setValidationMessage(null);
                          if (!file || !props.csrfToken) {
                            return;
                          }
                          void uploadTemporaryAttachment(
                            props.runtimeConfig,
                            props.csrfToken,
                            file,
                          ).then((attachment) => {
                            setFormState((current) => ({
                              ...current,
                              logoAttachmentId: attachment.id,
                            }));
                            setLogoPreviewUrl(attachment.url);
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
                <dl className="setting-box right">
                  <dt>
                    <label htmlFor="project-name">
                      {legacyMessage(props.messages, "organization.name.placeholder")}
                    </label>
                  </dt>
                  <dd>
                    <input
                      id="project-name"
                      maxLength={250}
                      name="name"
                      type="text"
                      value={formState.organizationName}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          organizationName: event.target.value,
                        }))
                      }
                    />
                    <div className="orange-txt">
                      <span
                        className="msg wrongName"
                        style={{ display: validationMessage ? undefined : "none" }}
                      >
                        {validationMessage
                          ? legacyMessage(props.messages, validationMessage)
                          : null}
                      </span>
                    </div>
                  </dd>
                  <dt>
                    <label htmlFor="project-desc">
                      {legacyMessage(props.messages, "organization.description.placeholder")}
                    </label>
                  </dt>
                  <dd>
                    <textarea
                      className="textarea"
                      id="project-desc"
                      maxLength={250}
                      name="descr"
                      value={formState.description}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </dd>
                </dl>
              </div>
              <div className="box-wrap bottom">
                <button
                  className="ybtn ybtn-success"
                  disabled={props.pending}
                  id="save"
                  type="submit"
                >
                  {legacyMessage(props.messages, "button.save")}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

export function OrganizationMembersPage(props: {
  detail: OrganizationAdminViewModel | null | undefined;
  messages?: LegacyMessageLookup;
  pending?: boolean;
  runtimeConfig: RuntimeConfig;
  onAcceptEnrollment?: (organizationName: string, userId: string) => void;
  onAddMember?: (organizationName: string, loginId: string) => void;
  onDeleteMember?: (organizationName: string, userId: string) => void;
  onUpdateMemberRole?: (organizationName: string, userId: string, role: string) => void;
}) {
  const detail = props.detail ?? {
    deleteAllowed: false,
    enrollmentRequests: [],
    members: [],
    organizationName: "",
    roleOptions: [],
    viewerCanUpdate: false,
  };
  const [loginId, setLoginId] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<null | string>(null);
  const organizationDetail = {
    description: "",
    organizationName: detail.organizationName,
    viewerCanUpdate: detail.viewerCanUpdate,
  };

  return (
    <main className="app-shell">
      <OrganizationHeader
        detail={organizationDetail}
        messages={props.messages}
        runtimeConfig={props.runtimeConfig}
      />
      <OrganizationMenu
        detail={organizationDetail}
        messages={props.messages}
        runtimeConfig={props.runtimeConfig}
      />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <OrganizationSettingsSubMenu
            active="members"
            messages={props.messages}
            organizationName={detail.organizationName}
            runtimeConfig={props.runtimeConfig}
          />

          <div className="inner-bubble">
            <form
              className="nm"
              id="addNewMember"
              onSubmit={(event) => {
                event.preventDefault();
                props.onAddMember?.(detail.organizationName, loginId);
              }}
            >
              <input
                autoComplete="off"
                className="text uname"
                data-provider="typeahead"
                id="loginId"
                name="loginId"
                onChange={(event) => setLoginId(event.target.value)}
                pattern="^[a-zA-Z0-9-]+([_.][a-zA-Z0-9-]+)*$"
                placeholder={legacyMessage(props.messages, "project.members.addMember")}
                required
                title={legacyMessage(props.messages, "user.wrongloginId.alert")}
                type="text"
                value={loginId}
              />
              <button className="ybtn ybtn-success" disabled={props.pending} type="submit">
                <i className="yobicon-addfriend" /> {legacyMessage(props.messages, "button.add")}
              </button>
            </form>
          </div>

          <ul className="members project row-fluid">
            {detail.members.map((member) => (
              <li className="member span6 span-hard-wrap" key={member.userId}>
                <a
                  className="avatar-wrap mlarge pull-left mr10"
                  href={prefixBasePath(props.runtimeConfig.basePath, `/${member.loginId}`)}
                >
                  {member.avatarUrl ? (
                    <img
                      alt={`${member.userLabel || member.loginId} avatar`}
                      height={64}
                      src={member.avatarUrl}
                      width={64}
                    />
                  ) : null}
                </a>
                <div className="member-name">{member.userLabel || member.loginId}</div>
                <div className="member-id">{`@${member.loginId}`}</div>
                <div className="member-setting">
                  <div className="btn-group" data-name={`roleof-${member.loginId}`}>
                    <button
                      className="btn dropdown-toggle large"
                      data-toggle="dropdown"
                      type="button"
                    >
                      <span className="d-label">
                        {legacyMessage(props.messages, `user.role.${member.role}`)}
                      </span>
                      <span className="d-caret">
                        <span className="caret" />
                      </span>
                    </button>
                    <ul className="dropdown-menu">
                      {detail.roleOptions.map((roleOption) => (
                        <li
                          className={roleOption.role === member.role ? "active" : undefined}
                          data-selected={roleOption.role === member.role ? "true" : undefined}
                          data-value={roleOption.role}
                          key={`${member.userId}-${roleOption.role}`}
                        >
                          <a
                            data-action="apply"
                            data-href={buildOrganizationHref(
                              props.runtimeConfig,
                              detail.organizationName,
                              `member/${member.userId}/edit`,
                            )}
                            href={buildOrganizationHref(
                              props.runtimeConfig,
                              detail.organizationName,
                              `member/${member.userId}/edit`,
                            )}
                            onClick={(event) => {
                              event.preventDefault();
                              props.onUpdateMemberRole?.(
                                detail.organizationName,
                                member.userId,
                                roleOption.role,
                              );
                            }}
                            data-loginid={member.loginId}
                          >
                            {legacyMessage(props.messages, `user.role.${roleOption.role}`)}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <a
                    className="ybtn ybtn-danger ybtn-small"
                    data-action="delete"
                    data-href={buildOrganizationHref(
                      props.runtimeConfig,
                      detail.organizationName,
                      `member/${member.userId}/delete`,
                    )}
                    href={buildOrganizationHref(
                      props.runtimeConfig,
                      detail.organizationName,
                      `member/${member.userId}/delete`,
                    )}
                    onClick={(event) => {
                      event.preventDefault();
                      setDeleteTarget(member.userId);
                    }}
                  >
                    {legacyMessage(props.messages, "button.delete")}
                  </a>
                </div>
              </li>
            ))}
          </ul>

          <div className={`modal hide${deleteTarget ? " in" : ""}`} id="alertDeletion">
            <div className="modal-header">
              <button
                aria-label={legacyMessage(props.messages, "button.close")}
                className="close"
                data-dismiss="modal"
                onClick={() => setDeleteTarget(null)}
                type="button"
              >
                ×
              </button>
              <h3>{legacyMessage(props.messages, "organization.member.delete")}</h3>
            </div>
            <div className="modal-body">
              <p>{legacyMessage(props.messages, "organization.member.deleteConfirm")}</p>
            </div>
            <div className="modal-footer">
              <button
                className="ybtn ybtn-info ybtn-mini"
                id="deleteBtn"
                onClick={() => {
                  if (deleteTarget) {
                    props.onDeleteMember?.(detail.organizationName, deleteTarget);
                  }
                  setDeleteTarget(null);
                }}
                type="button"
              >
                {legacyMessage(props.messages, "button.yes")}
              </button>
              <button
                className="ybtn ybtn-mini"
                data-dismiss="modal"
                onClick={() => setDeleteTarget(null)}
                type="button"
              >
                {legacyMessage(props.messages, "button.no")}
              </button>
            </div>
          </div>

          {detail.enrollmentRequests.length > 0 ? (
            <>
              <legend>
                <h3>{`${legacyMessage(props.messages, "project.member.enrollment.request")} (${detail.enrollmentRequests.length})`}</h3>
              </legend>
              <div className="row-fluid">
                {detail.enrollmentRequests.map((request) => (
                  <div className="span2" key={request.userId}>
                    <div className="pull-left mr10">
                      <a href={prefixBasePath(props.runtimeConfig.basePath, `/${request.loginId}`)}>
                        {request.avatarUrl ? (
                          <img
                            alt={`${request.userLabel || request.loginId} avatar`}
                            className="img-circle"
                            height={65}
                            src={request.avatarUrl}
                            width={65}
                          />
                        ) : null}
                      </a>
                    </div>
                    <div className="pull-left organization-member-enrollment-info">
                      <span>
                        <a
                          href={prefixBasePath(props.runtimeConfig.basePath, `/${request.loginId}`)}
                        >
                          <strong>{request.userLabel || request.loginId}</strong>
                        </a>
                      </span>
                      <span>{`(${request.loginId})`}</span>
                      <button
                        className="ybtn ybtn-info ybtn-mini blue enrollAcceptBtn"
                        onClick={() =>
                          props.onAcceptEnrollment?.(detail.organizationName, request.userId)
                        }
                        type="button"
                        data-loginid={request.loginId}
                      >
                        <i className="yobicon-addfriend" />{" "}
                        {legacyMessage(props.messages, "button.add")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}

export function OrganizationDeletePage(props: {
  detail: OrganizationAdminViewModel | null | undefined;
  messages?: LegacyMessageLookup;
  pending?: boolean;
  runtimeConfig: RuntimeConfig;
  onDeleteOrganization?: (organizationName: string) => void;
}) {
  const [modalOpen, setModalOpen] = React.useState(false);
  const detail = props.detail ?? {
    deleteAllowed: false,
    enrollmentRequests: [],
    members: [],
    organizationName: "",
    roleOptions: [],
    viewerCanUpdate: false,
  };
  const organizationDetail = {
    description: "",
    organizationName: detail.organizationName,
    viewerCanUpdate: detail.viewerCanUpdate,
  };

  return (
    <main className="app-shell">
      <OrganizationHeader
        detail={organizationDetail}
        messages={props.messages}
        runtimeConfig={props.runtimeConfig}
      />
      <OrganizationMenu
        detail={organizationDetail}
        messages={props.messages}
        runtimeConfig={props.runtimeConfig}
      />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <OrganizationSettingsSubMenu
            active="delete"
            messages={props.messages}
            organizationName={detail.organizationName}
            runtimeConfig={props.runtimeConfig}
          />
          <div className="box-wrap bottom">
            <button
              className="ybtn ybtn-danger"
              data-toggle="modal"
              disabled={!detail.deleteAllowed || props.pending}
              id="btnDelete"
              onClick={() => setModalOpen(true)}
              type="button"
            >
              {legacyMessage(props.messages, "organization.delete.this")}
            </button>
          </div>

          <div className={modalOpen ? "modal" : "modal hide"} id="alertDeletion">
            <div className="modal-header">
              <button
                aria-label={legacyMessage(props.messages, "button.close")}
                className="close"
                data-dismiss="modal"
                onClick={() => setModalOpen(false)}
                type="button"
              >
                ×
              </button>
              <h3>{legacyMessage(props.messages, "organization.delete.requestion")}</h3>
            </div>
            <div className="modal-body">
              <p> {legacyMessage(props.messages, "organization.delete.reaccept")} </p>
            </div>
            <div className="modal-footer">
              <button
                className="ybtn ybtn-danger"
                disabled={!detail.deleteAllowed || props.pending}
                id="btnDeleteExec"
                onClick={() => props.onDeleteOrganization?.(detail.organizationName)}
                type="button"
              >
                {legacyMessage(props.messages, "button.yes")}
              </button>
              <button
                className="ybtn"
                data-dismiss="modal"
                onClick={() => setModalOpen(false)}
                type="button"
              >
                {legacyMessage(props.messages, "button.no")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
