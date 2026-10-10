import { randomBytes } from "node:crypto";
import { requirePlatformActor, PERMISSIONS } from "@/lib/auth/guards";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { prisma } from "@/lib/db/client";
import { env } from "@/lib/env";
import { ok } from "@/lib/api/respond";
import { DomainError, handleError } from "@/lib/api/errors";
import { audit, requestMeta } from "@/lib/auth/audit";
import { runWithContext } from "@/lib/db/tenant-context";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireCsrf(_request);
    const actor = await requirePlatformActor(PERMISSIONS.PLATFORM_TENANTS_WRITE.key);
    const { id } = await ctx.params;
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new DomainError(404, "not_found", "Tenant not found.");

    const owner = await runWithContext({ mode: "tenant-admin", tenantId: id }, () =>
      prisma.tenantUser.findFirst({
        where: { isOwner: true, status: "ACTIVE" },
        select: { id: true },
      })
    );
    if (!owner) throw new DomainError(409, "no_owner", "This tenant has no active owner to impersonate.");

    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
    await prisma.impersonationGrant.create({
      data: {
        token,
        tenantId: id,
        targetUserId: owner.id,
        platformUserId: actor.userId,
        expiresAt,
      },
    });
    const meta = requestMeta(_request);
    await audit({
      actorType: "PLATFORM_USER",
      actorId: actor.userId,
      action: "tenant.impersonate",
      tenantId: id,
      targetType: "Tenant",
      targetId: id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    const url = `http://${tenant.slug}.${env.APP_DOMAIN}/admin/auth/impersonate?token=${encodeURIComponent(token)}`;
    return ok({ url, expiresAt: expiresAt.toISOString() });
  } catch (e) {
    return handleError(e);
  }
}
