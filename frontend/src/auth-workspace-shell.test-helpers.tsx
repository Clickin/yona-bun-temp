import { renderToString } from "react-dom/server";
import { createLegacyI18nRuntime, type LegacyI18nContextValue } from "./i18n";
import type { RuntimeConfig } from "./runtime-config";
import { HomePage } from "./routes/-home-view";
import {
  LoginPage,
  LostPasswordPage,
  RegisterPage,
  ResetPasswordPage,
  VerifyUserPage,
} from "./routes/-auth-views";
import { OrganizationDirectoryPage, ProjectDirectoryPage } from "./routes/-directory-views";
import { PublicUserProfilePage, WorkspacePage } from "./routes/-workspace-views";
import {
  type WorkspaceSettingsSection,
  WorkspaceSettingsPage,
} from "./routes/-workspace-settings-view";
import {
  OrganizationDeletePage,
  OrganizationDetailPage,
  OrganizationMembersPage,
  OrganizationNewPage,
  OrganizationSettingsPage,
} from "./routes/-organization-views";
import { ProjectDetailPage, ProjectNewPage, ProjectSettingsPage } from "./routes/-project-views";
import type {
  AuthUiCapabilitiesViewModel,
  OrganizationDirectoryViewModel,
  OrganizationAdminViewModel,
  OrganizationDetailViewModel,
  OrganizationMembersViewModel,
  ProjectDetailViewModel,
  ProjectDirectoryViewModel,
  ProjectMembersViewModel,
  WorkspaceOverviewViewModel,
} from "./routes/-view-models";

type LegacyMessageLookup = LegacyI18nContextValue["t"];

export const testRuntimeConfig: RuntimeConfig = {
  apiBaseUrl: "/yona/api",
  basePath: "/yona",
};

export const testLegacyMessages = createLegacyI18nRuntime(["en-US"]).t;

export function renderHome(runtimeConfig: RuntimeConfig = testRuntimeConfig): string {
  return renderToString(<HomePage messages={testLegacyMessages} runtimeConfig={runtimeConfig} />);
}

export function renderLogin(
  overrides: {
    authUiCapabilities?: AuthUiCapabilitiesViewModel | null;
    pending?: boolean;
    routeHref: string;
  },
  runtimeConfig: RuntimeConfig = testRuntimeConfig,
): string {
  return renderToString(<LoginPage runtimeConfig={runtimeConfig} {...overrides} />);
}

export function renderRegister(
  overrides: {
    authUiCapabilities?: AuthUiCapabilitiesViewModel | null;
    pending?: boolean;
  },
  runtimeConfig: RuntimeConfig = testRuntimeConfig,
): string {
  return renderToString(<RegisterPage runtimeConfig={runtimeConfig} {...overrides} />);
}

export function renderLostPassword(
  routeHref: string,
  runtimeConfig: RuntimeConfig = testRuntimeConfig,
): string {
  return renderToString(<LostPasswordPage routeHref={routeHref} runtimeConfig={runtimeConfig} />);
}

export function renderResetPassword(
  routeHref: string,
  runtimeConfig: RuntimeConfig = testRuntimeConfig,
): string {
  return renderToString(<ResetPasswordPage routeHref={routeHref} runtimeConfig={runtimeConfig} />);
}

export function renderVerifyUser(
  overrides: {
    invalid?: boolean;
    loginId: string;
  },
  runtimeConfig: RuntimeConfig = testRuntimeConfig,
): string {
  return renderToString(<VerifyUserPage runtimeConfig={runtimeConfig} {...overrides} />);
}

export function renderWorkspace(
  workspaceOverview: WorkspaceOverviewViewModel | null,
  runtimeConfig: RuntimeConfig = testRuntimeConfig,
): string {
  return renderToString(
    <WorkspacePage
      messages={testLegacyMessages}
      runtimeConfig={runtimeConfig}
      workspaceOverview={workspaceOverview}
    />,
  );
}

export function renderPublicUserProfile(
  profileOverview: WorkspaceOverviewViewModel | null,
  routeHref = "/door",
  runtimeConfig: RuntimeConfig = testRuntimeConfig,
): string {
  return renderToString(
    <PublicUserProfilePage
      messages={testLegacyMessages}
      profileOverview={profileOverview}
      routeHref={routeHref}
      runtimeConfig={runtimeConfig}
    />,
  );
}

export function renderWorkspaceSettings(
  section: WorkspaceSettingsSection,
  routeHref: string,
  workspaceOverview: WorkspaceOverviewViewModel | null,
  runtimeConfig: RuntimeConfig = testRuntimeConfig,
  messages?: LegacyMessageLookup,
): string {
  return renderToString(
    <WorkspaceSettingsPage
      messages={messages ?? testLegacyMessages}
      routeHref={routeHref}
      runtimeConfig={runtimeConfig}
      section={section}
      workspaceOverview={workspaceOverview}
    />,
  );
}

export function renderProjectDirectory(
  directory: ProjectDirectoryViewModel | null,
  href: string,
  runtimeConfig: RuntimeConfig = testRuntimeConfig,
): string {
  return renderToString(
    <ProjectDirectoryPage
      directory={directory}
      href={href}
      messages={testLegacyMessages}
      runtimeConfig={runtimeConfig}
    />,
  );
}

export function renderOrganizationDirectory(
  directory: OrganizationDirectoryViewModel | null,
  href: string,
  runtimeConfig: RuntimeConfig = testRuntimeConfig,
): string {
  return renderToString(
    <OrganizationDirectoryPage
      directory={directory}
      href={href}
      messages={testLegacyMessages}
      runtimeConfig={runtimeConfig}
    />,
  );
}

export function renderOrganizationDetail(
  detail: OrganizationDetailViewModel | null,
  _members: OrganizationMembersViewModel | null = null,
): string {
  return renderToString(
    <OrganizationDetailPage
      detail={detail}
      messages={testLegacyMessages}
      runtimeConfig={testRuntimeConfig}
    />,
  );
}

export function renderOrganizationSettings(detail: OrganizationDetailViewModel | null): string {
  return renderToString(
    <OrganizationSettingsPage
      detail={detail}
      messages={testLegacyMessages}
      runtimeConfig={testRuntimeConfig}
    />,
  );
}

export function renderOrganizationNew(): string {
  return renderToString(<OrganizationNewPage />);
}

export function renderOrganizationMembersAdmin(detail: OrganizationAdminViewModel | null): string {
  return renderToString(
    <OrganizationMembersPage
      detail={detail}
      messages={testLegacyMessages}
      runtimeConfig={testRuntimeConfig}
    />,
  );
}

export function renderOrganizationDelete(detail: OrganizationAdminViewModel | null): string {
  return renderToString(
    <OrganizationDeletePage
      detail={detail}
      messages={testLegacyMessages}
      runtimeConfig={testRuntimeConfig}
    />,
  );
}

export function renderProjectDetail(
  detail: ProjectDetailViewModel | null,
  _members: ProjectMembersViewModel | null = null,
): string {
  return renderToString(
    <ProjectDetailPage
      detail={detail}
      messages={testLegacyMessages}
      runtimeConfig={testRuntimeConfig}
    />,
  );
}

export function renderProjectSettings(detail: ProjectDetailViewModel | null): string {
  return renderToString(
    <ProjectSettingsPage
      detail={detail}
      messages={testLegacyMessages}
      runtimeConfig={testRuntimeConfig}
    />,
  );
}

export function renderProjectNew(): string {
  return renderToString(<ProjectNewPage />);
}
