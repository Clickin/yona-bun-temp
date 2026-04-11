import { createServerFn } from "@tanstack/react-start";
import {
  changeCurrentUserPasswordInputSchema,
  changeCurrentUserPasswordOutputSchema,
  completePasswordResetInputSchema,
  completePasswordResetOutputSchema,
  readCurrentSessionOutputSchema,
  registerWithPasswordInputSchema,
  registerWithPasswordOutputSchema,
  requestPasswordResetInputSchema,
  requestPasswordResetOutputSchema,
  updateCurrentUserProfileInputSchema,
  updateCurrentUserProfileOutputSchema,
  signInWithPasswordInputSchema,
  signInWithPasswordOutputSchema,
  signOutOutputSchema,
} from "@yona/contracts";
export {
  buildAnonymousAppSession,
  buildProtectedRedirect,
  currentSessionQueryKey,
  resetCurrentSessionData,
  setCurrentSessionData,
} from "./auth-shared";
export type { ProtectedRedirect } from "./auth-shared";

export const readCurrentSession = createServerFn({ method: "GET" }).handler(async () => {
  const { createServerAuthCaller } = await import("./auth-trpc.server");
  return readCurrentSessionOutputSchema.parse(await createServerAuthCaller().readCurrentSession());
});

export const signInWithPassword = createServerFn({ method: "POST" })
  .inputValidator(signInWithPasswordInputSchema)
  .handler(async ({ data }) => {
    const { createServerAuthCaller } = await import("./auth-trpc.server");
    return signInWithPasswordOutputSchema.parse(
      await createServerAuthCaller().signInWithPassword(data),
    );
  });

export const registerWithPassword = createServerFn({ method: "POST" })
  .inputValidator(registerWithPasswordInputSchema)
  .handler(async ({ data }) => {
    const { createServerAuthCaller } = await import("./auth-trpc.server");
    return registerWithPasswordOutputSchema.parse(
      await createServerAuthCaller().registerWithPassword(data),
    );
  });

export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator(requestPasswordResetInputSchema)
  .handler(async ({ data }) => {
    const { createServerAuthCaller } = await import("./auth-trpc.server");
    return requestPasswordResetOutputSchema.parse(
      await createServerAuthCaller().requestPasswordReset(data),
    );
  });

export const completePasswordReset = createServerFn({ method: "POST" })
  .inputValidator(completePasswordResetInputSchema)
  .handler(async ({ data }) => {
    const { createServerAuthCaller } = await import("./auth-trpc.server");
    return completePasswordResetOutputSchema.parse(
      await createServerAuthCaller().completePasswordReset(data),
    );
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const { createServerAuthCaller } = await import("./auth-trpc.server");
  return signOutOutputSchema.parse(await createServerAuthCaller().signOut());
});

export const updateCurrentUserProfile = createServerFn({ method: "POST" })
  .inputValidator(updateCurrentUserProfileInputSchema)
  .handler(async ({ data }) => {
    const { createServerAuthCaller } = await import("./auth-trpc.server");
    return updateCurrentUserProfileOutputSchema.parse(
      await createServerAuthCaller().updateCurrentUserProfile(data),
    );
  });

export const changeCurrentUserPassword = createServerFn({ method: "POST" })
  .inputValidator(changeCurrentUserPasswordInputSchema)
  .handler(async ({ data }) => {
    const { createServerAuthCaller } = await import("./auth-trpc.server");
    return changeCurrentUserPasswordOutputSchema.parse(
      await createServerAuthCaller().changeCurrentUserPassword(data),
    );
  });
