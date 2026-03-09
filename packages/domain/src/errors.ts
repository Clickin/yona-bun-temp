export interface DomainActor {
  actorId: null | number;
  isAnonymous: boolean;
  isSiteAdmin: boolean;
  loginId: null | string;
}

export class DomainConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainConflictError";
  }
}

export class DomainNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainNotFoundError";
  }
}

export class DomainPermissionError extends Error {
  readonly requiresAuthentication: boolean;

  constructor(message: string, options: { requiresAuthentication?: boolean } = {}) {
    super(message);
    this.name = "DomainPermissionError";
    this.requiresAuthentication = options.requiresAuthentication ?? false;
  }
}

export class DomainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainValidationError";
  }
}
