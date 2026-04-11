import * as React from "react";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import type { WorkspaceOverviewViewModel } from "./-view-models";

export type WorkspaceSettingsSection =
  | "emails"
  | "notifications"
  | "password"
  | "profile"
  | "token";

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
  onUpdateProfile?: (input: { email: string; name: string }) => void;
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

  let sectionBody: React.ReactNode;
  switch (props.section) {
    case "profile":
      sectionBody = (
        <>
          <form
            action={appHref(props.runtimeConfig, "/user/edit")}
            className="runtime-grid"
            method="post"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              props.onUpdateProfile?.({
                email: String(formData.get("email") ?? ""),
                name: String(formData.get("name") ?? ""),
              });
            }}
          >
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
            <button type="submit">{props.pending ? "Saving..." : "Edit Profile"}</button>
          </form>
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
          <button type="submit">{props.pending ? "Saving..." : "Change Password"}</button>
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
                  data-request-uri={appHref(
                    props.runtimeConfig,
                    `/user/email/delete/${email.id}`,
                  )}
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
          <a href={appHref(props.runtimeConfig, "/user/editform/password")}>
            Change Password
          </a>
        </li>
        <li>
          <a href={appHref(props.runtimeConfig, "/user/editform/notifications")}>
            Notifications
          </a>
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
