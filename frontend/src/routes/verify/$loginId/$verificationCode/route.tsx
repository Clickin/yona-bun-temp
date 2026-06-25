import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { verifyUser } from "../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../app-runtime-context";
import { VerifyUserPage } from "../../../-auth-views";
import { useDocumentTitle } from "../../../-shared";

export const Route = createFileRoute("/verify/$loginId/$verificationCode")({
  component: VerifyUserRouteComponent,
});

function VerifyUserRouteComponent() {
  const { loginId, verificationCode } = Route.useParams();
  const { messages, runtimeConfig, setErrorMessage } = useAppRuntime();
  const [status, setStatus] = React.useState<"invalid" | "pending" | "success">("pending");
  const [resolvedLoginId, setResolvedLoginId] = React.useState(loginId);
  useDocumentTitle("user.verification");

  React.useEffect(() => {
    let cancelled = false;
    setStatus("pending");

    void (async () => {
      try {
        const response = await verifyUser(runtimeConfig, {
          loginId,
          verificationCode,
        });
        if (!cancelled) {
          setStatus("success");
          setResolvedLoginId(response.loginId || loginId);
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("invalid");
          setResolvedLoginId(loginId);
          setErrorMessage(error instanceof Error ? error.message : "Invalid verification");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loginId, runtimeConfig, setErrorMessage, verificationCode]);

  if (status === "pending") {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }

  return (
    <VerifyUserPage
      invalid={status === "invalid"}
      loginId={resolvedLoginId}
      runtimeConfig={runtimeConfig}
    />
  );
}
