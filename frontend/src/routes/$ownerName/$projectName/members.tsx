import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import {
  addProjectMemberRest,
  deleteProjectMemberRest,
  readProjectContainerQueryOptions,
  readProjectMembersQueryOptions,
  updateProjectMemberRoleRest,
} from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type {
  ProjectEnrollmentRequestEntry,
  ProjectMemberEntry,
  ProjectMembersResponse,
} from "../../../api/org-project";
import type { ProjectContainer } from "../../../api/types";
import { RestApiError } from "../../../api/rest-client";
import { readSessionBootstrap, searchLegacyMemberUsers } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YoramQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import defaultAvatarUrl from "../../../assets/legacy/default-avatar-64.png";
import { ProjectHeader, ProjectMenu } from "../$projectName";

const legacyLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};
const legacyLinkActiveOptions = { exact: true };
const projectMembersBadRequestBody = <ProjectMembersErrorBody messageKey="error.badrequest" />;

export const Route = createFileRoute("/$ownerName/$projectName/members")({
  component: ProjectMembersRoute,
});

function ProjectMembersRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return <ProjectMembersRouteScreen renderProjectShell={false} runtimeConfig={runtimeConfig} />;
}

export function ProjectMembersRouteScreen({
  renderProjectShell = true,
  runtimeConfig,
}: {
  renderProjectShell?: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const content = (
    <ProjectMembersRouteShell
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

function ProjectMembersRouteShell({
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
    : undefined;

  const screen = (
    <ProjectMembersScreen
      project={projectQuery.data}
      renderProjectShell={renderProjectShell}
      runtimeConfig={runtimeConfig}
    />
  );

  if (!renderProjectShell) {
    return screen;
  }

  return (
    <SiteLayoutShell
      projectSearchScope={projectSearchScope}
      runtimeConfig={runtimeConfig}
      showLegacyProjectHeaderLinks={Boolean(
        projectSearchScope && !projectSearchScope.organizationName,
      )}
    >
      {screen}
    </SiteLayoutShell>
  );
}

function insulateProjectMemberDeleteConfirmClick(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
  event.stopPropagation();
}

function ProjectMembersScreen({
  project,
  renderProjectShell,
  runtimeConfig,
}: {
  project?: ProjectContainer;
  renderProjectShell: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const projectData = project ?? projectQuery.data;
  const membersQuery = useQuery(
    readProjectMembersQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const membersErrorStatus =
    membersQuery.error instanceof RestApiError ? membersQuery.error.status : undefined;
  const documentTitleKey =
    membersErrorStatus === 400
      ? "error.badrequest"
      : membersErrorStatus === 401 || membersErrorStatus === 403
        ? "error.forbidden"
        : "title.projectMembers";
  if (!projectData) {
    return (
      <ProjectMembersBrowserTitle
        ownerName={ownerName}
        projectName={projectName}
        titleKey={documentTitleKey}
      />
    );
  }

  if (membersErrorStatus === 400) {
    return renderProjectShell ? (
      <>
        <ProjectMembersBrowserTitle
          ownerName={ownerName}
          projectName={projectName}
          titleKey={documentTitleKey}
        />
        <ProjectHeader basePath={runtimeConfig.basePath} project={projectData} />
        <ProjectMenu active="setting" basePath={runtimeConfig.basePath} project={projectData} />
        {projectMembersBadRequestBody}
      </>
    ) : (
      <>
        <ProjectMembersBrowserTitle
          ownerName={ownerName}
          projectName={projectName}
          titleKey={documentTitleKey}
        />
        {projectMembersBadRequestBody}
      </>
    );
  }

  if (membersErrorStatus === 401 || membersErrorStatus === 403) {
    const body = (
      <ProjectMembersErrorBody
        loginRedirectPath={
          membersErrorStatus === 401 ? `/${ownerName}/${projectName}/members` : undefined
        }
        messageKey="error.forbidden"
      />
    );
    return renderProjectShell ? (
      <>
        <ProjectMembersBrowserTitle
          ownerName={ownerName}
          projectName={projectName}
          titleKey={documentTitleKey}
        />
        <ProjectHeader basePath={runtimeConfig.basePath} project={projectData} />
        <ProjectMenu active="home" basePath={runtimeConfig.basePath} project={projectData} />
        {body}
      </>
    ) : (
      <>
        <ProjectMembersBrowserTitle
          ownerName={ownerName}
          projectName={projectName}
          titleKey={documentTitleKey}
        />
        {body}
      </>
    );
  }

  if (!membersQuery.data) {
    return null;
  }

  const mentionStylesheetHref = prefixBasePath(
    runtimeConfig.basePath,
    "/assets/javascripts/lib/mentionjs/mention.css",
  );
  const body = (
    <>
      <ProjectMembersBody
        members={membersQuery.data}
        project={projectData}
        runtimeConfig={runtimeConfig}
      />
      <link href={mentionStylesheetHref} media="screen" rel="stylesheet" type="text/css" />
    </>
  );

  return renderProjectShell ? (
    <>
      <ProjectMembersBrowserTitle
        ownerName={ownerName}
        projectName={projectName}
        titleKey={documentTitleKey}
      />
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectData} />
      <ProjectMenu active="setting" basePath={runtimeConfig.basePath} project={projectData} />
      {body}
    </>
  ) : (
    <>
      <ProjectMembersBrowserTitle
        ownerName={ownerName}
        projectName={projectName}
        titleKey={documentTitleKey}
      />
      {body}
    </>
  );
}

function ProjectMembersBrowserTitle({
  ownerName,
  projectName,
  titleKey,
}: {
  ownerName: string;
  projectName: string;
  titleKey: string;
}) {
  const { t } = useLegacyMessages();
  const screenTitle = t(titleKey);

  return <title>{`${screenTitle} - ${ownerName}/${projectName}`}</title>;
}

function ProjectMembersErrorBody({
  loginRedirectPath,
  messageKey,
}: {
  loginRedirectPath?: string;
  messageKey: string;
}) {
  const { t } = useLegacyMessages();

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="error-wrap">
          <i className="ico ico-err2"></i>
          <p>{t(messageKey)}</p>
          {loginRedirectPath ? (
            <Link
              activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
              activeProps={legacyLinkActiveProps}
              className="ybtn ybtn-primary"
              data-login="required"
              search={{ redirectUrl: loginRedirectPath }}
              to="/users/loginform"
            >
              {t("title.login")}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ProjectMembersBody({
  members,
  project,
  runtimeConfig,
}: {
  members: ProjectMembersResponse;
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();
  const addMemberInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [loginIdValue, setLoginIdValue] = useState("");
  const [isTypeaheadOpen, setIsTypeaheadOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<null | {
    loginId: string;
    userId: number;
  }>(null);
  const normalizedLoginQuery = loginIdValue.trim();
  const memberSearchQuery = useQuery({
    enabled: booleanField(members.viewerCanUpdate) && normalizedLoginQuery.length > 0,
    queryFn: () => searchLegacyMemberUsers(runtimeConfig, normalizedLoginQuery),
    queryKey: ["legacy-member-users", ownerName, projectName, normalizedLoginQuery],
    staleTime: 30_000,
  });
  const memberSuggestions = (memberSearchQuery.data?.items ?? []).map((item) =>
    parseLegacyMemberSearchItem(item),
  );
  const showTypeaheadSuggestions =
    isTypeaheadOpen && normalizedLoginQuery.length > 0 && memberSuggestions.length > 0;
  const addMutation = useMutation({
    mutationFn: async (loginId: string) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return addProjectMemberRest(runtimeConfig, csrfToken, { loginId, ownerName, projectName });
    },
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.members(ownerName, projectName),
      });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteProjectMemberRest(runtimeConfig, csrfToken, {
        ownerName,
        projectName,
        userId,
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.members(ownerName, projectName),
      });
    },
  });

  function onAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedLoginId = loginIdValue.trim();
    if (!submittedLoginId) {
      return;
    }
    setIsTypeaheadOpen(false);
    addMutation.mutate(submittedLoginId);
  }

  function acceptEnrollment(loginId: string) {
    setLoginIdValue(loginId);
    setIsTypeaheadOpen(false);
    setActiveSuggestionIndex(0);
    addMutation.mutate(loginId);
  }

  function selectSuggestion(suggestion: LegacyMemberSuggestionView) {
    setLoginIdValue(suggestion.loginId);
    setIsTypeaheadOpen(false);
    setActiveSuggestionIndex(0);
  }

  function onLoginIdBlur(event: FocusEvent<HTMLInputElement>) {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof HTMLElement && nextTarget.closest(".typeahead.dropdown-menu")) {
      return;
    }
    setIsTypeaheadOpen(false);
  }

  function onLoginIdKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsTypeaheadOpen(false);
      return;
    }
    if (!showTypeaheadSuggestions) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current + 1) % memberSuggestions.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex(
        (current) => (current - 1 + memberSuggestions.length) % memberSuggestions.length,
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const activeSuggestion = memberSuggestions[activeSuggestionIndex] ?? memberSuggestions[0];
      if (activeSuggestion) {
        selectSuggestion(activeSuggestion);
      }
    }
  }

  function openDeleteConfirm(event: MouseEvent<HTMLButtonElement>, member: ProjectMemberEntry) {
    insulateProjectMemberDeleteConfirmClick(event);
    setDeleteTarget({
      loginId: stringField(member.loginId, ""),
      userId: numberField(member.userId),
    });
  }

  function dismissDeleteConfirm(event: MouseEvent<HTMLButtonElement>) {
    insulateProjectMemberDeleteConfirmClick(event);
    setDeleteTarget(null);
  }

  async function confirmDeleteMember(event: MouseEvent<HTMLButtonElement>) {
    insulateProjectMemberDeleteConfirmClick(event);
    const target = deleteTarget;
    if (!target) {
      return;
    }
    setDeleteTarget(null);
    try {
      await deleteMutation.mutateAsync(target.userId);
    } catch (error) {
      window.alert(projectMemberDeleteErrorMessage(t, error));
    }
  }

  useEffect(() => {
    if (booleanField(members.viewerCanUpdate)) {
      addMemberInputRef.current?.focus();
    }
  }, [members.viewerCanUpdate]);

  return (
    <>
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <ProjectSettingMenu
            active="members"
            ownerName={ownerName}
            project={project}
            projectName={projectName}
          />

          {booleanField(members.viewerCanUpdate) ? (
            <div className={`inner-bubble${showTypeaheadSuggestions ? " open" : ""}`}>
              <form
                className="nm"
                action={prefixBasePath(
                  runtimeConfig.basePath,
                  `/${ownerName}/${projectName}/members`,
                )}
                method="post"
                id="addNewMember"
                onSubmit={onAddMember}
              >
                <input
                  type="text"
                  className="text uname"
                  id="loginId"
                  name="loginId"
                  required
                  autoComplete="off"
                  placeholder={t("project.members.addMember")}
                  pattern="^[a-zA-Z0-9-]+([_.][a-zA-Z0-9-]+)*$"
                  ref={addMemberInputRef}
                  title={t("user.wrongloginId.alert")}
                  value={loginIdValue}
                  onBlur={onLoginIdBlur}
                  onChange={(event) => {
                    const nextValue = event.currentTarget.value;
                    setLoginIdValue(nextValue);
                    setActiveSuggestionIndex(0);
                    setIsTypeaheadOpen(nextValue.trim() !== "");
                  }}
                  onFocus={() => {
                    if (normalizedLoginQuery.length > 0 && memberSuggestions.length > 0) {
                      setIsTypeaheadOpen(true);
                    }
                  }}
                  onKeyDown={onLoginIdKeyDown}
                />
                <button type="submit" className="ybtn ybtn-success">
                  <i className="yobicon-addfriend"></i>
                  {t("button.add")}
                </button>
              </form>
              {showTypeaheadSuggestions ? (
                <ul className="typeahead dropdown-menu">
                  {memberSuggestions.map((suggestion, index) => (
                    <li
                      className={index === activeSuggestionIndex ? "active" : undefined}
                      data-value={suggestion.info}
                      key={suggestion.loginId}
                    >
                      <button
                        type="button"
                        style={{
                          background: "transparent",
                          border: 0,
                          display: "block",
                          padding: "3px 20px",
                          textAlign: "left",
                          width: "100%",
                        }}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          selectSuggestion(suggestion);
                          addMemberInputRef.current?.focus();
                        }}
                      >
                        <img className="mention_image" src={suggestion.imageSrc} alt="" />
                        <b className="mention_name">{suggestion.userLabel}</b>
                        <span className="mention_username">{suggestion.mentionUsername}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <ul className="members project row-fluid">
            {members.members.map((member) => (
              <ProjectMemberListItem
                key={stringField(member.userId, member.loginId)}
                member={member}
                members={members}
                onDeleteRequest={openDeleteConfirm}
                ownerName={ownerName}
                projectName={projectName}
                runtimeConfig={runtimeConfig}
              />
            ))}
          </ul>

          {members.enrollmentRequests.length > 0 ? (
            <>
              <legend>
                <h3>{`${t("project.member.enrollment.request")} (${members.enrollmentRequests.length})`}</h3>
              </legend>
              <div className="row-fluid">
                {members.enrollmentRequests.map((user) => (
                  <EnrollmentRequest
                    key={stringField(user.userId, user.loginId)}
                    onAccept={acceptEnrollment}
                    user={user}
                  />
                ))}
              </div>
            </>
          ) : null}
          {deleteTarget ? (
            <>
              <div
                id="projectMemberDeleteConfirm"
                className="modal yobiDialog in"
                tabIndex={-1}
                role="dialog"
                aria-hidden={false}
              >
                <div className="btn-dismiss">
                  <button
                    type="button"
                    className="btn-transparent"
                    onClick={dismissDeleteConfirm}
                    aria-label={t("button.no")}
                  >
                    &times;
                  </button>
                </div>
                <div className="message">
                  <div className="center-text">
                    <p className="msg">{t("project.member.deleteConfirm")}</p>
                    <p className="desc"></p>
                  </div>
                  <div className="center-txt buttons">
                    <button
                      type="button"
                      className="ybtn ybtn-default"
                      onClick={dismissDeleteConfirm}
                    >
                      {t("button.no")}
                    </button>
                    <button
                      type="button"
                      className="ybtn ybtn-danger"
                      onClick={confirmDeleteMember}
                      ref={(button) => button?.focus()}
                    >
                      {t("button.yes")}
                    </button>
                  </div>
                </div>
              </div>
              <div className="modal-backdrop in"></div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

function ProjectMemberListItem({
  member,
  members,
  onDeleteRequest,
  ownerName,
  projectName,
  runtimeConfig,
}: {
  member: ProjectMemberEntry;
  members: ProjectMembersResponse;
  onDeleteRequest: (event: MouseEvent<HTMLButtonElement>, member: ProjectMemberEntry) => void;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const loginId = stringField(member.loginId, "");
  const userId = numberField(member.userId);
  const memberRecord = recordField(member);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const updateRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return updateProjectMemberRoleRest(runtimeConfig, csrfToken, {
        ownerName,
        projectName,
        role,
        userId,
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.members(ownerName, projectName),
      });
    },
  });

  function onRoleToggleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsRoleMenuOpen((current) => !current);
  }

  function onRoleItemClick(event: MouseEvent<HTMLButtonElement>, roleName: string) {
    event.preventDefault();
    event.stopPropagation();
    setIsRoleMenuOpen(false);
    updateRoleMutation.mutate(roleName);
  }

  return (
    <li className="member span6 span-hard-wrap">
      <Link
        activeOptions={legacyLinkActiveOptions}
        activeProps={legacyLinkActiveProps}
        to="/$user"
        params={{ user: loginId }}
        className="avatar-wrap mlarge pull-left mr10"
      >
        <img
          src={stringField(member.avatarUrl, "") || defaultAvatarUrl}
          width="64"
          height="64"
          alt=""
        />
      </Link>
      <div className="member-name">{stringField(member.userLabel, loginId)}</div>
      <div className="member-id">
        @{loginId}
        {booleanField(memberRecord.isGuest) ? <span className="guest">GUEST</span> : null}
      </div>
      <div className="member-setting">
        {!booleanField(member.isOwner) ? (
          <>
            <div className={`btn-group${isRoleMenuOpen ? " open" : ""}`}>
              <button className="btn dropdown-toggle large" onClick={onRoleToggleClick}>
                <span className="d-label">{roleLabel(members, stringField(member.role, ""))}</span>
                <span className="d-caret">
                  <span className="caret"></span>
                </span>
              </button>
              <ul className="dropdown-menu">
                {members.roleOptions.map((role) => {
                  const roleName = stringField(role.role, "");
                  const roleId = legacyProjectRoleId(role);
                  const selected = roleName === stringField(member.role, "");
                  return (
                    <li
                      data-value={roleId}
                      data-selected={selected ? "true" : undefined}
                      className={selected ? "active" : undefined}
                      key={roleName}
                    >
                      <button
                        type="button"
                        data-loginid={loginId}
                        onClick={(event) => onRoleItemClick(event, roleName)}
                      >
                        {stringField(role.label, roleName)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            <button
              type="button"
              className="ybtn ybtn-danger ybtn-small"
              onClick={(event) => onDeleteRequest(event, member)}
            >
              {t("button.delete")}
            </button>
          </>
        ) : (
          <span className="label owner">{t("user.role.owner")}</span>
        )}
      </div>
    </li>
  );
}

function EnrollmentRequest({
  onAccept,
  user,
}: {
  onAccept: (loginId: string) => void;
  user: ProjectEnrollmentRequestEntry;
}) {
  const { t } = useLegacyMessages();
  const loginId = stringField(user.loginId, "");

  return (
    <div className="span2">
      <div className="pull-left mr10">
        <Link
          activeOptions={legacyLinkActiveOptions}
          activeProps={legacyLinkActiveProps}
          to="/$user"
          params={{ user: loginId }}
        >
          <img
            src={stringField(user.avatarUrl, "") || defaultAvatarUrl}
            height="65"
            width="65"
            className="img-circle"
            alt=""
          />
        </Link>
      </div>
      <div className="pull-left" style={{ width: "60px" }}>
        <span>
          <Link
            activeOptions={legacyLinkActiveOptions}
            activeProps={legacyLinkActiveProps}
            to="/$user"
            params={{ user: loginId }}
          >
            <strong>{stringField(user.userLabel, loginId)}</strong>
          </Link>
        </span>
        <span>({loginId})</span>
        <button
          type="button"
          className="ybtn ybtn-info ybtn-mini blue enrollAcceptBtn"
          data-loginid={loginId}
          onClick={() => onAccept(loginId)}
        >
          <i className="yobicon-addfriend"></i>
          {t("button.add")}
        </button>
      </div>
    </div>
  );
}

function roleLabel(members: ProjectMembersResponse, role: string) {
  return members.roleOptions.find((option) => stringField(option.role, "") === role)?.label ?? role;
}

type LegacyMemberSuggestionView = {
  imageSrc: string;
  info: string;
  loginId: string;
  mentionUsername: string;
  userLabel: string;
};

function parseLegacyMemberSearchItem(item: {
  info: string;
  loginId: string;
}): LegacyMemberSuggestionView {
  const info = stringField(item.info, "");
  const loginId = stringField(item.loginId, "");
  const imageSrc = legacyMentionImageSrc(info) || defaultAvatarUrl;
  const userLabel = legacyMentionText(info, "b", "mention_name") || loginId;
  const mentionUsername = legacyMentionText(info, "span", "mention_username") || `@${loginId}`;

  return {
    imageSrc,
    info,
    loginId,
    mentionUsername,
    userLabel,
  };
}

function legacyMentionImageSrc(info: string) {
  const match = /<img\b[^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(info);
  return match?.[1] || match?.[2] || match?.[3] || "";
}

function legacyMentionText(info: string, tagName: "b" | "span", className: string) {
  const match = new RegExp(
    `<${tagName}\\b[^>]*\\bclass\\s*=\\s*(?:"[^"]*\\b${className}\\b[^"]*"|'[^']*\\b${className}\\b[^']*')[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
    "i",
  ).exec(info);
  return match ? decodeLegacyMentionText(match[1].replace(/<[^>]*>/g, "")).trim() : "";
}

function decodeLegacyMentionText(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function legacyProjectRoleId(role: ProjectMembersResponse["roleOptions"][number]) {
  const roleRecord = recordField(role);
  const explicitId = stringField(roleRecord.id, "");
  if (explicitId) {
    return explicitId;
  }
  return stringField(role.role, "") === "manager" ? "1" : "2";
}

function projectMemberDeleteErrorMessage(t: (key: string) => string, error: unknown) {
  if (error instanceof RestApiError) {
    if (error.status === 403) {
      const ownerCannotLeave = t("project.member.ownerCannotLeave");
      return error.message.includes(ownerCannotLeave) ? ownerCannotLeave : t("error.forbidden");
    }
    if (error.status === 404) {
      return t("project.is.empty");
    }
  }
  return t("error.badrequest");
}

function ProjectSettingMenu({
  active,
  ownerName,
  project,
  projectName,
}: {
  active: "members";
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
          activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
          activeProps={legacyLinkActiveProps}
          to="/$ownerName/$projectName/setting"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.setting")}
        </Link>
      </li>
      <li id="subMenuProjectMember" className={active === "members" ? "active" : ""}>
        <Link
          activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
          activeProps={legacyLinkActiveProps}
          to="/$ownerName/$projectName/members"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.member")}
          <CountBadge count={enrolledUserCount(project)} className="num-badge" />
        </Link>
      </li>
      <li id="subMenuIssueLabel" className="">
        <Link
          activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
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
          activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
          activeProps={legacyLinkActiveProps}
          to="/$ownerName/$projectName/webhooks"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.webhook")}
        </Link>
      </li>
      <li id="subMenuProjectTransfer" className="">
        <Link
          activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
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
          activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
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
        style={booleanField(menuSetting.code) ? undefined : { display: "none" }}
      >
        <Link
          activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
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

function enrolledUserCount(project: ProjectContainer) {
  const enrolledUsers = recordField(project).enrolledUsers;
  return Array.isArray(enrolledUsers) ? enrolledUsers.length : 0;
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

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const organizationName = stringField(project.organizationName, "");
  if (organizationName) return organizationName;
  return booleanField(project.isProtected) ? ownerName : undefined;
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
  return typeof value === "number" ? value : 0;
}

function booleanField(value: unknown) {
  return value === true;
}
