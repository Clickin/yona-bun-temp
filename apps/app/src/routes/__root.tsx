import * as React from "react";
import { QueryClient } from "@tanstack/react-query";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import appCss from "../styles/app.css?url";

interface AppRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<AppRouterContext>()({
  head: () => ({
    meta: [
      {
        title: "Yona App Shell",
      },
      {
        name: "description",
        content: "Minimal TanStack Start shell for the Yona rewrite.",
      },
    ],
    links: appCss ? [{ rel: "stylesheet", href: appCss }] : [],
  }),
  component: RootRouteComponent,
  notFoundComponent: () => (
    <RootDocument>
      <div className="app-frame">
        <div className="hero-card">
          <p className="kicker">Not Found</p>
          <h1>This route is not part of the shell.</h1>
        </div>
      </div>
    </RootDocument>
  ),
});

function RootRouteComponent() {
  return (
    <RootDocument>
      <div className="app-frame">
        <div className="hero-card">
          <div className="hero-copy">
            <p className="kicker">Wave W2</p>
            <h1>Canonical app auth now lives in TanStack Start.</h1>
            <p className="lead">
              The active runtime is `apps/app`: server functions own internal auth flows, and server
              routes reserve canonical HTTP auth surfaces.
            </p>
          </div>
          <nav className="shell-nav">
            <Link to="/" activeProps={{ className: "nav-pill active" }} className="nav-pill">
              Home
            </Link>
            <Link
              to="/protected"
              activeProps={{ className: "nav-pill active" }}
              className="nav-pill"
            >
              Protected Route
            </Link>
            <Link to="/login" activeProps={{ className: "nav-pill active" }} className="nav-pill">
              Login
            </Link>
            <Link
              to="/register"
              activeProps={{ className: "nav-pill active" }}
              className="nav-pill"
            >
              Register
            </Link>
            <Link
              to="/forgot-password"
              activeProps={{ className: "nav-pill active" }}
              className="nav-pill"
            >
              Reset
            </Link>
          </nav>
        </div>
        <Outlet />
      </div>
      <TanStackRouterDevtools position="bottom-left" />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
