import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { ALL_TENANT_PERMISSION_KEYS } from "@/lib/auth/permissions";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import {
  canWriteFleetUsers,
  filterPermissionsForModule,
  requireAnyPermission,
} from "@/lib/auth/membership";

const Body = z.object({
  permissions: z.array(z.string()).optional(),
  fleetPermissions: z.array(z.string()).optional(),
});

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor();
    const { id } = await ctx.params;
    const body = Body.parse(await request.json());
    const meta = requestMeta(request);

    const target = await prisma.tenantUser.findUnique({ where: { id } });
    if (!target || target.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "User not found.");
    }
    if (target.isOwner) {
      throw new DomainError(409, "owner_protected", "Owner permissions cannot be reduced.");
    }
    requireAnyPermission(actor, canWriteFleetUsers(actor));
    const allowed = new Set<string>(ALL_TENANT_PERMISSION_KEYS);
    const source = body.permissions ?? body.fleetPermissions ?? [];
    const fleetPermissions = filterPermissionsForModule(source.filter((p) => allowed.has(p)));

    await prisma.tenantUser.update({
      where: { id },
      data: { fleetPermissions },
    });
    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "tenant_user.update_permissions",
      tenantId: actor.tenantId,
      targetType: "TenantUser",
      targetId: id,
      before: { fleetPermissions: target.fleetPermissions } as object,
      after: { fleetPermissions } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return ok({ fleetPermissions, permissions: fleetPermissions });
  } catch (e) {
    return handleError(e);
  }
}
