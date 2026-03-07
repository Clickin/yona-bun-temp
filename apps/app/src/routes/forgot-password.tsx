import * as React from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { requestPasswordReset } from "@app/lib/auth";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordRouteComponent,
});

function ForgotPasswordRouteComponent() {
  const [pending, setPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [formState, setFormState] = React.useState({
    emailAddress: "",
    loginId: "",
  });

  const updateField = (field: keyof typeof formState, value: string) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <section className="panel-grid">
      <article className="login-panel">
        <strong>Forgot password</strong>
        <p className="note">
          Legacy parity still requires a login ID and email match. The browser response stays
          generic, and reset material remains server-owned.
        </p>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            setErrorMessage(null);
            setSubmitted(false);

            React.startTransition(() => {
              void (async () => {
                try {
                  const result = await requestPasswordReset({
                    data: formState,
                  });
                  if (!result.ok) {
                    setErrorMessage(result.message);
                    return;
                  }
                  setSubmitted(true);
                } catch (error) {
                  setErrorMessage(
                    error instanceof Error ? error.message : "Unable to request password reset.",
                  );
                } finally {
                  setPending(false);
                }
              })();
            });
          }}
        >
          <label className="field">
            <span>Login ID</span>
            <input
              onChange={(event) => updateField("loginId", event.target.value)}
              placeholder="doortts"
              type="text"
              value={formState.loginId}
            />
          </label>
          <label className="field">
            <span>Email address</span>
            <input
              onChange={(event) => updateField("emailAddress", event.target.value)}
              placeholder="doortts@gmail.com"
              type="email"
              value={formState.emailAddress}
            />
          </label>
          <div className="action-row">
            <button className="cta" type="submit">
              {pending ? "Preparing reset..." : "Request Reset"}
            </button>
          </div>
        </form>
        <p className="note">
          {submitted
            ? "If the login ID and email address matched, reset instructions were emailed without exposing the token to the browser."
            : "The response stays generic even when the account does not exist, matching the legacy controller contract."}
        </p>
        <div className="link-row">
          <Link className="link-text" to="/reset-password">
            I already have a reset token
          </Link>
        </div>
        {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
      </article>
    </section>
  );
}
