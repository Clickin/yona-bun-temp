import { useEffect, useState, type ChangeEvent, type MouseEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
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
import { SiteLayoutShell } from "../-home-route-screen";

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
      <div className="" data-owner="user-settings-breadcrumb-outer">
        <div className="" data-owner="user-settings-breadcrumb-inner">
          <h3 data-owner="user-settings-breadcrumb-heading">
            {t(activeTab === "token" ? "userinfo.token" : "userinfo.accountSetting")}
          </h3>
        </div>
      </div>
      <div className="page-wrap-outer" data-owner="user-settings-page-wrap-outer">
        <div className="page-wrap" data-owner="user-settings-page-wrap">
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
        className="pull-left"
        method="post"
        action={prefixBasePath(runtimeConfig.basePath, "/user/edit")}
        data-owner="user-settings-profile-form"
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
          <dd className="mt10" data-owner="user-settings-profile-login-id-row">
            <input
              type="text"
              className="text"
              data-owner="user-settings-profile-field"
              value={loginId}
              readOnly
            />
          </dd>
          <dt>{t("user.name")}</dt>
          <dd className="mt10" data-owner="user-settings-profile-name-row">
            <input
              key={`name-${displayName}`}
              type="text"
              name="name"
              className="text"
              data-owner="user-settings-profile-field"
              defaultValue={displayName}
            />
          </dd>
          <dt>{t("user.email")}</dt>
          <dd className="mt10" data-owner="user-settings-profile-email-row">
            <input
              key={`email-${email}`}
              type="email"
              name="email"
              className="text"
              data-owner="user-settings-profile-field"
              defaultValue={email}
            />
          </dd>
          <dd>
            <button
              type="submit"
              className="ybtn ybtn-success"
              data-owner="user-settings-profile-action"
            >
              {t("userinfo.editProfile")}
            </button>
          </dd>
        </dl>
      </form>

      <form
        id="frmAvatar"
        className="pull-left"
        method="post"
        action={prefixBasePath(runtimeConfig.basePath, "/user/edit")}
        data-owner="user-settings-avatar-form"
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
          <div className="avatar-wrap xlarge" data-owner="user-settings-avatar-wrap">
            {/* oxlint-disable-next-line jsx-a11y/alt-text -- legacy user/edit.scala.html renders the profile avatar without an alt attribute. */}
            <img src={avatarUrl || undefined} data-owner="user-settings-avatar-image" />
          </div>
          <div
            className={`upload-progress avatar${avatarMutation.isPending ? "" : " hide"}`.trim()}
            data-owner="user-settings-avatar-progress"
          >
            <div
              className={`bar orange${avatarMutation.isPending ? " is-full" : ""}`.trim()}
              data-owner="user-settings-avatar-progress-bar"
            ></div>
          </div>
          <div className="btn-wrap mt10 center-txt" data-owner="user-settings-avatar-upload-wrap">
            <div
              className="ybtn ybtn-small fake-file-wrap btnUploadAvatar"
              data-owner="user-settings-avatar-upload"
            >
              {t("userinfo.changeAvatar")}
              <input
                key={avatarFileInputKey}
                id="avatarFile"
                type="file"
                className="file"
                data-owner="user-settings-avatar-upload-input"
                name="filePath"
                accept="image/*"
                onChange={handleAvatarFileChange}
              />
            </div>
          </div>
        </div>
      </form>

      <div className="reset-user-visited-list" data-owner="user-settings-reset-visited">
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
        data-owner="user-settings-avatar-crop"
        role="dialog"
        data-backdrop="static"
        aria-hidden={
          avatarCropModalHasOpened ? (avatarCropModalOpen ? "false" : "true") : undefined
        }
        className={avatarCropModalOpen ? "modal hide in" : "modal hide"}
      >
        <div className="modal-header center-txt" data-owner="user-settings-avatar-crop-header">
          <div className="avatar-wrap xlarge" data-owner="user-settings-avatar-crop-wrap">
            {/* oxlint-disable-next-line jsx-a11y/alt-text -- legacy user/edit.scala.html renders the crop header avatar without an alt attribute. */}
            <img src={avatarPreviewUrl || undefined} data-owner="user-settings-avatar-crop-image" />
          </div>
        </div>
        <div className="modal-body">
          {/* oxlint-disable-next-line jsx-a11y/alt-text -- legacy user/edit.scala.html renders the crop preview image without an alt attribute. */}
          <img src={avatarPreviewUrl || undefined} data-owner="user-settings-avatar-crop-preview" />
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
    <ul className="" data-owner="user-settings-edit-tabs">
      {tabs.map((tab) => {
        const selected = active === tab.key;
        return (
          <li
            key={tab.key}
            data-selected={selected}
            className=""
            data-owner="user-settings-edit-tab-item"
          >
            <Link
              to={tab.to}
              search={legacyEditTabLinkInactiveSearch}
              activeOptions={legacyEditTabLinkActiveOptions}
              activeProps={legacyEditTabLinkActiveProps}
              className=""
              data-owner="user-settings-edit-tab-link"
            >
              {t(tab.message)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
