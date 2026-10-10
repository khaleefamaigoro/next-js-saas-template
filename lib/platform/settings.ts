import { prisma } from "@/lib/db/client";
import { DEFAULT_PLANS, parsePlans, type PlatformPlan } from "@/lib/platform/plans";

export const DEFAULT_PLATFORM_TRIAL_DAYS = 14;
export const DEFAULT_PLAN_KEY = "trial";

export type PlatformSettingsRow = {
  id: string;
  trialDays: number;
  defaultPlanKey: string;
  plansJson: unknown;
  updatedAt: Date;
  plans: PlatformPlan[];
};

export function trialWindowFromDays(days: number, from = new Date()) {
  if (days <= 0) {
    return { trialStartedAt: null as Date | null, trialEndsAt: null as Date | null };
  }
  return {
    trialStartedAt: from,
    trialEndsAt: new Date(from.getTime() + days * 24 * 60 * 60 * 1000),
  };
}

export async function getPlatformSettings(): Promise<PlatformSettingsRow> {
  const row = await prisma.platformSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      trialDays: DEFAULT_PLATFORM_TRIAL_DAYS,
      defaultPlanKey: DEFAULT_PLAN_KEY,
      plansJson: DEFAULT_PLANS,
    },
    update: {},
  });
  return {
    ...row,
    plans: parsePlans(row.plansJson),
  };
}

export function tenantCreatePlanFields(settings: PlatformSettingsRow) {
  const planKey = settings.defaultPlanKey || DEFAULT_PLAN_KEY;
  const trial =
    planKey === "trial"
      ? trialWindowFromDays(settings.trialDays)
      : { trialStartedAt: null as Date | null, trialEndsAt: null as Date | null };
  return { planKey, ...trial };
}
