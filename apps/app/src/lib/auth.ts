import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
export {
  buildAnonymousAppSession,
  buildAuthenticatedAppSession,
  buildProtectedRedirect,
  currentSessionQueryKey,
  resetCurrentSessionData,
  setCurrentSessionData,
} from "./auth-shared";
export type { AppSessionProjection, ProtectedRedirect, SessionRoutePayload } from "./auth-shared";

const signInSchema = z.object({
  identifier: z.string().trim().min(1, "Login ID or email is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const registrationSchema = z.object({
  emailAddress: z.string().email("A valid email address is required."),
  loginId: z.string().trim().min(1, "Login ID is required."),
  name: z.string().trim().min(1, "Display name is required.").max(255),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const forgotPasswordSchema = z.object({
  emailAddress: z.string().email("A valid email address is required."),
  loginId: z.string().trim().min(1, "Login ID is required."),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters."),
  token: z.string().trim().min(1, "Reset token is required."),
});

export const readCurrentSession = createServerFn({ method: "GET" }).handler(async () => {
  const { readCurrentSessionServer } = await import("./auth.server");
  return readCurrentSessionServer();
});

export const signInWithPassword = createServerFn({ method: "POST" })
  .inputValidator(signInSchema)
  .handler(async ({ data }) => {
    const { signInWithPasswordServer } = await import("./auth.server");
    return signInWithPasswordServer(data);
  });

export const registerWithPassword = createServerFn({ method: "POST" })
  .inputValidator(registrationSchema)
  .handler(async ({ data }) => {
    const { registerWithPasswordServer } = await import("./auth.server");
    return registerWithPasswordServer(data);
  });

export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator(forgotPasswordSchema)
  .handler(async ({ data }) => {
    const { requestPasswordResetServer } = await import("./auth.server");
    return requestPasswordResetServer(data);
  });

export const completePasswordReset = createServerFn({ method: "POST" })
  .inputValidator(resetPasswordSchema)
  .handler(async ({ data }) => {
    const { completePasswordResetServer } = await import("./auth.server");
    return completePasswordResetServer(data);
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const { signOutServer } = await import("./auth.server");
  return signOutServer();
});
