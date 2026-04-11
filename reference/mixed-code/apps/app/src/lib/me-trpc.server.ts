import { deleteCookie, getCookie, setResponseStatus } from "@tanstack/react-start/server";
import { createMeCaller } from "./me-trpc";

export function createServerMeCaller() {
  return createMeCaller({
    deleteCookie,
    getCookie,
    setResponseStatus,
  });
}
