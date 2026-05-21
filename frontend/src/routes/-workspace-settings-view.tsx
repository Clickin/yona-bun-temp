import * as React from "react";
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
    throw new Error("Canvas 2D context is not available.");
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
        reject(new Error("Avatar crop failed."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
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

function readSearchParams(href: string): URLSearchParams {
  return new URL(href, "http://yona.local").searchParams;
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
  onSetMainWorkspaceEmail?: (id: string) => void;
  onToggleWorkspaceNotification?: (projectId: string, eventType: string) => void;
  onUploadAvatar?: (blob: Blob, filename: string) => Promise<string>;
  onUpdateProfile?: (input: ProfileUpdateInput) => void;
  pending?: boolean;
  runtimeConfig: RuntimeConfig;
  routeHref: string;
  csrfToken?: string;
  section: WorkspaceSettingsSection;
  workspaceOverview: WorkspaceOverviewViewModel | null;
}) {
  const searchParams = readSearchParams(props.routeHref);
  const session = props.workspaceOverview?.session ?? {
    defaultLandingPath: "/me",
    emailAddress: "anonymous@yona.invalid",
    isAnonymous: true,
    isConfirmed: false,
    isSiteAdmin: false,
    loginId: "anonymous",
    userLabel: "Anonymous",
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
    if (!file.type.startsWith("image/")) {
      setAvatarErrorMessage("Only image files are allowed to be uploaded.");
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
      setAvatarErrorMessage(error instanceof Error ? error.message : "Avatar upload failed.");
    } finally {
      setUploadingAvatar(false);
    }
  }, [closeCropModal, cropFilename, cropSelection, props, setAvatarAttachmentId]);

  let sectionBody: React.ReactNode;
  switch (props.section) {
    case "profile":
      sectionBody = (
        <>
          <section className="runtime-grid">
            <div className="avatar-frm">
              <div className="avatar-wrap xlarge">
                <img
                  alt={`${session.loginId} avatar`}
                  src={currentAvatarUrl}
                  style={{ width: "128px", maxWidth: "none" }}
                />
              </div>
              <div className="btn-wrap mt10 center-txt">
                <label className="ybtn ybtn-small btnUploadAvatar">
                  Change avatar
                  <input
                    accept="image/*"
                    className="file"
                    hidden
                    onChange={onAvatarFileChange}
                    type="file"
                  />
                </label>
              </div>
              {avatarErrorMessage ? <p className="lede">{avatarErrorMessage}</p> : null}
            </div>
          </section>
          <form
            action={appHref(props.runtimeConfig, "/user/edit")}
            className="runtime-grid"
            method="post"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              props.onUpdateProfile?.(buildProfileUpdateInput(formData, avatarAttachmentId));
            }}
          >
            <input name="csrfToken" type="hidden" value={props.csrfToken ?? ""} />
            <input name="avatarAttachmentId" type="hidden" value={avatarAttachmentId} />
            <label>
              <span>Login ID</span>
              <input defaultValue={session.loginId} name="loginId" readOnly type="text" />
            </label>
            <label>
              <span>Name</span>
              <input defaultValue={session.userLabel} name="name" type="text" />
            </label>
            <label>
              <span>Email</span>
              <input defaultValue={session.emailAddress} name="email" type="email" />
            </label>
            <button type="submit">{props.pending ? "Saving…" : "Edit Profile"}</button>
          </form>
          <section className="modal" hidden={!isCropModalOpen}>
            <div className="modal-header center-txt">
              <h2>Crop Avatar</h2>
              <div className="avatar-wrap xlarge">
                <img alt="Avatar crop preview" src={cropSourceUrl} style={cropPreviewStyle} />
              </div>
            </div>
            <div className="modal-body runtime-grid">
              <img
                alt="Avatar crop source"
                ref={cropImageRef}
                src={cropSourceUrl}
                style={{ maxWidth: "500px" }}
              />
              <label>
                <span>Crop X</span>
                <input
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
              <label>
                <span>Crop Y</span>
                <input
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
              <label>
                <span>Crop Size</span>
                <input
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
              <button onClick={closeCropModal} type="button">
                Cancel
              </button>
              <button
                disabled={uploadingAvatar}
                onClick={() => void uploadCroppedAvatar()}
                type="button"
              >
                {uploadingAvatar ? "Saving…" : "Save"}
              </button>
            </div>
          </section>
          <form
            action={appHref(props.runtimeConfig, "/user/resetVisitedList")}
            method="post"
            onSubmit={(event) => {
              event.preventDefault();
              props.onResetVisitedProjects?.();
            }}
          >
            <button type="submit">Reset visited project list</button>
          </form>
        </>
      );
      break;
    case "password":
      sectionBody = (
        <form
          action={appHref(props.runtimeConfig, "/user/resetPassword")}
          className="runtime-grid"
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
          <label>
            <span>Current Password</span>
            <input name="oldPassword" type="password" />
          </label>
          <label>
            <span>New Password</span>
            <input name="password" type="password" />
          </label>
          <label>
            <span>Retype password</span>
            <input name="retypedPassword" type="password" />
          </label>
          <button type="submit">{props.pending ? "Saving…" : "Change Password"}</button>
          <a href={appHref(props.runtimeConfig, "/lostPassword")}>Reset password by email</a>
        </form>
      );
      break;
    case "notifications":
      sectionBody = (
        <section className="runtime-grid">
          <div>
            <strong>Watched Projects</strong>
          </div>
          {watchedProjects.length === 0 ? (
            <p>No watched projects yet.</p>
          ) : (
            <>
              <ul className="unstyled lst-stacked span3 mr20" id="notification-projects">
                {watchedProjects.map((project, index) => (
                  <li className={index === 0 ? "active" : undefined} key={project.projectId}>
                    <a href={`#${project.projectId}`}>
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
            </>
          )}
        </section>
      );
      break;
    case "emails":
      sectionBody = (
        <section className="runtime-grid">
          <form
            action={appHref(props.runtimeConfig, "/user/email")}
            className="runtime-grid"
            method="post"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              props.onAddWorkspaceEmail?.(String(formData.get("email") ?? ""));
            }}
          >
            <input name="csrfToken" type="hidden" value={props.csrfToken ?? ""} />
            <label>
              <span>Email</span>
              <input name="email" placeholder="New email" type="email" />
            </label>
            <button type="submit">Add</button>
          </form>
          <p>
            Main email receives account mail.
            <br />
            Sub emails can be promoted after validation.
          </p>
          {searchParams.get("validation") === "sent" ? (
            <p className="lede">Validation request was accepted.</p>
          ) : null}
          {searchParams.get("validation") === "error" ? (
            <p className="lede">Validation request failed.</p>
          ) : null}
          {searchParams.get("confirmed") === "1" ? (
            <p className="lede">Email address was confirmed.</p>
          ) : null}
          {searchParams.get("confirmed") === "invalid" ? (
            <p className="lede">Invalid email confirmation link.</p>
          ) : null}
          <div>
            <strong>Main Email</strong>
            <p>{session.emailAddress}</p>
          </div>
          {emails.map((email) => (
            <div className="runtime-grid" key={email.id}>
              <strong>{email.emailAddress}</strong>
              <div>
                <button
                  data-request-method="delete"
                  data-request-uri={appHref(props.runtimeConfig, `/user/email/delete/${email.id}`)}
                  onClick={() => props.onDeleteWorkspaceEmail?.(email.id)}
                  type="button"
                >
                  Delete
                </button>
                {email.valid ? (
                  <button
                    data-request-method="put"
                    onClick={() => props.onSetMainWorkspaceEmail?.(email.id)}
                    type="button"
                  >
                    Set as main
                  </button>
                ) : (
                  <div className="runtime-grid">
                    <span>Validation required</span>
                    <form
                      action={appHref(
                        props.runtimeConfig,
                        `/user/email/sendValidationEmail/${email.id}`,
                      )}
                      method="post"
                    >
                      <input name="csrfToken" type="hidden" value={props.csrfToken ?? ""} />
                      <button type="submit">Send validation mail</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          ))}
        </section>
      );
      break;
    case "token":
      sectionBody = (
        <form
          action={appHref(props.runtimeConfig, "/user/editform/token_reset")}
          className="runtime-grid"
          method="post"
          onSubmit={(event) => {
            event.preventDefault();
            props.onResetApiToken?.();
          }}
        >
          <label>
            <span>Token</span>
            <input name="name" readOnly type="text" value={apiToken} />
          </label>
          <button type="submit">Recreate Token</button>
        </form>
      );
      break;
  }

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Workspace</p>
      <h1>Account Settings</h1>
      <ul className="nav nav-tabs">
        <li>
          <a href={appHref(props.runtimeConfig, "/user/editform")}>Edit Profile</a>
        </li>
        <li>
          <a href={appHref(props.runtimeConfig, "/user/editform/password")}>Change Password</a>
        </li>
        <li>
          <a href={appHref(props.runtimeConfig, "/user/editform/notifications")}>Notifications</a>
        </li>
        <li>
          <a href={appHref(props.runtimeConfig, "/user/editform/emails")}>Emails</a>
        </li>
        <li>
          <a href={appHref(props.runtimeConfig, "/user/editform/token")}>Token</a>
        </li>
      </ul>
      {sectionBody}
    </main>
  );
}
