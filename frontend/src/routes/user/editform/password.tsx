import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { changePasswordRest, readWorkspaceOverviewRest } from "../../../api/workspace";
import { useLegacyMessages } from "../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { passwordSettingsColors } from "./-password.stylex";

const styles = stylex.create({
  form: {
    display: "block",
    margin: "0px 0px 2px",
    padding: "0px",
  },
  list: {
    display: "block",
    margin: "0px",
    padding: "0px",
  },
  term: {
    display: "block",
    fontWeight: "700",
    lineHeight: "20px",
    margin: "0px",
    padding: "0px",
  },
  description: {
    display: "block",
    lineHeight: "20px",
    margin: "0px",
    padding: "0px",
  },
  spacedDescription: { marginTop: "10px" },
  input: {
    backgroundColor: passwordSettingsColors.inputSurface,
    borderColor: {
      default: passwordSettingsColors.inputBorder,
      ":focus": passwordSettingsColors.inputFocusBorder,
    },
    borderRadius: "2px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: "none",
    boxSizing: "content-box",
    color: passwordSettingsColors.inputText,
    display: "inline-block",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSize: { default: "12px", "@media (max-width: 720px)": "16px" },
    fontWeight: "400",
    height: "20px",
    lineHeight: "20px",
    margin: "0px 0px 10px",
    outlineStyle: "none",
    padding: "4px 6px",
    transition: "border 0.2s linear, box-shadow 0.2s linear",
    verticalAlign: "middle",
    width: "206px",
  },
});

const formStyleProps = stylex.props(styles.form);
const listStyleProps = stylex.props(styles.list);
const termStyleProps = stylex.props(styles.term);
const descriptionStyleProps = stylex.props(styles.description);
const spacedDescriptionStyleProps = stylex.props(styles.description, styles.spacedDescription);
const inputStyleProps = stylex.props(styles.input);

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
        {...formStyleProps}
        id="frmPassword"
        method="post"
        action={prefixBasePath(runtimeConfig.basePath, "/user/resetPassword")}
        data-stylex-owner="user-password-form"
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
        <dl {...listStyleProps} data-stylex-owner="user-password-list">
          <dt {...termStyleProps} data-stylex-owner="user-password-term">
            {t("user.currentPassword")}
          </dt>
          <dd {...spacedDescriptionStyleProps} data-stylex-owner="user-password-description">
            <input
              {...inputStyleProps}
              type="password"
              id="oldPassword"
              name="oldPassword"
              defaultValue=""
              autoComplete="off"
              data-stylex-owner="user-password-input"
              onBlur={(event) => validateWholePasswordForm(event.currentTarget.form)}
            />
            <FieldPopover message={fieldErrors.oldPassword} />
          </dd>
          <dt {...termStyleProps} data-stylex-owner="user-password-term">
            {t("user.newPassword")}
          </dt>
          <dd {...spacedDescriptionStyleProps} data-stylex-owner="user-password-description">
            <input
              {...inputStyleProps}
              type="password"
              id="password"
              name="password"
              defaultValue=""
              autoComplete="off"
              data-stylex-owner="user-password-input"
              onBlur={(event) => validateWholePasswordForm(event.currentTarget.form)}
            />
            <FieldPopover message={fieldErrors.password} />
          </dd>
          <dt {...termStyleProps} data-stylex-owner="user-password-term">
            {t("validation.retypePassword")}
          </dt>
          <dd {...spacedDescriptionStyleProps} data-stylex-owner="user-password-description">
            <input
              {...inputStyleProps}
              type="password"
              id="retypedPassword"
              name="retypedPassword"
              defaultValue=""
              autoComplete="off"
              data-stylex-owner="user-password-input"
              onBlur={(event) => validateWholePasswordForm(event.currentTarget.form)}
            />
            <FieldPopover message={fieldErrors.retypedPassword} />
          </dd>
          <dd {...descriptionStyleProps} data-stylex-owner="user-password-description">
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
