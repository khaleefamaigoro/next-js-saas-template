import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { hashPassword, generateTempPassword, recordPassword } from "@/lib/auth/password";
import { sendEmail } from "@/lib/email/send";
import { inviteEmail } from "@/lib/email/templates";
import { emailBrandFromTenant } from "@/lib/email/branding";
import { env } from "@/lib/env";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const InviteBody = z.object({
  email: z.email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().max(40).optional(),
  companyName: z.string().max(200).optional(),
});

export async function GET() {
  try {
    await requireTenantActor(PERMISSIONS.TENANT_CLIENTS_READ.key);
    const rows = await prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyName: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    return ok(rows);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_CLIENTS_WRITE.key);
    const body = InviteBody.parse(await request.json());
    const meta = requestMeta(request);

    const tenant = await prisma.tenant.findUnique({ where: { id: actor.tenantId } });
    if (!tenant) throw new DomainError(404, "not_found", "Tenant not found.");

    const email = body.email.toLowerCase();
    const existing = await prisma.client.findUnique({
      where: { tenantId_email: { tenantId: actor.tenantId, email } },
    });
    if (existing) {
      throw new DomainError(409, "email_taken", "A client with this email already exists.");
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const displayName = `${body.firstName} ${body.lastName}`.trim();
    const client = await prisma.client.create({
      data: {
        tenantId: actor.tenantId,
        email,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone ?? null,
        companyName: body.companyName ?? null,
        passwordHash,
        mustChangePassword: true,
        profileJson: { name: displayName },
      },
    });
    await recordPassword("CLIENT", client.id, passwordHash);
    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "tenant_client.invite",
      tenantId: actor.tenantId,
      targetType: "Client",
      targetId: client.id,
      after: { email: client.email } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    const loginUrl = `http://${tenant.slug}.${env.APP_DOMAIN}/auth/login`;
    await sendEmail({
      to: body.email,
      subject: `You're invited to ${tenant.name}`,
      html: inviteEmail({
        name: displayName,
        loginUrl,
        tempPassword,
        subjectLabel: tenant.name,
        brand: emailBrandFromTenant(tenant),
      }),
    });

    return ok({ client });
  } catch (e) {
    return handleError(e);
  }
}
