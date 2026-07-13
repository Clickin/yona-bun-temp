import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { changePasswordRest, readWorkspaceOverviewRest } from "../../../api/workspace";
import { useLegacyMessages } from "../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";

export const Route = createFileRoute("/user/editform/password")({
  component: UserPasswordSettingsRoute,
});

function UserPasswordSettingsRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  return <UserPasswordSettingsScreen runtimeConfig={runtimeConfig} />;
}

function UserPasswordSettingsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [fieldErrors, setFieldErrors] = React.useState<
    Partial<Record<"oldPassword" | "password" | "retypedPassword", string>>
  >({});
  const validateWholePasswordForm = React.useCallback(
    (form: HTMLFormElement | null) => {
      setFieldErrors(validatePasswordForm(form, t));
    },
    [t],
  );
  const workspaceQuery = useQuery({
    queryFn: () => readWorkspaceOverviewRest(runtimeConfig),
    queryKey: ["workspace", "overview"],
  });
  const loginId = workspaceQuery.data?.profile?.loginId ?? "";
  const passwordMutation = useMutation({
    mutationFn: async (input: {
      loginId: string;
      oldPassword: string;
      password: string;
      retypedPassword: string;
    }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return changePasswordRest(runtimeConfig, csrfToken, input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      await router.navigate({
        search: { password: "reset", redirectUrl: "" },
        to: "/users/loginform",
      });
    },
  });

  return (
    <>
      <form
        id="frmPassword"
        method="post"
        action={prefixBasePath(runtimeConfig.basePath, "/user/resetPassword")}
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const nextErrors = validatePasswordForm(formData, t);
          setFieldErrors(nextErrors);
          if (Object.keys(nextErrors).length > 0) return;

          passwordMutation.mutate({
            loginId: String(formData.get("loginId") ?? ""),
            oldPassword: String(formData.get("oldPassword") ?? ""),
            password: String(formData.get("password") ?? ""),
            retypedPassword: String(formData.get("retypedPassword") ?? ""),
          });
        }}
      >
        <input type="hidden" name="loginId" value={loginId} />
        <dl>
          <dt>{t("user.currentPassword")}</dt>
          <dd className="mt10">
            <input
              type="password"
              id="oldPassword"
              name="oldPassword"
              defaultValue=""
              autoComplete="off"
              onBlur={(event) => validateWholePasswordForm(event.currentTarget.form)}
            />
            <FieldPopover message={fieldErrors.oldPassword} />
          </dd>
          <dt>{t("user.newPassword")}</dt>
          <dd className="mt10">
            <input
              type="password"
              id="password"
              name="password"
              defaultValue=""
              autoComplete="off"
              onBlur={(event) => validateWholePasswordForm(event.currentTarget.form)}
            />
            <FieldPopover message={fieldErrors.password} />
          </dd>
          <dt>{t("validation.retypePassword")}</dt>
          <dd className="mt10">
            <input
              type="password"
              id="retypedPassword"
              name="retypedPassword"
              defaultValue=""
              autoComplete="off"
              onBlur={(event) => validateWholePasswordForm(event.currentTarget.form)}
            />
            <FieldPopover message={fieldErrors.retypedPassword} />
          </dd>
          <dd>
            <button type="submit" className="ybtn ybtn-success">
              {t("userinfo.changePassword")}
            </button>
          </dd>
        </dl>
      </form>
      <hr />
      <div className="mt10">
        <dl>
          <dt>{t("site.resetPasswordEmail.desc")}</dt>
          <dd className="mt10">
            <Link to="/lostPassword" className="ybtn ybtn-fail">
              {t("site.resetPasswordEmail.title")}
            </Link>
          </dd>
        </dl>
      </div>
    </>
  );
}

function validatePasswordForm(
  form: HTMLFormElement | FormData | null,
  t: (key: string) => string,
): Partial<Record<"oldPassword" | "password" | "retypedPassword", string>> {
  const formData = form instanceof FormData ? form : new FormData(form ?? undefined);
  const oldPassword = String(formData.get("oldPassword") ?? "");
  const password = String(formData.get("password") ?? "");
  const retypedPassword = String(formData.get("retypedPassword") ?? "");
  const nextErrors: Partial<Record<"oldPassword" | "password" | "retypedPassword", string>> = {};

  if (!oldPassword) nextErrors.oldPassword = t("validation.required");
  if (!password) {
    nextErrors.password = t("validation.required");
  } else if (password.length < 4) {
    nextErrors.password = t("validation.tooShortPassword");
  }
  if (!retypedPassword) {
    nextErrors.retypedPassword = t("validation.required");
  } else if (retypedPassword !== password) {
    nextErrors.retypedPassword = t("validation.passwordMismatch");
  }

  return nextErrors;
}

function FieldPopover({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="popover right in">
      <div className="arrow"></div>
      <div className="popover-content">{message}</div>
    </div>
  );
}
