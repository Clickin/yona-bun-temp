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
  const { runtimeConfig, setErrorMessage } = useAppRuntime();
  const [invalid, setInvalid] = React.useState(false);
  const [resolvedLoginId, setResolvedLoginId] = React.useState(loginId);
  useDocumentTitle("Verify User");

  React.useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await verifyUser(runtimeConfig, {
          loginId,
          verificationCode,
        });
        if (!cancelled) {
          setInvalid(false);
          setResolvedLoginId(response.loginId || loginId);
        }
      } catch (error) {
        if (!cancelled) {
          setInvalid(true);
          setResolvedLoginId(loginId);
          setErrorMessage(error instanceof Error ? error.message : "Invalid verification");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loginId, runtimeConfig, setErrorMessage, verificationCode]);

  return (
    <VerifyUserPage
      invalid={invalid}
      loginId={resolvedLoginId}
      runtimeConfig={runtimeConfig}
    />
  );
}
