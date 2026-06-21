import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { readPublicUserProfileQueryOptions, type PublicUserProfileResponse } from "../../api/users";
import { useAppRuntime } from "../../app-runtime-context";
import type { WorkspaceOverviewViewModel } from "../-view-models";
import { PublicUserProfilePage } from "../-workspace-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  navigateToAppHref,
  NotFoundPage,
} from "../-shared";

export const Route = createFileRoute("/$user")({
  component: PublicUserProfileRouteComponent,
});

function publicProfileSearch() {
  if (typeof window === "undefined") {
    return { daysAgo: null, selected: null };
  }
  const searchParams = new URLSearchParams(window.location.search);
  const daysAgoText = searchParams.get("daysAgo");
  const daysAgo = daysAgoText ? Number.parseInt(daysAgoText, 10) : null;
  return {
    daysAgo: Number.isFinite(daysAgo) ? daysAgo : null,
    selected: searchParams.get("selected"),
  };
}

function anonymousSession(): WorkspaceOverviewViewModel["session"] {
  return {
    defaultLandingPath: "/me",
    emailAddress: "",
    isAnonymous: true,
    isConfirmed: false,
    isSiteAdmin: false,
    loginId: "anonymous",
    userLabel: "User.anonymous.name",
  };
}

function toPublicProfileOverview(
  response: PublicUserProfileResponse,
  session: WorkspaceOverviewViewModel["session"] | null,
): WorkspaceOverviewViewModel {
  return {
    daysAgo: response.daysAgo,
    defaultLandingPath: session?.defaultLandingPath ?? "/me",
    favoriteProjects: [],
    issueItems: response.issueItems.map((item) => ({
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
    memberProjects: response.memberProjects.map((project) => ({
      createdLabel: project.createdLabel,
      lastPushedLabel: project.lastPushedLabel,
      memberCount: project.memberCount,
      ownerName: project.ownerName,
      overview: project.overview,
      projectName: project.projectName,
      projectScope: project.projectScope,
      watchCount: project.watchCount,
    })),
    profile: response.profile
      ? {
          avatarUrl: response.profile.avatarUrl,
          connectedSocialProviders: [...response.profile.connectedSocialProviders],
          displayName: response.profile.displayName,
          englishName: response.profile.englishName,
          isBlocked: response.profile.isBlocked,
          isSiteAdmin: response.profile.isSiteAdmin,
          loginId: response.profile.loginId,
          primaryEmailAddress: response.profile.primaryEmailAddress,
          sinceLabel: response.profile.sinceLabel,
        }
      : undefined,
    pullRequestItems: response.pullRequestItems.map((item) => ({
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
    recentProjects: [],
    session: session ?? anonymousSession(),
    watchedProjects: [],
  };
}

function PublicUserProfileRouteComponent() {
  const { user } = Route.useParams();
  const { bootstrapping, currentSession, messages, runtimeConfig } = useAppRuntime();
  const [failureKind, setFailureKind] = React.useState<null | "bad-request" | "not-found">(null);
  const search = publicProfileSearch();
  const profileQuery = useQuery({
    ...readPublicUserProfileQueryOptions(runtimeConfig, {
      daysAgo: search.daysAgo,
      loginId: user,
      selected: search.selected,
    }),
    enabled: !bootstrapping,
  });

  React.useEffect(() => {
    if (profileQuery.data?.redirectPath) {
      navigateToAppHref(runtimeConfig.basePath, profileQuery.data.redirectPath);
    }
  }, [profileQuery.data?.redirectPath, runtimeConfig.basePath]);

  React.useEffect(() => {
    if (!profileQuery.error) {
      setFailureKind(null);
      return;
    }
    if (classifyConnectFailure(profileQuery.error) === "not-found") {
      setFailureKind("not-found");
      return;
    }
    setFailureKind("bad-request");
  }, [profileQuery.error]);

  if (bootstrapping || profileQuery.isPending || profileQuery.data?.redirectPath) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={`/${user}`} />;
  }
  if (failureKind === "bad-request") {
    return <BadRequestPage href={`/${user}`} />;
  }

  const session = currentSession
    ? {
        defaultLandingPath: currentSession.defaultLandingPath,
        emailAddress: currentSession.emailAddress,
        isAnonymous: currentSession.isAnonymous,
        isConfirmed: currentSession.isConfirmed,
        isSiteAdmin: currentSession.isSiteAdmin,
        loginId: currentSession.loginId,
        userLabel: currentSession.userLabel,
      }
    : null;

  return (
    <PublicUserProfilePage
      messages={messages}
      profileOverview={
        profileQuery.data ? toPublicProfileOverview(profileQuery.data, session) : null
      }
      routeHref={typeof window === "undefined" ? `/${user}` : window.location.href}
      runtimeConfig={runtimeConfig}
      viewerCanEditProfile={profileQuery.data?.viewerCanEditProfile ?? false}
    />
  );
}
