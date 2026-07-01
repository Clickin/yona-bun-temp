import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  acceptOrganizationEnrollmentRest,
  addOrganizationMemberRest,
  deleteOrganizationMemberRest,
  readOrganizationAdminRest,
  updateOrganizationMemberRoleRest,
} from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { OrganizationAdminView, YonaRecord, YonaUserItem } from "../../../api/types";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";

export const Route = createFileRoute("/organizations/$organizationName/members")({
  component: OrganizationMembersRoute,
});

function OrganizationMembersRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <OrganizationMembersScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function OrganizationMembersScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { organizationName } = Route.useParams();
  const query = useQuery({
    queryFn: () => readOrganizationAdminRest(runtimeConfig, organizationName),
    queryKey: [...apiQueryKeys.organization.base(organizationName), "admin"],
  });

  if (!query.data) {
    return null;
  }

  return <OrganizationMembersBody organization={query.data} runtimeConfig={runtimeConfig} />;
}

function OrganizationMembersBody({
  organization,
  runtimeConfig,
}: {
  organization: OrganizationAdminView;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const organizationName = stringField(organization.organizationName, "organization");
  const logoUrl =
    stringField(organization.logoUrl, "") || "/assets/images/organization_default_logo.png";
  const adminQueryKey = [...apiQueryKeys.organization.base(organizationName), "admin"] as const;
  const addMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return addOrganizationMemberRest(runtimeConfig, csrfToken, {
        loginId: String(formData.get("loginId") ?? ""),
        organizationName,
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: adminQueryKey });
    },
  });
  const updateRoleMutation = useMutation({
    mutationFn: async ({ role, userId }: { role: string; userId: number }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return updateOrganizationMemberRoleRest(runtimeConfig, csrfToken, {
        organizationName,
        role,
        userId,
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: adminQueryKey });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteOrganizationMemberRest(runtimeConfig, csrfToken, {
        organizationName,
        userId,
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: adminQueryKey });
    },
  });
  const acceptMutation = useMutation({
    mutationFn: async (userId: number) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return acceptOrganizationEnrollmentRest(runtimeConfig, csrfToken, {
        organizationName,
        userId,
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: adminQueryKey });
    },
  });

  function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addMutation.mutate(new FormData(event.currentTarget));
  }

  return (
    <>
      <OrganizationHeader
        basePath={runtimeConfig.basePath}
        logoUrl={logoUrl}
        organizationName={organizationName}
      />
      <OrganizationMenu
        basePath={runtimeConfig.basePath}
        organizationName={organizationName}
        viewerCanUpdate={booleanField(organization.viewerCanUpdate)}
      />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <OrganizationSettingMenu
            active="members"
            basePath={runtimeConfig.basePath}
            organizationName={organizationName}
          />

          <div className="inner-bubble">
            <form
              className="nm"
              action={prefixBasePath(
                runtimeConfig.basePath,
                `/organizations/${organizationName}/members`,
              )}
              method="post"
              id="addNewMember"
              onSubmit={onAdd}
            >
              <input
                type="text"
                className="text uname"
                id="loginId"
                name="loginId"
                required={true}
                data-provider="typeahead"
                autoComplete="off"
                placeholder={t("project.members.addMember")}
                pattern="^[a-zA-Z0-9-]+([_.][a-zA-Z0-9-]+)*$"
                title={t("user.wrongloginId.alert")}
              />
              <button type="submit" className="ybtn ybtn-success">
                <i className="yobicon-addfriend"></i> {t("button.add")}
              </button>
            </form>
          </div>

          <ul className="members project row-fluid">
            {organization.members.map((member) => (
              <OrganizationMember
                basePath={runtimeConfig.basePath}
                key={stringField(member.loginId, "")}
                member={member}
                organization={organization}
                organizationName={organizationName}
                onDelete={setDeleteUserId}
                onRole={(userId, role) => updateRoleMutation.mutate({ role, userId })}
              />
            ))}
          </ul>

          <div
            id="alertDeletion"
            className={deleteUserId === null ? "modal hide" : "modal"}
            style={deleteUserId === null ? undefined : { display: "block" }}
          >
            <div className="modal-header">
              <button
                type="button"
                className="close"
                data-dismiss="modal"
                onClick={() => setDeleteUserId(null)}
              >
                ×
              </button>
              <h3>{t("organization.member.delete")}</h3>
            </div>
            <div className="modal-body">
              <p>{t("organization.member.deleteConfirm")}</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="ybtn ybtn-info ybtn-mini"
                id="deleteBtn"
                onClick={() => {
                  if (deleteUserId !== null) {
                    deleteMutation.mutate(deleteUserId);
                  }
                  setDeleteUserId(null);
                }}
              >
                {t("button.yes")}
              </button>
              <button
                type="button"
                className="ybtn ybtn-mini"
                data-dismiss="modal"
                onClick={() => setDeleteUserId(null)}
              >
                {t("button.no")}
              </button>
            </div>
          </div>

          {organization.enrollmentRequests.length > 0 ? (
            <>
              <legend>
                <h3>
                  {t("project.member.enrollment.request")} ({organization.enrollmentRequests.length}
                  )
                </h3>
              </legend>
              <div className="row-fluid">
                {organization.enrollmentRequests.map((user) => (
                  <EnrollmentRequest
                    basePath={runtimeConfig.basePath}
                    key={stringField(user.loginId, "")}
                    onAccept={(userId) => acceptMutation.mutate(userId)}
                    user={user}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

function OrganizationMember({
  basePath,
  member,
  organization,
  organizationName,
  onDelete,
  onRole,
}: {
  basePath: string;
  member: YonaUserItem;
  organization: OrganizationAdminView;
  organizationName: string;
  onDelete: (userId: number) => void;
  onRole: (userId: number, role: string) => void;
}) {
  const { t } = useLegacyMessages();
  const loginId = stringField(member.loginId, "");
  const userId = numberField(member.userId);
  const role = stringField(member.role, "");

  return (
    <li className="member span6 span-hard-wrap">
      <a
        href={prefixBasePath(basePath, `/${loginId}`)}
        className="avatar-wrap mlarge pull-left mr10"
      >
        <img
          src={stringField(member.avatarUrl, "/assets/images/default-avatar-64.png")}
          width="64"
          height="64"
          alt=""
        />
      </a>
      <div className="member-name">{stringField(member.userLabel, loginId)}</div>
      <div className="member-id">@{loginId}</div>
      <div className="member-setting">
        <div className="btn-group" data-name={`roleof-${loginId}`}>
          <button className="btn dropdown-toggle large" data-toggle="dropdown">
            <span className="d-label">{roleLabel(organization, role)}</span>
            <span className="d-caret">
              <span className="caret"></span>
            </span>
          </button>
          <ul className="dropdown-menu">
            {organization.roleOptions.map((option) => {
              const roleName = stringField(option.role, "");
              const selected = roleName === role;
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
                      `/organizations/${organizationName}/members/${userId}`,
                    )}
                    data-loginid={loginId}
                    onClick={() => onRole(userId, roleName)}
                  >
                    {roleLabel(organization, roleName)}
                  </LegacyVoidAnchor>
                </li>
              );
            })}
          </ul>
        </div>
        <LegacyVoidAnchor
          data-action="delete"
          data-href={prefixBasePath(
            basePath,
            `/organizations/${organizationName}/members/${userId}`,
          )}
          className="ybtn ybtn-danger ybtn-small"
          onClick={() => onDelete(userId)}
        >
          {t("button.delete")}
        </LegacyVoidAnchor>
      </div>
    </li>
  );
}

function EnrollmentRequest({
  basePath,
  onAccept,
  user,
}: {
  basePath: string;
  onAccept: (userId: number) => void;
  user: YonaUserItem;
}) {
  const { t } = useLegacyMessages();
  const loginId = stringField(user.loginId, "");

  return (
    <div className="span2">
      <div className="pull-left mr10">
        <a href={prefixBasePath(basePath, `/${loginId}`)}>
          <img
            src={stringField(user.avatarUrl, "/assets/images/default-avatar-64.png")}
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
          onClick={() => onAccept(numberField(user.userId))}
        >
          <i className="yobicon-addfriend"></i>
          {t("button.add")}
        </button>
      </div>
    </div>
  );
}

function OrganizationHeader({
  basePath,
  logoUrl,
  organizationName,
}: {
  basePath: string;
  logoUrl: string;
  organizationName: string;
}) {
  return (
    <div className="project-header-outer" style={{ backgroundImage: `url('${logoUrl}')` }}>
      <div className="project-header-inner">
        <div className="project-header-wrap">
          <div className="project-header-avatar">
            <img src={logoUrl} alt="" />
          </div>
          <div className="project-breadcrumb-wrap">
            <div className="project-breadcrumb">
              <span className="project-author">
                <span className="group-title-head">group</span>
                <a href={organizationHref(basePath, organizationName)}>{organizationName}</a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrganizationMenu({
  basePath,
  organizationName,
  viewerCanUpdate,
}: {
  basePath: string;
  organizationName: string;
  viewerCanUpdate: boolean;
}) {
  const { t } = useLegacyMessages();

  return (
    <div className="project-menu-outer">
      <div className="project-menu-inner">
        <ul className="project-menu-nav project-menu-gruop">
          <li className="">
            <a href={organizationHref(basePath, organizationName)}>{t("title.organizationHome")}</a>
          </li>
          <li className="">
            <a href={prefixBasePath(basePath, `/organizations/${organizationName}/issues`)}>
              {t("menu.issue")}
            </a>
          </li>
          <li className="">
            <a href={prefixBasePath(basePath, `/organizations/${organizationName}/boards`)}>
              {t("menu.board")}
            </a>
          </li>
          <li className="">
            <a href={prefixBasePath(basePath, `/organizations/${organizationName}/pullrequests`)}>
              {t("menu.pullRequest")}
            </a>
          </li>
        </ul>
        <div className="project-setting">
          <ul className="project-menu-nav">
            {viewerCanUpdate ? (
              <li className="">
                <a
                  href={prefixBasePath(basePath, `/organizations/${organizationName}/settingform`)}
                >
                  <i className="yobicon-cog"></i>
                  <span className="blind">{t("menu.admin")}</span>
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}

function OrganizationSettingMenu({
  active,
  basePath,
  organizationName,
}: {
  active: "members";
  basePath: string;
  organizationName: string;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const navigate = (to: string) => {
    router.navigate({ to });
  };

  return (
    <ul className="nav nav-tabs">
      <li className="">
        <OrganizationSettingLink
          basePath={basePath}
          onNavigate={navigate}
          to={`/organizations/${organizationName}/settingform`}
        >
          {t("organization.settingFrom")}
        </OrganizationSettingLink>
      </li>
      <li className={active === "members" ? "active" : ""}>
        <OrganizationSettingLink
          basePath={basePath}
          onNavigate={navigate}
          to={`/organizations/${organizationName}/members`}
        >
          {t("organization.member")}
        </OrganizationSettingLink>
      </li>
      <li className="">
        <OrganizationSettingLink
          basePath={basePath}
          onNavigate={navigate}
          to={`/organizations/${organizationName}/deleteForm`}
        >
          {t("organization.delete")}
        </OrganizationSettingLink>
      </li>
    </ul>
  );
}

function OrganizationSettingLink({
  basePath,
  children,
  onNavigate,
  to,
}: {
  basePath: string;
  children: ReactNode;
  onNavigate: (to: string) => void;
  to: string;
}) {
  const navigateWithinOrganizationSettings = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return;
    }

    event.preventDefault();
    onNavigate(to);
  };

  return (
    <a href={prefixBasePath(basePath, to)} onClick={navigateWithinOrganizationSettings}>
      {children}
    </a>
  );
}

function roleLabel(organization: OrganizationAdminView, role: string) {
  const option = organization.roleOptions.find(
    (roleOption: YonaRecord) => stringField(roleOption.role, "") === role,
  );
  return stringField(option?.label, role);
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
    <a ref={ref} className={className} {...props}>
      {children}
    </a>
  );
}

function organizationHref(basePath: string, organizationName: string) {
  return prefixBasePath(basePath, `/organizations/${organizationName}`);
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
