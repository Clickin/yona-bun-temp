import { DomainPermissionError, type DomainActor } from "./errors";

export type AuthenticatedDomainActor = DomainActor & {
  actorId: number;
  loginId: string;
};

export function requireAuthenticatedActor(
  actor: DomainActor,
): asserts actor is AuthenticatedDomainActor {
  if (actor.isAnonymous || actor.actorId === null || actor.loginId === null) {
    throw new DomainPermissionError("Authentication required.", {
      requiresAuthentication: true,
    });
  }
}

export function getActorDisplayName(actor: AuthenticatedDomainActor): string {
  const normalizedName = actor.name?.trim();
  return normalizedName && normalizedName.length > 0 ? normalizedName : actor.loginId;
}
