import { deleteCookie, getCookie, setResponseStatus } from "@tanstack/react-start/server";
import { createIssueCaller } from "./issue-trpc";

export function createServerIssueCaller() {
  return createIssueCaller({
    deleteCookie,
    getCookie,
    setResponseStatus,
  });
}
