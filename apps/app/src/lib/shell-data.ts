import { createServerFn } from "@tanstack/react-start";

export const getPublicShellData = createServerFn({ method: "GET" }).handler(async () => {
  return {
    headline: "Yona Canonical App",
    summary:
      "TanStack Start, Router, Query, and server functions now own the primary Yona application runtime.",
    workstreams: [
      "server functions own internal auth mutations",
      "server routes expose canonical HTTP auth surfaces",
      "protected routes read the session projection before render",
    ],
  };
});

export const getProtectedShellData = createServerFn({ method: "GET" }).handler(async () => {
  return {
    lanes: [
      "Public dashboard preloads before render.",
      "Protected route redirects until the in-memory auth session exists.",
      "Password, registration, and reset flows mutate through createServerFn.",
    ],
    title: "Protected Workspace",
  };
});
