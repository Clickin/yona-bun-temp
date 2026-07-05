import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { readWorkspaceOverviewRest, toggleWorkspaceNotificationRest } from "../../../api/workspace";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";

export const Route = createFileRoute("/user/editform/notifications")({
  component: UserNotificationSettingsRoute,
});

type WatchedProjectRow = {
  notifications?: unknown;
  ownerName?: unknown;
  projectId?: unknown;
  projectName?: unknown;
};

type NotificationRow = {
  enabled?: unknown;
  eventType?: unknown;
};

const NOTIFICATION_TYPES = [
  ["NEW_ISSUE", "notification.type.new.issue"],
  ["NEW_POSTING", "notification.type.new.posting"],
  ["NEW_PULL_REQUEST", "notification.type.new.pullrequest"],
  ["ISSUE_STATE_CHANGED", "notification.type.issue.state.changed"],
  ["ISSUE_ASSIGNEE_CHANGED", "notification.type.issue.assignee.changed"],
  ["PULL_REQUEST_STATE_CHANGED", "notification.type.pullrequest.state.changed"],
  ["NEW_COMMENT", "notification.type.new.comment"],
  ["NEW_REVIEW_COMMENT", "notification.type.new.simple.comment"],
  ["MEMBER_ENROLL_REQUEST", "notification.type.member.enroll"],
  ["PULL_REQUEST_MERGED", "notification.type.pullrequest.merged"],
  ["ISSUE_REFERRED_FROM_COMMIT", "notification.type.issue.referred.from.commit"],
  ["PULL_REQUEST_COMMIT_CHANGED", "notification.type.pullrequest.commit.changed"],
  ["NEW_COMMIT", "notification.type.new.commit"],
  ["PULL_REQUEST_REVIEW_STATE_CHANGED", "notification.type.pullrequest.review.action.changed"],
  ["ISSUE_REFERRED_FROM_PULL_REQUEST", "notification.type.issue.referred.from.pullrequest"],
  ["ISSUE_BODY_CHANGED", "notification.type.issue.body.changed"],
  ["REVIEW_THREAD_STATE_CHANGED", "notification.type.review.state.changed"],
  ["ORGANIZATION_MEMBER_ENROLL_REQUEST", "notification.organization.type.member.enroll"],
  ["COMMENT_UPDATED", "notification.type.comment.updated"],
  ["ISSUE_MOVED", "notification.type.issue.is.moved"],
  ["ISSUE_SHARER_CHANGED", "notification.type.issue.sharer.changed"],
  ["ISSUE_LABEL_CHANGED", "notification.type.issue.label.changed"],
  ["ISSUE_MILESTONE_CHANGED", "notification.type.milestone.changed"],
  ["POSTING_BODY_CHANGED", "notification.type.posting.body.changed"],
  ["RESOURCE_DELETED", "notification.type.resource.deleted"],
  ["MEMBER_ENROLL_ACCEPT", "notification.member.enroll.accept"],
  ["ORGANIZATION_MEMBER_ENROLL_ACCEPT", "notification.member.enroll.accept"],
] as const;

function UserNotificationSettingsRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <UserNotificationSettingsScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function UserNotificationSettingsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const workspaceQuery = useQuery({
    queryFn: () => readWorkspaceOverviewRest(runtimeConfig),
    queryKey: ["workspace", "overview"],
  });
  const watchedProjects = (workspaceQuery.data?.watchedProjects ?? []) as WatchedProjectRow[];
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const activeProjectId = selectedProjectId || activeProjectIdFromHash(watchedProjects);
  const toggleMutation = useMutation({
    mutationFn: async (input: { checked: boolean; eventType: string; projectId: string }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return toggleWorkspaceNotificationRest(runtimeConfig, csrfToken, {
        eventType: input.eventType,
        projectId: input.projectId,
      });
    },
    onSuccess: (workspace, input) => {
      queryClient.setQueryData(
        ["workspace", "overview"],
        updateWorkspaceNotification(workspace, input),
      );
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
          <EditTabMenu active="notifications" />

          <div>
            <ul id="notification-projects" className="unstyled lst-stacked span3 mr20">
              {watchedProjects.map((project) => {
                const projectId = stringValue(project.projectId);
                return (
                  <li
                    key={projectId}
                    className={projectId === activeProjectId ? "active" : undefined}
                  >
                    <Link
                      to="/user/editform/notifications"
                      hash={projectId}
                      activeProps={{ className: undefined }}
                      data-toggle="tab"
                      onClick={() => {
                        setSelectedProjectId(projectId);
                      }}
                    >
                      {`${stringValue(project.ownerName)} / ${stringValue(project.projectName)}`}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="tab-content">
              {watchedProjects.map((project) => {
                const projectId = stringValue(project.projectId);
                const notifications = Array.isArray(project.notifications)
                  ? (project.notifications as NotificationRow[])
                  : [];
                return (
                  <div
                    key={projectId}
                    id={projectId}
                    className={projectId === activeProjectId ? "tab-pane active" : "tab-pane"}
                  >
                    <table className="table table-striped table-bordered">
                      <tbody>
                        {NOTIFICATION_TYPES.map(([eventType, messageKey]) => (
                          <tr key={eventType}>
                            <th>{t(messageKey)}</th>
                            <td>
                              <div className="switch" data-on-label="On" data-off-label="Off">
                                <input
                                  className="notiUpdate"
                                  data-href={prefixBasePath(
                                    runtimeConfig.basePath,
                                    `/noti/toggle/${projectId}/${eventType}`,
                                  )}
                                  type="checkbox"
                                  data-toggle="switch"
                                  checked={isNotificationEnabled(notifications, eventType)}
                                  onChange={(event) =>
                                    toggleMutation.mutate({
                                      checked: event.currentTarget.checked,
                                      eventType,
                                      projectId,
                                    })
                                  }
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function activeProjectIdFromHash(watchedProjects: WatchedProjectRow[]) {
  const firstProjectId = stringValue(watchedProjects[0]?.projectId);
  const hashProjectId = typeof window === "undefined" ? "" : window.location.hash.replace(/^#/, "");
  return watchedProjects.some((project) => stringValue(project.projectId) === hashProjectId)
    ? hashProjectId
    : firstProjectId;
}

function isNotificationEnabled(notifications: NotificationRow[], eventType: string) {
  return notifications.some(
    (notification) => notification.eventType === eventType && notification.enabled === true,
  );
}

function updateWorkspaceNotification(
  workspace: unknown,
  input: { checked: boolean; eventType: string; projectId: string },
) {
  if (!isRecord(workspace) || !Array.isArray(workspace.watchedProjects)) {
    return workspace;
  }
  return {
    ...workspace,
    watchedProjects: workspace.watchedProjects.map((project) => {
      if (!isRecord(project) || stringValue(project.projectId) !== input.projectId) {
        return project;
      }
      const notifications = Array.isArray(project.notifications) ? project.notifications : [];
      return {
        ...project,
        notifications: notifications.map((notification) =>
          isRecord(notification) && notification.eventType === input.eventType
            ? { ...notification, enabled: input.checked }
            : notification,
        ),
      };
    }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return typeof value === "number" ? String(value) : "";
}

function EditTabMenu({ active }: { active: string }) {
  const { t } = useLegacyMessages();

  return (
    <ul className="nav nav-tabs mt20">
      <li className={active === "profile" ? "active" : undefined}>
        <Link to="/user/editform" activeProps={{ className: undefined }}>
          {t("userinfo.editProfile")}
        </Link>
      </li>
      <li className={active === "password" ? "active" : undefined}>
        <Link to="/user/editform/password" activeProps={{ className: undefined }}>
          {t("userinfo.changePassword")}
        </Link>
      </li>
      <li className={active === "notifications" ? "active" : undefined}>
        <Link to="/user/editform/notifications" activeProps={{ className: undefined }}>
          {t("userinfo.changeNotifications")}
        </Link>
      </li>
      <li className={active === "emails" ? "active" : undefined}>
        <Link to="/user/editform/emails" activeProps={{ className: undefined }}>
          {t("userinfo.changeEmails")}
        </Link>
      </li>
      <li className={active === "token" ? "active" : undefined}>
        <Link to="/user/editform/token" activeProps={{ className: undefined }}>
          {t("userinfo.token")}
        </Link>
      </li>
    </ul>
  );
}
