import { z } from "zod";
import { requireTenantActor } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { getChannelSettings, upsertChannelSettings } from "@/lib/notifications/dispatch";
import { notificationPermission } from "@/lib/notifications/permissions";

const ChannelSchema = z.enum(["SMS", "EMAIL", "MESSAGE", "IN_APP"]);

export async function GET() {
  try {
    const actor = await requireTenantActor(notificationPermission(false));
    const settings = await getChannelSettings(actor.tenantId);
    return ok({ settings });
  } catch (e) {
    return handleError(e);
  }
}

const PatchSchema = z.object({
  channels: z.array(z.object({
    channel: ChannelSchema,
    enabled: z.boolean(),
  })).min(1),
});

export async function PATCH(request: Request) {
  try {
    await requireCsrf(request);
    const body = PatchSchema.parse(await request.json());
    const actor = await requireTenantActor(notificationPermission(true));
    const settings = await upsertChannelSettings(actor.tenantId, body.channels);
    return ok({ settings });
  } catch (e) {
    return handleError(e);
  }
}
