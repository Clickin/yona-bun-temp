import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { createOrganizationRest } from "../../api/org-project";
import { apiQueryKeys } from "../../api/query-keys";
import { RestApiError } from "../../api/rest-client";
import { readSessionBootstrap } from "../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

type OrganizationCreateSearch = {
  warning?: string;
};

const legacyAnchorActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};

export const Route = createFileRoute("/organizations/new")({
  component: OrganizationNewRoute,
  validateSearch(search): OrganizationCreateSearch {
    return {
      warning: typeof search.warning === "string" ? search.warning : undefined,
    };
  },
});

function OrganizationNewRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { warning } = Route.useSearch();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <OrganizationNewScreen runtimeConfig={runtimeConfig} warning={warning} />
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function OrganizationNewScreen({
  runtimeConfig,
  warning,
}: {
  runtimeConfig: RuntimeConfig;
  warning?: string;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const [nameError, setNameError] = React.useState("");
  const [serverNameError, setServerNameError] = React.useState("");
  const createMutation = useMutation({
    mutationFn: async (input: { description: string; organizationName: string }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return createOrganizationRest(runtimeConfig, csrfToken, {
        description: input.description,
        organizationName: input.organizationName,
      });
    },
    async onSuccess(organization) {
      await queryClient.invalidateQueries({ queryKey: apiQueryKeys.organization.list() });
      router.history.push(
        prefixBasePath(runtimeConfig.basePath, `/organizations/${organization.organizationName}`),
      );
    },
    onError(error) {
      if (error instanceof RestApiError) {
        setServerNameError(t(error.message));
      }
    },
    onMutate() {
      setNameError("");
      setServerNameError("");
    },
  });

  React.useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const organizationName = String(formData.get("name") ?? "");
    if (!/^[A-Za-z0-9가-힣-]+([_.][A-Za-z0-9가-힣-]+)*$/u.test(organizationName)) {
      setNameError(t("organization.name.alert"));
      setServerNameError("");
      return;
    }
    setNameError("");
    createMutation.mutate({
      description: String(formData.get("descr") ?? ""),
      organizationName,
    });
  }

  return (
    <>
      <title>{t("app.name")}</title>
      <SiteLayoutShell runtimeConfig={runtimeConfig}>
        <div className="page-wrap-outer">
          <div className="project-page-wrap">
            <div className="form-wrap new-project">
              <form
                action={prefixBasePath(runtimeConfig.basePath, "/organizations/new")}
                method="post"
                name="new-org"
                className="frm-wrap"
                onSubmit={handleSubmit}
              >
                <legend>{t("title.newOrganization")}</legend>
                <dl>
                  <dt>
                    <div className="n-alert" data-errtype="name">
                      <div className="orange-txt">
                        {!nameError && (serverNameError || warning) ? (
                          <span className="warning">
                            {serverNameError || (warning ? t(warning) : "")}
                          </span>
                        ) : null}
                        <span
                          className="msg wrongName"
                          style={nameError ? undefined : { display: "none" }}
                        >
                          {nameError}
                        </span>
                      </div>
                    </div>
                    <label htmlFor="name">{t("organization.name.placeholder")}</label>
                  </dt>
                  <dd>
                    <input
                      ref={nameInputRef}
                      id="name"
                      type="text"
                      name="name"
                      className="text"
                      placeholder=""
                      maxLength={250}
                      defaultValue=""
                    />
                  </dd>

                  <dt>
                    <label htmlFor="descr">{t("organization.description.placeholder")}</label>
                  </dt>
                  <dd>
                    <textarea
                      id="descr"
                      name="descr"
                      className="text textarea.span4"
                      defaultValue=""
                      style={{ resize: "vertical" }}
                    />
                  </dd>
                </dl>
                <div className="actions">
                  <button className="ybtn ybtn-success" disabled={createMutation.isPending}>
                    <i className="yobicon-friends" /> {t("organization.create")}
                  </button>{" "}
                  <Link
                    to="/"
                    className="ybtn"
                    activeOptions={{ exact: true }}
                    activeProps={legacyAnchorActiveProps}
                  >
                    {t("button.cancel")}
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </SiteLayoutShell>
    </>
  );
}
