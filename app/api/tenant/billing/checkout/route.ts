import { z } from "zod";
import { requireTenantActor } from "@/lib/auth/guards";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { ok } from "@/lib/api/respond";
import { DomainError, handleError } from "@/lib/api/errors";
import { prisma } from "@/lib/db/client";
import { env } from "@/lib/env";
import { getPlatformSettings } from "@/lib/platform/settings";
import { paystackFetch } from "@/lib/platform/paystack";
import { claimDurableKey } from "@/lib/platform/durable-key";

const Body = z.object({
  planKey: z.string().trim().toLowerCase().min(1),
});

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor();
    if (!actor.isOwner) throw new DomainError(403, "forbidden", "Only the workspace owner can upgrade.");
    const body = Body.parse(await request.json());
    const idem = request.headers.get("idempotency-key");
    if (idem) {
      const claimed = await claimDurableKey(`idempotency:checkout:${actor.tenantId}:${idem}`);
      if (!claimed) throw new DomainError(409, "duplicate", "This checkout request was already submitted.");
    }

    const settings = await getPlatformSettings();
    const plan = settings.plans.find((p) => p.key === body.planKey);
    if (!plan || plan.priceKobo <= 0) {
      throw new DomainError(400, "not_purchasable", "This plan cannot be purchased online. Contact support.");
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: actor.tenantId } });
    const user = await prisma.tenantUser.findUnique({ where: { id: actor.userId } });
    if (!tenant || !user) throw new DomainError(404, "not_found", "Tenant not found.");

    const callback = `http://${tenant.slug}.${env.APP_DOMAIN}/admin/billing/callback`;
    const data = (await paystackFetch("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: user.email,
        amount: plan.priceKobo,
        currency: "NGN",
        callback_url: callback,
        metadata: { tenantId: tenant.id, planKey: plan.key },
      }),
    })) as { authorization_url: string; reference: string };

    return ok({ authorizationUrl: data.authorization_url, reference: data.reference });
  } catch (e) {
    return handleError(e);
  }
}
