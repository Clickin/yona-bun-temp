import * as React from "react";
import * as stylex from "@stylexjs/stylex";
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
import { organizationNewColors } from "./-new.stylex";

const styles = stylex.create({
  frame: {
    margin: "30px auto",
    position: "relative",
    width: "700px",
  },
  form: {
    margin: "0 0 2px",
  },
  listReset: {
    margin: "0",
    padding: "0",
  },
  term: {
    margin: "3px 0 1px",
    padding: "0",
  },
  definition: {
    margin: "0",
    padding: "0",
  },
  legend: {
    borderBottomColor: organizationNewColors.divider,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderLeftWidth: "0",
    borderRightWidth: "0",
    borderTopWidth: "0",
    color: organizationNewColors.actionText,
    display: "block",
    fontSize: "21px",
    fontWeight: "400",
    lineHeight: "40px",
    margin: "0 0 20px",
    padding: "0",
    width: "100%",
  },
  label: {
    color: organizationNewColors.actionText,
    display: "inline-block",
    fontSize: "12px",
    fontWeight: "700",
    lineHeight: "20px",
    margin: "0 5px 5px 0",
  },
  field: {
    backgroundColor: organizationNewColors.fieldSurface,
    borderColor: {
      default: organizationNewColors.fieldBorder,
      ":focus": organizationNewColors.fieldFocusBorder,
    },
    borderRadius: "2px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: "none",
    color: organizationNewColors.fieldText,
    display: "inline-block",
    fontSize: {
      default: "12px",
      "@media (max-width: 720px)": "16px",
    },
    fontWeight: "400",
    lineHeight: "20px",
    margin: "0 0 10px",
    outline: "0",
    padding: "4px 6px",
    verticalAlign: "middle",
    width: "98%",
  },
  nameField: {
    height: "20px",
  },
  descriptionField: {
    height: "40px",
    resize: "vertical",
  },
  validationRoot: {
    display: "block",
    fontSize: "13px",
    fontWeight: "700",
    lineHeight: "20px",
    margin: "0",
    padding: "0",
  },
  validationText: {
    color: organizationNewColors.warningText,
    fontSize: "13px",
    fontWeight: "700",
    lineHeight: "20px",
  },
  hidden: {
    display: "none",
  },
  actions: {
    position: "relative",
    textAlign: "center",
  },
  action: {
    backgroundColor: {
      default: organizationNewColors.actionSurface,
      ":hover": organizationNewColors.actionHoverSurface,
      ":focus": organizationNewColors.actionHoverSurface,
      ":active": organizationNewColors.actionHoverSurface,
    },
    borderColor: {
      default: organizationNewColors.actionBorder,
      ":hover": organizationNewColors.actionHoverBorder,
      ":focus": organizationNewColors.actionHoverBorder,
      ":active": organizationNewColors.actionHoverBorder,
    },
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: organizationNewColors.actionShadow,
    color: {
      default: organizationNewColors.actionText,
      ":hover": organizationNewColors.actionHoverText,
      ":focus": organizationNewColors.actionHoverText,
      ":active": organizationNewColors.actionHoverText,
    },
    cursor: "pointer",
    display: "inline-block",
    fontSize: "14px",
    fontWeight: "400",
    lineHeight: "20px",
    marginBottom: "0",
    marginLeft: ".3em",
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
    transition: "all 0.3s ease",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    zIndex: "2",
  },
  firstAction: {
    marginLeft: "0",
  },
  primaryAction: {
    backgroundColor: {
      default: organizationNewColors.primarySurface,
      ":hover": organizationNewColors.primaryBorder,
      ":focus": organizationNewColors.primaryBorder,
      ":active": organizationNewColors.primaryBorder,
    },
    borderColor: {
      default: organizationNewColors.primaryBorder,
      ":hover": organizationNewColors.primaryBorder,
      ":focus": organizationNewColors.primaryBorder,
      ":active": organizationNewColors.primaryBorder,
    },
    color: {
      default: organizationNewColors.primaryText,
      ":hover": organizationNewColors.primaryText,
      ":focus": organizationNewColors.primaryText,
      ":active": organizationNewColors.primaryText,
    },
  },
});

const frameStyleProps = stylex.props(styles.frame);
const formStyleProps = stylex.props(styles.form);
const listStyleProps = stylex.props(styles.listReset);
const termStyleProps = stylex.props(styles.term);
const definitionStyleProps = stylex.props(styles.definition);
const legendStyleProps = stylex.props(styles.legend);
const labelStyleProps = stylex.props(styles.label);
const nameFieldStyleProps = stylex.props(styles.field, styles.nameField);
const descriptionFieldStyleProps = stylex.props(styles.field, styles.descriptionField);
const validationRootStyleProps = stylex.props(styles.validationRoot);
const validationTextStyleProps = stylex.props(styles.validationText);
const hiddenValidationTextStyleProps = stylex.props(styles.validationText, styles.hidden);
const actionsStyleProps = stylex.props(styles.actions);
const createActionStyleProps = stylex.props(
  styles.action,
  styles.firstAction,
  styles.primaryAction,
);
const cancelActionStyleProps = stylex.props(styles.action);

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
            <div
              {...frameStyleProps}
              className={frameStyleProps.className}
              data-stylex-owner="organization-new-form"
            >
              <form
                {...formStyleProps}
                action={prefixBasePath(runtimeConfig.basePath, "/organizations/new")}
                method="post"
                name="new-org"
                className={formStyleProps.className}
                data-stylex-owner="organization-new-form"
                onSubmit={handleSubmit}
              >
                <legend
                  {...legendStyleProps}
                  className={legendStyleProps.className}
                  data-stylex-owner="organization-new-label"
                >
                  {t("title.newOrganization")}
                </legend>
                <dl
                  {...listStyleProps}
                  className={listStyleProps.className}
                  data-stylex-owner="organization-new-form"
                >
                  <dt
                    {...termStyleProps}
                    className={termStyleProps.className}
                    data-stylex-owner="organization-new-form"
                  >
                    <div
                      {...validationRootStyleProps}
                      className={validationRootStyleProps.className}
                      data-errtype="name"
                      data-stylex-owner="organization-new-validation"
                    >
                      <div
                        {...validationRootStyleProps}
                        className={validationRootStyleProps.className}
                        data-stylex-owner="organization-new-validation"
                      >
                        {serverNameError || warning ? (
                          <span
                            {...(nameError
                              ? hiddenValidationTextStyleProps
                              : validationTextStyleProps)}
                            className={
                              nameError
                                ? hiddenValidationTextStyleProps.className
                                : validationTextStyleProps.className
                            }
                            data-stylex-owner="organization-new-validation"
                          >
                            {serverNameError || (warning ? t(warning) : "")}
                          </span>
                        ) : null}
                        <span
                          {...(nameError
                            ? validationTextStyleProps
                            : hiddenValidationTextStyleProps)}
                          className={
                            nameError
                              ? validationTextStyleProps.className
                              : hiddenValidationTextStyleProps.className
                          }
                          data-stylex-owner="organization-new-validation"
                        >
                          {nameError}
                        </span>
                      </div>
                    </div>
                    <label
                      {...labelStyleProps}
                      className={labelStyleProps.className}
                      data-stylex-owner="organization-new-label"
                      htmlFor="name"
                    >
                      {t("organization.name.placeholder")}
                    </label>
                  </dt>
                  <dd
                    {...definitionStyleProps}
                    className={definitionStyleProps.className}
                    data-stylex-owner="organization-new-form"
                  >
                    <input
                      {...nameFieldStyleProps}
                      ref={nameInputRef}
                      id="name"
                      type="text"
                      name="name"
                      className={nameFieldStyleProps.className}
                      data-stylex-owner="organization-new-field"
                      placeholder=""
                      maxLength={250}
                      defaultValue=""
                    />
                  </dd>

                  <dt
                    {...termStyleProps}
                    className={termStyleProps.className}
                    data-stylex-owner="organization-new-form"
                  >
                    <label
                      {...labelStyleProps}
                      className={labelStyleProps.className}
                      data-stylex-owner="organization-new-label"
                      htmlFor="descr"
                    >
                      {t("organization.description.placeholder")}
                    </label>
                  </dt>
                  <dd
                    {...definitionStyleProps}
                    className={definitionStyleProps.className}
                    data-stylex-owner="organization-new-form"
                  >
                    <textarea
                      {...descriptionFieldStyleProps}
                      id="descr"
                      name="descr"
                      className={descriptionFieldStyleProps.className}
                      data-stylex-owner="organization-new-field"
                      defaultValue=""
                    />
                  </dd>
                </dl>
                <div
                  {...actionsStyleProps}
                  className={actionsStyleProps.className}
                  data-stylex-owner="organization-new-actions"
                >
                  <button
                    {...createActionStyleProps}
                    className={createActionStyleProps.className}
                    data-stylex-owner="organization-new-actions"
                    disabled={createMutation.isPending}
                  >
                    <i className="yobicon-friends" /> {t("organization.create")}
                  </button>
                  <Link
                    {...cancelActionStyleProps}
                    to="/"
                    className={cancelActionStyleProps.className}
                    data-stylex-owner="organization-new-actions"
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
