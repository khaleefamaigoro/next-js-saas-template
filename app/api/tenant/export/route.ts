import { requireTenantActor } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { handleError } from "@/lib/api/errors";
import { parseTenantSettings } from "@/lib/tenant/settings";

export async function GET() {
  try {
    const actor = await requireTenantActor();
    if (!actor.isOwner) {
      return Response.json({ error: { code: "forbidden", message: "Owner only." } }, { status: 403 });
    }
    const [tenant, users, clients] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: actor.tenantId } }),
      prisma.tenantUser.findMany({
        where: { tenantId: actor.tenantId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          isOwner: true,
          createdAt: true,
        },
      }),
      prisma.client.findMany({
        where: { tenantId: actor.tenantId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          companyName: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);
    const payload = {
      exportedAt: new Date().toISOString(),
      tenant: tenant
        ? {
            name: tenant.name,
            slug: tenant.slug,
            planKey: tenant.planKey,
            settings: parseTenantSettings(tenant.settingsJson),
          }
        : null,
      users,
      clients,
    };
    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="${tenant?.slug ?? "tenant"}-export.json"`,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
