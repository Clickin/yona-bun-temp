import * as React from "react";
import { resolveCurrentPath, type AppRoute } from "./auth-workspace-client";
import { prefixBasePath, type RuntimeConfig } from "./runtime-config";

export interface WorkspaceOverviewViewModel {
  apiToken?: string;
  defaultLandingPath: string;
  emails?: Array<{ emailAddress: string; id: string; valid: boolean }>;
  favoriteProjects: Array<{ ownerName: string; projectName: string }>;
  recentProjects: Array<{ ownerName: string; projectName: string }>;
  watchedProjects?: Array<{
    notifications: Array<{ enabled: boolean; eventType: string; label: string }>;
    ownerName: string;
    projectId: string;
    projectName: string;
  }>;
  session: {
    defaultLandingPath: string;
    emailAddress: string;
    isAnonymous: boolean;
    isConfirmed: boolean;
    isSiteAdmin: boolean;
    loginId: string;
    userLabel: string;
  };
}

export interface OrganizationDetailViewModel {
  description: string;
  organizationName: string;
  viewerCanUpdate: boolean;
}

export interface OrganizationMembersViewModel {
  enrollmentRequests: Array<{ loginId: string; userLabel: string }>;
  members: Array<{ loginId: string; role: string; userLabel: string }>;
}

export interface ProjectDetailViewModel {
  enrollmentRequested: boolean;
  isFavorited: boolean;
  organizationName: string;
  overview: string;
  ownerName: string;
  projectName: string;
  projectScope: string;
  viewerCanEnroll: boolean;
  viewerCanUpdate: boolean;
}

export interface ProjectMembersViewModel {
  enrollmentRequests: Array<{ loginId: string; userLabel: string }>;
  members: Array<{ loginId: string; role: string; userLabel: string }>;
}

export interface AuthUiCapabilitiesViewModel {
  emailVerificationEnabled: boolean;
  signupRequireConfirm: boolean;
  socialLoginOnly: boolean;
}

export interface ProjectDirectoryViewModel {
  items: Array<{
    ownerName: string;
    overview: string;
    projectName: string;
    projectScope: string;
  }>;
}

export interface OrganizationDirectoryViewModel {
  items: Array<{
    description: string;
    organizationName: string;
  }>;
}

export interface AuthWorkspaceShellProps {
  bootstrapping?: boolean;
  route: AppRoute;
  runtimeConfig: RuntimeConfig;
  authUiCapabilities?: AuthUiCapabilitiesViewModel | null;
  workspaceOverview: WorkspaceOverviewViewModel | null;
  organizationDirectory?: OrganizationDirectoryViewModel | null;
  organizationDetail?: OrganizationDetailViewModel | null;
  organizationMembers?: OrganizationMembersViewModel | null;
  projectDirectory?: ProjectDirectoryViewModel | null;
  projectDetail?: ProjectDetailViewModel | null;
  projectMembers?: ProjectMembersViewModel | null;
  errorMessage?: null | string;
  onRegister?: (input: {
    emailAddress: string;
    loginId: string;
    name: string;
    password: string;
    retypedPassword: string;
  }) => void;
  onUpdateProfile?: (input: { email: string; name: string }) => void;
  onChangePassword?: (input: {
    loginId: string;
    oldPassword: string;
    password: string;
    retypedPassword: string;
  }) => void;
  onResetVisitedProjects?: () => void;
  onAddWorkspaceEmail?: (email: string) => void;
  onDeleteWorkspaceEmail?: (id: string) => void;
  onSendWorkspaceEmailValidation?: (id: string) => void;
  onSetMainWorkspaceEmail?: (id: string) => void;
  onResetApiToken?: () => void;
  onToggleWorkspaceNotification?: (projectId: string, eventType: string) => void;
  onSetDefaultLandingPath?: (path: string) => void;
  onSignIn?: (input: {
    identifier: string;
    password: string;
    rememberMe: boolean;
  }) => void;
  onSignOut?: () => void;
  onCreateOrganization?: (input: { description: string; organizationName: string }) => void;
  onUpdateOrganization?: (input: {
    currentOrganizationName: string;
    description: string;
    organizationName: string;
  }) => void;
  onCreateProject?: (input: {
    ownerName: string;
    overview: string;
    projectName: string;
    projectScope: string;
  }) => void;
  onUpdateProject?: (input: {
    currentOwnerName: string;
    currentProjectName: string;
    ownerName: string;
    overview: string;
    projectName: string;
    projectScope: string;
  }) => void;
  onEnrollProject?: (ownerName: string, projectName: string) => void;
  onCancelEnrollProject?: (ownerName: string, projectName: string) => void;
  onToggleFavoriteProject?: (ownerName: string, projectName: string) => void;
  pending?: boolean;
}

export function resolvePostAuthHref(
  redirectPath: null | string | undefined,
  savedDefaultLandingPath: null | string | undefined,
): string {
  return redirectPath ?? savedDefaultLandingPath ?? "/me";
}

export function resolveAuthRedirectPath(
  searchParams: URLSearchParams | null | undefined,
): null | string {
  if (!searchParams) {
    return null;
  }

  const candidate = searchParams.get("redirectUrl") ?? searchParams.get("redirect");
  if (!candidate) {
    return null;
  }

  const trimmed = candidate.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  return resolveCurrentPath(trimmed).kind === "external" ? null : trimmed;
}

function readSearchParams(href: string): URLSearchParams {
  return new URL(href, "http://yona.local").searchParams;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function buildProjectsHref(filter: string, pageNum: number): string {
  const params = new URLSearchParams();
  if (filter.trim() !== "") {
    params.set("filter", filter.trim());
  }
  params.set("pageNum", String(pageNum));
  const query = params.toString();
  return query ? `/projects?${query}` : "/projects";
}

function buildOrganizationsHref(filter: string, pageNum: number): string {
  const params = new URLSearchParams();
  if (filter.trim() !== "") {
    params.set("filter", filter.trim());
  }
  params.set("pageNum", String(pageNum));
  return `/orgs?${params.toString()}`;
}

function getPaginationWindow(currentPageNum: number, totalPageCount: number) {
  const paginationWindow = 5;
  if (totalPageCount <= paginationWindow) {
    return Array.from({ length: totalPageCount }, (_, index) => index + 1);
  }

  let start = Math.max(1, currentPageNum - Math.floor(paginationWindow / 2));
  let end = start + paginationWindow - 1;

  if (end > totalPageCount) {
    end = totalPageCount;
    start = end - paginationWindow + 1;
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function appHref(runtimeConfig: RuntimeConfig, href: string): string {
  return prefixBasePath(runtimeConfig.basePath, href);
}

function requiresAuthenticatedSession(route: AppRoute): boolean {
  switch (route.kind) {
    case "me":
    case "workspace-settings":
    case "organization-new":
    case "organization-settings":
    case "project-new":
    case "project-settings":
      return true;
    default:
      return false;
  }
}

function Section({
  title,
  children,
}: React.PropsWithChildren<{ title: string }>) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function LoginShell({
  authUiCapabilities,
  onSignIn,
  pending,
  routeHref,
  runtimeConfig,
}: {
  authUiCapabilities?: AuthUiCapabilitiesViewModel | null;
  onSignIn?: AuthWorkspaceShellProps["onSignIn"];
  pending?: boolean;
  routeHref: string;
  runtimeConfig: RuntimeConfig;
}) {
  const [formState, setFormState] = React.useState({
    identifier: "",
    password: "",
    rememberMe: true,
  });
  const redirectUrl = resolveAuthRedirectPath(readSearchParams(routeHref));
  const canRenderLocalForm = authUiCapabilities !== null && !authUiCapabilities?.socialLoginOnly;

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Auth</p>
      <h1>Login for Yona</h1>
      <p className="lede">All-in-one software development platform.</p>
      {authUiCapabilities?.emailVerificationEnabled ? (
        <p className="lede">Confirmation mail will be sent.</p>
      ) : null}
      {authUiCapabilities?.socialLoginOnly ? (
        <p className="lede">Social login only</p>
      ) : null}
      {canRenderLocalForm ? (
        <>
          <form
            action={appHref(runtimeConfig, "/users/login")}
            className="runtime-grid"
            method="post"
            onSubmit={(event) => {
              event.preventDefault();
              onSignIn?.(formState);
            }}
          >
            <label>
              <span>Login ID or email</span>
              <input
                autoComplete="off"
                name="loginIdOrEmail"
                onChange={(event) =>
                  setFormState((current) => ({ ...current, identifier: event.target.value }))
                }
                placeholder="Login ID or email"
                type="text"
              value={formState.identifier}
            />
            </label>
            <input name="redirectUrl" type="hidden" value={redirectUrl ?? ""} />
            <label>
              <span>Password</span>
              <input
                name="password"
                onChange={(event) =>
                  setFormState((current) => ({ ...current, password: event.target.value }))
                }
                type="password"
                value={formState.password}
              />
            </label>
            <label>
              <input
                checked={formState.rememberMe}
                name="rememberMe"
                onChange={(event) =>
                  setFormState((current) => ({ ...current, rememberMe: event.target.checked }))
                }
                type="checkbox"
              />
              <span>Remember me</span>
            </label>
            <button type="submit">{pending ? "Logging in..." : "Login"}</button>
          </form>
          <div className="runtime-grid">
            <div>
              <a href={appHref(runtimeConfig, "/lostPassword")}>Forgot password</a>
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}

function RegisterShell({
  authUiCapabilities,
  onRegister,
  pending,
  runtimeConfig,
}: {
  authUiCapabilities?: AuthUiCapabilitiesViewModel | null;
  onRegister?: AuthWorkspaceShellProps["onRegister"];
  pending?: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const [formState, setFormState] = React.useState({
    emailAddress: "",
    loginId: "",
    name: "",
    password: "",
    retypedPassword: "",
  });

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Auth</p>
      <h1>Sign Up for Yona</h1>
      {authUiCapabilities?.signupRequireConfirm ? (
        <p className="lede">Sign up requires confirmation.</p>
      ) : null}
      {authUiCapabilities?.socialLoginOnly ? (
        <p className="lede">Social login only</p>
      ) : null}
      {authUiCapabilities !== null && !authUiCapabilities?.socialLoginOnly ? (
        <>
          <form
            action={appHref(runtimeConfig, "/users/signup")}
            className="runtime-grid"
            method="post"
            onSubmit={(event) => {
              event.preventDefault();
              onRegister?.(formState);
            }}
          >
            <label><span>Login ID</span><input name="loginId" type="text" value={formState.loginId} onChange={(event) => setFormState((current) => ({ ...current, loginId: event.target.value }))} /></label>
            <label><span>Name</span><input name="name" type="text" value={formState.name} onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))} /></label>
            <label><span>Email</span><input name="emailAddress" type="email" value={formState.emailAddress} onChange={(event) => setFormState((current) => ({ ...current, emailAddress: event.target.value }))} /></label>
            <label><span>Password</span><input name="password" type="password" value={formState.password} onChange={(event) => setFormState((current) => ({ ...current, password: event.target.value }))} /></label>
            <label><span>Retype password</span><input name="retypedPassword" type="password" value={formState.retypedPassword} onChange={(event) => setFormState((current) => ({ ...current, retypedPassword: event.target.value }))} /></label>
            <button type="submit">{pending ? "Signing up..." : "Sign up"}</button>
          </form>
          <p className="lede">
            Already signed up? <a className="go-login" href={appHref(runtimeConfig, "/users/loginform")}>Login</a>
          </p>
        </>
      ) : null}
    </main>
  );
}

function HomeShell({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Frontend</p>
      <h1>Legacy Route Foundation</h1>
      <p className="lede">
        Wave 0 restores the public entry points and canonical auth paths on the Rust route table.
      </p>
      <div className="runtime-grid">
        <div><a href={appHref(runtimeConfig, "/users/loginform")}>Login</a></div>
        <div><a href={appHref(runtimeConfig, "/users/signupform")}>Sign up</a></div>
        <div><a href={appHref(runtimeConfig, "/lostPassword")}>Forgot password</a></div>
        <div><a href={appHref(runtimeConfig, "/resetPassword")}>Reset password</a></div>
        <div><a href={appHref(runtimeConfig, "/projects")}>Project List</a></div>
        <div><a href={appHref(runtimeConfig, "/orgs")}>Organization List</a></div>
        <div><a href={appHref(runtimeConfig, "/search?pageSize=20&scope=global")}>Search</a></div>
      </div>
    </main>
  );
}

function LostPasswordShell({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Auth</p>
      <h1>Reset Password for Yona</h1>
      <form action={appHref(runtimeConfig, "/lostPassword")} className="runtime-grid" method="post">
        <label>
          <span>Login ID</span>
          <input name="loginId" type="text" />
        </label>
        <label>
          <span>Email</span>
          <input name="emailAddress" type="email" />
        </label>
        <button type="submit">Confirm</button>
      </form>
    </main>
  );
}

function ResetPasswordShell({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Auth</p>
      <h1>Reset Password for Yona</h1>
      <form action={appHref(runtimeConfig, "/resetPassword")} className="runtime-grid" method="post">
        <label>
          <span>Password</span>
          <input name="password" type="password" />
        </label>
        <label>
          <span>Retype password</span>
          <input name="retypedPassword" type="password" />
        </label>
        <button type="submit">Confirm</button>
      </form>
    </main>
  );
}

function WorkspaceShell(props: {
  pending?: boolean;
  runtimeConfig: RuntimeConfig;
  workspaceOverview: WorkspaceOverviewViewModel | null;
  onSetDefaultLandingPath?: (path: string) => void;
  onSignOut?: () => void;
}) {
  const session = props.workspaceOverview?.session ?? {
    defaultLandingPath: "/me",
    emailAddress: "anonymous@yona.invalid",
    isAnonymous: true,
    isConfirmed: false,
    isSiteAdmin: false,
    loginId: "anonymous",
    userLabel: "Anonymous",
  };
  const emails = props.workspaceOverview?.emails ?? [];
  const defaultLandingPath = props.workspaceOverview?.defaultLandingPath ?? "/me";
  const favoriteProjects = props.workspaceOverview?.favoriteProjects ?? [];
  const recentProjects = props.workspaceOverview?.recentProjects ?? [];
  const watchedProjects = props.workspaceOverview?.watchedProjects ?? [];
  const [nextDefaultLandingPath, setNextDefaultLandingPath] = React.useState(defaultLandingPath);

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Workspace</p>
      <h1>{session.userLabel || session.loginId}</h1>
      {session.isSiteAdmin ? <p className="lede">SITE ADMIN</p> : null}
      <ul className="nav nav-tabs">
        <li><a href="#issues">Issues</a></li>
        <li><a href="#pullRequests">Pull Requests</a></li>
        <li><a href="#projects">Projects</a></li>
      </ul>
      <ul className="nav nav-tabs">
        <li><a href={appHref(props.runtimeConfig, "/user/editform")}>Edit Profile</a></li>
        <li><a href={appHref(props.runtimeConfig, "/user/editform/password")}>Change Password</a></li>
        <li><a href={appHref(props.runtimeConfig, "/user/editform/notifications")}>Notifications</a></li>
        <li><a href={appHref(props.runtimeConfig, "/user/editform/emails")}>Emails</a></li>
        <li><a href={appHref(props.runtimeConfig, "/user/editform/token")}>Token</a></li>
      </ul>
      <dl className="runtime-grid">
        <div><dt>loginId</dt><dd>{session.loginId}</dd></div>
        <div><dt>email</dt><dd>{session.emailAddress}</dd></div>
        <div><dt>default landing</dt><dd>{defaultLandingPath}</dd></div>
        <div><dt>basePath</dt><dd>{props.runtimeConfig.basePath}</dd></div>
        <div><dt>linked emails</dt><dd>{emails.length}</dd></div>
        <div><dt>watched projects</dt><dd>{watchedProjects.length}</dd></div>
      </dl>
      <Section title="Default landing">
        <form
          className="runtime-grid"
          onSubmit={(event) => {
            event.preventDefault();
            props.onSetDefaultLandingPath?.(nextDefaultLandingPath);
          }}
        >
          <label>
            <span>Path</span>
            <input
              name="defaultLandingPath"
              onChange={(event) => setNextDefaultLandingPath(event.target.value)}
              type="text"
              value={nextDefaultLandingPath}
            />
          </label>
          <button type="submit">{props.pending ? "Saving..." : "Save default landing"}</button>
        </form>
      </Section>
      <Section title="Favorite projects">
        {favoriteProjects.length === 0 ? <p>No favorite projects yet.</p> : <ul>{favoriteProjects.map((project) => <li key={`${project.ownerName}/${project.projectName}`}>{`${project.ownerName}/${project.projectName}`}</li>)}</ul>}
      </Section>
      <Section title="Recent projects">
        {recentProjects.length === 0 ? <p>No recent projects yet.</p> : <ul>{recentProjects.map((project) => <li key={`${project.ownerName}/${project.projectName}`}>{`${project.ownerName}/${project.projectName}`}</li>)}</ul>}
      </Section>
      <button onClick={() => props.onSignOut?.()} type="button">Sign out</button>
    </main>
  );
}

function WorkspaceSettingsShell(props: {
  onAddWorkspaceEmail?: AuthWorkspaceShellProps["onAddWorkspaceEmail"];
  onChangePassword?: AuthWorkspaceShellProps["onChangePassword"];
  onDeleteWorkspaceEmail?: AuthWorkspaceShellProps["onDeleteWorkspaceEmail"];
  onResetApiToken?: AuthWorkspaceShellProps["onResetApiToken"];
  onResetVisitedProjects?: AuthWorkspaceShellProps["onResetVisitedProjects"];
  onSendWorkspaceEmailValidation?: AuthWorkspaceShellProps["onSendWorkspaceEmailValidation"];
  onSetMainWorkspaceEmail?: AuthWorkspaceShellProps["onSetMainWorkspaceEmail"];
  onToggleWorkspaceNotification?: AuthWorkspaceShellProps["onToggleWorkspaceNotification"];
  onUpdateProfile?: AuthWorkspaceShellProps["onUpdateProfile"];
  pending?: boolean;
  runtimeConfig: RuntimeConfig;
  section: "emails" | "notifications" | "password" | "profile" | "token";
  workspaceOverview: WorkspaceOverviewViewModel | null;
}) {
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
          <label><span>Current Password</span><input name="oldPassword" type="password" /></label>
          <label><span>New Password</span><input name="password" type="password" /></label>
          <label><span>Retype password</span><input name="retypedPassword" type="password" /></label>
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
                    <a href={`#${project.projectId}`}>{`${project.ownerName} / ${project.projectName}`}</a>
                  </li>
                ))}
              </ul>
              <div className="tab-content">
                {watchedProjects.map((project, index) => (
                  <div className={`tab-pane ${index === 0 ? "active" : ""}`} id={project.projectId} key={project.projectId}>
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
                  <span>Validation required</span>
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
        <li><a href={appHref(props.runtimeConfig, "/user/editform")}>Edit Profile</a></li>
        <li><a href={appHref(props.runtimeConfig, "/user/editform/password")}>Change Password</a></li>
        <li><a href={appHref(props.runtimeConfig, "/user/editform/notifications")}>Notifications</a></li>
        <li><a href={appHref(props.runtimeConfig, "/user/editform/emails")}>Emails</a></li>
        <li><a href={appHref(props.runtimeConfig, "/user/editform/token")}>Token</a></li>
      </ul>
      {sectionBody}
    </main>
  );
}

function ProjectDirectoryShell(props: {
  directory: ProjectDirectoryViewModel | null | undefined;
  href: string;
  runtimeConfig: RuntimeConfig;
}) {
  const params = readSearchParams(props.href);
  const filter = (params.get("filter") ?? "").trim().toLowerCase();
  const pageNum = parsePositiveInt(params.get("pageNum"), 1);
  const filtered = (props.directory?.items ?? []).filter((project) => {
    if (filter === "") {
      return true;
    }

    const haystack = [project.ownerName, project.projectName, project.overview]
      .join(" ")
      .toLowerCase();
    return haystack.includes(filter);
  });
  const pageSize = 10;
  const totalPageCount = filtered.length === 0 ? 0 : Math.ceil(filtered.length / pageSize);
  const currentPageNum = totalPageCount === 0 ? 1 : Math.min(pageNum, totalPageCount);
  const visibleProjects = filtered.slice(
    (currentPageNum - 1) * pageSize,
    (currentPageNum - 1) * pageSize + pageSize,
  );
  const pageNumbers = getPaginationWindow(currentPageNum, totalPageCount);

  return (
    <>
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <div className="title_area">
            <ul className="nav nav-tabs">
              <li className="active"><a href={appHref(props.runtimeConfig, "/projects")}>Project List</a></li>
              <li><a href={appHref(props.runtimeConfig, "/orgs")}>Organization List</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="search-wrap">
            <div className="pull-left" id="search">
              <form action={appHref(props.runtimeConfig, "/projects")} method="get">
                <div className="search-bar">
                  <input className="textbox" defaultValue={params.get("filter") ?? ""} name="filter" type="search" />
                  <button className="search-btn" type="submit">Search</button>
                </div>
              </form>
            </div>
          </div>
          {visibleProjects.length === 0 ? (
            <div className="error-wrap">
              <p>No public projects found.</p>
            </div>
          ) : (
            <>
              <ul className="all-projects">
                {visibleProjects.map((project) => (
                  <li className="project" key={`${project.ownerName}/${project.projectName}`}>
                    <div className="info-wrap">
                      <div className="project-main-copy">
                        <div className="header">
                          <a
                            className="black"
                            href={appHref(
                              props.runtimeConfig,
                              `/${project.ownerName}/${project.projectName}`,
                            )}
                          >
                            {project.projectName}
                          </a>
                        </div>
                        <div className="desc">{project.overview || "No overview yet."}</div>
                        <p className="name-tag">by {project.ownerName}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {totalPageCount > 1 ? (
                <nav className="directory-pagination legacy-directory-pagination" id="pagination">
                  {currentPageNum > 1 ? (
                    <a className="nav-pill" href={buildProjectsHref(params.get("filter") ?? "", currentPageNum - 1)}>Prev</a>
                  ) : (
                    <span className="nav-pill is-disabled">Prev</span>
                  )}
                  {pageNumbers.map((nextPageNum) =>
                    nextPageNum === currentPageNum ? (
                      <span className="nav-pill active" key={nextPageNum}>{nextPageNum}</span>
                    ) : (
                      <a className="nav-pill" href={buildProjectsHref(params.get("filter") ?? "", nextPageNum)} key={nextPageNum}>{nextPageNum}</a>
                    ),
                  )}
                  {currentPageNum < totalPageCount ? (
                    <a className="nav-pill" href={buildProjectsHref(params.get("filter") ?? "", currentPageNum + 1)}>Next</a>
                  ) : (
                    <span className="nav-pill is-disabled">Next</span>
                  )}
                </nav>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function OrganizationDirectoryShell(props: {
  directory: OrganizationDirectoryViewModel | null | undefined;
  href: string;
  runtimeConfig: RuntimeConfig;
}) {
  const params = readSearchParams(props.href);
  const filter = (params.get("filter") ?? "").trim().toLowerCase();
  const pageNum = parsePositiveInt(params.get("pageNum"), 1);
  const filtered = (props.directory?.items ?? []).filter((organization) => {
    if (filter === "") {
      return true;
    }

    const haystack = [organization.organizationName, organization.description].join(" ").toLowerCase();
    return haystack.includes(filter);
  });
  const pageSize = 30;
  const totalPageCount = filtered.length === 0 ? 0 : Math.ceil(filtered.length / pageSize);
  const currentPageNum = totalPageCount === 0 ? 1 : Math.min(pageNum, totalPageCount);
  const visibleOrganizations = filtered.slice(
    (currentPageNum - 1) * pageSize,
    (currentPageNum - 1) * pageSize + pageSize,
  );
  const pageNumbers = getPaginationWindow(currentPageNum, totalPageCount);

  return (
    <>
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <div className="title_area">
            <ul className="nav nav-tabs">
              <li><a href={appHref(props.runtimeConfig, "/projects")}>Project List</a></li>
              <li className="active"><a href={appHref(props.runtimeConfig, "/orgs")}>Organization List</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="search-wrap">
            <div className="pull-left" id="search">
              <form action={appHref(props.runtimeConfig, "/orgs")} method="get">
                <div className="search-bar">
                  <input className="textbox" defaultValue={params.get("filter") ?? ""} name="filter" type="search" />
                  <button className="search-btn" type="submit">Search</button>
                </div>
              </form>
            </div>
          </div>
          {visibleOrganizations.length === 0 ? (
            <div className="error-wrap">
              <p>No organizations found.</p>
            </div>
          ) : (
            <>
              <ul className="all-projects">
                {visibleOrganizations.map((organization) => (
                  <li className="project" key={organization.organizationName}>
                    <div className="info-wrap">
                      <div className="project-main-copy">
                        <div className="header">
                          <a
                            className="black"
                            href={appHref(
                              props.runtimeConfig,
                              `/organizations/${organization.organizationName}`,
                            )}
                          >
                            {organization.organizationName}
                          </a>
                        </div>
                        <div className="desc">{organization.description || "No description yet."}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {totalPageCount > 1 ? (
                <nav className="directory-pagination legacy-directory-pagination" id="pagination">
                  {currentPageNum > 1 ? (
                    <a className="nav-pill" href={buildOrganizationsHref(params.get("filter") ?? "", currentPageNum - 1)}>Prev</a>
                  ) : (
                    <span className="nav-pill is-disabled">Prev</span>
                  )}
                  {pageNumbers.map((nextPageNum) =>
                    nextPageNum === currentPageNum ? (
                      <span className="nav-pill active" key={nextPageNum}>{nextPageNum}</span>
                    ) : (
                      <a className="nav-pill" href={buildOrganizationsHref(params.get("filter") ?? "", nextPageNum)} key={nextPageNum}>{nextPageNum}</a>
                    ),
                  )}
                  {currentPageNum < totalPageCount ? (
                    <a className="nav-pill" href={buildOrganizationsHref(params.get("filter") ?? "", currentPageNum + 1)}>Next</a>
                  ) : (
                    <span className="nav-pill is-disabled">Next</span>
                  )}
                </nav>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function OrganizationNewShell({
  onCreateOrganization,
  pending,
}: Pick<AuthWorkspaceShellProps, "onCreateOrganization" | "pending">) {
  const [formState, setFormState] = React.useState({ description: "", organizationName: "" });
  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Organization</p>
      <h1>Create organization</h1>
      <form className="runtime-grid" onSubmit={(event) => { event.preventDefault(); onCreateOrganization?.(formState); }}>
        <label><span>Organization name</span><input name="organizationName" type="text" value={formState.organizationName} onChange={(event) => setFormState((current) => ({ ...current, organizationName: event.target.value }))} /></label>
        <label><span>Description</span><textarea name="description" value={formState.description} onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))} /></label>
        <button type="submit">{pending ? "Creating..." : "Create organization"}</button>
      </form>
    </main>
  );
}

function OrganizationDetailShell(props: {
  detail: OrganizationDetailViewModel | null | undefined;
  members: OrganizationMembersViewModel | null | undefined;
}) {
  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Organization</p>
      <h1>{props.detail?.organizationName ?? "Organization"}</h1>
      <p>{props.detail?.description || "No description yet."}</p>
      <Section title="Members">
        {props.members?.members?.length ? <ul>{props.members.members.map((member) => <li key={member.loginId}>{member.userLabel} ({member.role})</li>)}</ul> : <p>Member summary requires update authority.</p>}
      </Section>
    </main>
  );
}

function OrganizationSettingsShell(props: {
  detail: OrganizationDetailViewModel | null | undefined;
  pending?: boolean;
  onUpdateOrganization?: AuthWorkspaceShellProps["onUpdateOrganization"];
}) {
  const detail = props.detail ?? { description: "", organizationName: "", viewerCanUpdate: false };
  const [formState, setFormState] = React.useState({
    currentOrganizationName: detail.organizationName,
    description: detail.description,
    organizationName: detail.organizationName,
  });
  React.useEffect(() => {
    setFormState({
      currentOrganizationName: detail.organizationName,
      description: detail.description,
      organizationName: detail.organizationName,
    });
  }, [detail.description, detail.organizationName]);

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Organization</p>
      <h1>Organization settings</h1>
      <form className="runtime-grid" onSubmit={(event) => { event.preventDefault(); props.onUpdateOrganization?.(formState); }}>
        <label><span>Organization name</span><input name="organizationName" type="text" value={formState.organizationName} onChange={(event) => setFormState((current) => ({ ...current, organizationName: event.target.value }))} /></label>
        <label><span>Description</span><textarea name="description" value={formState.description} onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))} /></label>
        <button type="submit">{props.pending ? "Saving..." : "Save organization"}</button>
      </form>
    </main>
  );
}

function ProjectNewShell({
  onCreateProject,
  pending,
}: Pick<AuthWorkspaceShellProps, "onCreateProject" | "pending">) {
  const [formState, setFormState] = React.useState({
    ownerName: "",
    overview: "",
    projectName: "",
    projectScope: "public",
  });
  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>Create project</h1>
      <form className="runtime-grid" onSubmit={(event) => { event.preventDefault(); onCreateProject?.(formState); }}>
        <label><span>Owner</span><input name="ownerName" type="text" value={formState.ownerName} onChange={(event) => setFormState((current) => ({ ...current, ownerName: event.target.value }))} /></label>
        <label><span>Project name</span><input name="projectName" type="text" value={formState.projectName} onChange={(event) => setFormState((current) => ({ ...current, projectName: event.target.value }))} /></label>
        <label><span>Overview</span><textarea name="overview" value={formState.overview} onChange={(event) => setFormState((current) => ({ ...current, overview: event.target.value }))} /></label>
        <label><span>Visibility</span><select name="projectScope" value={formState.projectScope} onChange={(event) => setFormState((current) => ({ ...current, projectScope: event.target.value }))}><option value="public">public</option><option value="protected">protected</option><option value="private">private</option></select></label>
        <button type="submit">{pending ? "Creating..." : "Create project"}</button>
      </form>
    </main>
  );
}

function ProjectDetailShell(props: {
  detail: ProjectDetailViewModel | null | undefined;
  members: ProjectMembersViewModel | null | undefined;
  onEnrollProject?: AuthWorkspaceShellProps["onEnrollProject"];
  onCancelEnrollProject?: AuthWorkspaceShellProps["onCancelEnrollProject"];
  onToggleFavoriteProject?: AuthWorkspaceShellProps["onToggleFavoriteProject"];
}) {
  const detail = props.detail;
  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>{detail ? `${detail.ownerName}/${detail.projectName}` : "Project"}</h1>
      <p>{detail?.overview || "No overview yet."}</p>
      <p>Scope: {detail?.projectScope ?? "unknown"}</p>
      {detail ? (
        <div className="runtime-grid">
          <button type="button" onClick={() => props.onToggleFavoriteProject?.(detail.ownerName, detail.projectName)}>
            {detail.isFavorited ? "Unfavorite project" : "Favorite project"}
          </button>
          {detail.viewerCanEnroll ? (
            detail.enrollmentRequested ? (
              <button type="button" onClick={() => props.onCancelEnrollProject?.(detail.ownerName, detail.projectName)}>Cancel enrollment request</button>
            ) : (
              <button type="button" onClick={() => props.onEnrollProject?.(detail.ownerName, detail.projectName)}>Request enrollment</button>
            )
          ) : null}
        </div>
      ) : null}
      <Section title="Members">
        {props.members?.members?.length ? <ul>{props.members.members.map((member) => <li key={member.loginId}>{member.userLabel} ({member.role})</li>)}</ul> : <p>Member summary requires update authority.</p>}
      </Section>
    </main>
  );
}

function ProjectSettingsShell(props: {
  detail: ProjectDetailViewModel | null | undefined;
  pending?: boolean;
  onUpdateProject?: AuthWorkspaceShellProps["onUpdateProject"];
}) {
  const detail = props.detail ?? {
    enrollmentRequested: false,
    isFavorited: false,
    organizationName: "",
    overview: "",
    ownerName: "",
    projectName: "",
    projectScope: "public",
    viewerCanEnroll: false,
    viewerCanUpdate: false,
  };
  const [formState, setFormState] = React.useState({
    currentOwnerName: detail.ownerName,
    currentProjectName: detail.projectName,
    ownerName: detail.ownerName,
    overview: detail.overview,
    projectName: detail.projectName,
    projectScope: detail.projectScope,
  });
  React.useEffect(() => {
    setFormState({
      currentOwnerName: detail.ownerName,
      currentProjectName: detail.projectName,
      ownerName: detail.ownerName,
      overview: detail.overview,
      projectName: detail.projectName,
      projectScope: detail.projectScope,
    });
  }, [detail.ownerName, detail.overview, detail.projectName, detail.projectScope]);

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>Project settings</h1>
      <form className="runtime-grid" onSubmit={(event) => { event.preventDefault(); props.onUpdateProject?.(formState); }}>
        <label><span>Project name</span><input name="projectName" type="text" value={formState.projectName} onChange={(event) => setFormState((current) => ({ ...current, projectName: event.target.value }))} /></label>
        <label><span>Overview</span><textarea name="overview" value={formState.overview} onChange={(event) => setFormState((current) => ({ ...current, overview: event.target.value }))} /></label>
        <label><span>Visibility</span><select name="projectScope" value={formState.projectScope} onChange={(event) => setFormState((current) => ({ ...current, projectScope: event.target.value }))}><option value="public">public</option><option value="protected">protected</option><option value="private">private</option></select></label>
        <button type="submit">{props.pending ? "Saving..." : "Save project"}</button>
      </form>
    </main>
  );
}

function placeholderTitle(route: AppRoute): string {
  switch (route.kind) {
    case "organization-issues":
      return "Organization Issues";
    case "organization-boards":
      return "Organization Boards";
    case "organization-pull-requests":
      return "Organization Pull Requests";
    case "project-issues":
      return "Issues";
    case "issue-detail":
      return "Issue";
    case "project-boards":
      return "Boards";
    case "board-detail":
      return "Board";
    case "code-browser":
      return "Code";
    case "pull-request-list":
      return "Pull Requests";
    case "pull-request-detail":
      return "Pull Request";
    case "search":
      return "Search";
    case "site-admin":
      return "Site Admin";
    default:
      return "Route Placeholder";
  }
}

function LegacyPlaceholderShell({ route }: { route: AppRoute }) {
  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Route Table</p>
      <h1>{placeholderTitle(route)}</h1>
      <p>{route.href}</p>
      <p className="lede">Wave 0 keeps this legacy deep-link mounted while the full screen body is ported.</p>
    </main>
  );
}

export function AuthWorkspaceShell(props: AuthWorkspaceShellProps) {
  if (props.bootstrapping && requiresAuthenticatedSession(props.route)) {
    return <main className="app-shell"><h1>Loading...</h1></main>;
  }

  let content: React.ReactNode;
  switch (props.route.kind) {
    case "public-home":
      content = <HomeShell runtimeConfig={props.runtimeConfig} />;
      break;
    case "public-projects":
      content = (
        <ProjectDirectoryShell
          directory={props.projectDirectory}
          href={props.route.href}
          runtimeConfig={props.runtimeConfig}
        />
      );
      break;
    case "public-organizations":
      content = (
        <OrganizationDirectoryShell
          directory={props.organizationDirectory}
          href={props.route.href}
          runtimeConfig={props.runtimeConfig}
        />
      );
      break;
    case "login":
      content = (
        <LoginShell
          authUiCapabilities={props.authUiCapabilities}
          onSignIn={props.onSignIn}
          pending={props.pending}
          routeHref={props.route.href}
          runtimeConfig={props.runtimeConfig}
        />
      );
      break;
    case "register":
      content = (
        <RegisterShell
          authUiCapabilities={props.authUiCapabilities}
          onRegister={props.onRegister}
          pending={props.pending}
          runtimeConfig={props.runtimeConfig}
        />
      );
      break;
    case "lost-password":
      content = <LostPasswordShell runtimeConfig={props.runtimeConfig} />;
      break;
    case "reset-password":
      content = <ResetPasswordShell runtimeConfig={props.runtimeConfig} />;
      break;
    case "me":
      content = <WorkspaceShell pending={props.pending} runtimeConfig={props.runtimeConfig} workspaceOverview={props.workspaceOverview} onSetDefaultLandingPath={props.onSetDefaultLandingPath} onSignOut={props.onSignOut} />;
      break;
    case "workspace-settings":
      content = (
        <WorkspaceSettingsShell
          onAddWorkspaceEmail={props.onAddWorkspaceEmail}
          onChangePassword={props.onChangePassword}
          onDeleteWorkspaceEmail={props.onDeleteWorkspaceEmail}
          onResetApiToken={props.onResetApiToken}
          onResetVisitedProjects={props.onResetVisitedProjects}
          onSendWorkspaceEmailValidation={props.onSendWorkspaceEmailValidation}
          onSetMainWorkspaceEmail={props.onSetMainWorkspaceEmail}
          onToggleWorkspaceNotification={props.onToggleWorkspaceNotification}
          onUpdateProfile={props.onUpdateProfile}
          pending={props.pending}
          runtimeConfig={props.runtimeConfig}
          section={props.route.section}
          workspaceOverview={props.workspaceOverview}
        />
      );
      break;
    case "organization-new":
      content = <OrganizationNewShell onCreateOrganization={props.onCreateOrganization} pending={props.pending} />;
      break;
    case "organization-detail":
      content = <OrganizationDetailShell detail={props.organizationDetail} members={props.organizationMembers} />;
      break;
    case "organization-settings":
      content = <OrganizationSettingsShell detail={props.organizationDetail} pending={props.pending} onUpdateOrganization={props.onUpdateOrganization} />;
      break;
    case "project-new":
      content = <ProjectNewShell onCreateProject={props.onCreateProject} pending={props.pending} />;
      break;
    case "project-detail":
      content = <ProjectDetailShell detail={props.projectDetail} members={props.projectMembers} onEnrollProject={props.onEnrollProject} onCancelEnrollProject={props.onCancelEnrollProject} onToggleFavoriteProject={props.onToggleFavoriteProject} />;
      break;
    case "project-settings":
      content = <ProjectSettingsShell detail={props.projectDetail} pending={props.pending} onUpdateProject={props.onUpdateProject} />;
      break;
    case "organization-issues":
    case "organization-boards":
    case "organization-pull-requests":
    case "project-issues":
    case "issue-detail":
    case "project-boards":
    case "board-detail":
    case "code-browser":
    case "pull-request-list":
    case "pull-request-detail":
    case "search":
    case "site-admin":
      content = <LegacyPlaceholderShell route={props.route} />;
      break;
    default:
      content = <main className="app-shell"><h1>Unsupported route</h1><p>{props.route.href}</p></main>;
      break;
  }

  return (
    <>
      {content}
      {props.errorMessage ? <p className="app-shell">{props.errorMessage}</p> : null}
    </>
  );
}
