import { z } from "zod";

export const authErrorCodeValues = [
  "auth.account-not-confirmed",
  "auth.credentials-invalid",
  "auth.login-id-conflict",
  "auth.password-reset-requested",
  "auth.rate-limited",
] as const;

export const authErrorCodeSchema = z.enum(authErrorCodeValues);

export type AuthErrorCode = z.infer<typeof authErrorCodeSchema>;

export const authIdentifierSchema = z.string().trim().min(1, "Login ID or email is required.");

export const authPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be at most 128 characters.");

export const authEmailAddressSchema = z.string().trim().email("A valid email address is required.");

export const authLoginIdSchema = z.string().trim().min(1, "Login ID is required.");

export const authDisplayNameSchema = z
  .string()
  .trim()
  .min(1, "Display name is required.")
  .max(255, "Display name must be at most 255 characters.");

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

export const authUserSummarySchema = z
  .object({
    emailAddress: authEmailAddressSchema,
    id: z.number().int().positive(),
    isConfirmed: z.boolean(),
    isSiteAdmin: z.boolean(),
    loginId: authLoginIdSchema,
    name: authDisplayNameSchema,
  })
  .strict();

export type AuthUserSummary = z.infer<typeof authUserSummarySchema>;

export const appSessionProjectionSchema = sessionProjectionSchema
  .extend({
    emailAddress: authEmailAddressSchema.nullable(),
    userLabel: authDisplayNameSchema.nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.isAnonymous) {
      if (value.emailAddress !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["emailAddress"],
          message: "Anonymous sessions must not expose an email address.",
        });
      }

      if (value.userLabel !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["userLabel"],
          message: "Anonymous sessions must not expose a user label.",
        });
      }

      return;
    }

    if (value.emailAddress === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["emailAddress"],
        message: "Authenticated sessions require an email address.",
      });
    }

    if (value.userLabel === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["userLabel"],
        message: "Authenticated sessions require a user label.",
      });
    }
  });

export type AppSessionProjection = z.infer<typeof appSessionProjectionSchema>;

export const signInWithPasswordInputSchema = z
  .object({
    identifier: authIdentifierSchema,
    password: authPasswordSchema,
  })
  .strict();

export type SignInWithPasswordInput = z.infer<typeof signInWithPasswordInputSchema>;

export const registerWithPasswordInputSchema = z
  .object({
    emailAddress: authEmailAddressSchema,
    loginId: authLoginIdSchema,
    name: authDisplayNameSchema,
    password: authPasswordSchema,
  })
  .strict();

export type RegisterWithPasswordInput = z.infer<typeof registerWithPasswordInputSchema>;

export const passwordResetRequestSchema = z
  .object({
    emailAddress: authEmailAddressSchema,
    loginId: authLoginIdSchema,
  })
  .strict();

export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;

export const requestPasswordResetInputSchema = passwordResetRequestSchema;

export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetInputSchema>;

export const completePasswordResetInputSchema = z
  .object({
    newPassword: authPasswordSchema,
    token: z.string().trim().min(1, "Reset token is required."),
  })
  .strict();

export type CompletePasswordResetInput = z.infer<typeof completePasswordResetInputSchema>;

export const authFailureSchema = z
  .object({
    code: authErrorCodeSchema,
    message: z.string().min(1),
    ok: z.literal(false),
  })
  .strict();

export type AuthFailure = z.infer<typeof authFailureSchema>;

export const authRateLimitFailureSchema = z
  .object({
    code: z.literal("auth.rate-limited"),
    message: z.string().min(1),
    ok: z.literal(false),
    retryAfterSeconds: z.number().int().positive(),
  })
  .strict();

export type AuthRateLimitFailure = z.infer<typeof authRateLimitFailureSchema>;

export const readCurrentSessionResultSchema = appSessionProjectionSchema;

export type ReadCurrentSessionResult = z.infer<typeof readCurrentSessionResultSchema>;

export const readCurrentSessionOutputSchema = readCurrentSessionResultSchema;

export type ReadCurrentSessionOutput = ReadCurrentSessionResult;

export const signInWithPasswordResultSchema = z.union([
  authFailureSchema,
  authRateLimitFailureSchema,
  z
    .object({
      ok: z.literal(true),
      session: appSessionProjectionSchema,
    })
    .strict(),
]);

export type SignInWithPasswordResult = z.infer<typeof signInWithPasswordResultSchema>;

export const signInWithPasswordOutputSchema = signInWithPasswordResultSchema;

export type SignInWithPasswordOutput = SignInWithPasswordResult;

export const registerWithPasswordResultSchema = z.union([
  authFailureSchema,
  authRateLimitFailureSchema,
  z
    .object({
      ok: z.literal(true),
      session: appSessionProjectionSchema,
    })
    .strict(),
]);

export type RegisterWithPasswordResult = z.infer<typeof registerWithPasswordResultSchema>;

export const registerWithPasswordOutputSchema = registerWithPasswordResultSchema;

export type RegisterWithPasswordOutput = RegisterWithPasswordResult;

export const requestPasswordResetResultSchema = z.union([
  authRateLimitFailureSchema,
  z
    .object({
      ok: z.literal(true),
    })
    .strict(),
]);

export type RequestPasswordResetResult = z.infer<typeof requestPasswordResetResultSchema>;

export const requestPasswordResetOutputSchema = requestPasswordResetResultSchema;

export type RequestPasswordResetOutput = RequestPasswordResetResult;

export const completePasswordResetResultSchema = z.union([
  z
    .object({
      message: z.string().min(1),
      ok: z.literal(false),
    })
    .strict(),
  z
    .object({
      ok: z.literal(true),
      session: appSessionProjectionSchema,
    })
    .strict(),
]);

export type CompletePasswordResetResult = z.infer<typeof completePasswordResetResultSchema>;

export const completePasswordResetOutputSchema = completePasswordResetResultSchema;

export type CompletePasswordResetOutput = CompletePasswordResetResult;

export const signOutResultSchema = z
  .object({
    ok: z.literal(true),
    session: appSessionProjectionSchema,
  })
  .strict();

export type SignOutResult = z.infer<typeof signOutResultSchema>;

export const signOutOutputSchema = signOutResultSchema;

export type SignOutOutput = SignOutResult;

export const updateCurrentUserProfileInputSchema = z
  .object({
    emailAddress: authEmailAddressSchema,
    name: authDisplayNameSchema,
  })
  .strict();

export type UpdateCurrentUserProfileInput = z.infer<typeof updateCurrentUserProfileInputSchema>;

export const updateCurrentUserProfileOutputSchema = appSessionProjectionSchema;

export type UpdateCurrentUserProfileOutput = z.infer<typeof updateCurrentUserProfileOutputSchema>;

export const changeCurrentUserPasswordInputSchema = z
  .object({
    currentPassword: authPasswordSchema,
    newPassword: authPasswordSchema,
  })
  .strict();

export type ChangeCurrentUserPasswordInput = z.infer<typeof changeCurrentUserPasswordInputSchema>;

export const changeCurrentUserPasswordOutputSchema = z
  .object({
    ok: z.literal(true),
  })
  .strict();

export type ChangeCurrentUserPasswordOutput = z.infer<typeof changeCurrentUserPasswordOutputSchema>;

export const currentUserApiTokenSchema = z
  .object({
    token: z.string().min(1),
  })
  .strict();

export type CurrentUserApiToken = z.infer<typeof currentUserApiTokenSchema>;

export const readCurrentUserApiTokenOutputSchema = currentUserApiTokenSchema;

export type ReadCurrentUserApiTokenOutput = CurrentUserApiToken;

export const rotateCurrentUserApiTokenOutputSchema = currentUserApiTokenSchema;

export type RotateCurrentUserApiTokenOutput = CurrentUserApiToken;

export const sessionRoutePayloadSchema = z
  .object({
    session: z
      .object({
        csrfToken: z.string().min(1),
        expiresAt: z.string().datetime({ offset: true }),
        projection: appSessionProjectionSchema,
        userId: z.number().int().positive(),
      })
      .strict()
      .nullable(),
    user: authUserSummarySchema.nullable(),
  })
  .strict();

export type SessionRoutePayload = z.infer<typeof sessionRoutePayloadSchema>;
