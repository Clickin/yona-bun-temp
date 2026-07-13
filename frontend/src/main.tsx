import { RouterProvider } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";
import type * as AttachmentsApi from "./api/attachments";
import type * as AuthApi from "./api/auth";
import type * as BoardsApi from "./api/boards";
import type * as CodeBranchesApi from "./api/code-branches";
import type * as CodeCommitsApi from "./api/code-commits";
import type * as IssueMetaApi from "./api/issue-meta";
import type * as MilestonesApi from "./api/milestones";
import type * as NotificationsApi from "./api/notifications";
import type * as OrgProjectApi from "./api/org-project";
import type * as ProjectLabelsApi from "./api/project-labels";
import type * as PullRequestsApi from "./api/pull-requests";
import type * as QueryKeysApi from "./api/query-keys";
import type * as RestClientApi from "./api/rest-client";
import type * as SearchApi from "./api/search";
import type * as SessionApi from "./api/session";
import type * as SiteAdminApi from "./api/site-admin";
import type * as TranslationApi from "./api/translation";
import type * as TypesApi from "./api/types";
import type * as UsersApi from "./api/users";
import type * as WorkspaceApi from "./api/workspace";
import type * as AuthWorkspaceClient from "./auth-workspace-client";
import type * as LegacyI18n from "./i18n";
import type * as QueryClientBoundary from "./query-client";
import { readRuntimeConfig, type RuntimeConfig } from "./runtime-config";
import { getRouter } from "./router";
import { YoramQueryProvider } from "./query-client";
import "./app.css";

type RetainedFrontendSupportBoundary = {
  api: {
    attachments: typeof AttachmentsApi;
    auth: typeof AuthApi;
    boards: typeof BoardsApi;
    codeBranches: typeof CodeBranchesApi;
    codeCommits: typeof CodeCommitsApi;
    issueMeta: typeof IssueMetaApi;
    milestones: typeof MilestonesApi;
    notifications: typeof NotificationsApi;
    orgProject: typeof OrgProjectApi;
    projectLabels: typeof ProjectLabelsApi;
    pullRequests: typeof PullRequestsApi;
    queryKeys: typeof QueryKeysApi;
    restClient: typeof RestClientApi;
    search: typeof SearchApi;
    session: typeof SessionApi;
    siteAdmin: typeof SiteAdminApi;
    translation: typeof TranslationApi;
    types: typeof TypesApi;
    users: typeof UsersApi;
    workspace: typeof WorkspaceApi;
  };
  authWorkspaceClient: typeof AuthWorkspaceClient;
  i18n: typeof LegacyI18n;
  queryClient: typeof QueryClientBoundary;
};

type _RetainedFrontendSupportBoundary = RetainedFrontendSupportBoundary;

export interface CreateAppOptions {
  runtimeConfig?: RuntimeConfig;
}

export function createApp(options: CreateAppOptions = {}) {
  const runtimeConfig = options.runtimeConfig ?? readRuntimeConfig();
  const router = getRouter(runtimeConfig);

  return {
    router,
    runtimeConfig,
    title: runtimeConfig.siteName ?? "Yoram",
  };
}

export function mountApp(container: Element, options: CreateAppOptions = {}) {
  if (typeof document !== "undefined") {
    document.body.id = "html-body";
  }

  const { router } = createApp(options);
  return createRoot(container).render(
    <div id="main" className="main">
      <YoramQueryProvider>
        <RouterProvider router={router} />
      </YoramQueryProvider>
    </div>,
  );
}

if (typeof document !== "undefined") {
  const mountNode = document.getElementById("root");

  if (mountNode) {
    mountApp(mountNode);
  }
}
