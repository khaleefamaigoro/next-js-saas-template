import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { revokeAllSessionsForTenant } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/send";
<<<<<<< HEAD
import { trialEndedEmail } from "@/lib/email/templates";
import { tenantHasAccess } from "@/lib/platform/plans";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { runWithContext } from "@/lib/db/tenant-context";

=======

/**
 * Vercel Cron: 0 6 * * *  (daily at 06:00 UTC)
 * Suspends tenants whose trial has expired and have no active subscription.
 */
>>>>>>> 89fe34529615c06917108e3f8d837c9807b2415a
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
<<<<<<< HEAD
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
=======

  // Find expired-trial tenants with no active subscription
  const expired = await prisma.tenant.findMany({
    where: {
      status: "ACTIVE",
      trialEndsAt: { lt: now },
      subscriptions: { none: { status: "ACTIVE", endDate: { gt: now } } },
    },
    include: {
      users: { where: { isOwner: true }, take: 1, select: { email: true, firstName: true } },
    },
  });

  let suspended = 0;
>>>>>>> 89fe34529615c06917108e3f8d837c9807b2415a
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
<<<<<<< HEAD
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
=======
        afterJson: { status: "SUSPENDED", reason: "trial_expired" },
      },
    });
    const owner = tenant.users[0];
    if (owner) {
      try {
        await sendEmail({
          to: owner.email,
          subject: "Your trial has ended",
          html: `<p>Hi ${owner.firstName ?? "there"},</p><p>Your trial for <strong>${tenant.name}</strong> has ended. Please contact us to continue using the platform.</p>`,
        });
      } catch { /* ignore email errors */ }
>>>>>>> 89fe34529615c06917108e3f8d837c9807b2415a
    }
    suspended++;
  }

<<<<<<< HEAD
  logger.info({ suspended, checked: candidates.length, emailFailed }, "cron.expire_trials");
  return NextResponse.json({ suspended, checked: candidates.length, emailFailed });
}
=======
  return NextResponse.json({ suspended, checked: expired.length });
}
>>>>>>> 89fe34529615c06917108e3f8d837c9807b2415a
