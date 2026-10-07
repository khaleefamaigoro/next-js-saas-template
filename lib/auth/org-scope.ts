import { TenantActor } from "./permissions";
import { AuthError } from "./guards";

export function stationModuleFilter(actor: TenantActor, tenantInternalOrgId: string) {
  if (actor.organizationId) {
    return { organizationId: actor.organizationId };
  }
  return { organizationId: tenantInternalOrgId };
}

export function fleetModuleFilter(actor: TenantActor) {
  if (actor.organizationId) {
    return { organizationId: actor.organizationId };
  }
  return {};
}

export function genericOrgFilter(actor: TenantActor) {
  if (actor.organizationId) {
    return { organizationId: actor.organizationId };
  }
  return {};
}

export function assertOrgAccess(actor: TenantActor, resourceOrgId: string | null): void {
  if (actor.organizationId && actor.organizationId !== resourceOrgId) {
    throw new AuthError(403, "Access denied: resource belongs to a different organization.");
  }
}

export async function resolveActiveOrgId(actor: TenantActor): Promise<string | null> {
  return actor.organizationId;
}

export async function resolveActiveOrgIdFromCookie(actor: TenantActor): Promise<string | null> {
  return resolveActiveOrgId(actor);
}
