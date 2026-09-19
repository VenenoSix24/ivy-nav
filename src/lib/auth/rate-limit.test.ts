import { describe, expect, it } from "vitest";
import { AttemptLimiter } from "./rate-limit";

describe("AttemptLimiter", () => {
  it("allows attempts below the limit", () => {
    const limiter = new AttemptLimiter(3, 1000);
    limiter.recordFailure("ip", 0);
    limiter.recordFailure("ip", 0);
    expect(limiter.check("ip", 0).allowed).toBe(true);
  });

  it("blocks once the limit is reached and reports the wait", () => {
    const limiter = new AttemptLimiter(2, 60_000);
    limiter.recordFailure("ip", 0);
    limiter.recordFailure("ip", 0);
    const result = limiter.check("ip", 0);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(60);
  });

  it("lets the window expire", () => {
    const limiter = new AttemptLimiter(1, 1000);
    limiter.recordFailure("ip", 0);
    expect(limiter.check("ip", 500).allowed).toBe(false);
    expect(limiter.check("ip", 1000).allowed).toBe(true);
  });

  it("counts each key separately", () => {
    const limiter = new AttemptLimiter(1, 1000);
    limiter.recordFailure("a", 0);
    expect(limiter.check("b", 0).allowed).toBe(true);
  });

  it("reset clears the counter", () => {
    const limiter = new AttemptLimiter(1, 1000);
    limiter.recordFailure("ip", 0);
    limiter.reset("ip");
    expect(limiter.check("ip", 0).allowed).toBe(true);
  });
});
