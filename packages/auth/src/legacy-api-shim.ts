export const LEGACY_AUTH_APP_SHIM_MESSAGE =
  "@yona/api no longer owns auth transport. Use @yona/auth utilities and apps/app server functions/routes instead.";

export interface LegacyAuthAppShim {
  deprecated: true;
  message: string;
}

export const authApp: LegacyAuthAppShim = {
  deprecated: true,
  message: LEGACY_AUTH_APP_SHIM_MESSAGE,
};
