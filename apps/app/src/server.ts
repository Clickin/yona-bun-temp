import {
  createStartHandler,
  defaultStreamHandler,
  type RequestHandler,
} from "@tanstack/react-start/server";
import type { Register } from "@tanstack/react-router";
import { validatePasswordResetRuntimeConfig } from "@yona/integrations";

const fetch = createStartHandler(defaultStreamHandler);
let runtimeConfigValidated = false;

export type ServerEntry = {
  fetch: RequestHandler<Register>;
};

export function createServerEntry(entry: ServerEntry): ServerEntry {
  return {
    async fetch(...args) {
      if (!runtimeConfigValidated) {
        validatePasswordResetRuntimeConfig();
        runtimeConfigValidated = true;
      }

      return entry.fetch(...args);
    },
  };
}

export default createServerEntry({ fetch });
