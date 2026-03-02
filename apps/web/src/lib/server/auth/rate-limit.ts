const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;
const MAX_TRACKED_BUCKETS = 2_000;

const requestBuckets = new Map<string, number>();

export interface RateLimitInput {
  route: "register" | "login";
  ip: string;
  now?: Date;
}

function getWindowMinute(now: Date): number {
  return Math.floor(now.getTime() / WINDOW_MS);
}

function getBucketKey(input: RateLimitInput): string {
  return `${input.route}:${input.ip}:${getWindowMinute(input.now ?? new Date())}`;
}

function cleanupOldBuckets(currentWindowMinute: number): void {
  if (requestBuckets.size <= MAX_TRACKED_BUCKETS) {
    return;
  }

  for (const key of requestBuckets.keys()) {
    const parts = key.split(":");
    const windowMinute = Number.parseInt(parts[parts.length - 1] ?? "", 10);
    if (!Number.isFinite(windowMinute) || windowMinute < currentWindowMinute - 1) {
      requestBuckets.delete(key);
    }
  }
}

export function allowAuthRequest(input: RateLimitInput): boolean {
  const now = input.now ?? new Date();
  const currentWindowMinute = getWindowMinute(now);
  cleanupOldBuckets(currentWindowMinute);

  const key = getBucketKey({ ...input, now });
  const currentCount = requestBuckets.get(key) ?? 0;

  if (currentCount >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  requestBuckets.set(key, currentCount + 1);
  return true;
}

export function resetAuthRateLimitForTests(): void {
  requestBuckets.clear();
}
