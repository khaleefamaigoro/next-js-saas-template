import { prisma } from "@/lib/db/client";
import { getActivityStatus } from "@/lib/activity/status";

export async function resolveActivityLogRows(rows: any[]) {
  if (!rows || rows.length === 0) return [];

  const tenantUserIds = Array.from(new Set(rows.filter((r) => r.actorType === "TENANT_USER" && r.actorId).map((r) => r.actorId as string)));
  const platformUserActorIds = rows.filter((r) => r.actorType === "PLATFORM_USER" && r.actorId).map((r) => r.actorId as string);
  const platformUserTargetIds = rows.filter((r) => r.targetType === "PlatformUser" && r.targetId).map((r) => r.targetId as string);
  const platformUserIds = Array.from(new Set([...platformUserActorIds, ...platformUserTargetIds]));
  const targetUserIds = Array.from(new Set(rows.filter((r) => r.targetType === "TenantUser" && r.targetId).map((r) => r.targetId as string)));
  const roleTemplateIds = Array.from(new Set(rows.filter((r) => r.targetType === "RoleTemplate" && r.targetId).map((r) => r.targetId as string)));
  const targetTenantIds = Array.from(new Set(rows.filter((r) => r.targetType === "Tenant" && r.targetId).map((r) => r.targetId as string)));
  const allUserIds = Array.from(new Set([...tenantUserIds, ...targetUserIds]));

  const [users, platformUsers, roleTemplates, targetTenants] = await Promise.all([
    allUserIds.length > 0
      ? prisma.tenantUser.findMany({ where: { id: { in: allUserIds } }, select: { id: true, firstName: true, lastName: true, email: true } })
      : [],
    platformUserIds.length > 0
      ? prisma.platformUser.findMany({ where: { id: { in: platformUserIds } }, select: { id: true, firstName: true, lastName: true, email: true } })
      : [],
    roleTemplateIds.length > 0
      ? prisma.roleTemplate.findMany({ where: { id: { in: roleTemplateIds } }, select: { id: true, name: true } })
      : [],
    targetTenantIds.length > 0
      ? prisma.tenant.findMany({ where: { id: { in: targetTenantIds } }, select: { id: true, name: true, slug: true } })
      : [],
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const platformUserMap = new Map(platformUsers.map((u) => [u.id, u]));
  const roleTemplateMap = new Map(roleTemplates.map((rt) => [rt.id, rt]));
  const targetTenantMap = new Map(targetTenants.map((tt) => [tt.id, tt]));

  return rows.map((r) => {
    let actorDisplay = null;
    if (r.actorType === "TENANT_USER" && r.actorId) {
      const u = userMap.get(r.actorId);
      if (u) actorDisplay = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email;
    } else if (r.actorType === "PLATFORM_USER" && r.actorId) {
      const pu = platformUserMap.get(r.actorId);
      if (pu) actorDisplay = `${pu.firstName || ""} ${pu.lastName || ""}`.trim() || pu.email;
    } else if (r.actorType === "SYSTEM") {
      actorDisplay = "System Workflow";
    }

    let targetDisplay = null;
    if (r.targetType && r.targetId) {
      if (r.targetType === "TenantUser") {
        const u = userMap.get(r.targetId);
        if (u) targetDisplay = `User: ${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email;
      } else if (r.targetType === "PlatformUser") {
        const pu = platformUserMap.get(r.targetId);
        if (pu) targetDisplay = `Admin: ${pu.firstName || ""} ${pu.lastName || ""}`.trim() || pu.email;
      } else if (r.targetType === "RoleTemplate") {
        const rt = roleTemplateMap.get(r.targetId);
        if (rt) targetDisplay = `Role: ${rt.name}`;
      } else if (r.targetType === "Tenant") {
        const tt = targetTenantMap.get(r.targetId);
        if (tt) targetDisplay = `Tenant: ${tt.name} (${tt.slug})`;
      }
    }

    return {
      id: r.id,
      tenantId: r.tenantId,
      actorType: r.actorType,
      actorId: r.actorId,
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      beforeJson: r.beforeJson,
      afterJson: r.afterJson,
      ip: r.ip,
      userAgent: r.userAgent,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      tenantDisplay: r.tenant?.name || r.tenantId,
      actorDisplay,
      targetDisplay,
      status: getActivityStatus(r.action),
    };
  });
}
