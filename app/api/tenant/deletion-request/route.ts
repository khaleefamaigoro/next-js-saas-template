import { requireTenantActor } from "@/lib/auth/guards";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { prisma } from "@/lib/db/client";
import { sendEmail } from "@/lib/email/send";
import { env } from "@/lib/env";
import { ok } from "@/lib/api/respond";
import { DomainError, handleError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor();
    if (!actor.isOwner) throw new DomainError(403, "forbidden", "Only the owner can request deletion.");
    const tenant = await prisma.tenant.findUnique({ where: { id: actor.tenantId } });
    const user = await prisma.tenantUser.findUnique({ where: { id: actor.userId } });
    if (!tenant || !user) throw new DomainError(404, "not_found", "Not found.");
    await prisma.activityLog.create({
      data: {
        tenantId: tenant.id,
        actorType: "TENANT_USER",
        actorId: actor.userId,
        action: "tenant.deletion_requested",
        targetType: "Tenant",
        targetId: tenant.id,
      },
    });
    try {
      await sendEmail({
        to: env.PLATFORM_ADMIN_EMAIL,
        subject: `Deletion request: ${tenant.name} (${tenant.slug})`,
        html: `<p>${user.email} requested deletion of workspace <strong>${tenant.name}</strong> (${tenant.slug}).</p>`,
      });
    } catch (err) {
      logger.error({ err, tenantId: tenant.id }, "deletion_request_email_failed");
      throw err;
    }
    return ok({ requested: true });
  } catch (e) {
    return handleError(e);
  }
}
