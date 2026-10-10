import { z } from "zod";
import { requirePlatformActor, PERMISSIONS } from "@/lib/auth/guards";
import { getPlatformSettings } from "@/lib/platform/settings";
import { parsePlans } from "@/lib/platform/plans";
import { prisma } from "@/lib/db/client";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { DomainError, handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const PlanRow = z.object({
  key: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{1,32}$/),
  label: z.string().trim().min(1).max(40),
  maxUsers: z.number().int().min(1).max(10000).optional(),
  allowApiAccess: z.boolean().optional(),
  priceKobo: z.number().int().min(0).optional(),
});

const PatchBody = z.object({
  trialDays: z.number().int().min(0).max(365).optional(),
  defaultPlanKey: z.string().trim().toLowerCase().optional(),
  plans: z.array(PlanRow).min(1).max(20).optional(),
});

export async function GET() {
  try {
    await requirePlatformActor(PERMISSIONS.PLATFORM_TENANTS_READ.key);
    const settings = await getPlatformSettings();
    return ok({ settings });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requirePlatformActor(PERMISSIONS.PLATFORM_SETTINGS_WRITE.key);
    const body = PatchBody.parse(await request.json());
    const meta = requestMeta(request);
    const before = await getPlatformSettings();

    const nextPlans = body.plans ? parsePlans(body.plans) : before.plans;
    const nextDefault = body.defaultPlanKey ?? before.defaultPlanKey;
    if (!nextPlans.some((p) => p.key === nextDefault)) {
      throw new DomainError(400, "invalid_plan", "Default plan must match a configured plan key.");
    }

    const settings = await prisma.platformSettings.update({
      where: { id: "default" },
      data: {
        trialDays: body.trialDays ?? before.trialDays,
        defaultPlanKey: nextDefault,
        plansJson: nextPlans,
      },
    });
    await audit({
      actorType: "PLATFORM_USER",
      actorId: actor.userId,
      action: "platform.settings.update",
      tenantId: null,
      targetType: "PlatformSettings",
      targetId: settings.id,
      before: { trialDays: before.trialDays, defaultPlanKey: before.defaultPlanKey },
      after: { trialDays: settings.trialDays, defaultPlanKey: settings.defaultPlanKey },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return ok({ settings: { ...settings, plans: parsePlans(settings.plansJson) } });
  } catch (e) {
    return handleError(e);
  }
}
