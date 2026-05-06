import type { RuntimeConfig } from "../runtime-config";
import { restFetch } from "./rest-client";
import type {
  ReadAuthUiCapabilitiesResponse,
  ReadCurrentSessionResponse,
  VerifyUserResponse,
} from "../gen/yona/pilot/v1/pilot_pb";

export function readAuthUiCapabilitiesRest(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadAuthUiCapabilitiesResponse> {
  return restFetch<ReadAuthUiCapabilitiesResponse>(runtimeConfig, "/auth/capabilities", {
    fetchImpl,
  });
}

export function signInWithPasswordRest<TInput extends object>(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: TInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadCurrentSessionResponse> {
  return restFetch<ReadCurrentSessionResponse>(runtimeConfig, "/auth/sign-in", {
    body: input,
    csrfToken,
    fetchImpl,
  });
}

export function registerWithPasswordRest<TInput extends object>(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: TInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadCurrentSessionResponse> {
  return restFetch<ReadCurrentSessionResponse>(runtimeConfig, "/auth/register", {
    body: input,
    csrfToken,
    fetchImpl,
  });
}

export function signOutRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadCurrentSessionResponse> {
  return restFetch<ReadCurrentSessionResponse>(runtimeConfig, "/auth/sign-out", {
    csrfToken,
    fetchImpl,
    method: "POST",
  });
}

export function verifyUserRest<TInput extends object>(
  runtimeConfig: RuntimeConfig,
  input: TInput,
  fetchImpl: typeof fetch = fetch,
): Promise<VerifyUserResponse> {
  return restFetch<VerifyUserResponse>(runtimeConfig, "/auth/verify", {
    body: input,
    fetchImpl,
  });
}
