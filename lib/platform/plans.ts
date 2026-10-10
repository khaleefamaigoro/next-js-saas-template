export type PlatformPlan = {
  key: string;
  label: string;
  maxUsers: number;
  allowApiAccess: boolean;
  priceKobo: number;
};

export const DEFAULT_PLANS: PlatformPlan[] = [
  { key: "trial", label: "Trial", maxUsers: 5, allowApiAccess: false, priceKobo: 0 },
  { key: "pro", label: "Pro", maxUsers: 50, allowApiAccess: true, priceKobo: 2500000 },
  { key: "enterprise", label: "Enterprise", maxUsers: 500, allowApiAccess: true, priceKobo: 0 },
];

function asInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : fallback;
}

export function parsePlans(json: unknown): PlatformPlan[] {
  if (!Array.isArray(json)) return DEFAULT_PLANS;
  const plans = json
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const key = "key" in row && typeof row.key === "string" ? row.key.trim().toLowerCase() : "";
      const label = "label" in row && typeof row.label === "string" ? row.label.trim() : "";
      if (!key || !/^[a-z0-9-]{1,32}$/.test(key) || !label) return null;
      const defaults = DEFAULT_PLANS.find((p) => p.key === key);
      return {
        key,
        label,
        maxUsers: Math.max(1, asInt("maxUsers" in row ? row.maxUsers : undefined, defaults?.maxUsers ?? 50)),
        allowApiAccess:
          "allowApiAccess" in row && typeof row.allowApiAccess === "boolean"
            ? row.allowApiAccess
            : (defaults?.allowApiAccess ?? false),
        priceKobo: Math.max(0, asInt("priceKobo" in row ? row.priceKobo : undefined, defaults?.priceKobo ?? 0)),
      };
    })
    .filter((p): p is PlatformPlan => p !== null);
  return plans.length > 0 ? plans : DEFAULT_PLANS;
}

export function planLabel(plans: PlatformPlan[], key: string | null | undefined): string {
  const found = plans.find((p) => p.key === key);
  return found?.label ?? (key ? key : "Trial");
}

export function isTrialPlan(key: string | null | undefined): boolean {
  return (key ?? "trial").toLowerCase() === "trial";
}

export function trialDaysRemaining(trialEndsAt: Date | null | undefined): number | null {
  if (!trialEndsAt) return null;
  return Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function tenantHasAccess(input: {
  planKey: string;
  trialEndsAt: Date | null;
  hasActiveSubscription: boolean;
  at?: Date;
}): boolean {
  const at = input.at ?? new Date();
  if (input.hasActiveSubscription) return true;
  if (isTrialPlan(input.planKey) && input.trialEndsAt && input.trialEndsAt.getTime() > at.getTime()) {
    return true;
  }
  return false;
}
