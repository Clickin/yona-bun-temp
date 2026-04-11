import KeyvStore from "keyv";

const RATE_LIMIT_POLICY = {
  "forgot-password": {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000,
  },
  login: {
    maxRequests: 5,
    windowMs: 60_000,
  },
  "oauth-callback": {
    maxRequests: 20,
    windowMs: 60_000,
  },
  register: {
    maxRequests: 5,
    windowMs: 60_000,
  },
} as const;

const requestBuckets = new KeyvStore<number>({
  namespace: "yona:auth-rate-limit",
});
const pendingBucketMutations = new Map<string, Promise<void>>();

export type AuthRateLimitRoute = keyof typeof RATE_LIMIT_POLICY;

export interface AuthRateLimitDecision {
  ok: boolean;
  retryAfterSeconds: number;
}

export interface ConsumeAuthRateLimitInput {
  ip: string;
  now?: Date;
  route: AuthRateLimitRoute;
}

function getWindowIndex(route: AuthRateLimitRoute, now: Date): number {
  return Math.floor(now.getTime() / RATE_LIMIT_POLICY[route].windowMs);
}

function getBucketKey(input: ConsumeAuthRateLimitInput, now: Date): string {
  return `${input.route}:${input.ip}:${getWindowIndex(input.route, now)}`;
}

async function withSerializedBucketMutation<T>(
  key: string,
  mutation: () => Promise<T>,
): Promise<T> {
  const previousMutation = pendingBucketMutations.get(key) ?? Promise.resolve();
  let releaseCurrentMutation!: () => void;
  const currentMutation = new Promise<void>((resolve) => {
    releaseCurrentMutation = resolve;
  });

  pendingBucketMutations.set(key, currentMutation);
  await previousMutation;

  try {
    return await mutation();
  } finally {
    releaseCurrentMutation();
    if (pendingBucketMutations.get(key) === currentMutation) {
      pendingBucketMutations.delete(key);
    }
  }
}

export async function consumeAuthRateLimit(
  input: ConsumeAuthRateLimitInput,
): Promise<AuthRateLimitDecision> {
  const now = input.now ?? new Date();
  const key = getBucketKey(input, now);
  const policy = RATE_LIMIT_POLICY[input.route];

  // Keyv gives us TTL-backed storage, but read-modify-write still spans awaits.
  // Serialize mutations per bucket key so concurrent requests cannot overrun the limit.
  return withSerializedBucketMutation(key, async () => {
    const currentCount = (await requestBuckets.get(key)) ?? 0;
    const retryAfterSeconds = Math.ceil(policy.windowMs / 1000);

    if (currentCount >= policy.maxRequests) {
      return {
        ok: false,
        retryAfterSeconds,
      };
    }

    await requestBuckets.set(key, currentCount + 1, policy.windowMs);
    return {
      ok: true,
      retryAfterSeconds,
    };
  });
}

export async function resetAuthRateLimitForTests(): Promise<void> {
  await requestBuckets.clear();
  pendingBucketMutations.clear();
}
