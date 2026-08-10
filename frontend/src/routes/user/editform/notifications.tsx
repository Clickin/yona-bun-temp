import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { readWorkspaceOverviewRest, toggleWorkspaceNotificationRest } from "../../../api/workspace";
import { useLegacyMessages } from "../../../i18n";
import type { RuntimeConfig } from "../../../runtime-config";

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

const projectTabLinkInactiveSearch = { __legacyNotificationProjectTabActiveMarker: undefined };

function UserNotificationSettingsRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return <UserNotificationSettingsScreen runtimeConfig={runtimeConfig} />;
}

function UserNotificationSettingsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const routeLocation = useLocation();
  const queryClient = useQueryClient();
  const workspaceQuery = useQuery({
    queryFn: () => readWorkspaceOverviewRest(runtimeConfig),
    queryKey: ["workspace", "overview"],
  });
  const watchedProjects = (workspaceQuery.data?.watchedProjects ?? []) as WatchedProjectRow[];
  const routeHashProjectId = normalizeProjectHash(routeLocation.hash);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  useEffect(() => {
    setSelectedProjectId("");
  }, [routeHashProjectId]);
  const activeProjectId = activeProjectIdFromHash(
    watchedProjects,
    selectedProjectId || routeHashProjectId,
  );
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
    <div>
      <ul className="" data-owner="user-notification-project-list" id="notification-projects">
        {watchedProjects.map((project) => {
          const projectId = stringValue(project.projectId);
          const selected = projectId === activeProjectId;
          return (
            <li
              data-selected={selected ? "true" : "false"}
              className=""
              data-owner="user-notification-project-item"
              key={projectId}
            >
              <Link
                activeOptions={{
                  exact: true,
                  explicitUndefined: true,
                  includeHash: true,
                  includeSearch: true,
                }}
                activeProps={{
                  "aria-current": undefined,
                  "data-status": undefined,
                }}
                className=""
                data-owner="user-notification-project-link"
                hash={projectId}
                onClick={() => {
                  setSelectedProjectId(projectId);
                }}
                search={projectTabLinkInactiveSearch}
                to="/user/editform/notifications"
              >
                {`${stringValue(project.ownerName)} / ${stringValue(project.projectName)}`}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="" data-owner="user-notification-tab-content">
        {watchedProjects.map((project) => {
          const projectId = stringValue(project.projectId);
          const selected = projectId === activeProjectId;
          const notifications = Array.isArray(project.notifications)
            ? (project.notifications as NotificationRow[])
            : [];
          return (
            <div
              data-selected={selected ? "true" : "false"}
              className=""
              data-owner="user-notification-project-pane"
              id={projectId}
              key={projectId}
            >
              <table data-owner="user-notification-table">
                <tbody>
                  {NOTIFICATION_TYPES.map(([eventType, messageKey], rowIndex) => {
                    const enabled = isNotificationEnabled(notifications, eventType);
                    const firstRow = rowIndex === 0;
                    const lastRow = rowIndex === NOTIFICATION_TYPES.length - 1;
                    return (
                      <tr data-owner="user-notification-row" key={eventType}>
                        <th data-owner="user-notification-label-cell">{t(messageKey)}</th>
                        <td data-owner="user-notification-action-cell">
                          <button
                            aria-checked={enabled}
                            aria-label={`${t(messageKey)}: ${enabled ? "On" : "Off"}`}
                            data-owner="user-notification-switch"
                            onClick={() =>
                              toggleMutation.mutate({
                                checked: !enabled,
                                eventType,
                                projectId,
                              })
                            }
                            role="switch"
                            type="button"
                          >
                            <span>
                              <span data-owner="user-notification-switch-label">On</span>
                              <span>&nbsp;</span>
                              <span data-owner="user-notification-switch-label">Off</span>
                            </span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function activeProjectIdFromHash(watchedProjects: WatchedProjectRow[], hashProjectId: string) {
  const firstProjectId = stringValue(watchedProjects[0]?.projectId);
  return watchedProjects.some((project) => stringValue(project.projectId) === hashProjectId)
    ? hashProjectId
    : firstProjectId;
}

function normalizeProjectHash(hash: string) {
  return hash.replace(/^#/, "");
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
