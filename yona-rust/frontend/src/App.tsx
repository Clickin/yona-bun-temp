import * as React from "react";
import { prefixBasePath, type RuntimeConfig } from "./runtime-config";
import {
  type AuthUiCapabilitiesViewModel,
  AuthWorkspaceShell,
  resolveAuthRedirectPath,
  type OrganizationDirectoryViewModel,
  type OrganizationDetailViewModel,
  type OrganizationMembersViewModel,
  type ProjectDirectoryViewModel,
  type ProjectDetailViewModel,
  type ProjectMembersViewModel,
  resolvePostAuthHref,
  type WorkspaceOverviewViewModel,
} from "./auth-workspace-shell";
import {
  cancelEnrollProject,
  createOrganization,
  createProject,
  enrollProject,
  listOrganizations,
  listProjects,
  readAuthUiCapabilities,
  readCurrentSession,
  readOrganizationDetail,
  readOrganizationMembers,
  readOrganizationSettings,
  readProjectDetail,
  readProjectMembers,
  readProjectSettings,
  readSessionBootstrap,
  readWorkspaceOverview,
  registerWithPassword,
  routeDocumentTitle,
  resolveCurrentPath,
  setDefaultLandingPath,
  signInWithPassword,
  signOut,
  toggleFavoriteProject,
  updateOrganization,
  updateProject,
  type AppRoute,
} from "./auth-workspace-client";
import { resolveNavigationTargetWithBasePath } from "./main";

interface AppProps {
  runtimeConfig: RuntimeConfig;
}

function toWorkspaceOverview(session: Awaited<ReturnType<typeof readCurrentSession>>, overview: Awaited<ReturnType<typeof readWorkspaceOverview>>): WorkspaceOverviewViewModel {
  return {
    apiToken: overview.apiToken,
    defaultLandingPath: overview.defaultLandingPath,
    emails: overview.emails.map((email) => ({
      emailAddress: email.emailAddress,
      id: email.id,
      valid: email.valid,
    })),
    favoriteProjects: overview.favoriteProjects.map((project) => ({
      ownerName: project.ownerName,
      projectName: project.projectName,
    })),
    recentProjects: overview.recentProjects.map((project) => ({
      ownerName: project.ownerName,
      projectName: project.projectName,
    })),
    watchedProjects: overview.watchedProjects.map((project) => ({
      notifications: project.notifications.map((notification) => ({
        enabled: notification.enabled,
        eventType: notification.eventType,
        label: notification.label,
      })),
      ownerName: project.ownerName,
      projectId: project.projectId,
      projectName: project.projectName,
    })),
    session: {
      defaultLandingPath: session.defaultLandingPath,
      emailAddress: session.emailAddress,
      isAnonymous: session.isAnonymous,
      isConfirmed: session.isConfirmed,
      isSiteAdmin: session.isSiteAdmin,
      loginId: session.loginId,
      userLabel: session.userLabel,
    },
  };
}

function toOrganizationDetailView(detail: Awaited<ReturnType<typeof readOrganizationDetail>>): OrganizationDetailViewModel {
  return {
    description: detail.description,
    organizationName: detail.organizationName,
    viewerCanUpdate: detail.viewerCanUpdate,
  };
}

function toAuthUiCapabilitiesView(
  response: Awaited<ReturnType<typeof readAuthUiCapabilities>>,
): AuthUiCapabilitiesViewModel {
  return {
    emailVerificationEnabled: response.emailVerificationEnabled,
    signupRequireConfirm: response.signupRequireConfirm,
    socialLoginOnly: response.socialLoginOnly,
  };
}

function toOrganizationMembersView(
  response: Awaited<ReturnType<typeof readOrganizationMembers>>,
): OrganizationMembersViewModel {
  return {
    enrollmentRequests: response.enrollmentRequests.map((item) => ({
      loginId: item.loginId,
      userLabel: item.userLabel,
    })),
    members: response.members.map((item) => ({
      loginId: item.loginId,
      role: item.role,
      userLabel: item.userLabel,
    })),
  };
}

function toOrganizationDirectoryView(
  response: Awaited<ReturnType<typeof listOrganizations>>,
): OrganizationDirectoryViewModel {
  return {
    items: response.items.map((item) => ({
      description: item.description,
      organizationName: item.organizationName,
    })),
  };
}

function toProjectDetailView(detail: Awaited<ReturnType<typeof readProjectDetail>>): ProjectDetailViewModel {
  return {
    enrollmentRequested: detail.enrollmentRequested,
    isFavorited: detail.isFavorited,
    organizationName: detail.organizationName,
    overview: detail.overview,
    ownerName: detail.ownerName,
    projectName: detail.projectName,
    projectScope: detail.projectScope,
    viewerCanEnroll: detail.viewerCanEnroll,
    viewerCanUpdate: detail.viewerCanUpdate,
  };
}

function toProjectMembersView(
  response: Awaited<ReturnType<typeof readProjectMembers>>,
): ProjectMembersViewModel {
  return {
    enrollmentRequests: response.enrollmentRequests.map((item) => ({
      loginId: item.loginId,
      userLabel: item.userLabel,
    })),
    members: response.members.map((item) => ({
      loginId: item.loginId,
      role: item.role,
      userLabel: item.userLabel,
    })),
  };
}

function toProjectDirectoryView(
  response: Awaited<ReturnType<typeof listProjects>>,
): ProjectDirectoryViewModel {
  return {
    items: response.items.map((item) => ({
      overview: item.overview,
      ownerName: item.ownerName,
      projectName: item.projectName,
      projectScope: item.projectScope,
    })),
  };
}

export function App({ runtimeConfig }: AppProps) {
  const [route, setRoute] = React.useState<AppRoute>(() =>
    typeof window === "undefined"
      ? { kind: "public-home", href: "/" }
      : resolveCurrentPath(`${window.location.pathname}${window.location.search}`, {
          basePath: runtimeConfig.basePath,
        }),
  );
  const [workspaceOverview, setWorkspaceOverview] = React.useState<WorkspaceOverviewViewModel | null>(null);
  const [authUiCapabilities, setAuthUiCapabilities] = React.useState<AuthUiCapabilitiesViewModel | null>(null);
  const [organizationDirectory, setOrganizationDirectory] = React.useState<OrganizationDirectoryViewModel | null>(null);
  const [currentSession, setCurrentSession] = React.useState<Awaited<ReturnType<typeof readCurrentSession>> | null>(null);
  const [organizationDetail, setOrganizationDetail] = React.useState<OrganizationDetailViewModel | null>(null);
  const [organizationMembers, setOrganizationMembers] = React.useState<OrganizationMembersViewModel | null>(null);
  const [projectDirectory, setProjectDirectory] = React.useState<ProjectDirectoryViewModel | null>(null);
  const [projectDetail, setProjectDetail] = React.useState<ProjectDetailViewModel | null>(null);
  const [projectMembers, setProjectMembers] = React.useState<ProjectMembersViewModel | null>(null);
  const [csrfToken, setCsrfToken] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  function navigateInternal(nextRoute: AppRoute, mode: "push" | "replace" = "push") {
    setRoute(nextRoute);
    if (typeof window === "undefined" || nextRoute.kind === "external") {
      return;
    }

    const browserHref = prefixBasePath(runtimeConfig.basePath, nextRoute.href);
    if (mode === "replace") {
      window.history.replaceState({}, "", browserHref);
    } else {
      window.history.pushState({}, "", browserHref);
    }
  }

  function loginRouteForRedirect(targetHref: string): AppRoute {
    return {
      kind: "login",
      href: `/users/loginform?redirectUrl=${encodeURIComponent(targetHref)}`,
    };
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

  async function refreshWorkspace(session: Awaited<ReturnType<typeof readCurrentSession>>) {
    if (session.isAnonymous) {
      setWorkspaceOverview(null);
      return;
    }
    const overview = await readWorkspaceOverview(runtimeConfig);
    setWorkspaceOverview(toWorkspaceOverview(session, overview));
  }

  async function loadRouteData(nextRoute: AppRoute, session: Awaited<ReturnType<typeof readCurrentSession>> | null) {
    setOrganizationDirectory(null);
    setOrganizationDetail(null);
    setOrganizationMembers(null);
    setProjectDirectory(null);
    setProjectDetail(null);
    setProjectMembers(null);

    if (requiresAuthenticatedSession(nextRoute) && (!session || session.isAnonymous)) {
      navigateInternal(loginRouteForRedirect(nextRoute.href), "replace");
      return;
    }

    switch (nextRoute.kind) {
      case "public-projects": {
        const projects = await listProjects(runtimeConfig);
        setProjectDirectory(toProjectDirectoryView(projects));
        break;
      }
      case "public-organizations": {
        const organizations = await listOrganizations(runtimeConfig);
        setOrganizationDirectory(toOrganizationDirectoryView(organizations));
        break;
      }
      case "organization-detail": {
        const detail = await readOrganizationDetail(runtimeConfig, nextRoute.organizationName);
        setOrganizationDetail(toOrganizationDetailView(detail));
        if (session && !session.isAnonymous && detail.viewerCanUpdate) {
          try {
            const members = await readOrganizationMembers(runtimeConfig, nextRoute.organizationName);
            setOrganizationMembers(toOrganizationMembersView(members));
          } catch {
            setOrganizationMembers(null);
          }
        }
        break;
      }
      case "organization-settings": {
        const detail = await readOrganizationSettings(runtimeConfig, nextRoute.organizationName);
        const members = await readOrganizationMembers(runtimeConfig, nextRoute.organizationName);
        setOrganizationDetail(toOrganizationDetailView(detail));
        setOrganizationMembers(toOrganizationMembersView(members));
        break;
      }
      case "project-detail": {
        const detail = await readProjectDetail(runtimeConfig, nextRoute.ownerName, nextRoute.projectName);
        setProjectDetail(toProjectDetailView(detail));
        if (session && !session.isAnonymous) {
          await refreshWorkspace(session);
          if (detail.viewerCanUpdate) {
            try {
              const members = await readProjectMembers(runtimeConfig, nextRoute.ownerName, nextRoute.projectName);
              setProjectMembers(toProjectMembersView(members));
            } catch {
              setProjectMembers(null);
            }
          }
        }
        break;
      }
      case "project-settings": {
        const detail = await readProjectSettings(runtimeConfig, nextRoute.ownerName, nextRoute.projectName);
        const members = await readProjectMembers(runtimeConfig, nextRoute.ownerName, nextRoute.projectName);
        setProjectDetail(toProjectDetailView(detail));
        setProjectMembers(toProjectMembersView(members));
        break;
      }
      case "public-home":
      case "me":
      case "organization-new":
      case "organization-issues":
      case "organization-boards":
      case "organization-pull-requests":
      case "lost-password":
      case "project-new":
      case "project-issues":
      case "project-boards":
      case "board-detail":
      case "code-browser":
      case "issue-detail":
      case "login":
      case "pull-request-detail":
      case "pull-request-list":
      case "register":
      case "reset-password":
      case "search":
      case "site-admin":
      case "external":
      default:
        break;
    }
  }

  React.useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const bootstrap = await readSessionBootstrap(runtimeConfig);
        if (cancelled) {
          return;
        }
        setCsrfToken(bootstrap.csrfToken);

        const session = await readCurrentSession(runtimeConfig);
        if (cancelled) {
          return;
        }
        const capabilities = await readAuthUiCapabilities(runtimeConfig);
        if (cancelled) {
          return;
        }
        setAuthUiCapabilities(toAuthUiCapabilitiesView(capabilities));
        setCurrentSession(session);
        await refreshWorkspace(session);
        if (!cancelled) {
          await loadRouteData(route, session);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Auth bootstrap failed.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [runtimeConfig]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!currentSession || cancelled) {
        return;
      }
      try {
        await loadRouteData(route, currentSession);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Route load failed.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [route]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function handlePopState() {
      setRoute(
        resolveCurrentPath(`${window.location.pathname}${window.location.search}`, {
          basePath: runtimeConfig.basePath,
        }),
      );
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [runtimeConfig.basePath]);

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = routeDocumentTitle(route);
    }
  }, [route]);

  return (
    <AuthWorkspaceShell
      bootstrapping={currentSession === null}
      route={route}
      authUiCapabilities={authUiCapabilities}
      errorMessage={errorMessage}
      organizationDirectory={organizationDirectory}
      onCancelEnrollProject={async (ownerName, projectName) => {
        setPending(true);
        setErrorMessage(null);
        try {
          await cancelEnrollProject(runtimeConfig, csrfToken, ownerName, projectName);
          const detail = await readProjectDetail(runtimeConfig, ownerName, projectName);
          setProjectDetail(toProjectDetailView(detail));
          if (currentSession && !currentSession.isAnonymous) {
            await refreshWorkspace(currentSession);
          }
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Cancel enrollment failed.");
        } finally {
          setPending(false);
        }
      }}
      onCreateOrganization={async (input) => {
        setPending(true);
        setErrorMessage(null);
        try {
          const detail = await createOrganization(runtimeConfig, csrfToken, input);
          setOrganizationDetail(toOrganizationDetailView(detail));
          setOrganizationMembers(null);
          navigateInternal({
            kind: "organization-detail",
            href: `/organizations/${detail.organizationName}`,
            organizationName: detail.organizationName,
          });
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Create organization failed.");
        } finally {
          setPending(false);
        }
      }}
      onCreateProject={async (input) => {
        setPending(true);
        setErrorMessage(null);
        try {
          const detail = await createProject(runtimeConfig, csrfToken, input);
          setProjectDetail(toProjectDetailView(detail));
          setProjectMembers(null);
          navigateInternal({
            kind: "project-detail",
            href: `/${detail.ownerName}/${detail.projectName}`,
            ownerName: detail.ownerName,
            projectName: detail.projectName,
          });
          if (currentSession && !currentSession.isAnonymous) {
            await refreshWorkspace(currentSession);
          }
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Create project failed.");
        } finally {
          setPending(false);
        }
      }}
      onEnrollProject={async (ownerName, projectName) => {
        setPending(true);
        setErrorMessage(null);
        try {
          await enrollProject(runtimeConfig, csrfToken, ownerName, projectName);
          const detail = await readProjectDetail(runtimeConfig, ownerName, projectName);
          setProjectDetail(toProjectDetailView(detail));
          if (currentSession && !currentSession.isAnonymous) {
            await refreshWorkspace(currentSession);
          }
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Enroll failed.");
        } finally {
          setPending(false);
        }
      }}
      onRegister={async (input) => {
        setPending(true);
        setErrorMessage(null);
        try {
          const session = await registerWithPassword(runtimeConfig, csrfToken, input);
          setCurrentSession(session);
          await refreshWorkspace(session);
          const searchParams =
            typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
          const nextHref = resolvePostAuthHref(
            resolveAuthRedirectPath(searchParams),
            session.defaultLandingPath,
          );
          const navigation = resolveNavigationTargetWithBasePath(nextHref, runtimeConfig.basePath);
          if (navigation.mode === "internal") {
            navigateInternal(navigation.route);
          } else if (typeof window !== "undefined") {
            window.location.assign(navigation.href);
            return;
          }
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Register failed.");
        } finally {
          setPending(false);
        }
      }}
      onSetDefaultLandingPath={async (path) => {
        setPending(true);
        setErrorMessage(null);
        try {
          const overview = await setDefaultLandingPath(runtimeConfig, csrfToken, path);
          if (currentSession) {
            setWorkspaceOverview(toWorkspaceOverview(currentSession, overview));
          }
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Save failed.");
        } finally {
          setPending(false);
        }
      }}
      onSignIn={async (input) => {
        setPending(true);
        setErrorMessage(null);
        try {
          const session = await signInWithPassword(runtimeConfig, csrfToken, input);
          setCurrentSession(session);
          await refreshWorkspace(session);
          const searchParams =
            typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
          const nextHref = resolvePostAuthHref(
            resolveAuthRedirectPath(searchParams),
            session.defaultLandingPath,
          );
          const navigation = resolveNavigationTargetWithBasePath(nextHref, runtimeConfig.basePath);
          if (navigation.mode === "internal") {
            navigateInternal(navigation.route);
          } else if (typeof window !== "undefined") {
            window.location.assign(navigation.href);
            return;
          }
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Sign in failed.");
        } finally {
          setPending(false);
        }
      }}
      onSignOut={async () => {
        setPending(true);
        setErrorMessage(null);
        try {
          await signOut(runtimeConfig, csrfToken);
          setCurrentSession(null);
          setWorkspaceOverview(null);
          setOrganizationDetail(null);
          setOrganizationMembers(null);
          setProjectDetail(null);
          setProjectMembers(null);
          navigateInternal({ kind: "login", href: "/users/loginform" });
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Sign out failed.");
        } finally {
          setPending(false);
        }
      }}
      onToggleFavoriteProject={async (ownerName, projectName) => {
        setPending(true);
        setErrorMessage(null);
        try {
          await toggleFavoriteProject(runtimeConfig, csrfToken, ownerName, projectName);
          const detail = await readProjectDetail(runtimeConfig, ownerName, projectName);
          setProjectDetail(toProjectDetailView(detail));
          if (currentSession && !currentSession.isAnonymous) {
            await refreshWorkspace(currentSession);
          }
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Toggle favorite failed.");
        } finally {
          setPending(false);
        }
      }}
      onUpdateOrganization={async (input) => {
        setPending(true);
        setErrorMessage(null);
        try {
          const detail = await updateOrganization(runtimeConfig, csrfToken, input);
          setOrganizationDetail(toOrganizationDetailView(detail));
          navigateInternal({
            kind: "organization-settings",
            href: `/organizations/${detail.organizationName}/settingform`,
            organizationName: detail.organizationName,
          });
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Update organization failed.");
        } finally {
          setPending(false);
        }
      }}
      onUpdateProject={async (input) => {
        setPending(true);
        setErrorMessage(null);
        try {
          const detail = await updateProject(runtimeConfig, csrfToken, input);
          setProjectDetail(toProjectDetailView(detail));
          navigateInternal({
            kind: "project-settings",
            href: `/${detail.ownerName}/${detail.projectName}/settingform`,
            ownerName: detail.ownerName,
            projectName: detail.projectName,
          });
          if (currentSession && !currentSession.isAnonymous) {
            await refreshWorkspace(currentSession);
          }
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Update project failed.");
        } finally {
          setPending(false);
        }
      }}
      organizationDetail={organizationDetail}
      organizationMembers={organizationMembers}
      pending={pending}
      projectDirectory={projectDirectory}
      projectDetail={projectDetail}
      projectMembers={projectMembers}
      runtimeConfig={runtimeConfig}
      workspaceOverview={workspaceOverview}
    />
  );
}
