import { env } from "@/lib/env";
import { DomainError } from "@/lib/api/errors";
import { prisma } from "@/lib/db/client";
import { getPlatformSettings } from "@/lib/platform/settings";
import { sendEmail } from "@/lib/email/send";
import { paymentReceivedEmail } from "@/lib/email/templates";
import { logger } from "@/lib/logger";
import { runWithContext } from "@/lib/db/tenant-context";

const PAYSTACK_API = "https://api.paystack.co";

export async function paystackFetch(path: string, init?: RequestInit) {
  const secret = env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new DomainError(503, "paystack_unconfigured", "Paystack is not configured.");
  const res = await fetch(`${PAYSTACK_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json()) as { status?: boolean; message?: string; data?: unknown };
  if (!res.ok || !json.status) {
    throw new DomainError(502, "paystack_error", json.message ?? "Paystack request failed.");
  }
  return json.data;
}

export async function applyPaidPlan(input: {
  tenantId: string;
  planKey: string;
  reference: string;
  amountKobo: number;
  currency?: string;
}): Promise<void> {
  const settings = await getPlatformSettings();
  const plan = settings.plans.find((p) => p.key === input.planKey);
  if (!plan) throw new DomainError(400, "invalid_plan", "Unknown plan.");

  const existing = await prisma.tenantSubscription.findFirst({
    where: { providerRef: input.reference },
  });
  if (existing) return;

  const now = new Date();
  const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.tenantSubscription.updateMany({
      where: { tenantId: input.tenantId, status: "ACTIVE" },
      data: { status: "EXPIRED" },
    }),
    prisma.tenantSubscription.create({
      data: {
        tenantId: input.tenantId,
        amount: input.amountKobo / 100,
        currency: input.currency ?? "NGN",
        description: `${plan.label} plan`,
        receiptRef: input.reference,
        providerRef: input.reference,
        planKey: plan.key,
        startDate: now,
        endDate: end,
        status: "ACTIVE",
        recordedById: "system:paystack",
      },
    }),
    prisma.tenant.update({
      where: { id: input.tenantId },
      data: { planKey: plan.key, status: "ACTIVE", deletedAt: null },
    }),
  ]);

  const { owner, tenant } = await runWithContext(
    { mode: "tenant-admin", tenantId: input.tenantId },
    async () => {
      const owner = await prisma.tenantUser.findFirst({
        where: { isOwner: true },
        select: { email: true, firstName: true },
      });
      const tenant = await prisma.tenant.findUnique({
        where: { id: input.tenantId },
        select: { name: true },
      });
      return { owner, tenant };
    }
  );
  if (owner && tenant) {
    try {
      await sendEmail({
        to: owner.email,
        subject: `Payment received for ${tenant.name}`,
        html: paymentReceivedEmail({
          name: owner.firstName,
          tenantName: tenant.name,
          planLabel: plan.label,
          reference: input.reference,
        }),
      });
    } catch (err) {
      logger.error({ err, tenantId: input.tenantId }, "payment_receipt_email_failed");
    }
  }
}
