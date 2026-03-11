import { deleteCookie, getCookie, setResponseStatus } from "@tanstack/react-start/server";
import { createPullRequestCaller } from "./pull-request-trpc";

export function createServerPullRequestCaller() {
  return createPullRequestCaller({
    deleteCookie,
    getCookie,
    setResponseStatus,
  });
}
