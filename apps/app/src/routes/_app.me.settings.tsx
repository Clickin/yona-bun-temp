import * as React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { ContentCard, WorkspaceShell } from "@app/components/parity-shells";
import { buildProtectedRedirect } from "@app/lib/auth";
import { setCurrentSessionData } from "@app/lib/auth-shared";
import { useTranslate } from "@app/lib/i18n-react";
import { currentSessionQueryOptions } from "@app/lib/queries";
import { readMySidebar, updateProjectNotificationPreference } from "@app/lib/me";

export const Route = createFileRoute("/_app/me/settings")({
  beforeLoad: async ({ context, location }) => {
    const redirectTarget = buildProtectedRedirect(
      await context.authCaller.readCurrentSession(),
      location.href,
    );
    if (redirectTarget) {
      throw redirect(redirectTarget);
    }
  },
  loader: () => readMySidebar(),
  component: MeSettingsRouteComponent,
});

function MeSettingsRouteComponent() {
  const router = useRouter();
  const sidebar = Route.useLoaderData();
  const authCaller = router.options.context.authCaller;
  const queryClient = router.options.context.queryClient;
  const session = useSuspenseQuery(currentSessionQueryOptions(authCaller));
  const t = useTranslate();

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
    <WorkspaceShell
      activeTab="settings"
      description={t("app.settings.description")}
      sidebar={sidebar}
      title={t("app.settings.title")}
    >
      <ContentCard title={t("app.settings.profile")}>
        <div className="badge-row">
          <span className="badge">{t("app.settings.loginId", session.data.loginId ?? "-")}</span>
          <span className="badge">{t("app.settings.email", session.data.emailAddress ?? "-")}</span>
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
                  setProfileResultMessage(t("app.settings.profileSaved"));
                } catch (error) {
                  setProfileErrorMessage(
                    error instanceof Error ? error.message : t("app.settings.profileSaveFailed"),
                  );
                } finally {
                  setProfilePending(false);
                }
              })();
            });
          }}
        >
          <label className="field">
            <span>{t("app.settings.displayName")}</span>
            <input
              autoComplete="name"
              onChange={(event) => updateProfileField("name", event.target.value)}
              placeholder={t("app.settings.displayName")}
              type="text"
              value={profileFormState.name}
            />
          </label>
          <label className="field">
            <span>{t("app.settings.emailAddress")}</span>
            <input
              autoComplete="email"
              onChange={(event) => updateProfileField("emailAddress", event.target.value)}
              placeholder={t("app.settings.emailAddress")}
              type="email"
              value={profileFormState.emailAddress}
            />
          </label>
          <div className="action-row">
            <button className="cta" type="submit">
              {profilePending ? t("app.settings.savingProfile") : t("app.settings.saveProfile")}
            </button>
          </div>
        </form>
        {profileResultMessage ? <p className="note">{profileResultMessage}</p> : null}
        {profileErrorMessage ? <p className="note error-note">{profileErrorMessage}</p> : null}
      </ContentCard>

      <ContentCard title={t("app.settings.defaultLanding")}>
        <div className="badge-row">
          <span className="badge">{session.data.defaultLandingPath ?? "/me"}</span>
        </div>
        <p className="note">
          {session.data.defaultLandingPath
            ? t("app.settings.defaultLandingSaved")
            : t("app.settings.defaultLandingFallback")}
        </p>
      </ContentCard>
      <div className="content-grid">
        <ContentCard title={t("app.settings.password")}>
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

                    setPasswordResultMessage(t("app.settings.passwordUpdated"));
                    await router.navigate({
                      to: "/login",
                    });
                  } catch (error) {
                    setPasswordErrorMessage(
                      error instanceof Error ? error.message : t("app.settings.changePassword"),
                    );
                  } finally {
                    setPasswordPending(false);
                  }
                })();
              });
            }}
          >
            <label className="field">
              <span>{t("app.settings.currentPassword")}</span>
              <input
                autoComplete="current-password"
                onChange={(event) => updatePasswordField("currentPassword", event.target.value)}
                placeholder={t("app.settings.currentPassword")}
                type="password"
                value={passwordFormState.currentPassword}
              />
            </label>
            <label className="field">
              <span>{t("user.newPassword")}</span>
              <input
                autoComplete="new-password"
                onChange={(event) => updatePasswordField("newPassword", event.target.value)}
                placeholder={t("user.newPassword")}
                type="password"
                value={passwordFormState.newPassword}
              />
            </label>
            <div className="action-row">
              <button className="cta" type="submit">
                {passwordPending
                  ? t("app.settings.updatingPassword")
                  : t("app.settings.changePassword")}
              </button>
            </div>
          </form>
          {passwordResultMessage ? <p className="note">{passwordResultMessage}</p> : null}
          {passwordErrorMessage ? <p className="note error-note">{passwordErrorMessage}</p> : null}
        </ContentCard>

        <ContentCard title={t("app.settings.projectNotifications")}>
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
                    await updateProjectNotificationPreference({
                      data: {
                        allowed: formState.allowed,
                        notificationType: formState.notificationType,
                        ownerName: formState.ownerName,
                        projectName: formState.projectName,
                      },
                    });

                    setResultMessage(t("app.settings.preferenceSaved"));
                  } catch (error) {
                    setErrorMessage(
                      error instanceof Error
                        ? error.message
                        : t("app.settings.preferenceSaveFailed"),
                    );
                  } finally {
                    setPending(false);
                  }
                })();
              });
            }}
          >
            <label className="field">
              <span>{t("app.search.owner")}</span>
              <input
                onChange={(event) => updateField("ownerName", event.target.value)}
                placeholder={t("app.search.owner")}
                type="text"
                value={formState.ownerName}
              />
            </label>
            <label className="field">
              <span>{t("app.search.project")}</span>
              <input
                onChange={(event) => updateField("projectName", event.target.value)}
                placeholder={t("app.search.project")}
                type="text"
                value={formState.projectName}
              />
            </label>
            <label className="field">
              <span>{t("app.settings.notificationType")}</span>
              <input
                onChange={(event) => updateField("notificationType", event.target.value)}
                placeholder={t("app.settings.notificationType")}
                type="text"
                value={formState.notificationType}
              />
            </label>
            <label className="field checkbox-field">
              <span>{t("app.settings.allowed")}</span>
              <input
                checked={formState.allowed}
                onChange={(event) => updateField("allowed", event.target.checked)}
                type="checkbox"
              />
            </label>
            <div className="action-row">
              <button className="cta" type="submit">
                {pending ? t("app.settings.saving") : t("app.settings.savePreference")}
              </button>
            </div>
          </form>
          {resultMessage ? <p className="note">{resultMessage}</p> : null}
          {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
        </ContentCard>
      </div>
    </WorkspaceShell>
  );
}
