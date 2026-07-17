import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useState } from "react";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { readWorkspaceOverviewRest, toggleWorkspaceNotificationRest } from "../../../api/workspace";
import { useLegacyMessages } from "../../../i18n";
import type { RuntimeConfig } from "../../../runtime-config";
import { notificationProjectTabsColors, notificationTableColors } from "./-notifications.stylex";

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

const styles = stylex.create({
  projectList: {
    float: "left",
    listStyle: "none",
    margin: "0px 20px 0px 0px",
    padding: "0px",
    width: "220px",
  },
  projectItem: {
    fontSize: "13px",
    padding: "8px",
  },
  projectItemSelected: {
    backgroundColor: notificationProjectTabsColors.selectedSurface,
    borderRadius: "6px",
    color: notificationProjectTabsColors.selectedText,
    fontWeight: "700",
    overflow: "auto",
  },
  projectLink: { display: "block" },
  projectLinkSelected: {
    color: { ":hover": notificationProjectTabsColors.selectedText },
  },
  tabContent: { overflow: "hidden" },
  projectPane: { display: "none" },
  projectPaneSelected: { display: "block" },
  notificationTable: {
    backgroundColor: "transparent",
    borderBottomColor: notificationTableColors.tableBorder,
    borderBottomLeftRadius: "4px",
    borderBottomRightRadius: "4px",
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderCollapse: "separate",
    borderLeftWidth: "0px",
    borderRightColor: notificationTableColors.tableBorder,
    borderRightStyle: "solid",
    borderRightWidth: "1px",
    borderSpacing: "0px",
    borderTopColor: notificationTableColors.tableBorder,
    borderTopLeftRadius: "4px",
    borderTopRightRadius: "4px",
    borderTopStyle: "solid",
    borderTopWidth: "1px",
    marginBottom: "20px",
    maxWidth: "100%",
    width: "100%",
  },
  notificationRow: { verticalAlign: "middle" },
  notificationCell: {
    borderLeftColor: notificationTableColors.tableBorder,
    borderLeftStyle: "solid",
    borderLeftWidth: "1px",
    borderTopColor: notificationTableColors.tableBorder,
    borderTopStyle: "solid",
    borderTopWidth: "1px",
    lineHeight: "20px",
    padding: "8px",
    textAlign: "left",
    verticalAlign: "top",
  },
  notificationLabelCell: { fontWeight: "700" },
  notificationActionCell: { fontWeight: "400" },
  stripedCell: { backgroundColor: notificationTableColors.stripedSurface },
  firstCell: { borderTopWidth: "0px" },
  firstLabelCell: { borderTopLeftRadius: "4px" },
  firstActionCell: { borderTopRightRadius: "4px" },
  lastLabelCell: { borderBottomLeftRadius: "4px" },
  lastActionCell: { borderBottomRightRadius: "4px" },
  notificationSwitch: {
    appearance: "none",
    backgroundColor: "transparent",
    borderWidth: "0px",
    borderRadius: "30px",
    boxSizing: "content-box",
    cursor: "pointer",
    display: "inline-block",
    fontFamily: "inherit",
    fontSize: "13px",
    height: "29px",
    lineHeight: "1.231",
    margin: "0px",
    overflow: "hidden",
    padding: "0px",
    position: "relative",
    textAlign: "left",
    verticalAlign: "baseline",
    width: "80px",
    userSelect: "none",
  },
  switchTrack: {
    height: "0px",
    left: "0%",
    position: "relative",
    top: "0px",
    transition: "left 0.25s ease-out",
    width: "162%",
  },
  switchTrackOff: { left: "-63%" },
  switchLabel: {
    boxSizing: "border-box",
    color: notificationTableColors.switchText,
    cursor: "pointer",
    display: "block",
    float: "left",
    fontSize: "13px",
    fontWeight: "700",
    height: "29px",
    lineHeight: "19px",
    margin: "0px",
    paddingBottom: "5px",
    paddingTop: "5px",
    position: "relative",
    textAlign: "center",
    transition: "all 0.25s ease-out",
    width: "50%",
    zIndex: 1,
  },
  switchOnLabel: {
    backgroundColor: {
      default: notificationTableColors.switchOn,
      ":hover": notificationTableColors.switchOnHover,
    },
    borderRadius: "30px 0px 0px 30px",
    borderLeftColor: "transparent",
  },
  switchOffLabel: {
    backgroundColor: {
      default: notificationTableColors.switchOff,
      ":hover": notificationTableColors.switchOffHover,
    },
    borderRadius: "0px 30px 30px 0px",
    textIndent: "5px",
  },
  switchKnob: {
    backgroundColor: notificationTableColors.knobSurface,
    borderRadius: "50%",
    borderStyle: "solid",
    borderWidth: "4px",
    boxSizing: "content-box",
    cursor: "pointer",
    display: "block",
    float: "left",
    height: "21px",
    margin: "0px -15px 0px -14px",
    padding: "0px",
    position: "relative",
    transition: "all 0.25s ease-out",
    verticalAlign: "middle",
    width: "21px",
    zIndex: 100,
  },
  switchKnobOn: { borderColor: notificationTableColors.switchOn },
  switchKnobOff: {
    borderColor: notificationTableColors.switchOff,
    boxShadow: "-1px 0px 0px rgba(255, 255, 255, 0.5)",
  },
});

const projectListStyleProps = stylex.props(styles.projectList);
const tabContentStyleProps = stylex.props(styles.tabContent);
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
      <ul
        {...projectListStyleProps}
        data-stylex-owner="user-notification-project-list"
        id="notification-projects"
      >
        {watchedProjects.map((project) => {
          const projectId = stringValue(project.projectId);
          const selected = projectId === activeProjectId;
          const itemStyleProps = stylex.props(
            styles.projectItem,
            selected && styles.projectItemSelected,
          );
          const linkStyleProps = stylex.props(
            styles.projectLink,
            selected && styles.projectLinkSelected,
          );
          return (
            <li
              {...itemStyleProps}
              data-selected={selected ? "true" : "false"}
              data-stylex-owner="user-notification-project-item"
              key={projectId}
            >
              <Link
                {...linkStyleProps}
                activeOptions={{
                  exact: true,
                  explicitUndefined: true,
                  includeHash: true,
                  includeSearch: true,
                }}
                activeProps={{
                  "aria-current": undefined,
                  className: linkStyleProps.className,
                  "data-status": undefined,
                }}
                className={linkStyleProps.className}
                data-stylex-owner="user-notification-project-link"
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
      <div {...tabContentStyleProps} data-stylex-owner="user-notification-tab-content">
        {watchedProjects.map((project) => {
          const projectId = stringValue(project.projectId);
          const selected = projectId === activeProjectId;
          const notifications = Array.isArray(project.notifications)
            ? (project.notifications as NotificationRow[])
            : [];
          const paneStyleProps = stylex.props(
            styles.projectPane,
            selected && styles.projectPaneSelected,
          );
          return (
            <div
              {...paneStyleProps}
              data-selected={selected ? "true" : "false"}
              data-stylex-owner="user-notification-project-pane"
              id={projectId}
              key={projectId}
            >
              <table
                {...stylex.props(styles.notificationTable)}
                data-stylex-owner="user-notification-table"
              >
                <tbody>
                  {NOTIFICATION_TYPES.map(([eventType, messageKey], rowIndex) => {
                    const enabled = isNotificationEnabled(notifications, eventType);
                    const firstRow = rowIndex === 0;
                    const lastRow = rowIndex === NOTIFICATION_TYPES.length - 1;
                    const striped = rowIndex % 2 === 0;
                    return (
                      <tr
                        {...stylex.props(styles.notificationRow)}
                        data-stylex-owner="user-notification-row"
                        key={eventType}
                      >
                        <th
                          {...stylex.props(
                            styles.notificationCell,
                            styles.notificationLabelCell,
                            striped && styles.stripedCell,
                            firstRow && styles.firstCell,
                            firstRow && styles.firstLabelCell,
                            lastRow && styles.lastLabelCell,
                          )}
                          data-stylex-owner="user-notification-label-cell"
                        >
                          {t(messageKey)}
                        </th>
                        <td
                          {...stylex.props(
                            styles.notificationCell,
                            styles.notificationActionCell,
                            striped && styles.stripedCell,
                            firstRow && styles.firstCell,
                            firstRow && styles.firstActionCell,
                            lastRow && styles.lastActionCell,
                          )}
                          data-stylex-owner="user-notification-action-cell"
                        >
                          <button
                            {...stylex.props(styles.notificationSwitch)}
                            aria-checked={enabled}
                            aria-label={`${t(messageKey)}: ${enabled ? "On" : "Off"}`}
                            data-stylex-owner="user-notification-switch"
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
                            <span
                              {...stylex.props(
                                styles.switchTrack,
                                !enabled && styles.switchTrackOff,
                              )}
                            >
                              <span
                                {...stylex.props(styles.switchLabel, styles.switchOnLabel)}
                                data-stylex-owner="user-notification-switch-label"
                              >
                                On
                              </span>
                              <span
                                {...stylex.props(
                                  styles.switchKnob,
                                  enabled ? styles.switchKnobOn : styles.switchKnobOff,
                                )}
                              >
                                &nbsp;
                              </span>
                              <span
                                {...stylex.props(styles.switchLabel, styles.switchOffLabel)}
                                data-stylex-owner="user-notification-switch-label"
                              >
                                Off
                              </span>
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
