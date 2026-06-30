import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, type FormEvent, type ReactNode } from "react";
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
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";

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

function ProjectMembersScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const membersQuery = useQuery(
    readProjectMembersQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!projectQuery.data || !membersQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMembersBody
        members={membersQuery.data}
        project={projectQuery.data}
        runtimeConfig={runtimeConfig}
      />
    </>
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
  const queryClient = useQueryClient();
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

  function onAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    addMutation.mutate(String(formData.get("loginId") ?? ""));
  }

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <ProjectSettingMenu
          active="members"
          basePath={runtimeConfig.basePath}
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
                title={t("user.wrongloginId.alert")}
              />
              <button type="submit" className="ybtn ybtn-success">
                <i className="yobicon-addfriend"></i>
                {t("button.add")}
              </button>
            </form>
          </div>
        ) : null}

        <ul className="members project row-fluid">
          {members.members.map((member) => (
            <ProjectMemberListItem
              basePath={runtimeConfig.basePath}
              key={stringField(member.userId, member.loginId)}
              member={member}
              members={members}
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
                  basePath={runtimeConfig.basePath}
                  key={stringField(user.userId, user.loginId)}
                  user={user}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function ProjectMemberListItem({
  basePath,
  member,
  members,
  ownerName,
  projectName,
  runtimeConfig,
}: {
  basePath: string;
  member: ProjectMemberEntry;
  members: ProjectMembersResponse;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const loginId = stringField(member.loginId, "");
  const userId = numberField(member.userId);
  const memberRecord = recordField(member);
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
  const deleteMutation = useMutation({
    mutationFn: async () => {
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

  return (
    <li className="member span6 span-hard-wrap">
      <a
        href={prefixBasePath(basePath, `/${loginId}`)}
        className="avatar-wrap mlarge pull-left mr10"
      >
        <img
          src={stringField(member.avatarUrl, "/assets/images/default-avatar-32.png")}
          width="64"
          height="64"
          alt=""
        />
      </a>
      <div className="member-name">{stringField(member.userLabel, loginId)}</div>
      <div className="member-id">
        @{loginId}
        {booleanField(memberRecord.isGuest) ? <span className="guest">GUEST</span> : null}
      </div>
      <div className="member-setting">
        {!booleanField(member.isOwner) ? (
          <>
            <div className="btn-group" data-name={`roleof-${loginId}`}>
              <button className="btn dropdown-toggle large" data-toggle="dropdown">
                <span className="d-label">{roleLabel(members, stringField(member.role, ""))}</span>
                <span className="d-caret">
                  <span className="caret"></span>
                </span>
              </button>
              <ul className="dropdown-menu">
                {members.roleOptions.map((role) => {
                  const roleName = stringField(role.role, "");
                  const selected = roleName === stringField(member.role, "");
                  return (
                    <li
                      data-value={roleName}
                      data-selected={selected ? "true" : undefined}
                      className={selected ? "active" : undefined}
                      key={roleName}
                    >
                      <LegacyVoidAnchor
                        data-action="apply"
                        data-href={prefixBasePath(
                          basePath,
                          `/${ownerName}/${projectName}/members/${userId}`,
                        )}
                        data-loginid={loginId}
                        onClick={() => updateRoleMutation.mutate(roleName)}
                      >
                        {stringField(role.label, roleName)}
                      </LegacyVoidAnchor>
                    </li>
                  );
                })}
              </ul>
            </div>
            <LegacyVoidAnchor
              data-action="delete"
              data-href={prefixBasePath(basePath, `/${ownerName}/${projectName}/members/${userId}`)}
              className="ybtn ybtn-danger ybtn-small"
              onClick={() => deleteMutation.mutate()}
            >
              {t("button.delete")}
            </LegacyVoidAnchor>
          </>
        ) : (
          <span className="label owner">{t("user.role.owner")}</span>
        )}
      </div>
    </li>
  );
}

function EnrollmentRequest({
  basePath,
  user,
}: {
  basePath: string;
  user: ProjectEnrollmentRequestEntry;
}) {
  const { t } = useLegacyMessages();
  const loginId = stringField(user.loginId, "");

  return (
    <div className="span2">
      <div className="pull-left mr10">
        <a href={prefixBasePath(basePath, `/${loginId}`)}>
          <img
            src={stringField(user.avatarUrl, "/assets/images/default-avatar-32.png")}
            height="65"
            width="65"
            className="img-circle"
            alt=""
          />
        </a>
      </div>
      <div className="pull-left" style={{ width: "60px" }}>
        <span>
          <a href={prefixBasePath(basePath, `/${loginId}`)}>
            <strong>{stringField(user.userLabel, loginId)}</strong>
          </a>
        </span>
        <span>({loginId})</span>
        <button
          type="button"
          className="ybtn ybtn-info ybtn-mini blue enrollAcceptBtn"
          data-loginid={loginId}
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

function LegacyVoidAnchor({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & Record<string, unknown>) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    ref.current?.setAttribute("href", "javascript:void(0)");
  }, []);

  return (
    <a ref={ref} href="/" className={className} {...props}>
      {children}
    </a>
  );
}

function ProjectHeader({ basePath, project }: { basePath: string; project: ProjectContainer }) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const projectId = stringField(project.id, "");
  const logoUrl = stringField(project.logoUrl, "") || "/assets/images/project_default_logo.png";
  const backgroundImageUrl =
    stringField(project.backgroundImageUrl, "") || "/assets/images/bg-default-project.png";
  const isForked = booleanField(project.isForkedFromOrigin);
  const originalOwnerName = stringField(project.originalOwnerName, "");
  const originalProjectName = stringField(project.originalProjectName, "");

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
              <span className="user-project-list" data-project-id={projectId}>
                <i
                  className={`${booleanField(project.isFavorite) ? "starred" : ""} star material-icons va-text-top`}
                >
                  star
                </i>
              </span>
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
  const menuSetting = recordField(project.menuSetting);

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
  basePath,
  ownerName,
  project,
  projectName,
}: {
  active: "members";
  basePath: string;
  ownerName: string;
  project: ProjectContainer;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const menuSetting = recordField(project.menuSetting);

  return (
    <ul className="nav nav-tabs">
      <li id="subMenuProjectSetting" className="">
        <a href={prefixBasePath(basePath, `/${ownerName}/${projectName}/setting`)}>
          {t("project.setting")}
        </a>
      </li>
      <li id="subMenuProjectMember" className={active === "members" ? "active" : ""}>
        <a href={prefixBasePath(basePath, `/${ownerName}/${projectName}/members`)}>
          {t("project.member")}
          <CountBadge count={numberField(project.enrollmentRequestCount)} className="num-badge" />
        </a>
      </li>
      <li id="subMenuIssueLabel" className="">
        <a href={prefixBasePath(basePath, `/${ownerName}/${projectName}/labels`)}>
          {t("issue.label")}
        </a>
      </li>
      <li id="subMenuWebhook" className="">
        <a href={prefixBasePath(basePath, `/${ownerName}/${projectName}/webhooks`)}>
          {t("project.webhook")}
        </a>
      </li>
      <li id="subMenuProjectTransfer" className="">
        <a href={prefixBasePath(basePath, `/${ownerName}/${projectName}/transfer`)}>
          {t("project.transfer")}
        </a>
      </li>
      <li id="subMenuProjectDelete" className="">
        <a href={prefixBasePath(basePath, `/${ownerName}/${projectName}/deleteform`)}>
          {t("project.delete")}
        </a>
      </li>
      <li
        id="subMenuProjectChangeVCS"
        className=""
        style={booleanField(menuSetting.code) ? undefined : { display: "none" }}
      >
        <a href={prefixBasePath(basePath, `/${ownerName}/${projectName}/changeVCS`)}>
          {t("project.changeVCS")}
        </a>
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

function projectHref(basePath: string, ownerName: string, projectName: string) {
  return prefixBasePath(basePath, `/${ownerName}/${projectName}`);
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
  return typeof value === "number" ? value : 0;
}

function booleanField(value: unknown) {
  return value === true;
}
