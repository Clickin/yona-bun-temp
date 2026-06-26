import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import {
  cancelEnrollOrganization,
  enrollOrganization,
  leaveOrganization,
  readOrganizationContainer,
} from "../../../auth-workspace-client";
import { useAppRuntime } from "../../../app-runtime-context";
import { toOrganizationContainerView } from "../../../app-view-models";
import { RestApiError } from "../../../api/rest-client";
import {
  OrganizationDetailPage,
  OrganizationHeader,
  OrganizationMenu,
} from "../../-organization-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  navigateToAppHref,
  NotFoundPage,
} from "../../-shared";

export const Route = createFileRoute("/organizations/$organizationName")({
  component: OrganizationLayoutRouteComponent,
});

function OrganizationLayoutRouteComponent() {
  const { organizationName } = Route.useParams();
  const { bootstrapping, csrfToken, messages, runtimeConfig, setErrorMessage } = useAppRuntime();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const layoutShell = organizationLayoutShell(pathname, runtimeConfig.basePath, organizationName);

  if (!layoutShell) {
    return <Outlet />;
  }

  return (
    <OrganizationRouteShellLayout
      active={layoutShell.active}
      bootstrapping={bootstrapping}
      csrfToken={csrfToken}
      messages={messages}
      organizationName={organizationName}
      runtimeConfig={runtimeConfig}
      setErrorMessage={setErrorMessage}
      shellClassName={layoutShell.shellClassName}
      wrapPageOuter={layoutShell.wrapPageOuter}
    />
  );
}

function stripOrganizationLayoutBasePath(pathname: string, basePath: string): string {
  const normalizedBasePath = basePath && basePath !== "/" ? basePath.replace(/\/+$/u, "") : "";
  if (!normalizedBasePath) {
    return pathname || "/";
  }
  if (pathname === normalizedBasePath) {
    return "/";
  }
  if (pathname.startsWith(`${normalizedBasePath}/`)) {
    return pathname.slice(normalizedBasePath.length) || "/";
  }
  return pathname || "/";
}

function organizationLayoutShell(
  pathname: string,
  basePath: string,
  organizationName: string,
): {
  active?: "boards" | "home" | "issues" | "pullrequests" | "settings";
  shellClassName?: string;
  wrapPageOuter?: boolean;
} | null {
  const appPath = stripOrganizationLayoutBasePath(pathname, basePath).replace(/\/+$/u, "");
  if (appPath === `/organizations/${organizationName}`) {
    return { active: "home", shellClassName: "organization-page" };
  }
  if (appPath === `/organizations/${organizationName}/settingform`) {
    return { active: "settings", shellClassName: "organization-settings-shell" };
  }
  if (appPath === `/organizations/${organizationName}/issues`) {
    return { active: "issues" };
  }
  if (appPath === `/organizations/${organizationName}/boards`) {
    return { active: "boards", shellClassName: "board-page" };
  }
  if (
    appPath === `/organizations/${organizationName}/pullrequests` ||
    appPath === `/organizations/${organizationName}/closedPullrequests`
  ) {
    return { active: "pullrequests", shellClassName: "pull-request-page" };
  }
  if (appPath === `/organizations/${organizationName}/search`) {
    return { shellClassName: "search-page", wrapPageOuter: false };
  }
  if (
    appPath === `/organizations/${organizationName}/members` ||
    appPath === `/organizations/${organizationName}/deleteForm`
  ) {
    return {};
  }
  return null;
}

function legacyOrganizationEnrollFallback(error: unknown): string {
  if (error instanceof RestApiError) {
    if (error.status === 403) {
      return "error.forbidden";
    }
    if (error.status >= 400 && error.status < 500) {
      return "user.enroll.failed.client";
    }
    if (error.status >= 500 && error.status < 600) {
      return "user.enroll.failed.server";
    }
    return "user.enroll.failed";
  }
  if (error instanceof TypeError) {
    return "user.enroll.failed.network";
  }
  return "user.enroll.failed";
}

function OrganizationRouteShellLayout({
  active,
  bootstrapping,
  csrfToken,
  messages,
  organizationName,
  runtimeConfig,
  setErrorMessage,
  shellClassName,
  wrapPageOuter = true,
}: {
  active?: "boards" | "home" | "issues" | "pullrequests" | "settings";
  bootstrapping: boolean;
  csrfToken: string;
  messages: ReturnType<typeof useAppRuntime>["messages"];
  organizationName: string;
  runtimeConfig: ReturnType<typeof useAppRuntime>["runtimeConfig"];
  setErrorMessage: ReturnType<typeof useAppRuntime>["setErrorMessage"];
  shellClassName?: string;
  wrapPageOuter?: boolean;
}) {
  const containerQuery = useQuery({
    enabled: !bootstrapping,
    queryFn: () => readOrganizationContainer(runtimeConfig, organizationName),
    queryKey: ["api", "v1", "organizations", organizationName, "container"],
  });
  const failureKind = classifyConnectFailure(containerQuery.error);
  const routeHref = `/organizations/${organizationName}`;

  if (failureKind === "forbidden") {
    return <ForbiddenPage href={routeHref} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={routeHref} />;
  }
  if (containerQuery.error) {
    return <BadRequestPage href={routeHref} />;
  }
  if (bootstrapping || !containerQuery.data) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }

  const detail = toOrganizationContainerView(containerQuery.data);
  return (
    <main className={shellClassName ? `app-shell ${shellClassName}` : "app-shell"}>
      <OrganizationHeader
        detail={detail}
        messages={messages}
        runtimeConfig={runtimeConfig}
        onCancelEnrollOrganization={async (nextOrganizationName) => {
          try {
            await cancelEnrollOrganization(runtimeConfig, csrfToken, nextOrganizationName);
            await containerQuery.refetch();
          } catch (error) {
            setErrorMessage(legacyOrganizationEnrollFallback(error));
          }
        }}
        onEnrollOrganization={async (nextOrganizationName) => {
          try {
            await enrollOrganization(runtimeConfig, csrfToken, nextOrganizationName);
            await containerQuery.refetch();
          } catch (error) {
            setErrorMessage(legacyOrganizationEnrollFallback(error));
          }
        }}
      />
      <OrganizationMenu
        active={active}
        detail={detail}
        messages={messages}
        runtimeConfig={runtimeConfig}
      />
      {wrapPageOuter ? (
        <div className="page-wrap-outer">
          <Outlet />
        </div>
      ) : (
        <Outlet />
      )}
    </main>
  );
}

export function OrganizationDetailRouteComponent(props: { renderShell?: boolean } = {}) {
  const { organizationName } = Route.useParams();
  const { csrfToken, messages, runtimeConfig, setErrorMessage } = useAppRuntime();
  const [detail, setDetail] = React.useState<ReturnType<typeof toOrganizationContainerView> | null>(
    null,
  );

  const refreshContainer = React.useCallback(async () => {
    const nextDetail = await readOrganizationContainer(runtimeConfig, organizationName);
    setDetail(toOrganizationContainerView(nextDetail));
  }, [organizationName, runtimeConfig]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const nextDetail = await readOrganizationContainer(runtimeConfig, organizationName);
      if (!cancelled) {
        setDetail(toOrganizationContainerView(nextDetail));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationName, runtimeConfig]);

  return (
    <OrganizationDetailPage
      detail={detail}
      messages={messages}
      renderShell={props.renderShell}
      runtimeConfig={runtimeConfig}
      onCancelEnrollOrganization={async (nextOrganizationName) => {
        try {
          const nextDetail = await cancelEnrollOrganization(
            runtimeConfig,
            csrfToken,
            nextOrganizationName,
          );
          setDetail(toOrganizationContainerView(nextDetail));
        } catch (error) {
          setErrorMessage(legacyOrganizationEnrollFallback(error));
        }
      }}
      onEnrollOrganization={async (nextOrganizationName) => {
        try {
          const nextDetail = await enrollOrganization(
            runtimeConfig,
            csrfToken,
            nextOrganizationName,
          );
          setDetail(toOrganizationContainerView(nextDetail));
        } catch (error) {
          setErrorMessage(legacyOrganizationEnrollFallback(error));
        }
      }}
      onLeaveOrganization={async (nextOrganizationName) => {
        try {
          const result = await leaveOrganization(runtimeConfig, csrfToken, nextOrganizationName);
          if (result.redirectPath) {
            navigateToAppHref(runtimeConfig.basePath, result.redirectPath);
            return;
          }
          await refreshContainer();
        } catch (error) {
          setErrorMessage(
            error instanceof Error ? error.message : "organization.member.leave.unknownerror",
          );
        }
      }}
    />
  );
}
