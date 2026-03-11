import { deleteCookie, getCookie, setResponseStatus } from "@tanstack/react-start/server";
import { createMilestoneCaller } from "./milestone-trpc";

export function createServerMilestoneCaller() {
  return createMilestoneCaller({
    deleteCookie,
    getCookie,
    setResponseStatus,
  });
}
