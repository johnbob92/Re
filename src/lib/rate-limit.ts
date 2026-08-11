type Bucket = { count: number; resetAt: number };

export type RateLimitResult = { ok: boolean; remaining: number; resetAt: number };

export interface RateLimitStore {
  hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> | RateLimitResult;
}

/** In-memory fixed-window store (default / single-node). */
export class MemoryRateLimitStore implements RateLimitStore {
  private buckets = new Map<string, Bucket>();

  hit(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const current = this.buckets.get(key);

    if (!current || current.resetAt <= now) {
      const resetAt = now + windowMs;
      this.buckets.set(key, { count: 1, resetAt });
      return { ok: true, remaining: limit - 1, resetAt };
    }

    if (current.count >= limit) {
      return { ok: false, remaining: 0, resetAt: current.resetAt };
    }

    current.count += 1;
    this.buckets.set(key, current);
    return {
      ok: true,
      remaining: Math.max(0, limit - current.count),
      resetAt: current.resetAt,
    };
  }

  /** Test helper */
  clear() {
    this.buckets.clear();
  }
}

/**
 * Optional Upstash Redis REST store for multi-node production.
 * Uses fetch — no extra npm dependency.
 * Env: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 */
export class UpstashRedisRateLimitStore implements RateLimitStore {
  constructor(
    private url: string,
    private token: string
  ) {}

  async hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const redisKey = `rl:${key}`;
    const windowSec = Math.max(1, Math.ceil(windowMs / 1000));

    const incrRes = await fetch(`${this.url}/incr/${encodeURIComponent(redisKey)}`, {
      headers: { Authorization: `Bearer ${this.token}` },
      cache: "no-store",
    });
    if (!incrRes.ok) throw new Error(`Upstash INCR failed: ${incrRes.status}`);
    const incrJson = (await incrRes.json()) as { result: number };
    const count = Number(incrJson.result || 0);

    if (count === 1) {
      await fetch(
        `${this.url}/expire/${encodeURIComponent(redisKey)}/${windowSec}`,
        {
          headers: { Authorization: `Bearer ${this.token}` },
          cache: "no-store",
        }
      );
    }

    const ttlRes = await fetch(`${this.url}/pttl/${encodeURIComponent(redisKey)}`, {
      headers: { Authorization: `Bearer ${this.token}` },
      cache: "no-store",
    });
    const ttlJson = (await ttlRes.json()) as { result: number };
    const pttl = Number(ttlJson.result);
    const resetAt =
      pttl > 0 ? Date.now() + pttl : Date.now() + windowMs;

    if (count > limit) {
      return { ok: false, remaining: 0, resetAt };
    }
    return { ok: true, remaining: Math.max(0, limit - count), resetAt };
  }
}

const memoryStore = new MemoryRateLimitStore();

function resolveStore(): RateLimitStore {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return new UpstashRedisRateLimitStore(url, token);
  return memoryStore;
}

let activeStore: RateLimitStore = resolveStore();

/** Override store in tests. */
export function setRateLimitStore(store: RateLimitStore) {
  activeStore = store;
}

export function getRateLimitBackend() {
  return process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? "upstash-redis"
    : "memory";
}

/**
 * Sync rate limit using the in-memory store (fast path).
 * Prefer `rateLimitAsync` when Redis may be configured.
 */
export function rateLimit(options: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  // Always use memory for sync call sites to avoid breaking existing handlers.
  // Redis-backed limiting is available via rateLimitAsync.
  return memoryStore.hit(options.key, options.limit, options.windowMs);
}

/** Async rate limit — uses Upstash Redis when configured, else memory. */
export async function rateLimitAsync(options: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  try {
    return await Promise.resolve(
      activeStore.hit(options.key, options.limit, options.windowMs)
    );
  } catch (error) {
    console.error("[rate-limit] store failed, falling back to memory", error);
    return memoryStore.hit(options.key, options.limit, options.windowMs);
  }
}

export function clientKey(req: Request, suffix: string) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "local";
  return `${suffix}:${ip}`;
}
