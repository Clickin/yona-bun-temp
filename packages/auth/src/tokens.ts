const RANDOM_TOKEN_SIZE_BYTES = 32;

const textEncoder = new TextEncoder();
const hmacKeyCache = new Map<string, Promise<CryptoKey>>();

function toBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const cachedKey = hmacKeyCache.get(secret);
  if (cachedKey) {
    return cachedKey;
  }

  const importedKey = crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    {
      hash: "SHA-256",
      name: "HMAC",
    },
    false,
    ["sign"],
  );
  hmacKeyCache.set(secret, importedKey);
  return importedKey;
}

export function generateResetToken(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(RANDOM_TOKEN_SIZE_BYTES));
  return toBase64Url(randomBytes);
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(token));
  return toBase64Url(digest);
}

export async function verifyToken(token: string, hashedToken: string): Promise<boolean> {
  const candidateHash = await hashToken(token);
  return constantTimeEqual(candidateHash, hashedToken);
}

export async function signTokenWithSecret(token: string, secret: string): Promise<string> {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(token));
  return toBase64Url(signature);
}
