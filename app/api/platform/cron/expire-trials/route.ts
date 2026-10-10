import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { revokeAllSessionsForTenant } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/send";
import { trialEndedEmail } from "@/lib/email/templates";
import { tenantHasAccess } from "@/lib/platform/plans";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { runWithContext } from "@/lib/db/tenant-context";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const candidates = await prisma.tenant.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    include: {
      subscriptions: {
        where: { status: "ACTIVE", endDate: { gt: now } },
        take: 1,
      },
    },
  });

  const expired = candidates.filter(
    (t) =>
      !tenantHasAccess({
        planKey: t.planKey,
        trialEndsAt: t.trialEndsAt,
        hasActiveSubscription: t.subscriptions.length > 0,
        at: now,
      })
  );

  let suspended = 0;
  let emailFailed = 0;
  for (const tenant of expired) {
    await prisma.tenant.update({ where: { id: tenant.id }, data: { status: "SUSPENDED" } });
    await revokeAllSessionsForTenant(tenant.id);
    await prisma.activityLog.create({
      data: {
        tenantId: tenant.id,
        actorType: "SYSTEM",
        actorId: "cron:expire-trials",
        action: "tenant.trial_expired",
        targetType: "Tenant",
        targetId: tenant.id,
        afterJson: { status: "SUSPENDED", reason: "entitlement_ended" },
      },
    });
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
          subject: "Your trial has ended",
          html: trialEndedEmail({ name: owner.firstName, tenantName: tenant.name, billingUrl }),
        });
      });
    } catch (err) {
      emailFailed++;
      logger.error({ err, tenantId: tenant.id }, "trial_ended_email_failed");
    }
    suspended++;
  }

  logger.info({ suspended, checked: candidates.length, emailFailed }, "cron.expire_trials");
  return NextResponse.json({ suspended, checked: candidates.length, emailFailed });
}
