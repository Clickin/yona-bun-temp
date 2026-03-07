export interface MutationActor {
  id: string;
  name: string;
  email: string;
  role: string;
  canDirectWrite: boolean;
  canAdmin: boolean;
  ipAddress: string;
}

function parseRoleHeader(value: string | null): string {
  if (!value) {
    return "unknown";
  }

  const role = value.trim().toLowerCase();
  return role.length > 0 ? role : "unknown";
}

function parseBooleanHeader(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function getRemoteAddress(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const [ip] = forwarded.split(",");
    if (ip) {
      return ip.trim();
    }
  }

  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function readMutationActor(headers: Headers): MutationActor | null {
  const id = headers.get("x-yona-user-id")?.trim();
  const name = headers.get("x-yona-user-name")?.trim();
  const email = headers.get("x-yona-user-email")?.trim();

  if (!id || !name || !email) {
    return null;
  }

  const role = parseRoleHeader(headers.get("x-yona-role"));

  return {
    id,
    name,
    email,
    role,
    canDirectWrite:
      parseBooleanHeader(headers.get("x-yona-can-direct-write")) ||
      role === "admin" ||
      role === "maintainer",
    canAdmin: parseBooleanHeader(headers.get("x-yona-can-admin")) || role === "admin",
    ipAddress: getRemoteAddress(headers),
  };
}
