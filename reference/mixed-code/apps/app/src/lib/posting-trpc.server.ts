import { deleteCookie, getCookie, setResponseStatus } from "@tanstack/react-start/server";
import { createPostingCaller } from "./posting-trpc";

export function createServerPostingCaller() {
  return createPostingCaller({
    deleteCookie,
    getCookie,
    setResponseStatus,
  });
}
