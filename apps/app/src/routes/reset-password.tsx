import * as React from "react";
import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { completePasswordReset } from "@app/lib/auth";
import { currentSessionQueryKey } from "@app/lib/auth-shared";

const resetPasswordSearchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute("/reset-password")({
  validateSearch: resetPasswordSearchSchema,
  component: ResetPasswordRouteComponent,
});

function ResetPasswordRouteComponent() {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = router.options.context.queryClient;
  const search = Route.useSearch();
  const [pending, setPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [token, setToken] = React.useState(search.token ?? "");
  const [newPassword, setNewPassword] = React.useState("");

  return (
    <section className="panel-grid">
      <article className="login-panel">
        <strong>Reset password</strong>
        <p className="note">
          Password rotation invalidates all active sessions for the target account.
        </p>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            setErrorMessage(null);

            React.startTransition(() => {
              void (async () => {
                try {
                  const result = await completePasswordReset({
                    data: {
                      newPassword,
                      token,
                    },
                  });

                  if (!result.ok) {
                    setErrorMessage(result.message);
                    return;
                  }

                  await queryClient.invalidateQueries({
                    queryKey: currentSessionQueryKey,
                  });
                  await navigate({
                    search: {
                      reset: "1",
                    },
                    to: "/login",
                  });
                } catch (error) {
                  setErrorMessage(
                    error instanceof Error ? error.message : "Unable to reset the password.",
                  );
                } finally {
                  setPending(false);
                }
              })();
            });
          }}
        >
          <label className="field">
            <span>Reset token</span>
            <input
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste the reset token"
              type="text"
              value={token}
            />
          </label>
          <label className="field">
            <span>New password</span>
            <input
              autoComplete="new-password"
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="changed-pass-456"
              type="password"
              value={newPassword}
            />
          </label>
          <div className="action-row">
            <button className="cta" type="submit">
              {pending ? "Applying reset..." : "Reset Password"}
            </button>
          </div>
        </form>
        <div className="link-row">
          <Link className="link-text" to="/login">
            Back to sign in
          </Link>
        </div>
        {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
      </article>
    </section>
  );
}
