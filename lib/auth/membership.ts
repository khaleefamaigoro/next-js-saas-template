import { prisma } from "@/lib/db/client";
import { DomainError } from "@/lib/api/errors";
import { hasPermission, PERMISSIONS, type TenantActor } from "@/lib/auth/permissions";
import { AuthError } from "@/lib/auth/guards";

export function canManageFleetUsers(actor: TenantActor): boolean {
  return hasPermission(actor, PERMISSIONS.TENANT_USERS_READ.key) ||
    hasPermission(actor, PERMISSIONS.TENANT_USERS_WRITE.key);
}

export function canWriteFleetUsers(actor: TenantActor): boolean {
  return hasPermission(actor, PERMISSIONS.TENANT_USERS_WRITE.key);
}

export function canManageStationUsers(actor: TenantActor): boolean {
  return canManageFleetUsers(actor);
}

export function canWriteStationUsers(actor: TenantActor): boolean {
  return canWriteFleetUsers(actor);
}

export function canManageFleetRoles(actor: TenantActor): boolean {
  return hasPermission(actor, PERMISSIONS.TENANT_ROLES_READ.key) ||
    hasPermission(actor, PERMISSIONS.TENANT_ROLES_WRITE.key);
}

export function canWriteFleetRoles(actor: TenantActor): boolean {
  return hasPermission(actor, PERMISSIONS.TENANT_ROLES_WRITE.key);
}

export function canManageStationRoles(actor: TenantActor): boolean {
  return canManageFleetRoles(actor);
}

export function canWriteStationRoles(actor: TenantActor): boolean {
  return canWriteFleetRoles(actor);
}

export function requireAnyPermission(_actor: TenantActor, ok: boolean): void {
  if (!ok) throw new AuthError(403, "Forbidden.");
}

export function requireUserWriteAccess(actor: TenantActor): void {
  requireAnyPermission(actor, canWriteFleetUsers(actor));
}

export function filterPermissionsForModule(keys: string[]): string[] {
  return keys;
}

export async function assertRoleUsable(params: {
  actor: TenantActor;
  roleId: string;
}): Promise<{
  id: string;
  name: string;
  permissions: string[];
  organizationId: string | null;
  isSystem: boolean;
}> {
  const role = await prisma.roleTemplate.findUnique({ where: { id: params.roleId } });
  if (!role || role.scope !== "TENANT" || role.tenantId !== params.actor.tenantId) {
    throw new DomainError(400, "invalid_role", "Role template not in this tenant.");
  }
  return {
    id: role.id,
    name: role.name,
    permissions: role.permissions,
    organizationId: role.organizationId,
    isSystem: role.isSystem,
  };
}
