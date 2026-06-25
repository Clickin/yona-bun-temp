import * as React from "react";
import { LEGACY_DEFAULT_LANGUAGE, lookupLegacyMessage, type LegacyI18nContextValue } from "../i18n";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import type { WorkspaceOverviewViewModel } from "./-view-models";
import { resolveWorkspaceAvatarUrl } from "./-workspace-views";

export type WorkspaceSettingsSection =
  | "emails"
  | "notifications"
  | "password"
  | "profile"
  | "token";

export interface ProfileUpdateInput {
  avatarAttachmentId: string;
  email: string;
  name: string;
}

export interface AvatarCropSelection {
  size: number;
  x: number;
  y: number;
}

export const WORKSPACE_AVATAR_ONLY_IMAGE_MESSAGE = "user.avatar.onlyImage";
export const WORKSPACE_AVATAR_UPLOAD_ERROR_MESSAGE = "user.avatar.uploadError";

type LegacyMessageLookup = LegacyI18nContextValue["t"];

const WORKSPACE_SETTINGS_TABS: Array<{
  href: string;
  label: string;
  section: WorkspaceSettingsSection;
}> = [
  { href: "/user/editform", label: "userinfo.editProfile", section: "profile" },
  { href: "/user/editform/password", label: "userinfo.changePassword", section: "password" },
  {
    href: "/user/editform/notifications",
    label: "userinfo.changeNotifications",
    section: "notifications",
  },
  { href: "/user/editform/emails", label: "userinfo.changeEmails", section: "emails" },
  { href: "/user/editform/token", label: "userinfo.token", section: "token" },
];

function clampAvatarCropSelection(
  crop: AvatarCropSelection,
  imageWidth: number,
  imageHeight: number,
): AvatarCropSelection {
  const maxSize = Math.max(1, Math.min(imageWidth, imageHeight));
  const size = Math.min(Math.max(1, Math.round(crop.size)), maxSize);
  const x = Math.min(Math.max(0, Math.round(crop.x)), Math.max(0, imageWidth - size));
  const y = Math.min(Math.max(0, Math.round(crop.y)), Math.max(0, imageHeight - size));

  return { size, x, y };
}

export function createDefaultAvatarCrop(
  imageWidth: number,
  imageHeight: number,
): AvatarCropSelection {
  const size = Math.max(1, Math.min(imageWidth, imageHeight));
  return {
    size,
    x: Math.floor((imageWidth - size) / 2),
    y: Math.floor((imageHeight - size) / 2),
  };
}

export function getAvatarCropPreviewStyle(
  crop: AvatarCropSelection,
  imageWidth: number,
  imageHeight: number,
): Record<string, string> {
  const clampedCrop = clampAvatarCropSelection(crop, imageWidth, imageHeight);
  const ratio = 128 / clampedCrop.size;
  const marginLeft = Math.round(clampedCrop.x * ratio);
  const marginTop = Math.round(clampedCrop.y * ratio);

  return {
    height: `${Math.round(imageHeight * ratio)}px`,
    marginLeft: `${marginLeft === 0 ? 0 : -marginLeft}px`,
    marginTop: `${marginTop === 0 ? 0 : -marginTop}px`,
    width: `${Math.round(imageWidth * ratio)}px`,
  };
}

export function drawAvatarCropToCanvas(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  crop: AvatarCropSelection,
) {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error(WORKSPACE_AVATAR_UPLOAD_ERROR_MESSAGE);
  }

  const imageWidth = image.naturalWidth || canvas.width;
  const imageHeight = image.naturalHeight || canvas.height;
  const clampedCrop = clampAvatarCropSelection(crop, imageWidth, imageHeight);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    image,
    clampedCrop.x,
    clampedCrop.y,
    clampedCrop.size,
    clampedCrop.size,
    0,
    0,
    canvas.width,
    canvas.height,
  );
}

function blobFromCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error(WORKSPACE_AVATAR_UPLOAD_ERROR_MESSAGE));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

export function workspaceAvatarUploadErrorForMimeType(fileType: string): string | null {
  return fileType.startsWith("image/") ? null : WORKSPACE_AVATAR_ONLY_IMAGE_MESSAGE;
}

export function buildProfileUpdateInput(
  formData: FormData,
  avatarAttachmentId: string,
): ProfileUpdateInput {
  return {
    avatarAttachmentId,
    email: String(formData.get("email") ?? ""),
    name: String(formData.get("name") ?? ""),
  };
}

function appHref(runtimeConfig: RuntimeConfig, href: string): string {
  return prefixBasePath(runtimeConfig.basePath, href);
}

function legacyMessage(messages: LegacyMessageLookup | undefined, key: string) {
  return messages
    ? messages(key, { fallback: key })
    : lookupLegacyMessage(LEGACY_DEFAULT_LANGUAGE, key, { fallback: key });
}

export function WorkspaceSettingsPage(props: {
  onAddWorkspaceEmail?: (email: string) => void;
  onChangePassword?: (input: {
    loginId: string;
    oldPassword: string;
    password: string;
    retypedPassword: string;
  }) => void;
  onDeleteWorkspaceEmail?: (id: string) => void;
  onResetApiToken?: () => void;
  onResetVisitedProjects?: () => void;
  onSendWorkspaceEmailValidation?: (id: string) => void;
  onSetMainWorkspaceEmail?: (id: string) => void;
  onToggleWorkspaceNotification?: (projectId: string, eventType: string) => void;
  onUploadAvatar?: (blob: Blob, filename: string) => Promise<string>;
  onUpdateProfile?: (input: ProfileUpdateInput) => void;
  pending?: boolean;
  messages?: LegacyMessageLookup;
  runtimeConfig: RuntimeConfig;
  routeHref: string;
  csrfToken?: string;
  section: WorkspaceSettingsSection;
  workspaceOverview: WorkspaceOverviewViewModel | null;
}) {
  const session = props.workspaceOverview?.session ?? {
    defaultLandingPath: "/me",
    emailAddress: "anonymous@yona.invalid",
    isAnonymous: true,
    isConfirmed: false,
    isSiteAdmin: false,
    loginId: "anonymous",
    userLabel: "User.anonymous.name",
  };
  const apiToken = props.workspaceOverview?.apiToken ?? "";
  const emails = props.workspaceOverview?.emails ?? [];
  const watchedProjects = props.workspaceOverview?.watchedProjects ?? [];
  const profile = props.workspaceOverview?.profile ?? {
    avatarUrl: "",
    connectedSocialProviders: [],
    displayName: session.userLabel,
    englishName: "",
    isBlocked: false,
    isSiteAdmin: session.isSiteAdmin,
    loginId: session.loginId,
    primaryEmailAddress: session.emailAddress,
    sinceLabel: "",
  };
  const [avatarAttachmentId, setAvatarAttachmentId] = React.useState("");
  const [avatarErrorMessage, setAvatarErrorMessage] = React.useState<null | string>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = React.useState("");
  const [cropFilename, setCropFilename] = React.useState("avatar.png");
  const [cropImageSize, setCropImageSize] = React.useState({ height: 128, width: 128 });
  const [cropSelection, setCropSelection] = React.useState<AvatarCropSelection>({
    size: 128,
    x: 0,
    y: 0,
  });
  const [cropSourceUrl, setCropSourceUrl] = React.useState("");
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const cropCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const cropImageRef = React.useRef<HTMLImageElement | null>(null);
  const currentAvatarUrl =
    avatarPreviewUrl ||
    resolveWorkspaceAvatarUrl(
      profile.avatarUrl,
      profile.displayName || session.userLabel || session.loginId,
    );
  const isCropModalOpen = cropSourceUrl !== "";
  const cropPreviewStyle = getAvatarCropPreviewStyle(
    cropSelection,
    cropImageSize.width,
    cropImageSize.height,
  );

  const closeCropModal = React.useCallback(() => {
    setCropSourceUrl("");
  }, []);

  const onAvatarFileChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const avatarUploadError = workspaceAvatarUploadErrorForMimeType(file.type);
    if (avatarUploadError) {
      setAvatarErrorMessage(avatarUploadError);
      return;
    }

    setAvatarErrorMessage(null);
    const nextCropSourceUrl = URL.createObjectURL(file);
    setCropFilename(file.name || "avatar.png");
    setCropSourceUrl(nextCropSourceUrl);

    const image = new Image();
    image.onload = () => {
      setCropImageSize({
        height: image.naturalHeight,
        width: image.naturalWidth,
      });
      setCropSelection(createDefaultAvatarCrop(image.naturalWidth, image.naturalHeight));
    };
    image.src = nextCropSourceUrl;
  }, []);

  const uploadCroppedAvatar = React.useCallback(async () => {
    const canvas = cropCanvasRef.current;
    const image = cropImageRef.current;
    if (!canvas || !image || !props.onUploadAvatar) {
      return;
    }

    setUploadingAvatar(true);
    setAvatarErrorMessage(null);
    try {
      drawAvatarCropToCanvas(canvas, image, cropSelection);
      const blob = await blobFromCanvas(canvas);
      const nextAttachmentId = await props.onUploadAvatar(blob, cropFilename);
      setAvatarAttachmentId(nextAttachmentId);
      setAvatarPreviewUrl(URL.createObjectURL(blob));
      closeCropModal();
    } catch (error) {
      setAvatarErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : WORKSPACE_AVATAR_UPLOAD_ERROR_MESSAGE,
      );
    } finally {
      setUploadingAvatar(false);
    }
  }, [closeCropModal, cropFilename, cropSelection, props, setAvatarAttachmentId]);

  let sectionBody: React.ReactNode;
  switch (props.section) {
    case "profile":
      sectionBody = (
        <>
          <form
            action={appHref(props.runtimeConfig, "/user/edit")}
            className="pull-left"
            id="frmBasic"
            method="post"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              props.onUpdateProfile?.(buildProfileUpdateInput(formData, avatarAttachmentId));
            }}
          >
            <input name="csrfToken" type="hidden" value={props.csrfToken ?? ""} />
            <input name="avatarAttachmentId" type="hidden" value={avatarAttachmentId} />
            <dl>
              <dt>{legacyMessage(props.messages, "user.loginId")}</dt>
              <dd className="mt10">
                <input
                  className="text"
                  defaultValue={session.loginId}
                  name="loginId"
                  readOnly
                  type="text"
                />
              </dd>
              <dt>{legacyMessage(props.messages, "user.name")}</dt>
              <dd className="mt10">
                <input className="text" defaultValue={session.userLabel} name="name" type="text" />
              </dd>
              <dt>{legacyMessage(props.messages, "user.email")}</dt>
              <dd className="mt10">
                <input
                  className="text"
                  defaultValue={session.emailAddress}
                  name="email"
                  type="email"
                />
              </dd>
              <dd>
                <button className="ybtn ybtn-success" type="submit">
                  {legacyMessage(props.messages, "userinfo.editProfile")}
                </button>
              </dd>
            </dl>
          </form>
          <form
            action={appHref(props.runtimeConfig, "/user/edit")}
            className="pull-left"
            id="frmAvatar"
            method="post"
            onSubmit={(event) => {
              event.preventDefault();
            }}
            style={{ borderLeft: "1px solid #ddd", marginLeft: "50px", paddingLeft: "50px" }}
          >
            <input name="name" type="hidden" value={session.userLabel} />
            <input name="email" type="hidden" value={session.emailAddress} />
            <div className="avatar-frm">
              <div className="avatar-wrap xlarge">
                <img alt="" src={currentAvatarUrl} style={{ width: "128px", maxWidth: "none" }} />
              </div>
              <div className="upload-progress avatar" style={{ display: "none" }}>
                <div className="bar orange" />
              </div>
              <div className="btn-wrap mt10 center-txt">
                <label className="ybtn ybtn-small fake-file-wrap btnUploadAvatar">
                  {legacyMessage(props.messages, "userinfo.changeAvatar")}
                  <input
                    accept="image/*"
                    className="file"
                    id="avatarFile"
                    name="filePath"
                    onChange={onAvatarFileChange}
                    type="file"
                  />
                </label>
              </div>
              {avatarErrorMessage ? <p className="lede">{avatarErrorMessage}</p> : null}
            </div>
          </form>
          <div className="reset-user-visited-list">
            <hr />
            <form
              action={appHref(props.runtimeConfig, "/user/resetVisitedList")}
              method="post"
              onSubmit={(event) => {
                event.preventDefault();
                props.onResetVisitedProjects?.();
              }}
            >
              <button className="ybtn" type="submit">
                {legacyMessage(props.messages, "userinfo.reset.visited.project.list")}
              </button>
            </form>
          </div>
          <section
            className="modal hide"
            data-backdrop="static"
            hidden={!isCropModalOpen}
            id="avatarCropWrap"
            role="dialog"
          >
            <div className="modal-header center-txt">
              <div className="avatar-wrap xlarge">
                <img
                  alt=""
                  src={isCropModalOpen ? cropSourceUrl : undefined}
                  style={cropPreviewStyle}
                />
              </div>
            </div>
            <div className="modal-body">
              <img
                alt=""
                ref={cropImageRef}
                src={isCropModalOpen ? cropSourceUrl : undefined}
                style={{ maxWidth: "500px" }}
              />
              <label className="hide">
                <input
                  aria-label="crop-x"
                  max={Math.max(0, cropImageSize.width - cropSelection.size)}
                  min={0}
                  onChange={(event) =>
                    setCropSelection((current) =>
                      clampAvatarCropSelection(
                        {
                          ...current,
                          x: Number(event.target.value),
                        },
                        cropImageSize.width,
                        cropImageSize.height,
                      ),
                    )
                  }
                  type="range"
                  value={cropSelection.x}
                />
              </label>
              <label className="hide">
                <input
                  aria-label="crop-y"
                  max={Math.max(0, cropImageSize.height - cropSelection.size)}
                  min={0}
                  onChange={(event) =>
                    setCropSelection((current) =>
                      clampAvatarCropSelection(
                        {
                          ...current,
                          y: Number(event.target.value),
                        },
                        cropImageSize.width,
                        cropImageSize.height,
                      ),
                    )
                  }
                  type="range"
                  value={cropSelection.y}
                />
              </label>
              <label className="hide">
                <input
                  aria-label="crop-size"
                  max={Math.max(32, Math.min(cropImageSize.width, cropImageSize.height))}
                  min={32}
                  onChange={(event) =>
                    setCropSelection((current) =>
                      clampAvatarCropSelection(
                        {
                          ...current,
                          size: Number(event.target.value),
                        },
                        cropImageSize.width,
                        cropImageSize.height,
                      ),
                    )
                  }
                  type="range"
                  value={cropSelection.size}
                />
              </label>
              <canvas height={128} hidden ref={cropCanvasRef} width={128} />
            </div>
            <div className="modal-footer">
              <button className="ybtn ybtn-default" onClick={closeCropModal} type="button">
                {legacyMessage(props.messages, "button.cancel")}
              </button>
              <button
                className="ybtn ybtn-success btnSubmitCrop"
                disabled={uploadingAvatar}
                onClick={() => void uploadCroppedAvatar()}
                type="button"
              >
                {legacyMessage(props.messages, "button.save")}
              </button>
            </div>
          </section>
        </>
      );
      break;
    case "password":
      sectionBody = (
        <>
          <form
            action={appHref(props.runtimeConfig, "/user/resetPassword")}
            id="frmPassword"
            method="post"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              props.onChangePassword?.({
                loginId: String(formData.get("loginId") ?? ""),
                oldPassword: String(formData.get("oldPassword") ?? ""),
                password: String(formData.get("password") ?? ""),
                retypedPassword: String(formData.get("retypedPassword") ?? ""),
              });
            }}
          >
            <input name="loginId" type="hidden" value={session.loginId} />
            <dl>
              <dt>{legacyMessage(props.messages, "user.currentPassword")}</dt>
              <dd className="mt10">
                <input autoComplete="off" id="oldPassword" name="oldPassword" type="password" />
              </dd>
              <dt>{legacyMessage(props.messages, "user.newPassword")}</dt>
              <dd className="mt10">
                <input autoComplete="off" id="password" name="password" type="password" />
              </dd>
              <dt>{legacyMessage(props.messages, "validation.retypePassword")}</dt>
              <dd className="mt10">
                <input
                  autoComplete="off"
                  id="retypedPassword"
                  name="retypedPassword"
                  type="password"
                />
              </dd>
              <dd>
                <button className="ybtn ybtn-success" type="submit">
                  {legacyMessage(props.messages, "userinfo.changePassword")}
                </button>
              </dd>
            </dl>
          </form>
          <hr />
          <div className="mt10">
            <dl>
              <dt>{legacyMessage(props.messages, "site.resetPasswordEmail.desc")}</dt>
              <dd className="mt10">
                <a className="ybtn ybtn-fail" href={appHref(props.runtimeConfig, "/lostPassword")}>
                  {legacyMessage(props.messages, "site.resetPasswordEmail.title")}
                </a>
              </dd>
            </dl>
          </div>
        </>
      );
      break;
    case "notifications":
      sectionBody = (
        <div>
          <ul className="unstyled lst-stacked span3 mr20" id="notification-projects">
            {watchedProjects.map((project, index) => (
              <li className={index === 0 ? "active" : undefined} key={project.projectId}>
                <a data-toggle="tab" href={`#${project.projectId}`}>
                  {`${project.ownerName} / ${project.projectName}`}
                </a>
              </li>
            ))}
          </ul>
          <div className="tab-content">
            {watchedProjects.map((project, index) => (
              <div
                className={`tab-pane ${index === 0 ? "active" : ""}`}
                id={project.projectId}
                key={project.projectId}
              >
                <table className="table table-striped table-bordered">
                  <tbody>
                    {project.notifications.map((notification) => (
                      <tr key={`${project.projectId}-${notification.eventType}`}>
                        <th>{notification.label}</th>
                        <td>
                          <div className="switch" data-off-label="Off" data-on-label="On">
                            <input
                              checked={notification.enabled}
                              className="notiUpdate"
                              data-href={appHref(
                                props.runtimeConfig,
                                `/noti/toggle/${project.projectId}/${notification.eventType}`,
                              )}
                              data-toggle="switch"
                              onChange={() =>
                                props.onToggleWorkspaceNotification?.(
                                  project.projectId,
                                  notification.eventType,
                                )
                              }
                              type="checkbox"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      );
      break;
    case "emails":
      sectionBody = (
        <>
          <form
            action={appHref(props.runtimeConfig, "/user/email")}
            className="form-inline inner-bubble"
            method="post"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              props.onAddWorkspaceEmail?.(String(formData.get("email") ?? ""));
            }}
          >
            <input name="csrfToken" type="hidden" value={props.csrfToken ?? ""} />
            <input
              className="text uname"
              name="email"
              placeholder={legacyMessage(props.messages, "user.email.new")}
              type="text"
            />
            <button className="ybtn ybtn-success" type="submit">
              {legacyMessage(props.messages, "button.add")}
            </button>
          </form>
          <hr />
          <p>
            {legacyMessage(props.messages, "emails.main.email.descr")}
            <br />
            {legacyMessage(props.messages, "emails.sub.email.descr")}
          </p>
          <table className="table mt20">
            <tbody>
              <tr>
                <td>
                  <img alt="" height={40} src={currentAvatarUrl} width={40} />
                  <strong className="ml10">{session.emailAddress}</strong>
                  <span className="label-head vmiddle ml10">
                    {legacyMessage(props.messages, "emails.main.email")}
                  </span>
                </td>
                <td style={{ textAlign: "right" }} />
              </tr>
              {emails.map((email) => (
                <tr key={email.id}>
                  <td>
                    <img
                      alt=""
                      height={40}
                      src={resolveWorkspaceAvatarUrl("", email.emailAddress)}
                      width={40}
                    />
                    <span className="ml10">{email.emailAddress}</span>
                  </td>
                  <td style={{ textAlign: "right", verticalAlign: "middle" }}>
                    <button
                      className="ybtn ybtn-small ybtn-danger"
                      data-request-method="delete"
                      data-request-uri={appHref(
                        props.runtimeConfig,
                        `/user/email/delete/${email.id}`,
                      )}
                      onClick={() => props.onDeleteWorkspaceEmail?.(email.id)}
                      type="button"
                    >
                      {legacyMessage(props.messages, "button.delete")}
                    </button>
                    {email.valid ? (
                      <button
                        className="ybtn ybtn-small"
                        data-request-method="put"
                        data-request-uri={appHref(
                          props.runtimeConfig,
                          `/user/email/setAsMain/${email.id}`,
                        )}
                        onClick={() => props.onSetMainWorkspaceEmail?.(email.id)}
                        style={{ width: "150px" }}
                        type="button"
                      >
                        {legacyMessage(props.messages, "emails.set.as.main")}
                      </button>
                    ) : (
                      <button
                        className="ybtn ybtn-small"
                        data-request-method="post"
                        data-request-uri={appHref(
                          props.runtimeConfig,
                          `/user/email/sendValidationEmail/${email.id}`,
                        )}
                        onClick={() => props.onSendWorkspaceEmailValidation?.(email.id)}
                        style={{ width: "150px" }}
                        type="button"
                      >
                        <i
                          className="yobicon-error2 orange-txt mr5"
                          style={{ verticalAlign: "bottom" }}
                        />
                        {legacyMessage(props.messages, "emails.send.validatino.mail")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      );
      break;
    case "token":
      sectionBody = (
        <div className="token-generate">
          <form
            action={appHref(props.runtimeConfig, "/user/editform/token_reset")}
            className="pull-left"
            id="frmBasic"
            method="post"
            onSubmit={(event) => {
              event.preventDefault();
              props.onResetApiToken?.();
            }}
            style={{ width: "100%" }}
          >
            <input name="csrfToken" type="hidden" value={props.csrfToken ?? ""} />
            <div>{legacyMessage(props.messages, "userinfo.token")}</div>
            <div>
              <input
                className="text"
                name="name"
                onClick={(event) =>
                  event.currentTarget.setSelectionRange(0, event.currentTarget.value.length)
                }
                readOnly
                size={45}
                style={{ width: "90%" }}
                type="text"
                value={apiToken}
              />
            </div>
            <div>
              <button className="ybtn ybtn-success" type="submit">
                {legacyMessage(props.messages, "userinfo.recreateToken")}
              </button>
            </div>
          </form>
        </div>
      );
      break;
  }

  return (
    <main className="app-shell">
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>
            {legacyMessage(
              props.messages,
              props.section === "token" ? "userinfo.token" : "userinfo.accountSetting",
            )}
          </h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="page-wrap">
          <ul className="nav nav-tabs mt20">
            {WORKSPACE_SETTINGS_TABS.map((tab) => (
              <li
                className={props.section === tab.section ? "active" : undefined}
                key={tab.section}
              >
                <a href={appHref(props.runtimeConfig, tab.href)}>
                  {legacyMessage(props.messages, tab.label)}
                </a>
              </li>
            ))}
          </ul>
          {sectionBody}
        </div>
      </div>
    </main>
  );
}
