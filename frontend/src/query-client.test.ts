import { expect, test } from "vitest";
import { apiQueryKeys } from "./api/query-keys";
import { currentSessionQueryOptions } from "./api/session";
import { createYoramQueryClient } from "./query-client";
import { resolveRuntimeConfig } from "./runtime-config";

test("api-query auth and session data remain cached until authentication changes", () => {
  const queryClient = createYoramQueryClient();
  const authDefaults = queryClient.getQueryDefaults(apiQueryKeys.auth.capabilities());
  const sessionOptions = currentSessionQueryOptions(resolveRuntimeConfig());

  expect(authDefaults).toMatchObject({ gcTime: Infinity, staleTime: Infinity });
  expect(sessionOptions).toMatchObject({ gcTime: Infinity, staleTime: Infinity });
});
