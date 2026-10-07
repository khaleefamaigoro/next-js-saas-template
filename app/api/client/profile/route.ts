import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireClientActor } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const PatchBody = z.object({
  firstName: z.string().max(100).optional().nullable(),
  lastName: z.string().max(100).optional().nullable(),
  otherName: z.string().max(100).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  companyName: z.string().max(200).optional().nullable(),
  address: z.string().max(400).optional().nullable(),
  contactPerson: z.string().max(200).optional().nullable(),
  displayName: z.string().min(1).max(200).optional(),
});

export async function GET() {
  try {
    const actor = await requireClientActor();
    const client = await prisma.client.findUnique({ where: { id: actor.clientId } });
    return ok({ client });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireClientActor();
    const body = PatchBody.parse(await request.json());
    const existing = await prisma.client.findUnique({ where: { id: actor.clientId } });
    const profileJson =
      body.displayName != null
        ? { ...((existing?.profileJson as Record<string, unknown>) ?? {}), name: body.displayName.trim() }
        : undefined;
    const client = await prisma.client.update({
      where: { id: actor.clientId },
      data: {
        firstName: body.firstName === undefined ? undefined : body.firstName?.trim() || null,
        lastName: body.lastName === undefined ? undefined : body.lastName?.trim() || null,
        otherName: body.otherName === undefined ? undefined : body.otherName?.trim() || null,
        phone: body.phone === undefined ? undefined : body.phone?.trim() || null,
        companyName: body.companyName === undefined ? undefined : body.companyName?.trim() || null,
        address: body.address === undefined ? undefined : body.address?.trim() || null,
        contactPerson: body.contactPerson === undefined ? undefined : body.contactPerson?.trim() || null,
        ...(profileJson ? { profileJson } : {}),
      },
    });
    return ok({ client });
  } catch (e) {
    return handleError(e);
  }
}
