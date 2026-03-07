export interface SessionRecord {
  userId: number;
  csrfToken: string;
  expiresAt: Date;
}

export interface StoredSessionInput {
  tokenHash: string;
  userId: number;
  csrfToken: string;
  expiresAt: Date;
  createdAt?: Date;
}

export interface SessionStore {
  create(input: StoredSessionInput): Promise<void>;
  getByTokenHash(tokenHash: string, now?: Date): Promise<SessionRecord | null>;
  deleteByTokenHash(tokenHash: string): Promise<void>;
  deleteAllByUserId(userId: number): Promise<number>;
}
