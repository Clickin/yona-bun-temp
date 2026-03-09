import { deleteCookie, getCookie, setResponseStatus } from "@tanstack/react-start/server";
import { createOrganizationCaller } from "./organization-trpc";

export function createServerOrganizationCaller() {
  return createOrganizationCaller({
    deleteCookie,
    getCookie,
    setResponseStatus,
  });
}
