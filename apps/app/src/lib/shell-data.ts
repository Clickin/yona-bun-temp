import { createServerFn } from "@tanstack/react-start";
import { loadProtectedShellData } from "./protected-shell-data";

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

export const getProtectedShellData = createServerFn({ method: "GET" }).handler(
  loadProtectedShellData,
);
