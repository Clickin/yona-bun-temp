export interface MutationActor {
  canAdmin: boolean;
  canDirectWrite: boolean;
  email: string;
  id: string;
  ipAddress: string;
  name: string;
  role: string;
}

export interface MutationActorInput {
  canAdmin?: boolean;
  canDirectWrite?: boolean;
  email: string;
  id: string;
  ipAddress: string;
  name: string;
  role?: string;
}

export function createMutationActor(input: MutationActorInput): MutationActor {
  return {
    canAdmin: input.canAdmin ?? false,
    canDirectWrite: input.canDirectWrite ?? false,
    email: input.email.trim(),
    id: input.id.trim(),
    ipAddress: input.ipAddress.trim() || "unknown",
    name: input.name.trim(),
    role: input.role?.trim().toLowerCase() || "developer",
  };
}
