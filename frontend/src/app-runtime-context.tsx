import * as React from "react";
import {
  readAuthUiCapabilities,
  readCurrentSession,
  readSessionBootstrap,
  readWorkspaceOverview,
} from "./auth-workspace-client";
import { LegacyI18nProvider, type LegacyI18nContextValue, useLegacyMessages } from "./i18n";
import type { RuntimeConfig } from "./runtime-config";
import type {
  AuthUiCapabilitiesViewModel,
  WorkspaceOverviewViewModel,
} from "./routes/-view-models";

function toWorkspaceOverview(
  session: Awaited<ReturnType<typeof readCurrentSession>>,
  overview: Awaited<ReturnType<typeof readWorkspaceOverview>>,
): WorkspaceOverviewViewModel {
  const profile = overview.profile as (typeof overview.profile & { isGuest?: boolean }) | undefined;
  return {
    apiToken: overview.apiToken,
    defaultLandingPath: overview.defaultLandingPath,
    daysAgo: overview.daysAgo,
    emails: overview.emails.map((email) => ({
      emailAddress: email.emailAddress,
      id: email.id,
      valid: email.valid,
    })),
    favoriteProjects: overview.favoriteProjects.map((project) => ({
      logoUrl: project.logoUrl,
      ownerId: project.ownerId,
      ownerName: project.ownerName,
      overview: project.overview,
      projectId: project.projectId,
      projectName: project.projectName,
      projectScope: project.projectScope,
    })),
    issueItems: overview.issueItems.map((item) => ({
      assigneeLabel: item.assigneeLabel,
      authorLabel: item.authorLabel,
      commentCount: item.commentCount,
      issueNumber: Number(item.issueNumber),
      ownerName: item.ownerName,
      projectName: item.projectName,
      state: item.state,
      title: item.title,
      updatedLabel: item.updatedLabel,
    })),
    memberProjects: overview.memberProjects.map((project) => ({
      createdLabel: project.createdLabel,
      lastPushedLabel: project.lastPushedLabel,
      memberCount: project.memberCount,
      ownerName: project.ownerName,
      overview: project.overview,
      projectName: project.projectName,
      projectScope: project.projectScope,
      watchCount: project.watchCount,
    })),
    profile: profile
      ? {
          avatarUrl: profile.avatarUrl,
          connectedSocialProviders: [...profile.connectedSocialProviders],
          displayName: profile.displayName,
          englishName: profile.englishName,
          isBlocked: profile.isBlocked,
          isGuest: profile.isGuest,
          isSiteAdmin: profile.isSiteAdmin,
          loginId: profile.loginId,
          primaryEmailAddress: profile.primaryEmailAddress,
          sinceLabel: profile.sinceLabel,
        }
      : undefined,
    pullRequestItems: overview.pullRequestItems.map((item) => ({
      commentCount: item.commentCount,
      contributorLabel: item.contributorLabel,
      ownerName: item.ownerName,
      projectName: item.projectName,
      pullRequestNumber: Number(item.pullRequestNumber),
      receiverLabel: item.receiverLabel,
      state: item.state,
      title: item.title,
      updatedLabel: item.updatedLabel,
    })),
    recentProjects: overview.recentProjects.map((project) => ({
      logoUrl: project.logoUrl,
      ownerId: project.ownerId,
      ownerName: project.ownerName,
      overview: project.overview,
      projectId: project.projectId,
      projectName: project.projectName,
      projectScope: project.projectScope,
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

function toAuthUiCapabilitiesView(
  response: Awaited<ReturnType<typeof readAuthUiCapabilities>>,
): AuthUiCapabilitiesViewModel {
  const view = {
    defaultAdminContact: String(response.defaultAdminContact ?? ""),
    emailVerificationEnabled: response.emailVerificationEnabled,
    enabledSocialProviders: response.enabledSocialProviders,
    loginIdPlaceholder: response.loginIdPlaceholder,
    passwordPlaceholder: response.passwordPlaceholder,
    secretSetupRequired: response.secretSetupRequired,
    signupRequireConfirm: response.signupRequireConfirm,
    socialLoginOnly: response.socialLoginOnly,
  };
  return view;
}

interface AppRuntimeContextValue {
  authUiCapabilities: AuthUiCapabilitiesViewModel | null;
  bootstrapping: boolean;
  csrfToken: string;
  currentSession: Awaited<ReturnType<typeof readCurrentSession>> | null;
  errorMessage: string | null;
  language: LegacyI18nContextValue["language"];
  messages: LegacyI18nContextValue["t"];
  refreshCurrentSession: () => Promise<Awaited<ReturnType<typeof readCurrentSession>>>;
  refreshWorkspace: (
    session?: Awaited<ReturnType<typeof readCurrentSession>> | null,
  ) => Promise<void>;
  runtimeConfig: RuntimeConfig;
  setLanguage: LegacyI18nContextValue["setLanguage"];
  setCurrentSession: React.Dispatch<
    React.SetStateAction<Awaited<ReturnType<typeof readCurrentSession>> | null>
  >;
  setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
  setWorkspaceOverview: React.Dispatch<React.SetStateAction<WorkspaceOverviewViewModel | null>>;
  syncWorkspaceFromOverview: (
    overview: Awaited<ReturnType<typeof readWorkspaceOverview>>,
  ) => Promise<void>;
  workspaceOverview: WorkspaceOverviewViewModel | null;
}

const AppRuntimeContext = React.createContext<AppRuntimeContextValue | null>(null);

export function AppRuntimeProvider({
  children,
  runtimeConfig,
}: React.PropsWithChildren<{ runtimeConfig: RuntimeConfig }>) {
  return (
    <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
      <AppRuntimeProviderInner runtimeConfig={runtimeConfig}>{children}</AppRuntimeProviderInner>
    </LegacyI18nProvider>
  );
}

function AppRuntimeProviderInner({
  children,
  runtimeConfig,
}: React.PropsWithChildren<{ runtimeConfig: RuntimeConfig }>) {
  const [workspaceOverview, setWorkspaceOverview] =
    React.useState<WorkspaceOverviewViewModel | null>(null);
  const [authUiCapabilities, setAuthUiCapabilities] =
    React.useState<AuthUiCapabilitiesViewModel | null>(null);
  const [currentSession, setCurrentSession] = React.useState<Awaited<
    ReturnType<typeof readCurrentSession>
  > | null>(null);
  const [csrfToken, setCsrfToken] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const i18n = useLegacyMessages();

  const refreshWorkspace = React.useCallback(
    async (session?: Awaited<ReturnType<typeof readCurrentSession>> | null) => {
      const nextSession = session ?? currentSession;
      if (!nextSession || nextSession.isAnonymous) {
        setWorkspaceOverview(null);
        return;
      }
      const overview = await readWorkspaceOverview(runtimeConfig);
      setWorkspaceOverview(toWorkspaceOverview(nextSession, overview));
    },
    [currentSession, runtimeConfig],
  );

  const refreshCurrentSession = React.useCallback(async () => {
    const session = await readCurrentSession(runtimeConfig);
    setCurrentSession(session);
    return session;
  }, [runtimeConfig]);

  const syncWorkspaceFromOverview = React.useCallback(
    async (overview: Awaited<ReturnType<typeof readWorkspaceOverview>>) => {
      const session = await refreshCurrentSession();
      setWorkspaceOverview(toWorkspaceOverview(session, overview));
    },
    [refreshCurrentSession],
  );

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

        if (!session.isAnonymous) {
          const overview = await readWorkspaceOverview(runtimeConfig);
          if (cancelled) {
            return;
          }
          setWorkspaceOverview(toWorkspaceOverview(session, overview));
        } else {
          setWorkspaceOverview(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "error.internalServerError");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [runtimeConfig]);

  const value = React.useMemo<AppRuntimeContextValue>(
    () => ({
      authUiCapabilities,
      bootstrapping: currentSession === null,
      csrfToken,
      currentSession,
      errorMessage,
      language: i18n.language,
      messages: i18n.t,
      refreshCurrentSession,
      refreshWorkspace,
      runtimeConfig,
      setLanguage: i18n.setLanguage,
      setCurrentSession,
      setErrorMessage,
      setWorkspaceOverview,
      syncWorkspaceFromOverview,
      workspaceOverview,
    }),
    [
      authUiCapabilities,
      csrfToken,
      currentSession,
      errorMessage,
      i18n.language,
      i18n.setLanguage,
      i18n.t,
      refreshCurrentSession,
      refreshWorkspace,
      runtimeConfig,
      syncWorkspaceFromOverview,
      workspaceOverview,
    ],
  );

  return <AppRuntimeContext.Provider value={value}>{children}</AppRuntimeContext.Provider>;
}

export function useAppRuntime() {
  const value = React.use(AppRuntimeContext);
  if (value === null) {
    throw new Error("AppRuntimeContext is not available.");
  }
  return value;
}
