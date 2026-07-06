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
  toggleFavoriteProjectRest,
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
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";

const legacyLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};
const legacyLinkActiveOptions = { exact: true };

export const Route = createFileRoute("/$ownerName/$projectName/members")({
  component: ProjectMembersRoute,
});

function ProjectMembersRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectMembersScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function insulateProjectMemberDeleteConfirmClick(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
  event.stopPropagation();
}

function focusProjectMemberDeleteConfirmButton(button: HTMLButtonElement | null) {
  button?.focus();
}

function ProjectMembersScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const membersQuery = useQuery(
    readProjectMembersQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!projectQuery.data) {
    return null;
  }

  if (membersQuery.error instanceof RestApiError) {
    const status = membersQuery.error.status;
    if (status === 400 || status === 403) {
      return (
        <>
          <ProjectHeader project={projectQuery.data} />
          <ProjectMenu active={status === 403 ? "home" : "setting"} project={projectQuery.data} />
          <ProjectMembersErrorBody
            messageKey={status === 403 ? "error.forbidden" : "error.badrequest"}
          />
        </>
      );
    }
  }

  if (!membersQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader project={projectQuery.data} />
      <ProjectMenu active="setting" project={projectQuery.data} />
      <ProjectMembersBody
        members={membersQuery.data}
        project={projectQuery.data}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

function ProjectMembersErrorBody({ messageKey }: { messageKey: string }) {
  const { t } = useLegacyMessages();

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="error-wrap">
          <i className="ico ico-err2"></i>
          <p>{t(messageKey)}</p>
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
  const memberSuggestions = (memberSearchQuery.data?.items ?? []).map(parseLegacyMemberSearchItem);
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
            <div className="inner-bubble">
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
                  data-provider="typeahead"
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
                <ul className="typeahead dropdown-menu" style={{ display: "block" }}>
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
                basePath={runtimeConfig.basePath}
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
                style={{ display: "block" }}
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
                      ref={focusProjectMemberDeleteConfirmButton}
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
      <link
        rel="stylesheet"
        type="text/css"
        media="screen"
        href="/assets/javascripts/lib/mentionjs/mention.css"
      />
    </>
  );
}

function ProjectMemberListItem({
  basePath,
  member,
  members,
  onDeleteRequest,
  ownerName,
  projectName,
  runtimeConfig,
}: {
  basePath: string;
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
          src={stringField(member.avatarUrl, "/assets/images/default-avatar-32.png")}
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
            <div
              className={`btn-group${isRoleMenuOpen ? " open" : ""}`}
              data-name={`roleof-${loginId}`}
            >
              <button
                className="btn dropdown-toggle large"
                data-toggle="dropdown"
                onClick={onRoleToggleClick}
              >
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
                        data-action="apply"
                        data-href={prefixBasePath(
                          basePath,
                          `/${ownerName}/${projectName}/member/${userId}/edit`,
                        )}
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
              data-action="delete"
              data-href={prefixBasePath(
                basePath,
                `/${ownerName}/${projectName}/member/${userId}/delete`,
              )}
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
            src={stringField(user.avatarUrl, "/assets/images/default-avatar-32.png")}
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
  if (typeof DOMParser === "undefined" || info === "") {
    return {
      imageSrc: "/assets/images/default-avatar-32.png",
      info,
      loginId,
      mentionUsername: `@${loginId}`,
      userLabel: loginId,
    };
  }
  const documentFragment = new DOMParser().parseFromString(info, "text/html");
  const imageSrc =
    documentFragment.querySelector(".mention_image")?.getAttribute("src") ??
    "/assets/images/default-avatar-32.png";
  const userLabel = documentFragment.querySelector(".mention_name")?.textContent?.trim() || loginId;
  const mentionUsername =
    documentFragment.querySelector(".mention_username")?.textContent?.trim() || `@${loginId}`;

  return {
    imageSrc,
    info,
    loginId,
    mentionUsername,
    userLabel,
  };
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

function ProjectHeader({ project }: { project: ProjectContainer }) {
  const { runtimeConfig } = Route.useRouteContext();
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const projectId = stringField(project.id, "");
  const [isFavoritedProject, setIsFavoritedProject] = useState(
    () => booleanField(project.isFavorite) || booleanField(project.isFavorited),
  );
  const logoUrl = stringField(project.logoUrl, "") || "/assets/images/project_default_logo.png";
  const backgroundImageUrl =
    stringField(project.backgroundImageUrl, "") || "/assets/images/bg-default-project.png";
  const isForked = booleanField(project.isForkedFromOrigin);
  const originalOwnerName = stringField(project.originalOwnerName, "");
  const originalProjectName = stringField(project.originalProjectName, "");
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
        queryKey: apiQueryKeys.project.container(ownerName, projectName),
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
                <Link
                  activeOptions={legacyLinkActiveOptions}
                  activeProps={legacyLinkActiveProps}
                  to="/$user"
                  params={{ user: ownerName }}
                >
                  {ownerName}
                </Link>
              </span>
              <span className="project-separator hide-in-mobile">/</span>
              <span className="project-name">
                <Link
                  activeOptions={legacyLinkActiveOptions}
                  activeProps={legacyLinkActiveProps}
                  to="/$ownerName/$projectName"
                  params={{ ownerName, projectName }}
                >
                  {projectName}
                </Link>
              </span>
              {/* oxlint-disable jsx-a11y/click-events-have-key-events -- legacy project/header.scala.html renders this favorite toggle as a span. */}
              {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- legacy project/header.scala.html renders this favorite toggle as a span. */}
              <span
                className="user-project-list"
                data-project-id={projectId}
                onClick={(event) => {
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
              {/* oxlint-enable jsx-a11y/click-events-have-key-events */}
              {booleanField(project.isPrivate) ? (
                <span className="project-private">
                  <i className="yobicon-lock"></i>
                </span>
              ) : null}
              {booleanField(project.isProtected) ? (
                <span className="project-protected" title="Group Project">
                  G
                </span>
              ) : null}
            </div>
            {isForked ? (
              <div className="project-origin">
                <span className="project-origin-title">{t("fork.original")}</span>
                <Link
                  activeOptions={legacyLinkActiveOptions}
                  activeProps={legacyLinkActiveProps}
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

function ProjectMenu({
  active,
  project,
}: {
  active: "home" | "setting";
  project: ProjectContainer;
}) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const menuSetting = recordField(project.menuSetting);

  return (
    <div className="project-menu-outer">
      <div className="project-menu-inner">
        <ul className="project-menu-nav project-menu-gruop">
          <ProjectMenuItem
            active={active === "home"}
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
              <li className={active === "setting" ? "active" : ""}>
                <Link
                  activeOptions={legacyLinkActiveOptions}
                  activeProps={legacyLinkActiveProps}
                  to="/$ownerName/$projectName/setting"
                  params={{ ownerName, projectName }}
                >
                  <i className="yobicon-cog"></i>
                  <span className="blind">
                    <span className="menu-name">{t("menu.admin")}</span>
                  </span>
                  <CountBadge count={enrolledUserCount(project)} />
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
  active = false,
  className = "",
  label,
  params,
  short,
  to,
}: {
  active?: boolean;
  className?: string;
  label: string;
  params: { ownerName: string; projectName: string };
  short: string;
  to:
    | "/$ownerName/$projectName"
    | "/$ownerName/$projectName/code"
    | "/$ownerName/$projectName/issues"
    | "/$ownerName/$projectName/pullRequests"
    | "/$ownerName/$projectName/reviews"
    | "/$ownerName/$projectName/milestones"
    | "/$ownerName/$projectName/posts";
}) {
  return (
    <li className={`${active ? "active" : ""}${className ? ` ${className}` : ""}`}>
      <Link
        activeOptions={legacyLinkActiveOptions}
        activeProps={legacyLinkActiveProps}
        to={to}
        params={params}
      >
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
  active: "members";
  ownerName: string;
  project: ProjectContainer;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const menuSetting = recordField(project.menuSetting);

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
