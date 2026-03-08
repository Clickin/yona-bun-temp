import type {
  AppSessionProjection,
  CompletePasswordResetInput,
  CompletePasswordResetOutput,
  RegisterWithPasswordInput,
  RegisterWithPasswordOutput,
  RequestPasswordResetInput,
  RequestPasswordResetOutput,
  SignInWithPasswordInput,
  SignInWithPasswordOutput,
  SignOutOutput,
} from "@yona/contracts";
import {
  completePasswordReset,
  readCurrentSession,
  registerWithPassword,
  requestPasswordReset,
  signInWithPassword,
  signOut,
} from "./auth";

export interface AppAuthCaller {
  completePasswordReset(input: CompletePasswordResetInput): Promise<CompletePasswordResetOutput>;
  readCurrentSession(): Promise<AppSessionProjection>;
  registerWithPassword(input: RegisterWithPasswordInput): Promise<RegisterWithPasswordOutput>;
  requestPasswordReset(input: RequestPasswordResetInput): Promise<RequestPasswordResetOutput>;
  signInWithPassword(input: SignInWithPasswordInput): Promise<SignInWithPasswordOutput>;
  signOut(): Promise<SignOutOutput>;
}

export function createAppAuthCaller(): AppAuthCaller {
  return {
    completePasswordReset: (input) => completePasswordReset({ data: input }),
    readCurrentSession: () => readCurrentSession(),
    registerWithPassword: (input) => registerWithPassword({ data: input }),
    requestPasswordReset: (input) => requestPasswordReset({ data: input }),
    signInWithPassword: (input) => signInWithPassword({ data: input }),
    signOut: () => signOut(),
  };
}
