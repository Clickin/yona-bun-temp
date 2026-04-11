import { createServerFn } from "@tanstack/react-start";

export const readCurrentLocale = createServerFn({ method: "GET" }).handler(async () => {
  const { readCurrentLocaleServer } = await import("./locale.server");
  return readCurrentLocaleServer();
});
