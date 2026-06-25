import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  renderWorkspaceSettings,
  testLegacyMessages,
  testRuntimeConfig,
} from "./auth-workspace-shell.test-helpers";
import {
  WORKSPACE_AVATAR_ONLY_IMAGE_MESSAGE,
  WorkspaceSettingsPage,
  workspaceAvatarUploadErrorForMimeType,
  workspaceNotificationActiveProjectId,
} from "./routes/-workspace-settings-view";
import type { WorkspaceOverviewViewModel } from "./routes/-view-models";

const workspaceOverview: WorkspaceOverviewViewModel = {
  apiToken: "door-token",
  defaultLandingPath: "/me",
  emails: [],
  favoriteProjects: [],
  profile: {
    avatarUrl: "",
    connectedSocialProviders: [],
    displayName: "Door",
    englishName: "",
    isBlocked: false,
    isGuest: false,
    isSiteAdmin: false,
    loginId: "door",
    primaryEmailAddress: "door@example.com",
    sinceLabel: "2026-06-26",
  },
  recentProjects: [],
  session: {
    defaultLandingPath: "/me",
    emailAddress: "door@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: false,
    loginId: "door",
    userLabel: "Door",
  },
  watchedProjects: [
    {
      notifications: [{ enabled: true, eventType: "NEW_ISSUE", label: "New issue" }],
      ownerName: "admin",
      projectId: "1",
      projectName: "projectYobi",
    },
    {
      notifications: [{ enabled: false, eventType: "NEW_COMMENT", label: "New comment" }],
      ownerName: "weblabs",
      projectId: "2",
      projectName: "projectTwo",
    },
  ],
};

describe("workspace settings browser-visible parity proof", () => {
  it("activates the notification project tab addressed by the URL hash", () => {
    expect(
      workspaceNotificationActiveProjectId("/user/editform/notifications#2", [
        { projectId: "1" },
        { projectId: "2" },
      ]),
    ).toBe("2");
    expect(
      workspaceNotificationActiveProjectId("/user/editform/notifications#missing", [
        { projectId: "1" },
        { projectId: "2" },
      ]),
    ).toBe("1");

    const html = renderWorkspaceSettings(
      "notifications",
      "/user/editform/notifications#2",
      workspaceOverview,
    );

    expect(html).toContain('<li><a data-toggle="tab" href="#1">admin / projectYobi</a></li>');
    expect(html).toContain(
      '<li class="active"><a data-toggle="tab" href="#2">weblabs / projectTwo</a></li>',
    );
    expect(html).toContain('<div class="tab-pane " id="1">');
    expect(html).toContain('<div class="tab-pane active" id="2">');
  });

  it("renders invalid avatar image feedback through legacy copy and keeps crop modal hidden until image selection", () => {
    expect(workspaceAvatarUploadErrorForMimeType("text/plain")).toBe(
      WORKSPACE_AVATAR_ONLY_IMAGE_MESSAGE,
    );

    const html = renderToStaticMarkup(
      <WorkspaceSettingsPage
        messages={testLegacyMessages}
        routeHref="/user/editform"
        runtimeConfig={testRuntimeConfig}
        section="profile"
        workspaceOverview={workspaceOverview}
      />,
    );

    expect(html).toContain('id="avatarFile"');
    expect(html).toContain('accept="image/*"');
    expect(html).toContain('id="avatarCropWrap"');
    expect(html).toContain('class="modal hide"');
    expect(html).toContain('hidden=""');
    expect(html).toContain("Cancel");
    expect(html).toContain("Save");
    expect(testLegacyMessages(WORKSPACE_AVATAR_ONLY_IMAGE_MESSAGE)).toBe(
      "Only image files are allowed to be uploaded.",
    );
  });
});
