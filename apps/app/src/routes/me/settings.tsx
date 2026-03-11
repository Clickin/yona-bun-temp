import * as React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { buildProtectedRedirect } from "@app/lib/auth";
import { setCurrentSessionData } from "@app/lib/auth-shared";
import { currentSessionQueryOptions } from "@app/lib/queries";
import { updateProjectNotificationPreference } from "@app/lib/me";

export const Route = createFileRoute("/me/settings")({
  beforeLoad: async ({ context, location }) => {
    const redirectTarget = buildProtectedRedirect(
      await context.authCaller.readCurrentSession(),
      location.href,
    );
    if (redirectTarget) {
      throw redirect(redirectTarget);
    }
  },
  component: MeSettingsRouteComponent,
});

function MeSettingsRouteComponent() {
  const router = useRouter();
  const authCaller = router.options.context.authCaller;
  const queryClient = router.options.context.queryClient;
  const session = useSuspenseQuery(currentSessionQueryOptions(authCaller));

  const [profilePending, setProfilePending] = React.useState(false);
  const [profileErrorMessage, setProfileErrorMessage] = React.useState<null | string>(null);
  const [profileResultMessage, setProfileResultMessage] = React.useState<null | string>(null);
  const [profileFormState, setProfileFormState] = React.useState({
    emailAddress: session.data.emailAddress ?? "",
    name: session.data.userLabel ?? "",
  });

  const [passwordPending, setPasswordPending] = React.useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = React.useState<null | string>(null);
  const [passwordResultMessage, setPasswordResultMessage] = React.useState<null | string>(null);
  const [passwordFormState, setPasswordFormState] = React.useState({
    currentPassword: "",
    newPassword: "",
  });

  const [pending, setPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<null | string>(null);
  const [resultMessage, setResultMessage] = React.useState<null | string>(null);
  const [formState, setFormState] = React.useState({
    allowed: true,
    notificationType: "watch",
    ownerName: "",
    projectName: "",
  });

  const updateField = (field: keyof typeof formState, value: boolean | string) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateProfileField = (field: keyof typeof profileFormState, value: string) => {
    setProfileFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updatePasswordField = (field: keyof typeof passwordFormState, value: string) => {
    setPasswordFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <section className="panel-grid">
      <article className="login-panel">
        <strong>My Settings</strong>
        <p className="note">
          Manage profile, email, password, and personal notification preferences.
        </p>
        <div className="badge-row">
          <span className="badge">Login ID: {session.data.loginId ?? "unknown"}</span>
          <span className="badge">Email: {session.data.emailAddress ?? "unknown"}</span>
        </div>

        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            setProfilePending(true);
            setProfileErrorMessage(null);
            setProfileResultMessage(null);

            React.startTransition(() => {
              void (async () => {
                try {
                  const updatedSession = await authCaller.updateCurrentUserProfile({
                    emailAddress: profileFormState.emailAddress,
                    name: profileFormState.name,
                  });

                  setCurrentSessionData(queryClient, updatedSession);
                  setProfileResultMessage("Profile updated.");
                } catch (error) {
                  setProfileErrorMessage(
                    error instanceof Error ? error.message : "Failed to update profile.",
                  );
                } finally {
                  setProfilePending(false);
                }
              })();
            });
          }}
        >
          <label className="field">
            <span>Display Name</span>
            <input
              autoComplete="name"
              onChange={(event) => updateProfileField("name", event.target.value)}
              placeholder="Door TTS"
              type="text"
              value={profileFormState.name}
            />
          </label>
          <label className="field">
            <span>Email Address</span>
            <input
              autoComplete="email"
              onChange={(event) => updateProfileField("emailAddress", event.target.value)}
              placeholder="door@example.com"
              type="email"
              value={profileFormState.emailAddress}
            />
          </label>
          <div className="action-row">
            <button className="cta" type="submit">
              {profilePending ? "Saving profile..." : "Save Profile"}
            </button>
          </div>
        </form>
        {profileResultMessage ? <p className="note">{profileResultMessage}</p> : null}
        {profileErrorMessage ? <p className="note error-note">{profileErrorMessage}</p> : null}

        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            setPasswordPending(true);
            setPasswordErrorMessage(null);
            setPasswordResultMessage(null);

            React.startTransition(() => {
              void (async () => {
                try {
                  const result = await authCaller.changeCurrentUserPassword({
                    currentPassword: passwordFormState.currentPassword,
                    newPassword: passwordFormState.newPassword,
                  });

                  if (!result.ok) {
                    setPasswordErrorMessage(result.message);
                    return;
                  }

                  setPasswordResultMessage("Password updated. Please sign in again.");
                  await router.navigate({
                    to: "/login",
                  });
                } catch (error) {
                  setPasswordErrorMessage(
                    error instanceof Error ? error.message : "Failed to change password.",
                  );
                } finally {
                  setPasswordPending(false);
                }
              })();
            });
          }}
        >
          <label className="field">
            <span>Current Password</span>
            <input
              autoComplete="current-password"
              onChange={(event) => updatePasswordField("currentPassword", event.target.value)}
              placeholder="current password"
              type="password"
              value={passwordFormState.currentPassword}
            />
          </label>
          <label className="field">
            <span>New Password</span>
            <input
              autoComplete="new-password"
              onChange={(event) => updatePasswordField("newPassword", event.target.value)}
              placeholder="new strong password"
              type="password"
              value={passwordFormState.newPassword}
            />
          </label>
          <div className="action-row">
            <button className="cta" type="submit">
              {passwordPending ? "Updating password..." : "Change Password"}
            </button>
          </div>
        </form>
        {passwordResultMessage ? <p className="note">{passwordResultMessage}</p> : null}
        {passwordErrorMessage ? <p className="note error-note">{passwordErrorMessage}</p> : null}

        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            setErrorMessage(null);
            setResultMessage(null);

            React.startTransition(() => {
              void (async () => {
                try {
                  const result = await updateProjectNotificationPreference({
                    data: {
                      allowed: formState.allowed,
                      notificationType: formState.notificationType,
                      ownerName: formState.ownerName,
                      projectName: formState.projectName,
                    },
                  });

                  setResultMessage(
                    `${result.ownerName}/${result.projectName} ${result.notificationType}: ${result.allowed ? "enabled" : "disabled"}`,
                  );
                } catch (error) {
                  setErrorMessage(
                    error instanceof Error
                      ? error.message
                      : "Failed to update notification settings.",
                  );
                } finally {
                  setPending(false);
                }
              })();
            });
          }}
        >
          <label className="field">
            <span>Owner</span>
            <input
              onChange={(event) => updateField("ownerName", event.target.value)}
              placeholder="yona"
              type="text"
              value={formState.ownerName}
            />
          </label>
          <label className="field">
            <span>Project</span>
            <input
              onChange={(event) => updateField("projectName", event.target.value)}
              placeholder="yona"
              type="text"
              value={formState.projectName}
            />
          </label>
          <label className="field">
            <span>Notification Type</span>
            <input
              onChange={(event) => updateField("notificationType", event.target.value)}
              placeholder="watch"
              type="text"
              value={formState.notificationType}
            />
          </label>
          <label className="field checkbox-field">
            <span>Allowed</span>
            <input
              checked={formState.allowed}
              onChange={(event) => updateField("allowed", event.target.checked)}
              type="checkbox"
            />
          </label>
          <div className="action-row">
            <button className="cta" type="submit">
              {pending ? "Saving..." : "Save Preference"}
            </button>
          </div>
        </form>
        {resultMessage ? <p className="note">{resultMessage}</p> : null}
        {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
      </article>
    </section>
  );
}
