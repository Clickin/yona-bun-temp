import { deleteCookie, getCookie, setResponseStatus } from "@tanstack/react-start/server";
import { createProjectCaller } from "./project-trpc";

export function createServerProjectCaller() {
  return createProjectCaller({
    deleteCookie,
    getCookie,
    setResponseStatus,
  });
}
