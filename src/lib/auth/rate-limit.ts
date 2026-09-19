interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * 内存计数即可满足自托管单实例的登录防爆破；进程重启会清空，这是可接受的代价。
 * 不落库是为了避免把「谁在尝试登录」这类信息写进数据库。
 */
export class AttemptLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  check(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (bucket.count < this.limit) {
      return { allowed: true, retryAfterSeconds: 0 };
    }
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  recordFailure(key: string, now = Date.now()): void {
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      this.prune(now);
      return;
    }
    bucket.count += 1;
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  private prune(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

export const loginLimiter = new AttemptLimiter(
  Number(process.env.LOGIN_ATTEMPT_LIMIT ?? 10),
  Number(process.env.LOGIN_ATTEMPT_WINDOW_MS ?? 15 * 60 * 1000),
);
