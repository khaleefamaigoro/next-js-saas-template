import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { sendEmail } from "@/lib/email/send";
import { trialWarningEmail } from "@/lib/email/templates";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { isTrialPlan } from "@/lib/platform/plans";
import { runWithContext } from "@/lib/db/tenant-context";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

  function dateRange(base: Date) {
    const start = new Date(base);
    start.setHours(0, 0, 0, 0);
    const end = new Date(base);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  async function notify(windowDate: Date, label: string) {
    const tenants = await prisma.tenant.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        planKey: "trial",
        trialEndsAt: dateRange(windowDate),
        subscriptions: { none: { status: "ACTIVE", endDate: { gt: now } } },
      },
    });
    let sent = 0;
    let failed = 0;
    for (const tenant of tenants) {
      if (!isTrialPlan(tenant.planKey)) continue;
      try {
        await runWithContext({ mode: "tenant-admin", tenantId: tenant.id }, async () => {
          const owner = await prisma.tenantUser.findFirst({
            where: { isOwner: true },
            select: { email: true, firstName: true },
          });
          if (!owner) return;
          const billingUrl = `http://${tenant.slug}.${env.APP_DOMAIN}/admin/billing`;
          await sendEmail({
            to: owner.email,
            subject: `Your trial expires ${label}`,
            html: trialWarningEmail({
              name: owner.firstName,
              tenantName: tenant.name,
              when: label,
              billingUrl,
            }),
          });
          sent++;
        });
      } catch (err) {
        failed++;
        logger.error({ err, tenantId: tenant.id }, "trial_warning_email_failed");
      }
    }
    return { sent, failed, matched: tenants.length };
  }

  const [d5, d1] = await Promise.all([notify(in5Days, "in 5 days"), notify(in1Day, "tomorrow")]);
  logger.info({ d5, d1 }, "cron.warn_trials");
  return NextResponse.json({ sent5DayWarnings: d5.sent, sent1DayWarnings: d1.sent, emailFailed: d5.failed + d1.failed });
}
