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
  addOrganizationMemberRest,
  deleteOrganizationMemberRest,
  readOrganizationAdminRest,
  readOrganizationDetailRest,
  updateOrganizationMemberRoleRest,
} from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { OrganizationAdminView, YonaRecord, YonaUserItem } from "../../../api/types";
import { RestApiError } from "../../../api/rest-client";
import { readSessionBootstrap, searchLegacyMemberUsers } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";

export const Route = createFileRoute("/organizations/$organizationName/members")({
  component: OrganizationMembersRoute,
});

function insulateOrganizationMembersDeleteModalButtonClick(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
  event.stopPropagation();
}

function OrganizationMembersRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { organizationName } = Route.useParams();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell
          projectSearchScope={{ organizationName }}
          runtimeConfig={runtimeConfig}
          showLegacyProjectHeaderLinks
        >
          <OrganizationMembersScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function OrganizationMembersScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { organizationName } = Route.useParams();
  const siteName = runtimeConfig.siteName ?? "Yona";
  const query = useQuery({
    queryFn: () => readOrganizationAdminRest(runtimeConfig, organizationName),
    queryKey: [...apiQueryKeys.organization.base(organizationName), "admin"],
  });
  const detailQuery = useQuery({
    queryFn: () => readOrganizationDetailRest(runtimeConfig, organizationName),
    queryKey: apiQueryKeys.organization.base(organizationName),
  });

  useEffect(() => {
    const htmlDocument = globalThis.document;
    htmlDocument.title = organizationName;

    return () => {
      htmlDocument.title = siteName;
    };
  }, [organizationName, siteName]);

  if (query.error instanceof RestApiError && query.error.status === 403) {
    if (!detailQuery.data) {
      return null;
    }
    const logoUrl = stringField(detailQuery.data.logoUrl, "") || "/assets/images/group_default.png";
    const detailOrganizationName = stringField(detailQuery.data.organizationName, organizationName);

    return (
      <>
        <OrganizationHeader logoUrl={logoUrl} organizationName={detailOrganizationName} />
        <OrganizationMenu
          basePath={runtimeConfig.basePath}
          organizationName={detailOrganizationName}
          viewerCanUpdate={booleanField(detailQuery.data.viewerCanUpdate)}
        />
        <OrganizationMembersErrorBody messageKey="error.forbidden" />
      </>
    );
  }

  if (!query.data) {
    return null;
  }

  return <OrganizationMembersBody organization={query.data} runtimeConfig={runtimeConfig} />;
}

function OrganizationMembersErrorBody({ messageKey }: { messageKey: string }) {
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
  const loginIdInputRef = useRef<HTMLInputElement>(null);
  const [loginIdQuery, setLoginIdQuery] = useState("");
  const [isTypeaheadOpen, setIsTypeaheadOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [openRoleDropdownLoginId, setOpenRoleDropdownLoginId] = useState<string | null>(null);
  const organizationName = stringField(organization.organizationName, "organization");
  const logoUrl = stringField(organization.logoUrl, "") || "/assets/images/group_default.png";
  const adminQueryKey = [...apiQueryKeys.organization.base(organizationName), "admin"] as const;
  const normalizedLoginQuery = loginIdQuery.trim();
  const mentionStylesheetHref = prefixBasePath(
    runtimeConfig.basePath,
    "/assets/javascripts/lib/mentionjs/mention.css",
  );
  const memberSearchQuery = useQuery({
    enabled: booleanField(organization.viewerCanUpdate) && normalizedLoginQuery.length > 0,
    queryFn: () => searchLegacyMemberUsers(runtimeConfig, normalizedLoginQuery),
    queryKey: ["legacy-member-users", organizationName, normalizedLoginQuery],
    staleTime: 30_000,
  });
  const memberSuggestions = (memberSearchQuery.data?.items ?? []).map(parseLegacyMemberSearchItem);
  const showTypeaheadSuggestions =
    isTypeaheadOpen && normalizedLoginQuery.length > 0 && memberSuggestions.length > 0;
  const closeDeleteMemberModal = () => setDeleteUserId(null);
  const openDeleteMemberModal = (event: MouseEvent<HTMLButtonElement>, userId: number) => {
    insulateOrganizationMembersDeleteModalButtonClick(event);
    setDeleteUserId(userId);
  };
  const dismissDeleteMemberModal = (event: MouseEvent<HTMLButtonElement>) => {
    insulateOrganizationMembersDeleteModalButtonClick(event);
    closeDeleteMemberModal();
  };
  const submitDeleteMember = (event: MouseEvent<HTMLButtonElement>) => {
    insulateOrganizationMembersDeleteModalButtonClick(event);
    if (deleteUserId === null || deleteMutation.isPending) {
      return;
    }
    deleteMutation.mutate(deleteUserId);
  };
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
      closeDeleteMemberModal();
      queryClient.invalidateQueries({ queryKey: adminQueryKey });
    },
    onError(error) {
      window.alert(organizationMemberDeleteErrorMessage(t, error));
      closeDeleteMemberModal();
    },
  });
  function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsTypeaheadOpen(false);
    addLoginId(String(new FormData(event.currentTarget).get("loginId") ?? ""));
  }

  function addLoginId(loginId: string) {
    const formData = new FormData();
    formData.set("loginId", loginId);
    addMutation.mutate(formData);
  }

  function selectSuggestion(suggestion: LegacyMemberSuggestionView) {
    if (loginIdInputRef.current) {
      loginIdInputRef.current.value = suggestion.loginId;
    }
    setLoginIdQuery(suggestion.loginId);
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

  return (
    <>
      <OrganizationHeader logoUrl={logoUrl} organizationName={organizationName} />
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
                ref={loginIdInputRef}
                placeholder={t("project.members.addMember")}
                pattern="^[a-zA-Z0-9-]+([_.][a-zA-Z0-9-]+)*$"
                title={t("user.wrongloginId.alert")}
                onBlur={onLoginIdBlur}
                onChange={(event) => {
                  const nextValue = event.currentTarget.value;
                  setLoginIdQuery(nextValue);
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
                <i className="yobicon-addfriend"></i> {t("button.add")}
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
                        loginIdInputRef.current?.focus();
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

          <ul className="members project row-fluid">
            {organization.members.map((member) => (
              <OrganizationMember
                basePath={runtimeConfig.basePath}
                key={stringField(member.loginId, "")}
                member={member}
                organization={organization}
                organizationName={organizationName}
                onDelete={openDeleteMemberModal}
                onRole={(userId, role) => {
                  setOpenRoleDropdownLoginId(null);
                  updateRoleMutation.mutate({ role, userId });
                }}
                onToggleRoleDropdown={(loginId) =>
                  setOpenRoleDropdownLoginId((current) => (current === loginId ? null : loginId))
                }
                roleDropdownOpen={openRoleDropdownLoginId === stringField(member.loginId, "")}
              />
            ))}
          </ul>

          <div
            id="alertDeletion"
            className={deleteUserId === null ? "modal hide" : "modal hide in"}
            style={deleteUserId === null ? undefined : { display: "block" }}
          >
            <div className="modal-header">
              <button
                type="button"
                className="close"
                data-dismiss="modal"
                onClick={dismissDeleteMemberModal}
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
                onClick={submitDeleteMember}
              >
                {t("button.yes")}
              </button>
              <button
                type="button"
                className="ybtn ybtn-mini"
                data-dismiss="modal"
                onClick={dismissDeleteMemberModal}
              >
                {t("button.no")}
              </button>
            </div>
          </div>
          {deleteUserId === null ? null : <div className="modal-backdrop fade in"></div>}

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
                    key={stringField(user.loginId, "")}
                    onAccept={(loginId) => {
                      if (loginIdInputRef.current) {
                        loginIdInputRef.current.value = loginId;
                      }
                      setLoginIdQuery(loginId);
                      setIsTypeaheadOpen(false);
                      setActiveSuggestionIndex(0);
                      addLoginId(loginId);
                    }}
                    user={user}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
      <link rel="stylesheet" type="text/css" media="screen" href={mentionStylesheetHref} />
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
  onToggleRoleDropdown,
  roleDropdownOpen,
}: {
  basePath: string;
  member: YonaUserItem;
  organization: OrganizationAdminView;
  organizationName: string;
  onDelete: (event: MouseEvent<HTMLButtonElement>, userId: number) => void;
  onRole: (userId: number, role: string) => void;
  onToggleRoleDropdown: (loginId: string) => void;
  roleDropdownOpen: boolean;
}) {
  const { t } = useLegacyMessages();
  const loginId = stringField(member.loginId, "");
  const userId = numberField(member.userId);
  const role = stringField(member.role, "");

  return (
    <li className="member span6 span-hard-wrap">
      <Link
        activeProps={{
          "aria-current": undefined,
          className: undefined,
          "data-status": undefined,
        }}
        className="avatar-wrap mlarge pull-left mr10"
        params={{ user: loginId }}
        search={() => undefined}
        to="/$user"
      >
        <img
          src={stringField(member.avatarUrl, "/assets/images/default-avatar-64.png")}
          width="64"
          height="64"
          alt=""
        />
      </Link>
      <div className="member-name">{stringField(member.userLabel, loginId)}</div>
      <div className="member-id">@{loginId}</div>
      <div className="member-setting">
        <div
          className={roleDropdownOpen ? "btn-group open" : "btn-group"}
          data-name={`roleof-${loginId}`}
        >
          <button
            className="btn dropdown-toggle large"
            data-toggle="dropdown"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleRoleDropdown(loginId);
            }}
          >
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
                  <button
                    type="button"
                    data-action="apply"
                    data-href={prefixBasePath(
                      basePath,
                      `/organizations/${organizationName}/member/${userId}/edit`,
                    )}
                    data-loginid={loginId}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onRole(userId, roleName);
                    }}
                  >
                    {roleLabel(organization, roleName)}
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
            `/organizations/${organizationName}/member/${userId}/delete`,
          )}
          className="ybtn ybtn-danger ybtn-small"
          onClick={(event) => onDelete(event, userId)}
        >
          {t("button.delete")}
        </button>
      </div>
    </li>
  );
}

function EnrollmentRequest({
  onAccept,
  user,
}: {
  onAccept: (loginId: string) => void;
  user: YonaUserItem;
}) {
  const { t } = useLegacyMessages();
  const loginId = stringField(user.loginId, "");

  return (
    <div className="span2">
      <div className="pull-left mr10">
        <Link
          activeProps={{
            "aria-current": undefined,
            className: undefined,
            "data-status": undefined,
          }}
          params={{ user: loginId }}
          search={() => undefined}
          to="/$user"
        >
          <img
            src={stringField(user.avatarUrl, "/assets/images/default-avatar-64.png")}
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
            activeProps={{
              "aria-current": undefined,
              className: undefined,
              "data-status": undefined,
            }}
            params={{ user: loginId }}
            search={() => undefined}
            to="/$user"
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

function OrganizationHeader({
  logoUrl,
  organizationName,
}: {
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
                <Link
                  activeOptions={{ exact: true, includeHash: true, includeSearch: true }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                  params={{ organizationName }}
                  search={() => undefined}
                  to="/organizations/$organizationName"
                >
                  {organizationName}
                </Link>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrganizationMenu({
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
            <Link
              activeOptions={{ exact: true, includeHash: true, includeSearch: true }}
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              params={{ organizationName }}
              search={() => undefined}
              to="/organizations/$organizationName"
            >
              {t("title.organizationHome")}
            </Link>
          </li>
          <li className="">
            <Link
              activeOptions={{ exact: true, includeHash: true, includeSearch: true }}
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              params={{ organizationName }}
              search={() => undefined}
              to="/organizations/$organizationName/issues"
            >
              {t("menu.issue")}
            </Link>
          </li>
          <li className="">
            <Link
              activeOptions={{ exact: true, includeHash: true, includeSearch: true }}
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              params={{ organizationName }}
              search={() => undefined}
              to="/organizations/$organizationName/boards"
            >
              {t("menu.board")}
            </Link>
          </li>
          <li className="">
            <Link
              activeOptions={{ exact: true, includeHash: true, includeSearch: true }}
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              params={{ organizationName }}
              search={() => undefined}
              to="/organizations/$organizationName/pullrequests"
            >
              {t("menu.pullRequest")}
            </Link>
          </li>
        </ul>
        <div className="project-setting">
          <ul className="project-menu-nav">
            {viewerCanUpdate ? (
              <li className="">
                <Link
                  activeOptions={{ exact: true, includeHash: true, includeSearch: true }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                  params={{ organizationName }}
                  search={() => undefined}
                  to="/organizations/$organizationName/settingform"
                >
                  <i className="yobicon-cog"></i>
                  <span className="blind">{t("menu.admin")}</span>
                </Link>
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
  organizationName,
}: {
  active: "members";
  basePath: string;
  organizationName: string;
}) {
  const { t } = useLegacyMessages();

  return (
    <ul className="nav nav-tabs">
      <li className="">
        <Link
          activeOptions={{ exact: true, includeHash: true, includeSearch: true }}
          activeProps={{
            "aria-current": undefined,
            className: undefined,
            "data-status": undefined,
          }}
          params={{ organizationName }}
          search={() => undefined}
          to="/organizations/$organizationName/settingform"
        >
          {t("organization.settingFrom")}
        </Link>
      </li>
      <li className={active === "members" ? "active" : ""}>
        <Link
          activeOptions={{ exact: true, includeHash: true, includeSearch: true }}
          activeProps={{
            "aria-current": undefined,
            className: undefined,
            "data-status": undefined,
          }}
          params={{ organizationName }}
          search={() => undefined}
          to="/organizations/$organizationName/members"
        >
          {t("organization.member")}
        </Link>
      </li>
      <li className="">
        <Link
          activeOptions={{ exact: true, includeHash: true, includeSearch: true }}
          activeProps={{
            "aria-current": undefined,
            className: undefined,
            "data-status": undefined,
          }}
          params={{ organizationName }}
          search={() => undefined}
          to="/organizations/$organizationName/deleteForm"
        >
          {t("organization.delete")}
        </Link>
      </li>
    </ul>
  );
}

function roleLabel(organization: OrganizationAdminView, role: string) {
  const option = organization.roleOptions.find(
    (roleOption: YonaRecord) => stringField(roleOption.role, "") === role,
  );
  return stringField(option?.label, role);
}

function organizationMemberDeleteErrorMessage(t: (key: string) => string, error: unknown) {
  if (error instanceof RestApiError) {
    if (error.status === 403) {
      const ownerCannotLeave = t("project.member.ownerCannotLeave");
      return error.message.includes(ownerCannotLeave) ? ownerCannotLeave : t("error.forbidden");
    }
    if (error.status === 404) {
      return t("organization.member.unknownOrganization");
    }
  }
  return t("error.badrequest");
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
