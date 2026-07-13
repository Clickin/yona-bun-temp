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

const DEFAULT_EMAIL_AVATAR_SRC = "/assets/images/default-avatar-128.png";
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
        className="form-inline inner-bubble"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const email = String(new FormData(form).get("email") ?? "");
          addMutation.mutate(email, { onSuccess: () => form.reset() });
        }}
      >
        <input type="text" placeholder={t("user.email.new")} name="email" className="text uname" />
        <button type="submit" className="ybtn ybtn-success">
          {t("button.add")}
        </button>
      </form>

      <hr />

      <p>
        {t("emails.main.email.descr")}
        <br />
        {t("emails.sub.email.descr")}
      </p>

      <table className="table mt20">
        <tbody>
          <tr>
            <td>
              {/* oxlint-disable-next-line jsx-a11y/alt-text -- legacy edit_emails.scala.html renders email avatars without alt attributes. */}
              <img src={avatarSrc(profile?.avatarUrl)} width="40" height="40" />
              <strong className="ml10">{profile?.primaryEmailAddress ?? ""}</strong>
              <span className="label-head vmiddle ml10">{t("emails.main.email")}</span>
            </td>
            <td style={{ textAlign: "right" }}></td>
          </tr>

          {rows.map((row) => {
            const id = stringValue(row.id);
            const valid = row.valid === true;
            return (
              <tr key={id || stringValue(row.emailAddress)}>
                <td>
                  {/* oxlint-disable-next-line jsx-a11y/alt-text -- legacy edit_emails.scala.html renders email avatars without alt attributes. */}
                  <img src={avatarSrc(row.avatarUrl)} width="40" height="40" />
                  <span className="ml10">{stringValue(row.emailAddress)}</span>
                </td>
                <td style={{ textAlign: "right", verticalAlign: "middle" }}>
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
