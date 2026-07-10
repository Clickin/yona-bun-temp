import { signInWithPasswordRest } from "./api/auth";
import { readSessionBootstrap } from "./auth-workspace-client";
import type { RuntimeConfig } from "./runtime-config";

type RootLoginDialogSubmitState = {
  identifier: string;
  password: string;
  rememberMe: boolean;
};

export async function submitRootLoginDialogForm(
  runtimeConfig: RuntimeConfig,
  state: RootLoginDialogSubmitState,
) {
  const { csrfToken } = await readSessionBootstrap(runtimeConfig);
  return signInWithPasswordRest(runtimeConfig, csrfToken, {
    identifier: state.identifier,
    password: state.password,
    rememberMe: state.rememberMe,
  });
}
