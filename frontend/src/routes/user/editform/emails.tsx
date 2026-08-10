import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
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
        action={prefixBasePath(runtimeConfig.basePath, "/user/email")}
        method="post"
        data-owner="user-email-add-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const email = String(new FormData(form).get("email") ?? "");
          addMutation.mutate(email, { onSuccess: () => form.reset() });
        }}
      >
        <input
          type="text"
          placeholder={t("user.email.new")}
          name="email"
          data-owner="user-email-add-input"
        />{" "}
        <button type="submit" data-owner="user-email-add-action">
          {t("button.add")}
        </button>
      </form>

      <hr data-owner="user-email-description-separator" />

      <p data-owner="user-email-description">
        {t("emails.main.email.descr")}
        <br />
        {t("emails.sub.email.descr")}
      </p>

      <table data-owner="user-email-table">
        <tbody>
          <tr>
            <td data-owner="user-email-table-identity-cell">
              {/* oxlint-disable-next-line jsx-a11y/alt-text -- legacy edit_emails.scala.html renders email avatars without alt attributes. */}
              <img
                src={avatarSrc(profile?.avatarUrl)}
                width="40"
                height="40"
                data-owner="user-email-primary-avatar"
              />{" "}
              <strong data-owner="user-email-primary-address">
                {profile?.primaryEmailAddress ?? ""}
              </strong>{" "}
              <span data-owner="user-email-primary-badge">{t("emails.main.email")}</span>
            </td>
            <td data-owner="user-email-table-action-cell"></td>
          </tr>

          {rows.map((row) => {
            const id = stringValue(row.id);
            const valid = row.valid === true;
            return (
              <tr key={id || stringValue(row.emailAddress)}>
                <td data-owner="user-email-table-identity-cell">
                  {/* oxlint-disable-next-line jsx-a11y/alt-text -- legacy edit_emails.scala.html renders email avatars without alt attributes. */}
                  <img
                    src={avatarSrc(row.avatarUrl)}
                    width="40"
                    height="40"
                    data-owner="user-email-secondary-avatar"
                  />{" "}
                  <span data-owner="user-email-secondary-address">
                    {stringValue(row.emailAddress)}
                  </span>
                </td>
                <td data-owner="user-email-table-action-cell">
                  <button
                    type="button"
                    data-owner="user-email-secondary-delete-action"
                    onClick={() => deleteMutation.mutate(id)}
                  >
                    {t("button.delete")}
                  </button>{" "}
                  {valid ? (
                    <button
                      type="button"
                      data-owner="user-email-primary-action"
                      onClick={() => setMainMutation.mutate(id)}
                    >
                      {t("emails.set.as.main")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      data-owner="user-email-secondary-verification-action"
                      onClick={() => sendValidationMutation.mutate(id)}
                    >
                      <i data-owner="user-email-secondary-warning-icon"></i>
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
