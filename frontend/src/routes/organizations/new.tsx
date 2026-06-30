import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createOrganizationRest } from "../../api/org-project";
import { apiQueryKeys } from "../../api/query-keys";
import { readSessionBootstrap } from "../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YonaQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

export const Route = createFileRoute("/organizations/new")({
  component: OrganizationNewRoute,
});

function OrganizationNewRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <OrganizationNewScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function OrganizationNewScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [nameError, setNameError] = React.useState("");
  const legacyNameErrorTypeRef = React.useCallback((node: HTMLDivElement | null) => {
    node?.setAttribute("data-errType", "name");
  }, []);
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
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const organizationName = String(formData.get("name") ?? "");
    if (!/^[A-Za-z0-9_.-]+$/u.test(organizationName)) {
      setNameError(t("organization.name.alert"));
      return;
    }
    setNameError("");
    createMutation.mutate({
      description: String(formData.get("descr") ?? ""),
      organizationName,
    });
  }

  return (
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
                  <div className="n-alert" ref={legacyNameErrorTypeRef}>
                    <div className="orange-txt">
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
                    style={{ resize: "vertical" }}
                    defaultValue=""
                  />
                </dd>
              </dl>
              <div className="actions">
                <button className="ybtn ybtn-success" disabled={createMutation.isPending}>
                  <i className="yobicon-friends" /> {t("organization.create")}
                </button>
                <a href={prefixBasePath(runtimeConfig.basePath, "/")} className="ybtn">
                  {t("button.cancel")}
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </SiteLayoutShell>
  );
}
