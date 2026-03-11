import type {
  AppSessionProjection,
  ChangeCurrentUserPasswordInput,
  ChangeCurrentUserPasswordOutput,
  CompletePasswordResetInput,
  CompletePasswordResetOutput,
  RegisterWithPasswordInput,
  RegisterWithPasswordOutput,
  RequestPasswordResetInput,
  RequestPasswordResetOutput,
  SignInWithPasswordInput,
  SignInWithPasswordOutput,
  SignOutOutput,
  UpdateCurrentUserProfileInput,
  UpdateCurrentUserProfileOutput,
} from "@yona/contracts";
import {
  changeCurrentUserPassword,
  completePasswordReset,
  readCurrentSession,
  registerWithPassword,
  requestPasswordReset,
  signInWithPassword,
  signOut,
  updateCurrentUserProfile,
} from "./auth";

export interface AppAuthCaller {
  completePasswordReset(input: CompletePasswordResetInput): Promise<CompletePasswordResetOutput>;
  changeCurrentUserPassword(
    input: ChangeCurrentUserPasswordInput,
  ): Promise<ChangeCurrentUserPasswordOutput>;
  readCurrentSession(): Promise<AppSessionProjection>;
  registerWithPassword(input: RegisterWithPasswordInput): Promise<RegisterWithPasswordOutput>;
  requestPasswordReset(input: RequestPasswordResetInput): Promise<RequestPasswordResetOutput>;
  signInWithPassword(input: SignInWithPasswordInput): Promise<SignInWithPasswordOutput>;
  signOut(): Promise<SignOutOutput>;
  updateCurrentUserProfile(
    input: UpdateCurrentUserProfileInput,
  ): Promise<UpdateCurrentUserProfileOutput>;
}

export function createAppAuthCaller(): AppAuthCaller {
  return {
    completePasswordReset: (input) => completePasswordReset({ data: input }),
    changeCurrentUserPassword: (input) => changeCurrentUserPassword({ data: input }),
    readCurrentSession: () => readCurrentSession(),
    registerWithPassword: (input) => registerWithPassword({ data: input }),
    requestPasswordReset: (input) => requestPasswordReset({ data: input }),
    signInWithPassword: (input) => signInWithPassword({ data: input }),
    signOut: () => signOut(),
    updateCurrentUserProfile: (input) => updateCurrentUserProfile({ data: input }),
  };
}
