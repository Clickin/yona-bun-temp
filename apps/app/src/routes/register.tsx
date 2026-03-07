import * as React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { registerWithPassword } from "@app/lib/auth";
import { setCurrentSessionData } from "@app/lib/auth-shared";
import { currentSessionQueryOptions } from "@app/lib/queries";

const registerSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/register")({
  validateSearch: registerSearchSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(currentSessionQueryOptions()),
  component: RegisterRouteComponent,
});

function RegisterRouteComponent() {
  const session = useSuspenseQuery(currentSessionQueryOptions());
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = router.options.context.queryClient;
  const search = Route.useSearch();
  const redirectTo = search.redirect || "/protected";
  const [pending, setPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState({
    emailAddress: "",
    loginId: "",
    name: "",
    password: "",
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
        <strong>Register</strong>
        <p className="note">
          New accounts are owned by the canonical app runtime and sign in immediately after
          registration.
        </p>
        <div className="badge-row">
          <span className="badge">
            {session.data.isAnonymous ? "Guest mode" : `Signed in as ${session.data.userLabel}`}
          </span>
          <span className="badge">Redirect target: {redirectTo}</span>
        </div>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            setErrorMessage(null);

            React.startTransition(() => {
              void (async () => {
                try {
                  const result = await registerWithPassword({
                    data: formState,
                  });

                  if (!result.ok) {
                    setErrorMessage(result.message);
                    return;
                  }

                  setCurrentSessionData(queryClient, result.session);
                  await navigate({ to: redirectTo });
                } catch (error) {
                  setErrorMessage(error instanceof Error ? error.message : "Registration failed.");
                } finally {
                  setPending(false);
                }
              })();
            });
          }}
        >
          <label className="field">
            <span>Name</span>
            <input
              autoComplete="name"
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Door TTS"
              type="text"
              value={formState.name}
            />
          </label>
          <label className="field">
            <span>Login ID</span>
            <input
              autoComplete="username"
              onChange={(event) => updateField("loginId", event.target.value)}
              placeholder="doortts"
              type="text"
              value={formState.loginId}
            />
          </label>
          <label className="field">
            <span>Email address</span>
            <input
              autoComplete="email"
              onChange={(event) => updateField("emailAddress", event.target.value)}
              placeholder="doortts@gmail.com"
              type="email"
              value={formState.emailAddress}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              autoComplete="new-password"
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="strong-pass-123"
              type="password"
              value={formState.password}
            />
          </label>
          <div className="action-row">
            <button className="cta" type="submit">
              {pending ? "Creating account..." : "Create Account"}
            </button>
          </div>
        </form>
        <div className="link-row">
          <Link className="link-text" to="/login">
            Already have an account?
          </Link>
        </div>
        {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
      </article>
    </section>
  );
}
