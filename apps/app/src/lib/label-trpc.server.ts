import { deleteCookie, getCookie, setResponseStatus } from "@tanstack/react-start/server";
import { createLabelCaller } from "./label-trpc";

export function createServerLabelCaller() {
  return createLabelCaller({
    deleteCookie,
    getCookie,
    setResponseStatus,
  });
}
