import { z } from "zod";

export const authErrorCodeValues = [
  "auth.account-not-confirmed",
  "auth.credentials-invalid",
  "auth.login-id-conflict",
  "auth.password-reset-requested",
] as const;

export const authErrorCodeSchema = z.enum(authErrorCodeValues);

export type AuthErrorCode = z.infer<typeof authErrorCodeSchema>;

export const sessionProjectionSchema = z
  .object({
    actorId: z.number().int().positive().nullable(),
    loginId: z.string().min(1).nullable(),
    isAnonymous: z.boolean(),
    isConfirmed: z.boolean(),
    isSiteAdmin: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.isAnonymous) {
      if (value.actorId !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["actorId"],
          message: "Anonymous sessions must not expose an actor id.",
        });
      }

      if (value.loginId !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["loginId"],
          message: "Anonymous sessions must not expose a login id.",
        });
      }

      return;
    }

    if (value.actorId === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["actorId"],
        message: "Authenticated sessions require an actor id.",
      });
    }

    if (value.loginId === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["loginId"],
        message: "Authenticated sessions require a login id.",
      });
    }
  });

export type SessionProjection = z.infer<typeof sessionProjectionSchema>;

export const passwordResetRequestSchema = z.object({
  emailAddress: z.string().email(),
  loginId: z.string().min(1),
});

export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;
