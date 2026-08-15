import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import {
  addOrganizationMemberRest,
  deleteOrganizationMemberRest,
  readOrganizationAdminRest,
  updateOrganizationMemberRoleRest,
} from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { OrganizationAdminView, YoramRecord, YoramUserItem } from "../../../api/types";
import { RestApiError } from "../../../api/rest-client";
import { EnrollmentRequest } from "../../../components/enrollment-request";
import { readSessionBootstrap, searchLegacyMemberUsers } from "../../../auth-workspace-client";
import { useLegacyMessages } from "../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import legacySpriteUrl from "../../../assets/legacy/sprite.png";

export const Route = createFileRoute("/organizations/$organizationName/members")({
  component: OrganizationMembersRoute,
});

function insulateOrganizationMembersDeleteModalButtonClick(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
  event.stopPropagation();
}

function OrganizationMembersRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  return <OrganizationMembersScreen runtimeConfig={runtimeConfig} />;
}

function OrganizationMembersScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { organizationName } = Route.useParams();
  const query = useQuery({
    // retry: 0 — legacy members error responses (403) answer immediately;
    // TanStack Query's retryer pauses between attempts while the document is
    // unfocused, so a retrying 403 never reaches isError in hidden WTR
    // iframes (org-project.ts members precedent).
    queryFn: () => readOrganizationAdminRest(runtimeConfig, organizationName),
    queryKey: [...apiQueryKeys.organization.base(organizationName), "admin"],
    retry: 0,
  });

  if (query.error instanceof RestApiError && query.error.status === 403) {
    return <OrganizationMembersErrorBody messageKey="error.forbidden" />;
  }

  if (!query.data) {
    return <title>{organizationName}</title>;
  }

  return <OrganizationMembersBody organization={query.data} runtimeConfig={runtimeConfig} />;
}

function OrganizationMembersErrorBody({ messageKey }: { messageKey: string }) {
  const { t } = useLegacyMessages();

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="error-wrap" data-owner="organization-members-error-wrap">
          <i
            className="ico ico-err2"
            style={
              { "--organization-members-error-sprite": `url(${legacySpriteUrl})` } as CSSProperties
            }
            data-owner="organization-members-error-icon"
          ></i>
          <p data-owner="organization-members-error-message">{t(messageKey)}</p>
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

  useEffect(() => {
    if (booleanField(organization.viewerCanUpdate)) {
      loginIdInputRef.current?.focus();
    }
  }, [organization.viewerCanUpdate]);

  return (
    <>
      <title>{organizationName}</title>
      <div className="page-wrap-outer" data-owner="organization-members-page">
        <div className="project-page-wrap" data-owner="organization-members-shell">
          <OrganizationSettingMenu
            active="members"
            basePath={runtimeConfig.basePath}
            organizationName={organizationName}
          />

          {/* Legacy class contract: className={`inner-bubble${showTypeaheadSuggestions ? " open" : ""}`} */}
          <div
            className={`inner-bubble${showTypeaheadSuggestions ? " open" : ""}`}
            data-owner="organization-members-header"
          >
            <form
              className="nm"
              action={prefixBasePath(
                runtimeConfig.basePath,
                `/organizations/${organizationName}/members`,
              )}
              method="post"
              id="addNewMember"
              data-owner="organization-members-add-form"
              onSubmit={onAdd}
            >
              <input
                type="text"
                className="text uname"
                id="loginId"
                name="loginId"
                data-owner="organization-members-add-form-input"
                required={true}
                autoComplete="off"
                ref={loginIdInputRef}
                value={loginIdQuery}
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
              <ul className="typeahead dropdown-menu">
                {memberSuggestions.map((suggestion, index) => (
                  <li
                    className={index === activeSuggestionIndex ? "active" : undefined}
                    data-value={suggestion.info}
                    key={suggestion.loginId}
                  >
                    <button
                      type="button"
                      data-owner="organization-members-suggestion-action"
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

          <ul className="members project row-fluid" data-owner="organization-members-list">
            {organization.members.map((member) => (
              <OrganizationMember
                key={stringField(member.loginId, "")}
                member={member}
                organization={organization}
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
            className={`modal hide${deleteUserId === null ? "" : " in"}`}
            data-owner="organization-members-delete-modal"
          >
            <div className="modal-header">
              <button type="button" className="close" onClick={dismissDeleteMemberModal}>
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
              <button type="button" className="ybtn ybtn-mini" onClick={dismissDeleteMemberModal}>
                {t("button.no")}
              </button>
            </div>
          </div>
          {deleteUserId === null ? null : <div className="modal-backdrop fade in"></div>}

          {organization.enrollmentRequests.length > 0 ? (
            <>
              <legend>
                <h3>
                  {`${t("project.member.enrollment.request")} (${organization.enrollmentRequests.length})`}
                </h3>
              </legend>
              <div className="row-fluid">
                {organization.enrollmentRequests.map((user) => (
                  <EnrollmentRequest
                    activeProps={{
                      "aria-current": undefined,
                      className: undefined,
                      "data-status": undefined,
                    }}
                    avatarDefaultSrc="/assets/images/default-avatar-64.png"
                    avatarWrapOwner="organization-enrollment-avatar-wrap"
                    detailsOwner="organization-members-enrollment-details"
                    key={stringField(user.loginId, "")}
                    onAccept={(loginId, _userId) => {
                      // legacy yobi.organization.Member _onClickEnrollAcceptBtns:
                      // fills #loginId and submits #addNewMember (no accept REST)
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
  member,
  organization,
  onDelete,
  onRole,
  onToggleRoleDropdown,
  roleDropdownOpen,
}: {
  member: YoramUserItem;
  organization: OrganizationAdminView;
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
    <li className="member span6 span-hard-wrap" data-owner="organization-member-row">
      <Link
        activeProps={{
          "aria-current": undefined,
          className: undefined,
          "data-status": undefined,
        }}
        className="avatar-wrap mlarge pull-left mr10"
        data-owner="organization-member-avatar"
        params={{ user: loginId }}
        to="/$user"
      >
        <img
          data-owner="organization-member-avatar-image"
          src={stringField(member.avatarUrl, "/assets/images/default-avatar-64.png")}
          width="64"
          height="64"
          alt=""
        />
      </Link>
      <div className="member-name" data-owner="organization-member-name">
        {stringField(member.userLabel, loginId)}
      </div>
      <div className="member-id" data-owner="organization-member-id">
        @{loginId}
      </div>
      <div className="member-setting" data-owner="organization-member-meta">
        <div className={roleDropdownOpen ? "btn-group open" : "btn-group"}>
          <button
            className="btn dropdown-toggle large"
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
                    className="role-menu-item"
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
          className="ybtn ybtn-danger ybtn-small"
          onClick={(event) => onDelete(event, userId)}
        >
          {t("button.delete")}
        </button>
      </div>
    </li>
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
          activeOptions={{
            exact: true,
            explicitUndefined: true,
            includeHash: true,
            includeSearch: true,
          }}
          activeProps={{
            "aria-current": undefined,
            className: undefined,
            "data-status": undefined,
          }}
          params={{ organizationName }}
          // TanStack STATIC_ACTIVE_PROPS overrides activeProps on matched links;
          // a never-matching marker search keeps the active tab anchor free of
          // aria-current/data-status (li.active marks the tab, massmail precedent).
          search={{ __legacyOrganizationSettingMenuActiveMarker: undefined }}
          to="/organizations/$organizationName/settingform"
        >
          {t("organization.settingFrom")}
        </Link>
      </li>
      <li className={active === "members" ? "active" : ""}>
        <Link
          activeOptions={{
            exact: true,
            explicitUndefined: true,
            includeHash: true,
            includeSearch: true,
          }}
          activeProps={{
            "aria-current": undefined,
            className: undefined,
            "data-status": undefined,
          }}
          params={{ organizationName }}
          search={{ __legacyOrganizationSettingMenuActiveMarker: undefined }}
          to="/organizations/$organizationName/members"
        >
          {t("organization.member")}
        </Link>
      </li>
      <li className="">
        <Link
          activeOptions={{
            exact: true,
            explicitUndefined: true,
            includeHash: true,
            includeSearch: true,
          }}
          activeProps={{
            "aria-current": undefined,
            className: undefined,
            "data-status": undefined,
          }}
          params={{ organizationName }}
          search={{ __legacyOrganizationSettingMenuActiveMarker: undefined }}
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
    (roleOption: YoramRecord) => stringField(roleOption.role, "") === role,
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

  return {
    imageSrc:
      legacyClassedImageSrc(info, "mention_image") || "/assets/images/default-avatar-32.png",
    info,
    loginId,
    mentionUsername: legacyClassedText(info, "mention_username") || `@${loginId}`,
    userLabel: legacyClassedText(info, "mention_name") || loginId,
  };
}

function legacyClassedImageSrc(markup: string, className: string) {
  const tagPattern = /<img\b[^>]*>/gi;
  for (const match of markup.matchAll(tagPattern)) {
    const tag = match[0];
    if (legacyTagHasClass(tag, className)) {
      return legacyTagAttribute(tag, "src");
    }
  }
  return "";
}

function legacyClassedText(markup: string, className: string) {
  const tagPattern = /<([a-zA-Z][\w:-]*)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  for (const match of markup.matchAll(tagPattern)) {
    const tag = match[0];
    if (legacyTagHasClass(tag, className)) {
      return legacyPlainText(match[2]).trim();
    }
  }
  return "";
}

function legacyTagAttribute(tag: string, attributeName: string) {
  const pattern = new RegExp(`\\b${escapeRegExp(attributeName)}\\s*=\\s*(["'])(.*?)\\1`, "i");
  return pattern.exec(tag)?.[2]?.trim() ?? "";
}

function legacyTagHasClass(tag: string, className: string) {
  return legacyTagAttribute(tag, "class").split(/\s+/u).includes(className);
}

function legacyPlainText(markup: string) {
  return markup
    .replaceAll(/<[^>]*>/g, "")
    .replaceAll(/&nbsp;/gi, " ")
    .replaceAll(/&amp;/gi, "&")
    .replaceAll(/&lt;/gi, "<")
    .replaceAll(/&gt;/gi, ">")
    .replaceAll(/&quot;/gi, '"')
    .replaceAll(/&#39;/gi, "'");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
