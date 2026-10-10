import { NextResponse } from "next/server";
import { requirePlatformActor, PERMISSIONS } from "@/lib/auth/guards";
<<<<<<< HEAD
import { collectHealthChecks } from "@/lib/platform/health";
=======
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
>>>>>>> 89fe34529615c06917108e3f8d837c9807b2415a

export async function GET() {
  try {
    await requirePlatformActor(PERMISSIONS.PLATFORM_ACTIVITY_READ.key);
<<<<<<< HEAD
    return NextResponse.json(await collectHealthChecks());
  } catch (error: unknown) {
    const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 500;
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: (error as Error).message }, { status });
=======
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

    return NextResponse.json({
      lastChecked,
      checks: {
        database: {
          healthy: database.ok,
          configured: true,
          latencyMs: database.latencyMs,
        },
        s3: {
          healthy: s3.ok,
          configured: s3Configured(),
          latencyMs: s3.latencyMs,
        },
        smtp: {
          healthy: smtp.ok,
          configured: true,
          latencyMs: smtp.latencyMs,
        },
        redis: {
          healthy: redis.ok,
          configured: redisConfigured,
          latencyMs: redis.latencyMs,
        },
        app: {
          healthy: true,
          configured: true,
          latencyMs: 0,
        },
        paystack: {
          healthy: paystackConfigured,
          configured: paystackConfigured,
          latencyMs: 0,
        },
      },
    });
  } catch (error: any) {
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json({ error: error.message }, { status: error.status });
>>>>>>> 89fe34529615c06917108e3f8d837c9807b2415a
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
