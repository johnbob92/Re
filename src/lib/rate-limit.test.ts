import { describe, expect, it } from "vitest";
import { MemoryRateLimitStore, rateLimit } from "./rate-limit";

describe("MemoryRateLimitStore", () => {
  it("allows requests under the limit", () => {
    const store = new MemoryRateLimitStore();
    const a = store.hit("k", 3, 60_000);
    const b = store.hit("k", 3, 60_000);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(b.remaining).toBe(1);
  });

  it("blocks when limit is exceeded", () => {
    const store = new MemoryRateLimitStore();
    store.hit("login", 2, 60_000);
    store.hit("login", 2, 60_000);
    const blocked = store.hit("login", 2, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("exposes sync rateLimit helper", () => {
    const key = `sync-${Date.now()}-${Math.random()}`;
    expect(rateLimit({ key, limit: 1, windowMs: 60_000 }).ok).toBe(true);
    expect(rateLimit({ key, limit: 1, windowMs: 60_000 }).ok).toBe(false);
  });
});
