import { useEffect, useState, type ChangeEvent, type MouseEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { uploadTemporaryAttachment } from "../../api/attachments";
import { readSessionBootstrap } from "../../auth-workspace-client";
import {
  readWorkspaceOverviewRest,
  resetVisitedProjectsRest,
  updateProfileRest,
} from "../../api/workspace";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { globalBreakpoints } from "../../theme.stylex";
import { SiteLayoutShell } from "../-home-route-screen";
import { userSettingsPageColors, userSettingsTabColors } from "./-editform.stylex";

export const Route = createFileRoute("/user/editform")({
  component: UserProfileSettingsRoute,
});

const legacyEditTabLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};
const legacyEditTabLinkActiveOptions = {
  exact: true,
  explicitUndefined: true,
  includeHash: true,
  includeSearch: true,
} as const;
const legacyEditTabLinkInactiveSearch = { __legacyEditTabActiveMarker: undefined };
const styles = stylex.create({
  breadcrumbOuter: {
    boxSizing: "border-box",
    minWidth: { [globalBreakpoints.mobile]: "10px" },
    padding: "0px 10px",
    width: "100%",
  },
  breadcrumbInner: {
    margin: "0px auto",
  },
  breadcrumbHeading: {
    color: "inherit",
    fontFamily: "inherit",
    fontSize: "24.5px",
    fontWeight: "700",
    lineHeight: "30px",
    margin: "0px",
    padding: "10px 10px 5px",
    textRendering: "auto",
  },
  editTabs: {
    backgroundColor: "transparent",
    borderBottomColor: userSettingsTabColors.border,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    boxSizing: "content-box",
    color: userSettingsTabColors.rootText,
    display: "block",
    fontFamily: "inherit",
    fontSize: "13px",
    fontWeight: "400",
    lineHeight: "20px",
    listStyle: "none",
    margin: "20px 0px",
    padding: "0px",
    "::before": { content: '""', display: "table", lineHeight: "0px" },
    "::after": { clear: "both", content: '""', display: "table", lineHeight: "0px" },
  },
  editTabItem: {
    backgroundColor: "transparent",
    borderWidth: "0px",
    boxSizing: "content-box",
    color: "inherit",
    display: "list-item",
    float: "left",
    fontFamily: "inherit",
    fontSize: "13px",
    fontWeight: "400",
    lineHeight: "20px",
    listStyle: "none",
    margin: "0px 0px -1px",
    padding: "0px",
  },
  editTabLink: {
    backgroundColor: {
      default: "transparent",
      ":hover": userSettingsTabColors.hoverSurface,
      ":focus": userSettingsTabColors.focusSurface,
    },
    borderTopColor: {
      default: "transparent",
      ":hover": userSettingsTabColors.hoverBorder,
      ":focus": userSettingsTabColors.hoverBorder,
    },
    borderRightColor: {
      default: "transparent",
      ":hover": userSettingsTabColors.hoverBorder,
      ":focus": userSettingsTabColors.hoverBorder,
    },
    borderBottomColor: {
      default: "transparent",
      ":hover": userSettingsTabColors.border,
      ":focus": userSettingsTabColors.border,
    },
    borderLeftColor: {
      default: "transparent",
      ":hover": userSettingsTabColors.hoverBorder,
      ":focus": userSettingsTabColors.hoverBorder,
    },
    borderRadius: "4px 4px 0px 0px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxSizing: "content-box",
    color: userSettingsTabColors.linkText,
    cursor: "pointer",
    display: "block",
    fontFamily: "inherit",
    fontSize: "13px",
    fontWeight: "700",
    lineHeight: "20px",
    margin: "0px 2px 0px 0px",
    outline: "none",
    padding: { default: "8px 30px", [globalBreakpoints.mobile]: "8px 5px" },
    textDecoration: { default: "none", ":hover": "none", ":focus": "none" },
  },
  editTabLinkActive: {
    backgroundColor: {
      default: userSettingsTabColors.activeSurface,
      ":hover": userSettingsTabColors.activeSurface,
      ":focus": userSettingsTabColors.activeSurface,
    },
    borderTopColor: {
      default: userSettingsTabColors.border,
      ":hover": userSettingsTabColors.border,
      ":focus": userSettingsTabColors.border,
    },
    borderRightColor: {
      default: userSettingsTabColors.border,
      ":hover": userSettingsTabColors.border,
      ":focus": userSettingsTabColors.border,
    },
    borderBottomColor: { default: "transparent", ":hover": "transparent", ":focus": "transparent" },
    borderLeftColor: {
      default: userSettingsTabColors.border,
      ":hover": userSettingsTabColors.border,
      ":focus": userSettingsTabColors.border,
    },
    color: userSettingsTabColors.activeText,
    cursor: "default",
  },
  settingsPageOuter: {
    boxSizing: "border-box",
    marginTop: "10px",
    minHeight: "450px",
    minWidth: { [globalBreakpoints.mobile]: "10px" },
    padding: { default: "0px 10px", [globalBreakpoints.mobile]: "0px" },
    width: "100%",
  },
  settingsPage: {
    backgroundColor: userSettingsPageColors.pageSurface,
    margin: "0px auto",
  },
});

function UserProfileSettingsRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const activeTab = pathname.endsWith("/user/editform")
    ? "profile"
    : pathname.endsWith("/user/editform/notifications")
      ? "notifications"
      : pathname.endsWith("/user/editform/emails")
        ? "emails"
        : pathname.endsWith("/user/editform/password")
          ? "password"
          : pathname.endsWith("/user/editform/token")
            ? "token"
            : null;

  if (!activeTab) {
    return <Outlet />;
  }

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <UserSettingsNestedLayout runtimeConfig={runtimeConfig} activeTab={activeTab} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function UserSettingsNestedLayout({
  runtimeConfig,
  activeTab,
}: {
  runtimeConfig: RuntimeConfig;
  activeTab: "profile" | "notifications" | "emails" | "password" | "token";
}) {
  const { t } = useLegacyMessages();
  const workspaceQuery = useQuery({
    queryFn: () => readWorkspaceOverviewRest(runtimeConfig),
    queryKey: ["workspace", "overview"],
  });
  const loginId = workspaceQuery.data?.profile?.loginId ?? "";

  return (
    <>
      <UserProfileSettingsTitle loginId={loginId} />
      <div
        {...stylex.props(styles.breadcrumbOuter)}
        data-stylex-owner="user-settings-breadcrumb-outer"
      >
        <div
          {...stylex.props(styles.breadcrumbInner)}
          data-stylex-owner="user-settings-breadcrumb-inner"
        >
          <h3
            {...stylex.props(styles.breadcrumbHeading)}
            data-stylex-owner="user-settings-breadcrumb-heading"
          >
            {t(activeTab === "token" ? "userinfo.token" : "userinfo.accountSetting")}
          </h3>
        </div>
      </div>
      <div
        {...stylex.props(styles.settingsPageOuter)}
        data-stylex-owner="user-settings-page-wrap-outer"
      >
        <div {...stylex.props(styles.settingsPage)} data-stylex-owner="user-settings-page-wrap">
          <EditTabMenu active={activeTab} />
          {activeTab === "profile" ? (
            <UserProfileSettingsScreen runtimeConfig={runtimeConfig} />
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </>
  );
}

function UserProfileSettingsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const workspaceQuery = useQuery({
    queryFn: () => readWorkspaceOverviewRest(runtimeConfig),
    queryKey: ["workspace", "overview"],
  });
  const profile = workspaceQuery.data?.profile;
  const loginId = profile?.loginId ?? "";
  const displayName = profile?.displayName ?? "";
  const email = profile?.primaryEmailAddress ?? "";
  const avatarUrl = profile?.avatarUrl ?? "";
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarCropModalOpen, setAvatarCropModalOpen] = useState(false);
  const [avatarCropModalHasOpened, setAvatarCropModalHasOpened] = useState(false);
  const [avatarFileInputKey, setAvatarFileInputKey] = useState(0);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const avatarOnlyImageMessage = t("user.avatar.onlyImage");

  function insulateAvatarCropModalButtonClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  const resetAvatarCropSelection = () => {
    setAvatarCropModalOpen(false);
    setAvatarFile(null);
    setAvatarFileInputKey((currentKey) => currentKey + 1);
  };

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.currentTarget.files?.[0] ?? null;
    if (nextFile && !nextFile.type.startsWith("image/")) {
      window.alert(avatarOnlyImageMessage);
      resetAvatarCropSelection();
      return;
    }
    setAvatarFile(nextFile);
    if (nextFile) {
      setAvatarCropModalHasOpened(true);
    }
    setAvatarCropModalOpen(nextFile !== null);
  };

  const dismissAvatarCropModal = (event: MouseEvent<HTMLButtonElement>) => {
    insulateAvatarCropModalButtonClick(event);
    resetAvatarCropSelection();
  };

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl("");
      return;
    }
    const nextPreviewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [avatarFile]);

  const profileMutation = useMutation({
    mutationFn: async (input: { avatarAttachmentId: string; email: string; name: string }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return updateProfileRest(runtimeConfig, csrfToken, input);
    },
    onSuccess: (workspace) => {
      queryClient.setQueryData(["workspace", "overview"], workspace);
    },
  });
  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      const attachment = await uploadTemporaryAttachment(runtimeConfig, csrfToken, file);
      return updateProfileRest(runtimeConfig, csrfToken, {
        avatarAttachmentId: String(attachment.id),
        email,
        name: displayName,
      });
    },
    onSuccess: (workspace) => {
      queryClient.setQueryData(["workspace", "overview"], workspace);
      resetAvatarCropSelection();
    },
  });
  const resetVisitedMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return resetVisitedProjectsRest(runtimeConfig, csrfToken);
    },
    onSuccess: (workspace) => {
      queryClient.setQueryData(["workspace", "overview"], workspace);
    },
  });

  const submitAvatarCrop = (event: MouseEvent<HTMLButtonElement>) => {
    insulateAvatarCropModalButtonClick(event);
    if (avatarFile) {
      avatarMutation.mutate(avatarFile);
    }
  };

  return (
    <>
      <form
        id="frmBasic"
        method="post"
        action={prefixBasePath(runtimeConfig.basePath, "/user/edit")}
        className="pull-left"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const formData = new FormData(form);
          profileMutation.mutate({
            avatarAttachmentId: "",
            email: String(formData.get("email") ?? ""),
            name: String(formData.get("name") ?? ""),
          });
        }}
      >
        <dl>
          <dt>{t("user.loginId")}</dt>
          <dd className="mt10">
            <input type="text" className="text" value={loginId} readOnly />
          </dd>
          <dt>{t("user.name")}</dt>
          <dd className="mt10">
            <input
              key={`name-${displayName}`}
              type="text"
              name="name"
              className="text"
              defaultValue={displayName}
            />
          </dd>
          <dt>{t("user.email")}</dt>
          <dd className="mt10">
            <input
              key={`email-${email}`}
              type="email"
              name="email"
              className="text"
              defaultValue={email}
            />
          </dd>
          <dd>
            <button type="submit" className="ybtn ybtn-success">
              {t("userinfo.editProfile")}
            </button>
          </dd>
        </dl>
      </form>

      <form
        id="frmAvatar"
        method="post"
        action={prefixBasePath(runtimeConfig.basePath, "/user/edit")}
        className="pull-left"
        style={{ borderLeft: "1px solid #ddd", marginLeft: "50px", paddingLeft: "50px" }}
        onSubmit={(event) => {
          event.preventDefault();
          if (avatarFile) {
            avatarMutation.mutate(avatarFile);
          }
        }}
      >
        <input type="hidden" name="name" value={displayName} />
        <input type="hidden" name="email" value={email} />

        <div className="avatar-frm">
          <div className="avatar-wrap xlarge">
            {/* oxlint-disable-next-line jsx-a11y/alt-text -- legacy user/edit.scala.html renders the profile avatar without an alt attribute. */}
            <img src={avatarUrl || undefined} style={{ maxWidth: "none", width: "128px" }} />
          </div>
          <div
            className="upload-progress avatar"
            style={avatarMutation.isPending ? undefined : { display: "none" }}
          >
            <div
              className="bar orange"
              style={avatarMutation.isPending ? { width: "100%" } : undefined}
            ></div>
          </div>
          <div className="btn-wrap mt10 center-txt">
            <div className="ybtn ybtn-small fake-file-wrap btnUploadAvatar">
              {t("userinfo.changeAvatar")}
              <input
                key={avatarFileInputKey}
                id="avatarFile"
                type="file"
                className="file"
                name="filePath"
                accept="image/*"
                onChange={handleAvatarFileChange}
              />
            </div>
          </div>
        </div>
      </form>

      <div className="reset-user-visited-list">
        <hr />
        <form
          method="post"
          action={prefixBasePath(runtimeConfig.basePath, "/user/resetVisitedList")}
          onSubmit={(event) => {
            event.preventDefault();
            resetVisitedMutation.mutate();
          }}
        >
          <button type="submit" className="ybtn">
            {t("userinfo.reset.visited.project.list")}
          </button>
        </form>
      </div>
      <div
        id="avatarCropWrap"
        className={avatarCropModalOpen ? "modal hide in" : "modal hide"}
        role="dialog"
        data-backdrop="static"
        aria-hidden={
          avatarCropModalHasOpened ? (avatarCropModalOpen ? "false" : "true") : undefined
        }
        style={avatarCropModalOpen ? { display: "block" } : undefined}
      >
        <div className="modal-header center-txt">
          <div className="avatar-wrap xlarge">
            {/* oxlint-disable-next-line jsx-a11y/alt-text -- legacy user/edit.scala.html renders the crop header avatar without an alt attribute. */}
            <img src={avatarPreviewUrl || undefined} style={{ maxWidth: "none", width: "128px" }} />
          </div>
        </div>
        <div className="modal-body">
          {/* oxlint-disable-next-line jsx-a11y/alt-text -- legacy user/edit.scala.html renders the crop preview image without an alt attribute. */}
          <img src={avatarPreviewUrl || undefined} style={{ maxWidth: "500px" }} />
          <canvas width="128" height="128" className="hide"></canvas>
        </div>
        <div className="modal-footer">
          <button type="button" className="ybtn ybtn-default" onClick={dismissAvatarCropModal}>
            {t("button.cancel")}
          </button>
          <button
            type="button"
            className="ybtn ybtn-success btnSubmitCrop"
            onClick={submitAvatarCrop}
          >
            {t("button.save")}
          </button>
        </div>
      </div>
      {avatarCropModalOpen ? <div className="modal-backdrop in"></div> : null}
    </>
  );
}

function UserProfileSettingsTitle({ loginId }: { loginId: string }) {
  return loginId ? <title>{loginId}</title> : null;
}

function EditTabMenu({ active }: { active: string }) {
  const { t } = useLegacyMessages();
  const tabs = [
    { key: "profile", message: "userinfo.editProfile", to: "/user/editform" },
    { key: "password", message: "userinfo.changePassword", to: "/user/editform/password" },
    {
      key: "notifications",
      message: "userinfo.changeNotifications",
      to: "/user/editform/notifications",
    },
    { key: "emails", message: "userinfo.changeEmails", to: "/user/editform/emails" },
    { key: "token", message: "userinfo.token", to: "/user/editform/token" },
  ] as const;

  return (
    <ul {...stylex.props(styles.editTabs)} data-stylex-owner="user-settings-edit-tabs">
      {tabs.map((tab) => {
        const selected = active === tab.key;
        return (
          <li
            key={tab.key}
            {...stylex.props(styles.editTabItem)}
            data-selected={selected}
            data-stylex-owner="user-settings-edit-tab-item"
          >
            <Link
              {...stylex.props(styles.editTabLink, selected && styles.editTabLinkActive)}
              to={tab.to}
              search={legacyEditTabLinkInactiveSearch}
              activeOptions={legacyEditTabLinkActiveOptions}
              activeProps={legacyEditTabLinkActiveProps}
              data-stylex-owner="user-settings-edit-tab-link"
            >
              {t(tab.message)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
