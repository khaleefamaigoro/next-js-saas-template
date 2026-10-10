import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requirePlatformActor, PERMISSIONS } from "@/lib/auth/guards";
import { revokeAllSessionsForTenant } from "@/lib/auth/session";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parseTenantSettings } from "@/lib/tenant/settings";
<<<<<<< HEAD
import { getPlatformSettings } from "@/lib/platform/settings";
=======
>>>>>>> 89fe34529615c06917108e3f8d837c9807b2415a

const Body = z.discriminatedUnion("action", [
  // Existing lifecycle actions
  z.object({ action: z.enum(["suspend", "archive", "restore"]) }),

<<<<<<< HEAD
=======
  // Trial controls
  z.object({
    action: z.literal("set_trial"),
    trialDays: z.number().int().min(1).max(365),
    trialStartedAt: z.string().datetime().optional(), // ISO string; defaults to now if not set
    trialEndsAt: z.string().datetime().optional(),    // override computed end date
  }),
>>>>>>> 89fe34529615c06917108e3f8d837c9807b2415a
  z.object({
    action: z.literal("extend_trial"),
    days: z.number().int().min(1).max(365),
  }),

  // Platform-controlled capacity limits + feature gates (settingsJson patch)
  z.object({
    action: z.literal("set_settings"),
    patch: z.object({
      maxUsers:           z.number().int().min(1).optional(),
      allowApiAccess:     z.boolean().optional(),
      maintenanceMode:    z.boolean().optional(),
      maintenanceMessage: z.string().max(500).optional(),
<<<<<<< HEAD
      featureFlags:       z.record(z.string(), z.boolean()).optional(),
=======
>>>>>>> 89fe34529615c06917108e3f8d837c9807b2415a
    }),
  }),

  // Internal notes
  z.object({
    action: z.literal("set_notes"),
    notes: z.string().max(5000),
  }),
<<<<<<< HEAD

  z.object({
    action: z.literal("set_plan"),
    planKey: z.string().trim().toLowerCase().min(1).max(32),
  }),
=======
>>>>>>> 89fe34529615c06917108e3f8d837c9807b2415a
]);

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireCsrf(request);
    const actor = await requirePlatformActor(PERMISSIONS.PLATFORM_TENANTS_WRITE.key);
    const { id } = await ctx.params;
    const payload = Body.parse(await request.json());
    const { action } = payload;
    const meta = requestMeta(request);

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new DomainError(404, "not_found", "Tenant not found.");

    let updated = tenant;

<<<<<<< HEAD
    if (action === "extend_trial") {
=======
    if (action === "set_trial") {
      const startedAt = payload.trialStartedAt
        ? new Date(payload.trialStartedAt)
        : (tenant.trialStartedAt ?? new Date());

      const endsAt = payload.trialEndsAt
        ? new Date(payload.trialEndsAt)
        : new Date(startedAt.getTime() + payload.trialDays * 24 * 60 * 60 * 1000);

      updated = await prisma.tenant.update({
        where: { id },
        data: {
          trialDays: payload.trialDays,
          trialStartedAt: startedAt,
          trialEndsAt: endsAt,
        },
      });

    // ── extend_trial ───────────────────────────────────────────────────────
    } else if (action === "extend_trial") {
>>>>>>> 89fe34529615c06917108e3f8d837c9807b2415a
      const base = tenant.trialEndsAt ?? new Date();
      const newEnd = new Date(base.getTime() + payload.days * 24 * 60 * 60 * 1000);

      updated = await prisma.tenant.update({
        where: { id },
        data: {
          trialEndsAt: newEnd,
          trialExtensions: { increment: 1 },
        },
      });

    // ── set_settings ───────────────────────────────────────────────────────
    } else if (action === "set_settings") {
      const current = parseTenantSettings(tenant.settingsJson);
      const next = { ...current, ...payload.patch };
      updated = await prisma.tenant.update({
        where: { id },
        data: { settingsJson: next as object },
      });

    // ── set_notes ──────────────────────────────────────────────────────────
    } else if (action === "set_notes") {
      updated = await prisma.tenant.update({
        where: { id },
        data: { notes: payload.notes },
      });

<<<<<<< HEAD
    } else if (action === "set_plan") {
      const settings = await getPlatformSettings();
      if (!settings.plans.some((p) => p.key === payload.planKey)) {
        throw new DomainError(400, "invalid_plan", "Unknown plan.");
      }
      updated = await prisma.tenant.update({
        where: { id },
        data: { planKey: payload.planKey },
      });

=======
>>>>>>> 89fe34529615c06917108e3f8d837c9807b2415a
    // ── lifecycle: suspend / archive / restore ─────────────────────────────
    } else {
      const next =
        action === "suspend"
          ? { status: "SUSPENDED" as const, archivedAt: null }
          : action === "archive"
<<<<<<< HEAD
            ? { status: "ARCHIVED" as const, archivedAt: new Date(), deletedAt: new Date() }
            : { status: "ACTIVE" as const, archivedAt: null, deletedAt: null };
=======
            ? { status: "ARCHIVED" as const, archivedAt: new Date() }
            : { status: "ACTIVE" as const, archivedAt: null };
>>>>>>> 89fe34529615c06917108e3f8d837c9807b2415a
      updated = await prisma.tenant.update({ where: { id }, data: next });
      if (action === "suspend" || action === "archive") {
        await revokeAllSessionsForTenant(id);
      }
    }

    await audit({
      actorType: "PLATFORM_USER",
      actorId: actor.userId,
      action: `tenant.${action}`,
      tenantId: id,
      targetType: "Tenant",
      targetId: id,
      before: { status: tenant.status },
      after: { status: updated.status },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ tenant: updated });
  } catch (e) {
    return handleError(e);
  }
}

