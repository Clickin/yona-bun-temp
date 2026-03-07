export const LEGACY_AUTH_APP_SHIM_MESSAGE =
  "packages/api authApp is now a compatibility shim. Wire Better Auth at the app boundary instead of importing a legacy web auth app.";

export interface LegacyAuthAppShim {
  kind: "legacy-auth-app-shim";
  message: string;
}

export const authApp: LegacyAuthAppShim = {
  kind: "legacy-auth-app-shim",
  message: LEGACY_AUTH_APP_SHIM_MESSAGE,
};
