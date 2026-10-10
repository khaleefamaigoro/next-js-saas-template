import { prisma } from "@/lib/db/client";
import { checkS3Health, s3Configured } from "@/lib/storage/s3";
import { checkSmtpHealth } from "@/lib/email/transport";
import { checkRedisHealth } from "@/lib/auth/rate-limit";
import { env } from "@/lib/env";

async function timed(fn: () => Promise<boolean>): Promise<{ ok: boolean; latencyMs: number }> {
  const started = Date.now();
  try {
    const ok = await fn();
    return { ok, latencyMs: Date.now() - started };
  } catch {
    return { ok: false, latencyMs: Date.now() - started };
  }
}

export async function collectHealthChecks() {
  const lastChecked = new Date().toISOString();
  const redisConfigured = Boolean(
    env.RATE_LIMIT_ENABLED && env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
  );
  const paystackConfigured = Boolean(env.PAYSTACK_SECRET_KEY);

  const [database, s3, smtp, redis] = await Promise.all([
    timed(() => prisma.tenant.findFirst({ select: { id: true } }).then(() => true)),
    timed(async () => (s3Configured() ? checkS3Health() : false)),
    timed(checkSmtpHealth),
    timed(async () => (redisConfigured ? checkRedisHealth() : false)),
  ]);

  return {
    lastChecked,
    checks: {
      database: { healthy: database.ok, configured: true, latencyMs: database.latencyMs },
      s3: { healthy: s3.ok, configured: s3Configured(), latencyMs: s3.latencyMs },
      smtp: { healthy: smtp.ok, configured: true, latencyMs: smtp.latencyMs },
      redis: { healthy: redis.ok, configured: redisConfigured, latencyMs: redis.latencyMs },
      app: { healthy: true, configured: true, latencyMs: 0 },
      paystack: { healthy: paystackConfigured, configured: paystackConfigured, latencyMs: 0 },
    },
  };
}
