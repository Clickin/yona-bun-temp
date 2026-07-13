import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, type MouseEvent } from "react";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { organizationDetailQueryOptions } from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { OrganizationDetail } from "../../../api/types";
import { useLegacyMessages } from "../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";

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
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <OrganizationSettingMenu organizationName={organizationName} />
        <div className="box-wrap bottom">
          <button
            id="btnDelete"
            type="button"
            className="ybtn ybtn-danger"
            onClick={openDeletionModal}
          >
            {t("organization.delete.this")}
          </button>
        </div>

        <div
          id="alertDeletion"
          className={`modal hide${deletionModalOpen ? " in" : ""}`}
          style={
            deletionModalWasOpened ? { display: deletionModalOpen ? "block" : "none" } : undefined
          }
          aria-hidden={deletionModalWasOpened ? !deletionModalOpen : undefined}
        >
          <div className="modal-header">
            <button type="button" className="close" onClick={dismissDeletionModal}>
              ×
            </button>
            <h3>{t("organization.delete.requestion")}</h3>
          </div>
          <div className="modal-body">
            <p> {t("organization.delete.reaccept")} </p>
          </div>
          <div className="modal-footer">
            <button
              id="btnDeleteExec"
              type="button"
              className="ybtn ybtn-danger"
              onClick={() => deleteMutation.mutate()}
            >
              {t("button.yes")}
            </button>
            <button type="button" className="ybtn" onClick={dismissDeletionModal}>
              {t("button.no")}
            </button>
          </div>
        </div>
        {deletionModalOpen ? <div className="modal-backdrop fade in"></div> : null}
      </div>
    </div>
  );
}

function OrganizationSettingMenu({ organizationName }: { organizationName: string }) {
  const { t } = useLegacyMessages();

  return (
    <ul className="nav nav-tabs">
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
