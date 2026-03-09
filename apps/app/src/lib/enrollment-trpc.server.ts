import { deleteCookie, getCookie, setResponseStatus } from "@tanstack/react-start/server";
import { createEnrollmentCaller } from "./enrollment-trpc";

export function createServerEnrollmentCaller() {
  return createEnrollmentCaller({
    deleteCookie,
    getCookie,
    setResponseStatus,
  });
}
