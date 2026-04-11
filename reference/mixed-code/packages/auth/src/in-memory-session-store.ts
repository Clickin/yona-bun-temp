import type { CreateSessionInput, SessionRecord, SessionStore } from "./session-store";

const MAX_SESSIONS = 10_000;

interface StoredSession extends SessionRecord {
  createdAt: Date;
}

export class InMemorySessionStore implements SessionStore {
  private readonly sessionsByTokenHash = new Map<string, StoredSession>();
  private readonly tokenHashesByUserId = new Map<number, Set<string>>();
  private readonly insertionOrder: string[] = [];

  async create(input: CreateSessionInput): Promise<void> {
    const existing = this.sessionsByTokenHash.get(input.tokenHash);
    if (existing) {
      this.removeFromUserIndex(existing.userId, input.tokenHash);
    }

    this.sessionsByTokenHash.set(input.tokenHash, {
      userId: input.userId,
      csrfToken: input.csrfToken,
      expiresAt: input.expiresAt,
      createdAt: input.createdAt ?? new Date(),
    });
    this.addToUserIndex(input.userId, input.tokenHash);
    this.insertionOrder.push(input.tokenHash);

    this.evictIfNeeded(new Date());
  }

  async getByTokenHash(tokenHash: string, now = new Date()): Promise<SessionRecord | null> {
    this.cleanupExpired(now);

    const session = this.sessionsByTokenHash.get(tokenHash);
    if (!session) {
      return null;
    }

    return {
      userId: session.userId,
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
    };
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    this.deleteByTokenHashSync(tokenHash);
  }

  async deleteAllByUserId(userId: number): Promise<number> {
    const tokenHashes = this.tokenHashesByUserId.get(userId);
    if (!tokenHashes || tokenHashes.size === 0) {
      return 0;
    }

    let deletedCount = 0;
    for (const tokenHash of tokenHashes) {
      if (this.deleteByTokenHashSync(tokenHash)) {
        deletedCount += 1;
      }
    }

    return deletedCount;
  }

  resetForTests(): void {
    this.sessionsByTokenHash.clear();
    this.tokenHashesByUserId.clear();
    this.insertionOrder.length = 0;
  }

  private cleanupExpired(now: Date): void {
    for (const [tokenHash, session] of this.sessionsByTokenHash.entries()) {
      if (session.expiresAt <= now) {
        this.deleteByTokenHashSync(tokenHash);
      }
    }
  }

  private evictIfNeeded(now: Date): void {
    this.cleanupExpired(now);

    while (this.sessionsByTokenHash.size > MAX_SESSIONS) {
      const oldestTokenHash = this.insertionOrder.shift();
      if (!oldestTokenHash) {
        return;
      }

      this.deleteByTokenHashSync(oldestTokenHash);
    }
  }

  private deleteByTokenHashSync(tokenHash: string): boolean {
    const existing = this.sessionsByTokenHash.get(tokenHash);
    if (!existing) {
      return false;
    }

    this.sessionsByTokenHash.delete(tokenHash);
    this.removeFromUserIndex(existing.userId, tokenHash);
    return true;
  }

  private addToUserIndex(userId: number, tokenHash: string): void {
    const tokenHashes = this.tokenHashesByUserId.get(userId);
    if (tokenHashes) {
      tokenHashes.add(tokenHash);
      return;
    }

    this.tokenHashesByUserId.set(userId, new Set([tokenHash]));
  }

  private removeFromUserIndex(userId: number, tokenHash: string): void {
    const tokenHashes = this.tokenHashesByUserId.get(userId);
    if (!tokenHashes) {
      return;
    }

    tokenHashes.delete(tokenHash);
    if (tokenHashes.size === 0) {
      this.tokenHashesByUserId.delete(userId);
    }
  }
}

export const inMemorySessionStore = new InMemorySessionStore();

export function resetInMemorySessionStoreForTests(): void {
  inMemorySessionStore.resetForTests();
}
