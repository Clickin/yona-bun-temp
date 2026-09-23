import { createHash, timingSafeEqual } from "node:crypto";

export function legacyPasswordHash(password: string, salt: string): string {
  let digest = createHash("sha256").update(salt, "utf8").update(password, "utf8").digest();
  for (let iteration = 1; iteration < 1024; iteration += 1) {
    digest = createHash("sha256").update(digest).digest();
  }
  return digest.toString("base64");
}

export async function verifyPassword(
  password: string,
  hash: string,
  salt: string | null,
): Promise<"bcrypt" | "argon2id" | "legacy-sha256" | null> {
  if (hash.startsWith("$2")) {
    return (await Bun.password.verify(password, hash)) ? "bcrypt" : null;
  }
  if (hash.startsWith("$argon2id$")) {
    return (await Bun.password.verify(password, hash)) ? "argon2id" : null;
  }
  if (salt === null) return null;

  const expected = Buffer.from(hash);
  const actual = Buffer.from(legacyPasswordHash(password, salt));
  return expected.length === actual.length && timingSafeEqual(expected, actual)
    ? "legacy-sha256"
    : null;
}
