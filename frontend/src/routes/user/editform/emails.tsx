import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import {
  addWorkspaceEmailRest,
  deleteWorkspaceEmailRest,
  readWorkspaceOverviewRest,
  sendWorkspaceEmailValidationRest,
  setMainWorkspaceEmailRest,
} from "../../../api/workspace";
import defaultEmailAvatarUrl from "../../../assets/legacy/default-avatar-128.png";
import { useLegacyMessages } from "../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { emailAddColors, emailTableColors } from "./-emails.stylex";

const styles = stylex.create({
  addForm: {
    margin: "0px 0px 10px",
    position: "relative",
  },
  addInput: {
    backgroundColor: emailAddColors.inputSurface,
    borderColor: {
      default: emailAddColors.inputBorder,
      ":focus": emailAddColors.inputFocusBorder,
    },
    borderRadius: "2px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: "none",
    boxSizing: "content-box",
    color: emailAddColors.inputText,
    display: "inline-block",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSize: {
      default: "12px",
      "@media (max-width: 720px)": "16px",
    },
    fontWeight: "400",
    height: "20px",
    lineHeight: "20px",
    margin: "0px",
    outline: { ":focus": "0 none" },
    padding: "4px 6px",
    transition: "border 0.2s linear, box-shadow 0.2s linear",
    verticalAlign: "middle",
    width: {
      default: "384px",
      "@media (max-width: 720px)": "inherit",
    },
  },
  addAction: {
    backgroundColor: {
      default: emailAddColors.actionSurface,
      ":hover": emailAddColors.actionInteractiveSurface,
      ":focus": emailAddColors.actionInteractiveSurface,
      ":active": emailAddColors.actionInteractiveSurface,
    },
    borderColor: emailAddColors.actionBorder,
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: `0 1px 0 ${emailAddColors.actionShadow}`,
    color: emailAddColors.actionText,
    cursor: "pointer",
    display: "inline-block",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSize: "14px",
    fontWeight: "400",
    lineHeight: "20px",
    margin: "0px 0px 0px 4.2px",
    outline: "0 none",
    padding: "4px 12px",
    position: "relative",
    textAlign: "center",
    textDecoration: {
      default: "none",
      ":hover": "none",
      ":focus": "none",
      ":active": "none",
    },
    textShadow: "none",
    transition: "all 0.3s ease",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    zIndex: "2",
  },
  emailTable: {
    backgroundColor: "transparent",
    borderCollapse: "collapse",
    borderSpacing: "0px",
    marginBottom: "20px",
    marginTop: "20px",
    maxWidth: "100%",
    width: "100%",
  },
  emailTableCell: {
    borderTopColor: emailTableColors.rowBorder,
    borderTopStyle: "solid",
    borderTopWidth: "1px",
    lineHeight: "20px",
    padding: "8px",
    textAlign: "left",
    verticalAlign: "top",
  },
  emailTableActionCell: {
    textAlign: "right",
  },
  emailTableSecondaryActionCell: {
    verticalAlign: "middle",
  },
});

const addFormStyleProps = stylex.props(styles.addForm);
const addInputStyleProps = stylex.props(styles.addInput);
const addActionStyleProps = stylex.props(styles.addAction);
const emailTableStyleProps = stylex.props(styles.emailTable);
const emailTableIdentityCellStyleProps = stylex.props(styles.emailTableCell);
const emailTablePrimaryActionCellStyleProps = stylex.props(
  styles.emailTableCell,
  styles.emailTableActionCell,
);
const emailTableSecondaryActionCellStyleProps = stylex.props(
  styles.emailTableCell,
  styles.emailTableActionCell,
  styles.emailTableSecondaryActionCell,
);

export const Route = createFileRoute("/user/editform/emails")({
  component: UserEmailSettingsRoute,
});

type WorkspaceEmailRow = {
  avatarUrl?: unknown;
  emailAddress?: unknown;
  id?: unknown;
  valid?: unknown;
};

const DEFAULT_EMAIL_AVATAR_SRC = defaultEmailAvatarUrl;
function UserEmailSettingsRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  return <UserEmailSettingsScreen runtimeConfig={runtimeConfig} />;
}

function UserEmailSettingsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const workspaceQuery = useQuery({
    queryFn: () => readWorkspaceOverviewRest(runtimeConfig),
    queryKey: ["workspace", "overview"],
  });
  const profile = workspaceQuery.data?.profile;
  const rows = (workspaceQuery.data?.emails ?? []) as WorkspaceEmailRow[];
  const addMutation = useMutation({
    mutationFn: async (email: string) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return addWorkspaceEmailRest(runtimeConfig, csrfToken, email);
    },
    onSuccess: (workspace) => {
      queryClient.setQueryData(["workspace", "overview"], workspace);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteWorkspaceEmailRest(runtimeConfig, csrfToken, id);
    },
    onSuccess: (workspace) => {
      queryClient.setQueryData(["workspace", "overview"], workspace);
    },
  });
  const setMainMutation = useMutation({
    mutationFn: async (id: string) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return setMainWorkspaceEmailRest(runtimeConfig, csrfToken, id);
    },
    onSuccess: (workspace) => {
      queryClient.setQueryData(["workspace", "overview"], workspace);
    },
  });
  const sendValidationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return sendWorkspaceEmailValidationRest(runtimeConfig, csrfToken, id);
    },
    onSuccess: (workspace) => {
      queryClient.setQueryData(["workspace", "overview"], workspace);
    },
  });

  return (
    <>
      <form
        {...addFormStyleProps}
        action={prefixBasePath(runtimeConfig.basePath, "/user/email")}
        method="post"
        data-stylex-owner="user-email-add-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const email = String(new FormData(form).get("email") ?? "");
          addMutation.mutate(email, { onSuccess: () => form.reset() });
        }}
      >
        <input
          {...addInputStyleProps}
          type="text"
          placeholder={t("user.email.new")}
          name="email"
          data-stylex-owner="user-email-add-input"
        />{" "}
        <button {...addActionStyleProps} type="submit" data-stylex-owner="user-email-add-action">
          {t("button.add")}
        </button>
      </form>

      <hr />

      <p>
        {t("emails.main.email.descr")}
        <br />
        {t("emails.sub.email.descr")}
      </p>

      <table {...emailTableStyleProps} data-stylex-owner="user-email-table">
        <tbody>
          <tr>
            <td
              {...emailTableIdentityCellStyleProps}
              data-stylex-owner="user-email-table-identity-cell"
            >
              {/* oxlint-disable-next-line jsx-a11y/alt-text -- legacy edit_emails.scala.html renders email avatars without alt attributes. */}
              <img src={avatarSrc(profile?.avatarUrl)} width="40" height="40" />{" "}
              <strong className="ml10">{profile?.primaryEmailAddress ?? ""}</strong>{" "}
              <span className="label-head vmiddle ml10">{t("emails.main.email")}</span>
            </td>
            <td
              {...emailTablePrimaryActionCellStyleProps}
              data-stylex-owner="user-email-table-action-cell"
            ></td>
          </tr>

          {rows.map((row) => {
            const id = stringValue(row.id);
            const valid = row.valid === true;
            return (
              <tr key={id || stringValue(row.emailAddress)}>
                <td
                  {...emailTableIdentityCellStyleProps}
                  data-stylex-owner="user-email-table-identity-cell"
                >
                  {/* oxlint-disable-next-line jsx-a11y/alt-text -- legacy edit_emails.scala.html renders email avatars without alt attributes. */}
                  <img src={avatarSrc(row.avatarUrl)} width="40" height="40" />{" "}
                  <span className="ml10">{stringValue(row.emailAddress)}</span>
                </td>
                <td
                  {...emailTableSecondaryActionCellStyleProps}
                  data-stylex-owner="user-email-table-action-cell"
                >
                  <button
                    type="button"
                    className="ybtn ybtn-small ybtn-danger"
                    onClick={() => deleteMutation.mutate(id)}
                  >
                    {t("button.delete")}
                  </button>
                  {valid ? (
                    <button
                      type="button"
                      className="ybtn ybtn-small"
                      style={{ width: "150px" }}
                      onClick={() => setMainMutation.mutate(id)}
                    >
                      {t("emails.set.as.main")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="ybtn ybtn-small"
                      style={{ width: "150px" }}
                      onClick={() => sendValidationMutation.mutate(id)}
                    >
                      <i
                        className="yobicon-error2 orange-txt mr5"
                        style={{ verticalAlign: "bottom" }}
                      ></i>
                      {t("emails.send.validatino.mail")}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function avatarSrc(value: unknown): string {
  return stringValue(value) || DEFAULT_EMAIL_AVATAR_SRC;
}
