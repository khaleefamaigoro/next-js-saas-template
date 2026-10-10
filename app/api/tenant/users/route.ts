import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { hashPassword, generateTempPassword, recordPassword } from "@/lib/auth/password";
import { sendEmail } from "@/lib/email/send";
import { inviteEmail } from "@/lib/email/templates";
import { emailBrandFromTenant } from "@/lib/email/branding";
import { env } from "@/lib/env";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta, parseOffsetPagination, buildOffsetPageMeta } from "@/lib/api/pagination";
import { ALL_TENANT_PERMISSION_KEYS } from "@/lib/auth/permissions";
import {
  assertRoleUsable,
  canManageFleetUsers,
  canWriteFleetUsers,
  filterPermissionsForModule,
  requireAnyPermission,
} from "@/lib/auth/membership";
import { resolveUserRole } from "@/lib/auth/role-resolver";
<<<<<<< HEAD
import { assertSeatAvailable } from "@/lib/platform/entitlements";
=======
>>>>>>> 89fe34529615c06917108e3f8d837c9807b2415a

const InviteBody = z.object({
  email: z.email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  otherName: z.string().max(100).optional(),
  phone: z.string().max(40).optional(),
  roleTemplateId: z.string().min(1),
  permissions: z.array(z.string()).optional(),
  organizationId: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor();
    requireAnyPermission(actor, canManageFleetUsers(actor));
    const url = new URL(request.url);
    const useOffset = url.searchParams.has("page");

    const whereClause = { tenantId: actor.tenantId };

    const userSelect = {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      otherName: true,
      phone: true,
      isOwner: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      stationPermissions: true,
      fleetPermissions: true,
      organizationId: true,
    };

    const roleWhere = { scope: "TENANT" as const, tenantId: actor.tenantId };

    if (useOffset) {
      const { page, take, skip } = parseOffsetPagination(url.searchParams);
      const [totalCount, rawRows, roleTemplates] = await Promise.all([
        prisma.tenantUser.count({ where: whereClause }),
        prisma.tenantUser.findMany({
          where: whereClause,
          orderBy: { createdAt: "asc" },
          take,
          skip,
          select: userSelect,
        }),
        prisma.roleTemplate.findMany({
          where: roleWhere,
          select: { name: true, permissions: true },
        }),
      ]);
      const rows = rawRows.map((u) => ({
        ...u,
        role: resolveUserRole(u, roleTemplates),
      }));
      return ok(rows, buildOffsetPageMeta(totalCount, page, take));
    }

    const { cursor, take } = parsePagination(url.searchParams);
    const [rawRows, roleTemplates] = await Promise.all([
      prisma.tenantUser.findMany({
        where: whereClause,
        orderBy: { createdAt: "asc" },
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        select: userSelect,
      }),
      prisma.roleTemplate.findMany({
        where: roleWhere,
        select: { name: true, permissions: true },
      }),
    ]);
    const rows = rawRows.map((u) => ({
      ...u,
      role: resolveUserRole(u, roleTemplates),
    }));
    return ok(rows, buildPageMeta(rows, take));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor();
    const body = InviteBody.parse(await request.json());
    const meta = requestMeta(request);

    requireAnyPermission(actor, canWriteFleetUsers(actor));

    const role = await assertRoleUsable({ actor, roleId: body.roleTemplateId });
    const allowed = new Set<string>(ALL_TENANT_PERMISSION_KEYS);
    const requestedPerms = (body.permissions ?? role.permissions).filter((p) => allowed.has(p));
    const perms = filterPermissionsForModule(requestedPerms);

    const existing = await prisma.tenantUser.findUnique({
      where: { tenantId_email: { tenantId: actor.tenantId, email: body.email.toLowerCase() } },
    });

    const tenant = await prisma.tenant.findUnique({ where: { id: actor.tenantId } });
    if (!tenant) throw new DomainError(404, "not_found", "Tenant not found.");

    if (existing) {
      const fleetPermissions = Array.from(new Set([...existing.fleetPermissions, ...perms]));
      const user = await prisma.tenantUser.update({
        where: { id: existing.id },
        data: { fleetPermissions },
      });
      await audit({
        actorType: "TENANT_USER",
        actorId: actor.userId,
        action: "tenant_user.attach",
        tenantId: actor.tenantId,
        targetType: "TenantUser",
        targetId: user.id,
        after: { email: user.email, role: role.name, permissions: fleetPermissions } as object,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      return ok({ user, attached: true });
    }

<<<<<<< HEAD
    await assertSeatAvailable(actor.tenantId);

=======
>>>>>>> 89fe34529615c06917108e3f8d837c9807b2415a
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const user = await prisma.tenantUser.create({
      data: {
        tenantId: actor.tenantId,
        email: body.email.toLowerCase(),
        firstName: body.firstName,
        lastName: body.lastName,
        otherName: body.otherName ?? null,
        phone: body.phone ?? null,
        passwordHash,
        mustChangePassword: true,
        organizationId: body.organizationId ?? null,
        fleetPermissions: perms,
      },
    });
    await recordPassword("TENANT", user.id, passwordHash);
    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "tenant_user.invite",
      tenantId: actor.tenantId,
      targetType: "TenantUser",
      targetId: user.id,
      after: { email: user.email, role: role.name, permissions: perms } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    const loginUrl = `http://${tenant.slug}.${env.APP_DOMAIN}/admin/auth/login`;
    await sendEmail({
      to: body.email,
      subject: `You're invited to ${tenant.name}`,
      html: inviteEmail({
        name: `${body.firstName} ${body.lastName}`,
        loginUrl,
        tempPassword,
        subjectLabel: tenant.name,
        brand: emailBrandFromTenant(tenant),
      }),
    });

    return ok({ user });
  } catch (e) {
    return handleError(e);
  }
}
