import {
  deleteCookie,
  getCookie,
  getRequestHeader,
  getRequestIP,
  setCookie,
  setResponseHeader,
  setResponseStatus,
} from "@tanstack/react-start/server";
import { buildSessionRoutePayload, getSessionCookieName } from "@yona/auth";
import { sessionRoutePayloadSchema } from "@yona/contracts";
import { createAuthCaller } from "./auth-trpc";

const sessionCookieName = getSessionCookieName();

export function createServerAuthCaller() {
  return createAuthCaller({
    deleteCookie,
    getCookie,
    getRequestHeader,
    getRequestIp: () => getRequestIP({ xForwardedFor: true }),
    setCookie,
    setResponseHeader,
    setResponseStatus,
  });
}

export async function readSessionRoutePayloadServer() {
  const sessionPayload = await buildSessionRoutePayload(getCookie(sessionCookieName));
  if (sessionPayload.clearCookie) {
    deleteCookie(sessionCookieName, {
      path: "/",
    });
  }

  return sessionRoutePayloadSchema.parse(sessionPayload.payload);
}
