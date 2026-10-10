import { prisma } from "@/lib/db/client";
import { DomainError } from "@/lib/api/errors";
import { getPlatformSettings } from "@/lib/platform/settings";
import { isTrialPlan, tenantHasAccess, type PlatformPlan } from "@/lib/platform/plans";

export { tenantHasAccess };
import { parseTenantSettings } from "@/lib/tenant/settings";

export type TenantAccess = {
  entitled: boolean;
  reason: "subscription" | "trial" | "none";
  plan: PlatformPlan;
  planKey: string;
  maxUsers: number;
  allowApiAccess: boolean;
  trialEndsAt: Date | null;
  subscriptionEndsAt: Date | null;
};

export async function resolveTenantAccess(tenantId: string, at = new Date()): Promise<TenantAccess> {
  const [tenant, settings] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        planKey: true,
        trialEndsAt: true,
        settingsJson: true,
        subscriptions: {
          where: { status: "ACTIVE", endDate: { gt: at } },
          orderBy: { endDate: "desc" },
          take: 1,
        },
      },
    }),
    getPlatformSettings(),
  ]);
  if (!tenant) throw new DomainError(404, "not_found", "Tenant not found.");

  const plan = settings.plans.find((p) => p.key === tenant.planKey) ?? settings.plans[0] ?? {
    key: "trial",
    label: "Trial",
    maxUsers: 5,
    allowApiAccess: false,
    priceKobo: 0,
  };
  const tenantSettings = parseTenantSettings(tenant.settingsJson);
  const maxUsers = Math.min(plan.maxUsers, tenantSettings.maxUsers);
  const allowApiAccess = plan.allowApiAccess;
  const sub = tenant.subscriptions[0] ?? null;

  if (sub) {
    return {
      entitled: true,
      reason: "subscription",
      plan,
      planKey: tenant.planKey,
      maxUsers,
      allowApiAccess: allowApiAccess || plan.allowApiAccess,
      trialEndsAt: tenant.trialEndsAt,
      subscriptionEndsAt: sub.endDate,
    };
  }

  if (isTrialPlan(tenant.planKey) && tenant.trialEndsAt && tenant.trialEndsAt.getTime() > at.getTime()) {
    return {
      entitled: true,
      reason: "trial",
      plan,
      planKey: tenant.planKey,
      maxUsers,
      allowApiAccess: false,
      trialEndsAt: tenant.trialEndsAt,
      subscriptionEndsAt: null,
    };
  }

  return {
    entitled: false,
    reason: "none",
    plan,
    planKey: tenant.planKey,
    maxUsers,
    allowApiAccess: false,
    trialEndsAt: tenant.trialEndsAt,
    subscriptionEndsAt: null,
  };
}

export async function assertSeatAvailable(tenantId: string): Promise<void> {
  const access = await resolveTenantAccess(tenantId);
  const count = await prisma.tenantUser.count({ where: { tenantId } });
  if (count >= access.maxUsers) {
    throw new DomainError(
      409,
      "seat_limit",
      `This workspace has reached its ${access.maxUsers}-user limit on the ${access.plan.label} plan.`
    );
  }
}

export async function assertApiAllowed(tenantId: string): Promise<void> {
  const access = await resolveTenantAccess(tenantId);
  if (!access.allowApiAccess) {
    throw new DomainError(403, "plan_feature", "API access is not included in the current plan.");
  }
}
