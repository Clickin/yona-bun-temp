import { createFileRoute } from "@tanstack/react-router";
import { useAppRuntime } from "../../app-runtime-context";
import { RestrictedPage } from "../-restricted-view";
import { useDocumentTitle, useRequireAuthenticatedRoute } from "../-shared";

export const Route = createFileRoute("/restricted")({
  component: RestrictedRouteComponent,
});

function RestrictedRouteComponent() {
  useDocumentTitle("Yona");
  const { bootstrapping, currentSession } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute("/restricted");

  if (bootstrapping || !canRender || !currentSession || currentSession.isAnonymous) {
    return (
      <main className="app-shell">
        <h1>common.loading</h1>
      </main>
    );
  }

  return (
    <RestrictedPage
      emailAddress={currentSession.emailAddress}
      isConfirmed={currentSession.isConfirmed}
      loginId={currentSession.loginId}
      userLabel={currentSession.userLabel}
    />
  );
}
