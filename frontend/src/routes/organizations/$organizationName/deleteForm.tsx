import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, type MouseEvent } from "react";
import * as stylex from "@stylexjs/stylex";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { organizationDetailQueryOptions } from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { OrganizationDetail } from "../../../api/types";
import { useLegacyMessages } from "../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { organizationDeleteColors } from "./-deleteForm.stylex";

const styles = stylex.create({
  actionBox: {
    padding: {
      default: "20px 0 12px",
      "@media (max-width: 720px)": "10px 0",
    },
    textAlign: "center",
  },
  action: {
    backgroundColor: {
      default: organizationDeleteColors.actionSurface,
      ":hover": organizationDeleteColors.actionHoverSurface,
      ":focus": organizationDeleteColors.actionHoverSurface,
      ":active": organizationDeleteColors.actionHoverSurface,
    },
    borderColor: {
      default: organizationDeleteColors.actionBorder,
      ":hover": organizationDeleteColors.actionHoverBorder,
      ":focus": organizationDeleteColors.actionHoverBorder,
      ":active": organizationDeleteColors.actionHoverBorder,
    },
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: organizationDeleteColors.actionShadow,
    color: {
      default: organizationDeleteColors.actionText,
      ":hover": organizationDeleteColors.actionHoverText,
      ":focus": organizationDeleteColors.actionHoverText,
      ":active": organizationDeleteColors.actionHoverText,
    },
    cursor: "pointer",
    display: "inline-block",
    fontSize: "14px",
    fontWeight: "400",
    lineHeight: "20px",
    margin: "0 0 0 .3em",
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
  dangerAction: {
    backgroundColor: {
      default: organizationDeleteColors.dangerSurface,
      ":hover": organizationDeleteColors.dangerBorder,
      ":focus": organizationDeleteColors.dangerBorder,
      ":active": organizationDeleteColors.dangerBorder,
    },
    borderColor: {
      default: organizationDeleteColors.dangerBorder,
      ":hover": organizationDeleteColors.dangerBorder,
      ":focus": organizationDeleteColors.dangerBorder,
      ":active": organizationDeleteColors.dangerBorder,
    },
    color: {
      default: organizationDeleteColors.primaryText,
      ":hover": organizationDeleteColors.primaryText,
      ":focus": organizationDeleteColors.primaryText,
      ":active": organizationDeleteColors.primaryText,
    },
  },
  modal: {
    backgroundColor: organizationDeleteColors.modalSurface,
    borderColor: organizationDeleteColors.modalBorder,
    borderRadius: "6px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: organizationDeleteColors.modalShadow,
    color: organizationDeleteColors.modalText,
    left: {
      default: "50%",
      "@media (max-width: 720px)": "0",
    },
    marginLeft: {
      default: "-280px",
      "@media (max-width: 720px)": "0",
    },
    outline: "none",
    position: "fixed",
    top: "10%",
    width: {
      default: "560px",
      "@media (max-width: 720px)": "100%",
    },
    zIndex: "1050",
  },
  modalClosed: {
    display: "none",
  },
  modalOpen: {
    display: "block",
  },
  header: {
    borderBottomColor: organizationDeleteColors.footerBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    padding: "9px 15px",
  },
  close: {
    background: "transparent",
    border: "0",
    color: organizationDeleteColors.backdrop,
    cursor: "pointer",
    float: "right",
    fontSize: "20px",
    fontWeight: "700",
    lineHeight: "20px",
    marginTop: "2px",
    opacity: {
      default: "0.2",
      ":hover": "0.4",
      ":focus": "0.4",
    },
    padding: "0",
    textShadow: organizationDeleteColors.closeTextShadow,
  },
  heading: {
    fontSize: "24.5px",
    fontWeight: "700",
    lineHeight: "30px",
    margin: "0",
  },
  body: {
    maxHeight: "400px",
    overflowY: "auto",
    padding: "15px",
    position: "relative",
  },
  footer: {
    backgroundColor: organizationDeleteColors.footerSurface,
    borderRadius: "0 0 6px 6px",
    borderTopColor: organizationDeleteColors.footerBorder,
    borderTopStyle: "solid",
    borderTopWidth: "1px",
    boxShadow: organizationDeleteColors.footerShadow,
    padding: "14px 15px 15px",
    textAlign: "right",
  },
  backdrop: {
    backgroundColor: organizationDeleteColors.backdrop,
    bottom: "0",
    left: "0",
    opacity: "0.5",
    position: "fixed",
    right: "0",
    top: "0",
    zIndex: "1040",
  },
});

const actionBoxStyleProps = stylex.props(styles.actionBox);
const dangerActionStyleProps = stylex.props(styles.action, styles.firstAction, styles.dangerAction);
const defaultActionStyleProps = stylex.props(styles.action);
const headerStyleProps = stylex.props(styles.header);
const closeStyleProps = stylex.props(styles.close);
const headingStyleProps = stylex.props(styles.heading);
const bodyStyleProps = stylex.props(styles.body);
const footerStyleProps = stylex.props(styles.footer);
const backdropStyleProps = stylex.props(styles.backdrop);

export const Route = createFileRoute("/organizations/$organizationName/deleteForm")({
  component: OrganizationDeleteFormRoute,
});

function insulateOrganizationDeleteModalButtonClick(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
  event.stopPropagation();
}

function OrganizationDeleteFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  return <OrganizationDeleteFormScreen runtimeConfig={runtimeConfig} />;
}

function OrganizationDeleteFormScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { organizationName } = Route.useParams();
  const query = useQuery(organizationDetailQueryOptions(runtimeConfig, organizationName));

  if (!query.data) {
    return <title>{organizationName}</title>;
  }

  return (
    <>
      <title>{organizationName}</title>
      <OrganizationDeleteFormBody organization={query.data} runtimeConfig={runtimeConfig} />
    </>
  );
}

function OrganizationDeleteFormBody({
  organization,
  runtimeConfig,
}: {
  organization: OrganizationDetail;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const organizationName = stringField(organization.organizationName, "organization");
  const [deletionModalOpen, setDeletionModalOpen] = useState(false);
  const [deletionModalWasOpened, setDeletionModalWasOpened] = useState(false);
  const closeDeletionModal = () => setDeletionModalOpen(false);
  const openDeletionModal = (event: MouseEvent<HTMLButtonElement>) => {
    insulateOrganizationDeleteModalButtonClick(event);
    setDeletionModalWasOpened(true);
    setDeletionModalOpen(true);
  };
  const dismissDeletionModal = (event: MouseEvent<HTMLButtonElement>) => {
    insulateOrganizationDeleteModalButtonClick(event);
    closeDeletionModal();
  };
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteOrganizationFromDeleteForm(runtimeConfig, csrfToken, organizationName);
    },
    onSuccess(response) {
      queryClient.removeQueries({ queryKey: apiQueryKeys.organization.base(organizationName) });
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.organization.list() });
      router.history.push(
        prefixBasePath(runtimeConfig.basePath, stringField(response.redirectPath, "/")),
      );
    },
    onError(error) {
      closeDeletionModal();
      window.alert(t(organizationDeleteErrorKey(error)));
    },
  });

  return (
    <div className="page-wrap-outer" data-stylex-owner="organization-delete-page">
      <div className="project-page-wrap" data-stylex-owner="organization-delete-shell">
        <OrganizationSettingMenu organizationName={organizationName} />
        <div
          {...actionBoxStyleProps}
          className={`box-wrap bottom ${actionBoxStyleProps.className ?? ""}`.trim()}
          data-stylex-owner="organization-delete-action"
        >
          <button
            {...dangerActionStyleProps}
            id="btnDelete"
            type="button"
            className={`ybtn ybtn-danger ${dangerActionStyleProps.className ?? ""}`.trim()}
            data-stylex-owner="organization-delete-action"
            onClick={openDeletionModal}
          >
            {t("organization.delete.this")}
          </button>
        </div>

        <div
          {...stylex.props(styles.modal, deletionModalOpen ? styles.modalOpen : styles.modalClosed)}
          className={`modal hide${deletionModalOpen ? " in" : ""} ${stylex.props(styles.modal, deletionModalOpen ? styles.modalOpen : styles.modalClosed).className ?? ""}`.trim()}
          id="alertDeletion"
          data-stylex-owner="organization-delete-modal"
          aria-hidden={deletionModalWasOpened ? !deletionModalOpen : undefined}
          style={
            deletionModalWasOpened ? { display: deletionModalOpen ? "block" : "none" } : undefined
          }
        >
          <div
            {...headerStyleProps}
            className={`modal-header ${headerStyleProps.className ?? ""}`.trim()}
            data-stylex-owner="organization-delete-modal-header"
          >
            <button
              {...closeStyleProps}
              type="button"
              className={`close ${closeStyleProps.className ?? ""}`.trim()}
              data-stylex-owner="organization-delete-modal-header"
              onClick={dismissDeletionModal}
            >
              ×
            </button>
            <h3
              {...headingStyleProps}
              className={headingStyleProps.className}
              data-stylex-owner="organization-delete-modal-header"
            >
              {t("organization.delete.requestion")}
            </h3>
          </div>
          <div
            {...bodyStyleProps}
            className={`modal-body ${bodyStyleProps.className ?? ""}`.trim()}
            data-stylex-owner="organization-delete-modal-body"
          >
            <p> {t("organization.delete.reaccept")} </p>
          </div>
          <div
            {...footerStyleProps}
            className={`modal-footer ${footerStyleProps.className ?? ""}`.trim()}
            data-stylex-owner="organization-delete-modal-footer"
          >
            <button
              {...dangerActionStyleProps}
              id="btnDeleteExec"
              type="button"
              className={`ybtn ybtn-danger ${dangerActionStyleProps.className ?? ""}`.trim()}
              data-stylex-owner="organization-delete-modal-footer"
              onClick={() => deleteMutation.mutate()}
            >
              {t("button.yes")}
            </button>
            <button
              {...defaultActionStyleProps}
              type="button"
              className={`ybtn ${defaultActionStyleProps.className ?? ""}`.trim()}
              data-stylex-owner="organization-delete-modal-footer"
              onClick={dismissDeletionModal}
            >
              {t("button.no")}
            </button>
          </div>
        </div>
        {deletionModalOpen ? (
          <div
            {...backdropStyleProps}
            className={`modal-backdrop fade in ${backdropStyleProps.className ?? ""}`.trim()}
            data-stylex-owner="organization-delete-modal-backdrop"
          />
        ) : null}
      </div>
    </div>
  );
}

function OrganizationSettingMenu({ organizationName }: { organizationName: string }) {
  const { t } = useLegacyMessages();

  return (
    <ul className="nav nav-tabs" data-stylex-owner="organization-delete-menu">
      <li className="">
        <Link
          activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
          params={{ organizationName }}
          search={{}}
          to="/organizations/$organizationName/settingform"
        >
          {t("organization.settingFrom")}
        </Link>
      </li>
      <li className="">
        <Link
          activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
          params={{ organizationName }}
          search={{}}
          to="/organizations/$organizationName/members"
        >
          {t("organization.member")}
        </Link>
      </li>
      <li className="active">
        <Link
          activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
          activeProps={{
            "aria-current": undefined,
            className: undefined,
            "data-status": undefined,
          }}
          params={{ organizationName }}
          search={{}}
          to="/organizations/$organizationName/deleteForm"
        >
          {t("organization.delete")}
        </Link>
      </li>
    </ul>
  );
}

function stringField(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

async function deleteOrganizationFromDeleteForm(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  organizationName: string,
): Promise<{ redirectPath?: unknown }> {
  const response = await fetch(
    `${runtimeConfig.apiBaseUrl}/v1/organizations/${encodeURIComponent(organizationName)}`,
    {
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "x-csrf-token": csrfToken,
      },
      method: "DELETE",
    },
  );
  const payload = await readJsonPayload(response);

  if (!response.ok) {
    throw { code: organizationDeleteErrorKey(payload) };
  }

  return typeof payload === "object" && payload !== null ? payload : {};
}

async function readJsonPayload(response: Response) {
  const text = await response.text();
  return text.trim() === "" ? undefined : (JSON.parse(text) as unknown);
}

function organizationDeleteErrorKey(error: unknown) {
  if (typeof error === "object" && error !== null && "errorMsg" in error) {
    const errorMsg = (error as { errorMsg?: unknown }).errorMsg;
    return knownOrganizationDeleteErrorKey(errorMsg);
  }
  if (typeof error === "object" && error !== null && "error" in error) {
    const nestedError = (error as { error?: unknown }).error;
    if (typeof nestedError === "object" && nestedError !== null && "code" in nestedError) {
      return knownOrganizationDeleteErrorKey((nestedError as { code?: unknown }).code);
    }
  }
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return "organization.delete.error";
  }
  return knownOrganizationDeleteErrorKey((error as { code?: unknown }).code);
}

function knownOrganizationDeleteErrorKey(code: unknown) {
  return typeof code === "string" &&
    [
      "organization.delete.impossible.project.exist",
      "organization.member.needManagerRole",
      "organization.member.unknownOrganization",
    ].includes(code)
    ? code
    : "organization.delete.error";
}
