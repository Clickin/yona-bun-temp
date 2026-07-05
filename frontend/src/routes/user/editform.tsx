import { useEffect, useState } from "react";
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
import { YonaQueryProvider } from "../../query-client";
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

  if (!pathname.endsWith("/user/editform")) {
    return <Outlet />;
  }

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <UserProfileSettingsScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
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
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const avatarOnlyImageMessage = t("user.avatar.onlyImage");

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
      setAvatarFile(null);
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

  return (
    <>
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>{t("userinfo.accountSetting")}</h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="page-wrap">
          <EditTabMenu active="profile" />

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
                <img
                  src={avatarUrl || undefined}
                  style={{ maxWidth: "none", width: "128px" }}
                  alt=""
                />
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
                    id="avatarFile"
                    type="file"
                    className="file"
                    name="filePath"
                    accept="image/*"
                    onChange={(event) => {
                      const nextFile = event.currentTarget.files?.[0] ?? null;
                      if (nextFile && !nextFile.type.startsWith("image/")) {
                        window.alert(avatarOnlyImageMessage);
                        event.currentTarget.value = "";
                        setAvatarFile(null);
                        return;
                      }
                      setAvatarFile(nextFile);
                    }}
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
            className={`modal${avatarFile ? "" : " hide"}`}
            role="dialog"
            data-backdrop="static"
          >
            <div className="modal-header center-txt">
              <div className="avatar-wrap xlarge">
                <img
                  src={avatarPreviewUrl || undefined}
                  style={{ maxWidth: "none", width: "128px" }}
                  alt=""
                />
              </div>
            </div>
            <div className="modal-body">
              <img src={avatarPreviewUrl || undefined} style={{ maxWidth: "500px" }} alt="" />
              <canvas width="128" height="128" className="hide"></canvas>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="ybtn ybtn-default"
                data-dismiss="modal"
                onClick={() => setAvatarFile(null)}
              >
                {t("button.cancel")}
              </button>
              <button
                type="button"
                className="ybtn ybtn-success btnSubmitCrop"
                disabled={!avatarFile || avatarMutation.isPending}
                onClick={() => {
                  if (avatarFile) {
                    avatarMutation.mutate(avatarFile);
                  }
                }}
              >
                {t("button.save")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function EditTabMenu({ active }: { active: string }) {
  const { t } = useLegacyMessages();

  return (
    <ul className="nav nav-tabs mt20">
      <li className={active === "profile" ? "active" : undefined}>
        <Link
          to="/user/editform"
          search={legacyEditTabLinkInactiveSearch}
          activeOptions={legacyEditTabLinkActiveOptions}
          activeProps={legacyEditTabLinkActiveProps}
        >
          {t("userinfo.editProfile")}
        </Link>
      </li>
      <li className={active === "password" ? "active" : undefined}>
        <Link
          to="/user/editform/password"
          search={legacyEditTabLinkInactiveSearch}
          activeOptions={legacyEditTabLinkActiveOptions}
          activeProps={legacyEditTabLinkActiveProps}
        >
          {t("userinfo.changePassword")}
        </Link>
      </li>
      <li className={active === "notifications" ? "active" : undefined}>
        <Link
          to="/user/editform/notifications"
          search={legacyEditTabLinkInactiveSearch}
          activeOptions={legacyEditTabLinkActiveOptions}
          activeProps={legacyEditTabLinkActiveProps}
        >
          {t("userinfo.changeNotifications")}
        </Link>
      </li>
      <li className={active === "emails" ? "active" : undefined}>
        <Link
          to="/user/editform/emails"
          search={legacyEditTabLinkInactiveSearch}
          activeOptions={legacyEditTabLinkActiveOptions}
          activeProps={legacyEditTabLinkActiveProps}
        >
          {t("userinfo.changeEmails")}
        </Link>
      </li>
      <li className={active === "token" ? "active" : undefined}>
        <Link
          to="/user/editform/token"
          search={legacyEditTabLinkInactiveSearch}
          activeOptions={legacyEditTabLinkActiveOptions}
          activeProps={legacyEditTabLinkActiveProps}
        >
          {t("userinfo.token")}
        </Link>
      </li>
    </ul>
  );
}
